import React from 'react';
import { Users, UserCheck, Briefcase, Clock, Shield, UserX } from 'lucide-react';

export default function UserStats({ users, loading }) {
  if (loading) {
    return (
      <div className="user-stats-bar skeleton">
        <div className="stat-skeleton" />
        <div className="stat-skeleton" />
        <div className="stat-skeleton" />
        <div className="stat-skeleton" />
      </div>
    );
  }

  const totalUsers = users.length;
  const onlineUsers = users.filter(u => u.isOnline === true).length;
  const offlineUsers = totalUsers - onlineUsers;
  const providers = users.filter(u => u.userType === 'serviceProvider').length;
  const customers = users.filter(u => u.userType === 'customer').length;
  const pendingApproval = users.filter(u => u.accountStatus === 'pending_approval').length;

  return (
    <div className="user-stats-bar">
      <div className="user-stat-item">
        <Users size={18} className="stat-icon blue" />
        <div className="stat-info">
          <span className="stat-value">{totalUsers}</span>
          <span className="stat-label">Total Users</span>
        </div>
      </div>

      <div className="user-stat-item">
        <UserCheck size={18} className="stat-icon green" />
        <div className="stat-info">
          <span className="stat-value">{onlineUsers}</span>
          <span className="stat-label">Online</span>
        </div>
      </div>

      <div className="user-stat-item">
        <UserX size={18} className="stat-icon gray" />
        <div className="stat-info">
          <span className="stat-value">{offlineUsers}</span>
          <span className="stat-label">Offline</span>
        </div>
      </div>

      <div className="user-stat-item">
        <Briefcase size={18} className="stat-icon orange" />
        <div className="stat-info">
          <span className="stat-value">{providers}</span>
          <span className="stat-label">Providers</span>
        </div>
      </div>

      <div className="user-stat-item">
        <Users size={18} className="stat-icon purple" />
        <div className="stat-info">
          <span className="stat-value">{customers}</span>
          <span className="stat-label">Customers</span>
        </div>
      </div>

      <div className="user-stat-item">
        <Clock size={18} className="stat-icon red" />
        <div className="stat-info">
          <span className="stat-value">{pendingApproval}</span>
          <span className="stat-label">Pending</span>
        </div>
      </div>
    </div>
  );
}
