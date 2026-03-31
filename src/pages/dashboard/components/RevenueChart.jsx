import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export default function RevenueChart({ data, loading, title = 'Daily Revenue' }) {
  if (loading) {
    return (
      <div className="chart-card">
        <h3>{title}</h3>
        <div className="chart-container">
          <div className="chart-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={4} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px',
              }}
              formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']}
            />
            <Bar dataKey="revenue" fill="#4CAF50" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
