import { GREEN, NAVY, card, input } from './shared';
import { NG_STATES, GH_REGIONS } from './places';

export const Badge = ({ children, color }) => <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, backgroundColor: (color || '#64748b') + '22', color: color || '#64748b', marginRight: 4 }}>{children}</span>;
export const Msg = ({ m }) => (m ? <div style={{ color: m.ok ? GREEN : '#b91c1c', fontSize: '0.82rem', margin: '6px 0' }}>{m.text}</div> : null);

export const StateSelect = ({ value, onChange, any, style }) => (
  <select style={Object.assign({}, input, style)} value={value} onChange={function (e) { onChange(e.target.value); }}>
    <option value="">{any || 'All states'}</option>
    <optgroup label="Nigeria">{NG_STATES.map(function (s) { return <option key={s} value={s}>{s}</option>; })}</optgroup>
    <optgroup label="Ghana">{GH_REGIONS.map(function (s) { return <option key={s} value={s}>{s}</option>; })}</optgroup>
  </select>
);

// A dropdown label above any form control.
export const Field = ({ label, children }) => <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569' }}>{label}<div style={{ marginTop: 3 }}>{children}</div></label>;

// A card that opens and closes when its title is pressed.
export const Section = ({ title, hint, open, children }) => (
  <details style={card} open={open}>
    <summary style={{ cursor: 'pointer', fontWeight: 800, color: NAVY }}>{title}{hint && <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.76rem' }}> · {hint}</span>}</summary>
    <div style={{ marginTop: 10 }}>{children}</div>
  </details>
);
