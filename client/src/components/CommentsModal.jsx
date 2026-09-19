import React from 'react';
import { X, Calendar, User, Award } from 'lucide-react';

export default function CommentsModal({ review, onClose }) {
  if (!review) return null;

  const formattedDate = review.review_date
    ? new Date(review.review_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  const getRatingBadge = (rating) => {
    if (rating >= 9) return <span className="pill pill-rating-high">★ {rating} / 10 (Excellent)</span>;
    if (rating >= 6) return <span className="pill pill-rating-mid">★ {rating} / 10 (Good)</span>;
    return <span className="pill pill-rating-low">★ {rating} / 10 (Needs Improvement)</span>;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{review.review_title}</h3>
          <button
            onClick={onClose}
            className="btn-icon-only"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <User size={15} />
                <span>Reviewed Employee:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{review.employee_name}</strong>
              </div>
              <div>{getRatingBadge(review.rating)}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <Award size={15} />
                <span>Reviewer:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{review.reviewer_name}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <Calendar size={14} />
                <span>{formattedDate} ({review.review_period})</span>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.04em' }}>
              Performance Comments & Feedback
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {review.comments ? review.comments : <em style={{ color: 'var(--text-muted)' }}>No additional comments recorded.</em>}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
