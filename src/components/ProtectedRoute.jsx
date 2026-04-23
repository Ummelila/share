import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute - Protects routes that require authentication
 * Redirects to login if user is not authenticated
 * Preserves the intended destination for redirect after login
 */
function ProtectedRoute({ children, requireAdmin = false }) {
  const location = useLocation();
  
  // Check for regular user authentication
  const currentUser = localStorage.getItem('currentUser');
  
  // Check for admin authentication
  const adminUser = localStorage.getItem('adminUser');
  
  // If route requires admin
  if (requireAdmin) {
    if (!adminUser) {
      // Redirect to admin login, preserving the intended destination
      return <Navigate to="/admin" state={{ from: location.pathname }} replace />;
    }
    return children;
  }
  
  // If route requires regular user authentication
  if (!currentUser) {
    // Redirect to login, preserving the intended destination and any query params
    const returnUrl = location.pathname + location.search;
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }
  
  return children;
}

export default ProtectedRoute;

