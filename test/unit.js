/**
 * Copyright 2014 Shape Security, Inc.
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

import assert from "assert";

import parse from "shift-parser";
import Map from "es6-map";

import analyze, {Accessibility, ScopeType} from "../";

const NO_REFERENCES = [];
const NO_DECLARATIONS = [];

function entriesSize(multiMap) {
  let i = 0;
  for(let x of multiMap.keys()) {
    ++i;
  }
  return i;
}

// "variables" parameter is a mapping of variable names from this scope object to the list of their declarations and their references
function checkScope(scope, scopeNode, scopeType, isDynamic, children, through, variables, referenceTypes) {
  assert(scopeNode != null);
  assert.equal(scope.astNode, scopeNode);

  assert.equal(scope.type, scopeType);
  assert.equal(scope.dynamic, isDynamic);

  assert.equal(scope.children.length, children.length);
  children.forEach(child => {
    assert(scope.children.indexOf(child) >= 0);
  });

  assert.equal(entriesSize(scope.through), through.length);
  through.forEach(name => {
    let references = scope.through.get(name);
    assert(references != null);
    assert(references.some(reference => reference.node.name === name));
  });

  assert.equal(scope.variableList.length, variables.size);
  variables.forEach((variableEntryValue, variableEntryKey) => {
    let maybeVariable = scope.lookupVariable(variableEntryKey);
    assert(maybeVariable != null);
    let variable = maybeVariable;

    let declarations = variableEntryValue[0];
    assert.equal(variable.declarations.length, declarations.length);
    declarations.forEach(node => {
      assert(variable.declarations.some(declaration => declaration.node === node));
    });

    let refs = variableEntryValue[1];
    assert.equal(variable.references.length, refs.length);
    refs.forEach(node => {
      let referencesWithNode = variable.references.filter(reference => reference.node === node);
      assert.notEqual(0, referencesWithNode.length);
      let ref = referencesWithNode[0];
      assert.equal(ref.node, node);
      let type = referenceTypes.get(ref.node);
      assert(type != null);
      assert.equal(ref.accessibility, type);
    });
  });
}

suite("unit", () => {
  test("VariableDeclaration 1", () => {
    const js = "var v1; var v2 = 0;";
    let script = parse(js);

    let globalScope = analyze(script);

    let v1Node1 = script.body.statements[0].declaration.declarators[0].binding;
    let v2Node1 = script.body.statements[1].declaration.declarators[0].binding;

    { // global scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("v1", [[v1Node1], NO_REFERENCES]);
      variables.set("v2", [[v2Node1], [v2Node1]]);

      let referenceTypes = new Map;
      referenceTypes.set(v2Node1, Accessibility.WRITE);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
  });

  test("VariableDeclaration 2", () => {
    const js = "var v1, v2 = 0;";
    let script = parse(js);

    let globalScope = analyze(script);
    let v1Node1 = script.body.statements[0].declaration.declarators[0].binding;
    let v2Node1 = script.body.statements[0].declaration.declarators[1].binding;

    { // global scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("v1", [[v1Node1], NO_REFERENCES]);
      variables.set("v2", [[v2Node1], [v2Node1]]);

      let referenceTypes = new Map;
      referenceTypes.set(v2Node1, Accessibility.WRITE);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
  });

  test("VariableDeclaration 3", () => {
    const js = "v1 = 0; var v2 = v1;";
    let script = parse(js);

    let globalScope = analyze(script);
    let v1Node1 = script.body.statements[0].expression.binding.identifier;
    let v1Node2 = script.body.statements[1].declaration.declarators[0].init.identifier;
    let v2Node1 = script.body.statements[1].declaration.declarators[0].binding;

    { // global scope
      let children = [];
      let through = ["v1"];

      let variables = new Map;
      variables.set("v1", [NO_DECLARATIONS, [v1Node1, v1Node2]]);
      variables.set("v2", [[v2Node1], [v2Node1]]);

      let referenceTypes = new Map;
      referenceTypes.set(v1Node1, Accessibility.WRITE);
      referenceTypes.set(v1Node2, Accessibility.READ);
      referenceTypes.set(v2Node1, Accessibility.WRITE);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
  });

  test("VariableDeclaration 4", () => {
    const js = "var v2 = v1 + 0; var v1 = 0; ";
    let script = parse(js);

    let globalScope = analyze(script);
    let v2Node1 = script.body.statements[0].declaration.declarators[0].binding;
    let v1Node1 = script.body.statements[0].declaration.declarators[0].init.left.identifier;
    let v1Node2 = script.body.statements[1].declaration.declarators[0].binding;

    { // global scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("v1", [[v1Node2], [v1Node1, v1Node2]]);
      variables.set("v2", [[v2Node1], [v2Node1]]);

      let referenceTypes = new Map;
      referenceTypes.set(v1Node1, Accessibility.READ);
      referenceTypes.set(v1Node2, Accessibility.WRITE);
      referenceTypes.set(v2Node1, Accessibility.WRITE);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
  });

  test("VariableDeclaration 5", () => {
    const js = "var v1; var v1 = 0; var v2 = v1 + 0;";
    let script = parse(js);

    let globalScope = analyze(script);
    let v1Node1 = script.body.statements[0].declaration.declarators[0].binding;
    let v1Node2 = script.body.statements[1].declaration.declarators[0].binding;
    let v1Node3 = script.body.statements[2].declaration.declarators[0].init.left.identifier;
    let v2Node1 = script.body.statements[2].declaration.declarators[0].binding;

    { // global scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("v1", [[v1Node1, v1Node2], [v1Node2, v1Node3]]);
      variables.set("v2", [[v2Node1], [v2Node1]]);

      let referenceTypes = new Map;
      referenceTypes.set(v1Node2, Accessibility.WRITE);
      referenceTypes.set(v1Node3, Accessibility.READ);
      referenceTypes.set(v2Node1, Accessibility.WRITE);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
  });

  test("FunctionDeclaration 1", () => {
    const js =
      `function f1(p1, p2) {
        var v1 = 1;
        function f2(p1) {
          var v2 = p1 + v1 + p2;
          return v2;
        }
        return f2;
      }
      var r = f1(2, 3);`;
    let script = parse(js);

    let globalScope = analyze(script);
    let f1Scope = globalScope.children[0];
    let f1ScopeNode = script.body.statements[0];
    let f2Scope = globalScope.children[0].children[0];
    let f2ScopeNode = f1ScopeNode.body.statements[1];

    let f1Node1 = script.body.statements[0].name;
    let f1Node2 = script.body.statements[1].declaration.declarators[0].init.callee.identifier;
    let f2Node1 = script.body.statements[0].body.statements[1].name;
    let f2Node2 = script.body.statements[0].body.statements[2].expression.identifier;
    let p1Node1 = script.body.statements[0].parameters[0];
    let p1Node2 = script.body.statements[0].body.statements[1].parameters[0];
    let p1Node3 = script.body.statements[0].body.statements[1].body.statements[0].declaration.declarators[0].init.left.left.identifier;
    let p2Node1 = script.body.statements[0].parameters[1];
    let p2Node2 = script.body.statements[0].body.statements[1].body.statements[0].declaration.declarators[0].init.right.identifier;
    let rNode1 = script.body.statements[1].declaration.declarators[0].binding;
    let v1Node1 = script.body.statements[0].body.statements[0].declaration.declarators[0].binding;
    let v1Node2 = script.body.statements[0].body.statements[1].body.statements[0].declaration.declarators[0].init.left.right.identifier;
    let v2Node1 = script.body.statements[0].body.statements[1].body.statements[0].declaration.declarators[0].binding;
    let v2Node2 = script.body.statements[0].body.statements[1].body.statements[1].expression.identifier;

    { // global scope
      let children = [f1Scope];
      let through = [];

      let variables = new Map;
      variables.set("f1", [[f1Node1], [f1Node2]]);
      variables.set("r", [[rNode1], [rNode1]]);

      let referenceTypes = new Map;
      referenceTypes.set(f1Node2, Accessibility.READ);
      referenceTypes.set(rNode1, Accessibility.WRITE);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // f1 scope
      let children = [f2Scope];
      let through = [];

      let variables = new Map;
      variables.set("v1", [[v1Node1], [v1Node1, v1Node2]]);
      variables.set("p1", [[p1Node1], NO_REFERENCES]);
      variables.set("p2", [[p2Node1], [p2Node2]]);
      variables.set("f2", [[f2Node1], [f2Node2]]);
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;
      referenceTypes.set(v1Node1, Accessibility.WRITE);
      referenceTypes.set(v1Node2, Accessibility.READ);
      referenceTypes.set(p2Node2, Accessibility.READ);
      referenceTypes.set(f2Node2, Accessibility.READ);

      checkScope(f1Scope, f1ScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
    { // f2 scope
      let children = [];
      let through = ["v1", "p2"];

      let variables = new Map;
      variables.set("p1", [[p1Node2], [p1Node3]]);
      variables.set("v2", [[v2Node1], [v2Node1, v2Node2]]);
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;
      referenceTypes.set(p1Node3, Accessibility.READ);
      referenceTypes.set(v2Node1, Accessibility.WRITE);
      referenceTypes.set(v2Node2, Accessibility.READ);

      checkScope(f2Scope, f2ScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("FunctionDeclaration 2", () => {
    const js = "function f() { f = 0; } f();";
    let script = parse(js);

    let globalScope = analyze(script);
    let fScope = globalScope.children[0];
    let fScopeNode = script.body.statements[0];

    let fNode1 = script.body.statements[0].name;
    let fNode2 = script.body.statements[0].body.statements[0].expression.binding.identifier;
    let fNode3 = script.body.statements[1].expression.callee.identifier;

    { // global scope
      let children = [fScope];
      let through = [];

      let variables = new Map;
      variables.set("f", [[fNode1], [fNode2, fNode3]]);

      let referenceTypes = new Map;
      referenceTypes.set(fNode2, Accessibility.WRITE);
      referenceTypes.set(fNode3, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // f scope
      let children = [];
      let through = ["f"];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(fScope, fScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("FunctionExpression 1", () => {
    const js = "var f = function() { f = 0; }; f();";
    let script = parse(js);

    let globalScope = analyze(script);
    let fScope = globalScope.children[0];
    let fScopeNode = script.body.statements[0].declaration.declarators[0].init;

    let fNode1 = script.body.statements[0].declaration.declarators[0].binding;
    let fNode2 = script.body.statements[0].declaration.declarators[0].init.body.statements[0].expression.binding.identifier;
    let fNode3 = script.body.statements[1].expression.callee.identifier;

    { // global scope
      let children = [fScope];
      let through = [];

      let variables = new Map;
      variables.set("f", [[fNode1], [fNode1, fNode2, fNode3]]);

      let referenceTypes = new Map;
      referenceTypes.set(fNode1, Accessibility.WRITE);
      referenceTypes.set(fNode2, Accessibility.WRITE);
      referenceTypes.set(fNode3, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // f scope
      let children = [];
      let through = ["f"];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(fScope, fScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("FunctionExpression 2", () => {
    const js = "var f2 = function f1() { f1 = 0; }; f1(); f2();";
    let script = parse(js);

    let globalScope = analyze(script);
    let functionNameScope = globalScope.children[0];
    let functionNameScopeNode = script.body.statements[0].declaration.declarators[0].init;
    let functionScope = functionNameScope.children[0];
    let functionScopeNode = functionNameScopeNode;

    let f1Node1 = script.body.statements[0].declaration.declarators[0].init.name;
    let f1Node2 = script.body.statements[0].declaration.declarators[0].init.body.statements[0].expression.binding.identifier;
    let f1Node3 = script.body.statements[1].expression.callee.identifier;
    let f2Node1 = script.body.statements[0].declaration.declarators[0].binding;
    let f2Node2 = script.body.statements[2].expression.callee.identifier;

    { // global scope
      let children = [functionNameScope];
      let through = ["f1"];

      let variables = new Map;
      variables.set("f2", [[f2Node1], [f2Node1, f2Node2]]);
      variables.set("f1", [NO_DECLARATIONS, [f1Node3]]);

      let referenceTypes = new Map;
      referenceTypes.set(f2Node1, Accessibility.WRITE);
      referenceTypes.set(f2Node2, Accessibility.READ);
      referenceTypes.set(f1Node3, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // function name scope
      let children = [functionScope];
      let through = [];

      let variables = new Map;
      variables.set("f1", [[f1Node1], [f1Node2]]);

      let referenceTypes = new Map;
      referenceTypes.set(f1Node2, Accessibility.WRITE);

      checkScope(functionNameScope, functionNameScopeNode, ScopeType.FUNCTION_NAME, false, children, through, variables, referenceTypes);
    }
    { // function scope
      let children = [];
      let through = ["f1"];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;
      referenceTypes.set(f1Node2, Accessibility.WRITE);

      checkScope(functionScope, functionScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("HoistDeclaration 1", () => {
    const js =
      `var foo = 1;
      function bar() {
        if (!foo) {
          var foo = 0;
        }
        baz(foo);
      }`;
    let script = parse(js);

    let globalScope = analyze(script);
    let functionScope = globalScope.children[0];
    let functionScopeNode = script.body.statements[1];

    let fooNode1 = script.body.statements[0].declaration.declarators[0].binding;
    let fooNode2 = script.body.statements[1].body.statements[0].test.operand.identifier;
    let fooNode3 = script.body.statements[1].body.statements[0].consequent.block.statements[0].declaration.declarators[0].binding;
    let fooNode4 = script.body.statements[1].body.statements[1].expression.arguments[0].identifier;
    let barNode1 = script.body.statements[1].name;
    let bazNode1 = script.body.statements[1].body.statements[1].expression.callee.identifier;

    { // global scope
      let children = [functionScope];
      let through = ["baz"];

      let variables = new Map;
      variables.set("foo", [[fooNode1], [fooNode1]]);
      variables.set("bar", [[barNode1], NO_REFERENCES]);
      variables.set("baz", [NO_DECLARATIONS, [bazNode1]]);

      let referenceTypes = new Map;
      referenceTypes.set(fooNode1, Accessibility.WRITE);
      referenceTypes.set(bazNode1, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // function scope
      let children = [];
      let through = ["baz"];

      let variables = new Map;
      variables.set("foo", [[fooNode3], [fooNode2, fooNode3, fooNode4]]);
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;
      referenceTypes.set(fooNode2, Accessibility.READ);
      referenceTypes.set(fooNode3, Accessibility.WRITE);
      referenceTypes.set(fooNode4, Accessibility.READ);

      checkScope(functionScope, functionScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("HoistDeclaration 2", () => {
    const js =
      `var a = 1;
      function b() {
        a = 10;
        return;
        function a(){}
      }
      b();
      c(a);`;
    let script = parse(js);

    let globalScope = analyze(script);
    let bScope = globalScope.children[0];
    let bScopeNode = script.body.statements[1];
    let aScope = bScope.children[0];
    let aScopeNode = bScopeNode.body.statements[2];

    let aNode1 = script.body.statements[0].declaration.declarators[0].binding;
    let bNode1 = script.body.statements[1].name;
    let aNode2 = script.body.statements[1].body.statements[0].expression.binding.identifier;
    let aNode3 = script.body.statements[1].body.statements[2].name;
    let bNode2 = script.body.statements[2].expression.callee.identifier;
    let cNode1 = script.body.statements[3].expression.callee.identifier;
    let aNode4 = script.body.statements[3].expression.arguments[0].identifier;

    { // global scope
      let children = [bScope];
      let through = ["c"];

      let variables = new Map;
      variables.set("a", [[aNode1], [aNode1, aNode4]]);
      variables.set("b", [[bNode1], [bNode2]]);
      variables.set("c", [NO_DECLARATIONS, [cNode1]]);

      let referenceTypes = new Map;
      referenceTypes.set(aNode1, Accessibility.WRITE);
      referenceTypes.set(aNode4, Accessibility.READ);
      referenceTypes.set(bNode2, Accessibility.READ);
      referenceTypes.set(cNode1, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // b scope
      let children = [aScope];
      let through = [];

      let variables = new Map;
      variables.set("a", [[aNode3], [aNode2]]);
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;
      referenceTypes.set(aNode2, Accessibility.WRITE);

      checkScope(bScope, bScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
    { // a scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(aScope, aScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("HoistDeclaration 3", () => {
    const js =
      `function foo() {
        function bar() {
          return;
        }
        return bar();
        function bar() {
          return;
        }
      }`;
    let script = parse(js);

    let globalScope = analyze(script);
    let fooScope = globalScope.children[0];
    let fooScopeNode = script.body.statements[0];
    let barScope1 = fooScope.children[0];
    let barScope1Node = barScope1.astNode;
    let barScope2 = fooScope.children[1];
    let barScope2Node = barScope2.astNode;

    let fooNode1 = script.body.statements[0].name;
    let barNode1 = script.body.statements[0].body.statements[0].name;
    let barNode2 = script.body.statements[0].body.statements[1].expression.callee.identifier;
    let barNode3 = script.body.statements[0].body.statements[2].name;

    { // global scope
      let children = [fooScope];
      let through = [];

      let variables = new Map;
      variables.set("foo", [[fooNode1], NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // foo scope
      let children = [barScope1, barScope2];
      let through = [];

      let variables = new Map;
      variables.set("bar", [[barNode1, barNode3], [barNode2]]);
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;
      referenceTypes.set(barNode2, Accessibility.READ);

      checkScope(fooScope, fooScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
    { // bar1 scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(barScope1, barScope1Node, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
    { // bar2 scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(barScope2, barScope2Node, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("HoistDeclaration 4", () => {
    const js = "foo(); function foo() {}";
    let script = parse(js);

    let globalScope = analyze(script);
    let fooScope = globalScope.children[0];
    let fooScopeNode = script.body.statements[1];

    let fooNode1 = script.body.statements[0].expression.callee.identifier;
    let fooNode2 = script.body.statements[1].name;

    { // global scope
      let children = [fooScope];
      let through = [];

      let variables = new Map;
      variables.set("foo", [[fooNode2], [fooNode1]]);

      let referenceTypes = new Map;
      referenceTypes.set(fooNode1, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // foo scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(fooScope, fooScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("HoistDeclaration 5", () => {
    const js =
      `function foo() {
        return bar();
        var bar = function() {
          return 0;
        }
        var bar = function() {
          return;
        }
      }`;
    let script = parse(js);

    let globalScope = analyze(script);
    let fooScope = globalScope.children[0];
    let fooScopeNode = script.body.statements[0];
    let barScope1 = fooScope.children[0];
    let barScope1Node = barScope1.astNode;
    let barScope2 = fooScope.children[1];
    let barScope2Node = barScope2.astNode;

    let fooNode1 = script.body.statements[0].name;
    let barNode1 = script.body.statements[0].body.statements[0].expression.callee.identifier;
    let barNode2 = script.body.statements[0].body.statements[1].declaration.declarators[0].binding;
    let barNode3 = script.body.statements[0].body.statements[2].declaration.declarators[0].binding;

    { // global scope
      let children = [fooScope];
      let through = [];

      let variables = new Map;
      variables.set("foo", [[fooNode1], NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // foo scope
      let children = [barScope1, barScope2];
      let through = [];

      let variables = new Map;
      variables.set("bar", [[barNode2, barNode3], [barNode1, barNode2, barNode3]]);
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;
      referenceTypes.set(barNode1, Accessibility.READ);
      referenceTypes.set(barNode2, Accessibility.WRITE);
      referenceTypes.set(barNode3, Accessibility.WRITE);

      checkScope(fooScope, fooScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
    { // bar scope 1
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(barScope1, barScope1Node, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
    { // bar scope 2
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(barScope2, barScope2Node, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("Closure 1", () => {
    const js = "(function() { f1 = 0; f2(f1); });";
    let script = parse(js);

    let globalScope = analyze(script);
    let functionScope = globalScope.children[0];
    let functionScopeNode = script.body.statements[0].expression;

    let f1Node1 = script.body.statements[0].expression.body.statements[0].expression.binding.identifier;
    let f2Node1 = script.body.statements[0].expression.body.statements[1].expression.callee.identifier;
    let f1Node2 = script.body.statements[0].expression.body.statements[1].expression.arguments[0].identifier;

    { // global scope
      let children = [functionScope];
      let through = ["f1", "f2"];

      let variables = new Map;
      variables.set("f1", [NO_DECLARATIONS, [f1Node1, f1Node2]]);
      variables.set("f2", [NO_DECLARATIONS, [f2Node1]]);

      let referenceTypes = new Map;
      referenceTypes.set(f1Node1, Accessibility.WRITE);
      referenceTypes.set(f1Node2, Accessibility.READ);
      referenceTypes.set(f2Node1, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // function scope
      let children = [];
      let through = ["f1", "f2"];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(functionScope, functionScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("Closure 2", () => {
    const js = "(function() { var f1 = 0; f2(f1); });";
    let script = parse(js);

    let globalScope = analyze(script);
    let functionScope = globalScope.children[0];
    let functionScopeNode = script.body.statements[0].expression;

    let f1Node1 = script.body.statements[0].expression.body.statements[0].declaration.declarators[0].binding;
    let f2Node1 = script.body.statements[0].expression.body.statements[1].expression.callee.identifier;
    let f1Node2 = script.body.statements[0].expression.body.statements[1].expression.arguments[0].identifier;

    { // global scope
      let children = [functionScope];
      let through = ["f2"];

      let variables = new Map;
      variables.set("f2", [NO_DECLARATIONS, [f2Node1]]);

      let referenceTypes = new Map;
      referenceTypes.set(f2Node1, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // function scope
      let children = [];
      let through = ["f2"];

      let variables = new Map;
      variables.set("f1", [[f1Node1], [f1Node1, f1Node2]]);
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;
      referenceTypes.set(f1Node1, Accessibility.WRITE);
      referenceTypes.set(f1Node2, Accessibility.READ);

      checkScope(functionScope, functionScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("Argument 1", () => {
    const js = "function f(arg1, arg2) { var v1 = arg1 + arg2; }";
    let script = parse(js);

    let globalScope = analyze(script);
    let fScope = globalScope.children[0];
    let fScopeNode = script.body.statements[0];

    let fNode1 = script.body.statements[0].name;
    let arg1Node1 = script.body.statements[0].parameters[0];
    let arg2Node1 = script.body.statements[0].parameters[1];
    let v1Node1 = script.body.statements[0].body.statements[0].declaration.declarators[0].binding;
    let arg1Node2 = script.body.statements[0].body.statements[0].declaration.declarators[0].init.left.identifier;
    let arg2Node2 = script.body.statements[0].body.statements[0].declaration.declarators[0].init.right.identifier;

    { // global scope
      let children = [fScope];
      let through = [];

      let variables = new Map;
      variables.set("f", [[fNode1], NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // function scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("arg1", [[arg1Node1], [arg1Node2]]);
      variables.set("arg2", [[arg2Node1], [arg2Node2]]);
      variables.set("v1", [[v1Node1], [v1Node1]]);
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;
      referenceTypes.set(arg1Node2, Accessibility.READ);
      referenceTypes.set(arg2Node2, Accessibility.READ);
      referenceTypes.set(v1Node1, Accessibility.WRITE);

      checkScope(fScope, fScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("Argument 2", () => {
    const js = "function f() { var v1 = arguments[0]; }";
    let script = parse(js);

    let globalScope = analyze(script);
    let fScope = globalScope.children[0];
    let fScopeNode = script.body.statements[0];

    let fNode1 = script.body.statements[0].name;
    let v1Node1 = script.body.statements[0].body.statements[0].declaration.declarators[0].binding;
    let argumentsNode1 = script.body.statements[0].body.statements[0].declaration.declarators[0].init.object.identifier;

    { // global scope
      let children = [fScope];
      let through = [];

      let variables = new Map;
      variables.set("f", [[fNode1], NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // function scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("v1", [[v1Node1], [v1Node1]]);
      variables.set("arguments", [NO_DECLARATIONS, [argumentsNode1]]);

      let referenceTypes = new Map;
      referenceTypes.set(v1Node1, Accessibility.WRITE);
      referenceTypes.set(argumentsNode1, Accessibility.READ);

      checkScope(fScope, fScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });

  test("WithStatement 1", () => {
    const js = "with (Math) { var x = cos(1 * PI); f(x); }";
    let script = parse(js);

    let globalScope = analyze(script);
    let withScope = globalScope.children[0];
    let withScopeNode = script.body.statements[0];

    let mathNode1 = script.body.statements[0].object.identifier;
    let xNode1 = script.body.statements[0].body.block.statements[0].declaration.declarators[0].binding;
    let cosNode1 = script.body.statements[0].body.block.statements[0].declaration.declarators[0].init.callee.identifier;
    let piNode1 = script.body.statements[0].body.block.statements[0].declaration.declarators[0].init.arguments[0].right.identifier;
    let fNode1 = script.body.statements[0].body.block.statements[1].expression.callee.identifier;
    let xNode2 = script.body.statements[0].body.block.statements[1].expression.arguments[0].identifier;

    { // global scope
      let children = [withScope];
      let through = ["Math", "cos", "PI", "f"];

      let variables = new Map;
      variables.set("Math", [NO_DECLARATIONS, [mathNode1]]);
      variables.set("cos", [NO_DECLARATIONS, [cosNode1]]);
      variables.set("PI", [NO_DECLARATIONS, [piNode1]]);
      variables.set("f", [NO_DECLARATIONS, [fNode1]]);
      variables.set("x", [[xNode1], [xNode1, xNode2]]);

      let referenceTypes = new Map;
      referenceTypes.set(mathNode1, Accessibility.READ);
      referenceTypes.set(cosNode1, Accessibility.READ);
      referenceTypes.set(piNode1, Accessibility.READ);
      referenceTypes.set(fNode1, Accessibility.READ);
      referenceTypes.set(xNode1, Accessibility.WRITE);
      referenceTypes.set(xNode2, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // with scope
      let children = [];
      let through = ["x", "cos", "PI", "f"];

      let variables = new Map;

      let referenceTypes = new Map;

      checkScope(withScope, withScopeNode, ScopeType.WITH, true, children, through, variables, referenceTypes);
    }
  });

  test("WithStatement 2", () => {
    const js =
      `var o = {
        a : {
          b : {
            p1 : 0,
            p2 : 1,
          }
        }
      };
      with (o.a.b) {
        f(p1);
        f(p2);
      }`;
    let script = parse(js);

    let globalScope = analyze(script);
    let withScope = globalScope.children[0];
    let withScopeNode = script.body.statements[1];

    let oNode1 = script.body.statements[0].declaration.declarators[0].binding;
    let oNode2 = script.body.statements[1].object.object.object.identifier;
    let fNode1 = script.body.statements[1].body.block.statements[0].expression.callee.identifier;
    let p1Node1 = script.body.statements[1].body.block.statements[0].expression.arguments[0].identifier;
    let fNode2 = script.body.statements[1].body.block.statements[1].expression.callee.identifier;
    let p2Node1 = script.body.statements[1].body.block.statements[1].expression.arguments[0].identifier;

    { // global scope
      let children = [withScope];
      let through = ["f", "p1", "p2"];

      let variables = new Map;
      variables.set("f", [NO_DECLARATIONS, [fNode1, fNode2]]);
      variables.set("p1", [NO_DECLARATIONS, [p1Node1]]);
      variables.set("p2", [NO_DECLARATIONS, [p2Node1]]);
      variables.set("o", [[oNode1], [oNode1, oNode2]]);

      let referenceTypes = new Map;
      referenceTypes.set(fNode1, Accessibility.READ);
      referenceTypes.set(fNode2, Accessibility.READ);
      referenceTypes.set(p1Node1, Accessibility.READ);
      referenceTypes.set(p2Node1, Accessibility.READ);
      referenceTypes.set(oNode1, Accessibility.WRITE);
      referenceTypes.set(oNode2, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // with scope
      let children = [];
      let through = ["f", "p1", "p2"];

      let variables = new Map;

      let referenceTypes = new Map;

      checkScope(withScope, withScopeNode, ScopeType.WITH, true, children, through, variables, referenceTypes);
    }
  });

  test("TryCatchStatement 1", () => {
    const js =
      `try {
        f(0);
      } catch(err) {
        f(err);
      }`;
    let script = parse(js);

    let globalScope = analyze(script);
    let catchScope = globalScope.children[0];
    let catchScopeNode = script.body.statements[0].catchClause;

    let fNode1 = script.body.statements[0].body.statements[0].expression.callee.identifier;
    let errNode1 = script.body.statements[0].catchClause.binding;
    let fNode2 = script.body.statements[0].catchClause.body.statements[0].expression.callee.identifier;
    let errNode2 = script.body.statements[0].catchClause.body.statements[0].expression.arguments[0].identifier;

    { // global scope
      let children = [catchScope];
      let through = ["f"];

      let variables = new Map;
      variables.set("f", [NO_DECLARATIONS, [fNode1, fNode2]]);

      let referenceTypes = new Map;
      referenceTypes.set(fNode1, Accessibility.READ);
      referenceTypes.set(fNode2, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // catch scope
      let children = [];
      let through = ["f"];

      let variables = new Map;
      variables.set("err", [[errNode1], [errNode2]]);

      let referenceTypes = new Map;
      referenceTypes.set(errNode2, Accessibility.READ);

      checkScope(catchScope, catchScopeNode, ScopeType.CATCH, false, children, through, variables, referenceTypes);
    }
  });

  test("TryCatchStatement 2", () => {
    const js =
      `try {
        f(0);
      } catch(err1) {
        try {
          throw err1.message;
        } catch(err2) {
          f(err1);
          f(err2);
        }
      }`;
    let script = parse(js);

    let globalScope = analyze(script);
    let catchScope1 = globalScope.children[0];
    let catchScope1Node = script.body.statements[0].catchClause;
    let catchScope2 = catchScope1.children[0];
    let catchScope2Node = script.body.statements[0].catchClause.body.statements[0].catchClause;

    let fNode1 = script.body.statements[0].body.statements[0].expression.callee.identifier;
    let err1Node1 = script.body.statements[0].catchClause.binding;
    let err1Node2 = script.body.statements[0].catchClause.body.statements[0].body.statements[0].expression.object.identifier;
    let err2Node1 = script.body.statements[0].catchClause.body.statements[0].catchClause.binding;
    let fNode2 = script.body.statements[0].catchClause.body.statements[0].catchClause.body.statements[0].expression.callee.identifier;
    let err1Node3 = script.body.statements[0].catchClause.body.statements[0].catchClause.body.statements[0].expression.arguments[0].identifier;
    let fNode3 = script.body.statements[0].catchClause.body.statements[0].catchClause.body.statements[1].expression.callee.identifier;
    let err2Node2 = script.body.statements[0].catchClause.body.statements[0].catchClause.body.statements[1].expression.arguments[0].identifier;

    { // global scope
      let children = [catchScope1];
      let through = ["f"];

      let variables = new Map;
      variables.set("f", [NO_DECLARATIONS, [fNode1, fNode2, fNode3]]);

      let referenceTypes = new Map;
      referenceTypes.set(fNode1, Accessibility.READ);
      referenceTypes.set(fNode2, Accessibility.READ);
      referenceTypes.set(fNode3, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // catch scope 1
      let children = [catchScope2];
      let through = ["f"];

      let variables = new Map;
      variables.set("err1", [[err1Node1], [err1Node2, err1Node3]]);

      let referenceTypes = new Map;
      referenceTypes.set(err1Node2, Accessibility.READ);
      referenceTypes.set(err1Node3, Accessibility.READ);

      checkScope(catchScope1, catchScope1Node, ScopeType.CATCH, false, children, through, variables, referenceTypes);
    }
    { // catch scope 2
      let children = [];
      let through = ["f", "err1"];

      let variables = new Map;
      variables.set("err2", [[err2Node1], [err2Node2]]);

      let referenceTypes = new Map;
      referenceTypes.set(err2Node2, Accessibility.READ);

      checkScope(catchScope2, catchScope2Node, ScopeType.CATCH, false, children, through, variables, referenceTypes);
    }
  });

  test("TryCatchStatement 3", () => {
    const js =
      `try {
        f(0);
      } catch(err) {
        var err = 1;
      }`;
    let script = parse(js);

    let globalScope = analyze(script);
    let catchScope = globalScope.children[0];
    let catchScopeNode = script.body.statements[0].catchClause;

    let fNode1 = script.body.statements[0].body.statements[0].expression.callee.identifier;
    let errNode1 = script.body.statements[0].catchClause.binding;
    let errNode2 = script.body.statements[0].catchClause.body.statements[0].declaration.declarators[0].binding;

    { // global scope
      let children = [catchScope];
      let through = ["f"];

      let variables = new Map;
      variables.set("err", [[errNode2], NO_REFERENCES]);
      variables.set("f", [NO_DECLARATIONS, [fNode1]]);

      let referenceTypes = new Map;
      referenceTypes.set(fNode1, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // catch scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("err", [[errNode1], [errNode2]]);

      let referenceTypes = new Map;
      referenceTypes.set(errNode2, Accessibility.WRITE);

      checkScope(catchScope, catchScopeNode, ScopeType.CATCH, false, children, through, variables, referenceTypes);
    }
  });

  test("block-scoped declaration in CatchClause", () => {
    const js =
      `try { throw 0; } catch (e) { e; }
      try { throw 0; } catch (f) { let a; f }
      try { throw 0; } catch (g) { let g; g; }`;
    let script = parse(js);

    let globalScope = analyze(script);
    let [catchScope0, catchScope1, catchScope2]  = globalScope.children;

    let catchScope0Node = script.body.statements[0].catchClause;

    let catchScope1Node = script.body.statements[1].catchClause;
    let blockScope0 = catchScope1.children[0];
    let blockScope0Node = catchScope1Node.body;

    let catchScope2Node = script.body.statements[2].catchClause;
    let blockScope1 = catchScope2.children[0];
    let blockScope1Node = catchScope2Node.body;

    let eNode1 = script.body.statements[0].catchClause.binding;
    let eNode2 = script.body.statements[0].catchClause.body.statements[0].expression.identifier;

    let fNode1 = script.body.statements[1].catchClause.binding;
    let aNode1 = script.body.statements[1].catchClause.body.statements[0].declaration.declarators[0].binding;
    let fNode2 = script.body.statements[1].catchClause.body.statements[1].expression.identifier;

    let gNode1 = script.body.statements[2].catchClause.binding;
    let gNode2 = script.body.statements[2].catchClause.body.statements[0].declaration.declarators[0].binding;
    let gNode3 = script.body.statements[2].catchClause.body.statements[1].expression.identifier;

    { // global scope
      let children = [catchScope0, catchScope1, catchScope2];
      let through = [];

      let variables = new Map;

      let referenceTypes = new Map;

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // first catch scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("e", [[eNode1], [eNode2]]);

      let referenceTypes = new Map;
      referenceTypes.set(eNode2, Accessibility.READ);

      checkScope(catchScope0, catchScope0Node, ScopeType.CATCH, false, children, through, variables, referenceTypes);
    }
    { // second catch scope
      let children = [blockScope0];
      let through = [];

      let variables = new Map;
      variables.set("f", [[fNode1], [fNode2]]);

      let referenceTypes = new Map;
      referenceTypes.set(fNode2, Accessibility.READ);

      checkScope(catchScope1, catchScope1Node, ScopeType.CATCH, false, children, through, variables, referenceTypes);
    }
    { // second catch scope's block
      let children = [];
      let through = ["f"];

      let variables = new Map;
      variables.set("a", [[aNode1], NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(blockScope0, blockScope0Node, ScopeType.BLOCK, false, children, through, variables, referenceTypes);
    }
    { // third catch scope
      let children = [blockScope1];
      let through = [];

      let variables = new Map;
      variables.set("g", [[gNode1], NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(catchScope2, catchScope2Node, ScopeType.CATCH, false, children, through, variables, referenceTypes);
    }
    { // third catch scope's block
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("g", [[gNode2], [gNode3]]);

      let referenceTypes = new Map;
      referenceTypes.set(gNode3, Accessibility.READ);

      checkScope(blockScope1, blockScope1Node, ScopeType.BLOCK, false, children, through, variables, referenceTypes);
    }
  });

  test("block-scoped declaration in ForInStatement", () => {
    const js =
      `for(let a in a) { a; }
      for(let b in b) b;
      for(let c in c) { let c; c; }`;
    let script = parse(js);

    let globalScope = analyze(script);
    let [forInScope0, forInScope1, forInScope2] = globalScope.children;
    let forInScope0Node = script.body.statements[0];
    let forInScope1Node = script.body.statements[1];
    let forInScope2Node = script.body.statements[2];
    let blockScope = forInScope2.children[0];
    let blockScopeNode = script.body.statements[2].body.block;

    let aNode1 = script.body.statements[0].left.declarators[0].binding;
    let aNode2 = script.body.statements[0].right.identifier;
    let aNode3 = script.body.statements[0].body.block.statements[0].expression.identifier;

    let bNode1 = script.body.statements[1].left.declarators[0].binding;
    let bNode2 = script.body.statements[1].right.identifier;
    let bNode3 = script.body.statements[1].body.expression.identifier;

    let cNode1 = script.body.statements[2].left.declarators[0].binding;
    let cNode2 = script.body.statements[2].right.identifier;
    let cNode3 = script.body.statements[2].body.block.statements[0].declaration.declarators[0].binding;
    let cNode4 = script.body.statements[2].body.block.statements[1].expression.identifier;

    { // global scope
      let children = [forInScope0, forInScope1, forInScope2];
      let through = ["a", "b", "c"];

      let variables = new Map;
      variables.set("a", [NO_DECLARATIONS, [aNode2]]);
      variables.set("b", [NO_DECLARATIONS, [bNode2]]);
      variables.set("c", [NO_DECLARATIONS, [cNode2]]);

      let referenceTypes = new Map;
      referenceTypes.set(aNode2, Accessibility.READ);
      referenceTypes.set(bNode2, Accessibility.READ);
      referenceTypes.set(cNode2, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // first for-in scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("a", [[aNode1], [aNode1, aNode3]]);

      let referenceTypes = new Map;
      referenceTypes.set(aNode1, Accessibility.WRITE);
      referenceTypes.set(aNode3, Accessibility.READ);

      checkScope(forInScope0, forInScope0Node, ScopeType.BLOCK, false, children, through, variables, referenceTypes);
    }
    { // second for-in scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("b", [[bNode1], [bNode1, bNode3]]);

      let referenceTypes = new Map;
      referenceTypes.set(bNode1, Accessibility.WRITE);
      referenceTypes.set(bNode3, Accessibility.READ);

      checkScope(forInScope1, forInScope1Node, ScopeType.BLOCK, false, children, through, variables, referenceTypes);
    }
    { // third for-in scope
      let children = [blockScope];
      let through = [];

      let variables = new Map;
      variables.set("c", [[cNode1], [cNode1]]);

      let referenceTypes = new Map;
      referenceTypes.set(cNode1, Accessibility.WRITE);

      checkScope(forInScope2, forInScope2Node, ScopeType.BLOCK, false, children, through, variables, referenceTypes);
    }
    { // third for-in scope's block
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("c", [[cNode3], [cNode4]]);

      let referenceTypes = new Map;
      referenceTypes.set(cNode4, Accessibility.READ);

      checkScope(blockScope, blockScopeNode, ScopeType.BLOCK, false, children, through, variables, referenceTypes);
    }
  });

  test("block-scoped declaration in ForStatement", () => {
    const js =
      `for(let a; d; e) { a; }
      for(let b; f; g) b;
      for(let c; h; i) { let c; c; }`;
    let script = parse(js);

    let globalScope = analyze(script);
    let [forScope0, forScope1, forScope2] = globalScope.children;
    let forScope0Node = script.body.statements[0];
    let forScope1Node = script.body.statements[1];
    let forScope2Node = script.body.statements[2];
    let blockScope = forScope2.children[0];
    let blockScopeNode = script.body.statements[2].body.block;

    let aNode1 = script.body.statements[0].init.declarators[0].binding;
    let aNode2 = script.body.statements[0].body.block.statements[0].expression.identifier;
    let dNode = script.body.statements[0].test.identifier;
    let eNode = script.body.statements[0].update.identifier;

    let bNode1 = script.body.statements[1].init.declarators[0].binding;
    let bNode2 = script.body.statements[1].body.expression.identifier;
    let fNode = script.body.statements[1].test.identifier;
    let gNode = script.body.statements[1].update.identifier;

    let cNode1 = script.body.statements[2].init.declarators[0].binding;
    let cNode2 = script.body.statements[2].body.block.statements[0].declaration.declarators[0].binding;
    let cNode3 = script.body.statements[2].body.block.statements[1].expression.identifier;
    let hNode = script.body.statements[2].test.identifier;
    let iNode = script.body.statements[2].update.identifier;

    { // global scope
      let children = [forScope0, forScope1, forScope2];
      let through = ["d", "e", "f", "g", "h", "i"];

      let variables = new Map;
      variables.set("d", [NO_DECLARATIONS, [dNode]]);
      variables.set("e", [NO_DECLARATIONS, [eNode]]);
      variables.set("f", [NO_DECLARATIONS, [fNode]]);
      variables.set("g", [NO_DECLARATIONS, [gNode]]);
      variables.set("h", [NO_DECLARATIONS, [hNode]]);
      variables.set("i", [NO_DECLARATIONS, [iNode]]);

      let referenceTypes = new Map;
      referenceTypes.set(dNode, Accessibility.READ);
      referenceTypes.set(eNode, Accessibility.READ);
      referenceTypes.set(fNode, Accessibility.READ);
      referenceTypes.set(gNode, Accessibility.READ);
      referenceTypes.set(hNode, Accessibility.READ);
      referenceTypes.set(iNode, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // first for scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("a", [[aNode1], [aNode2]]);

      let referenceTypes = new Map;
      referenceTypes.set(aNode2, Accessibility.READ);

      checkScope(forScope0, forScope0Node, ScopeType.BLOCK, false, children, through, variables, referenceTypes);
    }
    { // second for scope
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("b", [[bNode1], [bNode2]]);

      let referenceTypes = new Map;
      referenceTypes.set(bNode2, Accessibility.READ);

      checkScope(forScope1, forScope1Node, ScopeType.BLOCK, false, children, through, variables, referenceTypes);
    }
    { // third for scope
      let children = [blockScope];
      let through = [];

      let variables = new Map;
      variables.set("c", [[cNode1], NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(forScope2, forScope2Node, ScopeType.BLOCK, false, children, through, variables, referenceTypes);
    }
    { // third for scope's block
      let children = [];
      let through = [];

      let variables = new Map;
      variables.set("c", [[cNode2], [cNode3]]);

      let referenceTypes = new Map;
      referenceTypes.set(cNode3, Accessibility.READ);

      checkScope(blockScope, blockScopeNode, ScopeType.BLOCK, false, children, through, variables, referenceTypes);
    }
  });

  test("direct/indirect call to eval", () => {
    const js =
      `function f() {
        eval(s);
        function g() {
          (0, eval)(s);
        }
      }`;
    let script = parse(js);

    let globalScope = analyze(script);
    let fScope = globalScope.children[0];
    let fScopeNode = script.body.statements[0];
    let gScope = fScope.children[0];
    let gScopeNode = fScopeNode.body.statements[1];

    let fNode = script.body.statements[0].name;
    let gNode = script.body.statements[0].body.statements[1].name;
    let evalNode1 = script.body.statements[0].body.statements[0].expression.callee.identifier
    let evalNode2 = script.body.statements[0].body.statements[1].body.statements[0].expression.callee.right.identifier;
    let sNode1 = script.body.statements[0].body.statements[0].expression.arguments[0].identifier;
    let sNode2 = script.body.statements[0].body.statements[1].body.statements[0].expression.arguments[0].identifier;

    { // global scope
      let children = [fScope];
      let through = ["eval", "s"];

      let variables = new Map;
      variables.set("eval", [NO_DECLARATIONS, [evalNode1, evalNode2]]);
      variables.set("s", [NO_DECLARATIONS, [sNode1, sNode2]]);
      variables.set("f", [[fNode], NO_REFERENCES]);

      let referenceTypes = new Map;
      referenceTypes.set(evalNode1, Accessibility.READ);
      referenceTypes.set(evalNode2, Accessibility.READ);
      referenceTypes.set(sNode1, Accessibility.READ);
      referenceTypes.set(sNode2, Accessibility.READ);

      checkScope(globalScope, script, ScopeType.GLOBAL, true, children, through, variables, referenceTypes);
    }
    { // f scope
      let children = [gScope];
      let through = ["eval", "s"];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);
      variables.set("g", [[gNode], NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(fScope, fScopeNode, ScopeType.FUNCTION, true, children, through, variables, referenceTypes);
    }
    { // g scope
      let children = [];
      let through = ["eval", "s"];

      let variables = new Map;
      variables.set("arguments", [NO_DECLARATIONS, NO_REFERENCES]);

      let referenceTypes = new Map;

      checkScope(gScope, gScopeNode, ScopeType.FUNCTION, false, children, through, variables, referenceTypes);
    }
  });
});
