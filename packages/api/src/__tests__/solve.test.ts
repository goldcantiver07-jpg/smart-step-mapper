import { describe, expect, it } from "vitest";
import { extractJsonObject } from "../utils/json";
import {
  buildAnalyzerPrompt,
  buildPracticeProblemPrompt,
  buildSolutionGeneratorPrompt,
  parseAnalyzeResult,
  parseGenerateResult,
  parsePracticeProblem,
  type ConfirmedProblem,
} from "../utils/solve";
import { buildContextVerifierPrompt } from "../utils/verify-step";

const confirmed: ConfirmedProblem = {
  problemStatement: "A car travels 120 km in 2 hours. What is its average speed?",
  topicName: "Physics",
  formula: "v = d / t",
  variables: "d = 120 km, t = 2 h",
  unknown: "average speed v",
  unit: "km/h",
};

describe("extractJsonObject", () => {
  it("returns null for empty or non-object input", () => {
    expect(extractJsonObject("")).toBeNull();
    expect(extractJsonObject("   ")).toBeNull();
    expect(extractJsonObject("nope")).toBeNull();
    expect(extractJsonObject('{"unclosed"')).toBeNull();
  });

  it("extracts a plain JSON object", () => {
    expect(extractJsonObject('{"a":1}')).toBe('{"a":1}');
  });

  it("strips markdown fences", () => {
    const raw = '```json\n{"a":1}\n```';
    expect(extractJsonObject(raw)).toBe('{"a":1}');
  });

  it("extracts JSON embedded in prose", () => {
    const raw = 'Here: {"a":1} — done';
    expect(extractJsonObject(raw)).toBe('{"a":1}');
  });
});

describe("buildAnalyzerPrompt", () => {
  it("includes the problem statement and JSON-only instruction", () => {
    const prompt = buildAnalyzerPrompt("A car travels 120 km in 2 hours.");
    expect(prompt).toContain("A car travels 120 km in 2 hours.");
    expect(prompt).toContain("Respond with ONLY a JSON object.");
    expect(prompt).toContain("needsClarification");
  });
});

describe("buildSolutionGeneratorPrompt", () => {
  it("includes all confirmed fields", () => {
    const prompt = buildSolutionGeneratorPrompt(confirmed);
    expect(prompt).toContain(confirmed.problemStatement);
    expect(prompt).toContain(confirmed.topicName);
    expect(prompt).toContain(confirmed.formula);
    expect(prompt).toContain(confirmed.variables);
    expect(prompt).toContain(confirmed.unknown);
    expect(prompt).toContain(confirmed.unit);
    expect(prompt).toContain("Respond with ONLY a JSON object.");
  });

  it("mentions alternative methods (max 2) and formula → variables → substitution rules", () => {
    const prompt = buildSolutionGeneratorPrompt(confirmed);
    expect(prompt).toContain("alternativeMethods");
    expect(prompt).toContain("max 2");
    expect(prompt).toContain("substitution");
    expect(prompt).toContain("calculation");
  });
});

describe("buildPracticeProblemPrompt", () => {
  it("includes the source problem and exclusion list", () => {
    const prompt = buildPracticeProblemPrompt(confirmed, ["A train travels 240 km in 3 hours."]);
    expect(prompt).toContain(confirmed.problemStatement);
    expect(prompt).toContain("A train travels 240 km in 3 hours.");
    expect(prompt).toContain("Respond with ONLY a JSON object.");
  });

  it("omits the exclusion section when there are no exclusions", () => {
    const prompt = buildPracticeProblemPrompt(confirmed, []);
    expect(prompt).not.toContain("already-seen statements");
  });

  it("includes realistic-numbers rules", () => {
    const prompt = buildPracticeProblemPrompt(confirmed, []);
    expect(prompt).toContain("no negative distances");
    expect(prompt).toContain("division by zero");
  });
});

describe("buildContextVerifierPrompt", () => {
  it("includes problem context, expected steps, prior steps, and the new step", () => {
    const prompt = buildContextVerifierPrompt(
      {
        problemStatement: "A car travels 120 km in 2 hours. What is its average speed?",
        topicName: "Physics",
        formula: "v = d / t",
        variables: "d = 120 km, t = 2 h",
        unit: "km/h",
        expectedSteps: [
          { stepNumber: 1, explanation: "Identify the knowns", result: "" },
          { stepNumber: 2, explanation: "Apply v = d / t", result: "v = 60" },
        ],
      },
      [{ explanation: "Identify the knowns", mathExpression: "d = 120, t = 2", result: "" }],
      { explanation: "Apply v = d / t", mathExpression: "v = 120 / 2", result: "v = 60" },
    );

    expect(prompt).toContain("A car travels 120 km in 2 hours.");
    expect(prompt).toContain("Topic: Physics");
    expect(prompt).toContain("Reference solution");
    expect(prompt).toContain("Step 1: Identify the knowns");
    expect(prompt).toContain("Step 2: Apply v = d / t");
    expect(prompt).toContain("Step 2: Apply v = d / t [Math: v = 120 / 2] → Result: v = 60");
    expect(prompt).toContain("Respond with ONLY a JSON object.");
  });
});

describe("parseAnalyzeResult", () => {
  it("parses a valid result", () => {
    const raw = JSON.stringify({
      topicName: "Physics",
      formula: "v = d / t",
      variables: "d = 120 km, t = 2 h",
      unknown: "average speed",
      unit: "km/h",
      assumptions: ["constant speed"],
      warnings: [],
      needsClarification: null,
    });
    const result = parseAnalyzeResult(raw);
    expect(result?.topicName).toBe("Physics");
    expect(result?.unit).toBe("km/h");
    expect(result?.assumptions).toEqual(["constant speed"]);
    expect(result?.needsClarification).toBeNull();
  });

  it("handles fenced JSON", () => {
    const raw = '```json\n{"topicName":"Algebra","formula":"","variables":"","unknown":"","unit":"","assumptions":[],"warnings":[],"needsClarification":null}\n```';
    expect(parseAnalyzeResult(raw)?.topicName).toBe("Algebra");
  });

  it("returns null for garbage or missing required keys", () => {
    expect(parseAnalyzeResult("")).toBeNull();
    expect(parseAnalyzeResult("not json at all")).toBeNull();
    expect(parseAnalyzeResult('{"topicName": 42}')).toBeNull();
  });
});

describe("parseGenerateResult", () => {
  it("parses a valid full solution", () => {
    const raw = JSON.stringify({
      steps: [
        {
          stepNumber: 1,
          explanation: "Identify the knowns",
          formulaUsed: "v = d / t",
          variablesUsed: "d = 120 km, t = 2 h",
          substitution: "v = \\frac{120}{2}",
          calculation: "120 \\div 2 = 60",
          result: "v = 60",
        },
      ],
      finalAnswer: "60",
      unit: "km/h",
      method: "Standard",
      alternativeMethods: [
        {
          method: "Unit analysis",
          steps: [
            {
              stepNumber: 1,
              explanation: "Cancel units",
              formulaUsed: "",
              variablesUsed: "",
              substitution: "",
              calculation: "",
              result: "",
            },
          ],
        },
      ],
      warnings: ["assuming constant speed"],
      title: "Average speed",
    });
    const result = parseGenerateResult(raw);
    expect(result?.steps).toHaveLength(1);
    expect(result?.finalAnswer).toBe("60");
    expect(result?.unit).toBe("km/h");
    expect(result?.alternativeMethods?.[0]?.method).toBe("Unit analysis");
  });

  it("rejects a solution without steps", () => {
    const raw = JSON.stringify({ finalAnswer: "60", unit: "km/h", steps: [] });
    expect(parseGenerateResult(raw)).toBeNull();
  });
});

describe("parsePracticeProblem", () => {
  it("parses a valid practice problem", () => {
    const raw = JSON.stringify({
      problemStatement: "A train travels 240 km in 3 hours.",
      expectedSteps: [
        {
          stepNumber: 1,
          explanation: "Apply v = d / t",
          formulaUsed: "v = d / t",
          variablesUsed: "d = 240 km, t = 3 h",
          substitution: "v = \\frac{240}{3}",
          calculation: "240 \\div 3 = 80",
          result: "v = 80",
        },
      ],
      hints: [{ stepNumber: 1, hint: "Divide distance by time." }],
      finalAnswer: "80",
      unit: "km/h",
    });
    const result = parsePracticeProblem(raw);
    expect(result?.problemStatement).toContain("240 km");
    expect(result?.hints).toHaveLength(1);
    expect(result?.finalAnswer).toBe("80");
  });

  it("returns null for garbage", () => {
    expect(parsePracticeProblem("")).toBeNull();
    expect(parsePracticeProblem("[]")).toBeNull();
  });
});
