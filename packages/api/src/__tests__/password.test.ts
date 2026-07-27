import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../utils/password";

describe("password utils", () => {
  it("hashPassword returns a string", async () => {
    const hash = await hashPassword("test123");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("verifyPassword returns true for correct password", async () => {
    const hash = await hashPassword("test123");
    const ok = await verifyPassword("test123", hash);
    expect(ok).toBe(true);
  });

  it("verifyPassword returns false for wrong password", async () => {
    const hash = await hashPassword("test123");
    const ok = await verifyPassword("wrong", hash);
    expect(ok).toBe(false);
  });
});
