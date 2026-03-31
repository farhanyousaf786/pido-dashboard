// Info box showing implementation notes
import React from 'react';

export default function InfoBox() {
  return (
    <div className="dashboard-info-box">
      <h4>Implementation Notes</h4>
      <ul>
        <li><strong>Dynamic:</strong> User counts, booking stats, revenue (from Firestore)</li>
        <li><strong>Requires user field:</strong> <code>lastActive</code> timestamp for online status</li>
        <li><strong>Requires booking fields:</strong> <code>status</code>, <code>paymentStatus</code>, <code>totalAmount</code>, <code>createdAt</code></li>
      </ul>
    </div>
  );
}
