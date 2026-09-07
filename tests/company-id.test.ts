import { describe, expect, it } from "vitest";

import {
  generateCompanyId,
  isValidCompanyId,
  normalizeCompanyId,
} from "../lib/company-id-generator";

describe("ID da empresa XX-XXXXX", () => {
  it("gera IDs no formato correto", () => {
    for (let i = 0; i < 20; i++) {
      const id = generateCompanyId();
      expect(isValidCompanyId(id)).toBe(true);
    }
  });

  it("normaliza digitação parcial e completa", () => {
    expect(normalizeCompanyId("ab")).toBe("AB");
    expect(normalizeCompanyId("ab12345")).toBe("AB-12345");
    expect(normalizeCompanyId("ab-12345")).toBe("AB-12345");
    expect(normalizeCompanyId("ab 12-345")).toBe("AB-12345");
  });

  it("valida apenas o formato XX-XXXXX", () => {
    expect(isValidCompanyId("AB-12345")).toBe(true);
    expect(isValidCompanyId("A1-12345")).toBe(false);
    expect(isValidCompanyId("AB-1234")).toBe(false);
    expect(isValidCompanyId("AB12345")).toBe(false);
  });
});
