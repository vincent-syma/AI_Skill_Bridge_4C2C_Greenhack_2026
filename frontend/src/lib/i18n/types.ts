export type Locale = "en" | "cs" | "de" | "uk";

export const LANG_META: Record<Locale, { short: string; native: string }> = {
  en: { short: "EN", native: "English" },
  cs: { short: "CZ", native: "Čeština" },
  de: { short: "DE", native: "Deutsch" },
  uk: { short: "UA", native: "Українська" },
};

export const LOCALES = Object.keys(LANG_META) as Locale[];
