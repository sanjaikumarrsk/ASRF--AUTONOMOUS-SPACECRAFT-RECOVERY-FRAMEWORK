import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthPage from './auth/AuthPage';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import System from './pages/System';
import About from './pages/About';

function ProtectedApplication() {
  const { isAuthenticated, checking } = useAuth();
  const location = useLocation();

  if (checking) return <div className="auth-loading" aria-live="polite">Checking access...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="asrf-app-root">
      <Navbar />
      <main className="asrf-main-viewport">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/records" element={<Records />} />
          <Route path="/system" element={<System />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/*" element={<ProtectedApplication />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
