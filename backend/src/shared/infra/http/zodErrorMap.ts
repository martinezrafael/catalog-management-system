import { z } from "zod";

// 1. Dicionário para formatos genéricos simples
const FORMAT_ERRORS: Record<string, string> = {
  email: "Formato de e-mail inválido.",
  url: "Formato de URL inválido.",
};

// 2. Manipulador de tipos inválidos e obrigatoriedade
function handleInvalidType(issue: any): string | undefined {
  if ("received" in issue && issue.received === "undefined") {
    return "Este campo é obrigatório.";
  }

  if ("expected" in issue && "received" in issue) {
    if (issue.path?.includes("id")) {
      return "O ID informado deve ser um número válido.";
    }
    return `Esperava o tipo ${issue.expected}, mas recebeu ${issue.received}.`;
  }

  return "Tipo inválido.";
}

// 3. Manipulador de limites mínimos (strings, números e regras como .positive())
function handleTooSmall(issue: any): string {
  if (issue.type === "string") {
    return `O tamanho mínimo é de ${issue.minimum} caracteres.`;
  }

  if (issue.type === "number") {
    if (issue.path?.includes("id")) {
      return "O ID deve ser um número positivo válido.";
    }
    return `O valor mínimo permitido é ${issue.minimum}.`;
  }

  return `O valor mínimo ou tamanho permitido é ${issue.minimum}.`;
}

// 4. Manipulador de limites máximos
function handleTooBig(issue: any): string {
  if (issue.type === "string") {
    return `O tamanho máximo permitido é de ${issue.maximum} caracteres.`;
  }
  return `O valor máximo permitido é ${issue.maximum}.`;
}

// 5. Manipulador de formatos (Regex, E-mail, URL, etc.)
function handleInvalidFormat(issue: any): string {
  if (!("validation" in issue)) return "Formato inválido.";

  const validation = issue.validation;

  // Se for uma validação simples mapeada no dicionário (ex: email, url)
  if (FORMAT_ERRORS[validation]) {
    return FORMAT_ERRORS[validation];
  }

  // Regras customizadas de expressões regulares (Regex) por campo
  if (validation === "regex") {
    if (issue.path?.includes("sku")) {
      return "Formato de SKU inválido. Deve seguir o padrão AAA-1111-AA.";
    }
    return "Formato de texto inválido para o padrão exigido.";
  }

  return "Formato inválido.";
}

// =========================================================================
// FUNÇÃO PRINCIPAL (Exportada para os DTOs)
// =========================================================================
export const portugueseErrorMap = (...args: any[]) => {
  const [issue, ctx] = args;

  if (!issue) return undefined;

  switch (issue.code) {
    case "invalid_type":
      return handleInvalidType(issue);
    case "too_small":
      return handleTooSmall(issue);
    case "too_big":
      return handleTooBig(issue);
    case "invalid_format":
      return handleInvalidFormat(issue);
    default:
      return ctx?.defaultError;
  }
};
