"use strict";

var Map = require("es6-map");

var MultiMap = require("multimap");

MultiMap.Map = Map;

var Scope = require("./scope").Scope;
var GlobalScope = require("./scope").GlobalScope;
var ScopeType = require("./scope").ScopeType;
var Variable = require("./variable")["default"];


MultiMap.prototype.merge = function merge(otherMultiMap) {
  var _this = this;
  otherMultiMap.forEachEntry(function (v, k) {
    _this.set.apply(_this, [k].concat(v));
  });
  return this;
};

function resolveArguments(freeIdentifiers, variables) {
  var args = freeIdentifiers.get("arguments") || [];
  freeIdentifiers["delete"]("arguments");
  return variables.concat(new Variable("arguments", args, []));
}

function resolveDeclarations(freeIdentifiers, decls, variables) {
  decls.forEachEntry(function (declarations, name) {
    var references = freeIdentifiers.get(name) || [];
    variables = variables.concat(new Variable(name, references, declarations));
    freeIdentifiers["delete"](name);
  });
  return variables;
}

var ScopeState = (function () {
  var ScopeState = function ScopeState(freeIdentifiers, functionScopedDeclarations, blockScopedDeclarations, children, dynamic) {
    this.freeIdentifiers = freeIdentifiers;
    this.functionScopedDeclarations = functionScopedDeclarations;
    this.blockScopedDeclarations = blockScopedDeclarations;
    this.children = children;
    this.dynamic = dynamic;
  };

  ScopeState.empty = function () {
    return new ScopeState(new MultiMap(), new MultiMap(), new MultiMap(), [], false);
  };

  ScopeState.prototype.concat = function (a) {
    if (this === a) {
      return this;
    }
    return new ScopeState((new MultiMap()).merge(a.freeIdentifiers).merge(this.freeIdentifiers), (new MultiMap()).merge(a.functionScopedDeclarations).merge(this.functionScopedDeclarations), (new MultiMap()).merge(a.blockScopedDeclarations).merge(this.blockScopedDeclarations), a.children.concat(this.children), a.dynamic || this.dynamic);
  };

  ScopeState.prototype.addDeclaration = function (decl) {
    var declMap = new MultiMap();
    declMap.merge(decl.kind.isBlockScoped ? this.blockScopedDeclarations : this.functionScopedDeclarations);
    declMap.set(decl.node.name, decl);
    return new ScopeState(this.freeIdentifiers, decl.kind.isBlockScoped ? this.functionScopedDeclarations : declMap, decl.kind.isBlockScoped ? declMap : this.blockScopedDeclarations, this.children, this.dynamic);
  };

  ScopeState.prototype.addReference = function (ref) {
    var freeMap = new MultiMap();
    freeMap.merge(this.freeIdentifiers);
    freeMap.set(ref.node.name, ref);
    return new ScopeState(freeMap, this.functionScopedDeclarations, this.blockScopedDeclarations, this.children, this.dynamic);
  };

  ScopeState.prototype.taint = function () {
    return new ScopeState(this.freeIdentifiers, this.functionScopedDeclarations, this.blockScopedDeclarations, this.children, true);
  };

  ScopeState.prototype.finish = function (astNode, scopeType) {
    var variables = [];
    var functionScope = new MultiMap();
    var freeIdentifiers = new MultiMap();

    freeIdentifiers.merge(this.freeIdentifiers);

    switch (scopeType) {
      case ScopeType.BLOCK:
      case ScopeType.CATCH:
      case ScopeType.WITH:
        // resolve references to only block-scoped free declarations
        variables = resolveDeclarations(freeIdentifiers, this.blockScopedDeclarations, variables);
        functionScope.merge(this.functionScopedDeclarations);
        break;
      default:
        // resolve references to both block-scoped and function-scoped free declarations
        if (scopeType === ScopeType.FUNCTION) {
          variables = resolveArguments(freeIdentifiers, variables);
        }
        variables = resolveDeclarations(freeIdentifiers, this.blockScopedDeclarations, variables);
        variables = resolveDeclarations(freeIdentifiers, this.functionScopedDeclarations, variables);
        break;
    }

    var scope = scopeType === ScopeType.GLOBAL ? new GlobalScope(this.children, variables, freeIdentifiers, astNode) : new Scope(this.children, variables, freeIdentifiers, scopeType, this.dynamic, astNode);

    return new ScopeState(freeIdentifiers, functionScope, new MultiMap(), [scope], false);
  };

  return ScopeState;
})();

exports["default"] = ScopeState;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9zY29wZS1zdGF0ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztJQWdCWSxHQUFHOztJQUNILFFBQVE7O0FBQ3BCLFFBQVEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDOztJQUVYLEtBQUssc0JBQUwsS0FBSztJQUFFLFdBQVcsc0JBQVgsV0FBVztJQUFFLFNBQVMsc0JBQVQsU0FBUztJQUM5QixRQUFROzs7QUFFZixRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxTQUFTLEtBQUssQ0FBQyxhQUFhLEVBQUU7O0FBQ3ZELGVBQWEsQ0FBQyxZQUFZLENBQUMsVUFBQyxDQUFDLEVBQUUsQ0FBQyxFQUFLO0FBQ25DLFVBQUssR0FBRyxDQUFDLEtBQUssUUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3JDLENBQUMsQ0FBQztBQUNILFNBQU8sSUFBSSxDQUFDO0NBQ2IsQ0FBQTs7QUFFRCxTQUFTLGdCQUFnQixDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUU7QUFDcEQsTUFBSSxJQUFJLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDbEQsaUJBQWUsVUFBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3BDLFNBQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7Q0FDOUQ7O0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxlQUFlLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRTtBQUM5RCxPQUFLLENBQUMsWUFBWSxDQUFDLFVBQUMsWUFBWSxFQUFFLElBQUksRUFBSztBQUN6QyxRQUFJLFVBQVUsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNqRCxhQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDM0UsbUJBQWUsVUFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQzlCLENBQUMsQ0FBQztBQUNILFNBQU8sU0FBUyxDQUFDO0NBQ2xCOztJQUVvQixVQUFVO01BQVYsVUFBVSxHQUNsQixTQURRLFVBQVUsQ0FDakIsZUFBZSxFQUFFLDBCQUEwQixFQUFFLHVCQUF1QixFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUU7QUFDbkcsUUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7QUFDdkMsUUFBSSxDQUFDLDBCQUEwQixHQUFHLDBCQUEwQixDQUFDO0FBQzdELFFBQUksQ0FBQyx1QkFBdUIsR0FBRyx1QkFBdUIsQ0FBQztBQUN2RCxRQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUN6QixRQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztHQUN4Qjs7QUFQa0IsWUFBVSxDQVN0QixLQUFLLEdBQUEsWUFBRztBQUNiLFdBQU8sSUFBSSxVQUFVLENBQ25CLElBQUksUUFBUSxFQUFBLEVBQ1osSUFBSSxRQUFRLEVBQUEsRUFDWixJQUFJLFFBQVEsRUFBQSxFQUNaLEVBQUUsRUFDRixLQUFLLENBQ04sQ0FBQztHQUNIOztBQWpCa0IsWUFBVSxXQXNCN0IsTUFBTSxHQUFBLFVBQUMsQ0FBQyxFQUFFO0FBQ1IsUUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO0FBQ2QsYUFBTyxJQUFJLENBQUM7S0FDYjtBQUNELFdBQU8sSUFBSSxVQUFVLENBQ25CLENBQUMsSUFBSSxRQUFRLEVBQUEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFDbkUsQ0FBQyxJQUFJLFFBQVEsRUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsRUFDekYsQ0FBQyxJQUFJLFFBQVEsRUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsRUFDbkYsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUNoQyxDQUFDLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQzFCLENBQUM7R0FDSDs7QUFqQ2tCLFlBQVUsV0FzQzdCLGNBQWMsR0FBQSxVQUFDLElBQUksRUFBRTtBQUNuQixRQUFJLE9BQU8sR0FBRyxJQUFJLFFBQVEsRUFBQSxDQUFDO0FBQzNCLFdBQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQ3hHLFdBQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbEMsV0FBTyxJQUFJLFVBQVUsQ0FDbkIsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixHQUFHLE9BQU8sRUFDbkUsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsRUFDaEUsSUFBSSxDQUFDLFFBQVEsRUFDYixJQUFJLENBQUMsT0FBTyxDQUNiLENBQUM7R0FDSDs7QUFqRGtCLFlBQVUsV0FzRDdCLFlBQVksR0FBQSxVQUFDLEdBQUcsRUFBRTtBQUNoQixRQUFJLE9BQU8sR0FBRyxJQUFJLFFBQVEsRUFBQSxDQUFDO0FBQzNCLFdBQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3BDLFdBQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDaEMsV0FBTyxJQUFJLFVBQVUsQ0FDbkIsT0FBTyxFQUNQLElBQUksQ0FBQywwQkFBMEIsRUFDL0IsSUFBSSxDQUFDLHVCQUF1QixFQUM1QixJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FBQyxPQUFPLENBQ2IsQ0FBQztHQUNIOztBQWpFa0IsWUFBVSxXQW1FN0IsS0FBSyxHQUFBLFlBQUc7QUFDTixXQUFPLElBQUksVUFBVSxDQUNuQixJQUFJLENBQUMsZUFBZSxFQUNwQixJQUFJLENBQUMsMEJBQTBCLEVBQy9CLElBQUksQ0FBQyx1QkFBdUIsRUFDNUIsSUFBSSxDQUFDLFFBQVEsRUFDYixJQUFJLENBQ0wsQ0FBQztHQUNIOztBQTNFa0IsWUFBVSxXQWtGN0IsTUFBTSxHQUFBLFVBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRTtBQUN6QixRQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDbkIsUUFBSSxhQUFhLEdBQUcsSUFBSSxRQUFRLEVBQUEsQ0FBQztBQUNqQyxRQUFJLGVBQWUsR0FBRyxJQUFJLFFBQVEsRUFBQSxDQUFDOztBQUVuQyxtQkFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7O0FBRTVDLFlBQVEsU0FBUztBQUNqQixXQUFLLFNBQVMsQ0FBQyxLQUFLLEVBQUM7QUFDckIsV0FBSyxTQUFTLENBQUMsS0FBSyxFQUFDO0FBQ3JCLFdBQUssU0FBUyxDQUFDLElBQUk7O0FBRWpCLGlCQUFTLEdBQUcsbUJBQW1CLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUMxRixxQkFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUNyRCxjQUFNO0FBQUEsQUFDUjs7QUFFRSxZQUFJLFNBQVMsS0FBSyxTQUFTLENBQUMsUUFBUSxFQUFFO0FBQ3BDLG1CQUFTLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1NBQzFEO0FBQ0QsaUJBQVMsR0FBRyxtQkFBbUIsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzFGLGlCQUFTLEdBQUcsbUJBQW1CLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQywwQkFBMEIsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUM3RixjQUFNO0FBQUEsS0FDUDs7QUFFRCxRQUFJLEtBQUssR0FBRyxTQUFTLEtBQUssU0FBUyxDQUFDLE1BQU0sR0FDdEMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxHQUNuRSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7O0FBRTNGLFdBQU8sSUFBSSxVQUFVLENBQ25CLGVBQWUsRUFDZixhQUFhLEVBQ2IsSUFBSSxRQUFRLEVBQUEsRUFDWixDQUFDLEtBQUssQ0FBQyxFQUNQLEtBQUssQ0FDTixDQUFDO0dBQ0g7O1NBdEhrQixVQUFVOzs7cUJBQVYsVUFBVSIsImZpbGUiOiJzcmMvc2NvcGUtc3RhdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENvcHlyaWdodCAyMDE0IFNoYXBlIFNlY3VyaXR5LCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKVxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0ICogYXMgTWFwIGZyb20gXCJlczYtbWFwXCI7XG5pbXBvcnQgKiBhcyBNdWx0aU1hcCBmcm9tIFwibXVsdGltYXBcIjtcbk11bHRpTWFwLk1hcCA9IE1hcDtcblxuaW1wb3J0IHtTY29wZSwgR2xvYmFsU2NvcGUsIFNjb3BlVHlwZX0gZnJvbSBcIi4vc2NvcGVcIjtcbmltcG9ydCBWYXJpYWJsZSBmcm9tIFwiLi92YXJpYWJsZVwiO1xuXG5NdWx0aU1hcC5wcm90b3R5cGUubWVyZ2UgPSBmdW5jdGlvbiBtZXJnZShvdGhlck11bHRpTWFwKSB7XG4gIG90aGVyTXVsdGlNYXAuZm9yRWFjaEVudHJ5KCh2LCBrKSA9PiB7XG4gICAgdGhpcy5zZXQuYXBwbHkodGhpcywgW2tdLmNvbmNhdCh2KSk7XG4gIH0pO1xuICByZXR1cm4gdGhpcztcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZUFyZ3VtZW50cyhmcmVlSWRlbnRpZmllcnMsIHZhcmlhYmxlcykge1xuICBsZXQgYXJncyA9IGZyZWVJZGVudGlmaWVycy5nZXQoXCJhcmd1bWVudHNcIikgfHwgW107XG4gIGZyZWVJZGVudGlmaWVycy5kZWxldGUoXCJhcmd1bWVudHNcIik7XG4gIHJldHVybiB2YXJpYWJsZXMuY29uY2F0KG5ldyBWYXJpYWJsZShcImFyZ3VtZW50c1wiLCBhcmdzLCBbXSkpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlRGVjbGFyYXRpb25zKGZyZWVJZGVudGlmaWVycywgZGVjbHMsIHZhcmlhYmxlcykge1xuICBkZWNscy5mb3JFYWNoRW50cnkoKGRlY2xhcmF0aW9ucywgbmFtZSkgPT4ge1xuICAgIGxldCByZWZlcmVuY2VzID0gZnJlZUlkZW50aWZpZXJzLmdldChuYW1lKSB8fCBbXTtcbiAgICB2YXJpYWJsZXMgPSB2YXJpYWJsZXMuY29uY2F0KG5ldyBWYXJpYWJsZShuYW1lLCByZWZlcmVuY2VzLCBkZWNsYXJhdGlvbnMpKTtcbiAgICBmcmVlSWRlbnRpZmllcnMuZGVsZXRlKG5hbWUpO1xuICB9KTtcbiAgcmV0dXJuIHZhcmlhYmxlcztcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2NvcGVTdGF0ZSB7XG4gIGNvbnN0cnVjdG9yKGZyZWVJZGVudGlmaWVycywgZnVuY3Rpb25TY29wZWREZWNsYXJhdGlvbnMsIGJsb2NrU2NvcGVkRGVjbGFyYXRpb25zLCBjaGlsZHJlbiwgZHluYW1pYykge1xuICAgIHRoaXMuZnJlZUlkZW50aWZpZXJzID0gZnJlZUlkZW50aWZpZXJzO1xuICAgIHRoaXMuZnVuY3Rpb25TY29wZWREZWNsYXJhdGlvbnMgPSBmdW5jdGlvblNjb3BlZERlY2xhcmF0aW9ucztcbiAgICB0aGlzLmJsb2NrU2NvcGVkRGVjbGFyYXRpb25zID0gYmxvY2tTY29wZWREZWNsYXJhdGlvbnM7XG4gICAgdGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgIHRoaXMuZHluYW1pYyA9IGR5bmFtaWM7XG4gIH1cblxuICBzdGF0aWMgZW1wdHkoKSB7XG4gICAgcmV0dXJuIG5ldyBTY29wZVN0YXRlKFxuICAgICAgbmV3IE11bHRpTWFwLFxuICAgICAgbmV3IE11bHRpTWFwLFxuICAgICAgbmV3IE11bHRpTWFwLFxuICAgICAgW10sXG4gICAgICBmYWxzZVxuICAgICk7XG4gIH1cblxuICAvKlxuICAgKiBNb25vaWRhbCBhcHBlbmQ6IG1lcmdlcyB0aGUgdHdvIHN0YXRlcyB0b2dldGhlclxuICAgKi9cbiAgY29uY2F0KGEpIHtcbiAgICBpZiAodGhpcyA9PT0gYSkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHJldHVybiBuZXcgU2NvcGVTdGF0ZShcbiAgICAgIChuZXcgTXVsdGlNYXApLm1lcmdlKGEuZnJlZUlkZW50aWZpZXJzKS5tZXJnZSh0aGlzLmZyZWVJZGVudGlmaWVycyksXG4gICAgICAobmV3IE11bHRpTWFwKS5tZXJnZShhLmZ1bmN0aW9uU2NvcGVkRGVjbGFyYXRpb25zKS5tZXJnZSh0aGlzLmZ1bmN0aW9uU2NvcGVkRGVjbGFyYXRpb25zKSxcbiAgICAgIChuZXcgTXVsdGlNYXApLm1lcmdlKGEuYmxvY2tTY29wZWREZWNsYXJhdGlvbnMpLm1lcmdlKHRoaXMuYmxvY2tTY29wZWREZWNsYXJhdGlvbnMpLFxuICAgICAgYS5jaGlsZHJlbi5jb25jYXQodGhpcy5jaGlsZHJlbiksXG4gICAgICBhLmR5bmFtaWMgfHwgdGhpcy5keW5hbWljXG4gICAgKTtcbiAgfVxuXG4gIC8qXG4gICAqIE9ic2VydmUgYSB2YXJpYWJsZSBlbnRlcmluZyBzY29wZVxuICAgKi9cbiAgYWRkRGVjbGFyYXRpb24oZGVjbCkge1xuICAgIGxldCBkZWNsTWFwID0gbmV3IE11bHRpTWFwO1xuICAgIGRlY2xNYXAubWVyZ2UoZGVjbC5raW5kLmlzQmxvY2tTY29wZWQgPyB0aGlzLmJsb2NrU2NvcGVkRGVjbGFyYXRpb25zIDogdGhpcy5mdW5jdGlvblNjb3BlZERlY2xhcmF0aW9ucyk7XG4gICAgZGVjbE1hcC5zZXQoZGVjbC5ub2RlLm5hbWUsIGRlY2wpO1xuICAgIHJldHVybiBuZXcgU2NvcGVTdGF0ZShcbiAgICAgIHRoaXMuZnJlZUlkZW50aWZpZXJzLFxuICAgICAgZGVjbC5raW5kLmlzQmxvY2tTY29wZWQgPyB0aGlzLmZ1bmN0aW9uU2NvcGVkRGVjbGFyYXRpb25zIDogZGVjbE1hcCxcbiAgICAgIGRlY2wua2luZC5pc0Jsb2NrU2NvcGVkID8gZGVjbE1hcCA6IHRoaXMuYmxvY2tTY29wZWREZWNsYXJhdGlvbnMsXG4gICAgICB0aGlzLmNoaWxkcmVuLFxuICAgICAgdGhpcy5keW5hbWljXG4gICAgKTtcbiAgfVxuXG4gIC8qXG4gICAqIE9ic2VydmUgYSByZWZlcmVuY2UgdG8gYSB2YXJpYWJsZVxuICAgKi9cbiAgYWRkUmVmZXJlbmNlKHJlZikge1xuICAgIGxldCBmcmVlTWFwID0gbmV3IE11bHRpTWFwO1xuICAgIGZyZWVNYXAubWVyZ2UodGhpcy5mcmVlSWRlbnRpZmllcnMpO1xuICAgIGZyZWVNYXAuc2V0KHJlZi5ub2RlLm5hbWUsIHJlZik7XG4gICAgcmV0dXJuIG5ldyBTY29wZVN0YXRlKFxuICAgICAgZnJlZU1hcCxcbiAgICAgIHRoaXMuZnVuY3Rpb25TY29wZWREZWNsYXJhdGlvbnMsXG4gICAgICB0aGlzLmJsb2NrU2NvcGVkRGVjbGFyYXRpb25zLFxuICAgICAgdGhpcy5jaGlsZHJlbixcbiAgICAgIHRoaXMuZHluYW1pY1xuICAgICk7XG4gIH1cblxuICB0YWludCgpIHtcbiAgICByZXR1cm4gbmV3IFNjb3BlU3RhdGUoXG4gICAgICB0aGlzLmZyZWVJZGVudGlmaWVycyxcbiAgICAgIHRoaXMuZnVuY3Rpb25TY29wZWREZWNsYXJhdGlvbnMsXG4gICAgICB0aGlzLmJsb2NrU2NvcGVkRGVjbGFyYXRpb25zLFxuICAgICAgdGhpcy5jaGlsZHJlbixcbiAgICAgIHRydWVcbiAgICApO1xuICB9XG5cbiAgLypcbiAgICogVXNlZCB3aGVuIGEgc2NvcGUgYm91bmRhcnkgaXMgZW5jb3VudGVyZWQuIFJlc29sdmVzIGZvdW5kIGZyZWUgaWRlbnRpZmllcnNcbiAgICogYW5kIGRlY2xhcmF0aW9ucyBpbnRvIHZhcmlhYmxlIG9iamVjdHMuIEFueSBmcmVlIGlkZW50aWZpZXJzIHJlbWFpbmluZyBhcmVcbiAgICogY2FycmllZCBmb3J3YXJkIGludG8gdGhlIG5ldyBzdGF0ZSBvYmplY3QuXG4gICAqL1xuICBmaW5pc2goYXN0Tm9kZSwgc2NvcGVUeXBlKSB7XG4gICAgbGV0IHZhcmlhYmxlcyA9IFtdO1xuICAgIGxldCBmdW5jdGlvblNjb3BlID0gbmV3IE11bHRpTWFwO1xuICAgIGxldCBmcmVlSWRlbnRpZmllcnMgPSBuZXcgTXVsdGlNYXA7XG5cbiAgICBmcmVlSWRlbnRpZmllcnMubWVyZ2UodGhpcy5mcmVlSWRlbnRpZmllcnMpO1xuXG4gICAgc3dpdGNoIChzY29wZVR5cGUpIHtcbiAgICBjYXNlIFNjb3BlVHlwZS5CTE9DSzpcbiAgICBjYXNlIFNjb3BlVHlwZS5DQVRDSDpcbiAgICBjYXNlIFNjb3BlVHlwZS5XSVRIOlxuICAgICAgLy8gcmVzb2x2ZSByZWZlcmVuY2VzIHRvIG9ubHkgYmxvY2stc2NvcGVkIGZyZWUgZGVjbGFyYXRpb25zXG4gICAgICB2YXJpYWJsZXMgPSByZXNvbHZlRGVjbGFyYXRpb25zKGZyZWVJZGVudGlmaWVycywgdGhpcy5ibG9ja1Njb3BlZERlY2xhcmF0aW9ucywgdmFyaWFibGVzKTtcbiAgICAgIGZ1bmN0aW9uU2NvcGUubWVyZ2UodGhpcy5mdW5jdGlvblNjb3BlZERlY2xhcmF0aW9ucyk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgLy8gcmVzb2x2ZSByZWZlcmVuY2VzIHRvIGJvdGggYmxvY2stc2NvcGVkIGFuZCBmdW5jdGlvbi1zY29wZWQgZnJlZSBkZWNsYXJhdGlvbnNcbiAgICAgIGlmIChzY29wZVR5cGUgPT09IFNjb3BlVHlwZS5GVU5DVElPTikge1xuICAgICAgICB2YXJpYWJsZXMgPSByZXNvbHZlQXJndW1lbnRzKGZyZWVJZGVudGlmaWVycywgdmFyaWFibGVzKTtcbiAgICAgIH1cbiAgICAgIHZhcmlhYmxlcyA9IHJlc29sdmVEZWNsYXJhdGlvbnMoZnJlZUlkZW50aWZpZXJzLCB0aGlzLmJsb2NrU2NvcGVkRGVjbGFyYXRpb25zLCB2YXJpYWJsZXMpO1xuICAgICAgdmFyaWFibGVzID0gcmVzb2x2ZURlY2xhcmF0aW9ucyhmcmVlSWRlbnRpZmllcnMsIHRoaXMuZnVuY3Rpb25TY29wZWREZWNsYXJhdGlvbnMsIHZhcmlhYmxlcyk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBsZXQgc2NvcGUgPSBzY29wZVR5cGUgPT09IFNjb3BlVHlwZS5HTE9CQUxcbiAgICAgID8gbmV3IEdsb2JhbFNjb3BlKHRoaXMuY2hpbGRyZW4sIHZhcmlhYmxlcywgZnJlZUlkZW50aWZpZXJzLCBhc3ROb2RlKVxuICAgICAgOiBuZXcgU2NvcGUodGhpcy5jaGlsZHJlbiwgdmFyaWFibGVzLCBmcmVlSWRlbnRpZmllcnMsIHNjb3BlVHlwZSwgdGhpcy5keW5hbWljLCBhc3ROb2RlKTtcblxuICAgIHJldHVybiBuZXcgU2NvcGVTdGF0ZShcbiAgICAgIGZyZWVJZGVudGlmaWVycyxcbiAgICAgIGZ1bmN0aW9uU2NvcGUsXG4gICAgICBuZXcgTXVsdGlNYXAsXG4gICAgICBbc2NvcGVdLFxuICAgICAgZmFsc2VcbiAgICApO1xuICB9XG59XG4iXX0=