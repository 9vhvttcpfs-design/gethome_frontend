import { useEffect, useState, useCallback } from 'react';

// Outreach Command Centre: admin-only prospect CRM (phase 1). Talks to /api/growth/outreach/* with the
// admin's Supabase token. Every number shown comes from the database; nothing here is computed client-side
// except display formatting. Server-side rules (consent gate, roles, pipeline rules) are authoritative.
const API = import.meta.env.VITE_API_URL || 'https://gethome-backend-7ocr.onrender.com';
const GREEN = '#27ae60', NAVY = '#0a2240';
const card = { backgroundColor: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(10,34,64,0.06)', border: '1.5px solid #e2e8f0', padding: 16, marginBottom: 12 };
const input = { padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' };
const btn = { padding: '7px 14px', border: 'none', borderRadius: 8, backgroundColor: GREEN, color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' };
const btnSec = Object.assign({}, btn, { backgroundColor: NAVY });
const btnGhost = Object.assign({}, btn, { backgroundColor: '#e2e8f0', color: '#334155' });
const STAGES = ['new', 'qualified', 'permission_obtained', 'campaign_ready', 'contacted', 'interested', 'applied', 'approved', 'subscribed', 'lost'];
const STAGE_LABEL = { new: 'Discovered', qualified: 'Qualified', permission_obtained: 'Permission Obtained', campaign_ready: 'Campaign Ready', contacted: 'Contacted', interested: 'Interested', applied: 'Registered', approved: 'Registered (verified)', subscribed: 'Subscribed', lost: 'Lost' };
const MANUAL_STAGES = ['new', 'qualified', 'permission_obtained', 'campaign_ready', 'contacted', 'interested', 'lost'];
const CATEGORIES = [['independent_agent', 'Independent agent'], ['established_agency', 'Established agency'], ['commercial_agent', 'Commercial agent'], ['residential_agent', 'Residential agent'], ['property_consultant', 'Property consultant'], ['other', 'Other']];
const REASONS = {
  legitimate_interest_not_enabled: 'Legitimate-interest email is switched off in Settings, and there is no recorded consent.',
  whatsapp_requires_opt_in: 'WhatsApp needs a recorded opt-in. Cold WhatsApp is not allowed.',
  max_attempts_reached: 'The maximum number of unanswered attempts has been reached. Contact stops here.',
  reply_awaiting_human: 'A reply is waiting for a person to handle it.',
  consent_withdrawn: 'Consent was withdrawn.', opted_out: 'The prospect opted out.', suppressed: 'This contact is on the suppression list.',
  contact_invalid: 'This contact is marked invalid.', contact_bounced: 'This contact bounced.', source_not_recorded: 'No source URL recorded for this contact.',
  no_contact: 'No contact of this type.', stage_subscribed: 'Already a paying agent.', stage_applied: 'Already registered on GetHome.', stage_approved: 'Already registered on GetHome.', stage_lost: 'Marked lost.',
};

function useApi() {
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

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const Badge = ({ children, color }) => <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, backgroundColor: (color || '#64748b') + '22', color: color || '#64748b', marginRight: 4 }}>{children}</span>;
const Msg = ({ m }) => (m ? <div style={{ color: m.ok ? GREEN : '#b91c1c', fontSize: '0.82rem', margin: '6px 0' }}>{m.text}</div> : null);

function Pipeline({ api, onOpen }) {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [state, setState] = useState('');
  useEffect(function () {
    api('/outreach/pipeline' + (state ? '?state=' + encodeURIComponent(state) : '')).then(setData).catch(function (e) { setMsg({ text: e.message }); });
  }, [api, state]);
  if (msg) return <Msg m={msg} />;
  if (!data) return <div style={{ color: '#64748b' }}>Loading...</div>;
  return (
    <div>
      <input style={Object.assign({}, input, { maxWidth: 220, marginBottom: 10 })} placeholder="Filter by state" value={state} onChange={function (e) { setState(e.target.value); }} />
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10 }}>
        {data.columns.map(function (col) {
          return (
            <div key={col.stage} style={{ minWidth: 215, maxWidth: 215, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 10 }}>
              <div style={{ fontWeight: 800, color: NAVY, fontSize: '0.8rem', marginBottom: 8 }}>{data.labels[col.stage] || col.stage} <span style={{ color: '#64748b', fontWeight: 600 }}>({col.count})</span></div>
              {col.prospects.map(function (p) {
                return (
                  <div key={p.id} onClick={function () { onOpen(p.id); }} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 8, marginBottom: 6, cursor: 'pointer', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 700, color: NAVY }}>{p.name}</div>
                    <div style={{ color: '#64748b' }}>{[p.city, p.state].filter(Boolean).join(', ') || 'No location'}</div>
                    {p.email_permission === 'granted' && <Badge color={GREEN}>consent</Badge>}
                  </div>
                );
              })}
              {col.count > col.prospects.length && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>+ {col.count - col.prospects.length} more (see Prospects)</div>}
              {!col.count && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Empty</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProspectForm({ api, onDone, onCancel }) {
  const [f, setF] = useState({ business_name: '', contact_person: '', category: 'established_agency', state: '', city: '', website: '', source_url: '', email: '', phone: '', notes: '' });
  const [msg, setMsg] = useState(null);
  const [dups, setDups] = useState(null);
  const set = (k) => (e) => setF(Object.assign({}, f, { [k]: e.target.value }));
  function save() {
    setMsg(null); setDups(null);
    const contacts = [];
    if (f.email.trim()) contacts.push({ channel: 'email', value: f.email, label: f.contact_person });
    if (f.phone.trim()) contacts.push({ channel: 'phone', value: f.phone, label: f.contact_person });
    api('/outreach/prospects', 'POST', Object.assign({}, f, { contacts: contacts, source: 'manual' }))
      .then(function (p) { onDone(p); })
      .catch(function (e) { setMsg({ text: e.message }); if (e.body && e.body.duplicates) setDups(e.body.duplicates); });
  }
  return (
    <div style={card}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8 }}>
        <input style={input} placeholder="Business name *" value={f.business_name} onChange={set('business_name')} />
        <input style={input} placeholder="Contact person" value={f.contact_person} onChange={set('contact_person')} />
        <select style={input} value={f.category} onChange={set('category')}>{CATEGORIES.map(function (c) { return <option key={c[0]} value={c[0]}>{c[1]}</option>; })}</select>
        <input style={input} placeholder="State" value={f.state} onChange={set('state')} />
        <input style={input} placeholder="City" value={f.city} onChange={set('city')} />
        <input style={input} placeholder="Business email" value={f.email} onChange={set('email')} />
        <input style={input} placeholder="Business phone" value={f.phone} onChange={set('phone')} />
        <input style={input} placeholder="Website" value={f.website} onChange={set('website')} />
        <input style={input} placeholder="Source URL (where you found this)" value={f.source_url} onChange={set('source_url')} />
      </div>
      <textarea style={Object.assign({}, input, { marginTop: 8 })} rows={2} placeholder="Notes" value={f.notes} onChange={set('notes')} />
      <div style={{ fontSize: '0.74rem', color: '#64748b', margin: '8px 0' }}>Record where the contact details were publicly listed. Contacting a prospect is only possible when the permission rules allow it.</div>
      <Msg m={msg} />
      {dups && <div style={{ fontSize: '0.8rem', color: '#92400e' }}>Possible existing prospect(s): {dups.map(function (d) { return d.reasons.join(', '); }).join(' | ')}. Open the existing record instead of adding a duplicate.</div>}
      <button style={btn} onClick={save}>Save prospect</button> <button style={btnGhost} onClick={onCancel}>Cancel</button>
    </div>
  );
}

function ProspectPanel({ id, api, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState(null);
  const [gate, setGate] = useState(null);
  const [consent, setConsent] = useState({ channel: 'email', event: 'granted', basis: 'explicit_opt_in', source: '', evidence: '' });
  const [newContact, setNewContact] = useState({ channel: 'email', value: '', label: '' });
  const load = useCallback(function () { api('/outreach/prospects/' + id).then(setD).catch(function (e) { setMsg({ text: e.message }); }); }, [api, id]);
  useEffect(load, [load]);
  if (!d) return <div style={card}>{msg ? <Msg m={msg} /> : 'Loading...'}</div>;
  const p = d.prospect;
  const run = (promise, okText) => promise.then(function () { setMsg({ ok: true, text: okText }); load(); onChanged(); }).catch(function (e) { setMsg({ text: e.message }); });
  function checkSend(channel) { setGate(null); api('/outreach/prospects/' + id + '/can-send?channel=' + channel).then(setGate).catch(function (e) { setMsg({ text: e.message }); }); }
  return (
    <div style={Object.assign({}, card, { borderColor: GREEN })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800, color: NAVY, fontSize: '1rem' }}>{p.name}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{[p.category && p.category.replace(/_/g, ' '), [p.city, p.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</div>
          {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: GREEN }}>{p.website_domain || p.website}</a>}
          {p.source_url && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Source: <a href={p.source_url} target="_blank" rel="noopener noreferrer" style={{ color: GREEN }}>{p.source_url}</a></div>}
        </div>
        <button style={btnGhost} onClick={onClose}>Close</button>
      </div>
      <div style={{ margin: '8px 0' }}>
        <Badge color={NAVY}>{STAGE_LABEL[p.stage] || p.stage}</Badge>
        <Badge color={p.email_permission === 'granted' ? GREEN : '#64748b'}>email consent: {p.email_permission}</Badge>
        <Badge color={p.whatsapp_permission === 'granted' ? GREEN : '#64748b'}>WhatsApp opt-in: {p.whatsapp_permission}</Badge>
        {p.effective_email_permission === 'legitimate_interest' && <Badge color="#b45309">email via legitimate interest</Badge>}
        {p.do_not_contact && <Badge color="#b91c1c">do not contact</Badge>}
        <Badge color="#64748b">emails sent without reply: {p.email_attempts}</Badge>
      </div>
      <Msg m={msg} />

      <div style={{ fontWeight: 700, margin: '10px 0 4px' }}>Pipeline stage</div>
      {['applied', 'approved', 'subscribed'].includes(p.stage) ? <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Follows the agent's real GetHome account.</div> : (
        <select style={Object.assign({}, input, { maxWidth: 260 })} value={p.stage} onChange={function (e) { run(api('/outreach/prospects/' + id, 'PATCH', { stage: e.target.value }), 'Stage updated'); }}>
          {MANUAL_STAGES.map(function (s) { return <option key={s} value={s}>{STAGE_LABEL[s]}</option>; })}
        </select>
      )}

      <div style={{ fontWeight: 700, margin: '12px 0 4px' }}>Contacts</div>
      {d.contacts.map(function (c) {
        return (
          <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.82rem', padding: '4px 0', flexWrap: 'wrap' }}>
            <span style={{ minWidth: 60, color: '#64748b' }}>{c.channel}</span><strong>{c.value}</strong>
            {c.label && <span style={{ color: '#64748b' }}>{c.label}</span>}
            {c.is_role_address && <Badge>role address</Badge>}
            <select style={Object.assign({}, input, { width: 'auto' })} value={c.verification_status} disabled={c.verification_status === 'bounced'}
              onChange={function (e) { run(api('/outreach/contacts/' + c.id, 'PATCH', { verification_status: e.target.value }), 'Contact updated'); }}>
              {['unverified', 'format_valid', 'verified', 'invalid'].concat(c.verification_status === 'bounced' ? ['bounced'] : []).map(function (s) { return <option key={s} value={s}>{s.replace('_', ' ')}</option>; })}
            </select>
          </div>
        );
      })}
      {!d.contacts.length && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No contacts yet.</div>}
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        <select style={Object.assign({}, input, { width: 'auto' })} value={newContact.channel} onChange={function (e) { setNewContact(Object.assign({}, newContact, { channel: e.target.value })); }}><option value="email">email</option><option value="phone">phone</option><option value="whatsapp">whatsapp</option></select>
        <input style={Object.assign({}, input, { flex: 1, minWidth: 160 })} placeholder="Add contact" value={newContact.value} onChange={function (e) { setNewContact(Object.assign({}, newContact, { value: e.target.value })); }} />
        <button style={btnSec} onClick={function () { run(api('/outreach/prospects/' + id + '/contacts', 'POST', newContact), 'Contact added').then(function () { setNewContact(Object.assign({}, newContact, { value: '' })); }); }}>Add</button>
      </div>

      <div style={{ fontWeight: 700, margin: '14px 0 4px' }}>Can we message this prospect?</div>
      <button style={btnSec} onClick={function () { checkSend('email'); }}>Check email</button> <button style={btnSec} onClick={function () { checkSend('whatsapp'); }}>Check WhatsApp</button>
      {gate && (
        <div style={{ marginTop: 8, fontSize: '0.82rem' }}>
          {gate.results.map(function (r, i) {
            return <div key={i} style={{ color: r.ok ? GREEN : '#b91c1c' }}>{r.value ? r.value + ': ' : ''}{r.ok ? 'Allowed (' + String(r.basis).replace(/_/g, ' ') + ')' : 'Blocked. ' + (REASONS[r.reason] || r.reason)}</div>;
          })}
        </div>
      )}

      <div style={{ fontWeight: 700, margin: '14px 0 4px' }}>Consent record</div>
      {d.consent.map(function (c) { return <div key={c.id} style={{ fontSize: '0.78rem', color: '#334155' }}>{fmtDate(c.occurred_at)} · {c.channel} · <strong>{c.event}</strong> · {c.basis.replace(/_/g, ' ')} · {c.source} · by {c.recorded_by}{c.evidence ? ' · "' + c.evidence + '"' : ''}</div>; })}
      {!d.consent.length && <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No explicit consent recorded.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 6, marginTop: 8 }}>
        <select style={input} value={consent.channel} onChange={function (e) { setConsent(Object.assign({}, consent, { channel: e.target.value })); }}><option value="email">email</option><option value="whatsapp">whatsapp</option></select>
        <select style={input} value={consent.event} onChange={function (e) { setConsent(Object.assign({}, consent, { event: e.target.value, basis: e.target.value === 'granted' ? 'explicit_opt_in' : 'withdrawn_by_prospect' })); }}><option value="granted">granted</option><option value="withdrawn">withdrawn</option></select>
        <select style={input} value={consent.basis} onChange={function (e) { setConsent(Object.assign({}, consent, { basis: e.target.value })); }}>
          {(consent.event === 'granted' ? ['explicit_opt_in', 'prospect_requested', 'existing_relationship', 'referred_with_consent', 'imported_attested'] : ['withdrawn_by_prospect', 'withdrawn_by_admin']).map(function (b) { return <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>; })}
        </select>
        <input style={input} placeholder="Source (form, call, message)" value={consent.source} onChange={function (e) { setConsent(Object.assign({}, consent, { source: e.target.value })); }} />
        <input style={input} placeholder={consent.event === 'granted' ? 'Evidence (required)' : 'Note'} value={consent.evidence} onChange={function (e) { setConsent(Object.assign({}, consent, { evidence: e.target.value })); }} />
      </div>
      <button style={Object.assign({}, btn, { marginTop: 6 })} onClick={function () { run(api('/outreach/consent', 'POST', Object.assign({ prospect_id: id }, consent)), 'Consent event recorded'); }}>Record</button>

      <div style={{ fontWeight: 700, margin: '14px 0 4px' }}>Where this came from</div>
      {d.sources.map(function (s) { return <div key={s.id} style={{ fontSize: '0.78rem', color: '#334155' }}>{fmtDate(s.retrieved_at)} · {s.adapter}{s.source_url ? ' · ' + s.source_url : ''}</div>; })}
      <div style={{ fontWeight: 700, margin: '14px 0 4px' }}>Activity</div>
      {d.activity.slice(0, 8).map(function (a) { return <div key={a.id} style={{ fontSize: '0.76rem', color: '#64748b' }}>{fmtDate(a.created_at)} · {a.activity.replace(/_/g, ' ')} · {a.actor}</div>; })}
    </div>
  );
}

function Prospects({ api, openId, setOpenId }) {
  const [list, setList] = useState({ prospects: [], total: 0 });
  const [f, setF] = useState({ q: '', state: '', stage: '' });
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState(null);
  const load = useCallback(function () {
    const qs = Object.keys(f).filter(function (k) { return f[k]; }).map(function (k) { return k + '=' + encodeURIComponent(f[k]); }).join('&');
    api('/outreach/prospects?limit=100' + (qs ? '&' + qs : '')).then(setList).catch(function (e) { setMsg({ text: e.message }); });
  }, [api, f]);
  useEffect(load, [load]);
  function exportCsv() {
    api('/outreach/export.csv', 'GET', null, true).then(function (blob) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gethome-prospects.csv'; document.body.appendChild(a); a.click(); a.remove();
    }).catch(function (e) { setMsg({ text: e.message }); });
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <input style={Object.assign({}, input, { maxWidth: 220 })} placeholder="Search name, email, phone, site" value={f.q} onChange={function (e) { setF(Object.assign({}, f, { q: e.target.value })); }} />
        <input style={Object.assign({}, input, { maxWidth: 140 })} placeholder="State" value={f.state} onChange={function (e) { setF(Object.assign({}, f, { state: e.target.value })); }} />
        <select style={Object.assign({}, input, { maxWidth: 200 })} value={f.stage} onChange={function (e) { setF(Object.assign({}, f, { stage: e.target.value })); }}><option value="">All stages</option>{STAGES.map(function (s) { return <option key={s} value={s}>{STAGE_LABEL[s]}</option>; })}</select>
        <button style={btn} onClick={function () { setAdding(!adding); }}>{adding ? 'Cancel' : 'Add prospect'}</button>
        <button style={btnSec} onClick={exportCsv}>Export CSV</button>
      </div>
      <Msg m={msg} />
      {adding && <ProspectForm api={api} onCancel={function () { setAdding(false); }} onDone={function (p) { setAdding(false); setOpenId(p.id); load(); }} />}
      {openId && <ProspectPanel id={openId} api={api} onClose={function () { setOpenId(null); }} onChanged={load} />}
      <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>{list.total} prospect{list.total === 1 ? '' : 's'}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.82rem' }}>
          <thead><tr>{['Business', 'Category', 'Location', 'Contacts', 'Permission', 'Stage', 'Found'].map(function (h) { return <th key={h} style={{ textAlign: 'left', padding: 6, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>; })}</tr></thead>
          <tbody>
            {list.prospects.map(function (p) {
              return (
                <tr key={p.id} onClick={function () { setOpenId(p.id); }} style={{ cursor: 'pointer', backgroundColor: openId === p.id ? '#f0fff4' : 'transparent' }}>
                  <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: NAVY }}>{p.name}{p.do_not_contact && <Badge color="#b91c1c">DNC</Badge>}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>{(p.category || '').replace(/_/g, ' ')}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>{[p.city, p.state].filter(Boolean).join(', ')}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>{p.contacts.length} {p.contacts.some(function (c) { return c.verification_status === 'verified'; }) && <Badge color={GREEN}>verified</Badge>}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>{p.effective_email_permission === 'consent' ? <Badge color={GREEN}>consent</Badge> : p.effective_email_permission === 'legitimate_interest' ? <Badge color="#b45309">legit. interest</Badge> : <Badge>none</Badge>}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>{STAGE_LABEL[p.stage] || p.stage}</td>
                  <td style={{ padding: 6, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{fmtDate(p.discovered_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.prospects.length && <div style={{ padding: 12, color: '#94a3b8' }}>No prospects yet.</div>}
      </div>
    </div>
  );
}

function Duplicates({ api, onOpen }) {
  const [groups, setGroups] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = useCallback(function () { api('/outreach/duplicates').then(function (j) { setGroups(j.groups); }).catch(function (e) { setMsg({ text: e.message }); }); }, [api]);
  useEffect(load, [load]);
  function merge(keep, remove) {
    if (!window.confirm('Merge these two records? The second one is removed; contacts, consent history and messages move to the first.')) return;
    api('/outreach/prospects/merge', 'POST', { keep_id: keep, remove_id: remove }).then(function () { setMsg({ ok: true, text: 'Merged' }); load(); }).catch(function (e) { setMsg({ text: e.message }); });
  }
  if (!groups) return <div>{msg ? <Msg m={msg} /> : 'Loading...'}</div>;
  return (
    <div>
      <Msg m={msg} />
      {!groups.length && <div style={card}>No likely duplicates found.</div>}
      {groups.map(function (g, i) {
        return (
          <div key={i} style={card}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{g.reason}: {g.key}</div>
            {g.prospects.map(function (p, j) {
              return (
                <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.82rem', padding: '3px 0', flexWrap: 'wrap' }}>
                  <a href="#open" onClick={function (e) { e.preventDefault(); onOpen(p.id); }} style={{ color: NAVY, fontWeight: 700 }}>{p.name}</a>
                  <span style={{ color: '#64748b' }}>{[p.city, p.state].filter(Boolean).join(', ')} · {STAGE_LABEL[p.stage] || p.stage}</span>
                  {j > 0 && <button style={btnSec} onClick={function () { merge(g.prospects[0].id, p.id); }}>Merge into "{g.prospects[0].name}"</button>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function Compliance({ api }) {
  const [settings, setSettings] = useState(null);
  const [ack, setAck] = useState(null);
  const [sup, setSup] = useState({ total: 0, suppressions: [] });
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState(null);
  const load = useCallback(function () {
    api('/outreach/settings').then(function (j) { setSettings(j.settings); setAck(j.legitimate_interest_acknowledgement); }).catch(function (e) { setMsg({ text: e.message }); });
    api('/outreach/suppressions?limit=50').then(setSup).catch(function () { /* admin only */ });
  }, [api]);
  useEffect(load, [load]);
  if (!settings) return <div>{msg ? <Msg m={msg} /> : 'Loading...'}</div>;
  const save = (patch, okText) => api('/outreach/settings', 'PATCH', patch).then(function () { setMsg({ ok: true, text: okText || 'Saved' }); load(); }).catch(function (e) { setMsg({ text: e.message }); });
  const num = (k, label) => (
    <label style={{ fontSize: '0.8rem', display: 'block' }}>{label}
      <input type="number" style={input} defaultValue={settings[k]} onBlur={function (e) { const v = parseInt(e.target.value, 10); if (v !== settings[k] && !isNaN(v)) { const p = {}; p[k] = v; save(p); } }} />
    </label>
  );
  return (
    <div>
      <Msg m={msg} />
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 6 }}>Legitimate-interest B2B email</div>
        <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: 8 }}>
          When ON, a first business-to-business email may be sent to a publicly listed business contact without prior consent, always with an unsubscribe link, and never more than {settings.max_email_attempts} unanswered attempts. WhatsApp is never covered by this: it always needs a recorded opt-in. Turn this on only after the Legitimate Interest Assessment has been completed and signed off.
        </div>
        <Badge color={settings.li_b2b_email_enabled ? GREEN : '#64748b'}>{settings.li_b2b_email_enabled ? 'ON' : 'OFF'}</Badge>
        {ack && <span style={{ fontSize: '0.74rem', color: '#64748b' }}>acknowledged by {ack.by} on {fmtDate(ack.at)}: "{ack.note}"</span>}
        {settings.li_b2b_email_enabled ? (
          <div style={{ marginTop: 8 }}><button style={btnGhost} onClick={function () { save({ li_b2b_email_enabled: false }, 'Legitimate-interest email switched off'); }}>Switch off</button></div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <input style={input} placeholder="Note: who completed the assessment and when (required)" value={note} onChange={function (e) { setNote(e.target.value); }} />
            <button style={Object.assign({}, btn, { marginTop: 6 })} onClick={function () { save({ li_b2b_email_enabled: true, acknowledge_lia: true, lia_note: note }, 'Legitimate-interest email switched on'); }}>I confirm the assessment is complete: switch on</button>
          </div>
        )}
      </div>
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 8 }}>Limits</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
          {num('max_email_attempts', 'Max unanswered emails per prospect')}
          {num('max_whatsapp_attempts', 'Max unanswered WhatsApp messages')}
          {num('daily_discovery_limit', 'Daily discovery limit')}
          {num('daily_email_limit', 'Daily email limit')}
          {num('retention_days_unengaged', 'Keep never-contacted prospects (days)')}
        </div>
        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 8 }}>Replies go to {settings.reply_to_email}; sender name "{settings.email_sender_name}".</div>
      </div>
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 6 }}>Suppression list ({sup.total})</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input style={input} placeholder="Email or phone to never contact" value={value} onChange={function (e) { setValue(e.target.value); }} />
          <button style={btn} onClick={function () { api('/outreach/suppressions', 'POST', { value: value }).then(function () { setValue(''); setMsg({ ok: true, text: 'Added' }); load(); }).catch(function (e) { setMsg({ text: e.message }); }); }}>Add</button>
        </div>
        {sup.suppressions.map(function (s) { return <div key={s.value} style={{ fontSize: '0.78rem', color: '#334155' }}>{s.value} · {s.reason} · {fmtDate(s.created_at)}</div>; })}
      </div>
    </div>
  );
}

function AuditLog({ api }) {
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(function () { api('/outreach/audit-log?limit=100').then(function (j) { setRows(j.entries); }).catch(function (e) { setMsg({ text: e.message }); }); }, [api]);
  if (!rows) return <div>{msg ? <Msg m={msg} /> : 'Loading...'}</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem' }}>
        <thead><tr>{['When', 'Who', 'Role', 'Action', 'Entity'].map(function (h) { return <th key={h} style={{ textAlign: 'left', padding: 6, borderBottom: '2px solid #e2e8f0' }}>{h}</th>; })}</tr></thead>
        <tbody>{rows.map(function (r) { return <tr key={r.id}><td style={{ padding: 6, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td><td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>{r.actor}</td><td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>{r.actor_role}</td><td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>{r.action}</td><td style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>{r.entity}</td></tr>; })}</tbody>
      </table>
      {!rows.length && <div style={{ padding: 12, color: '#94a3b8' }}>No activity yet.</div>}
    </div>
  );
}

export default function OutreachCommandCentre() {
  const api = useApi();
  const [view, setView] = useState('pipeline');
  const [openId, setOpenId] = useState(null);
  const tabs = [['pipeline', 'Pipeline'], ['prospects', 'Prospects'], ['duplicates', 'Duplicates'], ['compliance', 'Permissions & Limits'], ['audit', 'Audit log']];
  return (
    <div>
      <div style={{ fontWeight: 800, color: NAVY, fontSize: '1.1rem', marginBottom: 4 }}>Outreach Command Centre</div>
      <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 12 }}>Agent and agency recruitment. Figures come straight from the database.</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map(function (t) {
          const active = view === t[0];
          return <button key={t[0]} onClick={function () { setView(t[0]); }} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', backgroundColor: active ? NAVY : '#f1f5f9', color: active ? '#fff' : '#334155' }}>{t[1]}</button>;
        })}
      </div>
      {view === 'pipeline' && <div>{openId && <ProspectPanel id={openId} api={api} onClose={function () { setOpenId(null); }} onChanged={function () { /* refreshed on reopen */ }} />}<Pipeline api={api} onOpen={setOpenId} /></div>}
      {view === 'prospects' && <Prospects api={api} openId={openId} setOpenId={setOpenId} />}
      {view === 'duplicates' && <Duplicates api={api} onOpen={function (id) { setOpenId(id); setView('prospects'); }} />}
      {view === 'compliance' && <Compliance api={api} />}
      {view === 'audit' && <AuditLog api={api} />}
    </div>
  );
}
