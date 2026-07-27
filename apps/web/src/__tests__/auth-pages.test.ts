import { describe, it, expect } from "vitest";
import { isEmailValid, isPasswordValid } from "../lib/validation";

describe("auth validation", () => {
  it("isEmailValid rejects empty string", () => {
    expect(isEmailValid("")).toBe(false);
  });
  it("isEmailValid rejects missing @", () => {
    expect(isEmailValid("notanemail")).toBe(false);
  });
  it("isEmailValid accepts valid email", () => {
    expect(isEmailValid("test@example.com")).toBe(true);
  });
  it("isPasswordValid rejects < 6 chars", () => {
    expect(isPasswordValid("abc12")).toBe(false);
  });
  it("isPasswordValid accepts >= 6 chars", () => {
    expect(isPasswordValid("abcdef")).toBe(true);
  });
});
