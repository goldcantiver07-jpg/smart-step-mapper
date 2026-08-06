import { describe, it, expect } from "vitest";
import * as schema from "../schema";
import { getTableColumns, getTableName } from "drizzle-orm";

describe("DB Schema", () => {
  it("exports users table", () => {
    expect(schema.users).toBeDefined();
    expect(getTableName(schema.users)).toBe("users");
  });

  it("exports topics table", () => {
    expect(schema.topics).toBeDefined();
    expect(getTableName(schema.topics)).toBe("topics");
  });

  it("exports maps table", () => {
    expect(schema.maps).toBeDefined();
    expect(getTableName(schema.maps)).toBe("maps");
  });

  it("exports steps table", () => {
    expect(schema.steps).toBeDefined();
    expect(getTableName(schema.steps)).toBe("steps");
  });

  it("exports progress table", () => {
    expect(schema.progress).toBeDefined();
    expect(getTableName(schema.progress)).toBe("progress");
  });

  it("steps table has structured breakdown columns", () => {
    const cols = getTableColumns(schema.steps);
    expect(cols.formulaUsed).toBeDefined();
    expect(cols.variablesUsed).toBeDefined();
    expect(cols.substitution).toBeDefined();
    expect(cols.calculation).toBeDefined();
  });

  it("maps table has unit, final answer, and method columns", () => {
    const cols = getTableColumns(schema.maps);
    expect(cols.unit).toBeDefined();
    expect(cols.finalAnswer).toBeDefined();
    expect(cols.method).toBeDefined();
    expect(cols.alternativeMethods).toBeDefined();
  });
});
