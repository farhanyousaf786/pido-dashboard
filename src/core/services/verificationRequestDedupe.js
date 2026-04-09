/**
 * Deduplicate verification queue rows — must stay in sync with Verifications.jsx.
 * For each serviceProvider identity (uid / phone / email), keep the latest submission only.
 */

function normalizePhone(value) {
  const digits = (value || '').toString().replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

function normalizeEmail(value) {
  return (value || '').toString().trim().toLowerCase();
}

function getTs(t) {
  if (!t) return 0;
  try {
    if (typeof t.toDate === 'function') return t.toDate().getTime();
  } catch {
    /* ignore */
  }
  if (t instanceof Date) return t.getTime();
  if (typeof t === 'number') return t;
  return 0;
}

function getIdentityKey(req) {
  const uid = (req?.userId || req?.uid || req?.userUid || req?.providerUid || '').toString().trim();
  if (uid) return `uid:${uid}`;
  const phone = normalizePhone(req?.phoneNumber);
  if (phone) return `phone:${phone}`;
  const email = normalizeEmail(req?.email);
  if (email) return `email:${email}`;
  return `id:${req?.id || ''}`;
}

/**
 * @param {Array<Record<string, unknown>>} requests Raw verification_requests rows with `id` and `userType`.
 * @returns {Array<Record<string, unknown>>} Deduped list (provider identities merged; non-providers kept).
 */
export function dedupeVerificationRequests(requests) {
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
}
