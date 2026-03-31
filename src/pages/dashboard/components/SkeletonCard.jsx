import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="stat-card skeleton">
      <div className="skeleton-icon" />
      <div className="skeleton-text" />
      <div className="skeleton-subtext" />
    </div>
  );
}
