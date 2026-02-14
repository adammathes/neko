import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import './App.css';
import { apiFetch } from './utils';

// Protected Route wrapper
function RequireAuth({ children }: { children: React.ReactElement }) {
  const [auth, setAuth] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    apiFetch('/api/auth')
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
import Settings from './components/Settings';

function Dashboard({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  const [sidebarVisible, setSidebarVisible] = useState(true);

  return (
    <div
      className={`dashboard ${sidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'} theme-${theme}`}
    >
      <div className="dashboard-content">
        <aside className={`dashboard-sidebar ${sidebarVisible ? '' : 'hidden'}`}>
          <FeedList theme={theme} setTheme={setTheme} setSidebarVisible={setSidebarVisible} />
        </aside>
        <main className="dashboard-main">
          <Routes>
            <Route path="/feed/:feedId" element={<FeedItems />} />
            <Route path="/tag/:tagName" element={<FeedItems />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<FeedItems />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('neko-theme') || 'light');

  const handleSetTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('neko-theme', newTheme);
  };

  const basename = window.location.pathname.startsWith('/v2') ? '/v2' : '/';

  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Dashboard theme={theme} setTheme={handleSetTheme} />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
