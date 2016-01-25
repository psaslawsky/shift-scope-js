/**
 * Copyright 2015 Shape Security, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import MultiMap from "multimap";
import reduce, {MonoidalReducer} from "shift-reducer";
import ScopeState from "./scope-state";
import {Accessibility, Reference} from "./reference";
import {Declaration, DeclarationType} from "./declaration";
import {ScopeType} from "./scope";
import Set from "es6-set";
import StrictnessReducer from "./strictness-reducer";


function getFunctionDeclarations(statements) {
  return statements.filter(s => s.type === "FunctionDeclaration").map(f => f.name);
}

export default class ScopeAnalyzer extends MonoidalReducer {
  constructor(program) {
    super(ScopeState);
    this.sloppySet = program.type === "Script" ? StrictnessReducer.analyze(program) : new Set;
  }

  static analyze(program) {
    return reduce(new this(program), program).children[0];
  }

  finishFunction(fnNode, params, body) {
    const isArrowFn = fnNode.type === "ArrowExpression";
    const fnType = isArrowFn ? ScopeType.ARROW_FUNCTION : ScopeType.FUNCTION;
    const opts = {shouldResolveArguments: !isArrowFn, shouldB33: this.sloppySet.has(fnNode)};
    if (params.hasParameterExpressions) {
      return params.withoutParameterExpressions()
        .concat(body.finish(fnNode, fnType, opts))
        .finish(fnNode, ScopeType.PARAMETERS);
    } else {
      return params
        .concat(body)
        .finish(fnNode, fnType, opts);
    }
  }


  reduceArrowExpression(node, {params, body}) {
    return this.finishFunction(node, params, body);
  }

  reduceAssignmentExpression(node, {binding, expression}) {
    return super.reduceAssignmentExpression(node, {binding: binding.addReferences(Accessibility.WRITE), expression});
  }

  reduceBindingIdentifier(node) {
    if (node.name == "*default*") {
      return new ScopeState();
    }
    return new ScopeState({bindingsForParent: [node]});
  }

  reduceBindingPropertyIdentifier(node, {binding, init}) {
    const s = super.reduceBindingPropertyIdentifier(node, {binding, init});
    if (init) {
      return s.withParameterExpressions();
    }
    return s;
  }

  reduceBindingWithDefault(node, {binding, init}) {
    return super.reduceBindingWithDefault(node, {binding, init}).withParameterExpressions();
  }

  reduceBlock(node, {statements}) {
    return super.reduceBlock(node, {statements})
      .withPotentialVarFunctions(getFunctionDeclarations(node.statements))
      .finish(node, ScopeType.BLOCK);
  }

  reduceCallExpression(node, {callee, arguments: _arguments}) {
    const s = super.reduceCallExpression(node, {callee, arguments: _arguments});
    if (node.callee.type === "IdentifierExpression" && node.callee.name === "eval") {
      return s.taint();
    }
    return s;
  }

  reduceCatchClause(node, {binding, body}) {
    return super.reduceCatchClause(node, {binding: binding.addDeclarations(DeclarationType.CATCH_PARAMETER), body}).finish(node, ScopeType.CATCH);
  }

  reduceClassDeclaration(node, {name, super: _super, elements}) {
    let s = super.reduceClassDeclaration(node, {name, super: _super, elements}).addDeclarations(DeclarationType.CLASS_NAME).finish(node, ScopeType.CLASS_NAME);
    return s.concat(name.addDeclarations(DeclarationType.CLASS_DECLARATION));
  }

  reduceClassExpression(node, {name, super: _super, elements}) {
    return super.reduceClassExpression(node, {name, super: _super, elements}).addDeclarations(DeclarationType.CLASS_NAME).finish(node, ScopeType.CLASS_NAME);
  }

  reduceCompoundAssignmentExpression(node, {binding, expression}) {
    return super.reduceCompoundAssignmentExpression(node, {binding: binding.addReferences(Accessibility.READWRITE), expression});
  }

  reduceComputedMemberExpression(node, {object, expression}) {
    return super.reduceComputedMemberExpression(node, {object, expression}).withParameterExpressions();
  }

  reduceForInStatement(node, {left, right, body}) {
    return super.reduceForInStatement(node, {left: left.addReferences(Accessibility.WRITE), right, body}).finish(node, ScopeType.BLOCK);
  }

  reduceForOfStatement(node, {left, right, body}) {
    return super.reduceForOfStatement(node, {left: left.addReferences(Accessibility.WRITE), right, body}).finish(node, ScopeType.BLOCK);
  }

  reduceForStatement(node, {init, test, update, body}) {
    return super.reduceForStatement(node, {init: init ? init.withoutBindingsForParent() : init, test, update, body}).finish(node, ScopeType.BLOCK);
  }

  reduceFormalParameters(node, {items, rest}) {
    let s = rest ? rest : new ScopeState();
    items.forEach((item, ind) => s = s.concat(item.hasParameterExpressions ? item.finish(node.items[ind], ScopeType.PARAMETER_EXPRESSION) : item));
    return s.addDeclarations(DeclarationType.PARAMETER);
  }

  reduceFunctionDeclaration(node, {name, params, body}) {
    return name.concat(this.finishFunction(node, params, body)).addFunctionDeclaration();
  }

  reduceFunctionExpression(node, {name, params, body}) {
    let s = this.finishFunction(node, params, body);
    if (name) {
      return name.concat(s).addDeclarations(DeclarationType.FUNCTION_NAME).finish(node, ScopeType.FUNCTION_NAME);
    }
    return s;
  }

  reduceGetter(node, {name, body}) {
    return name.concat(body.finish(node, ScopeType.FUNCTION, {shouldResolveArguments: true, shouldB33: this.sloppySet.has(node)}));
  }

  reduceIdentifierExpression(node) {
    return new ScopeState({freeIdentifiers: new MultiMap([[node.name, new Reference(node, Accessibility.READ)]])});
  }

  reduceIfStatement(node, {test, consequent, alternate}) {
    let pvsfd = [];
    if (node.consequent.type === "FunctionDeclaration") {
      pvsfd.push(node.consequent.name);
    }
    if (node.alternate && node.alternate.type === "FunctionDeclaration") {
      pvsfd.push(node.alternate.name);
    }    
    return super.reduceIfStatement(node, {test, consequent, alternate}).withPotentialVarFunctions(pvsfd);
  }

  reduceImport(node, {moduleSpecifier, defaultBinding, namedImports}) {
    return super.reduceImport(node, {moduleSpecifier, defaultBinding, namedImports}).addDeclarations(DeclarationType.IMPORT);
  }

  reduceMethod(node, {name, params, body}) {
    return name.concat(this.finishFunction(node, params, body));
  }

  reduceModule(node, {directives, items}) {
    return super.reduceModule(node, {directives, items}).finish(node, ScopeType.MODULE);
  }

  reduceScript(node, {directives, statements}) {
    return super.reduceScript(node, {directives, statements}).finish(node, ScopeType.SCRIPT);
  }

  reduceSetter(node, {name, param, body}) {
    if (param.hasParameterExpressions) {
      param = param.finish(node, ScopeType.PARAMETER_EXPRESSION);
    }
    return name.concat(this.finishFunction(node, param.addDeclarations(DeclarationType.PARAMETER), body));
  }

  reduceSwitchCase(node, {test, consequent}) {
    return super.reduceSwitchCase(node, {test, consequent}).finish(node, ScopeType.BLOCK).withPotentialVarFunctions(getFunctionDeclarations(node.consequent));
  }

  reduceSwitchDefault(node, {consequent}) {
    return super.reduceSwitchDefault(node, {consequent}).finish(node, ScopeType.BLOCK).withPotentialVarFunctions(getFunctionDeclarations(node.consequent));
  }

  reduceUpdateExpression(node, {operand}) {
    return operand.addReferences(Accessibility.READWRITE);
  }

  reduceVariableDeclaration(node, {declarators}) {
    return super.reduceVariableDeclaration(node, {declarators}).addDeclarations(DeclarationType.fromVarDeclKind(node.kind), true);
    // passes bindingsForParent up, for for-in and for-of to add their write-references
  }

  reduceVariableDeclarationStatement(node, {declaration}) {
    return declaration.withoutBindingsForParent();
  }

  reduceVariableDeclarator(node, {binding, init}) {
    const s = super.reduceVariableDeclarator(node, {binding, init});
    if (init) {
      return s.addReferences(Accessibility.WRITE, true);
    }
    return s;
  }

  reduceWithStatement(node, {object, body}) {
    return super.reduceWithStatement(node, {object, body: body.finish(node, ScopeType.WITH)});
  }
}
