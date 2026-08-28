/**
 * Parsing a spreadsheet formula into a tree.
 *
 * The one rule this file exists to keep: **a formula is text, and it is
 * parsed.** It is never handed to `eval`, `new Function`, or anything else
 * that would run it as JavaScript. A user-typed formula is untrusted input in
 * exactly the way a URL is, and a table that evaluates one has handed the
 * page to whoever typed it — including, in a shared saved view, to whoever
 * sent the link.
 *
 * The grammar is deliberately small, because a formula language grows one
 * "just add" at a time until it is a programming language nobody can secure:
 *
 * ```
 * expression → comparison
 * comparison → concat ( ("=" | "<>" | "<" | "<=" | ">" | ">=") concat )?
 * concat     → sum ( "&" sum )*
 * sum        → product ( ("+" | "-") product )*
 * product    → unary ( ("*" | "/") unary )*
 * unary      → "-" unary | primary
 * primary    → number | string | reference | call | "(" expression ")"
 * call       → NAME "(" ( expression ( "," expression )* )? ")"
 * reference  → NAME | "[" any-text "]"
 * ```
 *
 * `&` concatenates, as it does in a spreadsheet — and it binds BELOW `+` and
 * `-`, also as it does in a spreadsheet: `="a" & 2 + 3` is `"a5"`, because the
 * arithmetic finishes before the join. Sharing the additive level instead read
 * it as `("a" & 2) + 3` and answered `#VALUE!`, which is the arithmetic of a
 * language nobody writes formulas in.
 *
 * Bracketed references exist so a column called "Unit Price" can be named
 * without inventing an escaping rule for spaces.
 *
 * A parse failure is a returned error, not an exception: the formula bar has
 * to show something useful while someone is still typing, and half a formula
 * is the normal state of one being written.
 */

/** A binary operator the grammar accepts. */
export type BinaryOp =
  "+" | "-" | "*" | "/" | "&" | "=" | "<>" | "<" | "<=" | ">" | ">=";

/**
 * One node of a parsed formula.
 *
 * @public
 */
export type FormulaNode =
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "ref"; readonly key: string }
  | { readonly kind: "unary"; readonly operand: FormulaNode }
  | {
      readonly kind: "binary";
      readonly op: BinaryOp;
      readonly left: FormulaNode;
      readonly right: FormulaNode;
    }
  | {
      readonly kind: "call";
      readonly name: string;
      readonly args: readonly FormulaNode[];
    };

/**
 * What {@link parseFormula} answers with.
 *
 * @public
 */
export interface ParseResult {
  /** Whether the text parsed. */
  readonly ok: boolean;
  /** The tree, when it did. */
  readonly node?: FormulaNode;
  /** What was wrong, when it did not — in words a formula bar can show. */
  readonly message?: string;
}

/** Thrown inside the parser and caught at its edge; never escapes. */
class ParseFailure extends Error {}

/** The comparison operators, longest first so `<=` wins over `<`. */
const COMPARISONS: readonly BinaryOp[] = ["<>", "<=", ">=", "=", "<", ">"];

/** Whether a character can start or continue an unbracketed name. */
function isNameChar(char: string): boolean {
  return /[A-Za-z0-9_.]/.test(char);
}

/**
 * A cursor over the formula text.
 *
 * A hand-written recursive-descent parser rather than a grammar library: the
 * grammar is nine lines, and a dependency that can parse anything is a
 * dependency that can parse more than this is willing to run.
 */
class Cursor {
  private at = 0;

  constructor(private readonly text: string) {}

  /** Skip any run of whitespace. */
  skip(): void {
    while (this.at < this.text.length && /\s/.test(this.text[this.at] ?? "")) {
      this.at++;
    }
  }

  /** The character under the cursor, or `""` at the end. */
  peek(): string {
    this.skip();
    return this.text[this.at] ?? "";
  }

  /** Whether the rest starts with this text, and consume it if so. */
  take(what: string): boolean {
    this.skip();
    if (!this.text.startsWith(what, this.at)) return false;
    this.at += what.length;
    return true;
  }

  /** Consume this text or fail with a message naming what was expected. */
  expect(what: string): void {
    if (!this.take(what)) this.fail(`expected ${what}`);
  }

  /** Whether everything has been consumed. */
  done(): boolean {
    this.skip();
    return this.at >= this.text.length;
  }

  /** Read a number literal. */
  number(): number {
    this.skip();
    const start = this.at;
    while (/[0-9.]/.test(this.text[this.at] ?? "")) this.at++;
    const raw = this.text.slice(start, this.at);
    const value = Number(raw);
    if (!Number.isFinite(value)) this.fail(`"${raw}" is not a number`);
    return value;
  }

  /** Read a quoted string literal, either quote style. */
  string(quote: string): string {
    const start = this.at;
    while (this.at < this.text.length && this.text[this.at] !== quote) {
      this.at++;
    }
    if (this.at >= this.text.length) this.fail("unclosed quote");
    const value = this.text.slice(start, this.at);
    this.at++;
    return value;
  }

  /** Read a bracketed name, which may contain anything but `]`. */
  bracketed(): string {
    const start = this.at;
    while (this.at < this.text.length && this.text[this.at] !== "]") {
      this.at++;
    }
    if (this.at >= this.text.length) this.fail("unclosed [");
    const value = this.text.slice(start, this.at).trim();
    this.at++;
    if (value === "") this.fail("empty [] reference");
    return value;
  }

  /** Read a bare name. */
  name(): string {
    this.skip();
    const start = this.at;
    while (isNameChar(this.text[this.at] ?? "")) this.at++;
    const value = this.text.slice(start, this.at);
    if (value === "") this.fail(`unexpected "${this.peek()}"`);
    return value;
  }

  /** Give up with a message the formula bar can show. */
  fail(message: string): never {
    throw new ParseFailure(message);
  }
}

/** `primary → number | string | reference | call | "(" expression ")"` */
function primary(cursor: Cursor): FormulaNode {
  if (cursor.take("(")) {
    const inner = expression(cursor);
    cursor.expect(")");
    return inner;
  }
  if (cursor.take('"')) return { kind: "string", value: cursor.string('"') };
  if (cursor.take("'")) return { kind: "string", value: cursor.string("'") };
  if (cursor.take("[")) return { kind: "ref", key: cursor.bracketed() };

  const next = cursor.peek();
  if (/[0-9.]/.test(next)) return { kind: "number", value: cursor.number() };

  const name = cursor.name();
  if (!cursor.take("(")) return { kind: "ref", key: name };

  const args: FormulaNode[] = [];
  if (!cursor.take(")")) {
    do {
      args.push(expression(cursor));
    } while (cursor.take(","));
    cursor.expect(")");
  }
  return { kind: "call", name, args };
}

/** `unary → "-" unary | primary` */
function unary(cursor: Cursor): FormulaNode {
  if (cursor.take("-")) return { kind: "unary", operand: unary(cursor) };
  return primary(cursor);
}

/** The multiplicative operator at the cursor, if there is one. */
function productOp(cursor: Cursor): BinaryOp | undefined {
  if (cursor.take("*")) return "*";
  if (cursor.take("/")) return "/";
  return undefined;
}

/** `product → unary ( ("*" | "/") unary )*` */
function product(cursor: Cursor): FormulaNode {
  let left = unary(cursor);
  for (;;) {
    const op = productOp(cursor);
    if (!op) return left;
    left = { kind: "binary", op, left, right: unary(cursor) };
  }
}

/** The additive operator at the cursor, if there is one. */
function additiveOp(cursor: Cursor): BinaryOp | undefined {
  if (cursor.take("+")) return "+";
  if (cursor.take("-")) return "-";
  return undefined;
}

/** `sum → product ( ("+" | "-") product )*` */
function sum(cursor: Cursor): FormulaNode {
  let left = product(cursor);
  for (;;) {
    const op = additiveOp(cursor);
    if (!op) return left;
    left = { kind: "binary", op, left, right: product(cursor) };
  }
}

/**
 * `concat → sum ( "&" sum )*` — its own level, below the arithmetic and above
 * the comparisons, which is where a spreadsheet puts it. Left-associative, so
 * `=a & b & c` joins in reading order.
 */
function concat(cursor: Cursor): FormulaNode {
  let left = sum(cursor);
  while (cursor.take("&")) {
    left = { kind: "binary", op: "&", left, right: sum(cursor) };
  }
  return left;
}

/**
 * `comparison → concat ( COMPARISON concat )?` — one level, as spreadsheets
 * have. Both sides join first, so `="a" & "b" = "ab"` compares two strings
 * rather than concatenating a comparison.
 */
function expression(cursor: Cursor): FormulaNode {
  const left = concat(cursor);
  const op = COMPARISONS.find((candidate) => cursor.take(candidate));
  if (!op) return left;
  return { kind: "binary", op, left, right: concat(cursor) };
}

/**
 * Parse a formula.
 *
 * A leading `=` is accepted and ignored, because that is how people type one.
 *
 * @param text - The formula as the user typed it.
 * @returns The tree, or the reason it could not be parsed. Never throws.
 *
 * @public
 */
export function parseFormula(text: string): ParseResult {
  const body = text.trim().replace(/^=/, "");
  if (body.trim() === "") return { ok: false, message: "empty formula" };
  const cursor = new Cursor(body);
  try {
    const node = expression(cursor);
    if (!cursor.done()) {
      return { ok: false, message: `unexpected "${cursor.peek()}"` };
    }
    return { ok: true, node };
  } catch (error) {
    if (error instanceof ParseFailure) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/**
 * Every column a formula reads, so a cache knows what to watch.
 *
 * @param node - A parsed formula.
 * @returns The referenced keys, each once, in the order first seen.
 *
 * @public
 */
export function formulaRefs(node: FormulaNode): string[] {
  const seen: string[] = [];
  const walk = (current: FormulaNode): void => {
    switch (current.kind) {
      case "ref":
        if (!seen.includes(current.key)) seen.push(current.key);
        return;
      case "unary":
        walk(current.operand);
        return;
      case "binary":
        walk(current.left);
        walk(current.right);
        return;
      case "call":
        for (const argument of current.args) walk(argument);
        return;
      default:
        return;
    }
  };
  walk(node);
  return seen;
}
