import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home, Zap, Bell, Calendar, Loader2, Camera, FileText, UserCircle2, ArrowRight } from 'lucide-react';
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
    const handlePopState = () => {
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
        <Loader2 className="animate-spin" size={48} color="var(--accent-indigo)" />
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
  
  const prevRemaining = data?.prevRemaining || 0;
  const grandTotal = data?.grandTotal || (rent + totalLightBill + prevRemaining);
  const paidAmount = data?.paidAmount || 0;
  const remainingBalance = data?.remainingBalance !== undefined ? data.remainingBalance : Math.max(0, grandTotal - paidAmount);
  
  const showReminder = isMonthEnd && (remainingBalance > 0 || grandTotal > 0);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header Section */}
      <header className="glass-card" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', background: 'var(--bg-glass-elevated)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(255, 184, 0, 0.2) 0%, rgba(255, 42, 133, 0.2) 100%)',
              border: '1px solid rgba(255, 184, 0, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserCircle2 size={32} style={{ color: 'var(--accent-gold)' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Hello, {name}</h1>
                <span className="badge badge-indigo">Tenant Dashboard</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{currentUser?.email}</p>
              {data?.startDate && data?.endDate && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.825rem', color: '#ffca28', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={14} /> Cycle: {new Date(data.startDate).toLocaleDateString()} - {new Date(data.endDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/history')}>
              <FileText size={18} style={{ color: '#fbbf24' }} /> View History
            </button>
            <button className="btn btn-danger" style={{ padding: '0.65rem 1.1rem' }} onClick={handleLogout}>
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Reminder Banner */}
      {showReminder && (
        <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-gold)', background: 'rgba(255, 184, 0, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(255, 184, 0, 0.2)' }}>
              <Bell color="#ffca28" size={24} />
            </div>
            <div>
              <h3 style={{ color: '#ffca28', marginBottom: '0.25rem', fontSize: '1.1rem' }}>Month End Reminder</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Please clear your rent and electricity dues by the 5th of next month.</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="dashboard-grid">
        {/* Monthly Rent Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(0, 230, 118, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Home color="var(--success)" size={22} />
              </div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Monthly Rent</h2>
            </div>
            <span className="badge badge-success">Fixed</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{rent}</div>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>Due for current month cycle</p>
        </div>

        {/* Electricity Bill Card (Spans 2 rows) */}
        <div className="glass-card" style={{ gridRow: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255, 184, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap color="#ffb800" size={22} />
              </div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Electricity Bill</h2>
            </div>
            <span className="badge badge-warning">Variable</span>
          </div>

          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{totalLightBill}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem', fontWeight: 500 }}>
            <span style={{ color: '#ffca28', fontWeight: 700 }}>{totalLightUnits} Units</span> used @ ₹{lightRate}/unit
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Meter 1 Breakdown */}
            <div style={{ background: 'rgba(11, 13, 20, 0.6)', padding: '1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#ffe082', fontSize: '0.92rem' }}>Meter 1 Breakdown</span>
                <span className="badge badge-indigo">{m1_units} Units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Prev: <strong style={{ color: 'var(--text-primary)' }}>{m1_prev}</strong></div>
                  {data?.m1_prev_photo ? (
                    <button className="btn btn-secondary" style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem', gap: '0.3rem' }} onClick={() => handleOpenImage(data.m1_prev_photo)}>
                      <Camera size={13} style={{ color: 'var(--accent-gold)' }} /> Prev Photo
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.3rem 0' }}>No photo</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Curr: <strong style={{ color: 'var(--text-primary)' }}>{m1_curr}</strong></div>
                  {data?.m1_curr_photo ? (
                    <button className="btn btn-secondary" style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem', gap: '0.3rem' }} onClick={() => handleOpenImage(data.m1_curr_photo)}>
                      <Camera size={13} style={{ color: 'var(--accent-gold)' }} /> Curr Photo
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.3rem 0' }}>No photo</div>
                  )}
                </div>
              </div>
            </div>

            {/* Meter 2 Breakdown */}
            <div style={{ background: 'rgba(11, 13, 20, 0.6)', padding: '1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#ffe082', fontSize: '0.92rem' }}>Meter 2 Breakdown</span>
                <span className="badge badge-indigo">{m2_units} Units</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Prev: <strong style={{ color: 'var(--text-primary)' }}>{m2_prev}</strong></div>
                  {data?.m2_prev_photo ? (
                    <button className="btn btn-secondary" style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem', gap: '0.3rem' }} onClick={() => handleOpenImage(data.m2_prev_photo)}>
                      <Camera size={13} style={{ color: 'var(--accent-gold)' }} /> Prev Photo
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.3rem 0' }}>No photo</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Curr: <strong style={{ color: 'var(--text-primary)' }}>{m2_curr}</strong></div>
                  {data?.m2_curr_photo ? (
                    <button className="btn btn-secondary" style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem', gap: '0.3rem' }} onClick={() => handleOpenImage(data.m2_curr_photo)}>
                      <Camera size={13} style={{ color: 'var(--accent-gold)' }} /> Curr Photo
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.3rem 0' }}>No photo</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Total Due & Financial Summary Card */}
        {(() => {
          const currentMonthRent = rent || 0;
          const currentMonthLightBill = totalLightBill || 0;

          const isPrevPaid = data?.billStatus === 'PAID';
          const prevArrears = isPrevPaid ? 0 : (data?.prevRemaining || 0);
          const totalCycleDue = currentMonthRent + currentMonthLightBill + prevArrears;

          const paidAmt = isPrevPaid ? 0 : (data?.paidAmount || 0);
          const remBal = Math.max(0, totalCycleDue - paidAmt);

          const isFullyPaid = totalCycleDue === 0 || (paidAmt >= totalCycleDue && totalCycleDue > 0);

          const displayGrandTotal = isFullyPaid ? 0 : remBal;
          const displayPaidAmount = isFullyPaid ? 0 : paidAmt;
          const displayArrears = isFullyPaid ? 0 : prevArrears;
          const displayStatus = isFullyPaid ? 'PAID' : (paidAmt > 0 && remBal > 0 ? 'PAID WITH REMAINING BALANCE' : 'UNPAID');

          return (
            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(18, 21, 32, 0.95) 0%, rgba(26, 31, 46, 0.85) 100%)', border: '1px solid rgba(255, 184, 0, 0.35)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255, 184, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar color="#ffca28" size={22} />
                  </div>
                  <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Bill Statement</h2>
                </div>
                <span className={displayStatus === 'PAID' ? 'badge badge-success' : (displayStatus === 'PAID WITH REMAINING BALANCE' ? 'badge badge-warning' : 'badge badge-danger')}>
                  {displayStatus}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {displayArrears > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffca28' }}>
                    <span>Last Month Arrears:</span>
                    <span>+ ₹{displayArrears}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Grand Total Due:</span>
                  <span className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800 }}>₹{displayGrandTotal}</span>
                </div>
                {displayPaidAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#00e676', fontWeight: 600 }}>
                    <span>Paid Amount:</span>
                    <span>₹{displayPaidAmount}</span>
                  </div>
                )}
                {remBal > 0 && displayPaidAmount > 0 && !isFullyPaid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff77b2', fontWeight: 700, paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
                    <span>Remaining Balance:</span>
                    <span style={{ fontSize: '1.2rem' }}>₹{remBal}</span>
                  </div>
                )}
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.9rem', fontSize: '1.05rem' }}
                disabled={isFullyPaid}
                onClick={() => navigate('/pay', { state: { totalDue: displayGrandTotal } })}
              >
                {isFullyPaid ? 'Bill Paid (₹0 Due) ✓' : <>Pay Now <ArrowRight size={18} /></>}
              </button>
            </div>
          );
        })()}
      </div>

      {/* Image Zoom Modal */}
      {viewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5, 8, 15, 0.95)', backdropFilter: 'blur(16px)', zIndex: 9999 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(9, 13, 22, 0.8)', zIndex: 2, borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="btn btn-secondary" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', fontWeight: 'bold' }}>−</button>
              <span className="badge badge-indigo" style={{ padding: '0.4rem 0.8rem' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="btn btn-secondary" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', fontWeight: 'bold' }}>+</button>
            </div>
            <button onClick={handleCloseImage} className="btn btn-danger" style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-full)' }}>✕ Close</button>
          </div>
          <img 
            src={viewImage} 
            alt="Meter Reading" 
            style={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) scale(${zoom})`,
              maxWidth: '92vw', 
              maxHeight: '82vh',
              objectFit: 'contain',
              display: 'block',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }} 
          />
        </div>
      )}
    </div>
  );
}

