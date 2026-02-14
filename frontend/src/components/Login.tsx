import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Use URLSearchParams to send as form-urlencoded, matching backend expectation
      const params = new URLSearchParams();
      params.append('password', password);

      const res = await fetch('/api/login', {
        method: 'POST',
        body: params,
      });

      if (res.ok) {
        navigate('/');
      } else {
        const data = await res.json();
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>neko rss mode</h1>
        <div className="form-group">
          <label htmlFor="password">password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit">login</button>
      </form>
    </div>
  );
}
