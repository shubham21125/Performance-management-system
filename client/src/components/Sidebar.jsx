import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, LogOut, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout, canManageReviews } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (roleId) => {
    switch (roleId) {
      case 1:
        return <span className="pill pill-role pill-role-admin">Admin</span>;
      case 2:
        return <span className="pill pill-role pill-role-manager">Manager</span>;
      case 3:
        return <span className="pill pill-role pill-role-tl">Team Leader</span>;
      default:
        return <span className="pill pill-role pill-role-employee">Employee</span>;
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <Award size={20} />
        </div>
        <div>
          <div className="sidebar-brand-title">PMS Portal</div>
          <div className="sidebar-brand-sub">Performance</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        {canManageReviews && (
          <NavLink
            to="/reviews/add"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <PlusCircle size={18} />
            <span>Add Review</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-mini-profile">
          <div className="avatar-circle">
            {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-mini-details">
            <div className="user-mini-name">
              {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
            </div>
            <div className="user-mini-role">
              {getRoleBadge(user?.role_id)}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="logout-btn-mini"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
