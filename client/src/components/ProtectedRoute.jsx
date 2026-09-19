import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireManager = false }) {
  const { isAuthenticated, isLoading, canManageReviews } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireManager && !canManageReviews) {
    // Employee attempting to access Add/Edit pages
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
