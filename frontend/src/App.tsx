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

import FeedList from './components/FeedList';
import FeedItems from './components/FeedItems';

function Dashboard() {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Neko Reader</h1>
        <nav>
          <button onClick={() => {
            fetch('/api/logout', { method: 'POST' })
              .then(() => window.location.href = '/login/');
          }} className="logout-btn">
            Logout
          </button>
        </nav>
      </header>
      <div className="dashboard-content">
        <aside className="dashboard-sidebar">
          <FeedList />
        </aside>
        <main className="dashboard-main">
          <Routes>
            <Route path="/feed/:feedId" element={<FeedItems />} />
            <Route path="/" element={<p>Select a feed to view items.</p>} />
          </Routes>
        </main>
      </div>
    </div>
  );
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
