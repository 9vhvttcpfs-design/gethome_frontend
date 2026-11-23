import { useEffect, useState, useCallback } from 'react';

// Leads & recruitment screen for Service Agents and GHAs. Talks to /api/growth/* using the staff token.
// Staff only see leads and prospects they own (enforced by the backend).
const API = import.meta.env.VITE_API_URL || 'https://gethome-backend-7ocr.onrender.com';
const card = { backgroundColor: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(10,34,64,0.06)', border: '1.5px solid #e2e8f0', padding: 16, marginBottom: 12 };
const input = { padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' };
const btn = { padding: '7px 14px', border: 'none', borderRadius: 8, backgroundColor: '#27ae60', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' };
const btnSec = Object.assign({}, btn, { backgroundColor: '#0a2240' });
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'inspection_booked', 'converted', 'dead'];
const STAGES_EDITABLE = ['new', 'contacted', 'interested', 'applied', 'lost'];
const CONSENT = [
  ['public_business_listing', 'Public business listing'],
  ['prospect_requested', 'Asked to hear from us'],
  ['existing_relationship', 'Existing relationship'],
  ['referred_by_agent', 'Referred by an agent'],
];

function useApi(token) {
  return useCallback(function (path, method, body) {
    return fetch(API + path, {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || 'Request failed (' + r.status + ')');
        return j;
      });
    });
  }, [token]);
}

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function reqSummary(r) {
  if (!r) return '';
  return [r.purpose, r.property_type, r.bedrooms ? r.bedrooms + ' bed' : null, r.preferred_location || r.location || r.city,
    r.budget_max ? 'up to ₦' + Number(r.budget_max).toLocaleString() : null].filter(Boolean).join(' · ');
}

function Leads({ token }) {
  const api = useApi(token);
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('');
  const [due, setDue] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(function () {
    setLoading(true);
    api('/api/growth/leads?limit=100' + (filter ? '&status=' + filter : '') + (due ? '&due=true' : ''))
      .then(function (j) { setLeads(j.leads || []); setMsg(''); })
      .catch(function (e) { setMsg(e.message); })
      .then(function () { setLoading(false); });
  }, [api, filter, due]);
  useEffect(load, [load]);

  function patch(id, body) {
    api('/api/growth/leads/' + id, 'PATCH', body)
      .then(function () { setLeads(function (prev) { return prev.map(function (l) { return l.id === id ? Object.assign({}, l, body) : l; }); }); })
      .catch(function (e) { setMsg(e.message); });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <select value={filter} onChange={function (e) { setFilter(e.target.value); }} style={Object.assign({}, input, { width: 'auto' })}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map(function (s) { return <option key={s} value={s}>{s.replace('_', ' ')}</option>; })}
        </select>
        <label style={{ fontSize: '0.82rem', color: '#334155' }}><input type="checkbox" checked={due} onChange={function (e) { setDue(e.target.checked); }} /> Follow-ups due</label>
        <button style={btnSec} onClick={load}>Refresh</button>
      </div>
      {msg && <div style={{ color: '#b91c1c', fontSize: '0.82rem', marginBottom: 8 }}>{msg}</div>}
      {loading && <div style={{ color: '#64748b' }}>Loading...</div>}
      {!loading && !leads.length && <div style={Object.assign({}, card, { color: '#64748b' })}>No leads yet. Leads from the AI assistant in your area appear here.</div>}
      {leads.map(function (l) {
        const phone = l.phone ? '+' + l.phone.replace(/^\+/, '') : null;
        return (
          <div key={l.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#0a2240' }}>{l.name || 'Unnamed lead'} <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>· {l.segment} · {l.source}</span></div>
                <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: 2 }}>{reqSummary(l.requirements) || 'No requirements captured'}</div>
                <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
                  {phone && <a href={'tel:' + phone} style={{ color: '#27ae60', marginRight: 10 }}>{phone}</a>}
                  {l.phone && <a href={'https://wa.me/' + l.phone} target="_blank" rel="noreferrer" style={{ color: '#27ae60', marginRight: 10 }}>WhatsApp</a>}
                  {l.email && <a href={'mailto:' + l.email} style={{ color: '#27ae60' }}>{l.email}</a>}
                </div>
                {l.do_not_contact && <div style={{ color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700, marginTop: 4 }}>Opted out: do not contact</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 190 }}>
                <select value={l.status} onChange={function (e) { patch(l.id, { status: e.target.value }); }} style={input}>
                  {LEAD_STATUSES.map(function (s) { return <option key={s} value={s}>{s.replace('_', ' ')}</option>; })}
                </select>
                <input type="datetime-local" style={input} value={toLocalInput(l.next_follow_up)}
                  onChange={function (e) { patch(l.id, { next_follow_up: e.target.value ? new Date(e.target.value).toISOString() : null }); }} />
              </div>
            </div>
            {l.ai_summary || l.notes ? <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 8 }}>{l.notes}</div> : null}
            <NotesBox initial={l.notes || ''} onSave={function (v) { patch(l.id, { notes: v }); }} />
          </div>
        );
      })}
    </div>
  );
}

function NotesBox({ initial, onSave }) {
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <input style={input} placeholder="Add a note" value={v} onChange={function (e) { setV(e.target.value); setSaved(false); }} />
      <button style={btnSec} onClick={function () { onSave(v); setSaved(true); }}>{saved ? 'Saved' : 'Save'}</button>
    </div>
  );
}

function Draft({ draft, onClose, onMarkSent }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const done = function () { setCopied(true); setTimeout(function () { setCopied(false); }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(draft.message_text).then(done).catch(function () { /* user can select manually */ });
    else done();
  }
  return (
    <div style={{ marginTop: 10, padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      {draft.subject && <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 6 }}>Subject: {draft.subject}</div>}
      <textarea readOnly value={draft.message_text} rows={9} style={Object.assign({}, input, { fontFamily: 'inherit', resize: 'vertical' })} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button style={btn} onClick={copy}>{copied ? 'Copied' : 'Copy message'}</button>
        {draft.wa_link && <a href={draft.wa_link} target="_blank" rel="noreferrer" style={Object.assign({}, btn, { textDecoration: 'none', display: 'inline-block' })}>Open WhatsApp</a>}
        <button style={btnSec} onClick={onMarkSent}>I sent it</button>
        <button style={Object.assign({}, btnSec, { backgroundColor: '#94a3b8' })} onClick={onClose}>Close</button>
      </div>
      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 6 }}>Send this yourself, then tap "I sent it" so the prospect moves to Contacted.</div>
    </div>
  );
}

function Recruits({ token }) {
  const api = useApi(token);
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('');
  const [syncedAt, setSyncedAt] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [form, setForm] = useState({ name: '', phone: '', email: '', type: 'agent', state: '', city: '', consent_basis: 'public_business_listing' });

  const load = useCallback(function () {
    setLoading(true);
    api('/api/growth/recruit/prospects?limit=100' + (stage ? '&stage=' + stage : ''))
      .then(function (j) { setItems(j.prospects || []); setSyncedAt(j.synced_at || null); setMsg(''); })
      .catch(function (e) { setMsg(e.message); })
      .then(function () { setLoading(false); });
  }, [api, stage]);
  useEffect(load, [load]);

  function patch(id, body) {
    api('/api/growth/recruit/prospects/' + id, 'PATCH', body)
      .then(function () { setItems(function (prev) { return prev.map(function (p) { return p.id === id ? Object.assign({}, p, body) : p; }); }); })
      .catch(function (e) { setMsg(e.message); });
  }
  function add() {
    setMsg('');
    api('/api/growth/recruit/prospects', 'POST', form)
      .then(function (p) { setItems(function (prev) { return [p].concat(prev); }); setShowAdd(false); setForm(Object.assign({}, form, { name: '', phone: '', email: '' })); })
      .catch(function (e) { setMsg(e.message); });
  }
  function makeDraft(p, channel) {
    setMsg('');
    api('/api/growth/recruit/outreach', 'POST', { prospect_id: p.id, channel: channel })
      .then(function (d) { setDrafts(function (prev) { return Object.assign({}, prev, { [p.id]: d }); }); })
      .catch(function (e) { setMsg(e.message); });
  }
  function markSent(p) {
    const d = drafts[p.id];
    if (!d) return;
    api('/api/growth/recruit/outreach/' + d.outreach_id + '/mark-sent', 'POST')
      .then(function () {
        setDrafts(function (prev) { const n = Object.assign({}, prev); delete n[p.id]; return n; });
        setItems(function (prev) { return prev.map(function (x) { return x.id === p.id && x.stage === 'new' ? Object.assign({}, x, { stage: 'contacted' }) : x; }); });
      })
      .catch(function (e) { setMsg(e.message); });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        <select value={stage} onChange={function (e) { setStage(e.target.value); }} style={Object.assign({}, input, { width: 'auto' })}>
          <option value="">All stages</option>
          {['new', 'contacted', 'interested', 'applied', 'approved', 'subscribed', 'lost'].map(function (s) { return <option key={s} value={s}>{s}</option>; })}
        </select>
        <button style={btn} onClick={function () { setShowAdd(!showAdd); }}>{showAdd ? 'Cancel' : 'Add prospect'}</button>
        <button style={btnSec} onClick={load}>Refresh</button>
        {syncedAt && <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Stages synced from real accounts at {new Date(syncedAt).toLocaleTimeString()}</span>}
      </div>
      {showAdd && (
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
            <input style={input} placeholder="Name" value={form.name} onChange={function (e) { setForm(Object.assign({}, form, { name: e.target.value })); }} />
            <input style={input} placeholder="Phone (080...)" value={form.phone} onChange={function (e) { setForm(Object.assign({}, form, { phone: e.target.value })); }} />
            <input style={input} placeholder="Email" value={form.email} onChange={function (e) { setForm(Object.assign({}, form, { email: e.target.value })); }} />
            <select style={input} value={form.type} onChange={function (e) { setForm(Object.assign({}, form, { type: e.target.value })); }}><option value="agent">Agent</option><option value="agency">Agency</option></select>
            <input style={input} placeholder="State" value={form.state} onChange={function (e) { setForm(Object.assign({}, form, { state: e.target.value })); }} />
            <input style={input} placeholder="City" value={form.city} onChange={function (e) { setForm(Object.assign({}, form, { city: e.target.value })); }} />
            <select style={input} value={form.consent_basis} onChange={function (e) { setForm(Object.assign({}, form, { consent_basis: e.target.value })); }}>
              {CONSENT.map(function (c) { return <option key={c[0]} value={c[0]}>{c[1]}</option>; })}
            </select>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', margin: '8px 0' }}>Only add people you may lawfully contact. Phone or email is required.</div>
          <button style={btn} onClick={add}>Save prospect</button>
        </div>
      )}
      {msg && <div style={{ color: '#b91c1c', fontSize: '0.82rem', marginBottom: 8 }}>{msg}</div>}
      {loading && <div style={{ color: '#64748b' }}>Loading...</div>}
      {!loading && !items.length && <div style={Object.assign({}, card, { color: '#64748b' })}>No prospects yet. Add the agents and agencies you want to recruit.</div>}
      {items.map(function (p) {
        const d = drafts[p.id];
        const auto = p.stage === 'approved' || p.stage === 'subscribed';
        return (
          <div key={p.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#0a2240' }}>{p.name || p.agency_name || 'Unnamed'} <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.75rem' }}>· {p.type} · {[p.city, p.state].filter(Boolean).join(', ') || 'no location'}</span></div>
                <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
                  {p.phone && <span style={{ marginRight: 10 }}>+{p.phone}</span>}
                  {p.email && <span>{p.email}</span>}
                </div>
                {p.do_not_contact && <div style={{ color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700, marginTop: 4 }}>Opted out: do not contact</div>}
                {auto && <div style={{ color: '#27ae60', fontSize: '0.75rem', fontWeight: 700, marginTop: 4 }}>{p.stage === 'subscribed' ? 'Subscribed' : 'Approved'} on GetHome</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 190 }}>
                {auto ? <div style={{ fontWeight: 700, color: '#0a2240' }}>{p.stage}</div> : (
                  <select value={p.stage} onChange={function (e) { patch(p.id, { stage: e.target.value }); }} style={input}>
                    {STAGES_EDITABLE.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
                  </select>
                )}
                <input type="datetime-local" style={input} value={toLocalInput(p.next_follow_up)}
                  onChange={function (e) { patch(p.id, { next_follow_up: e.target.value ? new Date(e.target.value).toISOString() : null }); }} />
              </div>
            </div>
            {!p.do_not_contact && p.stage !== 'lost' && p.stage !== 'subscribed' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {p.phone && <button style={btn} onClick={function () { makeDraft(p, 'whatsapp'); }}>Draft WhatsApp</button>}
                {p.phone && <button style={btnSec} onClick={function () { makeDraft(p, 'sms'); }}>Draft SMS</button>}
                {p.email && <button style={btnSec} onClick={function () { makeDraft(p, 'email'); }}>Draft email</button>}
              </div>
            )}
            {d && <Draft draft={d} onClose={function () { setDrafts(function (prev) { const n = Object.assign({}, prev); delete n[p.id]; return n; }); }} onMarkSent={function () { markSent(p); }} />}
            <NotesBox initial={p.notes || ''} onSave={function (v) { patch(p.id, { notes: v }); }} />
          </div>
        );
      })}
    </div>
  );
}

export default function GrowthCRM({ token }) {
  const [view, setView] = useState('leads');
  if (!token) return <div style={card}>Please log in again.</div>;
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['leads', 'Customer leads'], ['recruits', 'Agent recruitment']].map(function (t) {
          const active = view === t[0];
          return <button key={t[0]} onClick={function () { setView(t[0]); }} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', backgroundColor: active ? '#0a2240' : '#f1f5f9', color: active ? '#fff' : '#334155' }}>{t[1]}</button>;
        })}
      </div>
      {view === 'leads' ? <Leads token={token} /> : <Recruits token={token} />}
    </div>
  );
}
