export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type MapContext = {
  title: string;
  problemStatement: string;
  formula?: string;
  variables?: string;
  steps: Array<{
    stepNumber: number;
    explanation: string;
    mathExpression: string;
    result: string;
    isCorrect: string;
    feedback: string;
  }>;
};

export async function sendChatMessage(
  messages: ChatMessage[],
  mapContext: MapContext,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(mapContext);

  const allMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const { env } = await import("@smart-step-mapper/env/server");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

export function buildSystemPrompt(mapContext: MapContext): string {
  const stepsSummary = mapContext.steps
    .map(
      (s) =>
        `Step ${s.stepNumber}: ${s.explanation || "(no explanation)"}${
          s.mathExpression ? ` [Math: ${s.mathExpression}]` : ""
        }${s.result ? ` → Result: ${s.result}` : ""}${
          s.isCorrect === "correct"
            ? " ✅ Correct"
            : s.isCorrect === "incorrect"
              ? " ❌ Incorrect"
              : " ⏳ Unchecked"
        }${s.feedback ? ` (Feedback: ${s.feedback})` : ""}`,
    )
    .join("\n");

  return `You are a helpful math tutoring assistant integrated into "Smart Step Mapper", an app that helps students break down math problems step by step.

## Current Problem Context
**Title:** ${mapContext.title || "Untitled"}
**Problem Statement:** ${mapContext.problemStatement}
${mapContext.formula ? `**Formula:** ${mapContext.formula}` : ""}
${mapContext.variables ? `**Variables:** ${mapContext.variables}` : ""}

## Current Steps
${stepsSummary || "No steps have been added yet."}

## Your Role
- Help the student understand the problem and work through it step by step.
- Provide hints and guidance without giving away the answer directly.
- Explain mathematical concepts related to the problem.
- Suggest strategies for breaking down the problem.
- Point out potential pitfalls or common mistakes.
- Be encouraging and supportive.

Keep responses concise (2-4 sentences typically). Use clear math notation when needed.`;
}
