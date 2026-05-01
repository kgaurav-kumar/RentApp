import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Payment from './pages/Payment';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';
import './index.css';

// Protected Route Component
function ProtectedRoute({ children, requireAdmin }) {
  const { currentUser, adminEmail } = useAuth();

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && currentUser.email !== adminEmail) {
    return <Navigate to="/user" replace />;
  }

  if (!requireAdmin && currentUser.email === adminEmail) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

// Auth Route Component (redirects logged in users to their dashboard)
function AuthRoute({ children }) {
  const { currentUser, adminEmail } = useAuth();

  if (currentUser) {
    if (currentUser.email === adminEmail) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/user" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AuthRoute><Login /></AuthRoute>} />
          <Route path="/signup" element={<AuthRoute><SignUp /></AuthRoute>} />
          
          <Route path="/user" element={
            <ProtectedRoute requireAdmin={false}>
              <UserDashboard />
            </ProtectedRoute>
          } />

          <Route path="/pay" element={
            <ProtectedRoute requireAdmin={false}>
              <Payment />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
