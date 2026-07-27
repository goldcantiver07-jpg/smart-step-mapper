import { describe, it, expect } from "vitest";
import { verifyStepResult } from "../utils/adaptive-engine";

describe("adaptive engine", () => {
  it("verifyStepResult marks correct when expected matches actual", () => {
    const result = verifyStepResult("5", "5");
    expect(result.isCorrect).toBe(true);
    expect(result.feedback).toBe("");
  });

  it("verifyStepResult marks incorrect when values differ", () => {
    const result = verifyStepResult("5", "3");
    expect(result.isCorrect).toBe(false);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it("verifyStepResult trims whitespace", () => {
    const result = verifyStepResult("  x = 2  ", "x = 2");
    expect(result.isCorrect).toBe(true);
  });

  it("verifyStepResult handles case-insensitive comparison", () => {
    const result = verifyStepResult("X = 5", "x = 5");
    expect(result.isCorrect).toBe(true);
  });
});
