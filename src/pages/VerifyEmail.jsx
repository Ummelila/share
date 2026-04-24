import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import { supabase } from '../supabaseClient';

function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state && location.state.email) || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

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
        setFeedback({ type: 'error', message: 'Invalid OTP or email. Please check your inbox.' });
        setLoading(false);
        return;
      }

      const now = new Date();
      if (new Date(signupRecord.expires_at) < now) {
        setFeedback({ type: 'error', message: 'OTP has expired. Please sign up again.' });
        setLoading(false);
        return;
      }

      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', trimmedEmail.toLowerCase().trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingUser) {
        setFeedback({ type: 'error', message: 'An account with this email already exists. Please login instead.' });
        setLoading(false);
        return;
      }

      const { data: createdUsers, error: createError } = await supabase
        .from('users')
        .insert([{
          name: signupRecord.name,
          email: signupRecord.email.toLowerCase().trim(),
          password: signupRecord.password,
          phone: signupRecord.phone,
          is_verified: true
        }])
        .select();

      if (createError) throw createError;

      const user = createdUsers[0];

      await supabase
        .from('signup_otps')
        .update({ used: true })
        .eq('id', signupRecord.id);

      localStorage.setItem('currentUser', JSON.stringify(user));
      setFeedback({ type: 'success', message: 'Email verified successfully! Redirecting to dashboard...' });
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error('Verify email error:', err);
      setFeedback({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 p-4 animate-fade-in relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 opacity-50 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-50 opacity-50 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 p-8 md:p-12 relative z-10 border border-gray-100">
        <div className="absolute top-8 left-8">
           <button
            type="button"
            onClick={() => navigate("/signup")}
            className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="text-center mb-10 mt-4">
          <h2 className="text-3xl font-bold text-gray-900 font-roboto tracking-tight">Verify Your Email</h2>
          <p className="text-gray-600 mt-2 font-medium">Please enter the 6-digit code sent to your email.</p>
        </div>

        {feedback && (
          <div className={`mb-8 p-4 border-l-4 rounded-xl text-sm font-bold flex items-center gap-3 transition-all ${
            feedback.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 bg-current rounded-full" />}
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-gray-700 tracking-wide ml-1">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full h-12 px-5 mt-2 bg-gray-50 border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900" 
              placeholder="name@email.com" 
              required 
            />
          </div>

          <div>
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-bold text-gray-700 tracking-wide">Verification OTP</label>
              <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Expires in 10m</span>
            </div>
            <input 
              type="text" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              className="w-full h-14 px-5 mt-2 bg-gray-50 border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900 tracking-widest text-center font-bold text-2xl" 
              placeholder="000000" 
              maxLength={6}
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full h-14 bg-[#124074] text-white rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all shadow-xl shadow-blue-900/20 font-semibold text-lg ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#103866]'}`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Verifying...</span>
              </div>
            ) : (
              <span>Confirm Verification</span>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-gray-500 font-semibold">
            Didn't receive the code? <button onClick={() => navigate('/signup')} className="text-[#124074] hover:underline font-bold">Resubmit Signup</button>
          </p>
          <div className="mt-4 pt-6 border-t border-gray-50">
            <Link to="/login" className="text-gray-400 hover:text-gray-600 text-sm font-medium flex items-center justify-center gap-1 group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;

