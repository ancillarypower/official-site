/**
 * ISO 4217 currencies that use zero decimal places.
 * Used to determine fraction digit count in getNumberFormatter.
 */
const ZERO_DECIMAL = new Set([
  "BIF","CLP","DJF","GNF","ISK","JPY","KMF","KRW",
  "PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF",
]);

const numberCache = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(locale: string, currency: string): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let fmt = numberCache.get(key);
  if (!fmt) {
    const digits = ZERO_DECIMAL.has(currency) ? 0 : 2;
    fmt = new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    numberCache.set(key, fmt);
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
  const formatted = getNumberFormatter(locale, currency).format(amount);
  return `${symbol}${formatted}`;
}
