export function onlyDigits(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, "");
  return maxLength ? digits.slice(0, maxLength) : digits;
}

export function isValidCpfCnpj(value: string) {
  const digits = onlyDigits(value);
  if (![11, 14].includes(digits.length) || /^(\d)\1+$/.test(digits)) return false;

  const size = digits.length === 11 ? 9 : 12;
  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(size) === Number(digits[size]) && calculateDigit(size + 1) === Number(digits[size + 1]);
}

export function isValidCep(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 8 && !/^0+$/.test(digits);
}

export function isValidPhone(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export async function lookupCep(value: string) {
  const cep = onlyDigits(value, 8);
  if (!isValidCep(cep)) return null;
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) throw new Error("Não foi possível consultar o CEP.");
  const data = await response.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
  if (data.erro) throw new Error("CEP não encontrado.");
  return data;
}
