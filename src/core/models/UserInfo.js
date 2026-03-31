// UserInfo model - converted from Flutter user_info_model.dart
// Extended user profile information

export function createUserInfoModel(data = {}) {
  return {
    aboutMe: data.aboutMe ?? null,
    addresses: data.addresses ?? [],
    createdAt: data.createdAt ?? null,
    currentAddress: data.currentAddress ?? null,
    dateOfBirth: data.dateOfBirth ?? null,
    uid: data.uid ?? null,
    fcmToken: data.fcmToken ?? null,
    phoneNumber: data.phoneNumber ?? null,
    fullName: data.fullName ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    isOnline: data.isOnline ?? false,
    profileImageUrl: data.profileImageUrl ?? null,
    updatedAt: data.updatedAt ?? null,
    email: data.email ?? null,
    profession: data.profession ?? null,
    specialty: data.specialty ?? null,
    gender: data.gender ?? null,
  };
}

// Parse from Firestore document
export function userInfoFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  
  return createUserInfoModel({
    aboutMe: data?.aboutMe ?? null,
    addresses: parseAddresses(data?.addresses),
    createdAt: parseTimestamp(data?.createdAt),
    currentAddress: data?.currentAddress ?? null,
    dateOfBirth: data?.dateOfBirth ?? null,
    uid: doc.id ?? data?.uid ?? null,
    fcmToken: data?.fcmToken ?? null,
    phoneNumber: data?.phoneNumber ?? null,
    fullName: data?.fullName ?? null,
    latitude: parseDouble(data?.latitude),
    longitude: parseDouble(data?.longitude),
    isOnline: data?.isOnline ?? false,
    profileImageUrl: data?.profileImageUrl ?? null,
    updatedAt: parseTimestamp(data?.updatedAt),
    email: data?.email ?? null,
    profession: data?.profession ?? null,
    specialty: data?.specialty ?? null,
    gender: data?.gender ?? null,
  });
}

// Convert to Firestore format
export function userInfoToFirestore(userInfo) {
  const result = {};
  
  if (userInfo.aboutMe) result.aboutMe = userInfo.aboutMe;
  if (userInfo.addresses?.length) result.addresses = userInfo.addresses.map(a => addressToJson(a));
  if (userInfo.createdAt) result.createdAt = userInfo.createdAt;
  if (userInfo.currentAddress) result.currentAddress = userInfo.currentAddress;
  if (userInfo.dateOfBirth) result.dateOfBirth = userInfo.dateOfBirth;
  if (userInfo.uid) result.uid = userInfo.uid;
  if (userInfo.fcmToken) result.fcmToken = userInfo.fcmToken;
  if (userInfo.phoneNumber) result.phoneNumber = userInfo.phoneNumber;
  if (userInfo.fullName) result.fullName = userInfo.fullName;
  if (userInfo.latitude != null) result.latitude = userInfo.latitude;
  if (userInfo.longitude != null) result.longitude = userInfo.longitude;
  if (userInfo.isOnline) result.isOnline = userInfo.isOnline;
  if (userInfo.profileImageUrl) result.profileImageUrl = userInfo.profileImageUrl;
  if (userInfo.updatedAt) result.updatedAt = userInfo.updatedAt;
  if (userInfo.email) result.email = userInfo.email;
  if (userInfo.profession) result.profession = userInfo.profession;
  if (userInfo.specialty) result.specialty = userInfo.specialty;
  if (userInfo.gender) result.gender = userInfo.gender;
  
  return result;
}

// Address sub-model
export function createUserAddress(data = {}) {
  return {
    createdAt: data.createdAt ?? null,
    isCurrent: data.isCurrent ?? false,
    latitude: data.latitude ?? null,
    location: data.location ?? null,
    longitude: data.longitude ?? null,
  };
}

export function addressFromJson(json) {
  return createUserAddress({
    createdAt: parseTimestamp(json?.createdAt),
    isCurrent: json?.isCurrent ?? false,
    latitude: parseDouble(json?.latitude),
    location: json?.location ?? null,
    longitude: parseDouble(json?.longitude),
  });
}

export function addressToJson(address) {
  const result = {};
  if (address.createdAt) result.createdAt = address.createdAt;
  if (address.isCurrent) result.isCurrent = address.isCurrent;
  if (address.latitude != null) result.latitude = address.latitude;
  if (address.location) result.location = address.location;
  if (address.longitude != null) result.longitude = address.longitude;
  return result;
}

// Helper functions
function parseAddresses(value) {
  if (!value || !Array.isArray(value)) return [];
  return value.map(a => addressFromJson(a));
}

function parseDouble(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseTimestamp(value) {
  if (!value) return null;
  if (value.toDate) return value;
  if (value instanceof Date) return value;
  return null;
}

// UserInfo helpers
export const UserInfoHelpers = {
  hasAboutMe: (userInfo) => userInfo.aboutMe != null && userInfo.aboutMe !== '',
  hasAddress: (userInfo) => userInfo.addresses != null && userInfo.addresses.length > 0,
  hasFullName: (userInfo) => userInfo.fullName != null && userInfo.fullName !== '',
  hasDateOfBirth: (userInfo) => userInfo.dateOfBirth != null && userInfo.dateOfBirth !== '',
  hasProfileImage: (userInfo) => userInfo.profileImageUrl != null && userInfo.profileImageUrl !== '',
  hasLocation: (userInfo) => userInfo.latitude != null && userInfo.longitude != null,
  hasCurrentAddress: (userInfo) => userInfo.currentAddress != null && userInfo.currentAddress !== '',
  isBasicProfileComplete: (userInfo) => {
    return UserInfoHelpers.hasFullName(userInfo) && 
           UserInfoHelpers.hasAboutMe(userInfo) && 
           UserInfoHelpers.hasProfileImage(userInfo);
  },
  isLocationInfoComplete: (userInfo) => {
    return UserInfoHelpers.hasCurrentAddress(userInfo) && 
           UserInfoHelpers.hasLocation(userInfo) && 
           UserInfoHelpers.hasAddress(userInfo);
  },
  currentLocationAddress: (userInfo) => {
    if (!userInfo.addresses || userInfo.addresses.length === 0) return null;
    const current = userInfo.addresses.find(a => a.isCurrent);
    return current || userInfo.addresses[0];
  },
  displayName: (userInfo) => userInfo.fullName || userInfo.email || userInfo.phoneNumber || 'Unknown',
  hasData: (userInfo) => {
    return userInfo.aboutMe != null ||
           (userInfo.addresses != null && userInfo.addresses.length > 0) ||
           userInfo.createdAt != null ||
           userInfo.currentAddress != null ||
           userInfo.dateOfBirth != null ||
           userInfo.uid != null ||
           userInfo.phoneNumber != null ||
           userInfo.fcmToken != null ||
           userInfo.fullName != null ||
           userInfo.latitude != null ||
           userInfo.longitude != null ||
           userInfo.isOnline != null ||
           userInfo.profileImageUrl != null ||
           userInfo.updatedAt != null;
  },
};
