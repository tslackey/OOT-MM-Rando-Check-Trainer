import type { Expr } from "./rules";
import { parseRule } from "./rules";

export interface CompileError {
  where: string;
  source: string;
  error: string;
}

export function tryCompile(source: string, where: string): { expr: Expr; error?: CompileError } {
  try {
    return { expr: parseRule(source) };
  } catch (error) {
    return {
      expr: { type: "const", value: false },
      error: {
        where,
        source,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
