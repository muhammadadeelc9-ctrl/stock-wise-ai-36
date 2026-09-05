const symbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  PKR: "₨",
  INR: "₹",
  AED: "د.إ",
  CAD: "C$",
  AUD: "A$",
};

export const CURRENCIES = Object.keys(symbols);

export function currencySymbol(code: string | undefined) {
  return symbols[code ?? "USD"] ?? "$";
}

export function money(value: number, code = "USD", compact = false) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const symbol = currencySymbol(code);
  if (compact && abs >= 1000) {
    return `${sign}${symbol}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  }
  return `${sign}${symbol}${abs.toLocaleString(undefined, {
    minimumFractionDigits: abs < 100 && abs % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: abs < 100 ? 2 : 0,
  })}`;
}

export function num(value: number) {
  return Math.round(value).toLocaleString();
}

export function decimal(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "∞";
  return value.toFixed(digits);
}

export function days(value: number) {
  if (!Number.isFinite(value)) return "∞";
  if (value > 999) return "999+d";
  return `${Math.round(value)}d`;
}

export function pct(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

export function shortDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
