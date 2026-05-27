import { useEffect, useState, useCallback } from 'react'
// =========================================================
// AD CONFIGURATION -- flip ENABLE_ADS to true when ready
// =========================================================
const ENABLE_ADS = false;
const AD_CONFIG = {
  BANNER_ANDROID: 'ca-app-pub-3940256099942544/6300978111', // TEST ID - replace with real
  BANNER_IOS:     'ca-app-pub-3940256099942544/2934735716', // TEST ID - replace with real
};
// =========================================================
// CONSTANTS
// =========================================================
const API_URL              = "https://gethome-backend-7ocr.onrender.com";
const PAYSTACK_PUB_KEY     = "pk_test_REPLACE_WITH_YOUR_PAYSTACK_PUBLIC_KEY";
const LOAN_PARTNER_URL     = "https://REPLACE_WITH_LOAN_PARTNER_WEBSITE.com/apply";
const WHATSAPP_NUMBER      = "2349077246534";
const ADDON_PRICES         = { cleaning: 92000, relocation: 230000 };
const ESCROW_FEE_RATE      = 0.0075;
const ESCROW_FEE_CAP       = 5000;
const PROXY_INSPECTION_FEE = 12500;
const AGENT_TIERS = {
  free:    { listingLimit: 3,   label: 'Free',    price: 0     },
  premium: { listingLimit: 15,  label: 'Premium', price: 8500  },
  agency:  { listingLimit: 100, label: 'Agency',  price: 35000 },
};
// =========================================================
// PAYSTACK SDK LOADER
// =========================================================
function usePaystackSDK() {
  useEffect(() => {
    if (document.getElementById('paystack-sdk')) return;
    const s = document.createElement('script');
    s.id = 'paystack-sdk'; s.src = 'https://js.paystack.co/v1/inline.js'; s.async = true;
    document.head.appendChild(s);
  }, []);
}
// =========================================================
// SHARED STYLES
// =========================================================
const inputStyle = {
  width: '100%', padding: '13px 16px', borderRadius: '10px',
  border: '1.5px solid #e2e8f0', fontSize: '0.95rem', outline: 'none',
  backgroundColor: '#ffffff', color: '#0a2240', boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
};
const labelStyle = {
  display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748b',
  marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px',
};
const navButtonStyle = (isActive) => ({
  background: 'none', border: 'none',
  color: isActive ? '#27ae60' : '#94a3b8',
  fontSize: '0.95rem', cursor: 'pointer', padding: '8px 6px', fontWeight: '600',
  borderBottom: isActive ? '3px solid #27ae60' : '3px solid transparent',
  transition: 'color 0.15s ease',
});
const fmtNGN = (n) => `NGN ${Number(n).toLocaleString('en-NG')}`;
const cardStyle = {
  backgroundColor: '#ffffff', borderRadius: '20px',
  border: '1px solid #e8edf3',
  boxShadow: '0 4px 6px -1px rgba(10,34,64,0.04), 0 2px 4px -1px rgba(10,34,64,0.03)',
};
// =========================================================
// HELPER: Paystack popup
// =========================================================
function openPaystack({ email, amountNaira, ref, metadata, onSuccess, onClose }) {
  if (!window.PaystackPop) {
    alert('[!] Payment gateway still loading --- please try again in a moment.');
    return;
  }
  window.PaystackPop.setup({
    key: PAYSTACK_PUB_KEY, email,
    amount: Math.round(amountNaira * 100), currency: 'NGN',
    ref, metadata, callback: onSuccess, onClose,
  }).openIframe();
}
function useWindowWidth() {
  var [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(function() {
    function handleResize() { setWidth(window.innerWidth); }
    window.addEventListener('resize', handleResize);
    return function() { window.removeEventListener('resize', handleResize); };
  }, []);
  return width;
}
// =========================================================
// LOADING SCREEN
// Shown while properties are being fetched from the API.
// =========================================================
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#f1f5f9',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
      gap: '24px',
    }}>
      {/* Pulsing logo */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: '900', color: '#0a2240', margin: 0, letterSpacing: '-1px' }}>
          Get<span style={{ color: '#27ae60' }}>Home</span>
        </h1>
        <p style={{ color: '#94a3b8', margin: '8px 0 0 0', fontSize: '0.9rem' }}>Loading verified listings...</p>
      </div>
      {/* Animated spinner */}
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          border: '4px solid #e2e8f0',
          borderTopColor: '#27ae60',
          animation: 'gh-spin 0.8s linear infinite',
        }} />
      </div>
      {/* Inject the spin keyframe once */}
      <style>{`
        @keyframes gh-spin { to { transform: rotate(360deg); } }
        @keyframes gh-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
      {/* Skeleton card hints */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', opacity: 0.5 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: '200px', borderRadius: '16px', backgroundColor: '#e2e8f0', overflow: 'hidden', animation: 'gh-pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}>
            <div style={{ height: '120px', backgroundColor: '#cbd5e1' }} />
            <div style={{ padding: '16px' }}>
              <div style={{ height: '12px', backgroundColor: '#cbd5e1', borderRadius: '6px', marginBottom: '8px' }} />
              <div style={{ height: '10px', backgroundColor: '#cbd5e1', borderRadius: '6px', width: '70%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
// =========================================================
// ERROR SCREEN
// Shown when the API fetch fails. Retry button re-fires fetch.
// =========================================================
function ErrorScreen({ onRetry }) {
  const [retrying, setRetrying] = useState(false);
  const handleRetry = async () => {
    setRetrying(true);
    // Small delay so the spinner is visible before App re-fetches
    await new Promise(r => setTimeout(r, 600));
    onRetry();
    setRetrying(false);
  };
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#f1f5f9',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
      padding: '32px', textAlign: 'center',
    }}>
      <style>{`@keyframes gh-spin { to { transform: rotate(360deg); } }`}</style>
      {/* Icon */}
      <div style={{ fontSize: '4rem', marginBottom: '20px', lineHeight: 1 }}>[signal]</div>
      {/* Branding */}
      <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0a2240', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
        Get<span style={{ color: '#27ae60' }}>Home</span>
      </h1>
      {/* Message */}
      <div style={{ ...cardStyle, padding: '32px 36px', maxWidth: '420px', width: '100%', marginTop: '24px', marginBottom: '24px' }}>
        <p style={{ fontWeight: '800', color: '#0a2240', fontSize: '1.1rem', margin: '0 0 10px 0' }}>
          Connection timed out
        </p>
        <p style={{ color: '#64748b', fontSize: '0.93rem', lineHeight: '1.65', margin: '0 0 24px 0' }}>
          We could not reach the GetHome servers. Please check your internet connection and tap the button below to try again.
        </p>
        {/* Retry button */}
        <button
          onClick={handleRetry}
          disabled={retrying}
          style={{
            width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
            background: retrying ? '#94a3b8' : 'linear-gradient(135deg, #27ae60, #00b894)',
            color: '#fff', fontWeight: '700', fontSize: '1rem',
            cursor: retrying ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: retrying ? 'none' : '0 4px 12px rgba(39,174,96,0.3)',
            transition: 'all 0.2s',
          }}
        >
          {retrying
            ? <><div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'gh-spin 0.7s linear infinite' }} /> Retrying...</>
            : '[retry] Retry Loading'
          }
        </button>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>
        If this keeps happening, check that your WiFi or mobile data is active.
      </p>
    </div>
  );
}
var LEGAL_CONTENT = {
  terms: { title: "Terms and Conditions", version: "1.0", sections: [
    { heading: "1. Acceptance", body: "By using GetHome you accept these Terms." },
    { heading: "2. Platform", body: "GetHome is a Nigerian real estate listing platform." },
    { heading: "3. Accounts", body: "You must be 18+ and provide accurate information." },
    { heading: "4. Escrow", body: "Payments via Paystack escrow. 0.75% fee (capped NGN5k)." },
    { heading: "5. Listings", body: "GetHome does not own listed properties." },
    { heading: "6. Prohibited", body: "No fraud, money laundering, or illegal activity." },
    { heading: "7. Liability", body: "GetHome is not liable for indirect damages." },
    { heading: "8. Law", body: "Governed by Nigerian law." },
    { heading: "9. Changes", body: "We may update terms at any time." },
    { heading: "10. Contact", body: "Contact: REPLACE_WITH_CONTACT_EMAIL | WhatsApp: +2349077246534" }
  ]},
  privacy: { title: "Privacy Policy", version: "1.0", sections: [
    { heading: "1. Data We Collect", body: "Account info, transaction data, and usage data." },
    { heading: "2. How We Use It", body: "To process transactions, send confirmations, and improve the platform." },
    { heading: "3. Data Sharing", body: "Shared with Paystack, Supabase, SMTP provider, Termii. Never sold." },
    { heading: "4. Security", body: "HTTPS encryption and Supabase Auth. No system is 100% secure." },
    { heading: "5. Your Rights", body: "Access, correct, or delete your data. Contact REPLACE_WITH_CONTACT_EMAIL." },
    { heading: "6. Cookies", body: "Essential auth cookies only. No advertising cookies." },
    { heading: "7. Retention", body: "Account data held while active. Transactions kept 7 years." },
    { heading: "8. Contact", body: "Privacy concerns: REPLACE_WITH_CONTACT_EMAIL" }
  ]},
  agent: { title: "Agent Agreement", version: "1.0", sections: [
    { heading: "1. Eligibility", body: "Must be licensed agent or authorized property owner in Nigeria." },
    { heading: "2. Accuracy", body: "All listing info must be accurate. Fraud = immediate termination." },
    { heading: "3. Fee Transparency", body: "All fees must be disclosed. Hidden fees = account suspension." },
    { heading: "4. Commission", body: "Platform fees apply per tier. Loan referrals: 1-2.5% of disbursed amount." },
    { heading: "5. Inspections", body: "Must provide property access within 48 hours of paid inspection." },
    { heading: "6. Escrow", body: "Funds released after verification. Processing fee deducted first." },
    { heading: "7. Prohibited", body: "No unauthorized listings, pricing manipulation, or duplicate posts." },
    { heading: "8. Termination", body: "Violations result in termination. Fees non-refundable for cause." }
  ]}
};
function LegalModal({ type, onClose, onAccept, forceAccept }) {
  var [scrolled, setScrolled] = useState(false);
  var doc = LEGAL_CONTENT[type];
  if (!doc) return null;
  function handleScroll(e) {
    var el = e.target;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 60) setScrolled(true);
  }
  return (
    <div onClick={forceAccept ? undefined : onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,34,64,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000, padding: 0 }}>
      <div onClick={function(e){ e.stopPropagation(); }}
        style={{ backgroundColor: '#fff', borderRadius: '20px 20px 0 0', maxWidth: '680px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -20px 60px rgba(10,34,64,0.2)' }}>
        <div style={{ backgroundColor: '#0a2240', borderRadius: '20px 20px 0 0', padding: '20px 28px', flexShrink: 0 }}>
          <h2 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '800' }}>{doc.title}</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.76rem' }}>v{doc.version} - Please read carefully</p>
        </div>
        <div onScroll={handleScroll} style={{ overflowY: 'auto', padding: '24px 28px', flex: 1 }}>
          {doc.sections.map(function(s, i) {
            return (
              <div key={i} style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#0a2240', fontSize: '0.92rem', fontWeight: '700', margin: '0 0 6px 0' }}>{s.heading}</h3>
                <p style={{ color: '#475569', fontSize: '0.86rem', lineHeight: '1.65', margin: 0 }}>{s.body}</p>
              </div>
            );
          })}
          {forceAccept && !scrolled && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.80rem', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              Scroll to the bottom to enable the Accept button
            </p>
          )}
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', flexShrink: 0 }}>
          {!forceAccept && <button onClick={onClose} style={{ flex: 1, padding: '11px', border: '1.5px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fff', color: '#64748b', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}>Close</button>}
          {onAccept && (
            <button onClick={scrolled || !forceAccept ? onAccept : undefined}
              style={{ flex: 2, padding: '11px', border: 'none', borderRadius: '10px', backgroundColor: scrolled || !forceAccept ? '#27ae60' : '#94a3b8', color: '#fff', fontWeight: '700', fontSize: '0.9rem', cursor: scrolled || !forceAccept ? 'pointer' : 'not-allowed' }}>
              {scrolled || !forceAccept ? 'I Accept and Agree' : 'Scroll down to accept'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
// =========================================================
// INLINE AUTH FORM
// =========================================================
function InlineAuthForm({ onSuccess, actionLabel = 'continue' }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
    try {
      const res  = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      if (isSignUp && data.confirmationRequired) {
        // Email confirmation required - show success screen
      }
        setEmailSent(true);
        return;
      // Login or signup without confirmation - proceed normally
      localStorage.setItem('gh_user',  JSON.stringify(data.user));
      localStorage.setItem('gh_token', data.token || '');
      onSuccess(data.user);
    } catch { setError('Network error --- check your connection.'); }
    finally   { setLoading(false); }
  };
  return (
 <>
    {/* Email confirmation success screen */}
    {emailSent && (
      <div style={{ backgroundColor: '#f0fff4', border: '1.5px solid #86efac', borderRadius: '16px', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', backgroundColor: '#27ae60', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '1.5rem', color: '#fff', fontWeight: '900' }}>v</div>
        <h3 style={{ color: '#166534', fontSize: '1.1rem', fontWeight: '800', margin: '0 0 10px 0' }}>Check Your Email!</h3>
        <p style={{ color: '#15803d', fontSize: '0.88rem', lineHeight: '1.65', margin: '0 0 16px 0' }}>
          Registration successful! We sent a verification link to <strong>{email}</strong>.
          Please check your inbox and click the link to activate your GetHome account.
        </p>
        <p style={{ color: '#86efac', fontSize: '0.80rem', margin: 0 }}>
          Did not receive it? Check your spam folder or contact us on WhatsApp.
        </p>
      </div>
    )}
    {!emailSent && <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '28px 24px', marginTop: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}></span>
        <div>
          <p style={{ margin: 0, fontWeight: '800', color: '#0a2240', fontSize: '1rem' }}>
            {isSignUp ? 'Create a free account' : 'Sign in to continue'}
          </p>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#7f8c8d' }}>
            Required to {actionLabel} --- takes 30 seconds
          </p>
        </div>
      </div>
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px' }}>
          <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.85rem', fontWeight: '500' }}>[!] {error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input type="email" placeholder="Email address" required style={inputStyle} value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }} />
        <input type="password" placeholder={isSignUp ? 'Password (min 6 chars)' : 'Password'} required
          minLength={isSignUp ? 6 : undefined} style={inputStyle} value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }} />
        <button type="submit" disabled={loading || (isSignUp && !termsAccepted)} style={{
          padding: '13px', border: 'none', borderRadius: '10px',
          background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0a2240 0%, #1a3a5c 100%)',
          color: '#fff', fontWeight: '700', fontSize: '0.95rem',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? '[wait] Please wait...' : isSignUp ? 'Create Account & Continue' : 'Log In & Continue'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.84rem', color: '#94a3b8', marginBottom: 0 }}>
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <span onClick={() => { setIsSignUp(s => !s); setError(''); setTermsAccepted(false); }}
          style={{ color: '#27ae60', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
          {isSignUp ? 'Log in instead' : 'Sign up free'}
        </span>
      </p>
      {isSignUp && (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', backgroundColor: '#f1f5f9', borderRadius: '8px', marginTop: '8px' }}>
        <input type="checkbox" id="gh-terms" checked={termsAccepted} onChange={function(e){ setTermsAccepted(e.target.checked); }}
          style={{ width: '16px', height: '16px', accentColor: '#27ae60', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} />
        <label htmlFor="gh-terms" style={{ fontSize: '0.80rem', color: '#475569', lineHeight: '1.5', cursor: 'pointer' }}>
          I agree to the{' '}
          <span onClick={function(){ setShowTermsModal(true); }} style={{ color: '#27ae60', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>Terms</span>
          {' '}and{' '}
          <span onClick={function(){ setShowPrivacyModal(true); }} style={{ color: '#27ae60', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</span>
        </label>
      </div>
      )}
    </div>}
    {showTermsModal && <LegalModal type='terms' onClose={function(){ setShowTermsModal(false); }} />}
    {showPrivacyModal && <LegalModal type='privacy' onClose={function(){ setShowPrivacyModal(false); }} />}
  </>
  );
}
// =========================================================
// AGENT UPLOAD PORTAL
// Role-gated --- visible only to user.role === 'agent' | 'admin'
// Sections:
//   A) Publish / Edit form  (create new OR update existing)
//   B) Manage Listings grid (edit / delete every active listing)
// =========================================================
function AgentUploadPortal({ user, allProperties, onListingPublished, onListingUpdated, onListingDeleted }) {
  var [agentAgreed, setAgentAgreed] = useState(false);
  var [showAgentModal, setShowAgentModal] = useState(false);
  // - Form state 
  const EMPTY_FORM = { title: '', location: '', price: '', image_url: '', purpose: 'rent' };
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editingProperty, setEditingProperty] = useState(null); // null = create mode
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');
  // - Delete state 
  const [deletingId, setDeletingId] = useState(null); // id currently being deleted
  // - Helpers --
  const clearMessages = () => { setSuccessMsg(''); setErrorMsg(''); };
  // Populate form from a property row and enter edit mode
  const enterEditMode = (property) => {
    setEditingProperty(property);
    // Strip the " (For RENT/SALE)" suffix if present so the field looks clean
    const cleanTitle = property.title.replace(/\s*\(For (RENT|SALE)\)\s*$/i, '').trim();
    const purpose    = /SALE/i.test(property.title) ? 'sale' : 'rent';
    setForm({
      title:     cleanTitle,
      location:  property.location  || '',
      price:     String(property.price || ''),
      image_url: property.image_url || '',
      purpose,
    });
    clearMessages();
    // Scroll to the top of the form smoothly
    document.getElementById('agent-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const cancelEdit = () => { setEditingProperty(null); setForm(EMPTY_FORM); clearMessages(); };
  // - A) Form submit: create OR update 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); clearMessages();
    const payload = {
      title:     `${form.title.trim()} (For ${form.purpose.toUpperCase()})`,
      location:  form.location.trim(),
      price:     parseFloat(form.price),
      image_url: form.image_url.trim() || null,
    };
    try {
      if (editingProperty) {
        // - UPDATE existing listing 
        const res = await fetch(`${API_URL}/api/properties/${editingProperty.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Update failed: ${res.status}`);
        const updated = await res.json();
        setSuccessMsg(`"${updated.title}" has been updated successfully!`);
        onListingUpdated(updated);   // refresh grid in App
        cancelEdit();
      } else {
        // - CREATE new listing 
        const res = await fetch(`${API_URL}/api/properties`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Publish failed: ${res.status}`);
        const saved = await res.json();
        setSuccessMsg(`"${saved.title}" is now live on the platform!`);
        setForm(EMPTY_FORM);
        onListingPublished(saved);   // prepend to grid in App
      }
    } catch (err) {
      setErrorMsg(editingProperty
        ? '[x] Update failed. Check your connection and try again.'
        : '[x] Publish failed. Check your connection and try again.');
      console.error('Form submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };
  // - B) Delete listing --
  const handleDelete = async (property) => {
    const confirmed = window.confirm(
      `[!] Are you sure you want to permanently delete this listing?\n\n"${property.title}"\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(property.id);
    try {
      const res = await fetch(`${API_URL}/api/properties/${property.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      onListingDeleted(property.id);  // remove from grid in App
      // If the deleted property happened to be in edit mode, clear the form
      if (editingProperty?.id === property.id) cancelEdit();
      setSuccessMsg(`[del] "${property.title}" has been removed from the platform.`);
    } catch (err) {
      setErrorMsg('[x] Delete failed. Check your connection and try again.');
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };
  // - Reusable field renderer --
  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type} placeholder={placeholder} required={key !== 'image_url'}
        style={inputStyle} value={form[key]}
        onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); clearMessages(); }}
      />
    </div>
  );
  const isEditMode = !!editingProperty;
  if (!agentAgreed) return (
    <div style={{ maxWidth: '540px', margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
      {showAgentModal && <LegalModal type='agent' forceAccept={true} onClose={function(){ setShowAgentModal(false); }} onAccept={function(){ setAgentAgreed(true); setShowAgentModal(false); fetch(`${API_URL}/api/legal/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, user_email: user.email, agreement_type: 'agent_agreement', version: '1.0' }) }).catch(console.error); }} />}
      <div style={{ width: '56px', height: '56px', backgroundColor: '#f0fff4', border: '2px solid #86efac', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto', fontWeight: '800', fontSize: '1.4rem', color: '#27ae60' }}>A</div>
      <h2 style={{ color: '#0a2240', fontSize: '1.4rem', fontWeight: '800', margin: '0 0 10px 0' }}>Agent Agreement Required</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.65', margin: '0 0 24px 0' }}>Before listing on GetHome you must read and accept our Agent Agreement.</p>
      <button onClick={function(){ setShowAgentModal(true); }} style={{ padding: '13px 28px', border: 'none', borderRadius: '12px', backgroundColor: '#0a2240', color: '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer' }}>Read and Accept Agreement</button>
    </div>
  );
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* - Page header - */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <div style={{ backgroundColor: '#0a2240', borderRadius: '14px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}></span>
          </div>
          <div>
            <h2 style={{ color: '#0a2240', fontSize: '1.75rem', fontWeight: '900', margin: 0 }}>Agent Upload Portal</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
              Logged in as <strong style={{ color: '#27ae60' }}>{user?.email}</strong>
            </p>
          </div>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.93rem', margin: 0 }}>
          Publish new listings, edit existing ones, or delete outdated entries --- all changes reflect on the customer grid instantly.
        </p>
      </div>
      {/* - Section A: Publish / Edit form - */}
      <div id="agent-form-anchor" style={{ ...cardStyle, padding: '36px', marginBottom: '32px' }}>
        {/* Edit mode banner */}
        {isEditMode && (
          <div style={{ backgroundColor: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>[edit]</span>
              <div>
                <p style={{ margin: 0, fontWeight: '700', color: '#1e40af', fontSize: '0.92rem' }}>Editing existing listing</p>
                <p style={{ margin: '2px 0 0 0', color: '#3b82f6', fontSize: '0.83rem' }}>{editingProperty.title}</p>
              </div>
            </div>
            <button onClick={cancelEdit} style={{ backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
              x Cancel Edit
            </button>
          </div>
        )}
        {/* Success / error banners */}
        {successMsg && (
          <div style={{ backgroundColor: '#f0fff4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem' }}>[!]</span>
            <p style={{ margin: 0, color: '#166534', fontWeight: '600', fontSize: '0.92rem' }}>{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.1rem' }}>[!]</span>
            <p style={{ margin: 0, color: '#b91c1c', fontWeight: '600', fontSize: '0.92rem' }}>{errorMsg}</p>
          </div>
        )}
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {field('title', 'Property Listing Title', 'text', 'e.g., Luxury 4 Bedroom Duplex, Ikoyi')}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
            {field('location', 'Location / Area', 'text', 'e.g., Lekki Phase 1, Lagos')}
            <div>
              <label style={labelStyle}>Listing Purpose</label>
              <select style={inputStyle} value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                <option value="rent">For Rent</option>
                <option value="sale">For Sale</option>
              </select>
            </div>
          </div>
          {field('price', 'Price in Naira (NGN)', 'number', 'e.g., 4500000')}
          {field('image_url', 'Property Image URL (optional)', 'url', 'https://images.unsplash.com/...')}
          {/* Live image preview */}
          {form.image_url && (
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', maxHeight: '180px' }}>
              <img src={form.image_url} alt="Preview" style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
                onError={e => { e.target.style.display = 'none'; }} />
            </div>
          )}
          {/* Submit / update button */}
          <button type="submit" disabled={submitting} style={{
            padding: '15px', border: 'none', borderRadius: '12px',
            background: submitting ? '#94a3b8' : isEditMode
              ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
              : 'linear-gradient(135deg, #27ae60, #00b894)',
            color: '#fff', fontWeight: '700', fontSize: '1rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: submitting ? 'none' : isEditMode
              ? '0 4px 14px rgba(59,130,246,0.35)'
              : '0 4px 14px rgba(39,174,96,0.35)',
            transition: 'all 0.2s',
          }}>
            {submitting
              ? (isEditMode ? '[wait] Updating...' : '[wait] Publishing...')
              : (isEditMode ? '[save] Update Listing' : '[*] Publish Listing Live')}
          </button>
        </form>
      </div>
      {/* - Section B: Manage Listings grid - */}
      <div style={{ ...cardStyle, padding: '32px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ color: '#0a2240', fontSize: '1.1rem', fontWeight: '800', margin: '0 0 3px 0' }}>
              [list] Active Listings
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.83rem', margin: 0 }}>
              {allProperties.length} listing{allProperties.length !== 1 ? 's' : ''} currently on the platform
            </p>
          </div>
        </div>
        {/* Empty state */}
        {allProperties.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>[home]</div>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.93rem' }}>No listings yet. Publish your first property above.</p>
          </div>
        )}
        {/* Listings table */}
        {allProperties.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px', gap: '12px', padding: '10px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span>Title & Location</span>
              <span>Price</span>
              <span style={{ textAlign: 'center' }}>Status</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>
            {/* Listing rows */}
            {allProperties.map(property => {
              const isBeingEdited  = editingProperty?.id === property.id;
              const isBeingDeleted = deletingId === property.id;
              return (
                <div
                  key={property.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px',
                    gap: '12px', padding: '14px 16px', borderRadius: '12px',
                    border: `1.5px solid ${isBeingEdited ? '#93c5fd' : '#f1f5f9'}`,
                    backgroundColor: isBeingEdited ? '#eff6ff' : '#ffffff',
                    alignItems: 'center', transition: 'all 0.15s ease',
                  }}
                >
                  {/* Title + location */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: '700', color: '#0a2240', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {property.title}
                    </p>
                    <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {property.location}
                    </p>
                  </div>
                  {/* Price */}
                  <div>
                    <span style={{ fontWeight: '800', color: '#27ae60', fontSize: '0.88rem' }}>
                      {fmtNGN(property.price)}
                    </span>
                  </div>
                  {/* Status badge */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700',
                      backgroundColor: isBeingEdited ? '#dbeafe' : '#f0fff4',
                      color: isBeingEdited ? '#1e40af' : '#16a34a',
                      border: `1px solid ${isBeingEdited ? '#93c5fd' : '#86efac'}`,
                    }}>
                      {isBeingEdited ? '[edit] Editing' : 'Live'}
                    </span>
                  </div>
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => enterEditMode(property)}
                      disabled={isBeingDeleted}
                      title="Edit this listing"
                      style={{
                        padding: '7px 11px', border: 'none', borderRadius: '8px',
                        backgroundColor: isBeingEdited ? '#dbeafe' : '#f1f5f9',
                        color: isBeingEdited ? '#1e40af' : '#475569',
                        cursor: isBeingDeleted ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem', fontWeight: '700', transition: 'all 0.15s',
                      }}
                    >
                      [edit]
                    </button>
                    <button
                      onClick={() => handleDelete(property)}
                      disabled={isBeingDeleted}
                      title="Delete this listing"
                      style={{
                        padding: '7px 11px', border: 'none', borderRadius: '8px',
                        backgroundColor: isBeingDeleted ? '#f1f5f9' : '#fef2f2',
                        color: isBeingDeleted ? '#94a3b8' : '#ef4444',
                        cursor: isBeingDeleted ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem', fontWeight: '700', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}
                    >
                      {isBeingDeleted
                        ? <span style={{ display: 'inline-block', width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #cbd5e1', borderTopColor: '#94a3b8', animation: 'gh-spin 0.7s linear infinite' }} />
                        : '[del]'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Quick-tips footer */}
      <div style={{ ...cardStyle, padding: '20px 24px', marginTop: '20px' }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: '700', fontSize: '0.85rem', color: '#0a2240' }}>[tip] Quick Tips</p>
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#64748b', fontSize: '0.83rem', lineHeight: '1.9' }}>
          <li>Click <strong>[edit]</strong> to load a listing into the form above --- change any fields and hit <strong>Update Listing</strong>.</li>
          <li>Click <strong>[del]</strong> to permanently remove a listing. You will be asked to confirm first.</li>
          <li>All changes reflect on the customer grid <strong>instantly</strong> --- no page refresh needed.</li>
          <li>Price should be the annual rent or total sale price in Naira (no commas or currency symbols).</li>
        </ul>
      </div>
    </div>
  );
}
// =========================================================
// CLEANING QUOTE FORM
// =========================================================
function CleaningQuoteForm() {
  const [cleaningType, setCleaningType] = useState('Indoor');
  const [fumigation, setFumigation]     = useState(false);
  const [extraDetails, setExtraDetails] = useState('');
  const handleSend = () => {
    const msg =
      `Hello GetHome Agent , I'd like a *custom cleaning quote*.\n\n` +
      `*Service Type:* ${cleaningType} Cleaning\n` +
      `*Fumigation & Pest Control:* ${fumigation ? 'Yes, please include' : 'Not required'}\n` +
      `*Extra Details:* ${extraDetails.trim() || 'None provided'}\n\n` +
      `Please send me a custom quote at your earliest convenience. Thank you!`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <p style={labelStyle}>Type of Cleaning</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['Indoor', 'Outdoor', 'Both'].map(opt => (
            <button key={opt} onClick={() => setCleaningType(opt)} style={{
              padding: '10px 22px', borderRadius: '30px', fontSize: '0.9rem', fontWeight: '600',
              border: `2px solid ${cleaningType === opt ? '#27ae60' : '#e2e8f0'}`,
              backgroundColor: cleaningType === opt ? '#f0fff4' : '#fff',
              color: cleaningType === opt ? '#27ae60' : '#64748b',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {opt === 'Indoor' ? '[home] Indoor' : opt === 'Outdoor' ? ' Outdoor' : '[*] Both'}
            </button>
          ))}
        </div>
      </div>
      <div onClick={() => setFumigation(f => !f)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderRadius: '12px', cursor: 'pointer',
        border: `2px solid ${fumigation ? '#27ae60' : '#e2e8f0'}`,
        backgroundColor: fumigation ? '#f0fff4' : '#f8fafc', transition: 'all 0.15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}></span>
          <div>
            <p style={{ margin: 0, fontWeight: '700', color: '#0a2240', fontSize: '0.93rem' }}>Fumigation & Pest Control</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#7f8c8d' }}>Full compound spraying & rodent treatment</p>
          </div>
        </div>
        <div style={{ width: '46px', height: '26px', borderRadius: '13px', position: 'relative', backgroundColor: fumigation ? '#27ae60' : '#cbd5e1', transition: 'background-color 0.2s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: '3px', left: fumigation ? '22px' : '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Any other specific services or areas to clean?</label>
        <textarea rows={3} placeholder="e.g., focus on kitchen ceiling, scrub bathroom tiles, clean all window frames..."
          value={extraDetails} onChange={e => setExtraDetails(e.target.value)}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }} />
      </div>
      <button onClick={handleSend} style={{ width: '100%', padding: '15px', border: 'none', borderRadius: '12px', backgroundColor: '#25D366', color: '#fff', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}>
        <span style={{ fontSize: '1.2rem' }}>[chat]</span> Send to GetHome Agent to Get Your Quote
      </button>
    </div>
  );
}
// =========================================================
// MOVING QUOTE FORM
// =========================================================
function MovingQuoteForm() {
  const [from, setFrom]               = useState('');
  const [to, setTo]                   = useState('');
  const [hasAppliances, setHasAppliances] = useState(false);
  const [hasLuggage, setHasLuggage]   = useState(false);
  const [extraInfo, setExtraInfo]     = useState('');
  const handleSend = () => {
    if (!from.trim() || !to.trim()) { alert('Please fill in both your current location and destination.'); return; }
    const inventory = [hasAppliances && 'Large / Heavy Appliances & Equipment', hasLuggage && 'Luggage & Packed Boxes'].filter(Boolean).join(', ') || 'Not specified';
    const msg =
      `Hello GetHome Agent , I'd like a *custom moving & haulage quote*.\n\n` +
      `*Moving From:* ${from.trim()}\n*Moving To:* ${to.trim()}\n` +
      `*Items Inventory:* ${inventory}\n*Additional Info:* ${extraInfo.trim() || 'None provided'}\n\n` +
      `Please send me a custom quote at your earliest convenience. Thank you!`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  const checkRow = (icon, label, sub, checked, toggle) => (
    <div onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderRadius: '12px', cursor: 'pointer', border: `2px solid ${checked ? '#27ae60' : '#e2e8f0'}`, backgroundColor: checked ? '#f0fff4' : '#f8fafc', transition: 'all 0.15s' }}>
      <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${checked ? '#27ae60' : '#cbd5e1'}`, backgroundColor: checked ? '#27ae60' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
        {checked && <span style={{ color: '#fff', fontSize: '13px', fontWeight: '900', lineHeight: 1 }}>v</span>}
      </div>
      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      <div>
        <p style={{ margin: 0, fontWeight: '700', color: '#0a2240', fontSize: '0.92rem' }}>{label}</p>
        <p style={{ margin: '2px 0 0 0', fontSize: '0.79rem', color: '#7f8c8d' }}>{sub}</p>
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div><label style={labelStyle}>Moving From</label><input type="text" placeholder="e.g., Lekki Phase 1, Lagos" style={inputStyle} value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><label style={labelStyle}>Moving To</label><input type="text" placeholder="e.g., Abuja, Wuse 2" style={inputStyle} value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>
      <div>
        <p style={labelStyle}>Items Inventory</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {checkRow('', 'Large / Heavy Appliances & Equipment', 'Fridges, washing machines, generators, sofas, beds...', hasAppliances, () => setHasAppliances(v => !v))}
          {checkRow('', 'Luggage & Packed Boxes', 'Bags, cartons, clothing, kitchenware, small items...', hasLuggage, () => setHasLuggage(v => !v))}
        </div>
      </div>
      <div>
        <label style={labelStyle}>Additional information about your move</label>
        <textarea rows={3} placeholder="e.g., 3rd floor no elevator, fragile antique furniture, needs crane..."
          value={extraInfo} onChange={e => setExtraInfo(e.target.value)}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }} />
      </div>
      <button onClick={handleSend} style={{ width: '100%', padding: '15px', border: 'none', borderRadius: '12px', backgroundColor: '#25D366', color: '#fff', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}>
        <span style={{ fontSize: '1.2rem' }}>[chat]</span> Send to GetHome Agent to Get Your Quote
      </button>
    </div>
  );
}
// =========================================================
// AGENT UPGRADE PANEL
// =========================================================
function AgentUpgradePanel({ currentTier, agentEmail, onUpgradeSuccess }) {
  const [upgrading, setUpgrading] = useState(null);
  const handleUpgrade = (tierKey) => {
    const tier = AGENT_TIERS[tierKey];
    setUpgrading(tierKey);
    openPaystack({
      email: agentEmail, amountNaira: tier.price,
      ref: `GH-AGENT-${tierKey.toUpperCase()}-${Date.now()}`,
      metadata: { agent_email: agentEmail, upgrade_tier: tierKey },
      onSuccess: (response) => {
        fetch(`${API_URL}/api/agent/upgrade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: response.reference, tier: tierKey, agent_email: agentEmail }) })
          .then(r => r.json()).then(() => { alert(`[!] Upgraded to ${tier.label}!`); onUpgradeSuccess(tierKey); }).catch(() => alert('[!] Payment captured but sync failed. Contact support.'));
        setUpgrading(null);
      },
      onClose: () => setUpgrading(null),
    });
  };
  const tiers = [
    { key: 'free',    icon: '[home]', name: 'Free',         price: 'NGN0 / month',      limit: '3 listings',   perks: ['Basic exposure', 'Standard card'], cta: null },
    { key: 'premium', icon: '[star]', name: 'Premium Agent', price: 'NGN8,500 / month',  limit: '15 listings',  perks: ['[star] Verified badge', 'Priority placement', 'Pay-per-extra NGN1k'], cta: 'Upgrade to Premium' },
    { key: 'agency',  icon: '', name: 'Agency Plan',  price: 'NGN35,000 / month', limit: '100 listings', perks: ['Agency Profile page', '5 Featured/month', 'All Premium perks'], cta: 'Upgrade to Agency' },
  ];
  return (
    <div style={{ marginTop: '40px' }}>
      <h3 style={{ color: '#0a2240', fontSize: '1.1rem', fontWeight: '800', marginBottom: '4px' }}>[chart] Listing Tier Plans</h3>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '18px' }}>Current: <strong style={{ color: '#27ae60' }}>{AGENT_TIERS[currentTier]?.label}</strong></p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {tiers.map(t => {
          const isActive = currentTier === t.key, isLoad = upgrading === t.key;
          return (
            <div key={t.key} style={{ border: `2px solid ${isActive ? '#27ae60' : '#e2e8f0'}`, borderRadius: '16px', padding: '20px 16px', backgroundColor: isActive ? '#f0fff4' : '#fafafa', position: 'relative' }}>
              {isActive && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#27ae60', color: '#fff', fontSize: '0.68rem', fontWeight: '700', padding: '3px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>CURRENT</div>}
              <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{t.icon}</div>
              <h4 style={{ color: '#0a2240', margin: '0 0 3px 0', fontSize: '0.9rem', fontWeight: '800' }}>{t.name}</h4>
              <p style={{ color: '#27ae60', fontWeight: '700', fontSize: '0.82rem', margin: '0 0 5px 0' }}>{t.price}</p>
              <p style={{ color: '#64748b', fontSize: '0.77rem', margin: '0 0 10px 0' }}>{t.limit}</p>
              <ul style={{ paddingLeft: '14px', margin: '0 0 14px 0', color: '#94a3b8', fontSize: '0.76rem', lineHeight: '1.8' }}>
                {t.perks.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
              {t.cta && !isActive && <button onClick={() => handleUpgrade(t.key)} disabled={isLoad} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '8px', backgroundColor: isLoad ? '#94a3b8' : '#0a2240', color: '#fff', fontWeight: '700', fontSize: '0.8rem', cursor: isLoad ? 'not-allowed' : 'pointer' }}>{isLoad ? '[wait] Opening...' : t.cta}</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// =========================================================
// PROPERTY CARD
// =========================================================
function PropertyCard({ house, onSelect, agentTier }) {
  return (
    <div onClick={onSelect} style={{ ...cardStyle, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.22s ease, box-shadow 0.22s ease' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(10,34,64,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = cardStyle.boxShadow; }}>
      <div style={{ position: 'relative' }}>
        <img src={house.image_url} alt={house.title} style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80"; }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(transparent, rgba(10,34,64,0.35))' }} />
        <div style={{ position: 'absolute', top: '14px', left: '14px', backgroundColor: 'rgba(10,34,64,0.85)', backdropFilter: 'blur(4px)', color: '#fff', padding: '4px 11px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: '700' }}>VERIFIED</div>
        {agentTier && agentTier !== 'free' && <div style={{ position: 'absolute', top: '14px', right: '14px', backgroundColor: '#27ae60', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: '700' }}>[star] Verified Agent</div>}
      </div>
      <div style={{ padding: '22px 24px 24px' }}>
        <h3 style={{ margin: '0 0 6px 0', color: '#0a2240', fontSize: '1.02rem', fontWeight: '700', lineHeight: '1.4' }}>{house.title}</h3>
        <p style={{ color: '#94a3b8', margin: '0 0 18px 0', fontSize: '0.87rem' }}>{house.location}</p>
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '800', color: '#27ae60', fontSize: '1.12rem' }}>{fmtNGN(house.price)}</span>
          <span style={{ fontSize: '0.76rem', color: '#0a2240', backgroundColor: '#eef2f7', padding: '5px 11px', borderRadius: '20px', fontWeight: '600' }}>View Breakdown -{'>'}  </span>
        </div>
      </div>
    </div>
  );
}
// =========================================================
// PRICING MODAL
// =========================================================
function PricingModal({ property, onClose, user, onUserChange }) {
  const [addOns, setAddOns]               = useState({ cleaning: false, relocation: false });
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [inspectionMode, setInspectionMode] = useState('whatsapp');
  const [authWall, setAuthWall]           = useState(null);
  useEffect(() => {
    setAddOns({ cleaning: false, relocation: false });
    setPaymentStatus('idle'); setInspectionMode('whatsapp'); setAuthWall(null);
  }, [property?.id]);
  if (!property) return null;
  const rent       = Number(property.rent       || property.price || 0);
  const agencyFee  = Number(property.agency_fee    || 0);
  const agreeFee   = Number(property.agreement_fee || 0);
  const cautionFee = Number(property.caution_fee   || 0);
  const serviceChg = Number(property.service_charge|| 0);
  const baseTotal  = property.total_payment ? Number(property.total_payment) : rent + agencyFee + agreeFee + cautionFee + serviceChg;
  const addOnTotal = (addOns.cleaning ? ADDON_PRICES.cleaning : 0) + (addOns.relocation ? ADDON_PRICES.relocation : 0);
  const escrowFee  = Math.min(Math.round((baseTotal + addOnTotal) * ESCROW_FEE_RATE), ESCROW_FEE_CAP);
  const grandTotal = baseTotal + addOnTotal + escrowFee;
  const loanUrl    = `${LOAN_PARTNER_URL}?utm_source=gethome&utm_medium=referral&utm_campaign=property-loan&utm_content=${property.id}`;
  const feeRows    = [
    { label: 'Annual Baseline Rent',          amount: fmtNGN(rent),              color: '#0a2240' },
    { label: 'Agency Commission Fee',          amount: `+ ${fmtNGN(agencyFee)}`,  color: '#e67e22' },
    { label: 'Legal / Agreement Document Fee', amount: `+ ${fmtNGN(agreeFee)}`,   color: '#e67e22' },
    { label: 'Refundable Caution Deposit',     amount: `+ ${fmtNGN(cautionFee)}`, color: '#2980b9' },
    { label: 'Service / Maintenance Charge',   amount: `+ ${fmtNGN(serviceChg)}`, color: '#e67e22' },
  ];
  const requireAuth = (key) => { if (user) return true; setAuthWall(key); return false; };
  const handleAuthSuccess = (newUser) => {
    onUserChange(newUser); setAuthWall(null);
    if (authWall === 'escrow') setTimeout(() => triggerEscrow(newUser), 300);
    if (authWall === 'proxy')  setTimeout(() => triggerProxyInspection(newUser), 300);
    if (authWall === 'loan')   setTimeout(() => window.open(loanUrl, '_blank', 'noopener,noreferrer'), 300);
  };
  const handleWhatsAppInspection = () => {
    const msg = encodeURIComponent(`Hello GetHome Agent, I'd like to book a physical inspection for:\n\n*${property.title}*\n${property.location}\nID: ID: ${property.id || 'N/A'}${user ? `\n${user.email}` : ''}\n\nPlease confirm available slots. Thank you!`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  };
  const triggerProxyInspection = (u) => {
    const usr = u || user;
    openPaystack({ email: usr?.email || 'customer@gethome.ng', amountNaira: PROXY_INSPECTION_FEE, ref: `GH-INSP-${property.id}-${Date.now()}`,
      metadata: { type: 'proxy_inspection', property_id: property.id, user_email: usr?.email },
      onSuccess: (res) => { fetch(`${API_URL}/api/inspection-notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: res.reference, amount_naira: PROXY_INSPECTION_FEE, user_email: usr?.email, property_id: property.id, property_title: property.title, property_location: property.location }) }).catch(console.error); alert(`Proxy Inspection booked for ${property.title}! Video report within 48 hours.`); },
      onClose: () => {} });
  };
  const handleProxyInspection = () => { if (!requireAuth('proxy')) return; triggerProxyInspection(user); };
  const triggerEscrow = (u) => {
    const usr = u || user; setPaymentStatus('loading');
    openPaystack({ email: usr?.email || 'customer@gethome.ng', amountNaira: grandTotal, ref: `GH-ESC-${property.id}-${Date.now()}`,
      metadata: { user_id: usr?.id, property_id: property.id, add_ons: addOns, escrow_fee: escrowFee },
      onSuccess: (res) => { setPaymentStatus('success'); fetch(`${API_URL}/api/escrow-notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: res.reference, amount_naira: grandTotal, escrow_fee_naira: escrowFee, user_id: usr?.id, user_email: usr?.email, property_id: property.id, property_title: property.title, property_location: property.location, add_ons: addOns }) }).catch(console.error); },
      onClose: () => { if (paymentStatus !== 'success') setPaymentStatus('idle'); } });
  };
  const handleEscrowPayment = () => { if (!requireAuth('escrow')) return; triggerEscrow(user); };
  const handleLoanClick = (e) => { e.preventDefault(); if (!requireAuth('loan')) return; window.open(loanUrl, '_blank', 'noopener,noreferrer'); };
  const isPaid = paymentStatus === 'success';
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,34,64,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '24px', maxWidth: '620px', width: '100%', maxHeight: '93vh', overflowY: 'auto', padding: '40px', position: 'relative', boxShadow: '0 40px 80px rgba(10,34,64,0.2)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '38px', height: '38px', fontSize: '16px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>x</button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '4px', paddingRight: '40px', color: '#0a2240' }}>{property.title}</h2>
        <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '0.9rem' }}>{property.location}</p>
        {isPaid && <div style={{ backgroundColor: '#f0fff4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px' }}><span style={{ fontSize: '1.3rem' }}></span><div><p style={{ margin: 0, fontWeight: '700', color: '#166534' }}>Escrow Payment Confirmed!</p><p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: '#15803d' }}>Our ops team will begin your verification checklist shortly.</p></div></div>}
        <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '14px', color: '#0a2240' }}>[shield] Verified Fee Breakdown</h3>
        <div style={{ border: '1px solid #e8edf3', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 18px', background: '#f8fafc', fontWeight: '700', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}><span>Charge Category</span><span>Amount</span></div>
          {feeRows.map((row, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #f1f5f9', fontSize: '0.91rem' }}><span style={{ color: '#475569' }}>{row.label}</span><span style={{ fontWeight: '600', color: row.color }}>{row.amount}</span></div>))}
          {addOns.cleaning    && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #f1f5f9', fontSize: '0.91rem', backgroundColor: '#f0fff4' }}><span style={{ color: '#16a34a' }}> Deep Cleaning</span><span style={{ fontWeight: '600', color: '#16a34a' }}>+ {fmtNGN(ADDON_PRICES.cleaning)}</span></div>}
          {addOns.relocation  && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #f1f5f9', fontSize: '0.91rem', backgroundColor: '#f0fff4' }}><span style={{ color: '#16a34a' }}> Relocation & Haulage</span><span style={{ fontWeight: '600', color: '#16a34a' }}>+ {fmtNGN(ADDON_PRICES.relocation)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', backgroundColor: '#fafafa' }}><span style={{ color: '#94a3b8' }}>Escrow Processing Fee <span style={{ fontSize: '0.75rem' }}>(0.75%, max NGN5k)</span></span><span style={{ fontWeight: '600', color: '#94a3b8' }}>+ {fmtNGN(escrowFee)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 18px', background: '#f0fff4', color: '#15803d', fontWeight: '900', fontSize: '1.1rem' }}><span>Total Upfront Payment</span><span>{fmtNGN(grandTotal)}</span></div>
        </div>
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '14px', padding: '20px 22px', marginBottom: '22px', border: '1px solid #e8edf3' }}>
          <p style={{ margin: '0 0 16px 0', fontWeight: '700', fontSize: '0.88rem', color: '#0a2240' }}>[box] Optional Move-In Services <span style={{ fontWeight: '400', color: '#94a3b8' }}>(added to total)</span></p>
          {[{ key: 'cleaning', icon: '[clean]', label: 'Professional Deep Cleaning', price: fmtNGN(ADDON_PRICES.cleaning), sub: 'Full post-construction scrub & sanitisation' }, { key: 'relocation', icon: '[box]', label: 'Relocation & Haulage', price: fmtNGN(ADDON_PRICES.relocation), sub: 'Full packing, truck & interstate transport' }].map(a => (
            <label key={a.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer', marginBottom: '12px' }}>
              <input type="checkbox" checked={addOns[a.key]} onChange={e => setAddOns(p => ({ ...p, [a.key]: e.target.checked }))} style={{ width: '18px', height: '18px', accentColor: '#27ae60', cursor: 'pointer', marginTop: '3px', flexShrink: 0 }} />
              <span style={{ fontSize: '0.9rem', color: '#334155' }}>{a.icon} <strong>{a.label}</strong> --- {a.price}<span style={{ color: '#94a3b8', fontSize: '0.79rem', display: 'block', marginTop: '2px' }}>{a.sub}</span></span>
            </label>
          ))}
        </div>
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '14px', padding: '20px 22px',arginBottom: '22px' }}>
          <p style={{ margin: '0 0 14px 0', fontWeight: '700', fontSize: '0.88rem', color: '#0a2240' }}>[home] Inspection Option</p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            {[{ key: 'whatsapp', label: 'Free WhatsApp', sub: 'Coordinate with our agent' }, { key: 'proxy', label: ' Proxy --- NGN12,500', sub: 'We inspect & send video report' }].map(opt => (
              <div key={opt.key} onClick={() => setInspectionMode(opt.key)} style={{ flex: 1, border: `2px solid ${inspectionMode === opt.key ? '#27ae60' : '#e2e8f0'}`, borderRadius: '10px', padding: '12px', cursor: 'pointer', backgroundColor: inspectionMode === opt.key ? '#f0fff4' : '#fff', transition: 'all 0.15s' }}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '0.82rem', color: '#0a2240' }}>{opt.label}</p>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: '#94a3b8' }}>{opt.sub}</p>
              </div>
            ))}
          </div>
          {inspectionMode === 'whatsapp'
            ? <button onClick={handleWhatsAppInspection} style={{ width: '100%', padding: '12px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.91rem', cursor: 'pointer' }}> Open WhatsApp & Book Inspection</button>
            : <button onClick={handleProxyInspection}   style={{ width: '100%', padding: '12px', backgroundColor: '#0a2240', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.91rem', cursor: 'pointer' }}>[video] Pay & Book Proxy Inspection (NGN12,500)</button>}
        </div>
        <div style={{ backgroundColor: '#f0fff4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '14px 18px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}><div style={{ width: '30px', height: '30px', backgroundColor: '#27ae60', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900', fontSize: '0.85rem', flexShrink: 0 }}>S</div><div><p style={{ margin: '0 0 3px 0', fontWeight: '700', color: '#166534', fontSize: '0.84rem' }}>Why pay through GetHome?</p><p style={{ margin: 0, color: '#15803d', fontSize: '0.78rem', lineHeight: '1.5' }}>Your funds are held in escrow -- never released to the agent until you physically verify and approve the property. Zero risk of fraud.</p></div></div>
        <button onClick={handleEscrowPayment} disabled={isPaid || paymentStatus === 'loading'}
          style={{ width: '100%', padding: '15px', marginBottom: '12px', border: 'none', borderRadius: '12px', backgroundColor: isPaid ? '#94a3b8' : '#27ae60', color: '#fff', fontWeight: '700', fontSize: '1rem', cursor: (isPaid || paymentStatus === 'loading') ? 'not-allowed' : 'pointer', opacity: (isPaid || paymentStatus === 'loading') ? 0.75 : 1, boxShadow: isPaid ? 'none' : '0 4px 12px rgba(39,174,96,0.3)' }}>
          {isPaid ? 'Escrow Payment Complete' : paymentStatus === 'loading' ? '[wait] Opening payment...' : `Secure with Escrow Deposit --- ${fmtNGN(grandTotal)}`}
        </button>
        <a href={loanUrl} onClick={handleLoanClick} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', width: '100%', padding: '13px', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', color: '#0a2240', fontWeight: '600', fontSize: '0.91rem', textDecoration: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#27ae60'; e.currentTarget.style.backgroundColor = '#f0fff4'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}>
           Cannot afford upfront? <strong style={{ color: '#27ae60' }}>Apply for a Property Loan -{'>'}  </strong>
        </a>
        {authWall && <InlineAuthForm actionLabel={{ escrow: 'secure your escrow deposit', proxy: 'book a proxy inspection', loan: 'apply for a property loan' }[authWall]} onSuccess={handleAuthSuccess} />}
      </div>
    </div>
  );
}
// =========================================================
// MAIN APP
// =========================================================
function App() {
  var windowWidth = useWindowWidth();
  var isMobile = windowWidth < 768;
  usePaystackSDK();
  // AdMob setup - dormant until ENABLE_ADS = true
  useEffect(function() {
    if (!ENABLE_ADS) return;
    async function initAdMob() {
      try {
        // await AdMob.initialize({ requestTrackingAuthorization: true });
        // showBannerAd();
        console.log('AdMob initialized');
      } catch (e) {
        console.log('AdMob init failed or running in browser:', e);
      }
    }
    initAdMob();
  }, []);
  async function showBannerAd() {
    if (!ENABLE_ADS) return;
    try {
      // await AdMob.showBanner({ adId: AD_CONFIG.BANNER_ANDROID, adSize: 'BANNER', position: 'BOTTOM_CENTER', isTesting: true });
      console.log('Banner shown');
    } catch (e) { console.log('Banner failed:', e); }
  }
  async function hideBannerAd() {
    if (!ENABLE_ADS) return;
    try {
      // await AdMob.hideBanner();
      console.log('Banner hidden');
    } catch (e) { console.log('Banner hide failed:', e); }
  }
  async function removeBannerAd() {
    if (!ENABLE_ADS) return;
    try {
      // await AdMob.removeBanner();
      console.log('Banner removed');
    } catch (e) { console.log('Banner remove failed:', e); }
  }
  // End AdMob setup
  // - Auth ---
  const [user, setUser]               = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showNavAuth, setShowNavAuth] = useState(false);
  // - Data fetch states --
  const [properties, setProperties]   = useState([]);
  const [isLoading, setIsLoading]     = useState(true);   // true on first mount
  const [isError, setIsError]         = useState(false);
  const [message, setMessage]         = useState("Connecting...");
  // - Navigation 
  const [currentTab, setCurrentTab]             = useState('rent');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [activeQuote, setActiveQuote]           = useState(null);
  // - Agent portal 
  const [isRegistering, setIsRegistering]       = useState(false);
  const [isLoggedIn, setIsLoggedIn]             = useState(false);
  const [agentTier, setAgentTier]               = useState('free');
  const [agentListingCount, setAgentListingCount] = useState(0);
  const [agentForm, setAgentForm]               = useState({ name: '', email: '', agencyName: '', password: '' });
  const [newProperty, setNewProperty]           = useState({ title: '', location: '', price: '', image_url: '', purpose: 'rent' });
  // - Session restore -
  useEffect(() => {
    try {
      const s = localStorage.getItem('gh_user');
      if (s) setUser(JSON.parse(s));
    } catch { localStorage.removeItem('gh_user'); localStorage.removeItem('gh_token'); }
    setAuthChecked(true);
  }, []);
  // - Core data fetch --- wrapped in try/catch for error handling 
  // useCallback so the ErrorScreen's Retry button can call it directly
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      // Health check + properties in parallel
      const [healthRes, propsRes] = await Promise.all([
        fetch(`${API_URL}/`, { signal: AbortSignal.timeout(10000) }),
        fetch(`${API_URL}/api/properties`, { signal: AbortSignal.timeout(10000) }),
      ]);
      const healthText  = await healthRes.text();
      const propsData   = await propsRes.json();
      setMessage(healthText);
      setProperties(Array.isArray(propsData) ? propsData : []);
      setIsError(false);
    } catch (err) {
      console.error('Data fetch error:', err);
      // Any network failure, timeout, or parse error -> show the error screen
      setIsError(true);
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  // Run fetch after session check completes
  useEffect(() => {
    if (!authChecked) return;
    fetchData();
  }, [authChecked, fetchData]);
  // - Auth helpers 
  const handleUserChange = (u) => { setUser(u); setShowNavAuth(false); };
  const handleLogout = async () => {
    try { await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' }); } catch {}
    localStorage.removeItem('gh_user'); localStorage.removeItem('gh_token'); setUser(null);
  };
  // - Role check: is this user an agent or admin? 
  // Backend /api/auth/me returns { role } from the Supabase users table.
  // Roles that get the Agent Upload Portal: 'agent', 'admin'
  const isAgent = user?.role === 'agent' || user?.role === 'admin';
  // - Filtered listings --
  const rentProperties = (properties || []).filter(p => !String(p.title || '').toLowerCase().includes('sale'));
  const saleProperties = (properties || []).filter(p =>  String(p.title || '').toLowerCase().includes('sale'));
  // - Agent portal handlers ---
  const handleAgentAuth = (e) => {
    e.preventDefault();
    if (isRegistering) { alert(`Registration submitted for "${agentForm.agencyName}".`); setIsRegistering(false); }
    else setIsLoggedIn(true);
  };
  const submitProperty = () => {
    fetch(`${API_URL}/api/properties`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `${newProperty.title} (For ${newProperty.purpose.toUpperCase()})`, location: newProperty.location, price: newProperty.price, image_url: newProperty.image_url }),
    }).then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(saved => { setProperties(prev => [saved, ...prev]); setAgentListingCount(c => c + 1); setNewProperty({ title: '', location: '', price: '', image_url: '', purpose: 'rent' }); alert("[!] Property published!"); setCurrentTab(newProperty.purpose === 'sale' ? 'sale' : 'rent'); })
      .catch(() => alert("[x] Error publishing property."));
  };
  const handleAddProperty = (e) => {
    e.preventDefault();
    const limit = AGENT_TIERS[agentTier]?.listingLimit || 3;
    if (agentListingCount >= limit && agentTier === 'free') {
      if (!window.confirm(`Free tier limit (${limit}) reached.\nPay NGN1,000 to publish one extra listing?`)) return;
      openPaystack({ email: agentForm.email || user?.email || 'agent@gethome.ng', amountNaira: 1000, ref: `GH-PPL-${Date.now()}`, metadata: { type: 'pay_per_listing' }, onSuccess: () => submitProperty(), onClose: () => {} });
      return;
    }
    submitProperty();
  };
  // - Phase gates -
  // 1. Session not yet checked
  if (!authChecked) return <LoadingScreen />;
  // 2. Fetching data for first time
  if (isLoading) return <LoadingScreen />;
  // 3. Network error --- show retry screen
  if (isError) return <ErrorScreen onRetry={fetchData} />;
  // Services tab data
  const services = [
    { key: 'cleaning', icon: '', title: 'Professional Deep Cleaning', desc: "Full post-construction scrub, pre-move-in sanitisation, bathroom & kitchen deep cleans. Tailored to your property's exact needs.", tags: ['Indoor', 'Outdoor', 'Post-construction', 'Pre-move-in'], form: <CleaningQuoteForm /> },
    { key: 'moving',   icon: '', title: 'Relocation & Haulage',       desc: 'Full packing crew, moving truck & safe transport across town or state lines. We handle fragile items, heavy appliances, and everything in between.', tags: ['Local moves', 'Interstate', 'Packing service', 'Appliance handling'], form: <MovingQuoteForm /> },
  ];
  // - MAIN RENDER -
  return (
    <div style={{ fontFamily: '"Segoe UI", Roboto, Arial, sans-serif', color: '#0a2240', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      <style>{`@keyframes gh-spin { to { transform: rotate(360deg); } }`}</style>
      <PricingModal property={selectedProperty} onClose={() => setSelectedProperty(null)} user={user} onUserChange={handleUserChange} />
      {/* - NAV - */}
      <nav style={{ backgroundColor: '#0a2240', padding: isMobile ? '0 4%' : '0 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(10,34,64,0.2)', position: 'sticky', top: 0, zIndex: 999, height: isMobile ? '60px' : '68px' }}>
        <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px', cursor: 'pointer' }} onClick={() => setCurrentTab('rent')}>
          Get<span style={{ color: '#27ae60' }}>Home</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setCurrentTab('rent')}     style={navButtonStyle(currentTab === 'rent')}>For Rent</button>
          <button onClick={() => setCurrentTab('sale')}     style={navButtonStyle(currentTab === 'sale')}>For Sale</button>
          <button onClick={() => setCurrentTab('services')} style={navButtonStyle(currentTab === 'services')}>Services</button>
          {/* Agent Upload Portal tab --- only visible to agents/admins */}
          {isAgent && (
            <button onClick={() => setCurrentTab('upload')}
              style={{ ...navButtonStyle(currentTab === 'upload'), color: currentTab === 'upload' ? '#27ae60' : '#fbbf24', borderBottom: currentTab === 'upload' ? '3px solid #27ae60' : '3px solid transparent' }}>
              Upload Portal
            </button>
          )}
          <button onClick={() => setCurrentTab('agent')}
            style={{ marginLeft: '10px', background: 'linear-gradient(135deg, #27ae60, #00b894)', border: 'none', padding: '9px 18px', borderRadius: '8px', color: '#fff', fontSize: '0.88rem', cursor: 'pointer', fontWeight: '700' }}>
            {isLoggedIn ? 'Dashboard' : 'Agent Portal'}
          </button>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: '14px', marginLeft: '6px' }}>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
              <button onClick={handleLogout} style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Logout</button>
            </div>
          ) : (
            <div style={{ position: 'relative', borderLeft: '1px solid rgba(255,255,255,0.12)', paddingLeft: '14px', marginLeft: '6px' }}>
              <button onClick={() => setShowNavAuth(s => !s)} style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Sign In</button>
              {showNavAuth && (
                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 14px)', right: 0, width: '340px', backgroundColor: '#fff', borderRadius: '18px', boxShadow: '0 24px 60px rgba(10,34,64,0.18)', border: '1px solid #e2e8f0', zIndex: 1001, padding: '24px' }}>
                  <InlineAuthForm actionLabel="access your account" onSuccess={handleUserChange} />
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
      {showNavAuth && <div onClick={() => setShowNavAuth(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />}
      {/* Info bar */}
      {/* - PRIMARY CONTAINER - */}
      <div style={{ padding: '48px 5% 64px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* TAB: RENT */}
        {currentTab === 'rent' && (
          <section>
            <div style={{ marginBottom: '36px' }}>
              <h2 style={{ color: '#0a2240', fontSize: '1.9rem', fontWeight: '800', margin: '0 0 8px 0' }}>Properties For Rent</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>{rentProperties.length} verified listing{rentProperties.length !== 1 ? 's' : ''} available . Click any card to view full fee breakdown</p>
            </div>
            {rentProperties.length === 0
              ? <div style={{ ...cardStyle, textAlign: 'center', padding: '80px 40px' }}><div style={{ fontSize: '3rem', marginBottom: '16px' }}>[home]</div><p style={{ color: '#94a3b8', fontSize: '1.05rem', margin: 0 }}>No rental listings found. Check back shortly!</p></div>
              : <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '28px' }}>
                  {rentProperties.map(h => <PropertyCard key={h.id} house={h} onSelect={() => setSelectedProperty(h)} />)}
                </div>}
          </section>
        )}
        {/* TAB: SALE */}
        {currentTab === 'sale' && (
          <section>
            <div style={{ marginBottom: '36px' }}>
              <h2 style={{ color: '#0a2240', fontSize: '1.9rem', fontWeight: '800', margin: '0 0 8px 0' }}>Properties For Sale</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>{saleProperties.length} verified listing{saleProperties.length !== 1 ? 's' : ''} available . Click any card to view full fee breakdown</p>
            </div>
            {saleProperties.length === 0
              ? <div style={{ ...cardStyle, textAlign: 'center', padding: '80px 40px' }}><div style={{ fontSize: '3rem', marginBottom: '16px' }}>[house]</div><p style={{ color: '#94a3b8', fontSize: '1.05rem', margin: 0 }}>No sale listings registered. Check back shortly!</p></div>
              : <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '28px' }}>
                  {saleProperties.map(h => <PropertyCard key={h.id} house={h} onSelect={() => setSelectedProperty(h)} />)}
                </div>}
          </section>
        )}
        {/* TAB: SERVICES */}
        {currentTab === 'services' && (
          <section>
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#0a2240', fontSize: '1.9rem', fontWeight: '800', margin: '0 0 8px 0' }}>Premium Facility Services</h2>
              <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Every job is custom-scoped. Tell us what you need and we will send you an accurate quote via WhatsApp instantly.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {services.map(svc => {
                const isOpen = activeQuote === svc.key;
                return (
                  <div key={svc.key} style={{ ...cardStyle, overflow: 'hidden' }}>
                    <div onClick={() => setActiveQuote(isOpen ? null : svc.key)} style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', padding: '28px 32px', cursor: 'pointer' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '16px', backgroundColor: '#f0fff4', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>{svc.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ color: '#0a2240', fontSize: '1.15rem', fontWeight: '800', margin: '0 0 6px 0' }}>{svc.title}</h3>
                        <p style={{ color: '#64748b', margin: '0 0 14px 0', fontSize: '0.9rem', lineHeight: '1.6' }}>{svc.desc}</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {svc.tags.map(tag => <span key={tag} style={{ fontSize: '0.75rem', color: '#27ae60', backgroundColor: '#f0fff4', border: '1px solid #86efac', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' }}>{tag}</span>)}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <button style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', backgroundColor: isOpen ? '#f0fff4' : '#0a2240', color: isOpen ? '#27ae60' : '#fff', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {isOpen ? 'x Close Form' : 'Get a Free Custom Quote'}
                        </button>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ borderTop: '1px solid #e8edf3', padding: '32px', backgroundColor: '#fafbfc' }}>
                        <p style={{ margin: '0 0 24px 0', fontSize: '0.88rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>[chat]</span> Fill in your details below and we will compile them into a WhatsApp message for you.
                        </p>
                        {svc.form}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {/* TAB: AGENT UPLOAD PORTAL --- role-gated */}
        {currentTab === 'upload' && isAgent && (
          <AgentUploadPortal
            user={user}
            allProperties={properties}
            onListingPublished={(saved)    => setProperties(prev => [saved, ...prev])}
            onListingUpdated={(updated)    => setProperties(prev => prev.map(p => p.id === updated.id ? updated : p))}
            onListingDeleted={(deletedId)  => setProperties(prev => prev.filter(p => p.id !== deletedId))}
          />
        )}
        {/* Fallback if someone navigates to 'upload' without agent role */}
        {currentTab === 'upload' && !isAgent && (
          <div style={{ ...cardStyle, maxWidth: '480px', margin: '40px auto', padding: '48px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}></div>
            <h2 style={{ color: '#0a2240', fontWeight: '800', fontSize: '1.3rem', margin: '0 0 10px 0' }}>Agent Access Only</h2>
            <p style={{ color: '#64748b', fontSize: '0.93rem', lineHeight: '1.6', margin: 0 }}>This section is restricted to verified agents and admins. Please contact GetHome support to request agent access for your account.</p>
          </div>
        )}
        {/* TAB: AGENT PORTAL (subscription management) */}
        {currentTab === 'agent' && (
          <div>
            {!isLoggedIn ? (
              <div style={{ maxWidth: '500px', margin: '20px auto' }}>
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ color: '#0a2240', fontSize: '1.9rem', fontWeight: '800', margin: '0 0 8px 0' }}>Agent Portal</h2>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>List and manage properties on Nigeria verified real estate platform.</p>
                </div>
                <div style={{ ...cardStyle, padding: '40px' }}>
                  <h3 style={{ color: '#0a2240', textAlign: 'center', fontSize: '1.4rem', fontWeight: '800', margin: '0 0 28px 0' }}>{isRegistering ? 'Register Agency Profile' : 'Partner Dashboard Login'}</h3>
                  <form onSubmit={handleAgentAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {isRegistering && (<>
                      <div><label style={labelStyle}>Representative Full Name</label><input type="text" placeholder="Your full name" required style={inputStyle} onChange={e => setAgentForm({ ...agentForm, name: e.target.value })} /></div>
                      <div><label style={labelStyle}>Registered Company Name</label><input type="text" placeholder="Your agency name" required style={inputStyle} onChange={e => setAgentForm({ ...agentForm, agencyName: e.target.value })} /></div>
                    </>)}
                    <div><label style={labelStyle}>Corporate Email</label><input type="email" placeholder="email@agency.com" required style={inputStyle} onChange={e => setAgentForm({ ...agentForm, email: e.target.value })} /></div>
                    <div><label style={labelStyle}>Password</label><input type="password" placeholder="Your dashboard password" required style={inputStyle} onChange={e => setAgentForm({ ...agentForm, password: e.target.value })} /></div>
                    <button type="submit" style={{ padding: '14px', border: 'none', borderRadius: '10px', backgroundColor: '#0a2240', color: '#fff', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', marginTop: '4px' }}>{isRegistering ? 'Submit Application' : 'Authenticate Access'}</button>
                  </form>
                  <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#94a3b8', marginBottom: 0 }}>
                    {isRegistering ? 'Already onboarding houses?' : 'Want to list properties?'}{' '}
                    <span style={{ color: '#27ae60', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsRegistering(!isRegistering)}>{isRegistering ? 'Sign in here' : 'Register your agency'}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ color: '#0a2240', fontSize: '1.9rem', fontWeight: '800', margin: '0 0 8px 0' }}>Agent Dashboard</h2>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Manage your listings and upgrade your plan for more capacity.</p>
                </div>
                <div style={{ ...cardStyle, padding: '40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <h3 style={{ color: '#0a2240', margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: '800' }}>Welcome Back, Partner Agent</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        Tier: <strong style={{ color: '#27ae60' }}>{AGENT_TIERS[agentTier]?.label}</strong>
                        <span style={{ color: '#cbd5e1' }}>.</span> {agentListingCount} / {AGENT_TIERS[agentTier]?.listingLimit} listings used
                        {agentTier !== 'free' && <span style={{ backgroundColor: '#27ae60', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>[star] Verified Agent</span>}
                      </p>
                    </div>
                    <button onClick={() => setIsLoggedIn(false)} style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Logout</button>
                  </div>
                  {agentListingCount >= AGENT_TIERS[agentTier]?.listingLimit && (
                    <div style={{ backgroundColor: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
                      <p style={{ margin: 0, fontWeight: '700', color: '#92400e' }}>[!] Listing Limit Reached</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a16207' }}>Publish one extra for NGN1,000, or upgrade your tier below.</p>
                    </div>
                  )}
                  <form onSubmit={handleAddProperty} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div><label style={labelStyle}>Property Listing Title</label><input type="text" placeholder="e.g., Luxury 4 Bedroom Duplex" required style={inputStyle} value={newProperty.title} onChange={e => setNewProperty({ ...newProperty, title: e.target.value })} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                      <div><label style={labelStyle}>Location City / Area</label><input type="text" placeholder="e.g., Lekki Phase 1" required style={inputStyle} value={newProperty.location} onChange={e => setNewProperty({ ...newProperty, location: e.target.value })} /></div>
                      <div><label style={labelStyle}>Listing Purpose</label><select style={inputStyle} value={newProperty.purpose} onChange={e => setNewProperty({ ...newProperty, purpose: e.target.value })}><option value="rent">For Rent</option><option value="sale">For Sale</option></select></div>
                    </div>
                    <div><label style={labelStyle}>Price Value (NGN)</label><input type="number" placeholder="e.g., 4500000" required style={inputStyle} value={newProperty.price} onChange={e => setNewProperty({ ...newProperty, price: e.target.value })} /></div>
                    <div><label style={labelStyle}>Property Image URL</label><input type="url" placeholder="https://images.unsplash.com/..." style={inputStyle} value={newProperty.image_url} onChange={e => setNewProperty({ ...newProperty, image_url: e.target.value })} /></div>
                    <button type="submit" style={{ padding: '15px', border: 'none', borderRadius: '10px', background: 'linear-gradient(135deg, #27ae60, #00b894)', color: '#fff', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(39,174,96,0.3)' }}>[*] Publish Listing Live</button>
                  </form>
                  <AgentUpgradePanel currentTier={agentTier} agentEmail={agentForm.email || user?.email} onUpgradeSuccess={(t) => setAgentTier(t)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>{/* end container */}
  {/* ---- FOOTER ---- */}
  <footer style={{ backgroundColor: '#0a2240', color: 'rgba(255,255,255,0.7)', marginTop: 'auto' }}>
    <div style={{ padding: '60px 5% 40px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? '28px' : '40px', marginBottom: '48px' }}>
        {/* Brand */}
        <div>
          <h3 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: '900', margin: '0 0 12px 0' }}>
            Get<span style={{ color: '#27ae60' }}>Home</span>
          </h3>
          <p style={{ fontSize: '0.88rem', lineHeight: '1.7', color: 'rgba(255,255,255,0.55)', margin: '0 0 20px 0' }}>
            Nigeria verified real estate platform. Every naira paid through GetHome is held in escrow until you verify and approve --- zero risk of agent fraud.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'WhatsApp', href: 'https://wa.me/2349077246534', bg: '#25D366' },
              { label: 'Instagram', href: 'https://instagram.com/REPLACE_INSTAGRAM', bg: '#E1306C' },
              { label: 'Facebook', href: 'https://facebook.com/REPLACE_FACEBOOK', bg: '#1877F2' },
              { label: 'Twitter/X', href: 'https://twitter.com/REPLACE_TWITTER', bg: '#1DA1F2' },
            ].map(function(s) {
              return (
                <a key={s.label} href={s.href} target='_blank' rel='noopener noreferrer'
                  style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '8px', backgroundColor: s.bg, color: '#fff', fontSize: '0.76rem', fontWeight: '700', textDecoration: 'none' }}>
                  {s.label}
                </a>
              );
            })}
          </div>
        </div>
        {/* Quick Links */}
        <div>
          <h4 style={{ color: '#fff', fontSize: '0.88rem', fontWeight: '700', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Links</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Properties For Rent', tab: 'rent' },
              { label: 'Properties For Sale', tab: 'sale' },
              { label: 'Services', tab: 'services' },
              { label: 'Agent Portal', tab: 'agent' },
            ].map(function(link) {
              return (
                <button key={link.label} onClick={function(){ setCurrentTab(link.tab); }}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                  {link.label}
                </button>
              );
            })}
          </div>
        </div>
        {/* Services */}
        <div>
          <h4 style={{ color: '#fff', fontSize: '0.88rem', fontWeight: '700', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Our Services</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {['Escrow Deposit Protection', 'Proxy Property Inspection', 'Professional Deep Cleaning', 'Relocation and Haulage', 'Property Loan Referral'].map(function(s) {
              return <span key={s} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem' }}>{s}</span>;
            })}
          </div>
        </div>
        {/* Contact */}
        <div>
          <h4 style={{ color: '#fff', fontSize: '0.88rem', fontWeight: '700', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Us</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Email</p>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>REPLACE_WITH_CONTACT_EMAIL</span>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0 0 2px 0', textTransform: 'uppercase' }}>WhatsApp</p>
              <a href='https://wa.me/2349077246534' target='_blank' rel='noopener noreferrer' style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', textDecoration: 'none' }}>+2349077246534</a>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Website</p>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>REPLACE_WITH_YOUR_DOMAIN</span>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px', display: 'flex', justifyContent: isMobile ? 'center' : 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          {new Date().getFullYear()} GetHome. All rights reserved.
        </p>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(function(link) {
            return <span key={link} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>{link}</span>;
          })}
        </div>
      </div>
    </div>
  </footer>
  );
}
export default App;