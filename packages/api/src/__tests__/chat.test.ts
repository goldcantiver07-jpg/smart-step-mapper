import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../utils/chat";
import type { MapContext } from "../utils/chat";

describe("chat utility", () => {
  const basicMap: MapContext = {
    title: "Solve Quadratic Equation",
    problemStatement: "Solve x² - 5x + 6 = 0",
    formula: "x = (-b ± √(b² - 4ac)) / 2a",
    variables: "a=1, b=-5, c=6",
    steps: [],
  };

  it("buildSystemPrompt includes the problem statement", () => {
    const prompt = buildSystemPrompt(basicMap);
    expect(prompt).toContain("x² - 5x + 6 = 0");
    expect(prompt).toContain("Solve Quadratic Equation");
  });

  it("buildSystemPrompt includes the formula when provided", () => {
    const prompt = buildSystemPrompt(basicMap);
    expect(prompt).toContain("x = (-b ± √(b² - 4ac)) / 2a");
  });

  it("buildSystemPrompt includes the topic when provided", () => {
    const prompt = buildSystemPrompt({ ...basicMap, topicName: "Quadratic Equations" });
    expect(prompt).toContain("Quadratic Equations");
  });

  it("buildSystemPrompt indicates no steps when empty", () => {
    const prompt = buildSystemPrompt(basicMap);
    expect(prompt).toContain("No steps have been added yet");
  });

  it("buildSystemPrompt lists steps when provided", () => {
    const mapWithSteps: MapContext = {
      ...basicMap,
      steps: [
        {
          stepNumber: 1,
          explanation: "Factor the equation",
          mathExpression: "(x-2)(x-3) = 0",
          result: "",
          isCorrect: "correct",
          feedback: "",
        },
        {
          stepNumber: 2,
          explanation: "Solve for x",
          mathExpression: "",
          result: "x = 2, x = 3",
          isCorrect: "unchecked",
          feedback: "",
        },
      ],
    };

    const prompt = buildSystemPrompt(mapWithSteps);
    expect(prompt).toContain("Step 1");
    expect(prompt).toContain("Factor the equation");
    expect(prompt).toContain("(x-2)(x-3) = 0");
    expect(prompt).toContain("✅ Correct");
    expect(prompt).toContain("Step 2");
    expect(prompt).toContain("Solve for x");
    expect(prompt).toContain("x = 2, x = 3");
    expect(prompt).toContain("⏳ Unchecked");
  });

  it("buildSystemPrompt marks incorrect steps with ❌", () => {
    const mapWithIncorrect: MapContext = {
      ...basicMap,
      steps: [
        {
          stepNumber: 1,
          explanation: "First attempt",
          mathExpression: "",
          result: "x = 5",
          isCorrect: "incorrect",
          feedback: "Check your sign",
        },
      ],
    };

    const prompt = buildSystemPrompt(mapWithIncorrect);
    expect(prompt).toContain("❌ Incorrect");
    expect(prompt).toContain("Check your sign");
  });

  it("buildSystemPrompt includes optional fields when omitted", () => {
    const minimalMap: MapContext = {
      title: "",
      problemStatement: "What is 2+2?",
      steps: [],
    };

    const prompt = buildSystemPrompt(minimalMap);
    expect(prompt).toContain("What is 2+2?");
    expect(prompt).toContain("No steps have been added yet");
  });
});
