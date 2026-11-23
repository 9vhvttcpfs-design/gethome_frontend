import { GREEN } from './shared';

export const Badge = ({ children, color }) => <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, backgroundColor: (color || '#64748b') + '22', color: color || '#64748b', marginRight: 4 }}>{children}</span>;
export const Msg = ({ m }) => (m ? <div style={{ color: m.ok ? GREEN : '#b91c1c', fontSize: '0.82rem', margin: '6px 0' }}>{m.text}</div> : null);
