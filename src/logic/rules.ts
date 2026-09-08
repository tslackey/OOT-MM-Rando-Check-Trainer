export type CmpOp = "==" | "!=" | "<" | ">" | "<=" | ">=";

export type Expr =
  | { type: "const"; value: boolean | number | string }
  | { type: "name"; name: string }
  | { type: "not"; inner: Expr }
  | { type: "and"; left: Expr; right: Expr }
  | { type: "or"; left: Expr; right: Expr }
  | { type: "cmp"; op: CmpOp; left: Expr; right: Expr }
  | { type: "in"; left: Expr; right: Expr }
  | { type: "call"; name: string; args: Expr[] }
  | { type: "tuple"; items: Expr[] }
  | { type: "index"; value: Expr; index: Expr };

type Tok =
  | { kind: "and" | "or" | "not" | "in" | "true" | "false" }
  | { kind: "cmp"; op: CmpOp }
  | { kind: "lp" | "rp" | "lb" | "rb" | "comma" }
  | { kind: "name"; name: string }
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "eof" };

export function parseRule(source: string): Expr {
  const tokens = tokenize(source);
  let i = 0;

  const peek = (): Tok => tokens[i] ?? { kind: "eof" };
  const take = (): Tok => tokens[i++] ?? { kind: "eof" };
  const match = (kind: Tok["kind"]): boolean => {
    if (peek().kind === kind) {
      i += 1;
      return true;
    }
    return false;
  };

  const parseOr = (): Expr => {
    let left = parseAnd();
    while (peek().kind === "or") {
      take();
      left = { type: "or", left, right: parseAnd() };
    }
    return left;
  };

  const parseAnd = (): Expr => {
    let left = parseNot();
    while (peek().kind === "and") {
      take();
      left = { type: "and", left, right: parseNot() };
    }
    return left;
  };

  const parseNot = (): Expr => {
    if (peek().kind === "not") {
      take();
      return { type: "not", inner: parseNot() };
    }
    return parseCmp();
  };

  const parseCmp = (): Expr => {
    const left = parsePostfix();
    const tok = peek();
    if (tok.kind === "cmp") {
      take();
      return { type: "cmp", op: tok.op, left, right: parsePostfix() };
    }
    if (tok.kind === "in") {
      take();
      return { type: "in", left, right: parsePostfix() };
    }
    return left;
  };

  const parsePostfix = (): Expr => {
    let expr = parseAtom();
    while (peek().kind === "lb") {
      take();
      const index = parseOr();
      if (!match("rb")) throw new Error(`expected ] in ${source}`);
      expr = { type: "index", value: expr, index };
    }
    return expr;
  };

  const parseAtom = (): Expr => {
    const tok = take();
    if (tok.kind === "true") return { type: "const", value: true };
    if (tok.kind === "false") return { type: "const", value: false };
    if (tok.kind === "number") return { type: "const", value: tok.value };
    if (tok.kind === "string") return { type: "const", value: tok.value };
    if (tok.kind === "lp") {
      const first = parseOr();
      if (peek().kind === "comma") {
        const items = [first];
        while (match("comma")) items.push(parseOr());
        if (!match("rp")) throw new Error(`expected ) in tuple: ${source}`);
        return { type: "tuple", items };
      }
      if (!match("rp")) throw new Error(`expected ) in ${source}`);
      return first;
    }
    if (tok.kind === "name") {
      if (peek().kind === "lp") {
        take();
        const args: Expr[] = [];
        if (peek().kind !== "rp") {
          args.push(parseOr());
          while (match("comma")) args.push(parseOr());
        }
        if (!match("rp")) throw new Error(`expected ) after ${tok.name} in ${source}`);
        return { type: "call", name: tok.name, args };
      }
      return { type: "name", name: tok.name };
    }
    throw new Error(`unexpected token ${JSON.stringify(tok)} in ${source}`);
  };

  const expr = parseOr();
  if (peek().kind !== "eof") throw new Error(`trailing tokens in ${source}`);
  return expr;
}

function tokenize(source: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  const n = source.length;
  const isId = (ch: string) => /[A-Za-z_]/.test(ch);
  const isIdCont = (ch: string) => /[A-Za-z0-9_]/.test(ch);

  while (i < n) {
    const ch = source[i];
    if (ch === "#" || (ch === "/" && source[i + 1] === "/")) {
      while (i < n && source[i] !== "\n") i += 1;
      continue;
    }
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const q = ch;
      i += 1;
      let value = "";
      while (i < n && source[i] !== q) {
        if (source[i] === "\\" && i + 1 < n) {
          value += source[i + 1];
          i += 2;
          continue;
        }
        value += source[i];
        i += 1;
      }
      i += 1;
      tokens.push({ kind: "string", value });
      continue;
    }
    if (ch === "=" && source[i + 1] === "=") {
      tokens.push({ kind: "cmp", op: "==" });
      i += 2;
      continue;
    }
    if (ch === "!" && source[i + 1] === "=") {
      tokens.push({ kind: "cmp", op: "!=" });
      i += 2;
      continue;
    }
    if (ch === "<" && source[i + 1] === "=") {
      tokens.push({ kind: "cmp", op: "<=" });
      i += 2;
      continue;
    }
    if (ch === ">" && source[i + 1] === "=") {
      tokens.push({ kind: "cmp", op: ">=" });
      i += 2;
      continue;
    }
    if (ch === "<") {
      tokens.push({ kind: "cmp", op: "<" });
      i += 1;
      continue;
    }
    if (ch === ">") {
      tokens.push({ kind: "cmp", op: ">" });
      i += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lp" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rp" });
      i += 1;
      continue;
    }
    if (ch === "[") {
      tokens.push({ kind: "lb" });
      i += 1;
      continue;
    }
    if (ch === "]") {
      tokens.push({ kind: "rb" });
      i += 1;
      continue;
    }
    if (ch === ",") {
      tokens.push({ kind: "comma" });
      i += 1;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let num = "";
      while (i < n && /[0-9]/.test(source[i])) num += source[i++];
      if (source[i] === "." && /[0-9]/.test(source[i + 1] ?? "")) {
        num += source[i++];
        while (i < n && /[0-9]/.test(source[i])) num += source[i++];
      }
      tokens.push({ kind: "number", value: Number(num) });
      continue;
    }
    if (isId(ch)) {
      let name = "";
      while (i < n && isIdCont(source[i])) name += source[i++];
      if (name === "and") tokens.push({ kind: "and" });
      else if (name === "or") tokens.push({ kind: "or" });
      else if (name === "not") tokens.push({ kind: "not" });
      else if (name === "in") tokens.push({ kind: "in" });
      else if (name === "True") tokens.push({ kind: "true" });
      else if (name === "False") tokens.push({ kind: "false" });
      else tokens.push({ kind: "name", name });
      continue;
    }
    throw new Error(`bad character ${JSON.stringify(ch)} in ${source}`);
  }
  tokens.push({ kind: "eof" });
  return tokens;
}
