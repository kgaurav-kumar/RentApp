import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Camera, Edit2, Save, Loader2, Phone, Mail, CheckCircle, MessageSquare, FileText, Globe, FileSpreadsheet, Download } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import emailjs from '@emailjs/browser';
import html2canvas from 'html2canvas';


export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ rent: 0, rate: 8, m1_prev: 0, m1_curr: 0, m2_prev: 0, m2_curr: 0, startDate: '', endDate: '' });
  const [uploading, setUploading] = useState(null); // { id: userId, type: 'm1_prev'|'m1_curr'|'m2_prev'|'m2_curr' }
  const [sendingEmail, setSendingEmail] = useState(null); // userId of who is receiving an email

  const [generateBillUserId, setGenerateBillUserId] = useState(null);
  const [billForm, setBillForm] = useState({
    prevRemaining: 0,
    paidAmount: 0,
    status: 'UNPAID'
  });
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [pendingRedirectUrl, setPendingRedirectUrl] = useState(null);

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
    const unsub = onSnapshot(collection(db, "users"), 
      (snapshot) => {
        const usersData = {};
        snapshot.forEach(doc => {
          usersData[doc.id] = doc.data();
        });
        setUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        alert("Could not load users. Please check Firebase Firestore Rules.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleEdit = (userId) => {
    setEditingUser(userId);
    setEditForm({ 
      rent: users[userId].rent || 0, 
      rate: users[userId].rate || 8,
      m1_prev: users[userId].m1_prev || 0,
      m1_curr: users[userId].m1_curr || 0,
      m2_prev: users[userId].m2_prev || 0,
      m2_curr: users[userId].m2_curr || 0,
      startDate: users[userId].startDate || '',
      endDate: users[userId].endDate || ''
    });
  };

  const handleSave = async (userId) => {
    try {
      await setDoc(doc(db, "users", userId), {
        ...users[userId],
        ...editForm
      }, { merge: true });
      setEditingUser(null);
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("Failed to save. Check console or Firebase permissions.");
    }
  };

  const handleOpenGenerateBill = (userId, data) => {
    setGenerateBillUserId(userId);
    const isPaid = data.billStatus === 'PAID';
    setBillForm({
      prevRemaining: isPaid ? 0 : (data.prevRemaining || 0),
      paidAmount: 0,
      status: 'UNPAID'
    });
  };

  const downloadBillReceiptImage = async (uData) => {
    setIsGeneratingReceipt(true);
    try {
      await new Promise(res => setTimeout(res, 300));
      const element = document.getElementById("admin-generated-bill-template");
      if (!element) {
        throw new Error("Template element not found");
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 4,
        logging: false,
        useCORS: true,
        width: 1080,
        windowWidth: 1600
      });

      const dateObj = new Date();
      const day = String(dateObj.getDate()).padStart(2, '0');
      const mon = dateObj.toLocaleString('default', { month: 'short' });
      const year = dateObj.getFullYear();
      const hr = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      const filename = `${(uData.name || 'Tenant').replace(/\s+/g, '_')}_Bill_${day}${mon}${year}_${hr}${min}.png`;

      const imageURL = canvas.toDataURL('image/png');

      const isAndroid = /android/i.test(navigator.userAgent);
      if (!isAndroid) {
        const link = document.createElement('a');
        link.href = imageURL;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error("Could not create receipt image");

        const formData = new FormData();
        formData.append('image', blob);
        formData.append('name', filename.replace('.png', ''));

        const response = await fetch('https://api.imgbb.com/1/upload?key=9b1af349c562037cc117a5087c05c358', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error("Upload failed");
        const result = await response.json();
        if (result.success && result.data?.image?.url) {
          const directUrl = result.data.image.url;
          const rawUrl = directUrl.replace(/^https?:\/\//, '');
          const intentUrl = `intent://${rawUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
          setPendingRedirectUrl(intentUrl);
        } else {
          throw new Error("Upload failed");
        }
      }
    } catch (error) {
      console.error("Receipt download error:", error);
      alert("Bill save ho gaya, par image receipt download me error aaya. Please retry.");
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  const handleSaveGenerateBill = async () => {
    if (!generateBillUserId) return;
    const data = users[generateBillUserId];
    const m1_units = Math.max(0, (data.m1_curr || 0) - (data.m1_prev || 0));
    const m2_units = Math.max(0, (data.m2_curr || 0) - (data.m2_prev || 0));
    const totalUnits = m1_units + m2_units;
    const lightBill = totalUnits * (data.rate || 8);
    const rent = data.rent || 0;
    const prevRemaining = Number(billForm.prevRemaining || 0);
    const grandTotal = rent + lightBill + prevRemaining;
    const paidAmount = Number(billForm.paidAmount || 0);
    const remainingBalance = Math.max(0, grandTotal - paidAmount);

    let status = billForm.status;
    if (paidAmount > 0 && remainingBalance > 0) {
      status = 'PAID WITH REMAINING BALANCE';
    } else if (paidAmount >= grandTotal && grandTotal > 0) {
      status = 'PAID';
    } else if (paidAmount === 0) {
      status = 'UNPAID';
    }

    try {
      await setDoc(doc(db, "users", generateBillUserId), {
        ...data,
        prevRemaining,
        paidAmount,
        remainingBalance,
        grandTotal,
        billStatus: status,
        billGeneratedAt: new Date().toISOString()
      }, { merge: true });

      await downloadBillReceiptImage(data);
      alert(`Bill generated and saved successfully! Receipt image download initiated (${status}).`);
      setGenerateBillUserId(null);
    } catch (error) {
      console.error("Error saving bill:", error);
      alert("Failed to save generated bill.");
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500; // Reduced to 500px for ultra-fast upload
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas to Blob failed"));
            }
          }, 'image/jpeg', 0.5); // 50% quality for maximum speed
        };
        img.onerror = (err) => {
          console.error("Image load error", err);
          reject(new Error("Failed to load image"));
        };
      };
      reader.onerror = (err) => {
        console.error("FileReader error", err);
        reject(new Error("Failed to read file"));
      };
    });
  };

  const handlePhotoUpload = async (e, userId, meterType) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading({ id: userId, type: meterType });
    try {
      // Compress the image before uploading to save time
      const compressedBlob = await compressImage(file);
      
      // Upload directly to ImgBB
      const formData = new FormData();
      formData.append('image', compressedBlob);
      
      const response = await fetch('https://api.imgbb.com/1/upload?key=9b1af349c562037cc117a5087c05c358', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || "ImgBB upload failed");
      }
      
      const downloadURL = result.data.url;
      
      const photoKey = `${meterType}_photo`;
      await setDoc(doc(db, "users", userId), {
        ...users[userId],
        [photoKey]: downloadURL
      }, { merge: true });
      
    } catch (error) {
      console.error("Error uploading photo: ", error);
      alert("Failed to upload photo to ImgBB. Please check your network.");
    } finally {
      setUploading(null);
    }
  };

  const handleMarkPaid = async (userId, data) => {
    const m1_units = Math.max(0, (data.m1_curr || 0) - (data.m1_prev || 0));
    const m2_units = Math.max(0, (data.m2_curr || 0) - (data.m2_prev || 0));
    const totalUnits = m1_units + m2_units;
    const lightBill = totalUnits * (data.rate || 8);
    const rent = data.rent || 0;
    const prevRemaining = Number(data.prevRemaining || 0);
    const grandTotal = data.grandTotal || (rent + lightBill + prevRemaining);
    const paidAmount = Number(data.paidAmount !== undefined ? data.paidAmount : grandTotal);
    const remainingBalance = Math.max(0, grandTotal - paidAmount);

    const status = remainingBalance > 0 ? "PAID WITH REMAINING BALANCE" : "PAID";

    if (!window.confirm(`Are you sure you want to mark ${data.name || 'Tenant'}'s payment as received?\n\nStatus: ${status}\nGrand Total: Rs ${grandTotal}\nPaid Amount: Rs ${paidAmount}\nRemaining Balance: Rs ${remainingBalance}\n\nNote: Remaining Balance (Rs ${remainingBalance}) will carry forward as arrears for the next month.`)) {
      return;
    }

    try {
      const historyEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        rent: rent,
        rate: data.rate || 8,
        m1_prev: data.m1_prev || 0,
        m1_curr: data.m1_curr || 0,
        m2_prev: data.m2_prev || 0,
        m2_curr: data.m2_curr || 0,
        m1_units,
        m2_units,
        totalUnits,
        prevRemaining,
        grandTotal,
        paidAmount,
        remainingBalance,
        totalDue: grandTotal,
        status: status,
        startDate: data.startDate || '',
        endDate: data.endDate || ''
      };

      const updatedHistory = [historyEntry, ...(data.history || [])];

      let newStartDate = data.startDate || '';
      let newEndDate = data.endDate || '';

      if (newEndDate) {
        const nextStart = new Date(data.startDate);
        nextStart.setMonth(nextStart.getMonth() + 1);
        const nextStartDateStr = nextStart.toISOString().split('T')[0];
        
        const nextEnd = new Date(data.endDate);
        nextEnd.setMonth(nextEnd.getMonth() + 1);
        const nextEndDateStr = nextEnd.toISOString().split('T')[0];

        newStartDate = nextStartDateStr;
        newEndDate = nextEndDateStr;
      }

      await setDoc(doc(db, "users", userId), {
        ...data,
        history: updatedHistory,
        rent: 0,
        m1_prev: data.m1_curr || data.m1_prev || 0,
        m2_prev: data.m2_curr || data.m2_prev || 0,
        m1_prev_photo: data.m1_curr_photo || data.m1_prev_photo || null,
        m2_prev_photo: data.m2_curr_photo || data.m2_prev_photo || null,
        m1_curr_photo: null,
        m2_curr_photo: null,
        prevRemaining: remainingBalance, // Carries 0 if fully paid!
        paidAmount: 0,
        remainingBalance: remainingBalance, // 0 if fully paid!
        grandTotal: remainingBalance, // 0 if fully paid!
        billStatus: status,
        startDate: newStartDate,
        endDate: newEndDate
      }, { merge: true });
      alert(`Payment marked as received (${status}). Dues updated to Rs ${remainingBalance}.`);
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Failed to update payment status.");
    }
  };

  const handleSendEmail = async (id, data, totalDue, totalUnits) => {
    if (!data.email) {
      alert("This tenant does not have an email address saved.");
      return;
    }
    
    setSendingEmail(id + '_bill');
    const subject = "Month-end Rent & Electricity Bill";
    const bodyText = 
      `Hello ${data.name || 'Tenant'},\r\n\r\n` +
      `Here are your bill details for this month:\r\n\r\n` +
      `Rent Amount: Rs ${data.rent || 0}\r\n` +
      `Electricity Consumed: ${totalUnits} units\r\n` +
      `Electricity Charges: Rs ${totalUnits * (data.rate || 8)}\r\n` +
      `---------------------------------------\r\n` +
      `Total Amount Due: Rs ${totalDue}\r\n\r\n` +
      `Please pay the total amount as soon as possible.\r\n\r\n` +
      `Regards,\r\nAdmin`;
      
    try {
      await emailjs.send(
        'service_cfom9wy',
        'template_g7i421t',
        {
          subject: subject,
          message: bodyText,
          to_email: data.email,
          name: data.name || 'Tenant',
          email: data.email
        },
        { publicKey: 'Ye7izIOMQOgUCG9Pw' }
      );
      alert("Bill sent successfully to " + data.email);
    } catch (error) {
      console.error("EmailJS Error:", error);
      alert("Failed to send email. Error: " + (error.text || error.message || "Unknown error"));
    } finally {
      setSendingEmail(null);
    }
  };

  const handlePaymentSuccessEmail = async (id, data, totalDue, totalUnits) => {
    if (!data.email) {
      alert("This tenant does not have an email address saved.");
      return;
    }

    setSendingEmail(id + '_receipt');
    const subject = "Payment Successful Confirmation";
    const bodyText = 
      `Hello ${data.name || 'Tenant'},\r\n\r\n` +
      `Your bill has been successfully paid. Here are the details of the payment received:\r\n\r\n` +
      `Rent Amount: Rs ${data.rent || 0}\r\n` +
      `Electricity Consumed: ${totalUnits} units\r\n` +
      `Electricity Charges: Rs ${totalUnits * (data.rate || 8)}\r\n` +
      `---------------------------------------\r\n` +
      `Total Amount Paid: Rs ${totalDue}\r\n\r\n` +
      `Thank you for your payment!\r\n\r\n` +
      `Regards,\r\nAdmin`;
      
    try {
      await emailjs.send(
        'service_cfom9wy',
        'template_g7i421t',
        {
          subject: subject,
          message: bodyText,
          to_email: data.email,
          name: data.name || 'Tenant',
          email: data.email
        },
        { publicKey: 'Ye7izIOMQOgUCG9Pw' }
      );
      alert("Receipt sent successfully to " + data.email);
    } catch (error) {
      console.error("EmailJS Error:", error);
      alert("Failed to send email. Error: " + (error.text || error.message || "Unknown error"));
    } finally {
      setSendingEmail(null);
    }
  };

  const handleSendSMS = (data, totalDue, totalUnits) => {
    const bodyText = 
      `Hello ${data.name || 'Tenant'},\r\n\r\n` +
      `Bill Details:\r\n` +
      `Rent: Rs ${data.rent || 0}\r\n` +
      `Elec Consumed: ${totalUnits} units\r\n` +
      `Elec Charges: Rs ${totalUnits * (data.rate || 8)}\r\n` +
      `------------------------\r\n` +
      `Total Due: Rs ${totalDue}\r\n\r\n` +
      `Please pay ASAP.\r\nAdmin`;
      
    const body = encodeURIComponent(bodyText);
    const smsLink = `sms:${data.phone || ''}?body=${body}`;
    
    const link = document.createElement('a');
    link.href = smsLink;
    link.target = "_top";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePaymentSuccessSMS = (data, totalDue, totalUnits) => {
    const bodyText = 
      `Hello ${data.name || 'Tenant'},\r\n\r\n` +
      `Payment Received!\r\n` +
      `Rent: Rs ${data.rent || 0}\r\n` +
      `Elec Consumed: ${totalUnits} units\r\n` +
      `Elec Charges: Rs ${totalUnits * (data.rate || 8)}\r\n` +
      `------------------------\r\n` +
      `Total Paid: Rs ${totalDue}\r\n\r\n` +
      `Thank you!\r\nAdmin`;
      
    const body = encodeURIComponent(bodyText);
    const smsLink = `sms:${data.phone || ''}?body=${body}`;
    
    const link = document.createElement('a');
    link.href = smsLink;
    link.target = "_top";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-indigo)" />
      </div>
    );
  }

  const userEntries = Object.entries(users);

  const renderPhotoUpload = (data, id, label, meterType) => {
    const photoKey = `${meterType}_photo`;
    const photoUrl = data[photoKey];
    const isUploading = uploading?.id === id && uploading?.type === meterType;

    return (
      <div style={{ marginTop: '0.5rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>{label} Photo</div>
        {photoUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.45rem', fontSize: '0.75rem', gap: '0.3rem', justifyContent: 'center' }} onClick={() => handleOpenImage(photoUrl)}>
              <Camera size={13} style={{ color: 'var(--success)' }} /> See Photo
            </button>
            <label className="btn btn-ghost" style={{ padding: '0.4rem', fontSize: '0.75rem', border: '1px dashed var(--border-color)', cursor: isUploading ? 'not-allowed' : 'pointer', justifyContent: 'center' }}>
              {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Edit2 size={13} />}
              {isUploading ? 'Uploading...' : 'Change'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(e, id, meterType)} disabled={isUploading} />
            </label>
          </div>
        ) : (
          <label className="btn btn-ghost" style={{ width: '100%', height: '62px', border: '1px dashed var(--border-glow)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', cursor: isUploading ? 'not-allowed' : 'pointer', borderRadius: 'var(--radius-md)', background: 'rgba(9, 13, 22, 0.4)' }}>
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} style={{ color: '#a5b4fc' }} />}
            <span style={{ fontSize: '0.7rem', marginTop: '0.3rem', fontWeight: 600 }}>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(e, id, meterType)} disabled={isUploading} />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Admin Header */}
      <header className="glass-card" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', background: 'var(--bg-glass-elevated)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Admin Dashboard</h1>
              <span className="badge badge-indigo">Property Manager</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manage Tenants, Utility Meters & Monthly Bills</p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => {
              window.location.href = "intent://rent-eosin.vercel.app/#Intent;scheme=https;action=android.intent.action.VIEW;end;";
              setTimeout(() => {
                window.open("https://rent-eosin.vercel.app/", "_blank");
              }, 500);
            }}>
              <Globe size={18} style={{ color: 'var(--accent-cyan)' }} /> Open Web
            </button>
            <button className="btn btn-danger" style={{ padding: '0.65rem 1.1rem' }} onClick={handleLogout}>
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </header>

      {userEntries.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <User size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Tenants Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>No tenants have registered on the portal yet.</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {userEntries.map(([id, data]) => {
            const m1_units = Math.max(0, (data.m1_curr || 0) - (data.m1_prev || 0));
            const m2_units = Math.max(0, (data.m2_curr || 0) - (data.m2_prev || 0));
            const totalUnits = m1_units + m2_units;
            const totalDue = (data.rent || 0) + (totalUnits * (data.rate || 8));

            const edit_m1_units = Math.max(0, (editForm.m1_curr || 0) - (editForm.m1_prev || 0));
            const edit_m2_units = Math.max(0, (editForm.m2_curr || 0) - (editForm.m2_prev || 0));
            const edit_totalUnits = edit_m1_units + edit_m2_units;
            const edit_totalDue = (editForm.rent || 0) + (edit_totalUnits * (editForm.rate || 8));

            return (
              <div key={id} className="glass-card">
                {/* Tenant Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <User color="var(--accent-indigo)" size={24} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>{data.name || 'Tenant'}</h2>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                        <Phone size={13} /> {data.phone || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                        <Mail size={13} /> {data.email || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => handleOpenGenerateBill(id, data)}>
                      <FileSpreadsheet size={15} /> Generate Bill
                    </button>

                    <button className="btn btn-success" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => handleMarkPaid(id, data)}>
                      <CheckCircle size={15} /> Payment Received
                    </button>

                    <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => handleSendEmail(id, data, totalDue, totalUnits)} disabled={sendingEmail === id + '_bill'}>
                      {sendingEmail === id + '_bill' ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} style={{ color: '#a5b4fc' }} />} 
                      Email Bill
                    </button>

                    <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => handleSendSMS(data, totalDue, totalUnits)}>
                      <MessageSquare size={14} style={{ color: '#67e8f9' }} /> SMS Bill
                    </button>

                    <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => handlePaymentSuccessEmail(id, data, totalDue, totalUnits)} disabled={sendingEmail === id + '_receipt'}>
                      {sendingEmail === id + '_receipt' ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} style={{ color: 'var(--success)' }} />} 
                      Email Receipt
                    </button>

                    <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => handlePaymentSuccessSMS(data, totalDue, totalUnits)}>
                      <MessageSquare size={14} style={{ color: '#34d399' }} /> SMS Receipt
                    </button>

                    {editingUser === id ? (
                      <button className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => handleSave(id)}>
                        <Save size={14} /> Save
                      </button>
                    ) : (
                      <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => handleEdit(id)}>
                        <Edit2 size={14} /> Edit
                      </button>
                    )}

                    <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }} onClick={() => navigate(`/admin/history/${id}`)}>
                      <FileText size={14} style={{ color: '#fbbf24' }} /> History
                    </button>
                  </div>
                </div>

                {/* Form Details / View */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  
                  {/* Billing Dates */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Start Date:</span>
                    {editingUser === id ? (
                      <input 
                        type="date" 
                        className="input-field" 
                        style={{ padding: '0.4rem 0.6rem', width: '140px', fontSize: '0.85rem' }} 
                        value={editForm.startDate || ''} 
                        onChange={(e) => {
                          const newStartDate = e.target.value;
                          let newEndDate = '';
                          if (newStartDate) {
                            const date = new Date(newStartDate);
                            date.setMonth(date.getMonth() + 1);
                            newEndDate = date.toISOString().split('T')[0];
                          }
                          setEditForm({ ...editForm, startDate: newStartDate, endDate: newEndDate });
                        }} 
                      />
                    ) : (
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{data.startDate ? new Date(data.startDate).toLocaleDateString() : 'Not Set'}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>End Date:</span>
                    {editingUser === id ? (
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        {editForm.endDate ? new Date(editForm.endDate).toLocaleDateString() : 'Auto-calculated'}
                      </span>
                    ) : (
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{data.endDate ? new Date(data.endDate).toLocaleDateString() : 'Not Set'}</span>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.3rem 0' }}></div>

                  {/* Rent & Rate */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Rent Amount:</span>
                    {editingUser === id ? (
                      <input type="number" className="input-field" style={{ width: '100px', padding: '0.4rem 0.6rem', fontSize: '0.88rem' }} value={editForm.rent === 0 ? '' : editForm.rent} placeholder="0" onChange={e => setEditForm({...editForm, rent: e.target.value === '' ? '' : Number(e.target.value)})} />
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>₹{data.rent || 0}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Rate (/unit):</span>
                    {editingUser === id ? (
                      <input type="number" className="input-field" style={{ width: '100px', padding: '0.4rem 0.6rem', fontSize: '0.88rem' }} value={editForm.rate === 0 ? '' : editForm.rate} placeholder="0" onChange={e => setEditForm({...editForm, rate: e.target.value === '' ? '' : Number(e.target.value)})} />
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fbbf24' }}>₹{data.rate || 8}</span>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.3rem 0' }}></div>

                  {/* Meter 1 Block */}
                  <div style={{ background: 'rgba(9, 13, 22, 0.5)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#a5b4fc', fontSize: '0.88rem', fontWeight: 700 }}>Meter 1 Reading</span>
                      <span className="badge badge-indigo">{editingUser === id ? edit_m1_units : m1_units} Units</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prev</span>
                        {editingUser === id ? (
                          <input type="number" className="input-field" style={{ padding: '0.4rem', fontSize: '0.85rem' }} value={editForm.m1_prev === 0 ? '' : editForm.m1_prev} placeholder="0" onChange={e => setEditForm({...editForm, m1_prev: e.target.value === '' ? '' : Number(e.target.value)})} />
                        ) : (
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{data.m1_prev || 0}</div>
                        )}
                        {renderPhotoUpload(data, id, "Prev", "m1_prev")}
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Curr</span>
                        {editingUser === id ? (
                          <input type="number" className="input-field" style={{ padding: '0.4rem', fontSize: '0.85rem' }} value={editForm.m1_curr === 0 ? '' : editForm.m1_curr} placeholder="0" onChange={e => setEditForm({...editForm, m1_curr: e.target.value === '' ? '' : Number(e.target.value)})} />
                        ) : (
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{data.m1_curr || 0}</div>
                        )}
                        {renderPhotoUpload(data, id, "Curr", "m1_curr")}
                      </div>
                    </div>
                  </div>

                  {/* Meter 2 Block */}
                  <div style={{ background: 'rgba(9, 13, 22, 0.5)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ color: '#a5b4fc', fontSize: '0.88rem', fontWeight: 700 }}>Meter 2 Reading</span>
                      <span className="badge badge-indigo">{editingUser === id ? edit_m2_units : m2_units} Units</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prev</span>
                        {editingUser === id ? (
                          <input type="number" className="input-field" style={{ padding: '0.4rem', fontSize: '0.85rem' }} value={editForm.m2_prev === 0 ? '' : editForm.m2_prev} placeholder="0" onChange={e => setEditForm({...editForm, m2_prev: e.target.value === '' ? '' : Number(e.target.value)})} />
                        ) : (
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{data.m2_prev || 0}</div>
                        )}
                        {renderPhotoUpload(data, id, "Prev", "m2_prev")}
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Curr</span>
                        {editingUser === id ? (
                          <input type="number" className="input-field" style={{ padding: '0.4rem', fontSize: '0.85rem' }} value={editForm.m2_curr === 0 ? '' : editForm.m2_curr} placeholder="0" onChange={e => setEditForm({...editForm, m2_curr: e.target.value === '' ? '' : Number(e.target.value)})} />
                        ) : (
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{data.m2_curr || 0}</div>
                        )}
                        {renderPhotoUpload(data, id, "Curr", "m2_curr")}
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.4rem 0' }}></div>
                  
                  {/* Financial Summary */}
                  {(() => {
                    const currentMonthLightBill = totalUnits * (data.rate || 8);
                    const currentMonthRent = data.rent || 0;
                    
                    const isPrevPaid = data.billStatus === 'PAID';
                    const prevArrears = isPrevPaid ? 0 : (data.prevRemaining || 0);
                    const totalCycleDue = currentMonthRent + currentMonthLightBill + prevArrears;

                    const paidAmt = isPrevPaid ? 0 : (data.paidAmount || 0);
                    const remBal = Math.max(0, totalCycleDue - paidAmt);

                    const isFullyPaid = totalCycleDue === 0 || (paidAmt >= totalCycleDue && totalCycleDue > 0);

                    const cardGrandTotal = isFullyPaid ? 0 : remBal;
                    const cardPaidAmount = isFullyPaid ? 0 : paidAmt;
                    const cardArrears = isFullyPaid ? 0 : prevArrears;
                    const cardStatus = isFullyPaid ? 'PAID' : (paidAmt > 0 && remBal > 0 ? 'PAID WITH REMAINING BALANCE' : 'UNPAID');

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(99, 102, 241, 0.12)', padding: '0.85rem 1.1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                        {cardArrears > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ffca28' }}>
                            <span>Last Month Arrears:</span>
                            <span>+ ₹{cardArrears}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem' }}>Grand Total Due:</span>
                          <span className="gradient-text-emerald" style={{ fontWeight: 800, fontSize: '1.4rem' }}>
                            ₹{editingUser === id ? edit_totalDue : cardGrandTotal}
                          </span>
                        </div>
                        {cardPaidAmount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#00e676' }}>
                            <span>Paid Amount:</span>
                            <span>₹{cardPaidAmount}</span>
                          </div>
                        )}
                        {remBal > 0 && cardPaidAmount > 0 && !isFullyPaid && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ff77b2', fontWeight: 700 }}>
                            <span>Remaining Balance:</span>
                            <span>₹{remBal}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
                          <span className={cardStatus === 'PAID' ? 'badge badge-success' : (cardStatus === 'PAID WITH REMAINING BALANCE' ? 'badge badge-warning' : 'badge badge-danger')}>
                            {cardStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Generate Bill Modal Overlay */}
      {generateBillUserId && users[generateBillUserId] && (() => {
        const uData = users[generateBillUserId];
        const m1_units = Math.max(0, (uData.m1_curr || 0) - (uData.m1_prev || 0));
        const m2_units = Math.max(0, (uData.m2_curr || 0) - (uData.m2_prev || 0));
        const totalUnits = m1_units + m2_units;
        const lightBill = totalUnits * (uData.rate || 8);
        const rent = uData.rent || 0;
        const prevRemaining = Number(billForm.prevRemaining || 0);
        const grandTotal = rent + lightBill + prevRemaining;
        const paidAmount = Number(billForm.paidAmount || 0);
        const remainingBalance = Math.max(0, grandTotal - paidAmount);

        let autoStatus = billForm.status;
        if (paidAmount > 0 && remainingBalance > 0) {
          autoStatus = 'PAID WITH REMAINING BALANCE';
        } else if (paidAmount >= grandTotal && grandTotal > 0) {
          autoStatus = 'PAID';
        } else if (paidAmount === 0) {
          autoStatus = 'UNPAID';
        }

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5, 8, 15, 0.9)', backdropFilter: 'blur(16px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div className="glass-card animate-fade-in" style={{ maxWidth: '450px', width: '100%', padding: '1.75rem', border: '1px solid rgba(255, 184, 0, 0.4)', boxShadow: 'var(--glass-shadow), var(--glow-gold)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FileSpreadsheet size={22} style={{ color: 'var(--accent-gold)' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Generate Bill Modal</h3>
                </div>
                <button onClick={() => setGenerateBillUserId(null)} className="btn btn-ghost" style={{ padding: '0.2rem 0.6rem', fontSize: '1.1rem' }}>✕</button>
              </div>

              <div style={{ marginBottom: '1rem', background: 'rgba(9, 13, 22, 0.6)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{uData.name || 'Tenant'}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{uData.phone} | {uData.email}</div>
              </div>

              {/* Bill Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Base House Rent:</span>
                  <span style={{ fontWeight: 600 }}>₹{rent}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Electricity Charges ({totalUnits} units @ ₹{uData.rate || 8}):</span>
                  <span style={{ fontWeight: 600 }}>₹{lightBill}</span>
                </div>

                <div className="input-group" style={{ marginBottom: '0.5rem', marginTop: '0.35rem' }}>
                  <label htmlFor="modalPrevRemaining">Last Month Remaining Amount (Arrears):</label>
                  <input 
                    type="number" 
                    id="modalPrevRemaining" 
                    className="input-field" 
                    placeholder="Enter arrears amount (e.g. 0)"
                    value={billForm.prevRemaining === 0 ? '' : billForm.prevRemaining} 
                    onChange={(e) => setBillForm({ ...billForm, prevRemaining: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.9rem', background: 'rgba(255, 184, 0, 0.14)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 184, 0, 0.3)', fontWeight: 800 }}>
                  <span style={{ color: 'var(--text-primary)' }}>GRAND TOTAL DUE:</span>
                  <span style={{ color: '#ffca28', fontSize: '1.15rem' }}>₹{grandTotal}</span>
                </div>

                <div className="input-group" style={{ marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                  <label htmlFor="modalPaidAmount">Current Month Paid Amount:</label>
                  <input 
                    type="number" 
                    id="modalPaidAmount" 
                    className="input-field" 
                    placeholder="Enter amount paid (e.g. 6000)"
                    value={billForm.paidAmount === 0 ? '' : billForm.paidAmount} 
                    onChange={(e) => setBillForm({ ...billForm, paidAmount: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.9rem', background: remainingBalance > 0 ? 'rgba(255, 42, 133, 0.14)' : 'rgba(0, 230, 118, 0.14)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontWeight: 800 }}>
                  <span style={{ color: 'var(--text-primary)' }}>REMAINING BALANCE:</span>
                  <span style={{ color: remainingBalance > 0 ? '#ff77b2' : '#00e676', fontSize: '1.15rem' }}>₹{remainingBalance}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Bill Status Preview:</span>
                  <span className={autoStatus === 'PAID' ? 'badge badge-success' : (autoStatus === 'PAID WITH REMAINING BALANCE' ? 'badge badge-warning' : 'badge badge-danger')}>
                    {autoStatus}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button onClick={handleSaveGenerateBill} className="btn btn-primary" style={{ flex: 1, padding: '0.8rem', fontSize: '0.95rem' }} disabled={isGeneratingReceipt}>
                  {isGeneratingReceipt ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Save & Download Bill Image
                </button>
                <button onClick={() => setGenerateBillUserId(null)} className="btn btn-secondary" disabled={isGeneratingReceipt}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hidden Offscreen Official Receipt Template for html2canvas */}
      {generateBillUserId && users[generateBillUserId] && (() => {
        const uData = users[generateBillUserId];
        const m1_units = Math.max(0, (uData.m1_curr || 0) - (uData.m1_prev || 0));
        const m2_units = Math.max(0, (uData.m2_curr || 0) - (uData.m2_prev || 0));
        const totalUnits = m1_units + m2_units;
        const lightBill = totalUnits * (uData.rate || 8);
        const rent = uData.rent || 0;
        const prevRemaining = Number(billForm.prevRemaining || 0);
        const grandTotal = rent + lightBill + prevRemaining;
        const paidAmount = Number(billForm.paidAmount || 0);
        const remainingBalance = Math.max(0, grandTotal - paidAmount);

        let statusTag = billForm.status;
        if (paidAmount > 0 && remainingBalance > 0) {
          statusTag = 'PAID WITH REMAINING BALANCE';
        } else if (paidAmount >= grandTotal && grandTotal > 0) {
          statusTag = 'PAID';
        } else if (paidAmount === 0) {
          statusTag = 'UNPAID';
        }

        const dateObj = new Date();
        const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        return (
          <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -1 }}>
            <div 
              id="admin-generated-bill-template"
              style={{
                width: '1080px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textRendering: 'optimizeLegibility',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '2px solid #cbd5e1',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
              }}
            >
              {/* 4K Super HD Gradient Header */}
              <div style={{
                background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #090d16 100%)',
                color: '#ffffff',
                padding: '2.8rem 3.2rem',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                borderBottom: '5px solid #6366f1'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <h1 style={{ fontSize: '2.8rem', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', color: '#ffffff' }}>RENTAPP</h1>
                    <span style={{ backgroundColor: '#6366f1', color: '#ffffff', fontSize: '0.85rem', fontWeight: 900, padding: '0.3rem 0.85rem', borderRadius: '16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>OFFICIAL 4K RECEIPT</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '1.05rem', color: '#a5b4fc', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.5rem', fontWeight: 700 }}>EASY RENT & UTILITY MANAGEMENT RECEIPTS</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.08em', color: '#e0e7ff', textTransform: 'uppercase' }}>PAYMENT RECEIPT</div>
                  <div style={{ fontSize: '1rem', color: '#94a3b8', marginTop: '0.5rem', fontFamily: 'monospace', fontWeight: 600 }}>Receipt ID: #{Date.now()}</div>
                  <div style={{ fontSize: '1rem', color: '#94a3b8', marginTop: '0.2rem' }}>Date: {dateStr}</div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '2.8rem 3.2rem' }}>
                {/* Tenant Info Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '2px solid #e2e8f0',
                  borderLeft: '6px solid #6366f1',
                  borderRadius: '12px',
                  padding: '1.6rem 2rem',
                  marginBottom: '2.5rem'
                }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 1.1rem 0' }}>TENANT & PAYMENT INFORMATION</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', fontSize: '1.15rem' }}>
                    <div><span style={{ color: '#64748b', fontWeight: 500 }}>Tenant Name:</span> <strong style={{ color: '#0f172a', fontWeight: 800 }}>{uData.name || 'Tenant'}</strong></div>
                    <div><span style={{ color: '#64748b', fontWeight: 500 }}>Phone Number:</span> <strong style={{ color: '#0f172a', fontWeight: 800 }}>{uData.phone || 'N/A'}</strong></div>
                    <div><span style={{ color: '#64748b', fontWeight: 500 }}>Email Address:</span> <strong style={{ color: '#0f172a', fontWeight: 800 }}>{uData.email || 'N/A'}</strong></div>
                    <div><span style={{ color: '#64748b', fontWeight: 500 }}>Generated Time:</span> <strong style={{ color: '#0f172a', fontWeight: 800 }}>{dateStr} at {timeStr}</strong></div>
                  </div>
                </div>

                {/* Bill Breakdown */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '1.2rem' }}>BILL ITEMIZED BREAKDOWN</h3>
                  
                  <div style={{ border: '2px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                    {/* Table Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)', padding: '1.1rem 1.4rem', fontWeight: 900, fontSize: '1.05rem', color: '#ffffff', letterSpacing: '0.06em' }}>
                      <div>DESCRIPTION</div>
                      <div>DETAILS / READINGS</div>
                      <div style={{ textAlign: 'right' }}>AMOUNT</div>
                    </div>

                    {/* House Rent */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', padding: '1.4rem 1.4rem', borderBottom: '1.5px solid #e2e8f0', backgroundColor: '#ffffff', fontSize: '1.15rem', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>Monthly House Rent</div>
                      <div style={{ color: '#475569', fontSize: '1.05rem' }}>Base rent charge</div>
                      <div style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '1.25rem' }}>Rs {rent}</div>
                    </div>

                    {/* Electricity */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', padding: '1.4rem 1.4rem', borderBottom: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '1.15rem', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>Electricity Charges</div>
                      <div>
                        <div style={{ color: '#0f172a', fontWeight: 800 }}>{totalUnits} Units @ Rs {uData.rate || 8}/unit</div>
                        <div style={{ fontSize: '0.98rem', color: '#475569', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.25rem 0.6rem', borderRadius: '6px', display: 'inline-block', fontWeight: 700 }}>Meter 1: {m1_units} units ({uData.m1_prev || 0} → {uData.m1_curr || 0})</span>
                          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.25rem 0.6rem', borderRadius: '6px', display: 'inline-block', fontWeight: 700 }}>Meter 2: {m2_units} units ({uData.m2_prev || 0} → {uData.m2_curr || 0})</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '1.25rem' }}>Rs {lightBill}</div>
                    </div>

                    {/* Previous Arrears (if any) */}
                    {prevRemaining > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', padding: '1.4rem 1.4rem', borderBottom: '1.5px solid #e2e8f0', backgroundColor: '#fffbe8', fontSize: '1.15rem', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, color: '#b45309' }}>Previous Remaining Balance</div>
                        <div style={{ color: '#78350f', fontSize: '1.05rem' }}>Carried forward arrears</div>
                        <div style={{ textAlign: 'right', fontWeight: 900, color: '#b45309', fontSize: '1.25rem' }}>Rs {prevRemaining}</div>
                      </div>
                    )}

                    {/* Financial Summary Breakdown */}
                    <div style={{ backgroundColor: '#ffffff', padding: '1.4rem 1.4rem 0.8rem 1.4rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', padding: '0.85rem 1.2rem', fontSize: '1.25rem', fontWeight: 900, backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1.5px solid #a7f3d0', marginBottom: '0.75rem' }}>
                        <div style={{ color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GRAND TOTAL DUE</div>
                        <div style={{ textAlign: 'right', color: '#047857', fontSize: '1.45rem' }}>Rs {grandTotal}</div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', padding: '0.75rem 1.2rem', fontSize: '1.18rem', fontWeight: 800 }}>
                        <div style={{ color: '#0f172a', textTransform: 'uppercase' }}>PAID AMOUNT</div>
                        <div style={{ textAlign: 'right', color: '#047857', fontSize: '1.3rem' }}>Rs {paidAmount}</div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', padding: '0.85rem 1.2rem', fontSize: '1.25rem', fontWeight: 900, backgroundColor: remainingBalance > 0 ? '#fff1f2' : '#f8fafc', borderRadius: '8px', border: remainingBalance > 0 ? '1.5px solid #fecdd3' : '1.5px solid #e2e8f0', margin: '0.5rem 0 1rem 0' }}>
                        <div style={{ color: remainingBalance > 0 ? '#be123c' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REMAINING BALANCE</div>
                        <div style={{ textAlign: 'right', color: remainingBalance > 0 ? '#be123c' : '#475569', fontSize: '1.45rem' }}>Rs {remainingBalance}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic UPI Payment QR Code Block */}
                {(() => {
                  const upiPayAmount = remainingBalance > 0 ? remainingBalance : grandTotal;
                  const upiString = `upi://pay?pa=9520673658@pthdfc&pn=Guarav%20Kumar&am=${upiPayAmount}&cu=INR`;
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`;

                  return (
                    <div style={{
                      margin: '2rem 0 2.2rem 0',
                      padding: '1.6rem 2rem',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      border: '2.5px solid #cbd5e1',
                      borderRadius: '14px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2.2rem'
                    }}>
                      <div style={{
                        backgroundColor: '#ffffff',
                        padding: '0.8rem',
                        borderRadius: '10px',
                        border: '2px solid #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}>
                        <img 
                          src={qrUrl} 
                          alt="Paytm UPI QR Code" 
                          style={{ width: '180px', height: '180px', display: 'block', borderRadius: '6px' }} 
                        />
                        <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 900, marginTop: '0.45rem', letterSpacing: '0.05em' }}>
                          paytm ❤️ UPI
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em' }}>
                          SCAN TO PAY DUES VIA ANY UPI APP
                        </div>
                        <div style={{ fontSize: '1.02rem', color: '#64748b', marginTop: '0.3rem', fontWeight: 600 }}>
                          Paytm • PhonePe • Google Pay • BHIM • Camera
                        </div>
                        <div style={{ marginTop: '0.8rem', fontSize: '1.08rem', background: '#e0f2fe', color: '#0369a1', padding: '0.6rem 1rem', borderRadius: '8px', border: '1.5px solid #bae6fd', display: 'inline-block', fontWeight: 800 }}>
                          UPI ID: <span style={{ fontFamily: 'monospace', fontSize: '1.15rem' }}>9520673658@pthdfc</span>
                        </div>
                        <div style={{ fontSize: '1.02rem', color: '#334155', marginTop: '0.5rem', fontWeight: 700 }}>
                          Payee Name: <strong>Guarav Kumar</strong>
                        </div>
                        <div style={{ fontSize: '1.08rem', fontWeight: 900, color: '#047857', marginTop: '0.55rem', backgroundColor: '#d1fae5', padding: '0.45rem 0.9rem', borderRadius: '6px', display: 'inline-block' }}>
                          ⚡ Auto Pre-filled Amount: Rs {upiPayAmount}
                        </div>
                      </div>
                    </div>
                  );
                })()}

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

              {/* 4K Super HD Security Footer */}
              <div style={{
                padding: '1.6rem 3.2rem',
                backgroundColor: '#f8fafc',
                borderTop: '2px solid #e2e8f0',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                fontSize: '0.95rem',
                color: '#64748b',
                fontWeight: 600
              }}>
                <div>🔒 Official RentApp 4K Electronic Document • Valid without physical signature</div>
                <div style={{ fontWeight: 800, color: '#475569' }}>RentApp Verification Portal</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mobile Receipt Download Instruction Popup */}
      {pendingRedirectUrl && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 8, 15, 0.9)',
          backdropFilter: 'blur(16px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '420px', width: '100%', padding: '1.75rem', border: '1px solid rgba(255, 184, 0, 0.4)', boxShadow: 'var(--glass-shadow), var(--glow-gold)' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 0.75rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 184, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Download color="var(--accent-gold)" size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Download Generated Bill</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Save generated bill receipt to mobile gallery:
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.7rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ backgroundColor: 'var(--accent-gold)', color: '#0b0d14', borderRadius: '50%', width: '24px', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>1</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Tap <strong style={{ color: '#ffca28' }}>"Open Image in Chrome"</strong> below</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.7rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ backgroundColor: 'var(--accent-gold)', color: '#0b0d14', borderRadius: '50%', width: '24px', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>2</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}><strong style={{ color: 'var(--text-primary)' }}>Long-press</strong> on image for 2-3 seconds</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.7rem 0' }}>
                <span style={{ backgroundColor: 'var(--accent-gold)', color: '#0b0d14', borderRadius: '50%', width: '24px', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>3</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Tap <strong style={{ color: '#00e676' }}>"Download image"</strong> to save to gallery</span>
              </div>
            </div>

            <button
              onTouchEnd={() => {
                const url = pendingRedirectUrl;
                setPendingRedirectUrl(null);
                if (url) window.location.href = url;
              }}
              onClick={() => {
                const url = pendingRedirectUrl;
                setPendingRedirectUrl(null);
                if (url) window.location.href = url;
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700 }}
            >
              Open Image in Chrome 🚀
            </button>

            <button
              onClick={() => setPendingRedirectUrl(null)}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '0.6rem', padding: '0.65rem' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

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
