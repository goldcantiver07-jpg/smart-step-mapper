import { describe, it, expect } from "vitest";
import { defaultTopics } from "../seed";

describe("Seed data", () => {
  it("exports defaultTopics as an array", () => {
    expect(Array.isArray(defaultTopics)).toBe(true);
  });

  it("has at least 6 topics", () => {
    expect(defaultTopics.length).toBeGreaterThanOrEqual(6);
  });

  it("each topic has name and description", () => {
    for (const t of defaultTopics) {
      expect(typeof t.name).toBe("string");
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.description).toBe("string");
    }
  });
});
