import { describe, expect, it } from "vitest";
import type { MapContext } from "../utils/chat";
import { buildVerifierPrompt, parseVerifierVerdict } from "../utils/verify-step";

const baseContext: MapContext = {
  title: "Quadratic Equations",
  topicName: "Quadratic Equations",
  problemStatement: "Solve x² - 5x + 6 = 0",
  formula: "x = (-b ± √(b² - 4ac)) / 2a",
  variables: "a=1, b=-5, c=6",
  steps: [
    {
      stepNumber: 1,
      explanation: "Identify the coefficients",
      mathExpression: "a=1, b=-5, c=6",
      result: "",
      isCorrect: "correct",
      feedback: "",
    },
    {
      stepNumber: 2,
      explanation: "x = 5",
      mathExpression: "x = (-(-5) ± √(25 - 24)) / 2",
      result: "x = 5",
      isCorrect: "unchecked",
      feedback: "",
    },
  ],
};

describe("buildVerifierPrompt", () => {
  it("includes problem context, prior steps, and the new step", () => {
    const prompt = buildVerifierPrompt(baseContext, 2, "auto");
    expect(prompt).toContain("Solve x² - 5x + 6 = 0");
    expect(prompt).toContain("Topic: Quadratic Equations");
    expect(prompt).toContain("Step 1: Identify the coefficients");
    expect(prompt).toContain("Step 2: x = 5");
    expect(prompt).toContain("Respond with ONLY a JSON object.");
  });

  it("does not mention alternative method in auto mode", () => {
    const prompt = buildVerifierPrompt(baseContext, 2, "auto");
    expect(prompt).not.toContain("alternative method");
  });

  it("appends the alternative-method instruction in alternative mode", () => {
    const prompt = buildVerifierPrompt(baseContext, 2, "alternative");
    expect(prompt).toContain("alternative method");
  });
});

describe("parseVerifierVerdict", () => {
  it("parses a correct verdict with null suggested step", () => {
    const raw = JSON.stringify({
      verdict: "correct",
      hint: "",
      suggestedStep: null,
      reason: "Sound and on track",
    });
    expect(parseVerifierVerdict(raw)).toEqual({
      verdict: "correct",
      hint: "",
      suggestedStep: null,
      reason: "Sound and on track",
    });
  });

  it("parses an incorrect verdict with a suggested step", () => {
    const raw = JSON.stringify({
      verdict: "incorrect",
      hint: "Check your sign",
      suggestedStep: { explanation: "Subtract 5 from both sides", mathExpression: "x = 2", result: "x = 2" },
      reason: "Sign error",
    });
    expect(parseVerifierVerdict(raw)).toEqual({
      verdict: "incorrect",
      hint: "Check your sign",
      suggestedStep: { explanation: "Subtract 5 from both sides", mathExpression: "x = 2", result: "x = 2" },
      reason: "Sign error",
    });
  });

  it("handles markdown-fenced JSON", () => {
    const raw = '```json\n{"verdict":"correct","hint":"","suggestedStep":null,"reason":""}\n```';
    expect(parseVerifierVerdict(raw)?.verdict).toBe("correct");
  });

  it("extracts JSON embedded in extra prose", () => {
    const raw = 'Here you go: {"verdict":"incorrect","hint":"h","suggestedStep":null,"reason":"r"} — hope that helps!';
    expect(parseVerifierVerdict(raw)?.verdict).toBe("incorrect");
  });

  it("returns null for garbage or empty input", () => {
    expect(parseVerifierVerdict("")).toBeNull();
    expect(parseVerifierVerdict("nope")).toBeNull();
    expect(parseVerifierVerdict('{"verdict":"maybe"}')).toBeNull();
    expect(parseVerifierVerdict('{"verdict":"correct"')).toBeNull();
  });
});
