import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/Login.css';

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state && location.state.email) || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'warning', message }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setFeedback(null);

    if (!email.trim() || !otp.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in email and OTP.' });
      return;
    }

    if (password.length < 6) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedOtp = otp.trim();

      const { data: resetRecord, error } = await supabase
        .from('password_resets')
        .select('*')
        .eq('email', trimmedEmail)
        .eq('otp', trimmedOtp)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !resetRecord) {
        setFeedback({ type: 'error', message: 'Invalid OTP or email.' });
        setLoading(false);
        return;
      }

      const now = new Date();
      const expiresAt = new Date(resetRecord.expires_at);
      if (expiresAt < now) {
        setFeedback({ type: 'error', message: 'OTP has expired. Please request a new one.' });
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ password })
        .eq('email', trimmedEmail);

      if (updateError) {
        throw updateError;
      }

      await supabase
        .from('password_resets')
        .update({ used: true })
        .eq('id', resetRecord.id);

      setFeedback({ type: 'success', message: 'Password has been reset. You can now log in.' });
      navigate('/login');
    } catch (err) {
      console.error('Reset password error:', err);
      setFeedback({ type: 'error', message: 'Unable to reset password. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Reset Password</h2>
        <p className="login-subtitle">
          Enter the OTP from your email and choose a new password.
        </p>

        {feedback && (
          <div
            className={`page-alert ${
              feedback.type === 'success'
                ? 'page-alert-success'
                : feedback.type === 'warning'
                ? 'page-alert-warning'
                : 'page-alert-error'
            }`}
          >
            <span className="page-alert-emoji">
              {feedback.type === 'success'
                ? '✅'
                : feedback.type === 'warning'
                ? '⚠️'
                : '❌'}
            </span>
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>OTP</label>
            <input
              type="text"
              placeholder="Enter the 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-login"
            disabled={loading}
          >
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>

        <p className="switch-text">
          Remembered your password? <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
