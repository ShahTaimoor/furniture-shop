// Site-wide currency display. This only changes the symbol/formatting shown to
// shoppers — prices are still stored and entered as plain numbers (no live
// exchange-rate conversion happens here).
export const CURRENCY_OPTIONS = [
  { value: 'none', label: 'None (default)', symbol: 'Rs.', locale: 'en-PK' },
  { value: 'usd', label: 'US Dollar ($)', symbol: '$', locale: 'en-US' },
  { value: 'gbp', label: 'British Pound (£)', symbol: '£', locale: 'en-GB' },
  { value: 'eur', label: 'Euro (€)', symbol: '€', locale: 'de-DE' },
  { value: 'pkr', label: 'Pakistani Rupee (Rs.)', symbol: 'Rs.', locale: 'en-PK' },
];

const CURRENCY_MAP = CURRENCY_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

// Site currency setting -> ISO 4217 code, for places (structured data, Intl.NumberFormat)
// that need a real currency code rather than just a display symbol.
export const CURRENCY_ISO_MAP = { none: 'PKR', usd: 'USD', gbp: 'GBP', eur: 'EUR', pkr: 'PKR' };

/**
 * Formats a numeric price using the site's configured currency symbol.
 * `currency` is one of CURRENCY_OPTIONS' values ('none' falls back to Rs.).
 */
export const formatCurrency = (value, currency = 'none') => {
  const amount = Number(value) || 0;
  const config = CURRENCY_MAP[currency] || CURRENCY_MAP.none;
  const formatted = amount.toLocaleString(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${config.symbol} ${formatted}`;
};
