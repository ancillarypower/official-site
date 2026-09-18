const numberCache = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(locale: string): Intl.NumberFormat {
  let fmt = numberCache.get(locale);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    numberCache.set(locale, fmt);
  }
  return fmt;
}

/** Currency symbols for common currencies. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  TWD: "NT$",
  USD: "US$",
  EUR: "\u20AC",
  JPY: "\u00A5",
};

/**
 * Format a numeric amount as a currency string with locale-aware
 * thousands separators and an explicit currency symbol.
 *
 * Default currency is TWD (New Taiwan Dollar) \u2014 displayed as "NT$"
 * regardless of locale to avoid the ambiguous bare "$" symbol.
 */
export function formatPrice(
  amount: number,
  lang: string,
  currency = "TWD",
): string {
  const locale = lang === "zh" ? "zh-TW" : "en-US";
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const formatted = getNumberFormatter(locale).format(amount);
  return `${symbol}${formatted}`;
}
