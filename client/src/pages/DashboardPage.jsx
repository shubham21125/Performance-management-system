import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import StatsCards from '../components/StatsCards';
import FilterBar from '../components/FilterBar';
import ReviewTable from '../components/ReviewTable';
import Pagination from '../components/Pagination';
import CommentsModal from '../components/CommentsModal';
import ConfirmModal from '../components/ConfirmModal';

import { PlusCircle, Search, Info, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const { isAdmin, isEmployee, canManageReviews } = useAuth();
  const navigate = useNavigate();

  // State
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [reportees, setReportees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    employeeId: '',
    period: '',
    ratingBucket: '',
    startDateFrom: '',
    startDateTo: '',
    department: '',
  });

  // UI Modals
  const [selectedReviewForComments, setSelectedReviewForComments] = useState(null);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Fetch dropdown options (reportees, departments)
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const repRes = await api.getReportees();
        if (repRes.success && repRes.data) {
          setReportees(repRes.data);
        }

        if (isAdmin) {
          const deptRes = await api.getDepartments();
          if (deptRes.success && deptRes.data) {
            setDepartments(deptRes.data);
          }
        }
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    }
    loadDropdowns();
  }, [isAdmin]);

  // 2. Fetch reviews and stats (debounced on search/filter changes)
  const fetchData = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setError('');

      const queryParams = {
        page: pageToLoad,
        limit: 10,
        ...filters,
        search: searchQuery.trim(),
      };

      try {
        const [reviewsRes, statsRes] = await Promise.all([
          api.getReviews(queryParams),
          api.getReviewStats(queryParams),
        ]);

        if (reviewsRes.success) {
          setReviews(reviewsRes.data || []);
          if (reviewsRes.pagination) {
            setPagination(reviewsRes.pagination);
          }
        }

        if (statsRes.success) {
          setStats(statsRes.data || null);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to fetch performance reviews.');
      } finally {
        setIsLoading(false);
      }
    },
    [filters, searchQuery]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchData]);

  // Pagination Handler
  const handlePageChange = (newPage) => {
    fetchData(newPage);
  };

  // Filter handlers
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      employeeId: '',
      period: '',
      ratingBucket: '',
      startDateFrom: '',
      startDateTo: '',
      department: '',
    });
    setSearchQuery('');
  };

  // Delete Handlers
  const handleDeleteClick = (review) => {
    setReviewToDelete(review);
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;
    setIsDeleting(true);
    setError('');

    try {
      const res = await api.deleteReview(reviewToDelete.review_id || reviewToDelete._id);
      if (res.success) {
        setSuccessMessage('Performance review deleted successfully.');
        setTimeout(() => setSuccessMessage(''), 4000);
        setReviewToDelete(null);
        fetchData(pagination.page);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete performance review.');
      setReviewToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <Navbar title="Performance Dashboard" />

        <main className="page-body">
          {/* Read-Only Notice for Employees */}
          {isEmployee && (
            <div className="readonly-banner">
              <Info size={18} />
              <span>
                <strong>Employee Read-Only Portal:</strong> You are viewing your personal performance assessments.
                Reviews are conducted and managed by your reporting manager.
              </span>
            </div>
          )}

          {/* Success / Error Alerts */}
          {error && (
            <div className="alert alert-danger" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success" role="alert">
              <Info size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Statistics Panels */}
          <StatsCards stats={stats} />

          {/* Toolbar: Add Review button + Search Employee */}
          <div className="toolbar-section">
            <div className="search-input-wrap">
              <Search size={16} />
              <input
                type="text"
                className="search-input"
                placeholder="Search employee or review title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search Employee"
              />
            </div>

            {canManageReviews && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/reviews/add')}
              >
                <PlusCircle size={16} />
                <span>Add Review</span>
              </button>
            )}
          </div>

          {/* Combinable Filter Bar */}
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            reportees={reportees}
            departments={departments}
          />

          {/* Reviews Table */}
          {isLoading ? (
            <div className="table-wrapper">
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading performance reviews...</p>
              </div>
            </div>
          ) : (
            <>
              <ReviewTable
                reviews={reviews}
                startIndex={(pagination.page - 1) * pagination.limit + 1}
                onSeeComments={(rev) => setSelectedReviewForComments(rev)}
                onEdit={(rev) => navigate(`/reviews/edit/${rev.review_id || rev._id}`)}
                onDelete={handleDeleteClick}
              />

              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </main>
      </div>

      {/* "See Comments" Detail Modal */}
      <CommentsModal
        review={selectedReviewForComments}
        onClose={() => setSelectedReviewForComments(null)}
      />

      {/* Delete Confirmation Popup */}
      <ConfirmModal
        isOpen={!!reviewToDelete}
        title="Delete Performance Review"
        message={`Are you sure you want to delete "${reviewToDelete?.review_title}" for ${reviewToDelete?.employee_name}? This action cannot be undone.`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setReviewToDelete(null)}
      />
    </div>
  );
}
