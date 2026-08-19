import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Loader2, Mail, Lock, Building2 } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!window.navigator.onLine) {
      setError('Login failed!. Please check your internet connection.');
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The AuthContext and App.jsx routing will automatically redirect the user
      // so we don't strictly need to navigate here, but we can do a fallback or just wait.
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/network-request-failed') {
        setError('Login failed. Please check your internet connection.');
      } else {
        setError('Invalid email or password.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: '100vh', position: 'relative', padding: '1.5rem 1rem' }}>
      {/* Ambient Glow background elements */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '340px',
        height: '340px',
        background: 'radial-gradient(circle, rgba(255, 184, 0, 0.22) 0%, rgba(255, 42, 133, 0.15) 50%, rgba(0, 0, 0, 0) 75%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', zIndex: 1, backdropFilter: 'blur(20px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 1.25rem',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.2) 0%, rgba(255, 42, 133, 0.2) 100%)',
            border: '1px solid rgba(255, 184, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(255, 184, 0, 0.35)'
          }}>
            <Building2 size={32} style={{ color: 'var(--accent-gold)' }} />
          </div>
          <h1 className="gradient-text" style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.4rem' }}>
            RentalOP Welcomes You!
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>Login to access your dashboard</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fb7185',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                id="email" 
                className="input-field" 
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.6rem' }}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '1.75rem' }}>
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                id="password" 
                className="input-field" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.6rem' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem 1.5rem', fontSize: '1rem' }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={20} /> Login to Dashboard</>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Don't have an account? </span>
          <Link to="/signup" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: '600', marginLeft: '0.25rem' }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

