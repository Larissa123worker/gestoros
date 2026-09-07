import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../lib/password";

describe("senha do profissional", () => {
  it("gera hash e valida a senha correta", async () => {
    const hash = await hashPassword("senha123");
    expect(hash.includes("$")).toBe(true);
    expect(await verifyPassword("senha123", hash)).toBe(true);
    expect(await verifyPassword("outra", hash)).toBe(false);
  });
});
