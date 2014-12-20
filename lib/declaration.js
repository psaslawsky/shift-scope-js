"use strict";

var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

var DeclarationType = function DeclarationType(name, isBlockScoped) {
  this.name = name;
  this.isBlockScoped = !!isBlockScoped;
  this.isFunctionScoped = !isBlockScoped;
};

exports.DeclarationType = DeclarationType;
var BlockScopedDeclaration = (function (DeclarationType) {
  var BlockScopedDeclaration = function BlockScopedDeclaration(name) {
    DeclarationType.call(this, name, true);
  };

  _extends(BlockScopedDeclaration, DeclarationType);

  return BlockScopedDeclaration;
})(DeclarationType);

exports.BlockScopedDeclaration = BlockScopedDeclaration;
var FunctionScopedDeclaration = (function (DeclarationType) {
  var FunctionScopedDeclaration = function FunctionScopedDeclaration(name) {
    DeclarationType.call(this, name, false);
  };

  _extends(FunctionScopedDeclaration, DeclarationType);

  return FunctionScopedDeclaration;
})(DeclarationType);

exports.FunctionScopedDeclaration = FunctionScopedDeclaration;


DeclarationType.VAR = new FunctionScopedDeclaration("var");
DeclarationType.CONST = new BlockScopedDeclaration("const");
DeclarationType.LET = new BlockScopedDeclaration("let");
DeclarationType.FUNCTION_NAME = new FunctionScopedDeclaration("function name");
DeclarationType.PARAMETER = new FunctionScopedDeclaration("parameter");
DeclarationType.CATCH = new BlockScopedDeclaration("catch");

var Declaration = (function () {
  var Declaration = function Declaration(node, kind) {
    this.node = node;
    this.kind = kind;
  };

  Declaration.fromVarDeclKind = function (node, variableDeclarationKind) {
    switch (variableDeclarationKind) {
      case "var":
        return new VarDeclaration(node);
      case "const":
        return new ConstDeclaration(node);
      case "let":
        return new LetDeclaration(node);
      default:
        throw new Error("Invalid VariableDeclarationKind: " + JSON.stringify(variableDeclarationKind));
    }
  };

  return Declaration;
})();

exports.Declaration = Declaration;
var VarDeclaration = (function (Declaration) {
  var VarDeclaration = function VarDeclaration(node) {
    Declaration.call(this, node, DeclarationType.VAR);
  };

  _extends(VarDeclaration, Declaration);

  return VarDeclaration;
})(Declaration);

exports.VarDeclaration = VarDeclaration;
var ConstDeclaration = (function (Declaration) {
  var ConstDeclaration = function ConstDeclaration(node) {
    Declaration.call(this, node, DeclarationType.CONST);
  };

  _extends(ConstDeclaration, Declaration);

  return ConstDeclaration;
})(Declaration);

exports.ConstDeclaration = ConstDeclaration;
var LetDeclaration = (function (Declaration) {
  var LetDeclaration = function LetDeclaration(node) {
    Declaration.call(this, node, DeclarationType.LET);
  };

  _extends(LetDeclaration, Declaration);

  return LetDeclaration;
})(Declaration);

exports.LetDeclaration = LetDeclaration;
var FunctionNameDeclaration = (function (Declaration) {
  var FunctionNameDeclaration = function FunctionNameDeclaration(node) {
    Declaration.call(this, node, DeclarationType.FUNCTION_NAME);
  };

  _extends(FunctionNameDeclaration, Declaration);

  return FunctionNameDeclaration;
})(Declaration);

exports.FunctionNameDeclaration = FunctionNameDeclaration;
var ParameterDeclaration = (function (Declaration) {
  var ParameterDeclaration = function ParameterDeclaration(node) {
    Declaration.call(this, node, DeclarationType.PARAMETER);
  };

  _extends(ParameterDeclaration, Declaration);

  return ParameterDeclaration;
})(Declaration);

exports.ParameterDeclaration = ParameterDeclaration;
var CatchDeclaration = (function (Declaration) {
  var CatchDeclaration = function CatchDeclaration(node) {
    Declaration.call(this, node, DeclarationType.CATCH);
  };

  _extends(CatchDeclaration, Declaration);

  return CatchDeclaration;
})(Declaration);

exports.CatchDeclaration = CatchDeclaration;
//# sourceMappingURL=data:application/json;base64,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QztHQUNwQzs7V0FIVSxnQkFBZ0IsRUFBUyxXQUFXOztTQUFwQyxnQkFBZ0I7R0FBUyxXQUFXOztRQUFwQyxnQkFBZ0IsR0FBaEIsZ0JBQWdCIiwiZmlsZSI6InNyYy9kZWNsYXJhdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ29weXJpZ2h0IDIwMTQgU2hhcGUgU2VjdXJpdHksIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5leHBvcnQgY2xhc3MgRGVjbGFyYXRpb25UeXBlIHtcbiAgY29uc3RydWN0b3IobmFtZSwgaXNCbG9ja1Njb3BlZCkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5pc0Jsb2NrU2NvcGVkID0gISFpc0Jsb2NrU2NvcGVkO1xuICAgIHRoaXMuaXNGdW5jdGlvblNjb3BlZCA9ICFpc0Jsb2NrU2NvcGVkO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBCbG9ja1Njb3BlZERlY2xhcmF0aW9uIGV4dGVuZHMgRGVjbGFyYXRpb25UeXBlIHtcbiAgY29uc3RydWN0b3IobmFtZSkge1xuICAgIHN1cGVyKG5hbWUsIHRydWUpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGdW5jdGlvblNjb3BlZERlY2xhcmF0aW9uIGV4dGVuZHMgRGVjbGFyYXRpb25UeXBlIHtcbiAgY29uc3RydWN0b3IobmFtZSkge1xuICAgIHN1cGVyKG5hbWUsIGZhbHNlKTtcbiAgfVxufVxuXG5EZWNsYXJhdGlvblR5cGUuVkFSID0gbmV3IEZ1bmN0aW9uU2NvcGVkRGVjbGFyYXRpb24oXCJ2YXJcIik7XG5EZWNsYXJhdGlvblR5cGUuQ09OU1QgPSBuZXcgQmxvY2tTY29wZWREZWNsYXJhdGlvbihcImNvbnN0XCIpO1xuRGVjbGFyYXRpb25UeXBlLkxFVCA9IG5ldyBCbG9ja1Njb3BlZERlY2xhcmF0aW9uKFwibGV0XCIpO1xuRGVjbGFyYXRpb25UeXBlLkZVTkNUSU9OX05BTUUgPSBuZXcgRnVuY3Rpb25TY29wZWREZWNsYXJhdGlvbihcImZ1bmN0aW9uIG5hbWVcIik7XG5EZWNsYXJhdGlvblR5cGUuUEFSQU1FVEVSID0gbmV3IEZ1bmN0aW9uU2NvcGVkRGVjbGFyYXRpb24oXCJwYXJhbWV0ZXJcIik7XG5EZWNsYXJhdGlvblR5cGUuQ0FUQ0ggPSBuZXcgQmxvY2tTY29wZWREZWNsYXJhdGlvbihcImNhdGNoXCIpO1xuXG5leHBvcnQgY2xhc3MgRGVjbGFyYXRpb24ge1xuICBjb25zdHJ1Y3Rvcihub2RlLCBraW5kKSB7XG4gICAgdGhpcy5ub2RlID0gbm9kZTtcbiAgICB0aGlzLmtpbmQgPSBraW5kO1xuICB9XG5cbiAgc3RhdGljIGZyb21WYXJEZWNsS2luZChub2RlLCB2YXJpYWJsZURlY2xhcmF0aW9uS2luZCkge1xuICAgIHN3aXRjaCAodmFyaWFibGVEZWNsYXJhdGlvbktpbmQpIHtcbiAgICBjYXNlIFwidmFyXCI6XG4gICAgICByZXR1cm4gbmV3IFZhckRlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGNhc2UgXCJjb25zdFwiOlxuICAgICAgcmV0dXJuIG5ldyBDb25zdERlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGNhc2UgXCJsZXRcIjpcbiAgICAgIHJldHVybiBuZXcgTGV0RGVjbGFyYXRpb24obm9kZSk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgVmFyaWFibGVEZWNsYXJhdGlvbktpbmQ6IFwiICsgSlNPTi5zdHJpbmdpZnkodmFyaWFibGVEZWNsYXJhdGlvbktpbmQpKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZhckRlY2xhcmF0aW9uIGV4dGVuZHMgRGVjbGFyYXRpb24ge1xuICBjb25zdHJ1Y3Rvcihub2RlKSB7XG4gICAgc3VwZXIobm9kZSwgRGVjbGFyYXRpb25UeXBlLlZBUik7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENvbnN0RGVjbGFyYXRpb24gZXh0ZW5kcyBEZWNsYXJhdGlvbiB7XG4gIGNvbnN0cnVjdG9yKG5vZGUpIHtcbiAgICBzdXBlcihub2RlLCBEZWNsYXJhdGlvblR5cGUuQ09OU1QpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBMZXREZWNsYXJhdGlvbiBleHRlbmRzIERlY2xhcmF0aW9uIHtcbiAgY29uc3RydWN0b3Iobm9kZSkge1xuICAgIHN1cGVyKG5vZGUsIERlY2xhcmF0aW9uVHlwZS5MRVQpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBGdW5jdGlvbk5hbWVEZWNsYXJhdGlvbiBleHRlbmRzIERlY2xhcmF0aW9uIHtcbiAgY29uc3RydWN0b3Iobm9kZSkge1xuICAgIHN1cGVyKG5vZGUsIERlY2xhcmF0aW9uVHlwZS5GVU5DVElPTl9OQU1FKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgUGFyYW1ldGVyRGVjbGFyYXRpb24gZXh0ZW5kcyBEZWNsYXJhdGlvbiB7XG4gIGNvbnN0cnVjdG9yKG5vZGUpIHtcbiAgICBzdXBlcihub2RlLCBEZWNsYXJhdGlvblR5cGUuUEFSQU1FVEVSKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ2F0Y2hEZWNsYXJhdGlvbiBleHRlbmRzIERlY2xhcmF0aW9uIHtcbiAgY29uc3RydWN0b3Iobm9kZSkge1xuICAgIHN1cGVyKG5vZGUsIERlY2xhcmF0aW9uVHlwZS5DQVRDSCk7XG4gIH1cbn1cbiJdfQ==