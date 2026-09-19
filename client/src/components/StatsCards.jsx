import React from 'react';
import { Calendar, Star } from 'lucide-react';

export default function StatsCards({ stats }) {
  const periodCounts = stats?.periodWiseCounts || { Monthly: 0, Quarterly: 0, Annual: 0 };
  const ratingCounts = stats?.ratingBucketCounts || { '1-5': 0, '6-8': 0, '9+': 0 };

  return (
    <div className="stats-container">
      {/* 1. Period Wise Number of Review */}
      <div className="stats-card">
        <div className="stats-card-header">
          <span className="stats-card-title">Period Wise Number of Review</span>
          <div className="stats-card-icon" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
            <Calendar size={18} />
          </div>
        </div>
        <div className="stats-metrics-list">
          <div className="metric-box">
            <div className="metric-label">Monthly</div>
            <div className="metric-value">{periodCounts.Monthly ?? 0}</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Quarterly</div>
            <div className="metric-value">{periodCounts.Quarterly ?? 0}</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Annual</div>
            <div className="metric-value">{periodCounts.Annual ?? 0}</div>
          </div>
        </div>
      </div>

      {/* 2. Rating Vs Total Number of Employees */}
      <div className="stats-card">
        <div className="stats-card-header">
          <span className="stats-card-title">Rating Vs Total Number of Employees</span>
          <div className="stats-card-icon" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
            <Star size={18} />
          </div>
        </div>
        <div className="stats-metrics-list">
          <div className="metric-box">
            <div className="metric-label">Between 1-5</div>
            <div className="metric-value" style={{ color: '#d97706' }}>
              {ratingCounts['1-5'] ?? 0}
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Between 6-8</div>
            <div className="metric-value" style={{ color: '#4f46e5' }}>
              {ratingCounts['6-8'] ?? 0}
            </div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Above 9</div>
            <div className="metric-value" style={{ color: '#059669' }}>
              {ratingCounts['9+'] ?? 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
