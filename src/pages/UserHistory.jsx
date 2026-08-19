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
        scale: 4,
        logging: false,
        useCORS: true,
        width: 1080,
        windowWidth: 1600
      });

      const dateObj = new Date(record.date);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const mon = dateObj.toLocaleString('default', { month: 'short' });
      const year = dateObj.getFullYear();
      const hr = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      const filename = `${userData.name?.replace(/\s+/g, '_') || 'Tenant'}_Receipt_${day}${mon}${year}_${hr}${min}.png`;

      const imageURL = canvas.toDataURL('image/png');

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
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Image create nahi ho payi");

      const formData = new FormData();
      formData.append('image', blob);
      formData.append('name', filename.replace('.png', ''));

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
  };  return (
    <>
    <div className="container animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <header className="glass-card" style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1.25rem', padding: '1.25rem 1.5rem', background: 'var(--bg-glass-elevated)' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Payment History</h1>
            <span className="badge badge-indigo">Receipt Logs</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tenant: <strong style={{ color: 'var(--text-primary)' }}>{userData.name || 'Tenant'}</strong></p>
        </div>
      </header>

      {history.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Calendar size={32} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Payment History Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No past rent receipts recorded for this user yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                  width: '1080px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textRendering: 'optimizeLegibility',
                  position: 'fixed',
                  left: '-9999px',
                  top: '-9999px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '2px solid #cbd5e1',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'
                }}>
                  {/* Inner wrapper for body alignment */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* 4K Super HD Gradient Header Banner */}
                    <div style={{ 
                      background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #090d16 100%)', 
                      color: '#ffffff', 
                      padding: '2.8rem 3.2rem', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      borderBottom: '5px solid #6366f1' 
                    }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <h2 style={{ fontSize: '2.8rem', margin: 0, fontWeight: 900, letterSpacing: '-0.03em', color: '#ffffff' }}>RENTAPP</h2>
                          <span style={{ backgroundColor: '#6366f1', color: '#ffffff', fontSize: '0.85rem', fontWeight: 900, padding: '0.3rem 0.85rem', borderRadius: '16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>OFFICIAL 4K RECEIPT</span>
                        </div>
                        <p style={{ fontSize: '1.05rem', color: '#a5b4fc', margin: '0.5rem 0 0 0', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>EASY RENT & UTILITY MANAGEMENT RECEIPTS</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 900, letterSpacing: '0.08em', color: '#e0e7ff', textTransform: 'uppercase' }}>PAYMENT RECEIPT</h3>
                        <p style={{ fontSize: '1rem', color: '#94a3b8', margin: '0.5rem 0 0 0', fontFamily: 'monospace', fontWeight: 600 }}>Receipt ID: #{record.id}</p>
                        <p style={{ fontSize: '1rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>Date: {dateStrOnly}</p>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div style={{ padding: '2.8rem 3.2rem', textAlign: 'left' }}>
                      {/* Tenant Info Card */}
                      <div style={{ 
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        border: '2px solid #e2e8f0',
                        borderLeft: '6px solid #6366f1',
                        borderRadius: '12px',
                        padding: '1.6rem 2rem',
                        marginBottom: '2.5rem'
                      }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 1.1rem 0' }}>TENANT & PAYMENT INFORMATION</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', fontSize: '1.15rem' }}>
                          <div><span style={{ color: '#64748b', fontWeight: 500 }}>Tenant Name:</span> <strong style={{ fontWeight: 800, color: '#0f172a' }}>{userData.name || 'N/A'}</strong></div>
                          <div><span style={{ color: '#64748b', fontWeight: 500 }}>Phone Number:</span> <strong style={{ fontWeight: 800, color: '#0f172a' }}>{userData.phone || 'N/A'}</strong></div>
                          <div><span style={{ color: '#64748b', fontWeight: 500 }}>Email Address:</span> <strong style={{ fontWeight: 800, color: '#0f172a' }}>{userData.email || 'N/A'}</strong></div>
                          <div><span style={{ color: '#64748b', fontWeight: 500 }}>Payment Time:</span> <strong style={{ fontWeight: 800, color: '#0f172a' }}>{dateStrTime}</strong></div>
                        </div>
                      </div>

                      {/* Bill Breakdown */}
                      <div style={{ marginBottom: '2.5rem' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 1.2rem 0' }}>BILL ITEMIZED BREAKDOWN</h4>
                        
                        {/* Table structure */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', border: '2px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                          {/* Table Header */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '2fr 2fr 1fr', 
                            padding: '1.1rem 1.4rem', 
                            background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)', 
                            fontSize: '1.05rem', 
                            fontWeight: 900, 
                            color: '#ffffff',
                            letterSpacing: '0.06em' 
                          }}>
                            <div>DESCRIPTION</div>
                            <div>DETAILS / READINGS</div>
                            <div style={{ textAlign: 'right' }}>AMOUNT</div>
                          </div>

                          {/* House Rent Row */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '2fr 2fr 1fr', 
                            padding: '1.4rem 1.4rem', 
                            borderBottom: '1.5px solid #e2e8f0', 
                            backgroundColor: '#ffffff',
                            fontSize: '1.15rem',
                            alignItems: 'center'
                          }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>Monthly House Rent</div>
                            <div style={{ color: '#475569', fontSize: '1.05rem' }}>Base rent charge</div>
                            <div style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '1.25rem' }}>Rs {record.rent || 0}</div>
                          </div>

                          {/* Electricity Row */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '2fr 2fr 1fr', 
                            padding: '1.4rem 1.4rem', 
                            borderBottom: '1.5px solid #e2e8f0', 
                            backgroundColor: '#f8fafc',
                            fontSize: '1.15rem',
                            alignItems: 'center'
                          }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>Electricity Charges</div>
                            <div>
                              <div style={{ color: '#0f172a', fontWeight: 800 }}>{record.totalUnits || 0} Units @ Rs {record.rate || 8}/unit</div>
                              <div style={{ fontSize: '0.98rem', color: '#475569', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.25rem 0.6rem', borderRadius: '6px', display: 'inline-block', fontWeight: 700 }}>Meter 1: {record.m1_units || 0} units ({record.m1_prev || 0} → {record.m1_curr || 0})</span>
                                <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.25rem 0.6rem', borderRadius: '6px', display: 'inline-block', fontWeight: 700 }}>Meter 2: {record.m2_units || 0} units ({record.m2_prev || 0} → {record.m2_curr || 0})</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '1.25rem' }}>Rs {(record.totalUnits || 0) * (record.rate || 8)}</div>
                          </div>

                          {/* Previous Remaining Row (if any) */}
                          {record.prevRemaining > 0 && (
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '2fr 2fr 1fr', 
                              padding: '1.4rem 1.4rem', 
                              borderBottom: '1.5px solid #e2e8f0', 
                              backgroundColor: '#fffbe8',
                              fontSize: '1.15rem',
                              alignItems: 'center'
                            }}>
                              <div style={{ fontWeight: 800, color: '#b45309' }}>Previous Remaining Balance</div>
                              <div style={{ color: '#78350f', fontSize: '1.05rem' }}>Carried forward arrears</div>
                              <div style={{ textAlign: 'right', fontWeight: 900, color: '#b45309', fontSize: '1.25rem' }}>Rs {record.prevRemaining}</div>
                            </div>
                          )}

                          {/* Financial Summary Breakdown */}
                          {(() => {
                            const lightBill = (record.totalUnits || 0) * (record.rate || 8);
                            const rentAmt = record.rent || 0;
                            const prevRem = record.prevRemaining || 0;
                            const grandTotal = record.grandTotal || (rentAmt + lightBill + prevRem);
                            const paidAmt = record.paidAmount !== undefined ? record.paidAmount : (record.grandTotal || record.totalDue || grandTotal);
                            const remBal = record.remainingBalance !== undefined ? record.remainingBalance : Math.max(0, grandTotal - paidAmt);
                            const statusTag = record.status || (remBal > 0 ? (paidAmt > 0 ? "PAID WITH REMAINING BALANCE" : "UNPAID") : "PAID");

                            return (
                              <div style={{ backgroundColor: '#ffffff', padding: '1.4rem 1.4rem 0.8rem 1.4rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', padding: '0.85rem 1.2rem', fontSize: '1.25rem', fontWeight: 900, backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1.5px solid #a7f3d0', marginBottom: '0.75rem' }}>
                                  <div style={{ color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GRAND TOTAL DUE</div>
                                  <div style={{ textAlign: 'right', color: '#047857', fontSize: '1.45rem' }}>Rs {grandTotal}</div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', padding: '0.75rem 1.2rem', fontSize: '1.18rem', fontWeight: 800 }}>
                                  <div style={{ color: '#0f172a', textTransform: 'uppercase' }}>PAID AMOUNT</div>
                                  <div style={{ textAlign: 'right', color: '#047857', fontSize: '1.3rem' }}>Rs {paidAmt}</div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', padding: '0.85rem 1.2rem', fontSize: '1.25rem', fontWeight: 900, backgroundColor: remBal > 0 ? '#fff1f2' : '#f8fafc', borderRadius: '8px', border: remBal > 0 ? '1.5px solid #fecdd3' : '1.5px solid #e2e8f0', margin: '0.5rem 0 1rem 0' }}>
                                  <div style={{ color: remBal > 0 ? '#be123c' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REMAINING BALANCE</div>
                                  <div style={{ textAlign: 'right', color: remBal > 0 ? '#be123c' : '#475569', fontSize: '1.45rem' }}>Rs {remBal}</div>
                                </div>

                                {/* Status Stamp */}
                                <div style={{ textAlign: 'center', margin: '1.8rem 0 0.8rem 0' }}>
                                  <div style={{
                                    display: 'inline-block',
                                    padding: '0.9rem 2.8rem',
                                    backgroundColor: statusTag.includes('UNPAID') ? '#ffe4e6' : '#d1fae5',
                                    border: statusTag.includes('UNPAID') ? '4px solid #f43f5e' : '4px solid #10b981',
                                    color: statusTag.includes('UNPAID') ? '#be123c' : '#047857',
                                    borderRadius: '10px',
                                    fontSize: '1.3rem',
                                    fontWeight: 900,
                                    letterSpacing: '0.09em',
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.08)'
                                  }}>
                                    STATUS: {statusTag}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4K Super HD Security Footer */}
                  <div style={{ 
                    padding: '1.6rem 3.2rem', 
                    backgroundColor: '#f8fafc',
                    borderTop: '2px solid #e2e8f0', 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.95rem', 
                    color: '#64748b',
                    fontWeight: 600
                  }}>
                    <div>🔒 Official RentApp 4K Electronic Document • Valid without physical signature</div>
                    <div style={{ fontWeight: 800, color: '#475569' }}>RentApp Verification Portal</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)' }}>
                    <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', background: 'rgba(255, 184, 0, 0.15)' }}>
                      <Calendar size={18} style={{ color: '#ffca28' }} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{dateStr}</span>
                  </div>
                  <div data-html2canvas-ignore="true" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="gradient-text-emerald" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                      ₹{record.grandTotal || record.totalDue}
                    </div>
                    {downloadingId === record.id ? (
                      <button className="btn btn-secondary" disabled style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>
                        <Loader2 size={15} className="animate-spin" /> Saving...
                      </button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => downloadImage(record)} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }} title="Download Image Receipt">
                        <Download size={15} /> Save Receipt
                      </button>
                    )}
                    {isAdmin && (
                      <button className="btn btn-danger" onClick={() => handleDeleteHistory(record.id)} style={{ padding: '0.55rem' }} title="Delete Record">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: 'rgba(11, 13, 20, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <IndianRupee size={14} style={{ color: 'var(--success)' }} /> House Rent
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹{record.rent || 0}</div>
                  </div>

                  <div style={{ background: 'rgba(11, 13, 20, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Bolt size={14} style={{ color: '#ffca28' }} /> Electricity Charges
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {record.totalUnits || 0} units <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#ffca28' }}>(₹{(record.totalUnits || 0) * (record.rate || 8)})</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      M1: {record.m1_units || 0} u | M2: {record.m2_units || 0} u
                    </div>
                  </div>

                  {record.prevRemaining > 0 && (
                    <div style={{ background: 'rgba(11, 13, 20, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.8rem', color: '#ffca28', marginBottom: '0.35rem' }}>
                        Last Month Arrears
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffca28' }}>₹{record.prevRemaining}</div>
                    </div>
                  )}
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
          backgroundColor: 'rgba(5, 8, 15, 0.9)',
          backdropFilter: 'blur(16px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-card animate-fade-in" style={{
            padding: '2rem',
            maxWidth: '380px',
            width: '100%',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            boxShadow: 'var(--glass-shadow), var(--glow-indigo)',
            textAlign: 'center'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.75rem' }}>📥</div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1.25rem 0' }}>
              Save Receipt to Gallery
            </h3>

            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.7rem 0', borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{ backgroundColor: 'var(--accent-indigo)', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>1</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Image will open in <strong style={{ color: 'var(--text-primary)' }}>Chrome</strong></span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.7rem 0', borderBottom: '1px solid var(--border-color)'
              }}>
                <span style={{ backgroundColor: 'var(--accent-indigo)', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>2</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}><strong style={{ color: 'var(--text-primary)' }}>Long-press</strong> on the image for 2-3 seconds</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.7rem 0'
              }}>
                <span style={{ backgroundColor: 'var(--accent-indigo)', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>3</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Tap <strong style={{ color: '#34d399' }}>"Download image"</strong> to save</span>
              </div>
            </div>

            <button
              onTouchEnd={handleOpenInChrome}
              onClick={handleOpenInChrome}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '1rem',
                fontWeight: 700
              }}
            >
              Open in Chrome →
            </button>

            <button
              onTouchEnd={() => setPendingRedirectUrl(null)}
              onClick={() => setPendingRedirectUrl(null)}
              className="btn btn-ghost"
              style={{
                width: '100%',
                padding: '0.6rem',
                fontSize: '0.85rem',
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
