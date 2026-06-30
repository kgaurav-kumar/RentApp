import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, Zap, Bell, Calendar, Loader2, Camera } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';


export default function UserDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewImage, setViewImage] = useState(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handlePopState = (e) => {
      if (viewImage) {
        setViewImage(null);
        setZoom(1);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewImage]);

  const handleOpenImage = (url) => {
    setViewImage(url);
    window.history.pushState({ imageModal: true }, '');
  };

  const handleCloseImage = () => {
    setViewImage(null);
    setZoom(1);
    if (window.history.state && window.history.state.imageModal) {
      window.history.back();
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "users"), where("email", "==", currentUser.email));
    const unsub = onSnapshot(q, 
      (snapshot) => {
        if (!snapshot.empty) {
          setData(snapshot.docs[0].data());
        } else {
          setData({ 
            name: currentUser.displayName || currentUser.email.split('@')[0], 
            rent: 0, rate: 8, m1_prev: 0, m1_curr: 0, m2_prev: 0, m2_curr: 0 
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        alert("Could not load your data. Please check Firebase Firestore Rules.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  const currentDate = new Date();
  const isMonthEnd = currentDate.getDate() >= 25; // Show reminder after 25th

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" />
      </div>
    );
  }

  const name = data?.name || 'Tenant';
  const rent = data?.rent || 0;
  const lightRate = data?.rate || 8;
  
  const m1_prev = data?.m1_prev || 0;
  const m1_curr = data?.m1_curr || 0;
  const m1_units = Math.max(0, m1_curr - m1_prev);

  const m2_prev = data?.m2_prev || 0;
  const m2_curr = data?.m2_curr || 0;
  const m2_units = Math.max(0, m2_curr - m2_prev);

  const totalLightUnits = m1_units + m2_units;
  const totalLightBill = totalLightUnits * lightRate;
  
  const totalDue = rent + totalLightBill;
  const showReminder = isMonthEnd && totalDue > 0;

  return (
    <div className="container animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>Hello, {name}</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{currentUser?.email}</p>
          <p style={{ margin: 0, marginTop: '0.25rem' }}>Your Dashboard</p>
        </div>
        <button className="btn" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} onClick={handleLogout}>
          <LogOut size={18} /> Logout
        </button>
      </header>

      {showReminder && (
        <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-primary)', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <Bell color="var(--accent-primary)" style={{ marginTop: '0.25rem' }} />
            <div>
              <h3 style={{ color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>Month End Reminder</h3>
              <p style={{ margin: 0 }}>Please clear your rent and electricity dues by the 5th of next month.</p>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <Home color="var(--success)" size={24} />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Monthly Rent</h2>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>₹{rent}</div>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Due for current month</p>
        </div>

        <div className="glass-card" style={{ gridRow: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <Zap color="#f59e0b" size={24} />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Electricity Bill</h2>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>₹{totalLightBill}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {totalLightUnits} Total Units used @ ₹{lightRate}/unit
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Meter 1 Breakdown */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>Meter 1 Breakdown</span>
                <span style={{ fontWeight: 'bold' }}>Total: {m1_units} Units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Previous: {m1_prev}</div>
                  {data?.m1_prev_photo ? (
                    <button className="btn" style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => handleOpenImage(data.m1_prev_photo)}>
                      <Camera size={12} style={{ marginRight: '0.25rem' }} /> Prev Photo
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No photo</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Current: {m1_curr}</div>
                  {data?.m1_curr_photo ? (
                    <button className="btn" style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => handleOpenImage(data.m1_curr_photo)}>
                      <Camera size={12} style={{ marginRight: '0.25rem' }} /> Curr Photo
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No photo</div>
                  )}
                </div>
              </div>
            </div>

            {/* Meter 2 Breakdown */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>Meter 2 Breakdown</span>
                <span style={{ fontWeight: 'bold' }}>Total: {m2_units} Units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Previous: {m2_prev}</div>
                  {data?.m2_prev_photo ? (
                    <button className="btn" style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => handleOpenImage(data.m2_prev_photo)}>
                      <Camera size={12} style={{ marginRight: '0.25rem' }} /> Prev Photo
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No photo</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Current: {m2_curr}</div>
                  {data?.m2_curr_photo ? (
                    <button className="btn" style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => handleOpenImage(data.m2_curr_photo)}>
                      <Camera size={12} style={{ marginRight: '0.25rem' }} /> Curr Photo
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No photo</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <Calendar color="#8b5cf6" size={24} />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Total Due</h2>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>₹{rent + totalLightBill}</div>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            onClick={() => navigate('/pay', { state: { totalDue: rent + totalLightBill } })}
          >
            Pay Now
          </button>
        </div>
      </div>

      {viewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2 }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.25rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <button onClick={() => setZoom(1)} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '0 0.75rem', height: '36px', borderRadius: '1rem', fontSize: '0.8rem', cursor: 'pointer' }}>{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.25rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
            <button onClick={handleCloseImage} style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '2rem', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>✕ Close</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitOverflowScrolling: 'touch' }}>
            <img 
              src={viewImage} 
              alt="Meter Reading" 
              style={{ 
                maxWidth: zoom <= 1 ? '95vw' : 'none', 
                maxHeight: zoom <= 1 ? 'calc(100vh - 80px)' : 'none',
                width: zoom > 1 ? `${95 * zoom}vw` : 'auto',
                objectFit: 'contain',
                display: 'block',
                transform: zoom < 1 ? `scale(${zoom})` : 'none'
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
