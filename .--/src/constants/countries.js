export const SUPPORTED_COUNTRIES = [
  {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    currency: 'NGN',
    currencySymbol: '₦',
    locale: 'en-NG',
    cities: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Enugu', 'Kano'],
  },
  {
    code: 'GH',
    name: 'Ghana',
    flag: '🇬🇭',
    currency: 'GHS',
    currencySymbol: 'GH₵',
    locale: 'en-GH',
    cities: ['Accra', 'Kumasi', 'Tamale', 'Cape Coast', 'Takoradi'],
    // 1 NGN → GHS conversion baseline (update periodically)
    fromNGNRate: 0.008687,
  },
];

export const DEFAULT_COUNTRY = SUPPORTED_COUNTRIES[0];
