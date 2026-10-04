/** Bounded returned-record tracing for Vue's shared row/header contracts. */
import ts from "typescript";

function unwrap(node) {
  while (
    node &&
    (ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isSatisfiesExpression(node))
  )
    node = node.expression;
  return node;
}
const fieldValue = (property) =>
  ts.isShorthandPropertyAssignment(property)
    ? property.name
    : property.initializer;
const nameOf = (node) =>
  node && (ts.isIdentifier(node) || ts.isStringLiteral(node))
    ? node.text
    : undefined;
function descendants(node, predicate) {
  const found = [];
  function visit(child) {
    if (predicate(child)) found.push(child);
    ts.forEachChild(child, visit);
  }
  visit(node);
  return found;
}
function returns(node) {
  if (!node.body) return [];
  if (!ts.isBlock(node.body)) return [unwrap(node.body)];
  const values = [];
  function visit(child) {
    if (ts.isFunctionLike(child)) return;
    if (ts.isReturnStatement(child) && child.expression)
      values.push(unwrap(child.expression));
    ts.forEachChild(child, visit);
  }
  visit(node.body);
  return values;
}
function statementValue(statement, name) {
  if (ts.isFunctionDeclaration(statement) && statement.name?.text === name)
    return statement;
  if (!ts.isVariableStatement(statement)) return undefined;
  return statement.declarationList.declarations.find(
    (declaration) => nameOf(declaration.name) === name
  )?.initializer;
}
function localValue(node, name) {
  let scope = node.parent;
  while (scope) {
    const statements =
      ts.isBlock(scope) || ts.isSourceFile(scope) ? scope.statements : [];
    for (const statement of statements) {
      const value = statementValue(statement, name);
      if (value) return value;
    }
    scope = scope.parent;
  }
  return undefined;
}

function locallyBound(node) {
  if (localValue(node, node.text)) return true;
  let scope = node.parent;
  while (scope) {
    if (
      ts.isFunctionLike(scope) &&
      scope.parameters.some((parameter) => nameOf(parameter.name) === node.text)
    )
      return true;
    scope = scope.parent;
  }
  return false;
}
function imported(node) {
  if (!ts.isIdentifier(node) || locallyBound(node)) return undefined;
  for (const statement of node.getSourceFile().statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue;
    const named = statement.importClause?.namedBindings;
    if (
      !named ||
      !ts.isNamedImports(named) ||
      statement.importClause.isTypeOnly
    )
      continue;
    const entry = named.elements.find(
      (item) => item.name.text === node.text && !item.isTypeOnly
    );
    if (entry)
      return {
        module: statement.moduleSpecifier.text,
        name: entry.propertyName?.text ?? entry.name.text,
      };
  }
  return undefined;
}
function officialCall(node, module, name) {
  if (!ts.isCallExpression(node)) return false;
  const target = imported(node.expression);
  return target?.module === module && target.name === name;
}

function originatesAt(expression, name, key = false, seen = new Set()) {
  expression = unwrap(expression);
  if (!expression || seen.has(expression)) return false;
  if (ts.isIdentifier(expression) && expression.text === name) return true;
  const next = new Set([...seen, expression]);
  if (ts.isIdentifier(expression))
    return originatesAt(
      localValue(expression, expression.text),
      name,
      key,
      next
    );
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
  )
    return originatesAt(expression.right, name, key, next);
  if (!key && ts.isConditionalExpression(expression))
    return (
      originatesAt(expression.whenTrue, name, key, next) ||
      originatesAt(expression.whenFalse, name, key, next)
    );
  if (!key && ts.isArrayLiteralExpression(expression))
    return expression.elements.some((entry) =>
      originatesAt(entry, name, key, next)
    );
  return false;
}
function copyAssignment(statement, out, key, value) {
  if (ts.isIfStatement(statement))
    return (
      statement.elseStatement &&
      copyAssignment(statement.thenStatement, out, key, value) &&
      copyAssignment(statement.elseStatement, out, key, value)
    );
  if (
    !ts.isExpressionStatement(statement) ||
    !ts.isBinaryExpression(statement.expression)
  )
    return false;
  const { left, right, operatorToken } = statement.expression;
  return (
    operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isElementAccessExpression(left) &&
    nameOf(left.expression) === out &&
    originatesAt(left.argumentExpression, key, true) &&
    originatesAt(right, value)
  );
}

/**
 * The attrs converter copies every input entry into its returned record.
 * Recognize this bounded loop shape, not a helper's spelling. An early exit,
 * filtered assignment, or return of another record is not preserving.
 */
function copyLoopInput(fn) {
  const result = returns(fn);
  if (result.length !== 1 || !ts.isIdentifier(result[0])) return undefined;
  const out = result[0].text;
  const loops = descendants(fn.body, ts.isForOfStatement);
  if (loops.length !== 1) return undefined;
  const loop = loops[0];
  const entries = loop.expression;
  if (
    !ts.isCallExpression(entries) ||
    entries.expression.getText() !== "Object.entries" ||
    entries.arguments.length !== 1
  )
    return undefined;
  if (
    descendants(
      loop.statement,
      (node) =>
        ts.isContinueStatement(node) ||
        ts.isBreakStatement(node) ||
        ts.isReturnStatement(node)
    ).length
  )
    return undefined;
  const statements = ts.isBlock(loop.statement)
    ? loop.statement.statements
    : [loop.statement];
  const last = statements.at(-1);
  const binding = ts.isVariableDeclarationList(loop.initializer)
    ? loop.initializer.declarations[0]?.name
    : undefined;
  if (!binding || !ts.isArrayBindingPattern(binding)) return undefined;
  const key = nameOf(binding.elements[0]?.name);
  const value = nameOf(binding.elements[1]?.name);
  if (!key || !value || !last || !copyAssignment(last, out, key, value))
    return undefined;
  const fnStatements = fn.body.statements;
  const afterLoop = fnStatements.slice(fnStatements.indexOf(loop) + 1);
  if (afterLoop.length !== 1 || !ts.isReturnStatement(afterLoop[0]))
    return undefined;
  return entries.arguments[0];
}

function mapsCollection(call, collection) {
  return (
    ts.isCallExpression(call) &&
    ts.isPropertyAccessExpression(call.expression) &&
    ["map", "find"].includes(call.expression.name.text) &&
    ts.isPropertyAccessExpression(call.expression.expression) &&
    call.expression.expression.name.text === collection
  );
}
function parameterCollection(parameter, collection) {
  const owner = parameter.parent;
  if (mapsCollection(owner.parent, collection)) return true;
  const declared = ts.isVariableDeclaration(owner.parent)
    ? nameOf(owner.parent.name)
    : nameOf(owner.name);
  if (!declared) return false;
  let scope = owner.parent;
  while (scope.parent && !ts.isFunctionLike(scope)) scope = scope.parent;
  return (
    descendants(
      scope,
      (node) =>
        mapsCollection(node, collection) &&
        nameOf(node.arguments[0]) === declared
    ).length > 0
  );
}
function attrsFromCollection(expression, collection) {
  if (
    !ts.isPropertyAccessExpression(expression) ||
    expression.name.text !== "attrs" ||
    !ts.isIdentifier(expression.expression)
  )
    return false;
  const receiver = expression.expression;
  const value = localValue(receiver, receiver.text);
  if (value && mapsCollection(unwrap(value), collection)) return true;
  let owner = receiver.parent;
  while (owner) {
    if (ts.isFunctionLike(owner)) {
      const parameter = owner.parameters.find(
        (item) => nameOf(item.name) === receiver.text
      );
      if (parameter) return parameterCollection(parameter, collection);
    }
    owner = owner.parent;
  }
  return false;
}

export function createAttributeFlow(sources, resolveFunction) {
  const calls = [
    ...new Set(
      sources.flatMap(({ node }) =>
        descendants(
          node,
          (child) =>
            ts.isCallExpression(child) && ts.isIdentifier(child.expression)
        )
      )
    ),
  ];
  const sameFunction = (left, right) =>
    left &&
    left.pos === right.pos &&
    left.getSourceFile().fileName === right.getSourceFile().fileName;
  function parameterInput(identifier, seen) {
    let owner = identifier.parent;
    while (owner) {
      if (ts.isFunctionLike(owner)) {
        const index = owner.parameters.findIndex(
          (parameter) => nameOf(parameter.name) === identifier.text
        );
        if (index >= 0) {
          const argumentsAtCalls = calls
            .filter((call) =>
              sameFunction(callee(call.expression, seen), owner)
            )
            .map((call) => call.arguments[index]);
          return argumentsAtCalls.length === 1
            ? argumentsAtCalls[0]
            : undefined;
        }
      }
      owner = owner.parent;
    }
    return undefined;
  }
  function objectRecords(expression, seen) {
    expression = unwrap(expression);
    if (!expression || seen.has(expression)) return [];
    const next = new Set([...seen, expression]);
    if (ts.isObjectLiteralExpression(expression)) return [expression];
    if (ts.isIdentifier(expression)) {
      const value =
        localValue(expression, expression.text) ??
        parameterInput(expression, next);
      return objectRecords(value, next);
    }
    if (ts.isCallExpression(expression)) {
      const fn = callee(expression.expression, next);
      return fn
        ? returns(fn).flatMap((value) => objectRecords(value, next))
        : [];
    }
    return [];
  }
  function memberFunction(expression, seen) {
    const records = objectRecords(expression.expression, seen);
    const members = records.flatMap((record) =>
      record.properties.filter(
        (property) =>
          ts.isPropertyAssignment(property) &&
          nameOf(property.name) === expression.name.text
      )
    );
    return members.length === 1
      ? callee(members[0].initializer, seen)
      : undefined;
  }
  function callee(expression, seen = new Set()) {
    expression = unwrap(expression);
    if (!expression || seen.has(expression)) return undefined;
    const next = new Set([...seen, expression]);
    if (ts.isVariableDeclaration(expression))
      return callee(expression.initializer, next);
    if (
      ts.isArrowFunction(expression) ||
      ts.isFunctionExpression(expression) ||
      ts.isFunctionDeclaration(expression)
    )
      return expression;
    if (ts.isPropertyAccessExpression(expression))
      return memberFunction(expression, next);
    if (!ts.isIdentifier(expression)) return undefined;
    const local = localValue(expression, expression.text);
    if (local && local !== expression) return callee(local, next);
    const resolved = resolveFunction(expression);
    return resolved ? callee(resolved, next) : undefined;
  }
  function throughCall(call, predicate, seen) {
    if (officialCall(call, "vue", "mergeProps"))
      return call.arguments.some((arg) => carries(arg, predicate, seen));
    if (call.expression.getText() === "Object.assign")
      return call.arguments.some((arg) =>
        carries(ts.isSpreadElement(arg) ? arg.expression : arg, predicate, seen)
      );
    const fn = callee(call.expression);
    if (!fn || seen.has(fn)) return false;
    const next = new Set([...seen, fn]);
    const bound = (value) => {
      if (predicate(value)) return true;
      if (!ts.isIdentifier(value)) return false;
      const index = fn.parameters.findIndex(
        (parameter) => nameOf(parameter.name) === value.text
      );
      if (index < 0) return false;
      if (fn.parameters[index].dotDotDotToken)
        return call.arguments
          .slice(index)
          .some((arg) => carries(arg, predicate, next));
      return (
        call.arguments[index] && carries(call.arguments[index], predicate, next)
      );
    };
    const loopInput = copyLoopInput(fn);
    if (loopInput) return carries(loopInput, bound, next);
    const values = returns(fn);
    return (
      values.length > 0 && values.every((value) => carries(value, bound, next))
    );
  }
  function carries(expression, predicate, seen = new Set()) {
    expression = unwrap(expression);
    if (!expression || seen.has(expression)) return false;
    if (predicate(expression)) return true;
    const next = new Set([...seen, expression]);
    if (ts.isIdentifier(expression)) {
      const value = localValue(expression, expression.text);
      return value ? carries(value, predicate, next) : false;
    }
    if (ts.isObjectLiteralExpression(expression))
      return expression.properties.some(
        (property) =>
          ts.isSpreadAssignment(property) &&
          carries(property.expression, predicate, next)
      );
    if (ts.isConditionalExpression(expression))
      return (
        carries(expression.whenTrue, predicate, next) &&
        carries(expression.whenFalse, predicate, next)
      );
    if (ts.isCallExpression(expression))
      return throughCall(expression, predicate, next);
    return false;
  }
  function records(expression, seen = new Set()) {
    expression = unwrap(expression);
    if (!expression || seen.has(expression)) return [];
    const next = new Set([...seen, expression]);
    if (ts.isObjectLiteralExpression(expression)) return [expression];
    if (ts.isIdentifier(expression))
      return records(localValue(expression, expression.text), next);
    if (ts.isArrayLiteralExpression(expression))
      return expression.elements.flatMap((item) => records(item, next));
    if (ts.isCallExpression(expression)) {
      const maps =
        ts.isPropertyAccessExpression(expression.expression) &&
        expression.expression.name.text === "map";
      if (maps || officialCall(expression, "vue", "computed")) {
        const fn = callee(expression.arguments[0]);
        return fn ? returns(fn).flatMap((value) => records(value, next)) : [];
      }
    }
    return [];
  }
  function modelRetains(collection, api) {
    for (const { node } of sources) {
      if (!ts.isFunctionLike(node)) continue;
      for (const model of returns(node).flatMap((value) => records(value))) {
        const field = model.properties.find(
          (property) =>
            (ts.isPropertyAssignment(property) ||
              ts.isShorthandPropertyAssignment(property)) &&
            nameOf(property.name) === collection
        );
        if (!field) continue;
        const items = records(fieldValue(field));
        if (
          items.length &&
          items.every((item) => {
            const attrs = item.properties.find(
              (property) =>
                ts.isPropertyAssignment(property) &&
                nameOf(property.name) === "attrs"
            );
            return (
              attrs &&
              carries(attrs.initializer, (value) =>
                officialCall(value, "@adapttable/core/binding", api)
              )
            );
          })
        )
          return true;
      }
    }
    return false;
  }
  return { carries, modelRetains, attrsFromCollection };
}
