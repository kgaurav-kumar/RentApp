import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Calendar, Bolt, IndianRupee, Trash2, Download } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';

export default function UserHistory() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser, adminEmail } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

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

  const downloadPDF = async (record) => {
    setDownloadingId(record.id);
    try {
      const doc = new jsPDF();
      const dateObj = new Date(record.date);
      const dateStr = dateObj.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timeStr = dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Header Colors & Styling
      doc.setFillColor(15, 23, 42); // --bg-primary Dark Slate
      doc.rect(0, 0, 210, 40, 'F');
      
      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("RENTAPP", 20, 25);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 200, 200);
      doc.text("EASY RENT & UTILITY RECEIPTS", 20, 32);
      
      // Receipt Details (Top Right)
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("PAYMENT RECEIPT", 140, 20);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Receipt ID: ${record.id}`, 140, 27);
      doc.text(`Date: ${dateStr}`, 140, 33);

      // Reset text color for body
      doc.setTextColor(30, 41, 59); // Dark grey

      // Tenant info section
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TENANT INFORMATION", 20, 55);
      
      doc.setDrawColor(226, 232, 240); // border line color
      doc.setLineWidth(0.5);
      doc.line(20, 58, 190, 58);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Name: ${userData.name || 'N/A'}`, 20, 66);
      doc.text(`Phone: ${userData.phone || 'N/A'}`, 20, 72);
      doc.text(`Email: ${userData.email || 'N/A'}`, 20, 78);
      doc.text(`Payment Time: ${dateStr} at ${timeStr}`, 20, 84);

      // Receipt Table Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("BILL BREAKDOWN", 20, 100);
      doc.line(20, 103, 190, 103);

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(20, 107, 170, 8, 'F');
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("DESCRIPTION", 25, 112.5);
      doc.text("DETAILS / READINGS", 75, 112.5);
      doc.text("AMOUNT", 160, 112.5);

      // Table Rows
      let yPos = 122;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      
      // Row 1: Rent
      doc.text("Monthly House Rent", 25, yPos);
      doc.text("Base rent for the month", 75, yPos);
      doc.text(`Rs ${record.rent}`, 160, yPos);
      
      yPos += 10;
      doc.line(20, yPos - 6, 190, yPos - 6);

      // Row 2: Electricity
      doc.text("Electricity Charges", 25, yPos);
      doc.text(`${record.totalUnits} Units @ Rs ${record.rate}/unit`, 75, yPos);
      doc.text(`Rs ${record.totalUnits * record.rate}`, 160, yPos);

      // Readings breakdown
      yPos += 5;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Meter 1: ${record.m1_units} units (${record.m1_prev} to ${record.m1_curr})`, 75, yPos);
      yPos += 4;
      doc.text(`Meter 2: ${record.m2_units} units (${record.m2_prev} to ${record.m2_curr})`, 75, yPos);
      
      yPos += 6;
      doc.line(20, yPos - 3, 190, yPos - 3);

      // Reset color
      doc.setTextColor(30, 41, 59);

      // Total Amount Section
      yPos += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("GRAND TOTAL PAID", 75, yPos);
      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129); // Green total
      doc.text(`Rs ${record.totalDue}`, 160, yPos);

      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(1.5);
      doc.line(20, yPos + 4, 190, yPos + 4);

      // Paid Stamp
      yPos += 20;
      doc.setFillColor(209, 250, 229); // light green
      doc.rect(20, yPos, 45, 12, 'F');
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(1);
      doc.rect(20, yPos, 45, 12, 'S');
      doc.setTextColor(5, 150, 105); // forest green
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("STATUS: PAID", 26, yPos + 8.5);

      // Footer
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("This is a computer generated receipt and does not require a physical signature.", 20, 260);
      doc.text("If you have any questions, please contact the landlord/administrator.", 20, 265);
      
      const filename = `${userData.name?.replace(/\s+/g, '_') || 'Tenant'}_Rent_Receipt_${dateObj.toLocaleString('default', { month: 'short' })}${dateObj.getFullYear()}.pdf`;

      const isAndroid = /android/i.test(navigator.userAgent);
      if (!isAndroid) {
        doc.save(filename);
        return;
      }

      // Generate PDF Blob
      const pdfBlob = doc.output('blob');
      let downloadURL = "";

      // 1. Try Firebase Storage upload
      try {
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { storage } = await import('../firebase');
        const storageRef = ref(storage, `receipts/${activeUserId}/${record.id}.pdf`);
        await uploadBytes(storageRef, pdfBlob);
        downloadURL = await getDownloadURL(storageRef);
      } catch (storageError) {
        console.warn("Firebase Storage failed, trying tmpfiles.org fallback:", storageError);
        
        // 2. Try tmpfiles.org fallback with a 6-second timeout
        try {
          const formData = new FormData();
          formData.append('file', pdfBlob, filename);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          
          const response = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error("Temporary file upload failed");
          }
          
          const result = await response.json();
          if (result.status === "success" && result.data?.url) {
            downloadURL = result.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
          } else {
            throw new Error("Failed to get temporary download link");
          }
        } catch (tmpFilesError) {
          console.error("tmpfiles.org fallback also failed:", tmpFilesError);
        }
      }

      if (!downloadURL) {
        // Fallback to local save as a last resort on Android (even if it might fail in WebView, it's better than doing nothing)
        doc.save(filename);
        return;
      }

      // Redirect to external browser via Android Intent to avoid WebView download limitations
      const rawUrl = downloadURL.replace(/^https?:\/\//, "");
      const intentLink = `intent://${rawUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
      window.location.href = intentLink;
    } catch (error) {
      console.error("Error generating receipt download:", error);
      alert("Failed to download receipt. Please check your internet connection.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
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
            const dateStr = new Date(record.date).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div key={record.id} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={16} />
                    <span style={{ fontWeight: '500' }}>{dateStr}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--success)', marginRight: '0.5rem' }}>
                      ₹{record.totalDue}
                    </div>
                    {downloadingId === record.id ? (
                      <div className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Loader2 size={14} className="animate-spin" /> Downloading...
                      </div>
                    ) : (
                      <button className="btn" onClick={() => downloadPDF(record)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }} title="Download PDF Receipt">
                        <Download size={14} /> Download PDF
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
  );
}
