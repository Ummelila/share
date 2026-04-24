import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, HeartHandshake, LogIn, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get return URL and additional params from query params
  const searchParams = new URLSearchParams(location.search);
  let returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const productId = searchParams.get('productId');
  const openBid = searchParams.get('openBid');

  try {
    returnUrl = decodeURIComponent(returnUrl);
  } catch (e) {
    // If decoding fails, use original
  }

  let finalReturnUrl = returnUrl;
  if (productId) {
    if (returnUrl === '/bidding' && openBid) {
      finalReturnUrl = `/bidding?productId=${productId}&openBid=true`;
    } else if (returnUrl === '/bidding') {
      finalReturnUrl = `/bidding?productId=${productId}`;
    } else if (returnUrl.includes('/product-request')) {
      finalReturnUrl = `${returnUrl}?productId=${productId}`;
    }
  }

  // Redirect if already logged in
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        navigate(finalReturnUrl, { replace: true });
      } catch (e) {
        navigate(returnUrl, { replace: true });
      }
    }
  }, [navigate, finalReturnUrl, returnUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error) throw new Error('Invalid email or password!');

      if (data.role === 'admin') {
        navigate('/admin');
      } else {
        localStorage.setItem('currentUser', JSON.stringify(data));

        // Handle complex redirects
        if (returnUrl === '/bidding-gallery' && productId && openBid) {
          navigate(`/bidding-gallery?productId=${productId}&openBid=true`);
        } else if (returnUrl === '/bidding' && productId && openBid) {
          navigate(`/bidding?productId=${productId}&openBid=true`);
        } else if (returnUrl === '/bidding' && productId) {
          navigate(`/bidding?productId=${productId}`);
        } else if (returnUrl === '/bidding' || returnUrl === '/bidding-gallery') {
          navigate('/bidding-gallery');
        } else if (returnUrl.includes('/product-request') && productId) {
          navigate(finalReturnUrl);
        } else {
          navigate(returnUrl);
        }
      }
    } catch (error) {
      setError(error.message);
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
          <p className="text-white/70 text-xl max-w-md font-medium leading-relaxed">Welcome back! Together, we continue to transform lives.</p>
        </div>

        {/* Removed branding subtext */}
      </div>

      {/* Right Side - Login Form */}
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

        <div className="w-full max-w-lg">
          <div className="text-left mb-10">
            <h2 className="text-5xl font-bold text-gray-900 font-roboto tracking-tight">Welcome Back</h2>
            <p className="text-gray-600 mt-3 text-xl font-medium">Continue your journey of giving</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50/80 border-l-4 border-red-500 text-red-600 rounded-lg text-sm font-bold flex items-center gap-3">
              <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
            <div>
              <label className="text-lg font-bold text-black tracking-wide ml-1">Email Address</label>
              <div className="relative mt-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-16 px-6 bg-gray-50 border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900 font-normal text-lg placeholder:text-base placeholder:font-light"
                  placeholder="you@example.com"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                  autoComplete="off"
                  name={`email_${Date.now()}`}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-lg font-bold text-black tracking-wide ml-1">Password</label>
                <Link to="/forgot-password" virtual="true" className="text-xs font-black text-[#124074] hover:underline">
                  FORGOT PASSWORD?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-16 px-6 pr-12 bg-gray-50 border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#124074] focus:border-transparent transition-all outline-none text-gray-900 font-normal text-lg placeholder:text-base placeholder:font-light"
                  placeholder="••••••••"
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                  autoComplete="new-password"
                  name={`password_${Date.now()}`}
                  data-lpignore="true"
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



            <button
              type="submit"
              disabled={loading}
              className={`w-40 h-14 bg-[#124074] text-white rounded-2xl flex items-center justify-center active:scale-[0.98] transition-all shadow-xl shadow-blue-900/20 font-semibold text-lg ${loading ? 'opacity-70' : 'hover:bg-[#103866]'}`}
            >
              <span>{loading ? 'Sign In...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-gray-500 font-semibold text-lg">Don't have an account? <Link to="/signup" className="text-[#124074] hover:underline font-black">Sign Up</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
