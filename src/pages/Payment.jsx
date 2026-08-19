import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Banknote, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' or 'cash'

  // Get the total due passed from the UserDashboard, default to 0 if accessed directly
  const totalDue = location.state?.totalDue || 0;

  // Generate dynamic UPI URL with the exact amount
  const upiId = "9520673658@pthdfc";
  const upiName = "Gaurav Kumar";
  const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${totalDue}&cu=INR`;
  
  // Use a reliable QR code generation API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '520px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <header className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem', padding: '1rem 1.25rem', background: 'var(--bg-glass-elevated)' }}>
        <button onClick={() => navigate('/user')} className="btn btn-secondary" style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Make Payment</h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Instant UPI & Cash Confirmation</p>
        </div>
      </header>

      {/* Amount Display */}
      <div className="glass-card" style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '2rem 1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
        <span className="badge badge-indigo" style={{ marginBottom: '0.5rem' }}>Total Payable Dues</span>
        <h2 className="gradient-text" style={{ fontSize: '3.6rem', fontWeight: 800, margin: '0.2rem 0 0.5rem', letterSpacing: '-0.03em' }}>
          ₹{totalDue}
        </h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={15} style={{ color: 'var(--success)' }} /> Encrypted & Secure Checkout
        </div>
      </div>

      {/* Payment Method Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.5rem' }}>
        <button 
          className="btn" 
          onClick={() => setPaymentMethod('online')}
          style={{ 
            backgroundColor: paymentMethod === 'online' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(9, 13, 22, 0.6)',
            border: paymentMethod === 'online' ? '1px solid var(--accent-indigo)' : '1px solid var(--border-color)',
            color: paymentMethod === 'online' ? '#a5b4fc' : 'var(--text-secondary)',
            padding: '1.1rem 0.8rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: paymentMethod === 'online' ? 'var(--glow-indigo)' : 'none'
          }}
        >
          <Smartphone size={24} style={{ color: paymentMethod === 'online' ? 'var(--accent-indigo)' : 'inherit' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Pay Online / UPI</span>
        </button>

        <button 
          className="btn" 
          onClick={() => setPaymentMethod('cash')}
          style={{ 
            backgroundColor: paymentMethod === 'cash' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(9, 13, 22, 0.6)',
            border: paymentMethod === 'cash' ? '1px solid var(--success)' : '1px solid var(--border-color)',
            color: paymentMethod === 'cash' ? '#34d399' : 'var(--text-secondary)',
            padding: '1.1rem 0.8rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: paymentMethod === 'cash' ? 'var(--glow-emerald)' : 'none'
          }}
        >
          <Banknote size={24} style={{ color: paymentMethod === 'cash' ? 'var(--success)' : 'inherit' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Pay by Cash</span>
        </button>
      </div>

      {/* Payment Details Container */}
      <div className="glass-card" style={{ padding: '2rem 1.5rem', textAlign: 'center', minHeight: '360px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {paymentMethod === 'online' ? (
          <div className="animate-fade-in">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#a5b4fc', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              <QrCode size={20} /> Scan QR with any UPI App
            </div>

            <div style={{
              background: '#ffffff',
              padding: '1.2rem',
              borderRadius: 'var(--radius-lg)',
              display: 'inline-block',
              marginBottom: '1.5rem',
              boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
              border: '2px solid rgba(99, 102, 241, 0.3)'
            }}>
              <img src={qrCodeUrl} alt="UPI QR Code" style={{ width: '200px', height: '200px', display: 'block', borderRadius: '4px' }} />
            </div>

            <div style={{ background: 'rgba(9, 13, 22, 0.6)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.82rem' }}>Payee Name: <strong style={{ color: 'var(--text-primary)' }}>{upiName}</strong></p>
              <p style={{ color: '#a5b4fc', margin: '0.2rem 0 0 0', fontSize: '0.9rem', fontWeight: 600 }}>{upiId}</p>
            </div>

            <p style={{ color: '#fbbf24', margin: '0.5rem 0', fontSize: '0.82rem', fontWeight: 500 }}>
              ⚡ Payment status is verified & updated within 30 mins after transfer.
            </p>

            <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Or pay directly using your mobile app:</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <a href={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${totalDue}&cu=INR`} target="_top" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', overflow: 'hidden', padding: '4px', transition: 'transform 0.2s' }}>
                    <img src="/GooglePay.Logo.png" alt="Google Pay" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>GPay</span>
                </a>
                <a href={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${totalDue}&cu=INR`} target="_top" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', overflow: 'hidden', padding: '4px', transition: 'transform 0.2s' }}>
                    <img src="/phonepay.logo.png" alt="PhonePe" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>PhonePe</span>
                </a>
                <a href={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${totalDue}&cu=INR`} target="_top" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', overflow: 'hidden', padding: '4px', transition: 'transform 0.2s' }}>
                    <img src="/paytm.logo.png" alt="Paytm" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>Paytm</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <Banknote size={42} color="var(--success)" />
            </div>
            <h3 style={{ marginBottom: '0.75rem', color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: 800 }}>Cash Handover Payment</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Please hand over the exact cash amount of <strong style={{ color: '#34d399', fontSize: '1.1rem' }}>₹{totalDue}</strong> directly to <strong style={{ color: 'var(--text-primary)' }}>{upiName}</strong>.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem', color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <CheckCircle2 size={20} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Admin will mark receipt as PAID upon receiving cash</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

