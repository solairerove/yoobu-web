const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  VND: '₫',
  IDR: 'Rp',
  THB: '฿'
};

export function normalizeCurrencyCode(currency: string | null | undefined): string {
  const code = currency?.trim().toUpperCase();

  if (!code) {
    return 'VND';
  }

  return CURRENCY_SYMBOLS[code] ? code : 'VND';
}

export function currencySymbolFor(currency: string | null | undefined): string {
  const code = normalizeCurrencyCode(currency);
  return CURRENCY_SYMBOLS[code] ?? code;
}
