import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Loader2, User, Phone, Mail, Lock, Building2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!window.navigator.onLine) {
      setError('Sign Up failed. Please check your internet connection.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Update Firebase Auth Profile
      await updateProfile(user, { displayName: formData.name });

      // Save user details to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        rent: 0,
        units: 0,
        rate: 8,
        meterPhoto: null,
        createdAt: new Date().toISOString()
      });

      navigate('/user');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/network-request-failed') {
        setError('Sign Up failed. Please check your internet connection.');
      } else {
        setError(err.message || 'Failed to create an account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: '100vh', position: 'relative', padding: '1.5rem 1rem' }}>
      {/* Ambient Glow background */}
      <div style={{
        position: 'absolute',
        top: '25%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(255, 42, 133, 0.22) 0%, rgba(255, 184, 0, 0.15) 50%, rgba(0, 0, 0, 0) 75%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', zIndex: 1, backdropFilter: 'blur(20px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 1.25rem',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, rgba(255, 42, 133, 0.2) 0%, rgba(255, 184, 0, 0.2) 100%)',
            border: '1px solid rgba(255, 42, 133, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(255, 42, 133, 0.35)'
          }}>
            <Building2 size={32} style={{ color: 'var(--accent-rose)' }} />
          </div>
          <h1 className="gradient-text" style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.4rem' }}>
            Create Account
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>Sign up as a Tenant to track your rent & bills</p>
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

        <form onSubmit={handleSignUp}>
          <div className="input-group">
            <label htmlFor="name">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                id="name" 
                name="name"
                className="input-field" 
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                style={{ paddingLeft: '2.6rem' }}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="phone">Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="tel" 
                id="phone" 
                name="phone"
                className="input-field" 
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={handleChange}
                style={{ paddingLeft: '2.6rem' }}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                id="email" 
                name="email"
                className="input-field" 
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                className="input-field" 
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                style={{ paddingLeft: '2.6rem' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem 1.5rem', fontSize: '1rem' }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><UserPlus size={20} /> Complete Sign Up</>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
          <Link to="/" style={{ color: '#a5b4fc', textDecoration: 'none', fontWeight: '600', marginLeft: '0.25rem' }}>
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}

