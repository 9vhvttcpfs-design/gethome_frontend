// Cities and the neighbourhoods that belong to them. Shared by the app's city filter and the SEO
// pre-render script, so a landing page's listing count always matches what the app shows.
// Listing locations are free text ("Guzape", "Owerri North"); without this, searching "Abuja"
// would miss listings entered by district name.
export const CITY_AREAS = {
  Lagos: ['lekki', 'ikeja', 'yaba', 'ajah', 'surulere', 'victoria island', 'ikoyi', 'ikorodu', 'magodo', 'gbagada', 'maryland', 'ogudu', 'badagry', 'epe', 'sangotedo', 'chevron', 'oniru', 'ojodu', 'festac', 'apapa'],
  Abuja: ['wuse', 'maitama', 'garki', 'gwarinpa', 'asokoro', 'jabi', 'kubwa', 'lugbe', 'utako', 'katampe', 'lokogoma', 'gwagwalada', 'fct', 'guzape', 'durumi', 'jikwoyi', 'wuye', 'gousa', 'ushafa', 'apo', 'mpape', 'karmo', 'life camp', 'kado', 'galadimawa', 'dawaki', 'kaura', 'nyanya', 'karu', 'kurudu', 'idu', 'mabushi', 'gudu', 'dei-dei', 'dei dei', 'bwari', 'kuje', 'garki', 'jahi', 'gaduwa', 'sabon lugbe', 'kabusa', 'efab'],
  'Port Harcourt': ['rumuola', 'gra', 'trans amadi', 'rumuokoro', 'obio-akpor', 'obio akpor', 'rumuigbo', 'eleme', 'woji', 'peter odili'],
  Ibadan: ['bodija', 'ring road', 'akobo', 'iyaganku', 'challenge', 'oluyole'],
  Kano: [], Enugu: ['independence layout', 'trans ekulu', 'new haven'], 'Benin City': ['benin', 'ugbowo', 'gra benin'], Owerri: [],
  Warri: [], Kaduna: [], Abeokuta: [], Uyo: [], Asaba: [], Jos: [], Ilorin: [], Calabar: [], Akure: [], Awka: [],
  Onitsha: [], Abakaliki: [], Makurdi: [], Minna: [], Maiduguri: [], Sokoto: [], Yola: [], Lokoja: [], Osogbo: [],
  'Ado-Ekiti': [], Umuahia: [], Yenagoa: [], Gombe: [], Bauchi: [], Dutse: [], Katsina: [], Lafia: [], Jalingo: [],
};

function wordIn(text, term) {
  const t = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[-\s]/g, '[-\\s]');
  return new RegExp('(^|[^a-z0-9])' + t + '([^a-z0-9]|$)').test(text);
}

// true if a listing location belongs to `city` (by name or by one of its known neighbourhoods)
export function matchesCity(location, city) {
  const loc = String(location || '').toLowerCase();
  const c = String(city || '').toLowerCase();
  if (!loc || !c) return false;
  if (loc.includes(c)) return true; // original behaviour, kept as-is
  const key = Object.keys(CITY_AREAS).find(function (k) { return k.toLowerCase() === c; });
  return !!key && CITY_AREAS[key].some(function (a) { return wordIn(loc, a); });
}

// which known city a location belongs to, or null
export function cityOf(location) {
  const names = Object.keys(CITY_AREAS);
  for (let i = 0; i < names.length; i++) if (matchesCity(location, names[i])) return names[i];
  return null;
}
