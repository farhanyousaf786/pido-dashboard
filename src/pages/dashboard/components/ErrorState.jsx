import React from 'react';
import { XCircle } from 'lucide-react';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="dashboard-container">
      <div className="dashboard-error">
        <XCircle size={48} />
        <h2>{message}</h2>
        <button onClick={onRetry}>Retry</button>
      </div>
    </div>
  );
}
