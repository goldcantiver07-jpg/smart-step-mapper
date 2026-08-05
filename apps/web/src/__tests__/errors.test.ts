import { describe, it, expect } from "vitest";
import { getAuthErrorMessage, getErrorCode, getErrorMessage } from "../lib/errors";

describe("getErrorMessage", () => {
  it("extracts message from an Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("extracts message from an ORPC-style error object", () => {
    expect(getErrorMessage({ code: "NOT_FOUND", message: "No account found" })).toBe(
      "No account found",
    );
  });

  it("falls back for non-error input", () => {
    expect(getErrorMessage(undefined)).toBe("Unknown error");
  });
});

describe("getErrorCode", () => {
  it("returns the code when present", () => {
    expect(getErrorCode({ code: "INTERNAL_SERVER_ERROR", message: "x" })).toBe(
      "INTERNAL_SERVER_ERROR",
    );
  });

  it("returns undefined for plain errors", () => {
    expect(getErrorCode(new Error("x"))).toBeUndefined();
  });
});

describe("getAuthErrorMessage", () => {
  it("passes through descriptive server messages", () => {
    const err = { code: "NOT_FOUND", message: "No account found with this email." };
    expect(getAuthErrorMessage(err)).toBe(err.message);
  });

  it("passes through incorrect-password messages", () => {
    const err = { code: "UNAUTHORIZED", message: "Incorrect password. Please try again." };
    expect(getAuthErrorMessage(err)).toBe(err.message);
  });

  it("passes through already-registered messages", () => {
    const err = { code: "CONFLICT", message: "This email is already registered." };
    expect(getAuthErrorMessage(err)).toBe(err.message);
  });

  it("replaces 'Internal server error' with a friendly message", () => {
    const err = { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" };
    const message = getAuthErrorMessage(err);
    expect(message).toContain("Something went wrong");
    expect(message).not.toContain("Internal server error");
  });

  it("detects network failures and suggests checking the connection", () => {
    const err = {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      cause: new TypeError("Failed to fetch"),
    };
    expect(getAuthErrorMessage(err)).toContain("couldn't reach the server");
  });

  it("maps BAD_REQUEST to a review-your-input message", () => {
    const err = { code: "BAD_REQUEST", message: "Invalid input: Expected string" };
    const message = getAuthErrorMessage(err);
    expect(message).toContain("looks incorrect");
    expect(message).not.toContain("Invalid input");
  });

  it("maps TOO_MANY_REQUESTS to a wait-a-moment message", () => {
    expect(getAuthErrorMessage({ code: "TOO_MANY_REQUESTS", message: "Too Many Requests" })).toContain(
      "Too many attempts",
    );
  });

  it("falls back to a friendly message for unknown errors", () => {
    expect(getAuthErrorMessage(new Error("something weird"))).toContain("Something went wrong");
  });
});
