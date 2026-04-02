import React, { useMemo, useRef, useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState(TABS.providers);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [providerStatusOverrides, setProviderStatusOverrides] = useState({});
  const [orphanRequestIds, setOrphanRequestIds] = useState({});
  const userUnsubscribersRef = useRef(new Map());
  const providerUserUnsubscribersRef = useRef(new Map());
  const [customerSyncState, setCustomerSyncState] = useState({
    loading: false,
    message: null,
    error: null,
  });
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const dedupedRequests = useMemo(() => {
    const normalizePhone = (value) => {
      const digits = (value || '').toString().replace(/\D/g, '');
      if (!digits) return '';
      if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
      return digits;
    };

    const normalizeEmail = (value) => (value || '').toString().trim().toLowerCase();

    const getTs = (t) => {
      if (!t) return 0;
      try {
        if (typeof t.toDate === 'function') return t.toDate().getTime();
      } catch {
        // ignore
      }
      if (t instanceof Date) return t.getTime();
      if (typeof t === 'number') return t;
      return 0;
    };

    const getIdentityKey = (req) => {
      const uid = (req?.userId || req?.uid || req?.userUid || req?.providerUid || '').toString().trim();
      if (uid) return `uid:${uid}`;
      const phone = normalizePhone(req?.phoneNumber);
      if (phone) return `phone:${phone}`;
      const email = normalizeEmail(req?.email);
      if (email) return `email:${email}`;
      return `id:${req?.id || ''}`;
    };

    const providerLatestByIdentity = new Map();
    const nonProviders = [];

    for (const req of requests) {
      if (req.userType !== 'serviceProvider') {
        nonProviders.push(req);
        continue;
      }

      const key = getIdentityKey(req);
      const ts = getTs(req.submittedAt) || getTs(req.updatedAt);
      const existing = providerLatestByIdentity.get(key);
      if (!existing) {
        providerLatestByIdentity.set(key, { req, ts });
        continue;
      }

      if (ts >= existing.ts) providerLatestByIdentity.set(key, { req, ts });
    }

    return [...providerLatestByIdentity.values()].map((x) => x.req).concat(nonProviders);
  }, [requests]);

  // Subscribe to real-time verification requests
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = verificationService.subscribeToVerificationRequests((data) => {
      setRequests(data);

      // Fast initial stats based on verificationRequests.status (before user doc overrides resolve)
      const newStats = { pending: 0, approved: 0, rejected: 0 };
      data.forEach((req) => {
        const status = (req.status || 'pending').toString().trim().toLowerCase();
        if (status === 'approved') newStats.approved++;
        else if (status === 'rejected') newStats.rejected++;
        else newStats.pending++;
      });
      setStats(newStats);
      
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, []);

  // Real-time status overrides for customers based on users/{uid}.accountStatus
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const customerRequests = dedupedRequests.filter(
        (req) => req.userType === 'customer' || req.userType === 'user'
      );
      const providerRequests = dedupedRequests.filter((req) => req.userType === 'serviceProvider');

      // Cleanup subscriptions that are no longer needed
      const activeCustomerRequestIds = new Set(customerRequests.map((r) => r.id));
      const activeProviderRequestIds = new Set(providerRequests.map((r) => r.id));

      for (const [requestId, unsub] of userUnsubscribersRef.current.entries()) {
        if (!activeCustomerRequestIds.has(requestId)) {
          try {
            unsub();
          } catch {
            // ignore
          }
          userUnsubscribersRef.current.delete(requestId);
        }
      }

      for (const [requestId, unsub] of providerUserUnsubscribersRef.current.entries()) {
        if (!activeProviderRequestIds.has(requestId)) {
          try {
            unsub();
          } catch {
            // ignore
          }
          providerUserUnsubscribersRef.current.delete(requestId);
        }
      }

      // Remove overrides for requests that no longer exist
      setStatusOverrides((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (!activeCustomerRequestIds.has(key)) delete next[key];
        }
        return next;
      });

      setProviderStatusOverrides((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (!activeProviderRequestIds.has(key)) delete next[key];
        }
        return next;
      });

      setOrphanRequestIds((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (!activeCustomerRequestIds.has(key) && !activeProviderRequestIds.has(key)) delete next[key];
        }
        return next;
      });

      // Subscribe to missing ones (resolve userId in parallel to reduce latency)
      const missing = customerRequests.filter((req) => !userUnsubscribersRef.current.has(req.id));

      if (missing.length > 0) {
        const resolved = await Promise.all(
          missing.map(async (req) => {
            try {
              const userId = await verificationService.resolveUserIdFromRequestData(req, req.id);
              return { req, userId };
            } catch {
              return { req, userId: null };
            }
          })
        );
        if (cancelled) return;

        resolved.forEach(({ req, userId }) => {
          if (userUnsubscribersRef.current.has(req.id)) return;
          if (!userId) {
            setStatusOverrides((prev) => ({ ...prev, [req.id]: 'pending' }));
            return;
          }

          const unsub = verificationService.subscribeToUserDoc(userId, (user) => {
            if (!user) {
              setOrphanRequestIds((prev) => ({ ...prev, [req.id]: true }));
              return;
            }

            setOrphanRequestIds((prev) => {
              if (!prev[req.id]) return prev;
              const next = { ...prev };
              delete next[req.id];
              return next;
            });

            const raw = (user?.accountStatus ?? '').toString().trim().toLowerCase();
            const normalized = raw === 'approved' || raw === 'rejected' ? raw : 'pending';
            setStatusOverrides((prev) => ({ ...prev, [req.id]: normalized }));
          });

          userUnsubscribersRef.current.set(req.id, unsub);
        });
      }

      // Providers: track whether the user document exists; hide orphans
      const providerMissing = providerRequests.filter(
        (req) => !providerUserUnsubscribersRef.current.has(req.id)
      );
      if (providerMissing.length === 0) return;

      const providerResolved = await Promise.all(
        providerMissing.map(async (req) => {
          try {
            const userId = await verificationService.resolveUserIdFromRequestData(req, req.id);
            return { req, userId };
          } catch {
            return { req, userId: null };
          }
        })
      );
      if (cancelled) return;

      providerResolved.forEach(({ req, userId }) => {
        if (providerUserUnsubscribersRef.current.has(req.id)) return;
        if (!userId) {
          setOrphanRequestIds((prev) => ({ ...prev, [req.id]: true }));
          return;
        }

        const unsub = verificationService.subscribeToUserDoc(userId, (user) => {
          if (!user) {
            setOrphanRequestIds((prev) => ({ ...prev, [req.id]: true }));
            return;
          }
          setOrphanRequestIds((prev) => {
            if (!prev[req.id]) return prev;
            const next = { ...prev };
            delete next[req.id];
            return next;
          });

          const raw = (user?.accountStatus ?? '').toString().trim().toLowerCase();
          const normalized = raw === 'approved' || raw === 'rejected' ? raw : 'pending';
          setProviderStatusOverrides((prev) => ({ ...prev, [req.id]: normalized }));
        });

        providerUserUnsubscribersRef.current.set(req.id, unsub);
      });
    };

    run();

    return () => {
      cancelled = true;
      // If page unmounts, cleanup all
      for (const unsub of userUnsubscribersRef.current.values()) {
        try {
          unsub();
        } catch {
          // ignore
        }
      }
      userUnsubscribersRef.current.clear();

      for (const unsub of providerUserUnsubscribersRef.current.values()) {
        try {
          unsub();
        } catch {
          // ignore
        }
      }
      providerUserUnsubscribersRef.current.clear();
    };
  }, [dedupedRequests]);

  const effectiveStatusByRequestId = useMemo(() => {
    const map = {};
    for (const req of dedupedRequests) {
      const isCustomer = req.userType === 'customer' || req.userType === 'user';
      const isProvider = req.userType === 'serviceProvider';
      const isOrphan = !!orphanRequestIds[req.id];
      if (isOrphan) continue;

      if (isCustomer) {
        map[req.id] = 'approved';
        continue;
      }

      const base = (req.status || 'pending').toString().trim().toLowerCase();
      const normalizedBase = base === 'approved' || base === 'rejected' ? base : 'pending';
      const effective = isCustomer
        ? (statusOverrides[req.id] || normalizedBase)
        : isProvider
          ? (providerStatusOverrides[req.id] || normalizedBase)
          : normalizedBase;
      map[req.id] = effective;
    }
    return map;
  }, [dedupedRequests, statusOverrides, providerStatusOverrides, orphanRequestIds]);

  useEffect(() => {
    const newStats = { pending: 0, approved: 0, rejected: 0 };
    for (const req of dedupedRequests) {
      if (orphanRequestIds[req.id]) continue;
      const status = effectiveStatusByRequestId[req.id] || 'pending';
      if (status === 'pending') newStats.pending++;
      else if (status === 'approved') newStats.approved++;
      else if (status === 'rejected') newStats.rejected++;
    }
    setStats(newStats);
  }, [dedupedRequests, effectiveStatusByRequestId, orphanRequestIds]);

  const handleSyncCustomerAccountStatus = async () => {
    setCustomerSyncState({ loading: true, message: null, error: null });
    try {
      const approvedCustomers = dedupedRequests.filter((req) => {
        const isCustomer = req.userType === 'customer' || req.userType === 'user';
        const status = (req.status ?? '').toString().trim().toLowerCase();
        return isCustomer && status === 'approved';
      });

      if (approvedCustomers.length === 0) {
        setCustomerSyncState({
          loading: false,
          message: 'No approved customer requests found to sync.',
          error: null,
        });
        return;
      }

      const results = await Promise.allSettled(
        approvedCustomers.map(async (req) => {
          const userId = await verificationService.resolveUserIdFromRequestData(req, req.id);
          const res = await verificationService.updateUserAccountStatus(userId, 'approved');
          return { success: res.success, userId };
        })
      );

      const succeeded = results.filter(
        (r) => r.status === 'fulfilled' && r.value && r.value.success
      ).length;
      const failed = results.length - succeeded;

      setCustomerSyncState({
        loading: false,
        message: `Synced ${succeeded} customer accountStatus value(s) to approved.`,
        error: failed > 0 ? `Failed to sync ${failed} user(s).` : null,
      });
    } catch (e) {
      setCustomerSyncState({
        loading: false,
        message: null,
        error: e?.message || 'Failed to sync customer accountStatus.',
      });
    }
  };

  const providerIdentitySet = useMemo(() => {
    const normalizePhone = (value) => {
      const digits = (value || '').toString().replace(/\D/g, '');
      if (!digits) return '';
      if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
      return digits;
    };

    const normalizeEmail = (value) => (value || '').toString().trim().toLowerCase();

    const set = new Set();
    for (const req of dedupedRequests) {
      if (req.userType !== 'serviceProvider') continue;

      const userId = (req.userId || req.uid || req.userUid || req.providerUid || '').toString().trim();
      const phone = normalizePhone(req.phoneNumber);
      const email = normalizeEmail(req.email);

      if (userId) set.add(`uid:${userId}`);
      if (phone) set.add(`phone:${phone}`);
      if (email) set.add(`email:${email}`);
    }
    return set;
  }, [dedupedRequests]);

  // Filter requests based on active tab
  const filteredRequests = useMemo(() => {
    return dedupedRequests.filter((req) => {
      if (activeTab === TABS.all) return true;
      if (activeTab === TABS.providers) return req.userType === 'serviceProvider';
      if (activeTab === TABS.customers) return req.userType === 'customer' || req.userType === 'user';
      return true;
    });
  }, [dedupedRequests, activeTab]);

  const visibleRequests = useMemo(() => {
    const normalizePhone = (value) => {
      const digits = (value || '').toString().replace(/\D/g, '');
      if (!digits) return '';
      if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
      return digits;
    };

    const normalizeEmail = (value) => (value || '').toString().trim().toLowerCase();

    return filteredRequests.filter((req) => {
      const isCustomer = req.userType === 'customer' || req.userType === 'user';
      if (!isCustomer) return true;

      // hide orphan customer requests
      if (orphanRequestIds[req.id]) return false;

      // de-dupe: if this customer identity also has a provider verification request, hide from Customers tab
      if (activeTab === TABS.customers || activeTab === TABS.all) {
        const userId = (req.userId || req.uid || req.userUid || req.customerUid || '').toString().trim();
        const phone = normalizePhone(req.phoneNumber);
        const email = normalizeEmail(req.email);

        const matchedProvider =
          (userId && providerIdentitySet.has(`uid:${userId}`)) ||
          (phone && providerIdentitySet.has(`phone:${phone}`)) ||
          (email && providerIdentitySet.has(`email:${email}`));

        if (matchedProvider) return false;
      }

      return true;
    });
  }, [filteredRequests, orphanRequestIds, activeTab, providerIdentitySet]);

  const displayedStats = useMemo(() => {
    const next = { pending: 0, approved: 0, rejected: 0, total: 0 };
    for (const req of visibleRequests) {
      if (orphanRequestIds[req.id]) continue;
      const status = effectiveStatusByRequestId[req.id] || 'pending';
      next.total++;
      if (status === 'approved') next.approved++;
      else if (status === 'rejected') next.rejected++;
      else next.pending++;
    }
    return next;
  }, [visibleRequests, effectiveStatusByRequestId, orphanRequestIds]);

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
          <span className="stat-value pending">{displayedStats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="verification-stat-item">
          <span className="stat-value approved">{displayedStats.approved}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="verification-stat-item">
          <span className="stat-value rejected">{displayedStats.rejected}</span>
          <span className="stat-label">Rejected</span>
        </div>
        <div className="verification-stat-item total">
          <span className="stat-value">{displayedStats.total}</span>
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

        {activeTab === TABS.customers && (
          <button
            className="view-btn"
            onClick={handleSyncCustomerAccountStatus}
            disabled={customerSyncState.loading}
            style={{ marginLeft: 'auto' }}
          >
            {customerSyncState.loading ? 'Syncing...' : 'Sync Customer Status'}
          </button>
        )}
      </div>

      {(customerSyncState.message || customerSyncState.error) && (
        <div className="verifications-error" style={{
          background: customerSyncState.error ? '#FFEBEE' : '#E8F5E9',
          borderColor: customerSyncState.error ? '#FFCDD2' : '#C8E6C9',
          color: customerSyncState.error ? '#D32F2F' : '#2E7D32',
        }}>
          <AlertCircle size={20} />
          <span>
            {customerSyncState.message}
            {customerSyncState.error ? ` ${customerSyncState.error}` : ''}
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="verifications-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Queue */}
      <VerificationQueue
        requests={visibleRequests}
        statusOverrides={effectiveStatusByRequestId}
        loading={loading}
        onView={handleViewRequest}
      />
    </div>
  );
}
