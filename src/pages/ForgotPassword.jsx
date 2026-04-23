import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/Login.css';

function generateOtp(length = 6) {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

async function sendResetEmail(email, name, otp) {
  try {
    const emailjs = await import('@emailjs/browser').catch(() => null);
    if (!emailjs || !process.env.REACT_APP_EMAILJS_SERVICE_ID) {
      console.log('EmailJS not configured, skipping password reset email');
      return false;
    }

    if (process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
      emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
    }

    const subject = 'Password Reset OTP';
    const message = `We received a request to reset your password on Share For Good.\n\nYour OTP: ${otp}\n\nThis code will expire in 15 minutes. If you did not request this, you can safely ignore this email.\n\nThank you.`;

    await emailjs.send(
      process.env.REACT_APP_EMAILJS_SERVICE_ID,
      process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        to_name: name || 'User',
        subject,
        message,
      }
    );

    return true;
  } catch (error) {
    console.log('Password reset email skipped or failed:', error.message);
    return false;
  }
}

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'warning', message }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setFeedback(null);

    if (!email.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email address.' });
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = email.trim();

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', trimmedEmail)
        .single();

      if (error || !user) {
        // For security, don't reveal whether email exists
        setFeedback({
          type: 'success',
          message: 'If this email is registered, an OTP has been sent.',
        });
        setLoading(false);
        navigate('/reset-password', { state: { email: trimmedEmail } });
        return;
      }

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // Store OTP in password_resets table
      const { error: insertError } = await supabase
        .from('password_resets')
        .insert([
          {
            email: trimmedEmail,
            otp,
            expires_at: expiresAt,
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      await sendResetEmail(user.email, user.name, otp);

      setFeedback({
        type: 'success',
        message: 'An OTP has been sent to your email (if EmailJS is configured).',
      });

      navigate('/reset-password', { state: { email: trimmedEmail } });
    } catch (err) {
      console.error('Forgot password error:', err);
      setFeedback({
        type: 'error',
        message: 'Unable to reset password right now. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Forgot Password</h2>
        <p className="login-subtitle">
          Enter your registered email and we will send you an OTP to reset your password.
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

          <button
            type="submit"
            className="btn btn-login"
            disabled={loading}
          >
            {loading ? 'Sending OTP…' : 'Send OTP'}
          </button>
        </form>

        <p className="switch-text">
          Remembered your password? <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
