import { useEffect, useState, useCallback, useRef } from 'react';
import { GREEN, NAVY, card, input, btn, btnSec, btnGhost, useApi, fmtDate, parseCsv, money } from './shared';
import { Badge, Msg, StateSelect, Field, Section, ImagePicker } from './widgets';

// Outreach Command Centre phases 2-8: dashboard, discovery, campaigns, review & send, replies, setup.
// Every figure is read from the backend; the server enforces permission, limits and role rules.

const Grid = ({ children, min }) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(' + (min || 150) + 'px,1fr))', gap: 8, marginBottom: 14 }}>{children}</div>;
const Stat = ({ label, value, hint }) => (
  <div style={{ background: '#f4f5f7', borderRadius: 10, padding: 10 }}>
    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: NAVY }}>{value == null ? 'n/a' : value}</div>
    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{label}</div>
    {hint && <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>{hint}</div>}
  </div>
);
const Table = ({ title, rows, cols }) => (
  <div style={{ marginBottom: 14, overflowX: 'auto' }}>
    {title && <div style={{ fontWeight: 800, color: NAVY, margin: '6px 0' }}>{title}</div>}
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem' }}>
      <thead><tr>{cols.map(function (c) { return <th key={c[0]} style={{ textAlign: 'left', padding: 6, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{c[0]}</th>; })}</tr></thead>
      <tbody>{rows.map(function (r, i) { return <tr key={i}>{cols.map(function (c) { const v = c[1](r); return <td key={c[0]} style={{ padding: 6, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{v == null ? '' : String(v)}</td>; })}</tr>; })}</tbody>
    </table>
    {!rows.length && <div style={{ padding: 8, color: '#94a3b8', fontSize: '0.8rem' }}>No data yet.</div>}
  </div>
);
// Date helper kept outside components (it reads the clock).
function rangeFor(days) { const to = new Date(); const from = new Date(to.getTime() - days * 86400000); return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }; }
const pct = (v) => (v == null ? 'n/a' : v + '%');

// ===================== Dashboard (phase 8) =====================
export function Dashboard() {
  const api = useApi();
  const [days, setDays] = useState(30);
  const [state, setState] = useState('');
  const [campaign, setCampaign] = useState('');
  const [camps, setCamps] = useState([]);
  const [a, setA] = useState(null);
  const [gha, setGha] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(function () { api('/outreach/campaigns').then(setCamps).catch(function () { /* optional */ }); }, [api]);
  const load = useCallback(function () {
    const { from, to } = rangeFor(days);
    const qs = '?from=' + from + '&to=' + to + (state ? '&state=' + encodeURIComponent(state) : '') + (campaign ? '&campaign_id=' + campaign : '');
    api('/outreach/analytics' + qs).then(function (j) { setA(j); setMsg(null); }).catch(function (e) { setMsg({ text: e.message }); });
    api('/outreach/gha-performance').then(setGha).catch(function () { setGha(null); });
  }, [api, days, state, campaign]);
  useEffect(load, [load]);
  function download(name) {
    const { from, to } = rangeFor(days);
    api('/outreach/reports/' + name + '.csv?from=' + from + '&to=' + to + (state ? '&state=' + encodeURIComponent(state) : ''), 'GET', null, true).then(function (b) {
      const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'outreach-' + name + '.csv'; document.body.appendChild(l); l.click(); l.remove();
    }).catch(function (e) { setMsg({ text: e.message }); });
  }
  const t = a && a.totals;
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        {[7, 30, 90].map(function (d) { return <button key={d} style={d === days ? btnSec : btnGhost} onClick={function () { setDays(d); }}>{d} days</button>; })}
        <StateSelect style={{ maxWidth: 170 }} value={state} onChange={setState} />
        <select style={Object.assign({}, input, { maxWidth: 220 })} value={campaign} onChange={function (e) { setCampaign(e.target.value); }}><option value="">All campaigns</option>{camps.map(function (c) { return <option key={c.id} value={c.id}>{c.name}</option>; })}</select>
        <button style={btn} onClick={function () { api('/outreach/conversions/sync', 'POST').then(function (r) { setMsg({ ok: true, text: 'Synced: ' + r.linked + ' linked, ' + r.registered + ' new registrations, ' + r.subscribed_payments + ' verified payments' }); load(); }).catch(function (e) { setMsg({ text: e.message }); }); }}>Sync registrations & payments</button>
      </div>
      <Msg m={msg} />
      {!t && !msg && <div style={{ color: '#64748b' }}>Loading...</div>}
      {t && (
        <div>
          <Grid>
            <Stat label="Prospects discovered" value={t.prospects_discovered} /><Stat label="Qualified" value={t.qualified} />
            <Stat label="With verified contact" value={t.with_verified_contact} hint={t.with_domain_checked_email + ' email domains checked'} />
            <Stat label="With marketing permission" value={t.with_explicit_permission} hint="explicit consent only" />
            <Stat label="Campaigns prepared" value={t.campaigns_prepared} /><Stat label="Emails sent" value={t.emails_sent} hint={t.emails_delivered + ' delivered, ' + t.emails_bounced + ' bounced'} />
            <Stat label="WhatsApp sent" value={t.whatsapp_sent} hint={t.whatsapp_delivered + ' delivered'} />
            <Stat label="Replies received" value={t.replies_received} hint={pct(a.rates.reply_rate_pct) + ' of contacted replied'} />
            <Stat label="Interested prospects" value={t.interested_prospects} /><Stat label="Registered agents" value={t.registered_agents} />
            <Stat label="Paying agents" value={t.paying_agents} hint="verified payments only" /><Stat label="Subscription revenue" value={money(t.subscription_revenue_ngn)} />
          </Grid>
          <Table title="By campaign" rows={a.by_campaign} cols={[['Campaign', (r) => r.label], ['Contacted', (r) => r.contacted], ['Delivered', (r) => r.delivered], ['Replies', (r) => r.replies], ['Interested', (r) => r.interested], ['Registered', (r) => r.registered], ['Paying', (r) => r.paying], ['Revenue', (r) => money(r.revenue_ngn)], ['Contacted to registered', (r) => pct(r.contacted_to_registered_pct)]]} />
          <Table title="By location" rows={a.by_state} cols={[['State', (r) => r.label], ['Discovered', (r) => r.discovered], ['Contacted', (r) => r.contacted], ['Replies', (r) => r.replies], ['Registered', (r) => r.registered], ['Paying', (r) => r.paying], ['Revenue', (r) => money(r.revenue_ngn)], ['Contacted to registered', (r) => pct(r.contacted_to_registered_pct)]]} />
          <Table title="By channel (first message sent)" rows={a.by_channel} cols={[['Channel', (r) => r.label], ['Contacted', (r) => r.contacted], ['Delivered', (r) => r.delivered], ['Replies', (r) => r.replies], ['Registered', (r) => r.registered], ['Paying', (r) => r.paying], ['Revenue', (r) => money(r.revenue_ngn)]]} />
          {gha && <Table title={'GHA recruitment (' + gha.month + ')'} rows={gha.ghas} cols={[['GHA', (r) => (r.name || '') + ' ' + (r.gha_code || '')], ['Recruited via outreach', (r) => r.outreach_recruited], ['Approved', (r) => r.outreach_approved], ['Paying', (r) => r.outreach_paying_all_time], ['Value (this month)', (r) => money(r.outreach_subscription_value_month_ngn)], ['Subscribing (all sources)', (r) => r.subscribing_agents_month_all_sources + '/' + r.monthly_target], ['Salary earned', (r) => money(r.salary_earned_ngn)], ['SA commission recorded', (r) => money(r.sa_commission_recorded_on_outreach_agents_ngn)]]} />}
          {gha && <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 10 }}>{gha.note}</div>}
          <div style={{ marginBottom: 8 }}>{['campaigns', 'states', 'channels', 'messages'].map(function (n) { return <button key={n} style={Object.assign({}, btnSec, { marginRight: 6 })} onClick={function () { download(n); }}>Download {n} CSV</button>; })}</div>
          {a.notes.map(function (n, i) { return <div key={i} style={{ fontSize: '0.72rem', color: '#64748b' }}>{n}</div>; })}
        </div>
      )}
    </div>
  );
}

// ===================== Discovery (phase 2) =====================
const SOURCE_NAMES = { web: 'Web search', website: 'My website list', osm: 'OpenStreetMap' };
export function Discovery({ go }) {
  const api = useApi();
  const [adapters, setAdapters] = useState([]);
  const [jobs, setJobs] = useState({ jobs: [], daily: null });
  const [f, setF] = useState({ adapter: 'web', state: '', city: '', target: 'agency', limit: 50, urls: '' });
  const [csv, setCsv] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);
  const stop = useRef(false);
  const load = useCallback(function () {
    api('/outreach/discovery/adapters').then(setAdapters).catch(function (e) { setMsg({ text: e.message }); });
    api('/outreach/discovery/jobs').then(setJobs).catch(function () { /* admin only */ });
  }, [api]);
  useEffect(load, [load]);
  useEffect(function () { return function () { stop.current = true; }; }, []);
  const set = (k) => (e) => setF(Object.assign({}, f, { [k]: e.target.value }));

  // Runs a job round after round until the source has nothing more, the limit is reached or Stop is pressed.
  async function runJob(id) {
    stop.current = false; setBusy(true); setAdded(0);
    const total = { found: 0, inserted: 0, duplicates: 0 };
    try {
      for (let round = 1; round <= 15; round++) {
        setMsg({ ok: true, text: 'Searching... added ' + total.inserted + ' so far. Each round can take a minute or two.' });
        const r = await api('/outreach/discovery/jobs/' + id + '/run', 'POST');
        total.found += r.found; total.inserted += r.inserted; total.duplicates += r.duplicates; setAdded(total.inserted);
        load();
        if (r.done || stop.current) break;
      }
      setMsg({ ok: true, text: 'Finished. Found ' + total.found + ', added ' + total.inserted + ' new, ' + total.duplicates + ' already in your list.' });
    } catch (e) {
      setMsg({ text: e.message + (total.inserted ? ' (' + total.inserted + ' were added before this)' : '') });
    }
    setBusy(false); load();
  }
  async function find() {
    setMsg(null);
    if (f.adapter !== 'website' && !f.state) { setMsg({ text: 'Choose a state first.' }); return; }
    const body = { adapter: f.adapter, state: f.state, city: f.city, target: f.target, limit: Number(f.limit) || 50 };
    if (f.adapter === 'website') body.urls = f.urls.split(/\s+/).map(function (u) { return u.trim(); }).filter(Boolean);
    try { const job = await api('/outreach/discovery/jobs', 'POST', body); await runJob(job.id); }
    catch (e) { setMsg({ text: e.message }); }
  }
  function importCsv() {
    const rows = parseCsv(csv); if (!rows.length) { setMsg({ text: 'Nothing to import' }); return; }
    api('/outreach/discovery/import', 'POST', { rows: rows }).then(function (r) { setMsg({ ok: true, text: 'Imported ' + r.inserted + ', merged ' + r.duplicates + ' duplicates, rejected ' + r.invalid + (r.errors.length ? ': ' + r.errors.slice(0, 4).map(function (e) { return 'row ' + e.row + ' ' + e.error; }).join('; ') : '') }); setCsv(''); load(); }).catch(function (e) { setMsg({ text: e.message }); });
  }
  const d = jobs.daily;
  const chosen = adapters.filter(function (a) { return a.id === f.adapter; })[0];
  const unfinished = jobs.jobs.filter(function (j) { return ['queued', 'running'].includes(j.status); });
  return (
    <div>
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 8 }}>Find agencies and agents</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8 }}>
          <Field label="Search method"><select style={input} value={f.adapter} onChange={set('adapter')}>{adapters.filter(function (a) { return a.id !== 'provider'; }).map(function (a) { return <option key={a.id} value={a.id}>{a.label}</option>; })}</select></Field>
          <Field label="State or region"><StateSelect any="Choose a state" value={f.state} onChange={function (v) { setF(Object.assign({}, f, { state: v })); }} /></Field>
          <Field label="City (optional)"><input style={input} value={f.city} onChange={set('city')} /></Field>
          <Field label="Looking for"><select style={input} value={f.target} onChange={set('target')}><option value="agency">Agencies</option><option value="agent">Independent agents</option><option value="both">Both</option></select></Field>
          <Field label="Add up to"><select style={input} value={f.limit} onChange={set('limit')}>{[25, 50, 100, 200].map(function (n) { return <option key={n} value={n}>{n} new prospects</option>; })}</select></Field>
        </div>
        {chosen && <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: 8 }}>{chosen.description} <em style={{ color: '#64748b' }}>{chosen.limits}</em></div>}
        {f.adapter === 'website' && <textarea style={Object.assign({}, input, { marginTop: 8 })} rows={4} placeholder="One agency website per line" value={f.urls} onChange={set('urls')} />}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={btn} disabled={busy} onClick={find}>{busy ? 'Searching...' : 'Find prospects'}</button>
          {busy && <button style={btnGhost} onClick={function () { stop.current = true; }}>Stop after this round</button>}
          {!busy && added > 0 && go && <button style={btnSec} onClick={function () { go('prospects'); }}>See prospects</button>}
        </div>
        <Msg m={msg} />
        {d && <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 6 }}>Today: {d.used} of {d.limit} added ({d.remaining} left). Change the limit in Settings.</div>}
      </div>

      {!busy && unfinished.map(function (j) {
        return <div key={j.id} style={{ marginBottom: 6 }}><button style={btnSec} onClick={function () { runJob(j.id); }}>Continue: {SOURCE_NAMES[j.adapter] || j.adapter} {[j.city, j.state].filter(Boolean).join(', ')}</button> <button style={btnGhost} onClick={function () { api('/outreach/discovery/jobs/' + j.id + '/cancel', 'POST').then(load); }}>Cancel</button></div>;
      })}

      <Section title="Past searches" hint={jobs.jobs.length + ' shown'}>
        <Table rows={jobs.jobs} cols={[['Method', (r) => SOURCE_NAMES[r.adapter] || r.adapter], ['Where', (r) => [r.city, r.state].filter(Boolean).join(', ')], ['Status', (r) => r.status], ['Found', (r) => r.found_count], ['Added', (r) => r.inserted_count], ['Already had', (r) => r.duplicate_count], ['When', (r) => fmtDate(r.created_at)], ['Notes', (r) => r.error || '']]} />
      </Section>
      <Section title="Import a list you already have (CSV)">
        <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: 6 }}>Header row with: business_name, contact_person, category, state, city, email, phone, website, source_url, notes. Duplicates are merged, not re-added. Only import lists you are entitled to use.</div>
        <textarea style={Object.assign({}, input, { fontFamily: 'monospace' })} rows={5} value={csv} onChange={function (e) { setCsv(e.target.value); }} placeholder={'business_name,email,phone,state,city,source_url\nPrime Haven,info@primehaven.ng,08031234567,Lagos,Ikeja,https://primehaven.ng/contact'} />
        <button style={Object.assign({}, btn, { marginTop: 6 })} onClick={importCsv}>Import</button>
      </Section>
    </div>
  );
}

// ===================== Campaigns, templates, sequences (phases 3, 4, 6) =====================
export function Campaigns() {
  const api = useApi();
  const [camps, setCamps] = useState([]); const [seqs, setSeqs] = useState([]); const [tpls, setTpls] = useState([]);
  const [msg, setMsg] = useState(null);
  const [nc, setNc] = useState({ name: '', sequence_id: '', daily_send_limit: '', approval_required: true });
  const [ns, setNs] = useState({ name: '', t1: '', t2: '', d2: 3, t3: '', d3: 4 });
  const [enrol, setEnrol] = useState({});
  const load = useCallback(function () {
    api('/outreach/campaigns').then(setCamps).catch(function (e) { setMsg({ text: e.message }); });
    api('/outreach/sequences').then(setSeqs).catch(function () { /* */ });
    api('/outreach/templates').then(setTpls).catch(function () { /* */ });
  }, [api]);
  useEffect(load, [load]);
  const act = (p, okText) => p.then(function (r) { setMsg({ ok: true, text: typeof okText === 'function' ? okText(r) : okText }); load(); }).catch(function (e) { setMsg({ text: e.message }); });
  function createSeq() {
    const steps = [{ channel: 'email', template_id: ns.t1, delay_days: 0 }];
    if (ns.t2) steps.push({ channel: 'email', template_id: ns.t2, delay_days: Number(ns.d2) });
    if (ns.t3) steps.push({ channel: 'email', template_id: ns.t3, delay_days: Number(ns.d3) });
    act(api('/outreach/sequences', 'POST', { name: ns.name, steps: steps }), 'Sequence created');
  }
  const emailTpls = tpls.filter(function (t) { return t.channel === 'email'; });
  return (
    <div>
      <Msg m={msg} />
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 6 }}>Run everything due</div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>Prepares due follow-ups for active campaigns, then sends the approved emails within your limits. Nothing runs unattended: press this when you want sending to happen.</div>
        <button style={btn} onClick={function () { act(api('/outreach/run-cycle', 'POST', {}), function (r) { return 'Prepared ' + r.prepared + ', stopped ' + r.sequences_stopped + ' sequences. Sent ' + r.sending.sent + ', blocked ' + r.sending.blocked + ', failed ' + r.sending.failed + (r.sending.stopped_reason ? ' (stopped: ' + r.sending.stopped_reason + ')' : '') + '.'; }); }}>Run cycle now</button>
      </div>
      <Table title="Campaigns" rows={camps} cols={[['Name', (r) => r.name], ['Status', (r) => r.status], ['Approval', (r) => (r.approval_required ? 'required' : 'auto')], ['Enrolled', (r) => Object.keys(r.enrollments || {}).map(function (k) { return k + ' ' + r.enrollments[k]; }).join(', ')], ['Messages', (r) => Object.keys(r.messages || {}).map(function (k) { return k + ' ' + r.messages[k]; }).join(', ')]]} />
      {camps.filter(function (c) { return c.status !== 'stopped'; }).map(function (c) {
        const e = enrol[c.id] || { state: '', limit: 50 };
        return (
          <div key={c.id} style={card}>
            <div style={{ fontWeight: 700, color: NAVY, marginBottom: 6 }}>{c.name} <Badge color={c.status === 'active' ? GREEN : '#64748b'}>{c.status}</Badge></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {c.status !== 'active' && <button style={btn} onClick={function () { act(api('/outreach/campaigns/' + c.id, 'PATCH', { status: 'active' }), c.status === 'paused' ? 'Resumed' : 'Activated'); }}>{c.status === 'paused' ? 'Resume' : 'Activate'}</button>}
              {c.status === 'active' && <button style={btnSec} onClick={function () { act(api('/outreach/campaigns/' + c.id, 'PATCH', { status: 'paused' }), 'Paused'); }}>Pause</button>}
              <button style={Object.assign({}, btnGhost, { color: '#b91c1c' })} onClick={function () { if (window.confirm('Stop this campaign for good? Unsent messages are cancelled and it cannot be restarted.')) act(api('/outreach/campaigns/' + c.id, 'PATCH', { status: 'stopped' }), 'Stopped'); }}>Stop</button>
              <StateSelect style={{ maxWidth: 160 }} value={e.state} onChange={function (v) { setEnrol(Object.assign({}, enrol, { [c.id]: Object.assign({}, e, { state: v }) })); }} />
              <button style={btnSec} onClick={function () { act(api('/outreach/campaigns/' + c.id + '/enroll', 'POST', { state: e.state || undefined, limit: Number(e.limit) || 50 }), function (r) { return 'Enrolled ' + r.enrolled + '. Skipped: ' + (Object.keys(r.skipped).map(function (k) { return k.replace(/_/g, ' ') + ' ' + r.skipped[k]; }).join(', ') || 'none'); }); }}>Enrol prospects</button>
              {c.status === 'active' && <button style={btnSec} onClick={function () { act(api('/outreach/campaigns/' + c.id + '/prepare', 'POST'), function (r) { return 'Prepared ' + r.prepared + ' messages for review'; }); }}>Prepare messages</button>}
            </div>
          </div>
        );
      })}
      <Section title="New campaign">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8 }}>
          <input style={input} placeholder="Name" value={nc.name} onChange={function (e) { setNc(Object.assign({}, nc, { name: e.target.value })); }} />
          <select style={input} value={nc.sequence_id} onChange={function (e) { setNc(Object.assign({}, nc, { sequence_id: e.target.value })); }}><option value="">Choose a sequence</option>{seqs.map(function (s) { return <option key={s.id} value={s.id}>{s.name}</option>; })}</select>
          <input style={input} type="number" placeholder="Daily send limit (optional)" value={nc.daily_send_limit} onChange={function (e) { setNc(Object.assign({}, nc, { daily_send_limit: e.target.value })); }} />
          <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={nc.approval_required} onChange={function (e) { setNc(Object.assign({}, nc, { approval_required: e.target.checked })); }} /> Require my approval before sending</label>
        </div>
        <button style={Object.assign({}, btn, { marginTop: 8 })} onClick={function () { act(api('/outreach/campaigns', 'POST', Object.assign({}, nc, { daily_send_limit: nc.daily_send_limit || undefined })), 'Campaign created (draft). Enrol prospects, then activate it.'); }}>Create campaign</button>
      </Section>
      <Section title="New follow-up sequence">
        <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: 6 }}>An invitation plus up to two follow-ups. Follow-ups stop automatically on a reply, registration, opt-out or bounce, and never go beyond the attempt limit in Permissions & Limits.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8 }}>
          <input style={input} placeholder="Sequence name" value={ns.name} onChange={function (e) { setNs(Object.assign({}, ns, { name: e.target.value })); }} />
          <select style={input} value={ns.t1} onChange={function (e) { setNs(Object.assign({}, ns, { t1: e.target.value })); }}><option value="">Step 1 template (invitation)</option>{emailTpls.map(function (t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}</select>
          <select style={input} value={ns.t2} onChange={function (e) { setNs(Object.assign({}, ns, { t2: e.target.value })); }}><option value="">Step 2 template (optional)</option>{emailTpls.map(function (t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}</select>
          <input style={input} type="number" min="1" placeholder="Days after step 1" value={ns.d2} onChange={function (e) { setNs(Object.assign({}, ns, { d2: e.target.value })); }} />
        </div>
        <button style={Object.assign({}, btn, { marginTop: 8 })} onClick={createSeq}>Create sequence</button>
      </Section>
      <Templates tpls={tpls} reload={load} />
    </div>
  );
}

function Templates({ tpls, reload }) {
  const api = useApi();
  const [edit, setEdit] = useState({});
  const [msg, setMsg] = useState(null);
  return (
    <Section title="Email templates">
      <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: 6 }}>Placeholders: {'{{contact_name}} {{business_name}} {{city}} {{state}} {{in_location}} {{link}} {{sender_name}}'}. {'{{contact_name}}'} becomes the person's name, or Sir/Madam when none is recorded. The unsubscribe link and sender identity are added automatically to every email.</div>
      <Msg m={msg} />
      {tpls.filter(function (t) { return t.channel === 'email'; }).map(function (t) {
        const cur = edit[t.id];
        return (
          <div key={t.id} style={{ borderTop: '1px solid #f1f5f9', padding: '8px 0' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.name} <Badge>{(t.prospect_type || 'all types').replace(/_/g, ' ')}</Badge></div>
            {cur ? (
              <div>
                <input style={Object.assign({}, input, { margin: '6px 0' })} value={cur.subject} onChange={function (e) { setEdit(Object.assign({}, edit, { [t.id]: Object.assign({}, cur, { subject: e.target.value }) })); }} />
                <textarea style={input} rows={9} value={cur.body} onChange={function (e) { setEdit(Object.assign({}, edit, { [t.id]: Object.assign({}, cur, { body: e.target.value }) })); }} />
                <button style={Object.assign({}, btn, { marginTop: 6 })} onClick={function () { api('/outreach/templates/' + t.id, 'PATCH', cur).then(function () { setMsg({ ok: true, text: 'Saved' }); setEdit(Object.assign({}, edit, { [t.id]: null })); reload(); }).catch(function (e) { setMsg({ text: e.message }); }); }}>Save</button>
              </div>
            ) : <button style={btnGhost} onClick={function () { setEdit(Object.assign({}, edit, { [t.id]: { subject: t.subject, body: t.body } })); }}>View / edit</button>}
          </div>
        );
      })}
    </Section>
  );
}

// ===================== Review & send (phase 4) =====================
const STATUS_NAMES = { pending_approval: 'Pending approval', approved: 'Approved, waiting to send', sent: 'Sent', delivered: 'Delivered', bounced: 'Bounced', replied: 'Replied', cancelled: 'Cancelled', failed: 'Failed' };
const STOP_TEXT = { daily_limit: 'Today\'s email limit is used up. The rest stays queued. You can raise the limit in Settings.', email_not_configured: 'Email sending is not set up on the server.', provider_error: 'The email service rejected several messages in a row, so sending stopped.' };

// Calls the sending pass until nothing more can go out, so one press sends the whole approved queue.
async function sendQueue(api, first, onProgress) {
  const total = { sent: 0, failed: 0, blocked: 0, stopped_reason: null, last_error: null, remaining_today: null };
  let r = first || await api('/outreach/queue/process', 'POST', { max: 50 });
  for (let i = 0; i < 8; i++) {
    total.sent += r.sent; total.failed += r.failed; total.blocked += r.blocked; total.stopped_reason = r.stopped_reason; total.last_error = r.last_error || total.last_error; total.remaining_today = r.remaining_today;
    if (onProgress) onProgress(total);
    if (STOP_TEXT[r.stopped_reason] || (!first && !r.sent) || (i === 7)) break;
    first = null;
    r = await api('/outreach/queue/process', 'POST', { max: 50 });
    if (!r.sent && !r.failed && !r.blocked) { total.stopped_reason = r.stopped_reason; total.last_error = r.last_error || total.last_error; break; }
  }
  return total;
}
const sendSummary = (t) => 'Sent ' + t.sent + (t.failed ? ', failed ' + t.failed : '') + (t.blocked ? ', blocked ' + t.blocked : '') + '.' + (STOP_TEXT[t.stopped_reason] ? ' ' + STOP_TEXT[t.stopped_reason] : '') + (t.last_error ? ' Reason given: ' + t.last_error : '');

export function Review() {
  const api = useApi();
  const [list, setList] = useState([]);
  const [edits, setEdits] = useState({});
  const [msg, setMsg] = useState(null);
  const [status, setStatus] = useState('pending_approval');
  const load = useCallback(function () { api('/outreach/messages?limit=100&status=' + status).then(setList).catch(function (e) { setMsg({ text: e.message }); }); }, [api, status]);
  useEffect(load, [load]);
  const act = (p, t) => p.then(function () { setMsg({ ok: true, text: t }); load(); }).catch(function (e) { setMsg({ text: e.message }); });
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState({});
  // Functional update: the upload finishes later, after the person may have typed in the other fields.
  const setPicture = (m, url) => setEdits(function (all) { return Object.assign({}, all, { [m.id]: Object.assign({}, all[m.id] || { subject: m.subject, body: m.body }, { image_url: url }) }); });
  const anyUploading = Object.values(uploading).some(Boolean);
  function sendNow() {
    setSending(true); setMsg({ ok: true, text: 'Sending...' });
    sendQueue(api, null, function (t) { setMsg({ ok: true, text: 'Sending... ' + t.sent + ' sent so far.' }); })
      .then(function (t) { setMsg({ ok: !t.failed && !STOP_TEXT[t.stopped_reason], text: sendSummary(t) }); load(); })
      .catch(function (e) { setMsg({ text: e.message }); })
      .then(function () { setSending(false); });
  }
  return (
    <div>
      <Msg m={msg} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={Object.assign({}, input, { width: 'auto' })} value={status} onChange={function (e) { setStatus(e.target.value); }}>{Object.keys(STATUS_NAMES).map(function (s) { return <option key={s} value={s}>{STATUS_NAMES[s]}</option>; })}</select>
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{list.length} shown</span>
        {status === 'pending_approval' && list.length > 0 && <button style={btn} disabled={anyUploading} onClick={function () { act(api('/outreach/messages/approve-bulk', 'POST', { ids: list.map(function (m) { return m.id; }) }), 'Approved all shown'); }}>Approve all shown</button>}
        <button style={btnSec} disabled={sending} onClick={sendNow}>{sending ? 'Sending...' : 'Send approved now'}</button>
      </div>
      {!list.length && <div style={card}>Nothing in this list.</div>}
      {list.map(function (m) {
        const ed = edits[m.id] || { subject: m.subject, body: m.body };
        return (
          <div key={m.id} style={card}>
            <div style={{ fontSize: '0.8rem', marginBottom: 4 }}><strong>{m.prospect ? m.prospect.name : 'Prospect'}</strong> · to {m.to || 'n/a'} · step {m.step} · {m.channel} <Badge color={m.generated_by === 'ai' ? '#6d28d9' : '#64748b'}>{m.generated_by}</Badge>{m.consent_basis && <Badge color="#b45309">{m.consent_basis.replace(/_/g, ' ')}</Badge>}</div>
            {m.personalization && m.personalization.ai_rejected && <div style={{ fontSize: '0.72rem', color: '#92400e' }}>AI version rejected ({m.personalization.ai_rejected}); the plain template is shown.</div>}
            {status === 'pending_approval' ? (
              <div>
                {m.channel === 'email' && <input style={Object.assign({}, input, { margin: '6px 0' })} value={ed.subject || ''} onChange={function (e) { setEdits(Object.assign({}, edits, { [m.id]: Object.assign({}, ed, { subject: e.target.value }) })); }} />}
                <textarea style={input} rows={8} value={ed.body} onChange={function (e) { setEdits(Object.assign({}, edits, { [m.id]: Object.assign({}, ed, { body: e.target.value }) })); }} />
                {m.channel === 'email' && <ImagePicker label="Picture (optional)" value={ed.image_url !== undefined ? ed.image_url : ((m.personalization && m.personalization.image_url) || '')} onChange={function (url) { setPicture(m, url); }} onBusy={function (b) { setUploading(function (u) { return Object.assign({}, u, { [m.id]: b }); }); }} />}
                <div style={{ marginTop: 6 }}><button style={btn} disabled={!!uploading[m.id]} onClick={function () { act(api('/outreach/messages/' + m.id + '/approve', 'POST', edits[m.id] || {}), 'Approved'); }}>Approve</button> <button style={Object.assign({}, btnGhost, { color: '#b91c1c' })} onClick={function () { act(api('/outreach/messages/' + m.id + '/reject', 'POST'), 'Rejected: this prospect will not be contacted by this campaign'); }}>Reject</button></div>
              </div>
            ) : <div><div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{m.subject}</div><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.78rem', margin: '4px 0' }}>{m.body}</pre><div style={{ fontSize: '0.72rem', color: '#64748b' }}>{m.status}{m.sent_at ? ' · sent ' + fmtDate(m.sent_at) : ''}{m.last_error ? ' · ' + m.last_error : ''}</div></div>}
          </div>
        );
      })}
    </div>
  );
}

// ===================== Bulk email =====================
const BULK_DEFAULT = 'Hello {{contact_name}},\n\nI am writing from {{sender_name}}. GetHome is a Nigerian property marketplace that connects property seekers with verified agents and agencies. We are inviting agents{{in_location}} to list their properties on the platform.\n\nYou can see how it works and register here: {{link}}\n\nIf you have questions, just reply to this email.\n\nKind regards,\n{{sender_name}}';
const SKIP_TEXT = {
  no_email: 'have no email address', suppressed: 'are on the do-not-contact list', opted_out: 'opted out', contact_bounced: 'bounced before', contact_invalid: 'have an invalid address',
  consent_withdrawn: 'withdrew consent', said_not_interested: 'said they are not interested', emailed_recently: 'were emailed recently', same_address_twice: 'share an address already included', could_not_save: 'could not be saved',
};
const skippedList = (s) => Object.keys(s || {}).map(function (k) { return <li key={k}>{s[k]} {SKIP_TEXT[k] || k.replace(/_/g, ' ')}</li>; });

export function BulkEmail({ go }) {
  const api = useApi();
  const [f, setF] = useState({ subject: 'Invitation to list your properties on GetHome', body: BULK_DEFAULT, image_url: '', state: '', category: '', limit: 100, skip: 0 });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [uploading, setUploading] = useState(false);
  const set =(k) => (e) => { setF(Object.assign({}, f, { [k]: e.target.value })); setRes(null); };
  const audience = () => ({ state: f.state || undefined, category: f.category || undefined, limit: Number(f.limit), skip_recent_days: Number(f.skip) });
  const content = () => ({ subject: f.subject, body: f.body, image_url: f.image_url || undefined });

  async function run(kind) {
    setMsg(null); setRes(null);
    if (kind !== 'check' && (!f.subject.trim() || !f.body.trim())) { setMsg({ text: 'Subject and message are required.' }); return; }
    if (kind === 'send' && !window.confirm('Send this email now to up to ' + f.limit + ' prospects' + (f.state ? ' in ' + f.state : '') + '?')) return;
    setBusy(true); setMsg({ ok: true, text: kind === 'check' ? 'Checking...' : 'Preparing the emails...' });
    try {
      const body = Object.assign(audience(), kind === 'check' ? { dry_run: true } : Object.assign(content(), { mode: kind }));
      const r = await api('/outreach/bulk-send', 'POST', body);
      setRes(r);
      if (kind === 'check') setMsg(null);
      else if (!r.queued) setMsg({ text: 'Nothing was sent: no matching prospect can be emailed. See the reasons below.' });
      else if (kind === 'review') setMsg({ ok: true, text: r.queued + ' emails saved under Pending approval.' });
      else {
        const t = await sendQueue(api, r.sending, function (x) { setMsg({ ok: true, text: 'Sending... ' + x.sent + ' of ' + r.queued + ' sent.' }); });
        setMsg({ ok: !t.failed && !STOP_TEXT[t.stopped_reason], text: sendSummary(t) });
      }
    } catch (e) { setMsg({ text: e.message }); }
    setBusy(false);
  }

  return (
    <div>
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 8 }}>1. Who should receive it</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8 }}>
          <Field label="State"><StateSelect value={f.state} onChange={function (v) { setF(Object.assign({}, f, { state: v })); setRes(null); }} /></Field>
          <Field label="Type"><select style={input} value={f.category} onChange={set('category')}>
            <option value="">All types</option><option value="independent_agent">Independent agents</option><option value="established_agency">Agencies</option><option value="commercial_agent">Commercial agents</option><option value="residential_agent">Residential agents</option><option value="property_consultant">Property consultants</option>
          </select></Field>
          <Field label="How many"><select style={input} value={f.limit} onChange={set('limit')}>{[25, 50, 100, 200, 500].map(function (n) { return <option key={n} value={n}>Up to {n}</option>; })}</select></Field>
          <Field label="Already emailed"><select style={input} value={f.skip} onChange={set('skip')}><option value={0}>Include them</option><option value={3}>Leave out last 3 days</option><option value={7}>Leave out last 7 days</option><option value={30}>Leave out last 30 days</option></select></Field>
        </div>
        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 8 }}>People you have never emailed go first. Only those with no email address, who bounced, or who blocked you (unsubscribed, opted out, said not interested) are skipped.</div>
        <button style={Object.assign({}, btnGhost, { marginTop: 8 })} disabled={busy} onClick={function () { run('check'); }}>Check who will receive it</button>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 8 }}>2. Your message</div>
        <input style={Object.assign({}, input, { marginBottom: 6 })} placeholder="Subject" value={f.subject} onChange={set('subject')} />
        <textarea style={input} rows={11} value={f.body} onChange={set('body')} />
        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4 }}><code>{'{{contact_name}}'}</code> becomes their name, or Sir/Madam. Also: {'{{business_name}} {{city}} {{state}} {{in_location}} {{link}} {{sender_name}}'}. An unsubscribe link is added automatically.</div>
        <ImagePicker label="Picture (optional)" value={f.image_url} onBusy={setUploading} onChange={function (url) { setF(function (cur) { return Object.assign({}, cur, { image_url: url }); }); setRes(null); }} />
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 8 }}>3. Send</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btn} disabled={busy || uploading} onClick={function () { run('send'); }}>{busy ? 'Working...' : 'Send now'}</button>
          <button style={btnSec} disabled={busy || uploading}onClick={function () { run('review'); }}>Save for my approval first</button>
          {res && res.mode === 'review' && res.queued > 0 && go && <button style={btnGhost} onClick={function () { go('review'); }}>Open Pending approval</button>}
        </div>
        <Msg m={msg} />
        {res && (
          <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: 6 }}>
            {res.dry_run ? <div><b>{res.eligible}</b> would receive it, out of {res.matched} matching prospects{res.checked < res.matched ? ' (' + res.checked + ' checked)' : ''}.</div> : <div>{res.matched} matching prospects, {res.queued} emails prepared.</div>}
            {Object.keys(res.skipped || {}).length > 0 && <div style={{ marginTop: 4 }}>Skipped:<ul style={{ margin: '4px 0 0 18px', padding: 0 }}>{skippedList(res.skipped)}</ul></div>}
            {res.skipped && res.skipped.no_email > 0 && <div style={{ color: '#92400e', marginTop: 4 }}>For more email addresses, use Find prospects with Search the web.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== Replies & human handover (phases 4, 5) =====================
export function Replies() {
  const api = useApi();
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [log, setLog] = useState({ email: '', body: '' });
  const [wa, setWa] = useState({});
  const load = useCallback(function () { api('/outreach/replies?open=true').then(setList).catch(function (e) { setMsg({ text: e.message }); }); }, [api]);
  useEffect(load, [load]);
  const act = (p, t) => p.then(function () { setMsg({ ok: true, text: t }); load(); }).catch(function (e) { setMsg({ text: e.message }); });
  return (
    <div>
      <Msg m={msg} />
      <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>Replies that need a person. While a reply is open, nothing more is sent to that prospect. Email replies arrive in {'your reply-to inbox'}; log them here, or use the inbound webhook.</div>
      {!list.length && <div style={card}>No replies waiting.</div>}
      {list.map(function (r) {
        return (
          <div key={r.id} style={card}>
            <div style={{ fontSize: '0.8rem' }}><strong>{r.prospect ? r.prospect.name : 'Unknown'}</strong> · {r.channel} · {fmtDate(r.received_at)} <Badge color={r.classification === 'interested' ? GREEN : '#64748b'}>{r.classification.replace('_', ' ')}</Badge></div>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.8rem', margin: '6px 0' }}>{r.body}</pre>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <select style={Object.assign({}, input, { width: 'auto' })} value={r.classification} onChange={function (e) { act(api('/outreach/replies/' + r.id, 'PATCH', { classification: e.target.value }), 'Reclassified'); }}>{['unclassified', 'interested', 'not_interested', 'question', 'out_of_office', 'unsubscribe', 'other'].map(function (c) { return <option key={c} value={c}>{c.replace('_', ' ')}</option>; })}</select>
              <button style={btn} onClick={function () { act(api('/outreach/replies/' + r.id, 'PATCH', { handled: true }), 'Marked handled'); }}>Mark handled</button>
            </div>
            {r.channel === 'whatsapp' && (
              <div style={{ marginTop: 8 }}>
                <textarea style={input} rows={3} placeholder="Reply on WhatsApp (allowed within 24 hours of their message)" value={wa[r.id] || ''} onChange={function (e) { setWa(Object.assign({}, wa, { [r.id]: e.target.value })); }} />
                <button style={Object.assign({}, btnSec, { marginTop: 6 })} onClick={function () { act(api('/outreach/whatsapp/reply', 'POST', { prospect_id: r.prospect_id, text: wa[r.id] }), 'Sent'); }}>Send on WhatsApp</button>
              </div>
            )}
          </div>
        );
      })}
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 6 }}>Log an email reply</div>
        <input style={Object.assign({}, input, { marginBottom: 6 })} placeholder="Sender's email address" value={log.email} onChange={function (e) { setLog(Object.assign({}, log, { email: e.target.value })); }} />
        <textarea style={input} rows={4} placeholder="Paste their reply" value={log.body} onChange={function (e) { setLog(Object.assign({}, log, { body: e.target.value })); }} />
        <button style={Object.assign({}, btn, { marginTop: 6 })} onClick={function () { act(api('/outreach/replies', 'POST', log), 'Logged, classified, and further sending to them stopped'); setLog({ email: '', body: '' }); }}>Log reply</button>
      </div>
    </div>
  );
}

// ===================== Setup: AI, email, WhatsApp (phases 3-5) =====================
export function Setup() {
  const api = useApi();
  const [s, setS] = useState(null); const [wa, setWa] = useState(null); const [tpls, setTpls] = useState([]); const [msg, setMsg] = useState(null);
  const [nt, setNt] = useState({ name: '', wa_template_name: '', body: '', variables: '' });
  const load = useCallback(function () {
    api('/outreach/settings').then(function (j) { setS(j.settings); }).catch(function (e) { setMsg({ text: e.message }); });
    api('/outreach/whatsapp/status').then(setWa).catch(function () { /* */ });
    api('/outreach/templates').then(function (t) { setTpls(t.filter(function (x) { return x.channel === 'whatsapp'; })); }).catch(function () { /* */ });
  }, [api]);
  useEffect(load, [load]);
  const save = (patch) => api('/outreach/settings', 'PATCH', patch).then(function () { setMsg({ ok: true, text: 'Saved' }); load(); }).catch(function (e) { setMsg({ text: e.message }); });
  if (!s) return <div>{msg ? <Msg m={msg} /> : 'Loading...'}</div>;
  return (
    <div>
      <Msg m={msg} />
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 6 }}>Message writing</div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>"Templates only" needs no AI and no cost. With AI on, only the opening paragraph is rephrased from facts stored on the prospect; anything that adds numbers, links, guarantees or invented details is rejected and the plain template is used.</div>
        <select style={Object.assign({}, input, { maxWidth: 320 })} value={s.ai_provider} onChange={function (e) { save({ ai_provider: e.target.value }); }}>
          <option value="template">Templates only (no AI)</option><option value="anthropic">Claude (needs ANTHROPIC_API_KEY)</option><option value="openai_compatible">Local or hosted model (needs LOCAL_AI_URL)</option>
        </select>
      </div>
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 6 }}>Email</div>
        <select style={Object.assign({}, input, { maxWidth: 320 })} value={s.email_provider} onChange={function (e) { save({ email_provider: e.target.value }); }}><option value="resend">Resend</option><option value="smtp">SMTP</option></select>
        <ImagePicker label="Logo shown at the top of every email (optional, saved as soon as you choose it)" value={s.email_logo_url || ''} onChange={function (url) { save({ email_logo_url: url }); }} />
        <div style={{ marginTop: 8, fontSize: '0.8rem' }}>WhatsApp contact line shown in outreach messages{' '}<input style={Object.assign({}, input, { maxWidth: 200, display: 'inline-block' })} defaultValue={s.outreach_whatsapp_number} onBlur={function (e) { if (e.target.value !== s.outreach_whatsapp_number) save({ outreach_whatsapp_number: e.target.value }); }} /></div>
        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 6 }}>Sender name: "{s.email_sender_name}". Replies go to {s.reply_to_email}. Email only sends from a domain verified with your provider; set it with OUTREACH_FROM_EMAIL. Delivery and bounce tracking needs the Resend webhook (see setup notes).</div>
      </div>
      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 6 }}>WhatsApp Business Platform</div>
        {wa && <div style={{ fontSize: '0.8rem', marginBottom: 6 }}><Badge color={wa.configured ? GREEN : '#b91c1c'}>{wa.configured ? 'credentials present' : 'not configured'}</Badge><Badge color={wa.webhook_secret_set ? GREEN : '#b91c1c'}>webhook secret {wa.webhook_secret_set ? 'set' : 'missing'}</Badge><Badge color={wa.business_account_set ? GREEN : '#b91c1c'}>business account {wa.business_account_set ? 'set' : 'missing'}</Badge><div style={{ color: '#64748b', marginTop: 4 }}>{wa.note}</div></div>}
        <Table rows={tpls} cols={[['Template', (r) => r.name], ['Meta name', (r) => r.wa_template_name], ['Status', (r) => r.wa_status]]} />
        {tpls.map(function (t) { return <span key={t.id} style={{ marginRight: 6 }}><button style={btnSec} onClick={function () { api('/outreach/whatsapp/templates/' + t.id + '/submit', 'POST').then(function () { setMsg({ ok: true, text: 'Submitted to Meta for approval' }); load(); }).catch(function (e) { setMsg({ text: e.message }); }); }}>Submit {t.name}</button> <button style={btnGhost} onClick={function () { api('/outreach/whatsapp/templates/' + t.id + '/sync', 'POST').then(function (r) { setMsg({ ok: true, text: 'Status: ' + r.status }); load(); }).catch(function (e) { setMsg({ text: e.message }); }); }}>Check status</button></span>; })}
        <div style={{ fontWeight: 700, margin: '10px 0 4px', fontSize: '0.85rem' }}>New WhatsApp template</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 6 }}>
          <input style={input} placeholder="Internal name" value={nt.name} onChange={function (e) { setNt(Object.assign({}, nt, { name: e.target.value })); }} />
          <input style={input} placeholder="Meta name (lowercase_with_underscores)" value={nt.wa_template_name} onChange={function (e) { setNt(Object.assign({}, nt, { wa_template_name: e.target.value })); }} />
          <input style={input} placeholder="Variables in order, comma separated" value={nt.variables} onChange={function (e) { setNt(Object.assign({}, nt, { variables: e.target.value })); }} />
        </div>
        <textarea style={Object.assign({}, input, { marginTop: 6 })} rows={3} placeholder="Body, e.g. Hello {{contact_name}}, GetHome invites {{business_name}} to list properties: {{link}}" value={nt.body} onChange={function (e) { setNt(Object.assign({}, nt, { body: e.target.value })); }} />
        <button style={Object.assign({}, btn, { marginTop: 6 })} onClick={function () { api('/outreach/templates', 'POST', { name: nt.name, channel: 'whatsapp', wa_template_name: nt.wa_template_name, body: nt.body, variables: nt.variables.split(',').map(function (v) { return v.trim(); }).filter(Boolean) }).then(function () { setMsg({ ok: true, text: 'Template saved as draft' }); setNt({ name: '', wa_template_name: '', body: '', variables: '' }); load(); }).catch(function (e) { setMsg({ text: e.message }); }); }}>Save template</button>
        <div style={{ marginTop: 10 }}><button style={btnSec} onClick={function () { api('/outreach/whatsapp/process', 'POST', {}).then(function (r) { setMsg({ ok: true, text: 'WhatsApp pass: sent ' + r.sent + ', blocked ' + r.blocked + ', waiting for template approval ' + r.waiting + (r.stopped_reason ? ' (' + r.stopped_reason + ')' : '') }); }).catch(function (e) { setMsg({ text: e.message }); }); }}>Send approved WhatsApp messages</button></div>
      </div>
    </div>
  );
}
