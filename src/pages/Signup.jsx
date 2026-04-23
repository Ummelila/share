import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Heart, User, Phone, UserPlus, ArrowLeft } from 'lucide-react';
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
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
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

    const phoneRegex = /^(?:\+92|0)3\d{9}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setError('Please enter a valid Pakistani mobile number (e.g. 03XXXXXXXXX or +923XXXXXXXXX).');
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
    <div className="min-h-screen flex animate-fade-in">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-secondary-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-center p-12 w-full">
          <div className="mb-8">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-white" fill="white" />
            </div>
            <h1 className="text-4xl font-bold text-white font-poppins mb-4">Join Our Community</h1>
            <p className="text-white/80 text-lg max-w-md">Become part of a movement that transforms lives through generosity and compassion.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-8 text-white/80">
            <div className="text-center"><Heart className="w-8 h-8 mx-auto mb-2 text-white" /><p className="text-sm">Donate Cash</p></div>
            <div className="text-center"><Heart className="w-8 h-8 mx-auto mb-2 text-white" /><p className="text-sm">Share Products</p></div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                <Heart className="w-7 h-7 text-white" fill="white" />
              </div>
              <span className="text-2xl font-bold font-poppins text-gray-800">Share<span className="text-primary-500">4</span>Good</span>
            </Link>
          </div>

          <div className="card">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 font-poppins">Create Account</h2>
              <p className="text-gray-500 mt-2">Join our community and make a difference</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            {feedback && (
              <div className={`mb-6 p-4 rounded-xl text-sm ${feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        className="input-field pl-12" 
                        placeholder="John Doe" 
                        required 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleChange} 
                        className="input-field pl-12" 
                        placeholder="you@example.com" 
                        required 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="tel" 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleChange} 
                        className="input-field pl-12" 
                        placeholder="+92 300 1234567" 
                        required 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        name="password" 
                        value={formData.password} 
                        onChange={handleChange} 
                        className="input-field pl-12 pr-12" 
                        placeholder="••••••••" 
                        required 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        type="password" 
                        name="confirmPassword" 
                        value={formData.confirmPassword} 
                        onChange={handleChange} 
                        className="input-field pl-12" 
                        placeholder="••••••••" 
                        required 
                      />
                    </div>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="terms" 
                      checked={formData.terms} 
                      onChange={handleChange} 
                      className="w-4 h-4 mt-1 text-primary-500 border-gray-300 rounded focus:ring-primary-500" 
                      required 
                    />
                    <span className="text-sm text-gray-600">
                      I agree to the <Link to="/terms" className="text-primary-600 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
                    </span>
                  </label>
              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" /> Create Account
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">Already have an account? <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">Sign In</Link></p>
            </div>
          </div>
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
