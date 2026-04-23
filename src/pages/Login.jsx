import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Heart, LogIn, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const searchParams = new URLSearchParams(location.search);
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      try {
        const decodedUrl = decodeURIComponent(returnUrl);
        navigate(decodedUrl, { replace: true });
      } catch (e) {
        navigate(returnUrl, { replace: true });
      }
    }
  }, [navigate, location]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
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
        // If user came from bidding-gallery with productId, redirect to bidding-gallery with params
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
    }
  };

  return (
    <div className="min-h-screen flex animate-fade-in">
      {/* Left Side - Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-secondary-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-center p-12 w-full">
          <div className="mb-8">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-white" fill="white" />
            </div>
            <h1 className="text-4xl font-bold text-white font-poppins mb-4">Welcome Back!</h1>
            <p className="text-white/80 text-lg max-w-md">Continue making a difference. Your generosity transforms lives.</p>
          </div>

          <div className="mt-auto">
            <div className="flex items-center gap-8 text-white/80">
              <div><p className="text-3xl font-bold text-white">5K+</p><p className="text-sm">Lives Helped</p></div>
              <div className="w-px h-12 bg-white/30"></div>
              <div><p className="text-3xl font-bold text-white">Rs.2.5M</p><p className="text-sm">Donated</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
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
              <h2 className="text-2xl font-bold text-gray-900 font-poppins">Sign In</h2>
              <p className="text-gray-500 mt-2">Enter your credentials to access your account</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="input-field pl-12" 
                    placeholder="you@example.com" 
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
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
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

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={remember} 
                    onChange={(e) => setRemember(e.target.checked)} 
                    className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500" 
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                <LogIn className="w-5 h-5" /> Sign In
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600">Don't have an account? <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-semibold">Sign Up</Link></p>
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

export default Login;
