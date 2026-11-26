import { useEffect, useState } from 'react';
import { GREEN, NAVY, card, btn, useApi } from './shared';
import { Msg } from './widgets';

// "Start Here": the whole outreach process in plain words, with a live checklist from the server.
// The checklist only shows whether each setting exists, never its value.
const STEPS = [
  ['1', 'Find agents', 'Find prospects: pick a state and press Find prospects. It searches the web. You can also upload a CSV.', 'discovery'],
  ['2', 'Look over your list', 'Contacts > All prospects. Anyone who opted out or bounced is blocked automatically.', 'prospects'],
  ['3', 'Email many at once', 'Send > Bulk email: choose a state, write your message, then Send now or save it for approval.', 'bulk'],
  ['4', 'Read and approve', 'Send > Review and approve: read the saved messages, approve them, press Send approved now.', 'review'],
  ['5', 'Add follow-ups (optional)', 'Send > Campaigns and follow-ups: create a campaign, enrol prospects, Activate, then Prepare messages.', 'campaigns'],
  ['6', 'Answer replies', 'Replies: answer anyone who replied. Follow-ups stop automatically when they reply or register.', 'replies'],
  ['7', 'See results', 'Results: press Sync registrations & payments to see who registered and subscribed.', 'dashboard'],
];

function Dot({ ok, optional }) {
  const c = ok ? GREEN : optional ? '#f59e0b' : '#dc2626';
  return <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 6, backgroundColor: c, marginRight: 8, flexShrink: 0, marginTop: 4 }} />;
}

export default function StartHere({ go }) {
  const api = useApi();
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState(null);
  const fetchIt = function () { api('/outreach/readiness').then(setD).catch(function (e) { setMsg({ text: e.message }); }); };
  const load = function () { setD(null); setMsg(null); fetchIt(); };
  useEffect(function () { api('/outreach/readiness').then(setD).catch(function (e) { setMsg({ text: e.message }); }); }, [api]);
  const c = (d && d.counts) || {};
  const todo = d ? [
    c.replies_waiting > 0 && ['replies', c.replies_waiting + ' ' + (c.replies_waiting === 1 ? 'person has' : 'people have') + ' replied. Answer them.'],
    c.messages_to_review > 0 && ['review', c.messages_to_review + ' message(s) are waiting for your approval.'],
    c.prospects === 0 && ['discovery', 'No prospects yet. Find some agents first.'],
    c.prospects > 0 && c.campaigns === 0 && ['campaigns', 'You have prospects but no campaign. Create one.'],
  ].filter(Boolean) : [];
  return (
    <div>
      <div style={Object.assign({}, card, { borderLeft: '5px solid ' + GREEN })}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 6 }}>What this does</div>
        <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
          It helps you <b>recruit agents and agencies</b> onto GetHome. It finds them, emails them an invitation (WhatsApp only if they agreed),
          follows up, and tracks who registered and who pays a subscription. <b>Nothing is sent until you press send or approve it.</b>{' '}
          It does <b>not</b> find customers (people looking to rent or buy). Customers come from your listings, SEO, social posts and the lead form, and are tracked in the Growth CRM.
        </div>
      </div>

      {msg && <Msg m={msg} />}
      {!d && !msg && <div>Checking your setup...</div>}

      {d && <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 4 }}>What to do now</div>
        {todo.length === 0 && <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Nothing urgent. Keep finding agents or check Results.</div>}
        {todo.map(function (t, i) { return <div key={i} style={{ padding: '6px 0', fontSize: '0.88rem' }}>{t[1]} <button style={Object.assign({}, btn, { marginLeft: 8 })} onClick={function () { go(t[0]); }}>Go</button></div>; })}
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
          {c.prospects} prospects, {c.ready_to_contact} ready to contact, {c.active_campaigns} active campaign(s), {c.suppressed} on the do-not-contact list.
        </div>
      </div>}

      {d && <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 2 }}>Setup checklist <button style={Object.assign({}, btn, { marginLeft: 8, backgroundColor: '#e2e8f0', color: '#334155' })} onClick={load}>Re-check</button></div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>Green = ready. Red = needed. Amber = optional. Settings are added in Render (backend) &gt; Environment, then redeploy.</div>
        {d.items.map(function (i) {
          return (
            <div key={i.key} style={{ display: 'flex', padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
              <Dot ok={i.ok} optional={i.optional} />
              <div style={{ fontSize: '0.84rem' }}>
                <div style={{ fontWeight: 700 }}>{i.title} {i.optional && <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>}</div>
                <div style={{ color: '#475569' }}>{i.needed_for}</div>
                {!i.ok && <div style={{ color: NAVY, marginTop: 2 }}><b>To fix:</b> {i.how}{i.missing.length > 0 && <span> Missing: <code>{i.missing.join(', ')}</code></span>}</div>}
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 8, fontSize: '0.84rem', fontWeight: 700, color: d.required_ok ? GREEN : '#dc2626' }}>{d.required_ok ? 'Ready to send emails.' : 'Email is not ready yet. Fix the red items.'}</div>
        <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#64748b' }}>Email does not need recorded consent: anyone who can receive email and has not blocked you can be emailed, and every email has an unsubscribe link.</div>
      </div>}

      <div style={card}>
        <div style={{ fontWeight: 800, color: NAVY, marginBottom: 6 }}>The steps</div>
        {STEPS.map(function (s) {
          return (
            <div key={s[0]} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: NAVY, color: '#fff', textAlign: 'center', lineHeight: '28px', fontWeight: 800, marginRight: 10, flexShrink: 0 }}>{s[0]}</div>
              <div style={{ flex: 1, fontSize: '0.84rem' }}><b>{s[1]}.</b> <span style={{ color: '#475569' }}>{s[2]}</span></div>
              <button style={btn} onClick={function () { go(s[3]); }}>Open</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
