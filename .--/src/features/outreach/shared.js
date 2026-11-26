import { useCallback } from 'react';

// Shared styles and helpers for the Outreach Command Centre screens.
export const API = import.meta.env.VITE_API_URL || 'https://gethome-backend-7ocr.onrender.com';
export const GREEN = '#27ae60', NAVY = '#0a2240';
export const card = { backgroundColor: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(10,34,64,0.06)', border: '1.5px solid #e2e8f0', padding: 16, marginBottom: 12 };
export const input = { padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' };
export const btn = { padding: '7px 14px', border: 'none', borderRadius: 8, backgroundColor: GREEN, color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' };
export const btnSec = Object.assign({}, btn, { backgroundColor: NAVY });
export const btnGhost = Object.assign({}, btn, { backgroundColor: '#e2e8f0', color: '#334155' });

export function useApi() {
  return useCallback(function (path, method, body, raw) {
    const token = localStorage.getItem('gh_token');
    return fetch(API + '/api/growth' + path, {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      if (raw && r.ok) return r.blob();
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { const e = new Error(j.error || ('Request failed (' + r.status + ')')); e.status = r.status; e.body = j; throw e; }
        return j;
      });
    });
  }, []);
}

// Stores a photo in the public media bucket and resolves with { url }. No Content-Type header: the browser sets the boundary.
export function uploadImage(file) {
  const fd = new FormData(); fd.append('file', file);
  return fetch(API + '/api/growth/marketing/media', { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('gh_token') }, body: fd }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Upload failed (' + r.status + ')'); return j; });
  });
}

export const fmtDate =(d) => (d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '');

// Minimal CSV parser (quoted fields, commas and newlines inside quotes). First row = headers, lower-cased.
export function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(function (x) { return x.trim(); })) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f); if (row.some(function (x) { return x.trim(); })) rows.push(row);
  if (!rows.length) return [];
  const head = rows.shift().map(function (h) { return h.trim().toLowerCase().replace(/\s+/g, '_'); });
  return rows.map(function (r) { const o = {}; head.forEach(function (h, j) { o[h] = (r[j] || '').trim(); }); return o; });
}

export const money = (n) => 'NGN ' + Math.round(Number(n) || 0).toLocaleString('en-NG');
