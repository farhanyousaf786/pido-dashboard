import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Briefcase, AlertCircle } from 'lucide-react';
import { verificationService } from '../../core/services/verificationService';
import VerificationQueue from './components/VerificationQueue.jsx';
import VerificationDetail from './components/VerificationDetail.jsx';

const TABS = {
  all: 'all',
  providers: 'providers',
  customers: 'customers',
};

export default function Verifications() {
  const [activeTab, setActiveTab] = useState(TABS.all);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // Subscribe to real-time verification requests
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = verificationService.subscribeToVerificationRequests((data) => {
      setRequests(data);
      
      // Calculate stats
      const newStats = { pending: 0, approved: 0, rejected: 0 };
      data.forEach((req) => {
        const status = (req.status || 'pending').toLowerCase();
        if (status === 'pending') newStats.pending++;
        else if (status === 'approved') newStats.approved++;
        else if (status === 'rejected') newStats.rejected++;
      });
      setStats(newStats);
      
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, []);

  // Filter requests based on active tab
  const filteredRequests = requests.filter((req) => {
    if (activeTab === TABS.all) return true;
    if (activeTab === TABS.providers) return req.userType === 'serviceProvider';
    if (activeTab === TABS.customers) return req.userType === 'customer' || req.userType === 'user';
    return true;
  });

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
  };

  const handleBack = () => {
    setSelectedRequest(null);
  };

  const handleApprove = async (requestId, notes) => {
    const result = await verificationService.approveRequest(requestId, notes);
    if (result.success) {
      setSelectedRequest(null);
    }
    return result;
  };

  const handleReject = async (requestId, reason, notes) => {
    const result = await verificationService.rejectRequest(requestId, reason, notes);
    if (result.success) {
      setSelectedRequest(null);
    }
    return result;
  };

  // Render detail view if a request is selected
  if (selectedRequest) {
    return (
      <VerificationDetail
        request={selectedRequest}
        onBack={handleBack}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    );
  }

  return (
    <div className="verifications-page">
      {/* Header */}
      <div className="verifications-header">
        <div className="verifications-title-section">
          <ShieldCheck size={28} className="verifications-icon" />
          <div>
            <h1>Verifications</h1>
            <p>Review and manage provider & customer verification requests</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="verification-stats-bar">
        <div className="verification-stat-item">
          <span className="stat-value pending">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="verification-stat-item">
          <span className="stat-value approved">{stats.approved}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="verification-stat-item">
          <span className="stat-value rejected">{stats.rejected}</span>
          <span className="stat-label">Rejected</span>
        </div>
        <div className="verification-stat-item total">
          <span className="stat-value">{requests.length}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="verification-tabs">
        <button
          className={`tab-btn ${activeTab === TABS.all ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.all)}
        >
          <ShieldCheck size={18} />
          All Verifications
        </button>
        <button
          className={`tab-btn ${activeTab === TABS.providers ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.providers)}
        >
          <Briefcase size={18} />
          Providers
        </button>
        <button
          className={`tab-btn ${activeTab === TABS.customers ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.customers)}
        >
          <Users size={18} />
          Customers
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="verifications-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Queue */}
      <VerificationQueue
        requests={filteredRequests}
        loading={loading}
        onView={handleViewRequest}
      />
    </div>
  );
}
