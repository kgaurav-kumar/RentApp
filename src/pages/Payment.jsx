import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Banknote, CheckCircle2, Download } from 'lucide-react';

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

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'RentApp_UPI_QR.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading QR:", error);
      alert("Failed to download QR code. Please try again or take a screenshot.");
    }
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '500px', margin: '0 auto', paddingTop: '2rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/user')} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Make Payment</h1>
      </header>

      <div className="glass-card" style={{ textAlign: 'center', marginBottom: '2rem', padding: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>Total Amount Due</p>
        <h2 style={{ fontSize: '3.5rem', margin: '0.5rem 0', color: 'var(--text-primary)' }}>₹{totalDue}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          className="btn" 
          onClick={() => setPaymentMethod('online')}
          style={{ 
            backgroundColor: paymentMethod === 'online' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
            border: paymentMethod === 'online' ? '1px solid var(--accent-primary)' : '1px solid transparent',
            color: paymentMethod === 'online' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Smartphone size={24} />
          <span style={{ fontWeight: '600' }}>Pay Online / UPI</span>
        </button>

        <button 
          className="btn" 
          onClick={() => setPaymentMethod('cash')}
          style={{ 
            backgroundColor: paymentMethod === 'cash' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
            border: paymentMethod === 'cash' ? '1px solid var(--success)' : '1px solid transparent',
            color: paymentMethod === 'cash' ? 'var(--success)' : 'var(--text-secondary)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Banknote size={24} />
          <span style={{ fontWeight: '600' }}>Pay by Cash</span>
        </button>
      </div>

      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', minHeight: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {paymentMethod === 'online' ? (
          <div className="animate-fade-in">
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Scan to Pay with any UPI App</h3>
            <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '1.5rem' }}>
              <img src={qrCodeUrl} alt="UPI QR Code" style={{ width: '200px', height: '200px', display: 'block' }} />
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>Paying to: <strong style={{ color: 'var(--text-primary)' }}>{upiName}</strong></p>
            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>{upiId}</p>
            <p style={{ color: 'var(--accent-primary)', margin: '1.5rem 0 0.5rem 0', fontSize: '0.85rem', fontWeight: '500' }}>Note: Payment is updated in 30min after the payment.</p>
            <button 
              className="btn btn-primary" 
              onClick={handleDownloadQR} 
              style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              <Download size={16} /> Download QR Code
            </button>

            <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Or pay directly using your favorite app:</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <a href={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${totalDue}&cu=INR`} target="_top" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '4px' }}>
                    <img src="/GooglePay.Logo.png" alt="Google Pay" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '500' }}>GPay</span>
                </a>
                <a href={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${totalDue}&cu=INR`} target="_top" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '4px' }}>
                    <img src="/phonepay.logo.png" alt="PhonePe" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '500' }}>PhonePe</span>
                </a>
                <a href={`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${totalDue}&cu=INR`} target="_top" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '4px' }}>
                    <img src="/paytm.logo.png" alt="Paytm" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: '500' }}>Paytm</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <Banknote size={40} color="var(--success)" />
            </div>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Cash Payment</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Please hand over the cash amount of <strong>₹{totalDue}</strong> directly to <strong>{upiName}</strong>.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem', color: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle2 size={18} />
              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Receipt will be updated by Admin</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
