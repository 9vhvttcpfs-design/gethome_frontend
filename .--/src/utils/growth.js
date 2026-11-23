// GetHome Growth Engine: first-touch attribution (UTM, GHA ?ref=, landing page, referrer).
// Everything here is best-effort and silent: it must never affect or slow the app.
const API = import.meta.env.VITE_API_URL || 'https://gethome-backend-7ocr.onrender.com';
const SID_KEY = 'gh_gx_sid';
const SENT_KEY = 'gh_gx_sent';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
// Only these query params are ever stored with the landing page (never tokens, codes or emails).
const LANDING_PARAMS = UTM_KEYS.concat(['ref', 'city', 'type', 'purpose']);

function newId() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* fall through */ }
  return 'gx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
}

// One id per browser (localStorage), so a visitor keeps the same first-touch across visits.
export function getGxSessionId() {
  try {
    let id = localStorage.getItem(SID_KEY);
    if (!id) { id = newId(); localStorage.setItem(SID_KEY, id); }
    return id;
  } catch (e) { return null; }
}

function post(path, body, headers) {
  return fetch(API + path, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: JSON.stringify(body),
    keepalive: true,
  }).then(function (r) { return r.json().catch(function () { return {}; }); });
}

function cleanLanding() {
  try {
    const p = new URLSearchParams(window.location.search);
    const keep = new URLSearchParams();
    LANDING_PARAMS.forEach(function (k) { if (p.get(k)) keep.set(k, p.get(k)); });
    const q = keep.toString();
    return (window.location.pathname || '/') + (q ? '?' + q : '');
  } catch (e) { return '/'; }
}

function cleanReferrer() {
  try {
    if (!document.referrer) return null;
    const u = new URL(document.referrer);
    if (u.host === window.location.host) return null; // internal navigation is not a source
    return u.origin + u.pathname;
  } catch (e) { return null; }
}

// Call once at startup. Records the first touch only; later visits do not overwrite it.
export function initAttribution() {
  try {
    const id = getGxSessionId();
    if (!id || localStorage.getItem(SENT_KEY) === '1') return;
    const p = new URLSearchParams(window.location.search);
    const body = { session_id: id, landing_page: cleanLanding(), referrer: cleanReferrer() };
    UTM_KEYS.forEach(function (k) { if (p.get(k)) body[k] = p.get(k); });
    if (p.get('ref')) body.referral_code = p.get('ref');
    post('/api/growth/attribution', body)
      .then(function (j) { if (j && j.ok) localStorage.setItem(SENT_KEY, '1'); })
      .catch(function () { /* retry on next load */ });
  } catch (e) { /* ignore */ }
}

// Stamped into new accounts so attribution survives confirming the email on another device.
export function gxSignupMeta() {
  const id = getGxSessionId();
  return id ? { gx_session_id: id } : {};
}

// After sign-in: ask the backend to link this visitor's attribution to the (new) account. Once per user.
export function linkAttribution(session) {
  try {
    if (!session || !session.user || !session.access_token) return;
    const key = 'gh_gx_linked_' + session.user.id;
    if (localStorage.getItem(key) === '1') return;
    post('/api/growth/attribution/link', { session_id: getGxSessionId() }, { Authorization: 'Bearer ' + session.access_token })
      .then(function (j) { if (j && j.ok) localStorage.setItem(key, '1'); })
      .catch(function () { /* retry next sign-in */ });
  } catch (e) { /* ignore */ }
}

// Lets AI-chat leads inherit the visitor's campaign attribution (the chat has its own per-tab session id).
export function attachAiSession(aiSessionId) {
  try {
    const id = getGxSessionId();
    if (!id || !aiSessionId) return;
    const key = 'gh_gx_ai_' + aiSessionId;
    if (sessionStorage.getItem(key) === '1') return;
    post('/api/growth/attribution', { session_id: id, ai_session_id: aiSessionId, landing_page: cleanLanding() })
      .then(function (j) { if (j && j.ok) sessionStorage.setItem(key, '1'); })
      .catch(function () { /* ignore */ });
  } catch (e) { /* ignore */ }
}
