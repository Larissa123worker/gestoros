import { checkIfIdExists } from "./company-id-checker";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COMPANY_ID_REGEX = /^[A-Z]{2}-\d{5}$/;

function randomLetter(): string {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)]!;
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

/** Gera um ID no formato XX-XXXXX (2 letras + 5 dígitos). */
export function generateCompanyId(): string {
  const letters = randomLetter() + randomLetter();
  const digits = randomDigits(5);
  return `${letters}-${digits}`;
}

/** Normaliza digitação do usuário para XX-XXXXX. */
export function normalizeCompanyId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (cleaned.length <= 2) return cleaned;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 7)}`;
}

export function isValidCompanyId(id: string): boolean {
  return COMPANY_ID_REGEX.test(id);
}

export async function ensureUniqueCompanyId(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const id = generateCompanyId();
    const exists = await checkIfIdExists(id);
    if (!exists) return id;
  }
  throw new Error("Falha ao gerar ID único para empresa");
}
