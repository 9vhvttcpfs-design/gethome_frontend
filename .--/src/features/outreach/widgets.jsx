import { useState } from 'react';
import { GREEN, NAVY, card, input, btnGhost, uploadImage } from './shared';
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

// Photo library / file picker for one image: uploads on selection, shows a preview, and can be removed.
// onChange gets the uploaded link, or '' when removed. onBusy tells the caller to hold back sending while it uploads.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function ImagePicker({ label, value, onChange, onBusy }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function pick(e) {
    const field = e.target, file = field.files && field.files[0];
    field.value = ''; // lets the same photo be chosen again
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { setError('Choose a JPG, PNG or WEBP photo.'); return; }
    const mark = function (b) { setBusy(b); if (onBusy) onBusy(b); };
    setError(''); mark(true);
    uploadImage(file).then(function (m) { onChange(m.url); }).catch(function (err) { setError(err.message); }).then(function () { mark(false); });
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: 3 }}>{label}</div>
      <input type="file" accept={IMAGE_TYPES.join(',')} disabled={busy} onChange={pick} />
      {busy && <span style={{ fontSize: '0.76rem', color: '#64748b' }}> Uploading...</span>}
      {error && <div style={{ fontSize: '0.76rem', color: '#b91c1c' }}>{error}</div>}
      {value && (
        <div style={{ marginTop: 6 }}>
          <img src={value} alt="preview" style={{ display: 'block', maxWidth: 260, maxHeight: 140, borderRadius: 6, border: '1px solid #e2e8f0' }} />
          <button type="button" style={Object.assign({}, btnGhost, { marginTop: 4 })} disabled={busy} onClick={function () { setError(''); onChange(''); }}>Remove image</button>
        </div>
      )}
    </div>
  );
}

// A card that opens and closes when its title is pressed.
export const Section = ({ title, hint, open, children }) => (
  <details style={card} open={open}>
    <summary style={{ cursor: 'pointer', fontWeight: 800, color: NAVY }}>{title}{hint && <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.76rem' }}> · {hint}</span>}</summary>
    <div style={{ marginTop: 10 }}>{children}</div>
  </details>
);
