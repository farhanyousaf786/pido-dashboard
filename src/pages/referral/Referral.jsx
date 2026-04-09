import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Edit3,
  Gift,
  Loader2,
  Save,
  Database,
  RefreshCw,
  X,
  ExternalLink,
  User,
  Clock,
  Download,
  Trash2,
  Receipt,
} from 'lucide-react';
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../core/firebase/firebaseConfig.js';
import { fetchMergedUserProfile } from '../../core/services/userProfileMerge.js';

function parseNumberOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function shortUid(uid) {
  if (!uid || uid === '—') return '—';
  const s = String(uid);
  return s.length > 16 ? `${s.slice(0, 16)}…` : s;
}

function pickNum(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function referralMetaObj(userData) {
  const m = userData?.referralMeta;
  return m && typeof m === 'object' ? m : null;
}

function pickFromUserAndMeta(userData, key) {
  if (!userData) return null;
  const n1 = pickNum(userData[key]);
  if (n1 != null) return n1;
  const m = referralMetaObj(userData);
  return m ? pickNum(m[key]) : null;
}

/** Only `credit_amount` on user / referralMeta (total referral credits). */
function pickCreditAmount(userData) {
  if (!userData) return null;
  return pickFromUserAndMeta(userData, 'credit_amount');
}

function formatCreditAmount(userData) {
  const n = pickCreditAmount(userData);
  return n != null ? `$${n.toFixed(2)}` : '—';
}

function pickReferralsCountFromProfile(userData) {
  if (!userData) return null;
  const m = referralMetaObj(userData);
  const fromMeta = m ? pickNum(m.referralsCount) : null;
  if (fromMeta != null) return fromMeta;
  return pickNum(userData.referralsCount);
}

function strTrim(v) {
  if (v == null || v === '') return '';
  return String(v).trim();
}

/** Best display label: name, then email, then phone variants (common Firestore shapes). */
function displayCustomerName(userData, uid) {
  const u = String(uid || '').trim();
  if (!userData) return shortUid(u) || '—';
  const fn = strTrim(userData.firstName);
  const ln = strTrim(userData.lastName);
  const composedName = fn && ln ? `${fn} ${ln}` : fn || ln;
  const label =
    strTrim(userData.fullName) ||
    strTrim(userData.displayName) ||
    strTrim(userData.name) ||
    composedName ||
    strTrim(userData.email) ||
    strTrim(userData.emailAddress) ||
    strTrim(userData.phoneNumber) ||
    strTrim(userData.phone) ||
    strTrim(userData.mobile) ||
    strTrim(userData.mobilePhone) ||
    strTrim(userData.mobileNumber);
  if (label) return label;
  return shortUid(u) || '—';
}

/** Name column only — never email/phone (those belong in Contact). */
function displayPersonNameOnly(userData, uid) {
  const u = String(uid || '').trim();
  if (!userData) return shortUid(u) || '—';
  const fn = strTrim(userData.firstName);
  const ln = strTrim(userData.lastName);
  const composedName = fn && ln ? `${fn} ${ln}` : fn || ln;
  const label =
    strTrim(userData.fullName) ||
    strTrim(userData.full_name) ||
    strTrim(userData.displayName) ||
    strTrim(userData.name) ||
    strTrim(userData.customerName) ||
    composedName;
  if (label) return label;
  return shortUid(u) || '—';
}

function formatUserContactLine(userData) {
  const email = pickUserEmail(userData);
  const phone = pickUserPhone(userData);
  if (email && phone) return `${email} · ${phone}`;
  return email || phone || '—';
}

function pickUserEmail(userData) {
  if (!userData) return '';
  return strTrim(userData.email || userData.emailAddress || userData.email_address);
}

function pickUserPhone(userData) {
  if (!userData) return '';
  return strTrim(
    userData.phoneNumber ||
      userData.phone_number ||
      userData.phone ||
      userData.mobile ||
      userData.mobilePhone ||
      userData.mobile_phone ||
      userData.mobileNumber ||
      userData.mobile_number
  );
}

/** Second line: show email/phone not already used as primary, or full UID if we only have a stub. */
function refereeContactSecondary(userData, uid, primaryLabel) {
  const u = String(uid || '').trim();
  const email = pickUserEmail(userData);
  const phone = pickUserPhone(userData);
  const parts = [];
  if (email && primaryLabel !== email) parts.push(email);
  if (phone && primaryLabel !== phone) parts.push(phone);
  if (parts.length) return parts.join(' · ');
  const stub = shortUid(u);
  if (u && (primaryLabel === stub || primaryLabel.endsWith('…'))) return u;
  return null;
}

function escapeCsvField(val) {
  const s = String(val ?? '');
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadReferralsDetailCsv({ referrerUid, referrerLabel, invites, userByUidMap }) {
  if (!invites?.length) return;
  const header = [
    'Referrer UID',
    'Referrer display',
    'Referee UID',
    'Referee display',
    'Email',
    'Phone',
    'Contact extra',
    'Status',
    'Reward state',
    'Reward credited',
    'Reward amount',
    'Code',
    'Sources',
    'Delete paths (type:uid:docId)',
  ];
  const rows = [header.map(escapeCsvField).join(',')];
  for (const inv of invites) {
    const ud = userByUidMap[inv.refereeUid];
    const display = displayCustomerName(ud, inv.refereeUid);
    rows.push(
      [
        referrerUid,
        referrerLabel,
        inv.refereeUid,
        display,
        pickUserEmail(ud),
        pickUserPhone(ud),
        refereeContactSecondary(ud, inv.refereeUid, display) || '',
        inv.status || '',
        isInviteRewardGiven(inv) ? 'given' : 'pending',
        inv.rewardCredited === true ? 'yes' : 'no',
        inv.rewardAmount != null ? String(inv.rewardAmount) : '',
        inv.code || '',
        Array.isArray(inv.sources) ? inv.sources.join(';') : '',
        Array.isArray(inv.deleteTargets)
          ? inv.deleteTargets.map((t) => deleteTargetKey(t)).join('|')
          : '',
      ]
        .map(escapeCsvField)
        .join(',')
    );
  }
  const csv = `\uFEFF${rows.join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = String(referrerUid).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
  a.href = url;
  a.download = `referrals_${safe}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Two-letter label for list avatars (handles phone-heavy names). */
function refereeAvatarLabel(displayName) {
  const s = String(displayName || '').trim();
  if (!s) return '?';
  const compact = s.replace(/\s+/g, '');
  const digits = compact.replace(/\D/g, '');
  if (digits.length >= 2) return digits.slice(-2);
  const letters = s.match(/[a-zA-Z]/g);
  if (letters && letters.length >= 2) return (letters[0] + letters[letters.length - 1]).toUpperCase();
  if (letters && letters.length === 1) return (letters[0] + (s[1] || letters[0])).toUpperCase().slice(0, 2);
  return compact.slice(0, 2).toUpperCase() || '?';
}

function deleteTargetKey(t) {
  if (t.type === 'referrals') return `r:${t.referrerUid}:${t.docId}`;
  return `u:${t.refereeUid}:${t.docId}`;
}

/** Firestore paths we can delete for this merged row (referrals subdoc +/or referrals_used subdoc). */
function buildDeleteTargetsFromRow(row, refereeUid, source) {
  const fu = String(refereeUid || '').trim();
  const ru = String(row.referrerUid || '').trim();
  const docId = row.id != null && row.id !== '' ? String(row.id).trim() : '';
  const targets = [];
  if (source === 'referrals' && ru && ru !== '—' && docId) {
    targets.push({ type: 'referrals', referrerUid: ru, docId });
  }
  if (source === 'referrals_used' && fu && fu !== '—' && docId) {
    targets.push({ type: 'referrals_used', refereeUid: fu, docId });
  }
  return targets;
}

function mergeDeleteTargets(a, b) {
  const m = new Map();
  [...(a || []), ...(b || [])].forEach((t) => m.set(deleteTargetKey(t), t));
  return [...m.values()];
}

function normalizeInviteFromRow(row, refereeUid, source) {
  const fu = String(refereeUid || '').trim();
  return {
    refereeUid: fu,
    code: row.codeUsed ?? row.code_used ?? row.code ?? '—',
    status: row.status != null && row.status !== '' ? String(row.status) : '—',
    rewardCredited: row.rewardCredited === true || row.reward_credited === true,
    rewardAmount: row.rewardAmount ?? row.reward_amount,
    sources: source ? [source] : [],
    deleteTargets: buildDeleteTargetsFromRow(row, fu, source),
  };
}

function statusImpliesRewardGiven(status) {
  const s = String(status || '').toLowerCase();
  return s === 'qualified' || s === 'completed' || s === 'rewarded';
}

function isInviteRewardGiven(inv) {
  if (!inv) return false;
  if (inv.rewardCredited === true) return true;
  return statusImpliesRewardGiven(inv.status);
}

function inviteProgressRank(inv) {
  let n = 0;
  if (isInviteRewardGiven(inv)) n += 10;
  if (inv.rewardCredited === true) n += 5;
  const s = String(inv.status || '').toLowerCase();
  if (s && s !== '—') n += 2;
  if (inv.rewardAmount != null && inv.rewardAmount !== '') n += 1;
  return n;
}

function mergeInviteRows(existing, incoming) {
  const out = { ...existing };
  if (incoming.code && out.code === '—') out.code = incoming.code;
  if (incoming.rewardCredited === true) out.rewardCredited = true;
  if (out.rewardAmount == null && incoming.rewardAmount != null) out.rewardAmount = incoming.rewardAmount;
  if (!statusImpliesRewardGiven(out.status) && statusImpliesRewardGiven(incoming.status)) {
    out.status = incoming.status;
  } else if (String(out.status) === '—' && incoming.status && String(incoming.status) !== '—') {
    out.status = incoming.status;
  } else if (inviteProgressRank(incoming) > inviteProgressRank(out) && incoming.status && String(incoming.status) !== '—') {
    out.status = incoming.status;
  }
  out.sources = [...new Set([...(existing.sources || []), ...(incoming.sources || [])])];
  out.deleteTargets = mergeDeleteTargets(existing.deleteTargets, incoming.deleteTargets);
  return out;
}

async function deleteReferralTargetsFlat(targets) {
  for (const t of targets) {
    if (t.type === 'referrals') {
      await deleteDoc(doc(db, 'users', t.referrerUid, 'referrals', t.docId));
    } else if (t.type === 'referrals_used') {
      await deleteDoc(doc(db, 'users', t.refereeUid, 'referrals_used', t.docId));
    }
  }
}

async function deleteReferralInviteDocuments(inv) {
  const targets = inv.deleteTargets || [];
  if (!targets.length) {
    throw new Error(
      'No Firestore document references on this row. Refresh the referral list and try again.'
    );
  }
  await deleteReferralTargetsFlat(targets);
}

/** All unique Firestore delete paths across every merged invite for this sender row. */
function mergeAllDeleteTargetsForSenderRow(row) {
  const m = new Map();
  for (const inv of row.invites || []) {
    for (const t of inv.deleteTargets || []) {
      m.set(deleteTargetKey(t), t);
    }
  }
  return [...m.values()];
}

const TABS = { config: 'config', breakdown: 'breakdown' };

const GLOBAL_REFERRALS_LIMIT = 350;
const GLOBAL_REFERRALS_USED_LIMIT = 350;
/** Per customer: scan enough docs to match CreditWalletService + avoid random limit() missing rows. */
const BOOKINGS_REFERRAL_SPEND_LIMIT = 500;
/** How many booking docs to scan (each query) to find customers who spent credit but aren’t in the referral graph. */
const BOOKINGS_DISCOVER_SPEND_LIMIT = 500;

const DIALOG_TAB = { referrals: 'referrals', spending: 'spending' };

function bookingReferralSortMillis(data) {
  const t = data?.referralCreditFinalizedAt ?? data?.updatedAt ?? data?.createdAt;
  if (t == null) return 0;
  try {
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (typeof t.toDate === 'function') return t.toDate().getTime();
  } catch {
    /* ignore */
  }
  if (t instanceof Date) return t.getTime();
  if (typeof t === 'number') return t;
  return 0;
}

function formatBookingSpendTimestamp(data) {
  const t = data?.referralCreditFinalizedAt ?? data?.updatedAt ?? data?.createdAt;
  if (t == null) return '—';
  try {
    if (typeof t.toDate === 'function') return t.toDate().toLocaleString();
    if (typeof t.toMillis === 'function') return new Date(t.toMillis()).toLocaleString();
    if (t instanceof Date) return t.toLocaleString();
  } catch {
    /* ignore */
  }
  return String(t);
}

/** Mirrors app: referralCreditUsed ?? referralCreditApplied (only > 0). */
function pickBookingReferralCreditUsedOrApplied(raw) {
  const u = raw?.referralCreditUsed;
  const a = raw?.referralCreditApplied;
  const val = u != null && u !== '' ? u : a;
  if (val == null || val === '') return null;
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Customers who have referral credit on at least one booking — includes people who never appear as
 * referrerUid in referrals or referrals_used, same basis as the app wallet Applied to bookings list.
 */
async function fetchCustomerUidsWithReferralBookingSpend() {
  const uids = new Set();
  const seenDocIds = new Set();
  const ingest = (snap) => {
    snap.docs.forEach((d) => {
      if (seenDocIds.has(d.id)) return;
      const data = d.data() || {};
      if (pickBookingReferralCreditUsedOrApplied(data) == null) return;
      seenDocIds.add(d.id);
      const cu = String(data.customerUid || data.customer_uid || '').trim();
      if (cu) uids.add(cu);
    });
  };
  try {
    const [s1, s2] = await Promise.all([
      getDocs(
        query(
          collection(db, 'bookings'),
          where('referralCreditUsed', '>', 0),
          limit(BOOKINGS_DISCOVER_SPEND_LIMIT)
        )
      ),
      getDocs(
        query(
          collection(db, 'bookings'),
          where('referralCreditApplied', '>', 0),
          limit(BOOKINGS_DISCOVER_SPEND_LIMIT)
        )
      ),
    ]);
    ingest(s1);
    ingest(s2);
  } catch (e) {
    console.error('fetchCustomerUidsWithReferralBookingSpend:', e);
  }
  return [...uids].sort();
}

async function fetchCustomerReferralSpendBookings(customerUid) {
  const uid = String(customerUid || '').trim();
  if (!uid) return { rows: [], total: 0 };
  const snap = await getDocs(
    query(
      collection(db, 'bookings'),
      where('customerUid', '==', uid),
      limit(BOOKINGS_REFERRAL_SPEND_LIMIT)
    )
  );
  const rows = [];
  snap.docs.forEach((d) => {
    const data = d.data() || {};
    const amount = pickBookingReferralCreditUsedOrApplied(data);
    if (amount == null) return;
    const bookingId =
      data.bookingId != null && String(data.bookingId).trim() !== ''
        ? String(data.bookingId)
        : d.id;
    const rawTotal = data.totalAmount;
    const totalAmountNum =
      rawTotal != null && rawTotal !== ''
        ? typeof rawTotal === 'number'
          ? rawTotal
          : Number(rawTotal)
        : null;
    rows.push({
      docId: d.id,
      bookingId,
      amount,
      categoryName: data.categoryName ?? data.category_name ?? '—',
      whenLabel: formatBookingSpendTimestamp(data),
      finalized: data.referralCreditFinalized === true,
      sortKey: bookingReferralSortMillis(data),
      bookingTotal: Number.isFinite(totalAmountNum) ? totalAmountNum : null,
    });
  });
  rows.sort((a, b) => b.sortKey - a.sortKey);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return { rows, total };
}

function mapReferralGroupDoc(d) {
  const referrerUid = d.ref.parent?.parent?.id ?? '—';
  const data = d.data() || {};
  const refereeUid = data.refereeUid ?? data.referee_uid ?? d.id;
  return { id: d.id, referrerUid, refereeUid, ...data };
}

function mapReferralsUsedGroupDoc(d) {
  const refereeFromPath = d.ref.parent?.parent?.id ?? '—';
  const data = d.data() || {};
  const refereeUid = data.refereeUid ?? data.customerUid ?? refereeFromPath;
  /** Must come from fields — document id here is often an auto-id, not the referrer UID. */
  const referrerUid = String(data.referrerUid ?? data.referrer_uid ?? '').trim();
  return { id: d.id, refereeUid, referrerUid: referrerUid || '—', ...data };
}

export default function Referral({ onOpenBooking }) {
  const [activeTab, setActiveTab] = useState(TABS.config);

  const [configLoading, setConfigLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const [docId, setDocId] = useState(null);
  const [raw, setRaw] = useState(null);
  const [form, setForm] = useState({
    refereeCreditAmount: '',
    referrerCreditAmount: '',
    signupRewardAmount: '',
    isReferrerCanGetReward: false,
    isRefereeCanGetReward: false,
    isSignupRewardEnabled: false,
  });
  const [initialForm, setInitialForm] = useState(null);

  const [globalReferrals, setGlobalReferrals] = useState([]);
  const [globalReferralsUsed, setGlobalReferralsUsed] = useState([]);
  const [globalListsLoading, setGlobalListsLoading] = useState(false);
  const [globalListsError, setGlobalListsError] = useState(null);

  const [userByUid, setUserByUid] = useState({});
  const [usersHydrating, setUsersHydrating] = useState(false);

  const [referrerDetailDialog, setReferrerDetailDialog] = useState(null);
  const [deletingReferrerUid, setDeletingReferrerUid] = useState(null);

  const [referralSpendByUid, setReferralSpendByUid] = useState({});
  const [referralSpendLoading, setReferralSpendLoading] = useState(false);
  /** customerUid values found on bookings with referral credit (may have no referrals sub-docs). */
  const [spendDiscoverUids, setSpendDiscoverUids] = useState([]);

  const loadGlobalReferralLists = useCallback(async () => {
    setGlobalListsLoading(true);
    setGlobalListsError(null);
    try {
      const [refSnap, usedSnap] = await Promise.all([
        getDocs(query(collectionGroup(db, 'referrals'), limit(GLOBAL_REFERRALS_LIMIT))),
        getDocs(query(collectionGroup(db, 'referrals_used'), limit(GLOBAL_REFERRALS_USED_LIMIT))),
      ]);
      setGlobalReferrals(refSnap.docs.map(mapReferralGroupDoc));
      setGlobalReferralsUsed(usedSnap.docs.map(mapReferralsUsedGroupDoc));
    } catch (e) {
      console.error('Global referral list load:', e);
      setGlobalReferrals([]);
      setGlobalReferralsUsed([]);
      setGlobalListsError(
        e?.message ||
          'Failed to load. You may need a Firestore composite index for collection group queries — check the browser console / Firebase link.'
      );
    } finally {
      setGlobalListsLoading(false);
    }
  }, []);

  const loadSpendDiscovery = useCallback(async () => {
    try {
      const uids = await fetchCustomerUidsWithReferralBookingSpend();
      setSpendDiscoverUids(uids);
    } catch (e) {
      console.error('Referral spend discovery:', e);
      setSpendDiscoverUids([]);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== TABS.breakdown) return undefined;
    loadGlobalReferralLists();
    return undefined;
  }, [activeTab, loadGlobalReferralLists]);

  useEffect(() => {
    if (activeTab !== TABS.breakdown) {
      setSpendDiscoverUids([]);
      return undefined;
    }
    void loadSpendDiscovery();
    return undefined;
  }, [activeTab, loadSpendDiscovery]);

  const invitesByReferrer = useMemo(() => {
    const byReferrer = new Map();
    const addInvite = (referrerUid, refereeUid, row, source) => {
      const ru = String(referrerUid || '').trim();
      const fu = String(refereeUid || '').trim();
      if (!ru || ru === '—' || !fu || fu === '—') return;
      if (!byReferrer.has(ru)) byReferrer.set(ru, new Map());
      const m = byReferrer.get(ru);
      const next = normalizeInviteFromRow(row, fu, source);
      if (m.has(fu)) {
        m.set(fu, mergeInviteRows(m.get(fu), next));
        return;
      }
      m.set(fu, next);
    };
    for (const r of globalReferrals) {
      addInvite(r.referrerUid, r.refereeUid, r, 'referrals');
    }
    for (const r of globalReferralsUsed) {
      addInvite(r.referrerUid, r.refereeUid, r, 'referrals_used');
    }
    return byReferrer;
  }, [globalReferrals, globalReferralsUsed]);

  const senderRows = useMemo(() => {
    const rows = [];
    const seen = new Set();
    for (const [referrerUid, inviteMap] of invitesByReferrer.entries()) {
      const invites = Array.from(inviteMap.values());
      rows.push({ referrerUid, invites, inviteCount: invites.length });
      seen.add(referrerUid);
    }
    for (const uid of spendDiscoverUids) {
      const u = String(uid || '').trim();
      if (!u || u === '—' || seen.has(u)) continue;
      rows.push({ referrerUid: u, invites: [], inviteCount: 0 });
      seen.add(u);
    }
    rows.sort((a, b) => b.inviteCount - a.inviteCount || a.referrerUid.localeCompare(b.referrerUid));
    return rows;
  }, [invitesByReferrer, spendDiscoverUids]);

  const referrerUidsKey = useMemo(
    () =>
      [...new Set(senderRows.map((r) => r.referrerUid).filter((u) => u && u !== '—'))].sort().join(','),
    [senderRows]
  );

  useEffect(() => {
    if (activeTab !== TABS.breakdown) return undefined;
    const uids = [...new Set(senderRows.map((r) => r.referrerUid).filter((u) => u && u !== '—'))];
    if (!uids.length) {
      setReferralSpendByUid({});
      setReferralSpendLoading(false);
      return undefined;
    }
    let cancelled = false;
    setReferralSpendLoading(true);
    setReferralSpendByUid({});
    (async () => {
      try {
        const pairs = await Promise.all(
          uids.map(async (uid) => {
            try {
              const result = await fetchCustomerReferralSpendBookings(uid);
              return [uid, result];
            } catch (e) {
              console.error('Referral spend bookings:', uid, e);
              return [uid, { rows: [], total: 0 }];
            }
          })
        );
        if (!cancelled) setReferralSpendByUid(Object.fromEntries(pairs));
      } finally {
        if (!cancelled) setReferralSpendLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, referrerUidsKey]);

  const hydrateUserDocs = useCallback(async () => {
    const ids = new Set();
    for (const r of globalReferrals) {
      if (r.referrerUid && r.referrerUid !== '—') ids.add(String(r.referrerUid));
      if (r.refereeUid && r.refereeUid !== '—') ids.add(String(r.refereeUid));
    }
    for (const r of globalReferralsUsed) {
      if (r.referrerUid && r.referrerUid !== '—') ids.add(String(r.referrerUid));
      if (r.refereeUid && r.refereeUid !== '—') ids.add(String(r.refereeUid));
    }
    for (const uid of spendDiscoverUids) {
      if (uid && uid !== '—') ids.add(String(uid));
    }
    const uids = [...ids].filter(Boolean).slice(0, 500);
    if (!uids.length) {
      setUserByUid({});
      return;
    }
    setUsersHydrating(true);
    try {
      const chunks = [];
      for (let i = 0; i < uids.length; i += 40) chunks.push(uids.slice(i, i + 40));
      const next = {};
      for (const chunk of chunks) {
        /* eslint-disable no-await-in-loop */
        const merged = await Promise.all(chunk.map((uid) => fetchMergedUserProfile(uid)));
        merged.forEach((data, j) => {
          const uid = chunk[j];
          if (data) next[uid] = data;
        });
      }
      setUserByUid(next);
    } catch (e) {
      console.error('Hydrate referral users:', e);
    } finally {
      setUsersHydrating(false);
    }
  }, [globalReferrals, globalReferralsUsed, spendDiscoverUids]);

  useEffect(() => {
    if (activeTab !== TABS.breakdown) return undefined;
    hydrateUserDocs();
    return undefined;
  }, [activeTab, globalReferrals, globalReferralsUsed, spendDiscoverUids, hydrateUserDocs]);

  const closeReferrerDetailDialog = useCallback(() => setReferrerDetailDialog(null), []);

  const handleDeleteSenderRow = useCallback(
    async (row) => {
      const targets = mergeAllDeleteTargetsForSenderRow(row);
      if (!targets.length) {
        window.alert(
          'No referral documents to delete for this row. It may be spend-only (bookings only) with no referrals or referrals_used in the loaded batch — remove data in Firestore if you still need to clean it up.'
        );
        return;
      }
      const n = targets.length;
      const ud = userByUid[row.referrerUid];
      const label = displayPersonNameOnly(ud, row.referrerUid);
      if (
        !window.confirm(
          `Delete all referral link documents for this referrer?\n\nThis removes ${n} Firestore document(s) (referrals and/or referrals_used). This cannot be undone.\n\nReferrer: ${label}\nUID: ${row.referrerUid}`
        )
      ) {
        return;
      }
      try {
        setDeletingReferrerUid(row.referrerUid);
        await deleteReferralTargetsFlat(targets);
        await loadGlobalReferralLists();
        await loadSpendDiscovery();
        setReferrerDetailDialog((prev) => (prev?.referrerUid === row.referrerUid ? null : prev));
      } catch (e) {
        console.error('Delete sender referral row:', e);
        window.alert(e?.message || 'Delete failed. Check Firestore rules and console.');
      } finally {
        setDeletingReferrerUid(null);
      }
    },
    [userByUid, loadGlobalReferralLists, loadSpendDiscovery]
  );

  useEffect(() => {
    setConfigLoading(true);
    setError(null);

    const q = query(collection(db, 'credit_amount'), limit(1));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setDocId(null);
          setRaw(null);
          setConfigLoading(false);
          return;
        }

        const first = snap.docs[0];
        const data = first.data() || {};
        setDocId(first.id);
        setRaw(data);

        const next = {
          refereeCreditAmount:
            data.refereeCreditAmount ?? data.referee_credit_amount ?? data.refereeAmount ?? '',
          referrerCreditAmount:
            data.referrerCreditAmount ?? data.referrer_credit_amount ?? data.referrerAmount ?? '',
          signupRewardAmount: data.signupRewardAmount ?? data.signup_reward_amount ?? '',
          isReferrerCanGetReward:
            data.isReferrerCanGetReward ?? data.is_referrer_can_get_reward ?? false,
          isRefereeCanGetReward:
            data.isRefereeCanGetReward ?? data.is_referee_can_get_reward ?? false,
          isSignupRewardEnabled: data.isSignupRewardEnabled ?? data.is_signup_reward_enabled ?? false,
        };

        setForm(next);
        setInitialForm(next);
        setSaveResult(null);
        setEditMode(false);
        setConfigLoading(false);
      },
      (err) => {
        console.error('Failed to load referral config:', err);
        setError('Failed to load referral config.');
        setConfigLoading(false);
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const dirty = useMemo(() => {
    if (!initialForm) return false;
    return JSON.stringify(initialForm) !== JSON.stringify(form);
  }, [initialForm, form]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    if (!docId) return;
    try {
      setSaving(true);
      setSaveResult(null);
      setError(null);

      const updates = {
        refereeCreditAmount: parseNumberOrNull(form.refereeCreditAmount) ?? 0,
        referrerCreditAmount: parseNumberOrNull(form.referrerCreditAmount) ?? 0,
        signupRewardAmount: parseNumberOrNull(form.signupRewardAmount) ?? 0,
        isReferrerCanGetReward: form.isReferrerCanGetReward === true,
        isRefereeCanGetReward: form.isRefereeCanGetReward === true,
        isSignupRewardEnabled: form.isSignupRewardEnabled === true,
      };

      await updateDoc(doc(db, 'credit_amount', docId), updates);
      setSaveResult({ success: true, message: 'Saved' });
      setEditMode(false);
    } catch (e) {
      console.error('Failed to save referral config:', e);
      setSaveResult({ success: false, message: 'Failed to save', error: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-shell referral-page">
      <h1 className="page-shell__title">Referral</h1>
      <p className="page-shell__subtitle">
        Global reward settings and Firestore referral breakdown (referee vs referrer paths).
      </p>

      <div className="verification-tabs referral-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === TABS.config ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.config)}
        >
          <Gift size={18} />
          Reward config
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === TABS.breakdown ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.breakdown)}
        >
          <Database size={18} />
          Data breakdown
        </button>
      </div>

      {activeTab === TABS.config && (
        <>
          {error && (
            <div className="bookings-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {saveResult && (
            <div
              className={
                saveResult.success ? 'booking-save-banner success' : 'booking-save-banner danger'
              }
            >
              <span>
                {saveResult.success ? (
                  <>
                    <CheckCircle size={16} /> {saveResult.message}
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} /> {saveResult.message}
                  </>
                )}
              </span>
              {!saveResult.success && saveResult.error && (
                <span className="booking-save-banner__sub">{saveResult.error}</span>
              )}
            </div>
          )}

          {configLoading ? (
            <div className="booking-detail-loading">
              <Loader2 className="spin" size={22} /> Loading…
            </div>
          ) : !docId ? (
            <div className="page-shell__empty">No referral config found in `credit_amount`.</div>
          ) : (
            <div className="booking-profile-card">
              <div className="booking-profile-header">
                <div className="booking-profile-info">
                  <h2 className="booking-profile-name">Referral Config</h2>
                  {/* <div className="booking-profile-badges">
                    <span className="booking-badge neutral monospace">Doc: {docId}</span>
                    {raw?.amount != null && (
                      <span className="booking-badge neutral">Legacy amount: {String(raw.amount)}</span>
                    )}
                  </div> */}
                </div>

                <div className="booking-detail-header-actions">
                  <button
                    type="button"
                    className="bookings-action-btn"
                    onClick={() => {
                      setEditMode((p) => !p);
                      setSaveResult(null);
                    }}
                    disabled={saving}
                  >
                    <Edit3 size={16} />
                    <span>{editMode ? 'Exit Edit' : 'Edit'}</span>
                  </button>

                  <button
                    type="button"
                    className="bookings-primary-btn"
                    onClick={handleSave}
                    disabled={!editMode || !dirty || saving}
                  >
                    {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    <span>{saving ? 'Saving…' : 'Save'}</span>
                  </button>
                </div>
              </div>

              <div className="booking-details-grid">
                <div className="detail-section">
                  <h3 className="section-title">Credit Amounts</h3>
                  <div className="detail-items">
                    <div className="detail-item">
                      <span className="detail-label">Referee Credit Amount</span>
                      {editMode ? (
                        <input
                          type="number"
                          className="booking-input"
                          name="refereeCreditAmount"
                          value={form.refereeCreditAmount}
                          onChange={handleChange}
                        />
                      ) : (
                        <span className="detail-value">{String(form.refereeCreditAmount ?? '-')}</span>
                      )}
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Referrer Credit Amount</span>
                      {editMode ? (
                        <input
                          type="number"
                          className="booking-input"
                          name="referrerCreditAmount"
                          value={form.referrerCreditAmount}
                          onChange={handleChange}
                        />
                      ) : (
                        <span className="detail-value">{String(form.referrerCreditAmount ?? '-')}</span>
                      )}
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Signup Reward Amount</span>
                      {editMode ? (
                        <input
                          type="number"
                          className="booking-input"
                          name="signupRewardAmount"
                          value={form.signupRewardAmount}
                          onChange={handleChange}
                        />
                      ) : (
                        <span className="detail-value">{String(form.signupRewardAmount ?? '-')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3 className="section-title">Reward Eligibility</h3>
                  <div className="detail-items">
                    <div className="detail-item booking-checkbox">
                      <label className="booking-check">
                        <input
                          type="checkbox"
                          name="isReferrerCanGetReward"
                          checked={form.isReferrerCanGetReward === true}
                          onChange={handleChange}
                          disabled={!editMode}
                        />
                        Referrer can get reward
                      </label>
                    </div>

                    <div className="detail-item booking-checkbox">
                      <label className="booking-check">
                        <input
                          type="checkbox"
                          name="isRefereeCanGetReward"
                          checked={form.isRefereeCanGetReward === true}
                          onChange={handleChange}
                          disabled={!editMode}
                        />
                        Referee can get reward
                      </label>
                    </div>

                    <div className="detail-item booking-checkbox">
                      <label className="booking-check">
                        <input
                          type="checkbox"
                          name="isSignupRewardEnabled"
                          checked={form.isSignupRewardEnabled === true}
                          onChange={handleChange}
                          disabled={!editMode}
                        />
                        Signup reward is enabled
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === TABS.breakdown && (
        <div className="referral-breakdown">
          <div className="referral-breakdown__toolbar">
            <button
              type="button"
              className="bookings-action-btn"
              onClick={() => {
                loadGlobalReferralLists();
                void loadSpendDiscovery();
              }}
              disabled={globalListsLoading}
            >
              {globalListsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              <span>{globalListsLoading ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            {usersHydrating ? (
              <span className="referral-breakdown__hydrating">Loading customer profiles…</span>
            ) : null}
          </div>

          {globalListsError && (
            <div className="bookings-error">
              <AlertCircle size={20} />
              <span>{globalListsError}</span>
            </div>
          )}

          {globalListsLoading && senderRows.length === 0 && !globalListsError && (
            <div className="booking-detail-loading">
              <Loader2 className="spin" size={22} /> Loading referral data…
            </div>
          )}

          {!globalListsLoading || senderRows.length > 0 ? (
            <ReferrerListTable
              rows={senderRows}
              userByUid={userByUid}
              referralSpendByUid={referralSpendByUid}
              referralSpendLoading={referralSpendLoading}
              deletingReferrerUid={deletingReferrerUid}
              onDeleteRow={handleDeleteSenderRow}
              onView={(row) =>
                setReferrerDetailDialog({
                  referrerUid: row.referrerUid,
                  invites: row.invites,
                })
              }
            />
          ) : null}

          <ReferrerDetailDialog
            open={Boolean(referrerDetailDialog)}
            onClose={closeReferrerDetailDialog}
            payload={referrerDetailDialog}
            userByUid={userByUid}
            onLinksChanged={loadGlobalReferralLists}
            referralSpendByUid={referralSpendByUid}
            referralSpendLoading={referralSpendLoading}
            onOpenBooking={onOpenBooking}
          />
        </div>
      )}
    </section>
  );
}

function ReferrerRefereeSection({
  title,
  icon: Icon,
  variant,
  invites,
  userByUid,
  onDeleteInvite,
  deletingRefereeUid,
}) {
  if (!invites.length) return null;
  return (
    <div className={`referral-referee-list__section referral-referee-list__section--${variant}`}>
      <h3 className="referral-referee-list__section-title">
        <Icon size={18} className="referral-referee-list__section-icon" aria-hidden />
        {title}
        <span className="referral-referee-list__section-count">({invites.length})</span>
      </h3>
      <ul className="referral-referee-list__items" role="list">
        {invites.map((inv, index) => {
          const ud = userByUid[inv.refereeUid];
          const name = displayCustomerName(ud, inv.refereeUid);
          const contactLine = refereeContactSecondary(ud, inv.refereeUid, name);
          const label = refereeAvatarLabel(name);
          const statusLabel = inv.status && inv.status !== '—' ? inv.status : null;
          const rewardN = pickNum(inv.rewardAmount);
          const canDelete = Array.isArray(inv.deleteTargets) && inv.deleteTargets.length > 0;
          const isDeleting = deletingRefereeUid === inv.refereeUid;
          return (
            <li
              key={inv.refereeUid}
              className={`referral-referee-list__item referral-referee-list__item--${variant}`}
            >
              <span className="referral-referee-list__avatar" aria-hidden="true">
                {label}
              </span>
              <div className="referral-referee-list__text">
                <span className="referral-referee-list__name">{name}</span>
                {contactLine ? (
                  <span className="referral-referee-list__contact" title={contactLine}>
                    {contactLine}
                  </span>
                ) : null}
                {(statusLabel || (variant === 'given' && rewardN != null)) && (
                  <span className="referral-referee-list__sub">
                    {statusLabel ? <span className="referral-referee-list__status-pill">{statusLabel}</span> : null}
                    {statusLabel && variant === 'given' && rewardN != null ? ' · ' : null}
                    {variant === 'given' && rewardN != null ? (
                      <span>Reward ${rewardN.toFixed(2)}</span>
                    ) : null}
                  </span>
                )}
              </div>
              <div className="referral-referee-list__item-trailing">
                <button
                  type="button"
                  className="referral-referee-list__delete"
                  aria-label="Delete this referral from Firestore"
                  title={
                    canDelete
                      ? 'Delete referral document(s) in Firestore'
                      : 'Refresh list — delete paths not loaded for this row'
                  }
                  disabled={!canDelete || isDeleting || Boolean(deletingRefereeUid && deletingRefereeUid !== inv.refereeUid)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteInvite?.(inv);
                  }}
                >
                  {isDeleting ? <Loader2 size={16} className="spin" aria-hidden /> : <Trash2 size={16} aria-hidden />}
                </button>
                <span className="referral-referee-list__index">{index + 1}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function inviteHasReferralsSubcollectionSource(inv) {
  return Array.isArray(inv.sources) && inv.sources.includes('referrals');
}

function formatReferralSpendCreditNegative(amount) {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return '—';
  return `-$${n.toFixed(2)}`;
}

function formatBookingMoney(amount) {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toFixed(2)}`;
}

function ReferrerDetailDialog({
  open,
  onClose,
  payload,
  userByUid,
  onLinksChanged,
  referralSpendByUid,
  referralSpendLoading,
  onOpenBooking,
}) {
  const [fetchedReferees, setFetchedReferees] = useState({});
  const [deletingRefereeUid, setDeletingRefereeUid] = useState(null);
  const [dialogTab, setDialogTab] = useState(DIALOG_TAB.referrals);

  useEffect(() => {
    if (!open) setDialogTab(DIALOG_TAB.referrals);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFetchedReferees({});
      return undefined;
    }
    if (!payload?.invites?.length) return undefined;
    const uids = [...new Set(payload.invites.map((i) => i.refereeUid).filter(Boolean))];
    const missing = uids.filter((uid) => !userByUid[uid]);
    if (!missing.length) {
      setFetchedReferees({});
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const next = {};
        await Promise.all(
          missing.map(async (uid) => {
            try {
              const data = await fetchMergedUserProfile(uid);
              if (data) next[uid] = data;
            } catch {
              /* ignore */
            }
          })
        );
        if (!cancelled) setFetchedReferees(next);
      } catch {
        if (!cancelled) setFetchedReferees({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, payload, userByUid]);

  useEffect(() => {
    if (!open) setDeletingRefereeUid(null);
  }, [open]);

  const handleDeleteInvite = async (inv) => {
    if (!inv?.refereeUid || !inv.deleteTargets?.length) return;
    const n = inv.deleteTargets.length;
    const msg = `Delete this referral?\n\nThis will remove ${n} Firestore document(s) (referrals and/or referrals_used). This cannot be undone.\n\nReferee UID: ${inv.refereeUid}`;
    if (!window.confirm(msg)) return;
    try {
      setDeletingRefereeUid(inv.refereeUid);
      await deleteReferralInviteDocuments(inv);
      await onLinksChanged?.();
      onClose();
    } catch (e) {
      console.error('Delete referral:', e);
      window.alert(e?.message || 'Delete failed. Check Firestore rules and console.');
    } finally {
      setDeletingRefereeUid(null);
    }
  };

  if (!open || !payload) return null;
  const { referrerUid, invites } = payload;
  const mergedByUid = { ...userByUid, ...fetchedReferees };
  const self = mergedByUid[referrerUid];
  const referrerLabel = displayPersonNameOnly(self, referrerUid);

  const given = [];
  const pending = [];
  for (const inv of invites) {
    (isInviteRewardGiven(inv) ? given : pending).push(inv);
  }

  const countFromReferralsPath = invites.filter(inviteHasReferralsSubcollectionSource).length;
  const countOnlyFromReferralsUsed = invites.filter((inv) => {
    const s = inv.sources || [];
    return s.includes('referrals_used') && !s.includes('referrals');
  }).length;

  const spendBundle = referralSpendByUid?.[referrerUid];
  const spendRows = spendBundle?.rows ?? [];
  const spendTotal = spendBundle?.total ?? 0;
  const spendingTabReady = !referralSpendLoading;

  return (
    <div className="referral-dialog-overlay" onClick={onClose} role="presentation">
      <div
        className="referral-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="referral-detail-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="referral-dialog__header">
          <h2 id="referral-detail-dialog-title" className="referral-dialog__title">
            Referrals — {referrerLabel}
          </h2>
          <div className="referral-dialog__header-actions">
            <button
              type="button"
              className="referral-dialog__download"
              disabled={!invites.length}
              onClick={(e) => {
                e.stopPropagation();
                downloadReferralsDetailCsv({
                  referrerUid,
                  referrerLabel,
                  invites,
                  userByUidMap: mergedByUid,
                });
              }}
            >
              <Download size={18} aria-hidden />
              Download CSV
            </button>
            <button type="button" className="referral-dialog__close" onClick={onClose} aria-label="Close">
              <X size={22} />
            </button>
          </div>
        </div>
        <div className="referral-dialog__body referral-dialog__body--referee-list">
          <div className="referral-breakdown__subtabs referral-dialog__subtabs" role="tablist" aria-label="Detail sections">
            <button
              type="button"
              role="tab"
              aria-selected={dialogTab === DIALOG_TAB.referrals}
              className={`referral-breakdown__subtab${dialogTab === DIALOG_TAB.referrals ? ' active' : ''}`}
              onClick={() => setDialogTab(DIALOG_TAB.referrals)}
            >
              <User size={16} aria-hidden />
              Referrals
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dialogTab === DIALOG_TAB.spending}
              className={`referral-breakdown__subtab${dialogTab === DIALOG_TAB.spending ? ' active' : ''}`}
              onClick={() => setDialogTab(DIALOG_TAB.spending)}
            >
              <Receipt size={16} aria-hidden />
              Spending
            </button>
          </div>

          {dialogTab === DIALOG_TAB.referrals ? (
            invites.length === 0 ? (
              <p className="referral-breakdown__muted">No referrals in this batch.</p>
            ) : (
              <div className="referral-referee-list">
                <p className="referral-referee-list__meta">
                  <User size={16} className="referral-referee-list__meta-icon" aria-hidden />
                  <span>
                    <strong>{invites.length}</strong>{' '}
                    {invites.length === 1 ? 'person referred' : 'people referred'}
                    {given.length > 0 ? (
                      <>
                        {' · '}
                        <strong>{given.length}</strong> reward given
                      </>
                    ) : null}
                    {pending.length > 0 ? (
                      <>
                        {' · '}
                        <strong>{pending.length}</strong> pending
                      </>
                    ) : null}
                  </span>
                </p>
                {invites.length > 0 && countFromReferralsPath === 0 ? (
                  <div className="referral-dialog__source-callout" role="note">
                    <strong>No rows from this user’s <code>users/&lt;uid&gt;/referrals</code> path in the loaded batch.</strong>{' '}
                    All <strong>{invites.length}</strong> link(s) are from other accounts’{' '}
                    <code>referrals_used</code> docs (or merged data) where <code>referrerUid</code> matches this user.
                    Open each referee’s <code>users/&lt;their uid&gt;/referrals_used</code> in Firestore to inspect.
                  </div>
                ) : invites.length > 0 ? (
                  <div className="referral-dialog__source-callout referral-dialog__source-callout--split" role="note">
                    <span>
                      <strong>{countFromReferralsPath}</strong> from{' '}
                      <code>users/&lt;this referrer&gt;/referrals</code>
                    </span>
                    {countOnlyFromReferralsUsed > 0 ? (
                      <span>
                        <strong>{countOnlyFromReferralsUsed}</strong> only from <code>referrals_used</code>
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <ReferrerRefereeSection
                  title="Reward given"
                  icon={CheckCircle}
                  variant="given"
                  invites={given}
                  userByUid={mergedByUid}
                  onDeleteInvite={handleDeleteInvite}
                  deletingRefereeUid={deletingRefereeUid}
                />
                <ReferrerRefereeSection
                  title="Pending"
                  icon={Clock}
                  variant="pending"
                  invites={pending}
                  userByUid={mergedByUid}
                  onDeleteInvite={handleDeleteInvite}
                  deletingRefereeUid={deletingRefereeUid}
                />
              </div>
            )
          ) : !spendingTabReady ? (
            <div className="booking-detail-loading referral-dialog__spend-loading">
              <Loader2 className="spin" size={22} /> Loading bookings…
            </div>
          ) : (
            <div className="referral-spend-panel">
              <p className="referral-spend-panel__hint referral-breakdown__muted">
                Bookings where <code>customerUid</code> is this person, with referral credit applied (newest first, up to{' '}
                {BOOKINGS_REFERRAL_SPEND_LIMIT} rows). Amounts mirror the app (credit shown as negative).
              </p>
              {!spendRows.length ? (
                <p className="referral-breakdown__muted">No referral credit usage on bookings in this sample.</p>
              ) : (
                <div className="verification-table-container referral-breakdown__table-wrap">
                  <table className="verification-table referral-breakdown__table referral-spend-table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Category</th>
                        <th>Credit</th>
                        <th>Booking total</th>
                        <th>Booking</th>
                        <th>Finalized</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {spendRows.map((r) => (
                        <tr key={`${r.docId}-${r.bookingId}`}>
                          <td>{r.whenLabel}</td>
                          <td>{r.categoryName}</td>
                          <td className="referral-spend-table__credit">{formatReferralSpendCreditNegative(r.amount)}</td>
                          <td>{formatBookingMoney(r.bookingTotal)}</td>
                          <td className="monospace referral-spend-table__bid" title={r.bookingId}>
                            {r.bookingId}
                          </td>
                          <td>{r.finalized ? 'Yes' : '—'}</td>
                          <td>
                            {onOpenBooking ? (
                              <button
                                type="button"
                                className="referral-view-btn"
                                onClick={() => onOpenBooking({ bookingId: r.bookingId })}
                              >
                                <ExternalLink size={14} aria-hidden />
                                Open
                              </button>
                            ) : (
                              <span className="referral-breakdown__muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="referral-spend-table__total-row">
                        <td colSpan={2}>
                          <strong>Total credit used</strong>
                        </td>
                        <td className="referral-spend-table__credit">
                          <strong>{formatReferralSpendCreditNegative(spendTotal)}</strong>
                        </td>
                        <td colSpan={4} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferrerListTable({
  rows,
  userByUid,
  referralSpendByUid,
  referralSpendLoading,
  onView,
  onDeleteRow,
  deletingReferrerUid,
}) {
  if (!rows?.length) {
    return (
      <p className="referral-breakdown__muted">
        No referrers in this batch (check <code>users/*/referrals</code> and <code>users/*/referrals_used</code>).
      </p>
    );
  }
  return (
    <div className="verification-table-container referral-breakdown__table-wrap">
      <table className="verification-table referral-breakdown__table referral-people-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Credits</th>
            <th>Referrals</th>
            <th>Spending</th>
            <th className="referral-people-table__actions-head">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const ud = userByUid[row.referrerUid];
            const count = pickReferralsCountFromProfile(ud) ?? row.inviteCount;
            const spendTotal = referralSpendByUid?.[row.referrerUid]?.total;
            const spendCell = referralSpendLoading ? (
              <Loader2 size={16} className="spin referral-spend-inline-loader" aria-hidden />
            ) : spendTotal != null && spendTotal > 0 ? (
              formatReferralSpendCreditNegative(spendTotal)
            ) : (
              '—'
            );
            const deleteTargets = mergeAllDeleteTargetsForSenderRow(row);
            const canDelete = deleteTargets.length > 0;
            const isDeleting = deletingReferrerUid === row.referrerUid;
            const deleteBlocked = Boolean(deletingReferrerUid && deletingReferrerUid !== row.referrerUid);
            return (
              <tr key={row.referrerUid}>
                <td>{displayPersonNameOnly(ud, row.referrerUid)}</td>
                <td className="referral-people-table__contact">{formatUserContactLine(ud)}</td>
                <td>{formatCreditAmount(ud)}</td>
                <td>{count}</td>
                <td className="referral-spend-table__credit">{spendCell}</td>
                <td>
                  <div className="referral-people-table__actions">
                    <button
                      type="button"
                      className="referral-view-btn"
                      onClick={() => onView(row)}
                      disabled={isDeleting}
                    >
                      <ExternalLink size={14} aria-hidden />
                      View detail
                    </button>
                    <button
                      type="button"
                      className="referral-row-delete-btn"
                      title={
                        canDelete
                          ? 'Delete all referrals and referrals_used documents for this referrer (from loaded batch)'
                          : 'No referral docs in this batch — row may be spend-only on bookings'
                      }
                      aria-label="Delete referral documents for this user"
                      disabled={!canDelete || isDeleting || deleteBlocked}
                      onClick={() => onDeleteRow?.(row)}
                    >
                      {isDeleting ? (
                        <Loader2 size={14} className="spin" aria-hidden />
                      ) : (
                        <Trash2 size={14} aria-hidden />
                      )}
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
