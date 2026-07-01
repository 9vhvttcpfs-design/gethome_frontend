import { SUPPORTED_COUNTRIES } from '../constants/countries';

const GH_CONFIG = SUPPORTED_COUNTRIES.find(function (c) { return c.code === 'GH'; });

/**
 * Converts and formats a NGN-baseline listing price for the active platform country.
 * @param {number} priceInNaira - Raw price as stored in the database (always NGN).
 * @param {string} targetCountry - Active country name from context, e.g. 'Ghana' or 'Nigeria'.
 * @returns {string} Formatted local price string with currency symbol.
 */
export function formatLocalPrice(priceInNaira, targetCountry) {
  const num = Number(priceInNaira);
  if (!num || isNaN(num)) return '0';

  const isGhana = targetCountry?.toLowerCase().includes('ghana');

  if (isGhana) {
    const rate = GH_CONFIG?.fromNGNRate ?? 0.008687;
    const convertedPrice = num * rate;
    try {
      return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: 'GHS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(convertedPrice);
    } catch (_) {
      return 'GH₵ ' + convertedPrice.toFixed(2);
    }
  }

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  } catch (_) {
    return '₦' + num.toLocaleString();
  }
}
