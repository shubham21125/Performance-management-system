import React from 'react';
import { Eye, Edit2, Trash2, Calendar, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReviewTable({
  reviews = [],
  startIndex = 1,
  onSeeComments,
  onEdit,
  onDelete,
}) {
  const { canManageReviews } = useAuth();

  const getPeriodBadge = (period) => {
    switch (period) {
      case 'Monthly':
        return <span className="pill pill-period-monthly">Monthly</span>;
      case 'Quarterly':
        return <span className="pill pill-period-quarterly">Quarterly</span>;
      case 'Annual':
        return <span className="pill pill-period-annual">Annual</span>;
      default:
        return <span className="pill">{period}</span>;
    }
  };

  const getRatingBadge = (rating) => {
    if (rating >= 9) {
      return <span className="pill pill-rating-high">★ {rating} / 10</span>;
    }
    if (rating >= 6) {
      return <span className="pill pill-rating-mid">★ {rating} / 10</span>;
    }
    return <span className="pill pill-rating-low">★ {rating} / 10</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? 'N/A'
      : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="table-wrapper">
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3 className="empty-state-title">No Performance Reviews Found</h3>
          <p className="empty-state-desc">
            No review records match your current role visibility or selected filter criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>Sr.No</th>
            <th>Employee Name</th>
            <th>Review Title</th>
            <th>Review Date</th>
            <th>Review Period</th>
            <th>Rating</th>
            <th style={{ textAlign: 'center' }}>Comments</th>
            {canManageReviews && <th style={{ textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {reviews.map((rev, idx) => (
            <tr key={rev.review_id || rev._id}>
              <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                {startIndex + idx}
              </td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {rev.employee_name || `Employee #${rev.employee_id}`}
                  </span>
                  {rev.employee_dept_name && rev.employee_dept_name !== 'N/A' && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {rev.employee_dept_name}
                    </span>
                  )}
                </div>
              </td>
              <td>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {rev.review_title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Reviewed by: {rev.reviewer_name || `User #${rev.reviewed_by}`}
                </div>
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                  <Calendar size={13} />
                  {formatDate(rev.review_date)}
                </span>
              </td>
              <td>{getPeriodBadge(rev.review_period)}</td>
              <td>{getRatingBadge(rev.rating)}</td>
              <td style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onSeeComments(rev)}
                  title="View full comments"
                >
                  <Eye size={13} />
                  <span>See Comments</span>
                </button>
              </td>
              {canManageReviews && (
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-icon-only"
                      onClick={() => onEdit(rev)}
                      title="Edit review"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon-only btn-icon-danger"
                      onClick={() => onDelete(rev)}
                      title="Delete review"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
