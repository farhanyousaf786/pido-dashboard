import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color, trend }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className={`stat-icon ${color}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={`stat-trend ${trend > 0 ? 'positive' : 'negative'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="stat-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="stat-title">{title}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}
