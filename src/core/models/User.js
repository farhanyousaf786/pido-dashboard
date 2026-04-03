// User model - converted from Flutter user_model.dart
// Main user model with all fields from Firestore users collection

export function createUserModel(data = {}) {
  return {
    // Basic info
    uid: data.uid ?? null,
    phoneNumber: data.phoneNumber ?? null,
    provider: data.provider ?? [],
    email: data.email ?? null,
    fullName: data.fullName ?? null,
    displayName: data.displayName ?? null,
    userType: data.userType ?? null, // 'customer' or 'serviceProvider'
    
    // Location
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    currentAddress: data.currentAddress ?? null,
    
    // Verification flags
    verify: data.verify ?? false,
    isNumberVerified: data.isNumberVerified ?? false,
    isPassword: data.isPassword ?? false,
    isUserType: data.isUserType ?? false,
    isAddress: data.isAddress ?? false,
    areServicesChosen: data.areServicesChosen ?? false,
    userInformation: data.userInformation ?? false,
    
    // Profile completion
    businessProfileComplete: data.businessProfileComplete ?? false,
    isProfileComplete: data.isProfileComplete ?? false,
    
    // Account status
    accountStatus: data.accountStatus ?? null, // 'pending_approval', 'approved', 'rejected'
    rejectionReason: data.rejectionReason ?? null,
    approvedAt: data.approvedAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    
    // Online/availability status (Uber-style fields)
    isOnline: data.isOnline ?? false,
    lastSeen: data.lastSeen ?? null,
    activeBookingId: data.activeBookingId ?? null,

    // Push notifications
    fcmToken: data.fcmToken ?? null,
  };
}

// Parse from Firestore document
export function userFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  const id = doc.id ?? data?.uid ?? '';
  
  return createUserModel({
    uid: id,
    phoneNumber: data?.phoneNumber ?? null,
    provider: parseProvider(data?.provider),
    email: data?.email ?? null,
    fullName: data?.fullName ?? null,
    displayName: data?.displayName ?? null,
    userType: data?.userType ?? null,
    latitude: parseDouble(data?.latitude),
    longitude: parseDouble(data?.longitude),
    currentAddress: data?.currentAddress ?? null,
    verify: data?.verify ?? false,
    isNumberVerified: data?.isNumberVerified ?? false,
    isPassword: data?.isPassword ?? false,
    isUserType: data?.isUserType ?? false,
    isAddress: data?.isAddress ?? false,
    areServicesChosen: data?.areServicesChosen ?? false,
    userInformation: data?.userInformation ?? false,
    businessProfileComplete: data?.businessProfileComplete ?? false,
    isProfileComplete: data?.isProfileComplete ?? false,
    accountStatus: data?.accountStatus ?? null,
    rejectionReason: data?.rejectionReason ?? null,
    approvedAt: parseTimestamp(data?.approvedAt),
    createdAt: parseTimestamp(data?.createdAt),
    updatedAt: parseTimestamp(data?.updatedAt),
    isOnline: data?.isOnline ?? false,
    lastSeen: parseTimestamp(data?.lastSeen),
    activeBookingId: data?.activeBookingId ?? null,

    fcmToken: data?.fcmToken ?? null,
  });
}

// Convert to Firestore format
export function userToFirestore(user) {
  const result = {};
  
  if (user.uid) result.uid = user.uid;
  if (user.phoneNumber) result.phoneNumber = user.phoneNumber;
  if (user.provider?.length) result.provider = user.provider;
  if (user.email) result.email = user.email;
  if (user.userType) result.userType = user.userType;
  if (user.latitude != null) result.latitude = user.latitude;
  if (user.longitude != null) result.longitude = user.longitude;
  if (user.currentAddress) result.currentAddress = user.currentAddress;
  if (user.verify) result.verify = user.verify;
  if (user.isNumberVerified) result.isNumberVerified = user.isNumberVerified;
  if (user.isPassword) result.isPassword = user.isPassword;
  if (user.isUserType) result.isUserType = user.isUserType;
  if (user.isAddress) result.isAddress = user.isAddress;
  if (user.areServicesChosen) result.areServicesChosen = user.areServicesChosen;
  if (user.userInformation) result.userInformation = user.userInformation;
  if (user.businessProfileComplete) result.businessProfileComplete = user.businessProfileComplete;
  if (user.isProfileComplete) result.isProfileComplete = user.isProfileComplete;
  if (user.accountStatus) result.accountStatus = user.accountStatus;
  if (user.rejectionReason) result.rejectionReason = user.rejectionReason;
  if (user.approvedAt) result.approvedAt = user.approvedAt;
  if (user.createdAt) result.createdAt = user.createdAt;
  if (user.updatedAt) result.updatedAt = user.updatedAt;
  if (user.isOnline) result.isOnline = user.isOnline;
  if (user.lastSeen) result.lastSeen = user.lastSeen;
  if (user.activeBookingId) result.activeBookingId = user.activeBookingId;
  if (user.fcmToken) result.fcmToken = user.fcmToken;
  
  return result;
}

// Helper functions
function parseProvider(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
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
  if (value.toDate) return value; // Firestore Timestamp
  if (value instanceof Date) return value;
  return null;
}

// User helpers
export const UserHelpers = {
  isCustomer: (user) => user.userType === 'customer',
  isServiceProvider: (user) => user.userType === 'serviceProvider',
  isOnline: (user) => user.isOnline === true,
  isProfileComplete: (user) => user.isProfileComplete === true,
  isVerified: (user) => user.verify === true,
  isNumberVerified: (user) => user.isNumberVerified === true,
  isPendingApproval: (user) => user.accountStatus === 'pending_approval',
  isApproved: (user) => user.accountStatus === 'approved',
  isRejected: (user) => user.accountStatus === 'rejected',
  hasActiveBooking: (user) => user.activeBookingId != null,
  displayName: (user) => {
    const name = user.fullName || user.displayName || user.email || user.phoneNumber || 'Unknown';
    return name.length > 10 ? name.substring(0, 10) + '...' : name;
  },
};
