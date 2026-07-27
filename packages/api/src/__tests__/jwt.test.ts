import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../utils/jwt";

describe("jwt utils", () => {
  it("signToken returns a string", async () => {
    const token = await signToken({ userId: "test-id" });
    expect(typeof token).toBe("string");
  });

  it("verifyToken decodes what signToken encoded", async () => {
    const payload = { userId: "user-123" };
    const token = await signToken(payload);
    const decoded = await verifyToken(token);
    expect(decoded.userId).toBe("user-123");
  });
});
