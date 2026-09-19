import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export default function EditReviewPage() {
  const { id } = useParams();
  const { canManageReviews } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    review_title: '',
    employee_id: '',
    review_date: '',
    review_period: 'Monthly',
    rating: 7,
    comments: '',
  });

  const [reportees, setReportees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canManageReviews) {
      navigate('/dashboard', { replace: true });
      return;
    }

    async function loadData() {
      try {
        setIsLoading(true);
        const [repRes, revRes] = await Promise.all([
          api.getReportees(),
          api.getReviewById(id),
        ]);

        if (repRes.success && repRes.data) {
          setReportees(repRes.data);
        }

        if (revRes.success && revRes.data) {
          const rev = revRes.data;
          const formattedDate = rev.review_date
            ? new Date(rev.review_date).toISOString().split('T')[0]
            : '';

          setFormData({
            review_title: rev.review_title || '',
            employee_id: rev.employee_id || '',
            review_date: formattedDate,
            review_period: rev.review_period || 'Monthly',
            rating: rev.rating || 5,
            comments: rev.comments || '',
          });
        }
      } catch (err) {
        console.error('Error fetching review for edit:', err);
        setError(err.message || 'Failed to load review details.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id, canManageReviews, navigate]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.review_title.trim()) {
      setError('Review title is required.');
      return;
    }
    if (formData.review_title.trim().length > 100) {
      setError('Review title cannot exceed 100 characters.');
      return;
    }
    if (!formData.employee_id) {
      setError('Please select an employee.');
      return;
    }
    if (!formData.review_date) {
      setError('Review date is required.');
      return;
    }
    const numRating = Number(formData.rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 10) {
      setError('Rating must be a number between 1 and 10.');
      return;
    }
    if (formData.comments.length > 300) {
      setError('Review comment cannot exceed 300 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.updateReview(id, {
        ...formData,
        employee_id: Number(formData.employee_id),
        rating: Math.round(numRating),
      });

      if (res.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to update review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <Navbar title="Edit Performance Review" />

        <main className="page-body">
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>
          </div>

          <div className="card form-card">
            <h2 className="card-title">Edit Review Details</h2>

            {error && (
              <div className="alert alert-danger" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {isLoading ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading assessment details...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="form-grid">
                {/* Review Title */}
                <div className="form-group">
                  <label className="form-label" htmlFor="review_title">
                    Review Title <span className="required">*</span>
                  </label>
                  <input
                    id="review_title"
                    type="text"
                    className="form-input"
                    value={formData.review_title}
                    onChange={(e) => handleChange('review_title', e.target.value)}
                    maxLength={100}
                    required
                  />
                  <span className="form-hint">Maximum 100 characters ({formData.review_title.length}/100)</span>
                </div>

                {/* Select Employee & Review Date */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="employee_id">
                      Select Employee <span className="required">*</span>
                    </label>
                    <select
                      id="employee_id"
                      className="form-select"
                      value={formData.employee_id}
                      onChange={(e) => handleChange('employee_id', e.target.value)}
                      required
                    >
                      <option value="" disabled>-- Choose an Employee --</option>
                      {reportees.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.first_name} {emp.last_name} ({emp.username})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="review_date">
                      Review Date <span className="required">*</span>
                    </label>
                    <input
                      id="review_date"
                      type="date"
                      className="form-input"
                      value={formData.review_date}
                      onChange={(e) => handleChange('review_date', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Review Period & Rating */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="review_period">
                      Review Period <span className="required">*</span>
                    </label>
                    <select
                      id="review_period"
                      className="form-select"
                      value={formData.review_period}
                      onChange={(e) => handleChange('review_period', e.target.value)}
                      required
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Annual">Annual</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="rating">
                      Rating (1 to 10) <span className="required">*</span>
                    </label>
                    <div className="rating-input-container">
                      <input
                        id="rating"
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        className="rating-slider"
                        value={formData.rating}
                        onChange={(e) => handleChange('rating', e.target.value)}
                      />
                      <span className="rating-number-display">{formData.rating}</span>
                    </div>
                    <span className="form-hint">Scale: 1 (Lowest) to 10 (Highest)</span>
                  </div>
                </div>

                {/* Review Comment */}
                <div className="form-group">
                  <label className="form-label" htmlFor="comments">
                    Review Comments
                  </label>
                  <textarea
                    id="comments"
                    className="form-textarea"
                    value={formData.comments}
                    onChange={(e) => handleChange('comments', e.target.value)}
                    maxLength={300}
                  />
                  <span className="form-hint">Maximum 300 characters ({formData.comments.length}/300)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/dashboard')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    <Save size={16} />
                    <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
