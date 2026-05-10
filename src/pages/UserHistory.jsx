import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Calendar, Bolt, IndianRupee, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function UserHistory() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const docRef = doc(db, "users", userId);
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
  }, [userId]);

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
      await setDoc(doc(db, "users", userId), { history: updatedHistory }, { merge: true });
      setUserData(prev => ({ ...prev, history: updatedHistory }));
    } catch (error) {
      console.error("Error deleting history:", error);
      alert("Failed to delete history record.");
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--success)' }}>
                      ₹{record.totalDue}
                    </div>
                    <button className="btn" onClick={() => handleDeleteHistory(record.id)} style={{ padding: '0.4rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} title="Delete Record">
                      <Trash2 size={16} />
                    </button>
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
