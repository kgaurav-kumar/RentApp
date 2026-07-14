import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Calendar, Bolt, IndianRupee, Trash2, Download } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import html2canvas from 'html2canvas';

export default function UserHistory() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser, adminEmail } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [pendingRedirectUrl, setPendingRedirectUrl] = useState(null);


  const activeUserId = userId || currentUser?.uid;
  const isAdmin = currentUser?.email === adminEmail;

  useEffect(() => {
    if (!activeUserId) return;
    const fetchHistory = async () => {
      try {
        const docRef = doc(db, "users", activeUserId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          alert("User not found.");
        }
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [activeUserId]);

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="container">
        <button className="btn" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <p>No data available.</p>
      </div>
    );
  }

  const history = userData.history || [];

  const handleDeleteHistory = async (recordId) => {
    if (!window.confirm("Are you sure you want to delete this history record? This cannot be undone.")) {
      return;
    }

    try {
      const updatedHistory = history.filter(record => record.id !== recordId);
      await setDoc(doc(db, "users", activeUserId), { history: updatedHistory }, { merge: true });
      setUserData(prev => ({ ...prev, history: updatedHistory }));
    } catch (error) {
      console.error("Error deleting history:", error);
      alert("Failed to delete history record.");
    }
  };

  const downloadImage = async (record) => {
    setDownloadingId(record.id);
    try {
      const element = document.getElementById(`receipt-template-${record.id}`);
      if (!element) return;

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });

      const dateObj = new Date(record.date);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const mon = dateObj.toLocaleString('default', { month: 'short' });
      const year = dateObj.getFullYear();
      const hr = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      const filename = `${userData.name?.replace(/\s+/g, '_') || 'Tenant'}_Receipt_${day}${mon}${year}_${hr}${min}.jpg`;

      const imageURL = canvas.toDataURL('image/jpeg', 0.92);

      const isAndroid = /android/i.test(navigator.userAgent);
      if (!isAndroid) {
        // Laptop/desktop: direct local download
        const link = document.createElement('a');
        link.href = imageURL;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Mobile: upload to ImgBB, then open direct image in Chrome browser
      // Chrome supports long-press → "Save image" to gallery
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error("Image create nahi ho payi");

      const formData = new FormData();
      formData.append('image', blob);

      const response = await fetch('https://api.imgbb.com/1/upload?key=9b1af349c562037cc117a5087c05c358', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error("Upload fail");

      const result = await response.json();
      if (result.success && result.data?.image?.url) {
        const directUrl = result.data.image.url;
        const rawUrl = directUrl.replace(/^https?:\/\//, '');
        const intentUrl = `intent://${rawUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
        setPendingRedirectUrl(intentUrl);
      } else {
        throw new Error("Upload fail");
      }

    } catch (error) {
      console.error("Error generating receipt image:", error);
      alert("Receipt image banane me error aaya. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenInChrome = () => {
    const url = pendingRedirectUrl;
    setPendingRedirectUrl(null);
    if (url) window.location.href = url;
  };

  return (
    <>
    <div className="container animate-fade-in">
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <button className="btn" onClick={() => navigate(-1)} style={{ padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Payment History</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{userData.name || 'Tenant'}</p>
        </div>
      </header>

      {history.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No history available for this user.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.map((record) => {
            const recordDate = new Date(record.date);
            const dateStr = recordDate.toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            const dateStrOnly = recordDate.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
            const dateStrTime = dateStrOnly + ' at ' + recordDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).toLowerCase();

            return (
              <div key={record.id} id={`record-${record.id}`} className="glass-card" style={{ padding: '1.5rem', position: 'relative' }}>
                
                {/* Hidden element for receipt screenshot rendering */}
                <div id={`receipt-template-${record.id}`} style={{
                  width: '595px',
                  height: '842px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  position: 'fixed',
                  left: '-9999px',
                  top: '-9999px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }}>
                  {/* Inner wrapper for body alignment */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Dark Header Banner */}
                    <div style={{ 
                      backgroundColor: '#0f172a', 
                      color: '#ffffff', 
                      padding: '2rem 2.5rem', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <div style={{ textAlign: 'left' }}>
                        <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 700, letterSpacing: '0.02em', color: '#ffffff' }}>RENTAPP</h2>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EASY RENT & UTILITY RECEIPTS</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, letterSpacing: '0.02em', color: '#ffffff' }}>PAYMENT RECEIPT</h3>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.35rem 0 0 0' }}>Receipt ID: {record.id}</p>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>Date: {dateStrOnly}</p>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div style={{ padding: '2.5rem', textAlign: 'left' }}>
                      {/* Tenant Info */}
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>TENANT INFORMATION</h4>
                        <div style={{ width: '100%', height: '1px', backgroundColor: '#e2e8f0', marginBottom: '1rem' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                          <div><span style={{ color: '#64748b' }}>Name:</span> <span style={{ fontWeight: 500, color: '#1e293b' }}>{userData.name || 'N/A'}</span></div>
                          <div><span style={{ color: '#64748b' }}>Phone:</span> <span style={{ fontWeight: 500, color: '#1e293b' }}>{userData.phone || 'N/A'}</span></div>
                          <div><span style={{ color: '#64748b' }}>Email:</span> <span style={{ fontWeight: 500, color: '#1e293b' }}>{userData.email || 'N/A'}</span></div>
                          <div><span style={{ color: '#64748b' }}>Payment Time:</span> <span style={{ fontWeight: 500, color: '#1e293b' }}>{dateStrTime}</span></div>
                        </div>
                      </div>

                      {/* Bill Breakdown */}
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>BILL BREAKDOWN</h4>
                        <div style={{ width: '100%', height: '1px', backgroundColor: '#e2e8f0', marginBottom: '1rem' }}></div>
                        
                        {/* Table structure */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                          {/* Table Header */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '2fr 2fr 1fr', 
                            padding: '0.6rem 0.8rem', 
                            backgroundColor: '#f1f5f9', 
                            fontSize: '0.8rem', 
                            fontWeight: 700, 
                            color: '#475569' 
                          }}>
                            <div>DESCRIPTION</div>
                            <div>DETAILS / READINGS</div>
                            <div style={{ textAlign: 'right' }}>AMOUNT</div>
                          </div>

                          {/* House Rent Row */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '2fr 2fr 1fr', 
                            padding: '1rem 0.8rem', 
                            borderBottom: '1px solid #e2e8f0', 
                            fontSize: '0.9rem',
                            alignItems: 'center'
                          }}>
                            <div style={{ fontWeight: 500, color: '#1e293b' }}>Monthly House Rent</div>
                            <div style={{ color: '#475569' }}>Base rent for the month</div>
                            <div style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>Rs {record.rent}</div>
                          </div>

                          {/* Electricity Row */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '2fr 2fr 1fr', 
                            padding: '1rem 0.8rem', 
                            borderBottom: '1px solid #e2e8f0', 
                            fontSize: '0.9rem',
                            alignItems: 'center'
                          }}>
                            <div style={{ fontWeight: 500, color: '#1e293b' }}>Electricity Charges</div>
                            <div>
                              <div style={{ color: '#1e293b' }}>{record.totalUnits} Units @ Rs {record.rate}/unit</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.2rem' }}>
                                Meter 1: {record.m1_units} units ({record.m1_prev} to {record.m1_curr})
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                                Meter 2: {record.m2_units} units ({record.m2_prev} to {record.m2_curr})
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>Rs {record.totalUnits * record.rate}</div>
                          </div>

                          {/* Grand Total Row */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '3fr 1fr', 
                            padding: '1rem 0.8rem', 
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            borderBottom: '4px solid #10b981'
                          }}>
                            <div style={{ color: '#0f172a', textTransform: 'uppercase' }}>GRAND TOTAL PAID</div>
                            <div style={{ textAlign: 'right', color: '#10b981', fontSize: '1.05rem' }}>Rs {record.totalDue}</div>
                          </div>
                        </div>
                      </div>

                      {/* Paid Stamp */}
                      <div style={{ display: 'inline-block', padding: '0.6rem 1.2rem', backgroundColor: '#d1fae5', border: '2.5px solid #10b981', color: '#047857', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                        STATUS: PAID
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ 
                    padding: '2rem 2.5rem', 
                    borderTop: '1px solid #f1f5f9', 
                    fontSize: '0.75rem', 
                    color: '#94a3b8', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.2rem',
                    textAlign: 'left'
                  }}>
                    <div>This is a computer generated receipt and does not require a physical signature.</div>
                    <div>If you have any questions, please contact the landlord/administrator.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={16} />
                    <span style={{ fontWeight: '500' }}>{dateStr}</span>
                  </div>
                  <div data-html2canvas-ignore="true" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--success)', marginRight: '0.5rem' }}>
                      ₹{record.totalDue}
                    </div>
                    {downloadingId === record.id ? (
                      <div className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Loader2 size={14} className="animate-spin" /> Saving...
                      </div>
                    ) : (
                      <button className="btn" onClick={() => downloadImage(record)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }} title="Download Image Receipt">
                        <Download size={14} /> Save Image
                      </button>
                    )}
                    {isAdmin && (
                      <button className="btn" onClick={() => handleDeleteHistory(record.id)} style={{ padding: '0.4rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} title="Delete Record">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <IndianRupee size={12} /> Rent Amount
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>₹{record.rent}</div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Bolt size={12} /> Total Electricity
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                      {record.totalUnits} units <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>(₹{record.totalUnits * record.rate})</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      M1: {record.m1_units} | M2: {record.m2_units}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

      {/* Custom Instruction Popup */}
      {pendingRedirectUrl && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '360px',
            width: '100%',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📥</div>
            <h3 style={{ color: '#f8fafc', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1.25rem 0' }}>
              Save Receipt to Gallery
            </h3>

            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)'
              }}>
                <span style={{ backgroundColor: '#3b82f6', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>1</span>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Image will open in <strong style={{ color: '#f8fafc' }}>Chrome</strong></span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)'
              }}>
                <span style={{ backgroundColor: '#3b82f6', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>2</span>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}><strong style={{ color: '#f8fafc' }}>Long-press</strong> on the image for 2-3 seconds</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.6rem 0'
              }}>
                <span style={{ backgroundColor: '#3b82f6', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>3</span>
                <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Tap <strong style={{ color: '#10b981' }}>"Download image"</strong> to save</span>
              </div>
            </div>

            <button
              onTouchEnd={handleOpenInChrome}
              onClick={handleOpenInChrome}
              style={{
                width: '100%',
                padding: '0.85rem',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.02em'
              }}
            >
              Open in Chrome →
            </button>

            <button
              onTouchEnd={() => setPendingRedirectUrl(null)}
              onClick={() => setPendingRedirectUrl(null)}
              style={{
                width: '100%',
                padding: '0.6rem',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                marginTop: '0.5rem'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
