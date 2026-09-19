import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck } from 'lucide-react';

export default function Navbar({ title }) {
  const { isAdmin, isManagerOrTL } = useAuth();

  return (
    <header className="top-navbar">
      <div className="top-nav-title-group">
        <h1>{title || 'Dashboard'}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {isAdmin ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c', fontWeight: 600 }}>
              <ShieldCheck size={16} /> Admin Mode (Full Access)
            </span>
          ) : isManagerOrTL ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4338ca', fontWeight: 600 }}>
              <UserCheck size={16} /> Manager View
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', fontWeight: 500 }}>
              Employee Portal (Read-Only)
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
