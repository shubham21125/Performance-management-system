import React from 'react';
import { Filter, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  reportees = [],
  departments = [],
}) {
  const { isAdmin } = useAuth();

  const handleInputChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, val]) => {
    if (key === 'page' || key === 'limit') return false;
    return val !== '' && val !== null && val !== undefined;
  });

  return (
    <div className="filters-panel">
      <div className="filters-header">
        <div className="filters-title">
          <Filter size={15} />
          <span>Filters</span>
        </div>

        {hasActiveFilters && (
          <button onClick={onResetFilters} className="btn-clear-filters" type="button">
            <X size={14} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      <div className="filters-grid">
        {/* By Employee Dropdown */}
        <div className="filter-group">
          <label htmlFor="filter-employee">By Employee</label>
          <select
            id="filter-employee"
            className="filter-select"
            value={filters.employeeId || ''}
            onChange={(e) => handleInputChange('employeeId', e.target.value)}
          >
            <option value="">All Visible Employees</option>
            {reportees.map((emp) => (
              <option key={emp.employee_id} value={emp.employee_id}>
                {emp.first_name} {emp.last_name} ({emp.username})
              </option>
            ))}
          </select>
        </div>

        {/* Admin Only: Select Department Dropdown */}
        {isAdmin && (
          <div className="filter-group">
            <label htmlFor="filter-dept">Select Department (Admin)</label>
            <select
              id="filter-dept"
              className="filter-select"
              value={filters.department || ''}
              onChange={(e) => handleInputChange('department', e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.dept_id} value={dept.dept_id}>
                  {dept.dept_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* By Period Dropdown */}
        <div className="filter-group">
          <label htmlFor="filter-period">By Period</label>
          <select
            id="filter-period"
            className="filter-select"
            value={filters.period || ''}
            onChange={(e) => handleInputChange('period', e.target.value)}
          >
            <option value="">All Periods</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Annual">Annual</option>
          </select>
        </div>

        {/* By Rating Bucket */}
        <div className="filter-group">
          <label htmlFor="filter-rating">By Rating</label>
          <select
            id="filter-rating"
            className="filter-select"
            value={filters.ratingBucket || ''}
            onChange={(e) => handleInputChange('ratingBucket', e.target.value)}
          >
            <option value="">All Ratings</option>
            <option value="1-5">Between 1-5</option>
            <option value="6-8">Between 6-8</option>
            <option value="9+">Above 9</option>
          </select>
        </div>

        {/* Date From */}
        <div className="filter-group">
          <label htmlFor="filter-date-from">Date From</label>
          <input
            id="filter-date-from"
            type="date"
            className="filter-input"
            value={filters.startDateFrom || ''}
            onChange={(e) => handleInputChange('startDateFrom', e.target.value)}
          />
        </div>

        {/* Date To */}
        <div className="filter-group">
          <label htmlFor="filter-date-to">Date To</label>
          <input
            id="filter-date-to"
            type="date"
            className="filter-input"
            value={filters.startDateTo || ''}
            onChange={(e) => handleInputChange('startDateTo', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
