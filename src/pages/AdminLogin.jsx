import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/AdminLogin.css';

function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [credentials, setCredentials] = useState({  //store inputs
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Check if already logged in as admin
  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser');
    if (adminUser) {
      // If already logged in, redirect to admin panel or intended destination
      const from = location.state?.from || '/admin-panel';
      navigate(from, { replace: true });
    }
  }, [navigate, location]); 

  const handleChange = (e) => {  //show values in input fields
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {   //function take time somewhere
    e.preventDefault();
    if (loading) return;  //if already in loading state no other requests or process
    setFeedback(null);
    setLoading(true);

    try {
      // Look up admin user in Supabase by email
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', credentials.email) //row matches with credential.email input by user
        .single(); //return only on row

      if (error || !admin) {
        setFeedback({ type: 'error', message: 'Invalid admin credentials!' });
        setLoading(false);
        return;
      }

      // For now we compare plain-text passwords.
      // In production you should store a hashed password and verify it securely.
      if (admin.password !== credentials.password) {
        setFeedback({ type: 'error', message: 'Invalid admin credentials!' });
        setLoading(false);
        return;
      }

      // Save minimal admin session info
      localStorage.setItem(  //storage where data save until user logout, not delete on reload
        'adminUser',
        JSON.stringify({ id: admin.id, email: admin.email })
      );
      setFeedback({ type: 'success', message: 'Admin login successful! Redirecting…' });
      // Redirect to intended destination or admin panel
      const from = location.state?.from || '/admin-panel';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Admin login error:', err);
      setFeedback({ type: 'error', message: 'Unable to login as admin. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-icon">👨‍💼</div>
        <h2>Admin Access</h2>
        <p className="admin-subtitle">Authorized Personnel Only</p>

        {feedback && (
          <div
            className={`page-alert ${
              feedback.type === 'success'
                ? 'page-alert-success'
                : 'page-alert-error'
            }`}
          >
            <span className="page-alert-emoji">
              {feedback.type === 'success' ? '✅' : '❌'}
            </span>
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Admin Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter admin email"
              value={credentials.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-admin-login" disabled={loading}>
            {loading ? 'Logging in…' : 'Login as Admin'}
          </button>
        </form>

        <div className="admin-info">
          <small>🔒 This area is restricted to administrators only</small>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;