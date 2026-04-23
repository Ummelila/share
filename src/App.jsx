import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import VerifyDocuments from './pages/VerifyDocuments.jsx';
import RequestForm from './pages/RequestForm.jsx';
import CashRequestForm from './pages/CashRequestForm.jsx';
import ProductRequestForm from './pages/ProductRequestForm.jsx';
import DonationForm from './pages/DonationForm.jsx';
import CashDonationForm from './pages/CashDonationForm.jsx';
import ProductDonationForm from './pages/ProductDonationForm.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ProductBrowse from './pages/ProductBrowse.jsx';
import Profile from './pages/Profile.jsx';
import About from './pages/About.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import BrowseDonations from './pages/BrowseDonations.jsx';
import BiddingGallery from './pages/BiddingGallery.jsx';
import Contact from './pages/Contact.jsx';
import Help from './pages/Help.jsx';
import Terms from './pages/Terms.jsx';
import Privacy from './pages/Privacy.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes with Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/browse" element={<BrowseDonations />} />
          <Route path="/bidding-gallery" element={<BiddingGallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<Help />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>

        {/* Auth Routes (no layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        
        {/* Bidding - Redirect to bidding-gallery */}
        <Route path="/bidding" element={<Navigate to="/bidding-gallery" replace />} />
        
        {/* Protected Routes - Require User Authentication */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/verify-documents" 
          element={
            <ProtectedRoute>
              <VerifyDocuments />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/request-donation" 
          element={
            <ProtectedRoute>
              <RequestForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cash-request" 
          element={
            <ProtectedRoute>
              <CashRequestForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/product-request" 
          element={
            <ProtectedRoute>
              <ProductRequestForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/donate" 
          element={
            <ProtectedRoute>
              <DonationForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cash-donation" 
          element={
            <ProtectedRoute>
              <CashDonationForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/product-donation" 
          element={
            <ProtectedRoute>
              <ProductDonationForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/browse-products" 
          element={
            <ProtectedRoute>
              <ProductBrowse />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route 
          path="/admin-panel" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminPanel />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;