export type StepVerification = {
  isCorrect: boolean;
  feedback: string;
};

const FEEDBACK_MAP: Record<string, string> = {
  sign: "Check your sign (positive/negative). Did you carry the sign correctly?",
  arithmetic: "Double-check your arithmetic — addition, subtraction, multiplication, or division may have an error.",
  variable: "Verify that you correctly isolated the variable on one side.",
  formula: "Check that you used the correct formula and substituted values properly.",
  general: "Review your work step by step. There appears to be an error in this step.",
};

function classifyError(expected: string, actual: string): string {
  const e = expected.toLowerCase().replace(/\s+/g, "");
  const a = actual.toLowerCase().replace(/\s+/g, "");
  if (/[+-]/.test(e) && /[+-]/.test(a) && e.replace(/[+-]/g, "") === a.replace(/[+-]/g, "")) return "sign";
  if (/\d+/.test(e) && /\d+/.test(a)) return "arithmetic";
  if (/[a-z]/.test(e) && /[a-z]/.test(a)) return "variable";
  return "general";
}

export function verifyStepResult(expectedResult: string, userResult: string): StepVerification {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
  const exp = normalize(expectedResult);
  const usr = normalize(userResult);

  if (exp === usr) {
    return { isCorrect: true, feedback: "" };
  }

  const errorType = classifyError(expectedResult, userResult);
  return {
    isCorrect: false,
    feedback: FEEDBACK_MAP[errorType] ?? FEEDBACK_MAP.general,
  };
}
