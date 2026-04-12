const normalizeSqliteDate = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.includes("T")) {
    return trimmed;
  }

  return trimmed.replace(" ", "T");
};

export const parseSqliteDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(normalizeSqliteDate(value));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const formatSqliteDateTime = (
  value: string | null | undefined,
  locale = "es-MX",
): string => {
  const parsed = parseSqliteDate(value);
  if (!parsed) {
    return "Sin fecha";
  }

  return parsed.toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export const formatSqliteLoanDate = (
  value: string | null | undefined,
  locale = "es-MX",
): string => {
  const parsed = parseSqliteDate(value);
  if (!parsed) {
    return "Sin fecha";
  }

  return parsed.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
