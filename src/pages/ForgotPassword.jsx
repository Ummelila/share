import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { supabase } from '../supabaseClient';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const generateOtp = (length = 6) => {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
  };

  const sendResetEmail = async (email, name, otp) => {
    try {
      const emailjs = await import('@emailjs/browser').catch(() => null);
      if (!emailjs || !process.env.REACT_APP_EMAILJS_SERVICE_ID) {
        console.log('EmailJS not configured');
        return false;
      }
      if (process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
        emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
      }
      await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
        {
          to_email: email,
          to_name: name || 'User',
          subject: 'Password Reset OTP',
          message: `Your password reset OTP is ${otp}. Valid for 15 mins.`
        }
      );
      return true;
    } catch (err) {
      console.log('Reset email failed:', err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setFeedback(null);
    if (!email.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email.' });
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
        setFeedback({ type: 'success', message: 'If registered, an OTP has been sent. Moving to reset...' });
        setTimeout(() => navigate('/reset-password', { state: { email: trimmedEmail } }), 2000);
        return;
      }

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await supabase.from('password_resets').insert([{ email: trimmedEmail, otp, expires_at: expiresAt }]);
      await sendResetEmail(user.email, user.name, otp);

      setFeedback({ type: 'success', message: 'OTP sent! Redirecting to reset page...' });
      setTimeout(() => navigate('/reset-password', { state: { email: trimmedEmail } }), 2000);
    } catch (err) {
      console.error('Error:', err);
      setFeedback({ type: 'error', message: 'Error sending OTP. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 p-4 animate-fade-in relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 opacity-50 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-50 opacity-50 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 p-8 md:p-12 relative z-10 border border-gray-100">
        <div className="absolute top-8 left-8">
           <button onClick={() => navigate("/login")} className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all shadow-sm active:scale-95">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="text-center mb-10 mt-4">
          <h2 className="text-3xl font-bold text-gray-900 font-roboto tracking-tight">Forgot Password?</h2>
          <p className="text-gray-600 mt-2 font-medium">We'll send you reset instructions to your email.</p>
        </div>

        {feedback && (
          <div className={`mb-8 p-4 border-l-4 rounded-xl text-sm font-bold flex items-center gap-3 transition-all ${feedback.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 bg-current rounded-full" />}
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-gray-700 tracking-wide ml-1">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-12 px-5 mt-2 bg-gray-50 border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900" placeholder="name@email.com" required />
          </div>

          <button type="submit" disabled={loading} className={`w-full h-14 bg-[#124074] text-white rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all shadow-xl shadow-blue-900/20 font-semibold text-lg ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#103866]'}`}>
            {loading ? <div className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>Sending...</span></div> : <span>Send OTP</span>}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-gray-500 font-semibold">Remembered? <Link to="/login" className="text-[#124074] hover:underline font-bold">Back to Login</Link></p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;

