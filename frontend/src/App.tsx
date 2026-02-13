import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import './App.css';

// Protected Route wrapper
function RequireAuth({ children }: { children: React.ReactElement }) {
  const [auth, setAuth] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => {
        if (res.ok) {
          setAuth(true);
        } else {
          setAuth(false);
        }
      })
      .catch(() => setAuth(false));
  }, []);

  if (auth === null) {
    return <div>Loading...</div>;
  }

  if (!auth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function Dashboard() {
  // Placeholder for now
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to the new Neko/v2 frontend.</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter basename="/v2">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
