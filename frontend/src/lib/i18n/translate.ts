import type { Locale } from "./types";

export function fmtText(raw: string, vars: Record<string, string | number> = {}): string {
  return String(raw).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export function tx(
  dict: Record<Locale, Record<string, string>>,
  lang: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = dict[lang]?.[key] ?? dict.en?.[key] ?? key;
  return vars ? fmtText(raw, vars) : raw;
}

export function lx(value: unknown, lang: Locale): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const map = value as Record<string, string>;
    return map[lang] || map.en || map.cs || Object.values(map)[0] || "";
  }
  return String(value ?? "");
}
