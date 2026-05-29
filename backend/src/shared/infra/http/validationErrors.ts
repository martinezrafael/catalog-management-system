const REQUIRED_MESSAGES: Record<string, string> = {
  sku: "O código SKU é obrigatório.",
  price_cents: "O preço do produto é obrigatório.",
  category_ids: "Selecione ao menos uma categoria obrigatória.",
};

const INVALID_NUMBER_MESSAGES: Record<string, string> = {
  id: "O ID deve ser um número positivo válido.",
  price_cents: "O valor informado deve ser um número válido.",
};

const FORMAT_ERRORS: Record<string, string> = {
  email: "Formato de e-mail inválido.",
  url: "Formato de URL inválido.",
};

function handleInvalidType(issue: any): string {
  const path = issue.path?.join(".") || "";
  const isMissing =
    issue.received === "undefined" ||
    !issue.received ||
    issue.received === "null";

  if (isMissing) {
    return REQUIRED_MESSAGES[path] ?? "Este campo é obrigatório.";
  }

  if ("expected" in issue && "received" in issue) {
    if (path === "id" || path === "price_cents") {
      return INVALID_NUMBER_MESSAGES[path];
    }
    return `Esperava o tipo ${issue.expected}, mas recebeu ${issue.received}.`;
  }

  return "Campo inválido.";
}

function handleTooSmall(issue: any): string {
  const path = issue.path?.join(".") || "";

  if (issue.type === "string") {
    return issue.minimum === 1
      ? "Este campo não pode ser enviado vazio."
      : `O tamanho mínimo é de ${issue.minimum} caracteres.`;
  }

  if (issue.type === "number") {
    return path === "id"
      ? INVALID_NUMBER_MESSAGES.id
      : `O valor mínimo permitido é ${issue.minimum}.`;
  }

  return `O valor mínimo ou tamanho permitido é ${issue.minimum}.`;
}

function handleTooBig(issue: any): string {
  return issue.type === "string"
    ? `O tamanho máximo permitido é de ${issue.maximum} caracteres.`
    : `O valor máximo permitido é ${issue.maximum}.`;
}

function handleInvalidFormat(issue: any): string {
  if (!("validation" in issue)) return "Formato inválido.";

  const validation = issue.validation;

  if (FORMAT_ERRORS[validation]) {
    return FORMAT_ERRORS[validation];
  }

  if (validation === "regex") {
    const path = issue.path?.join(".") || "";
    return path === "sku"
      ? "Formato de SKU inválido. Deve seguir o padrão AAA-1111-AA."
      : "Formato de texto inválido para o padrão exigido.";
  }

  return "Formato inválido.";
}

export const errorMap = (...args: any[]) => {
  const [issue, ctx] = args;

  if (!issue) return "";

  switch (issue.code) {
    case "invalid_type":
      return handleInvalidType(issue);
    case "too_small":
      return handleTooSmall(issue);
    case "too_big":
      return handleTooBig(issue);
    case "invalid_format":
      return handleInvalidFormat(issue);
  }

  return ctx?.defaultError ?? "Dados inválidos.";
};
