import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, HeartHandshake, User, Phone, UserPlus, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';

function generateSignupOtp(length = 6) {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

async function sendSignupOtpEmail(email, name, otp) {
  try {
    const emailjs = await import('@emailjs/browser').catch(() => null);
    if (!emailjs || !process.env.REACT_APP_EMAILJS_SERVICE_ID) {
      console.log('EmailJS not configured, skipping signup OTP email');
      return false;
    }

    if (process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
      emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
    }

    const subject = 'Verify Your Email - Share For Good';
    const message = `Thank you for signing up for Share For Good.\n\nYour email verification OTP: ${otp}\n\nThis code confirms that this email address belongs to you.\n\nThank you.`;

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
    console.log('Signup OTP email skipped or failed:', error.message);
    return false;
  }
}

function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    terms: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 11);
      setFormData({ ...formData, [name]: numericValue });
    } else {
      setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFeedback(null);

    if (loading) return;

    const trimmedName = formData.name.trim();
    const trimmedPhone = formData.phone.trim();

    const nameRegex = /^[a-zA-Z ]+$/;
    if (!nameRegex.test(trimmedName)) {
      setError('Name can only contain letters and spaces (no numbers).');
      return;
    }

    if (!trimmedPhone.startsWith('03')) {
      setError('Phone number must start with 03 (e.g., 03123456789).');
      return;
    }

    if (trimmedPhone.length !== 11) {
      setError('Phone number must be exactly 11 digits.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters!');
      return;
    }

    if (!formData.terms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    try {
      setLoading(true);

      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.email.toLowerCase().trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        setError('An account with this email already exists. Please login instead.');
        setLoading(false);
        return;
      }

      const otp = generateSignupOtp();

      const { error: insertError } = await supabase
        .from('signup_otps')
        .insert([
          {
            name: trimmedName,
            email: formData.email.toLowerCase().trim(),
            password: formData.password,
            phone: trimmedPhone,
            otp,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          },
        ]);

      if (insertError) throw insertError;

      await sendSignupOtpEmail(formData.email, formData.name, otp);

      setFeedback({
        type: 'success',
        message: 'We have sent an OTP to your email (if email is configured). Please enter it within 10 minutes to complete your registration.',
      });

      navigate('/verify-email', { state: { email: formData.email } });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden animate-fade-in bg-white">
      {/* Left Side - Seamless Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#124074] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#124074] to-[#0a2544]"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500 opacity-10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500 opacity-10 rounded-full blur-[120px]"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-center p-12 w-full h-full">
          <div className="mb-10">
            <div className="flex flex-col items-center justify-center gap-6 mb-4">
              <img src="/logo.png" alt="Share4Good Logo" className="w-32 h-32 object-contain" />
              <h1 className="text-5xl font-bold text-white font-roboto tracking-tight">Share<span className="text-blue-400">4</span>Good</h1>
            </div>
          </div>
          <p className="text-white/70 text-xl max-w-md font-medium leading-relaxed">Join the most trusted community for collective generosity in Pakistan.</p>
        </div>

        {/* Removed Established 2024 */}
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <div className="absolute top-8 left-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        <div className="w-full max-w-md">
          <div className="text-left mb-10">
            <h2 className="text-4xl font-bold text-gray-900 font-roboto tracking-tight">Create Account</h2>
            <p className="text-gray-600 mt-2 text-lg font-medium">Join our mission to spread kindness</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50/80 border-l-4 border-red-500 text-red-600 rounded-lg text-sm font-bold flex items-center gap-3">
              <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              {error}
            </div>
          )}

          {feedback && (
            <div className={`mb-6 p-4 border-l-4 rounded-lg text-sm font-bold flex items-center gap-3 ${feedback.type === 'success'
                ? 'bg-green-50/80 border-green-500 text-green-600'
                : 'bg-red-50/80 border-red-500 text-red-600'
              }`}>
              <span className="flex-shrink-0 w-2 h-2 bg-current rounded-full"></span>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div>
              <label className="text-lg font-bold text-black tracking-wide ml-1">Full Name</label>
              <div className="relative mt-2">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full h-14 px-6 bg-gray-50 border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                  placeholder="Ahmed Khan"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-lg font-bold text-black tracking-wide ml-1">Email</label>
                <div className="relative mt-2">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full h-14 px-6 bg-gray-50 border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                    placeholder="name@email.com"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-lg font-bold text-black tracking-wide ml-1">Phone</label>
                <div className="relative mt-2">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full h-14 px-6 bg-gray-50 border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                    placeholder="03123456789"
                    maxLength={11}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-lg font-bold text-black tracking-wide ml-1">Password</label>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full h-14 px-6 pr-12 bg-gray-50 border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-lg font-bold text-black tracking-wide ml-1">Confirm Password</label>
                <div className="relative mt-2">
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full h-14 px-6 bg-gray-50 border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900 font-medium placeholder:font-light placeholder:text-gray-400"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="terms"
                  checked={formData.terms}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300 text-[#124074] focus:ring-[#124074]"
                  required
                />
                <span className="text-sm text-gray-500 font-semibold group-hover:text-gray-700 transition-colors">
                  Agree to <Link to="/terms" className="text-[#124074] hover:underline">Terms</Link> & <Link to="/privacy" className="text-[#124074] hover:underline">Privacy</Link>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-40 h-14 bg-[#124074] text-white rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all shadow-xl shadow-blue-900/20 font-semibold text-lg ${loading ? 'opacity-70' : 'hover:bg-[#103866]'}`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signup...</span>
                </div>
              ) : (
                <span>Signup</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 font-semibold text-lg">Already have an account? <Link to="/login" className="text-[#124074] hover:underline font-black">Sign In</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
