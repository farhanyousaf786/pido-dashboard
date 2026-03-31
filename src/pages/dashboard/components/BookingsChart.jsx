import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export default function BookingsChart({ data, loading }) {
  if (loading) {
    return (
      <div className="chart-card">
        <h3>Daily Bookings</h3>
        <div className="chart-container">
          <div className="chart-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3>Daily Bookings</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF7043" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FF7043" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={4} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px',
              }}
            />
            <Area
              type="monotone"
              dataKey="bookings"
              stroke="#FF7043"
              fillOpacity={1}
              fill="url(#colorBookings)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
