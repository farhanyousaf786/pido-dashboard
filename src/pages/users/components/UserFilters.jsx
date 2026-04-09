import React from 'react';
import { Search, Filter, Users, RefreshCw } from 'lucide-react';

export default function UserFilters({ 
  filters, 
  onFilterChange, 
  onSearch, 
  searchQuery, 
  onRefresh,
  loading 
}) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="users-filters">
      <div className="filter-row">
        {/* Search */}
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {/* User Type Filter */}
        <div className="filter-group">
          <Filter size={16} />
          <select
            value={filters.userType || ''}
            onChange={(e) => handleChange('userType', e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="customer">Customer</option>
            <option value="serviceProvider">Service Provider</option>
          </select>
        </div>

        {/* Online Status Filter */}
        <div className="filter-group">
          <Users size={16} />
          <select
            value={filters.isOnline === undefined ? '' : String(filters.isOnline)}
            onChange={(e) => {
              const val = e.target.value;
              handleChange('isOnline', val === '' ? undefined : val === 'true');
            }}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="true">Online</option>
            <option value="false">Offline</option>
          </select>
        </div>

        {/* Account Status Filter */}
        <div className="filter-group">
          <select
            value={filters.accountStatus || ''}
            onChange={(e) => handleChange('accountStatus', e.target.value)}
            className="filter-select"
          >
            <option value="">All Account Status</option>
            <option value="approved">Approved</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Test user (isTestUser) */}
        <div className="filter-group">
          <select
            value={
              filters.isTestUser === undefined ? '' : filters.isTestUser === true ? 'true' : 'false'
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') handleChange('isTestUser', undefined);
              else handleChange('isTestUser', v === 'true');
            }}
            className="filter-select"
            aria-label="Filter by test user flag"
          >
            <option value="">All users</option>
            <option value="true">Test users only</option>
            <option value="false">Production only</option>
          </select>
        </div>

        {/* Refresh Button */}
        <button 
          onClick={onRefresh} 
          className={`refresh-btn ${loading ? 'spinning' : ''}`}
          disabled={loading}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Active Filters Summary */}
      {(filters.userType ||
        filters.isOnline !== undefined ||
        filters.accountStatus ||
        filters.isTestUser !== undefined) && (
        <div className="active-filters">
          <span>Active filters:</span>
          {filters.userType && (
            <span className="filter-tag">
              Type: {filters.userType === 'serviceProvider' ? 'Provider' : 'Customer'}
            </span>
          )}
          {filters.isOnline !== undefined && (
            <span className="filter-tag">
              Status: {filters.isOnline ? 'Online' : 'Offline'}
            </span>
          )}
          {filters.accountStatus && (
            <span className="filter-tag">
              Account: {filters.accountStatus}
            </span>
          )}
          {filters.isTestUser === true && <span className="filter-tag">Test users only</span>}
          {filters.isTestUser === false && <span className="filter-tag">Production only</span>}
          <button 
            onClick={() => onFilterChange({})} 
            className="clear-filters-btn"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
