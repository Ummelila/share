import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/Login.css';

function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state && location.state.email) || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'warning', message }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setFeedback(null);

    if (!email.trim() || !otp.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email and OTP.' });
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedOtp = otp.trim();

      // Find latest unused signup OTP
      const { data: signupRecord, error } = await supabase
        .from('signup_otps')
        .select('*')
        .eq('email', trimmedEmail)
        .eq('otp', trimmedOtp)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !signupRecord) {
        setFeedback({ type: 'error', message: 'Invalid OTP or email.' });
        setLoading(false);
        return;
      }

      const now = new Date();
      const expiresAt = new Date(signupRecord.expires_at);
      if (expiresAt < now) {
        setFeedback({ type: 'error', message: 'OTP has expired. Please sign up again.' });
        setLoading(false);
        return;
      }

      // Double-check: Verify user doesn't already exist (in case they registered between signup and verification)
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', trimmedEmail.toLowerCase().trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is fine
        throw checkError;
      }

      if (existingUser) {
        setFeedback({ 
          type: 'error', 
          message: 'An account with this email already exists. Please login instead.' 
        });
        setLoading(false);
        return;
      }

      // Create actual user in users table (only after OTP verification)
      const { data: createdUsers, error: createError } = await supabase
        .from('users')
        .insert([
          {
            name: signupRecord.name,
            email: signupRecord.email.toLowerCase().trim(),
            password: signupRecord.password,
            phone: signupRecord.phone,
          },
        ])
        .select();

      if (createError) {
        // Check if error is due to duplicate email (race condition)
        if (createError.code === '23505' || createError.message?.includes('duplicate')) {
          setFeedback({ 
            type: 'error', 
            message: 'An account with this email already exists. Please login instead.' 
          });
        } else {
          throw createError;
        }
        setLoading(false);
        return;
      }

      const user = createdUsers[0];

      // Mark signup OTP as used
      await supabase
        .from('signup_otps')
        .update({ used: true })
        .eq('id', signupRecord.id);

      // Log user in locally and redirect to dashboard
      localStorage.setItem('currentUser', JSON.stringify(user));

      setFeedback({ type: 'success', message: 'Email verified and account created. Redirecting…' });
      navigate('/dashboard');
    } catch (err) {
      console.error('Verify email error:', err);
      setFeedback({ type: 'error', message: 'Unable to verify email. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Verify Email</h2>
        <p className="login-subtitle">
          Enter the OTP we sent to your email to complete your registration.
          <br />
          <small style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem', display: 'block' }}>
            OTP is valid for 10 minutes.
          </small>
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

          <button
            type="submit"
            className="btn btn-login"
            disabled={loading}
          >
            {loading ? 'Verifying…' : 'Verify Email'}
          </button>
        </form>

        <p className="switch-text">
          Already verified? <Link to="/login">Go to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default VerifyEmail;
