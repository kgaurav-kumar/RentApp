import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Camera, Edit2, Save, Loader2, Phone, Mail, CheckCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ rent: 0, rate: 8, m1_prev: 0, m1_curr: 0, m2_prev: 0, m2_curr: 0 });
  const [uploading, setUploading] = useState(null); // { id: userId, type: 'm1_prev'|'m1_curr'|'m2_prev'|'m2_curr' }

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
      m2_curr: users[userId].m2_curr || 0
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
    if (!window.confirm(`Are you sure you want to mark ${data.name || 'Tenant'}'s payment as received?\n\nThis will set Rent to 0, and carry forward current meter readings as previous readings for the next month.`)) {
      return;
    }

    try {
      await setDoc(doc(db, "users", userId), {
        ...data,
        rent: 0,
        m1_prev: data.m1_curr || data.m1_prev || 0,
        m2_prev: data.m2_curr || data.m2_prev || 0,
        m1_prev_photo: data.m1_curr_photo || data.m1_prev_photo || null,
        m2_prev_photo: data.m2_curr_photo || data.m2_prev_photo || null,
        m1_curr_photo: null,
        m2_curr_photo: null
      }, { merge: true });
      alert("Payment marked as received. Data has been reset for the next month.");
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Failed to update payment status.");
    }
  };

  const handleSendEmail = (data, totalDue, totalUnits) => {
    const subject = encodeURIComponent("Month-end Rent & Electricity Bill");
    const body = encodeURIComponent(
      `Hello ${data.name || 'Tenant'},\n\n` +
      `Here are your bill details for this month:\n\n` +
      `Rent Amount: Rs ${data.rent || 0}\n` +
      `Electricity Consumed: ${totalUnits} units\n` +
      `Electricity Charges: Rs ${totalUnits * (data.rate || 8)}\n` +
      `---------------------------------------\n` +
      `Total Amount Due: Rs ${totalDue}\n\n` +
      `Please pay the total amount as soon as possible.\n\n` +
      `Regards,\nAdmin`
    );
    window.location.href = `mailto:${data.email || ''}?subject=${subject}&body=${body}`;
  };

  const handlePaymentSuccessEmail = (data, totalDue, totalUnits) => {
    const subject = encodeURIComponent("Payment Successful Confirmation");
    const body = encodeURIComponent(
      `Hello ${data.name || 'Tenant'},\n\n` +
      `Your bill has been successfully paid. Here are the details of the payment received:\n\n` +
      `Rent Amount: Rs ${data.rent || 0}\n` +
      `Electricity Consumed: ${totalUnits} units\n` +
      `Electricity Charges: Rs ${totalUnits * (data.rate || 8)}\n` +
      `---------------------------------------\n` +
      `Total Amount Paid: Rs ${totalDue}\n\n` +
      `Thank you for your payment!\n\n` +
      `Regards,\nAdmin`
    );
    window.location.href = `mailto:${data.email || ''}?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" />
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
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{label} Photo</div>
        {photoUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '0.4rem', fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', justifyContent: 'center' }}>
              <Camera size={12} style={{ marginRight: '0.25rem' }} /> See Photo
            </a>
            <label className="btn" style={{ padding: '0.4rem', fontSize: '0.75rem', border: '1px dashed var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: isUploading ? 'not-allowed' : 'pointer', justifyContent: 'center' }}>
              {isUploading ? <Loader2 size={12} className="animate-spin" style={{ marginRight: '0.25rem' }} /> : <Edit2 size={12} style={{ marginRight: '0.25rem' }} />}
              {isUploading ? 'Uploading...' : 'Change'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(e, id, meterType)} disabled={isUploading} />
            </label>
          </div>
        ) : (
          <label className="btn" style={{ width: '100%', height: '60px', border: '1px dashed var(--border-color)', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', cursor: isUploading ? 'not-allowed' : 'pointer' }}>
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            <span style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>{isUploading ? 'Uploading...' : 'Upload'}</span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(e, id, meterType)} disabled={isUploading} />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="container animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>Admin Dashboard</h1>
          <p style={{ margin: 0 }}>Manage Tenants, Rent & Meters</p>
        </div>
        <button className="btn" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} onClick={handleLogout}>
          <LogOut size={18} /> Logout
        </button>
      </header>

      {userEntries.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No tenants have signed up yet.</p>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                      <User color="var(--accent-primary)" size={24} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{data.name || 'Tenant'}</h2>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Phone size={12} /> {data.phone || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.5rem 1rem' }} onClick={() => handleMarkPaid(id, data)}>
                      <CheckCircle size={16} /> Payment Received
                    </button>
                    <button className="btn" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.5rem 1rem' }} onClick={() => handleSendEmail(data, totalDue, totalUnits)}>
                      <Mail size={16} /> Send Bill
                    </button>
                    <button className="btn" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.5rem 1rem' }} onClick={() => handlePaymentSuccessEmail(data, totalDue, totalUnits)}>
                      <Mail size={16} /> Send Receipt
                    </button>
                    {editingUser === id ? (
                      <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => handleSave(id)}>
                        <Save size={16} /> Save
                      </button>
                    ) : (
                      <button className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem' }} onClick={() => handleEdit(id)}>
                        <Edit2 size={16} /> Edit
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                  
                  {/* Rent and Rate */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Rent Amount:</span>
                    {editingUser === id ? (
                      <input type="number" className="input-field" style={{ width: '90px', padding: '0.4rem' }} value={editForm.rent === 0 ? '' : editForm.rent} placeholder="0" onChange={e => setEditForm({...editForm, rent: e.target.value === '' ? '' : Number(e.target.value)})} />
                    ) : (
                      <span style={{ fontWeight: '600', fontSize: '1rem' }}>₹{data.rent || 0}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Electricity Price (/unit):</span>
                    {editingUser === id ? (
                      <input type="number" className="input-field" style={{ width: '90px', padding: '0.4rem' }} value={editForm.rate === 0 ? '' : editForm.rate} placeholder="0" onChange={e => setEditForm({...editForm, rate: e.target.value === '' ? '' : Number(e.target.value)})} />
                    ) : (
                      <span style={{ fontWeight: '600', fontSize: '1rem' }}>₹{data.rate || 8}</span>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>

                  {/* Meter 1 */}
                  <h4 style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', marginBottom: 0 }}>Meter 1 Reading</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Previous</span>
                      {editingUser === id ? (
                        <input type="number" className="input-field" style={{ padding: '0.4rem' }} value={editForm.m1_prev === 0 ? '' : editForm.m1_prev} placeholder="0" onChange={e => setEditForm({...editForm, m1_prev: e.target.value === '' ? '' : Number(e.target.value)})} />
                      ) : (
                        <div style={{ fontWeight: '500' }}>{data.m1_prev || 0}</div>
                      )}
                      {renderPhotoUpload(data, id, "Prev", "m1_prev")}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current</span>
                      {editingUser === id ? (
                        <input type="number" className="input-field" style={{ padding: '0.4rem' }} value={editForm.m1_curr === 0 ? '' : editForm.m1_curr} placeholder="0" onChange={e => setEditForm({...editForm, m1_curr: e.target.value === '' ? '' : Number(e.target.value)})} />
                      ) : (
                        <div style={{ fontWeight: '500' }}>{data.m1_curr || 0}</div>
                      )}
                      {renderPhotoUpload(data, id, "Curr", "m1_curr")}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    Units: {editingUser === id ? edit_m1_units : m1_units}
                  </div>

                  {/* Meter 2 */}
                  <h4 style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem' }}>Meter 2 Reading</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Previous</span>
                      {editingUser === id ? (
                        <input type="number" className="input-field" style={{ padding: '0.4rem' }} value={editForm.m2_prev === 0 ? '' : editForm.m2_prev} placeholder="0" onChange={e => setEditForm({...editForm, m2_prev: e.target.value === '' ? '' : Number(e.target.value)})} />
                      ) : (
                        <div style={{ fontWeight: '500' }}>{data.m2_prev || 0}</div>
                      )}
                      {renderPhotoUpload(data, id, "Prev", "m2_prev")}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current</span>
                      {editingUser === id ? (
                        <input type="number" className="input-field" style={{ padding: '0.4rem' }} value={editForm.m2_curr === 0 ? '' : editForm.m2_curr} placeholder="0" onChange={e => setEditForm({...editForm, m2_curr: e.target.value === '' ? '' : Number(e.target.value)})} />
                      ) : (
                        <div style={{ fontWeight: '500' }}>{data.m2_curr || 0}</div>
                      )}
                      {renderPhotoUpload(data, id, "Curr", "m2_curr")}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    Units: {editingUser === id ? edit_m2_units : m2_units}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>
                  
                  {/* Total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Due:</span>
                    <span style={{ fontWeight: '700', fontSize: '1.25rem', color: 'var(--success)' }}>
                      ₹{editingUser === id ? edit_totalDue : totalDue}
                    </span>
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
