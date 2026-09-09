/**
 * ESM mirror of functions/utils/userContact.js
 */

export function isValidEmail(email) {
  const e = String(email || '').trim();
  if (!e || !e.includes('@')) return false;
  const [local, domain] = e.split('@');
  return Boolean(local && domain && domain.includes('.'));
}

function phoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function isGeneratedPhoneEmail(email, phone) {
  const e = String(email || '').trim().toLowerCase();
  const digits = phoneDigits(phone);
  if (!digits || !e) return false;
  return e === `${digits}@gmail.com`;
}

function parseProviders(userData) {
  const raw = userData?.provider;
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => String(p || '').trim()).filter(Boolean);
}

function normalizeProviderId(id) {
  const p = String(id || '').trim().toLowerCase();
  if (p === 'google' || p === 'google.com') return 'google';
  if (p === 'apple' || p === 'apple.com') return 'apple';
  if (p === 'phonenumber' || p === 'phone' || p === 'phone_number') return 'phone';
  return p;
}

export function hasSocialProvider(userData) {
  const providers = parseProviders(userData).map(normalizeProviderId);
  return providers.some((id) => id === 'google' || id === 'apple');
}

export function hasPhoneProvider(userData, profileData = {}) {
  const providers = parseProviders(userData).map(normalizeProviderId);
  if (providers.includes('phone')) return true;
  const phone = resolveUserPhone(userData, profileData);
  const email = String(userData?.email || profileData?.email || '').trim();
  return isGeneratedPhoneEmail(email, phone);
}

export function isEmailEligible(userData, email, phone) {
  if (!isValidEmail(email)) return false;
  if (isGeneratedPhoneEmail(email, phone)) return false;
  return true;
}

export function isSmsEligible(userData, phone) {
  const digits = phoneDigits(phone || userData?.phoneNumber);
  if (digits.length < 10) return false;
  return userData?.isNumberVerified === true;
}

export async function resolveProfileData(admin, uid) {
  try {
    const snap = await admin
      .firestore()
      .collection('users')
      .doc(uid)
      .collection('profile')
      .doc('userinfo')
      .get();
    return snap.exists ? snap.data() || {} : {};
  } catch {
    return {};
  }
}

export async function resolveUserEmail(admin, uid, userData, profileData) {
  const profile = profileData || {};
  const direct = String(userData?.email || profile?.email || '').trim();
  if (isValidEmail(direct)) return direct.toLowerCase();

  try {
    const authUser = await admin.auth().getUser(uid);
    const authEmail = String(authUser.email || '').trim();
    if (isValidEmail(authEmail)) return authEmail.toLowerCase();
  } catch {
    // ignore
  }

  return '';
}

export function resolveUserPhone(userData, profileData) {
  const profile = profileData || {};
  return String(
    userData?.phoneNumber || profile?.phoneNumber || profile?.phone || ''
  ).trim();
}

export function resolveUserName(userData, profileData) {
  const profile = profileData || {};
  const fn = String(profile?.firstName || userData?.firstName || '').trim();
  const ln = String(profile?.lastName || userData?.lastName || '').trim();
  const composed = fn && ln ? `${fn} ${ln}` : fn || ln;
  return (
    String(userData?.fullName || userData?.displayName || profile?.fullName || composed || '')
      .trim() || 'there'
  );
}

export function normalizeUserType(value) {
  const t = String(value || '').trim().toLowerCase();
  if (t === 'customer') return 'customer';
  if (t === 'serviceprovider' || t === 'service_provider' || t === 'provider') {
    return 'serviceProvider';
  }
  return '';
}

function matchesSearchQuery(userData, profileData, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const profile = profileData || {};
  const name = resolveUserName(userData, profile).toLowerCase();
  const email = String(userData?.email || profile?.email || '').toLowerCase();
  const phone = String(userData?.phoneNumber || profile?.phoneNumber || '');
  const uid = String(userData?.uid || '').toLowerCase();
  return name.includes(q) || email.includes(q) || phone.includes(q) || uid.includes(q);
}

export function matchesUserFilters(userData, filters, profileData = {}) {
  const f = filters || {};

  if (f.userType) {
    const want = normalizeUserType(f.userType);
    const got = normalizeUserType(userData?.userType);
    if (want && got !== want) return false;
  }

  if (f.accountStatus) {
    const status = String(userData?.accountStatus || '').trim();
    if (f.accountStatus === 'unverified') {
      if (status === 'approved' || status === 'pending_approval' || status === 'rejected') {
        return false;
      }
    } else if (status !== f.accountStatus) {
      return false;
    }
  }

  if (f.isOnline === true && userData?.isOnline !== true) return false;
  if (f.isOnline === false && userData?.isOnline === true) return false;
  if (f.signupComplete === true && userData?.userInformation !== true) return false;
  if (f.profileComplete === true && userData?.isProfileComplete !== true) return false;

  if (f.isTestUser === true && userData?.isTestUser !== true) return false;
  if (f.isTestUser === false && userData?.isTestUser === true) return false;
  if (f.excludeTestUsers === true && userData?.isTestUser === true) return false;

  if (f.signupMethod === 'social' && !hasSocialProvider(userData)) return false;
  if (f.signupMethod === 'phone' && !hasPhoneProvider(userData, profileData)) return false;

  if (!matchesSearchQuery(userData, profileData, f.searchQuery)) return false;

  return true;
}

export function normalizeAudienceInput(input) {
  const filters = input?.filters && typeof input.filters === 'object' ? input.filters : {};
  const includeUserIds = Array.isArray(input?.includeUserIds)
    ? [...new Set(input.includeUserIds.map((id) => String(id || '').trim()).filter(Boolean))]
    : [];
  const excludeUserIds = Array.isArray(input?.excludeUserIds)
    ? [...new Set(input.excludeUserIds.map((id) => String(id || '').trim()).filter(Boolean))]
    : [];
  const extraEmails = Array.isArray(input?.extraEmails)
    ? [
        ...new Set(
          input.extraEmails
            .map((e) => String(e || '').trim().toLowerCase())
            .filter((e) => isValidEmail(e))
        ),
      ]
    : [];

  const mode = String(input?.audienceMode || 'filters').trim();
  const audienceMode = mode === 'only_selected' ? 'only_selected' : 'filters';

  return {
    audienceMode,
    filters: {
      userType: filters.userType || '',
      accountStatus: filters.accountStatus || '',
      signupMethod: filters.signupMethod || '',
      searchQuery: filters.searchQuery || '',
      ...(filters.isOnline === true || filters.isOnline === false
        ? { isOnline: filters.isOnline }
        : {}),
      ...(filters.signupComplete === true ? { signupComplete: true } : {}),
      ...(filters.profileComplete === true ? { profileComplete: true } : {}),
      ...(filters.isTestUser === true || filters.isTestUser === false
        ? { isTestUser: filters.isTestUser }
        : {}),
      excludeTestUsers: filters.excludeTestUsers !== false,
    },
    includeUserIds,
    excludeUserIds,
    extraEmails,
  };
}

async function buildRecipientForUser(admin, uid, userData, channel, profileData) {
  let profile = profileData;
  if (!profile) {
    const rootEmail = String(userData?.email || '').trim();
    const rootPhone = String(userData?.phoneNumber || '').trim();
    const needsProfile =
      !rootEmail || isGeneratedPhoneEmail(rootEmail, rootPhone) || channel === 'sms';
    if (needsProfile) {
      profile = await resolveProfileData(admin, uid);
    } else {
      profile = {};
    }
  }

  const phone = resolveUserPhone(userData, profile);
  const name = resolveUserName(userData, profile);

  if (channel === 'email') {
    const email = await resolveUserEmail(admin, uid, userData, profile);
    if (!isEmailEligible(userData, email, phone)) return null;
    return { uid, email, phone, name, userType: userData.userType || null };
  }

  if (channel === 'sms') {
    if (!isSmsEligible(userData, phone)) return null;
    const email = await resolveUserEmail(admin, uid, userData, profile);
    return { uid, phone, email, name, userType: userData.userType || null };
  }

  return null;
}

export async function collectAudienceRecipients(admin, audienceInput, channel = 'email') {
  const audience = normalizeAudienceInput(audienceInput);
  const { filters, includeUserIds, excludeUserIds, audienceMode, extraEmails } = audience;
  const excludeSet = new Set(excludeUserIds);
  const includeSet = new Set(includeUserIds);

  const recipients = [];
  const seenKeys = new Set();

  const addRecipient = (recipient) => {
    if (!recipient) return;
    const key = channel === 'email' ? recipient.email : recipient.phone;
    if (!key || seenKeys.has(key)) return;
    seenKeys.add(key);
    recipients.push(recipient);
  };

  const addExtraEmails = () => {
    if (channel !== 'email') return;
    for (const email of extraEmails) {
      addRecipient({
        uid: null,
        email,
        phone: '',
        name: email.split('@')[0] || 'there',
        userType: null,
        manual: true,
      });
    }
  };

  if (audienceMode === 'only_selected') {
    for (const uid of includeSet) {
      if (excludeSet.has(uid)) continue;
      const doc = await admin.firestore().collection('users').doc(uid).get();
      if (!doc.exists) continue;
      const recipient = await buildRecipientForUser(admin, uid, doc.data() || {}, channel);
      addRecipient(recipient);
    }
    addExtraEmails();
    return recipients;
  }

  const snap = await admin.firestore().collection('users').get();

  for (const doc of snap.docs) {
    const uid = doc.id;
    if (excludeSet.has(uid)) continue;

    const userData = doc.data() || {};
    const forceInclude = includeSet.has(uid);

    let profileData = {};
    const rootEmail = String(userData?.email || '').trim();
    const rootPhone = String(userData?.phoneNumber || '').trim();
    const needsProfile =
      !rootEmail ||
      isGeneratedPhoneEmail(rootEmail, rootPhone) ||
      channel === 'sms' ||
      filters.searchQuery;

    if (needsProfile) {
      profileData = await resolveProfileData(admin, uid);
    }

    if (!forceInclude && !matchesUserFilters(userData, filters, profileData)) continue;

    const recipient = await buildRecipientForUser(
      admin,
      uid,
      userData,
      channel,
      profileData
    );
    addRecipient(recipient);
  }

  for (const uid of includeSet) {
    if (excludeSet.has(uid)) continue;
    if (recipients.some((r) => r.uid === uid)) continue;
    const doc = await admin.firestore().collection('users').doc(uid).get();
    if (!doc.exists) continue;
    const recipient = await buildRecipientForUser(admin, uid, doc.data() || {}, channel);
    addRecipient(recipient);
  }

  addExtraEmails();
  return recipients;
}
