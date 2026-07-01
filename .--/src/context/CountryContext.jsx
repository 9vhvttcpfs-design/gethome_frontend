import { createContext, useContext, useState, useCallback } from 'react';
import { SUPPORTED_COUNTRIES, DEFAULT_COUNTRY } from '../constants/countries';

const CountryContext = createContext(null);

export function CountryProvider({ children }) {
  const [activeCountry, setActiveCountry] = useState(function () {
    try {
      const saved = localStorage.getItem('gh_country');
      if (saved) {
        const found = SUPPORTED_COUNTRIES.find(function (c) { return c.code === saved; });
        if (found) return found;
      }
    } catch (_) {}
    return DEFAULT_COUNTRY;
  });

  const setCountryByCode = useCallback(function (code) {
    const country = SUPPORTED_COUNTRIES.find(function (c) { return c.code === code; });
    if (country) {
      setActiveCountry(country);
      try { localStorage.setItem('gh_country', code); } catch (_) {}
    }
  }, []);

  const fmtCurrency = useCallback(function (n) {
    const num = Number(n);
    if (!num || isNaN(num)) return activeCountry.currencySymbol + ' 0';
    try {
      return num.toLocaleString(activeCountry.locale, {
        style: 'currency',
        currency: activeCountry.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    } catch (_) {
      return activeCountry.currencySymbol + ' ' + num.toLocaleString();
    }
  }, [activeCountry]);

  // Converts a NGN-baseline listing price to the active country's currency before formatting.
  // Use this for property prices; use fmtCurrency for amounts already in local currency (fees, tiers).
  const fmtListingPrice = useCallback(function (priceNGN) {
    const num = Number(priceNGN);
    if (!num || isNaN(num)) return activeCountry.currencySymbol + ' 0';
    const rate = activeCountry.fromNGNRate;
    const localAmount = rate ? num * rate : num;
    const decimals = rate ? 2 : 0;
    try {
      return localAmount.toLocaleString(activeCountry.locale, {
        style: 'currency',
        currency: activeCountry.currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } catch (_) {
      return activeCountry.currencySymbol + ' ' + localAmount.toLocaleString();
    }
  }, [activeCountry]);

  return (
    <CountryContext.Provider value={{ activeCountry, setCountryByCode, fmtCurrency, fmtListingPrice, SUPPORTED_COUNTRIES }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry must be used inside CountryProvider');
  return ctx;
}
