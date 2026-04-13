// Booking model - converted from Flutter booking_model.dart
// Full model with all fields, defaults, and helper methods

export function createBookingModel(data = {}) {
  return {
    // Core booking info
    bookingId: data.bookingId ?? null,
    status: data.status ?? 'pending',
    paymentStatus: data.paymentStatus ?? 'pending',
    paymentMethod: data.paymentMethod ?? null,
    bookingDate: data.bookingDate ?? null,
    remainingDistance: data.remainingDistance ?? null,
    hasSeenBottomSheet: data.hasSeenBottomSheet ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,

    // Service Provider Info
    serviceProviderUid: data.serviceProviderUid ?? null,
    providerStatus: data.providerStatus ?? null,
    serviceProviderName: data.serviceProviderName ?? null,
    serviceProviderImage: data.serviceProviderImage ?? null,
    serviceProviderLatitude: data.serviceProviderLatitude ?? null,
    serviceProviderLongitude: data.serviceProviderLongitude ?? null,
    customerLatitude: data.customerLatitude ?? null,
    customerLongitude: data.customerLongitude ?? null,
    serviceProviderAddress: data.serviceProviderAddress ?? null,

    // Category Info
    categoryId: data.categoryId ?? null,
    categoryName: data.categoryName ?? null,
    categoryImage: data.categoryImage ?? null,

    // Customer Info
    customerUid: data.customerUid ?? null,
    customerName: data.customerName ?? null,
    customerEmail: data.customerEmail ?? null,
    customerPhone: data.customerPhone ?? null,
    customerImage: data.customerImage ?? null,

    // Booking Summary
    totalServices: data.totalServices ?? 0,
    totalAmount: data.totalAmount ?? 0.0,
    totalDuration: data.totalDuration ?? 0,
    currency: data.currency ?? 'USD',

    // Metadata
    serviceProviderRating: data.serviceProviderRating ?? 0.0,
    serviceProviderTotalJobs: data.serviceProviderTotalJobs ?? 0,
    distance: data.distance ?? 0.0,
    platform: data.platform ?? 'mobile',
    appVersion: data.appVersion ?? '1.0.0',

    // Workspace (customer workspace photos — fields live on booking doc)
    workspaceImageUrl: data.workspaceImageUrl ?? null,
    workspacePhotos: Array.isArray(data.workspacePhotos)
      ? data.workspacePhotos.filter(Boolean)
      : data.workspacePhotos
        ? [data.workspacePhotos].flat()
        : [],
    workspaceVerified: data.workspaceVerified ?? false,
    workspaceVerifiedAt: data.workspaceVerifiedAt ?? null,
    workspaceVerifiedBy: data.workspaceVerifiedBy ?? null,
    workspaceProviderNotes: data.workspaceProviderNotes ?? null,
    workspaceAdminNotes: data.workspaceAdminNotes ?? null,
    workspaceRejectionReason: data.workspaceRejectionReason ?? null,
    workspaceRejectedAt: data.workspaceRejectedAt ?? null,
    workspaceRejectedBy: data.workspaceRejectedBy ?? null,

    // GPS / location check (same doc; not workspace photo approval)
    locationVerified: data.locationVerified ?? null,
    verifiedDistance: data.verifiedDistance ?? null,
    verifiedLatitude: data.verifiedLatitude ?? null,
    verifiedLongitude: data.verifiedLongitude ?? null,
    verifiedAt: data.verifiedAt ?? null,
    verificationMethod: data.verificationMethod ?? null,

    // Services
    selectedServices: data.selectedServices ?? [],

    // Review & Cancellation
    review: data.review ?? null,
    cancelledBy: data.cancelledBy ?? null,
    cancellationReason: data.cancellationReason ?? null,

    // Estimated Arrival
    estimatedArrivalTime: data.estimatedArrivalTime ?? null,

    // Phone numbers and FCM tokens
    customerPhoneNumber: data.customerPhoneNumber ?? null,
    customerFcmToken: data.customerFcmToken ?? null,
    serviceProviderPhoneNumber: data.serviceProviderPhoneNumber ?? null,
    serviceProviderFcmToken: data.serviceProviderFcmToken ?? null,

    // Commission fields
    commissionAmount: data.commissionAmount ?? 0.0,
    commissionType: data.commissionType ?? null,
    payoutToProfessional: data.payoutToProfessional ?? 0.0,
    commissionPercentage: data.commissionPercentage ?? 0.0,
    flatCommission: data.flatCommission ?? 0.0,

    // Payment fields
    paymentIntentId: data.paymentIntentId ?? null,
    paidAmount: data.paidAmount ?? null,
    isRefunded: data.isRefunded ?? false,
    refundAmount: data.refundAmount ?? 0.0,
    refundId: data.refundId ?? null,
    refundStatus: data.refundStatus ?? null,
    refundReason: data.refundReason ?? null,
    isPaidOut: data.isPaidOut ?? false,

    cancelledAt: data.cancelledAt ?? null,
    cancellationNotes: data.cancellationNotes ?? null,
  };
}

// Parse from Firestore document
export function bookingFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  const id = doc.id ?? data?.bookingId ?? '';

  return createBookingModel({
    bookingId: id,
    status: data?.status ?? 'pending',
    paymentStatus: data?.paymentStatus ?? 'pending',
    paymentMethod: data?.paymentMethod ?? null,
    bookingDate: parseTimestamp(data?.bookingDate),
    remainingDistance: parseDouble(data?.remainingDistance),
    hasSeenBottomSheet: data?.hasSeenBottomSheet ?? null,
    createdAt: parseTimestamp(data?.createdAt),
    updatedAt: parseTimestamp(data?.updatedAt),

    // Service Provider
    serviceProviderUid: data?.serviceProviderUid ?? null,
    providerStatus: data?.providerStatus ?? null,
    serviceProviderName: data?.serviceProviderName ?? null,
    serviceProviderImage: data?.serviceProviderImage ?? null,
    serviceProviderLatitude: parseDouble(data?.serviceProviderLatitude),
    serviceProviderLongitude: parseDouble(data?.serviceProviderLongitude),
    customerLatitude: parseDouble(data?.customerLatitude),
    customerLongitude: parseDouble(data?.customerLongitude),
    serviceProviderAddress: data?.serviceProviderAddress ?? null,

    // Category
    categoryId: data?.categoryId ?? null,
    categoryName: data?.categoryName ?? null,
    categoryImage: data?.categoryImage ?? null,

    // Customer
    customerUid: data?.customerUid ?? null,
    customerName: data?.customerName ?? null,
    customerEmail: data?.customerEmail ?? null,
    customerPhone: data?.customerPhone ?? null,
    customerImage: data?.customerImage ?? null,

    // Booking Summary
    totalServices: parseInt(data?.totalServices) ?? 0,
    totalAmount: parseDouble(data?.totalAmount) ?? 0.0,
    totalDuration: parseInt(data?.totalDuration) ?? 0,
    currency: data?.currency ?? 'USD',

    // Metadata
    serviceProviderRating: parseDouble(data?.serviceProviderRating) ?? 0.0,
    serviceProviderTotalJobs: parseInt(data?.serviceProviderTotalJobs) ?? 0,
    distance: parseDouble(data?.distance) ?? 0.0,
    platform: data?.platform ?? 'mobile',
    appVersion: data?.appVersion ?? '1.0.0',

    // Workspace
    workspaceImageUrl: data?.workspaceImageUrl ?? null,
    workspacePhotos: Array.isArray(data?.workspacePhotos)
      ? data.workspacePhotos.filter(Boolean)
      : data?.workspacePhotos
        ? [data.workspacePhotos].flat()
        : [],
    workspaceVerified: data?.workspaceVerified ?? false,
    workspaceVerifiedAt: parseTimestamp(data?.workspaceVerifiedAt),
    workspaceVerifiedBy: data?.workspaceVerifiedBy ?? null,
    workspaceProviderNotes: data?.workspaceProviderNotes ?? null,
    workspaceAdminNotes: data?.workspaceAdminNotes ?? null,
    workspaceRejectionReason: data?.workspaceRejectionReason ?? null,
    workspaceRejectedAt: parseTimestamp(data?.workspaceRejectedAt),
    workspaceRejectedBy: data?.workspaceRejectedBy ?? null,

    locationVerified: data?.locationVerified ?? null,
    verifiedDistance: parseDouble(data?.verifiedDistance),
    verifiedLatitude: parseDouble(data?.verifiedLatitude),
    verifiedLongitude: parseDouble(data?.verifiedLongitude),
    verifiedAt: parseTimestamp(data?.verifiedAt),
    verificationMethod: data?.verificationMethod ?? null,

    // Services
    selectedServices: data?.selectedServices ?? [],

    // Review & Cancellation
    review: data?.review ?? null,
    cancelledBy: data?.cancelledBy ?? null,
    cancellationReason: data?.cancellationReason ?? null,

    // Estimated Arrival
    estimatedArrivalTime: parseTimestamp(data?.estimatedArrivalTime),

    // Phone numbers and FCM
    customerPhoneNumber: data?.customerPhoneNumber ?? null,
    customerFcmToken: data?.customerFcmToken ?? null,
    serviceProviderPhoneNumber: data?.serviceProviderPhoneNumber ?? null,
    serviceProviderFcmToken: data?.serviceProviderFcmToken ?? null,

    // Commission
    commissionAmount: parseDouble(data?.commissionAmount) ?? 0.0,
    commissionType: data?.commissionType ?? null,
    payoutToProfessional: parseDouble(data?.payoutToProfessional) ?? 0.0,
    commissionPercentage: parseDouble(data?.commissionPercentage) ?? 0.0,
    flatCommission: parseDouble(data?.flatCommission) ?? 0.0,

    // Payment
    paymentIntentId: data?.paymentIntentId ?? null,
    paidAmount: parseDouble(data?.paidAmount),
    isRefunded: data?.isRefunded ?? false,
    refundAmount: parseDouble(data?.refundAmount) ?? 0.0,
    refundId: data?.refundId ?? null,
    refundStatus: data?.refundStatus ?? null,
    refundReason: data?.refundReason ?? null,
    isPaidOut: data?.isPaidOut ?? false,

    cancelledAt: parseTimestamp(data?.cancelledAt),
    cancellationNotes: data?.cancellationNotes ?? null,
  });
}

// Helper functions
function parseDouble(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseInt(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
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

// Helper methods
export const BookingHelpers = {
  isPending: (booking) => booking.status === 'pending',
  isAccepted: (booking) => booking.status === 'accepted',
  isCompleted: (booking) => booking.status === 'completed',
  isCancelled: (booking) => booking.status === 'cancelled',
  isDeclined: (booking) => booking.status === 'declined',

  isPaymentPending: (booking) => booking.paymentStatus === 'pending',
  isPaymentCompleted: (booking) => booking.paymentStatus === 'completed',
  isPaymentFailed: (booking) => booking.paymentStatus === 'failed',

  hasReview: (booking) => booking.review != null,
  isEmptyReview: (booking) => booking.review == null,

  hasEstimatedArrivalTime: (booking) => booking.estimatedArrivalTime != null,

  isCancelledByCustomer: (booking) => booking.cancelledBy === 'customer',
  isCancelledByProvider: (booking) => booking.cancelledBy === 'serviceProvider',
  hasCancellationReason: (booking) =>
    booking.cancellationReason != null && booking.cancellationReason !== '',

  getId: (booking) => booking.bookingId,

  // Revenue helpers
  isRevenueValid: (booking) => {
    return booking.status === 'completed' && booking.paymentStatus === 'completed' && booking.totalAmount > 0;
  },

  // Overall revenue (total booking amount)
  getOverallRevenue: (booking) => {
    return BookingHelpers.isRevenueValid(booking) ? booking.totalAmount : 0;
  },

  // App revenue (commission) - 15% or $5 whichever is greater
  getAppRevenue: (booking) => {
    if (!BookingHelpers.isRevenueValid(booking)) return 0;
    
    // If commissionAmount is stored, use it
    if (booking.commissionAmount != null && booking.commissionAmount > 0) {
      return booking.commissionAmount;
    }
    
    // Calculate: 15% or $5, whichever is greater
    const percentageCommission = booking.totalAmount * 0.15;
    const flatCommission = 5.0;
    return percentageCommission > flatCommission ? percentageCommission : flatCommission;
  },

  // Provider payout (total - commission)
  getProviderPayout: (booking) => {
    if (!BookingHelpers.isRevenueValid(booking)) return 0;
    return booking.totalAmount - BookingHelpers.getAppRevenue(booking);
  },

  // Get commission breakdown
  getCommissionBreakdown: (booking) => {
    if (!BookingHelpers.isRevenueValid(booking)) {
      return {
        totalAmount: 0,
        appRevenue: 0,
        providerPayout: 0,
        commissionType: 'none',
      };
    }
    
    const totalAmount = booking.totalAmount;
    const appRevenue = BookingHelpers.getAppRevenue(booking);
    const percentageCommission = totalAmount * 0.15;
    const flatCommission = 5.0;
    const commissionType = percentageCommission > flatCommission ? 'percentage' : 'flat';
    
    return {
      totalAmount,
      appRevenue,
      providerPayout: totalAmount - appRevenue,
      commissionType,
      percentageRate: 0.15,
      flatRate: 5.0,
      commissionPercentage: percentageCommission,
      flatCommission,
    };
  },

  /** Deduped workspace image URLs (`workspaceImageUrl` + `workspacePhotos`). */
  getWorkspacePhotoUrls: (booking) => {
    const urls = [];
    const push = (u) => {
      const s = u == null ? '' : String(u).trim();
      if (s && !urls.includes(s)) urls.push(s);
    };
    push(booking?.workspaceImageUrl);
    if (Array.isArray(booking?.workspacePhotos)) {
      for (const u of booking.workspacePhotos) push(u);
    }
    return urls;
  },

  /**
   * none — no photos
   * pending — photos exist, not approved and no rejection reason
   * approved — workspaceVerified === true
   * rejected — workspaceVerified === false and non-empty workspaceRejectionReason
   */
  getWorkspaceVerificationState: (booking) => {
    const photoUrls = BookingHelpers.getWorkspacePhotoUrls(booking);
    if (photoUrls.length === 0) return 'none';
    if (booking.workspaceVerified === true) return 'approved';
    const reason = (booking.workspaceRejectionReason || '').trim();
    if (booking.workspaceVerified === false && reason) return 'rejected';
    return 'pending';
  },
};

// Safe parsing helpers (mirroring Dart _parse methods)
export const BookingParsers = {
  parseString: (value, defaultValue = null) => {
    if (value == null) return defaultValue;
    if (typeof value === 'string') return value || defaultValue;
    return String(value) || defaultValue;
  },

  parseInt: (value) => {
    if (value == null) return null;
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  },

  parseDouble: (value) => {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  },

  parseBool: (value) => {
    if (value == null) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    if (typeof value === 'number') return value === 1;
    return null;
  },

  parseTimestamp: (timestamp) => {
    if (timestamp == null) return null;
    if (timestamp.toDate) return timestamp; // Firestore Timestamp
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') {
      try {
        return new Date(timestamp);
      } catch {
        return null;
      }
    }
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    return null;
  },
};
