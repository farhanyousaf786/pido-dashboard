// ServiceProvider model - converted from Flutter service_provider.dart

export function createServiceProviderModel(data = {}) {
  return {
    uid: data.uid ?? '',
    userInfo: data.userInfo ?? null,
    businessInfo: data.businessInfo ?? null,
    distance: data.distance ?? 0.0,
  };
}

// Parse from JSON
export function serviceProviderFromJson(json) {
  return createServiceProviderModel({
    uid: json?.uid ?? '',
    userInfo: json?.userInfo ?? null,
    businessInfo: json?.businessInfo ?? null,
    distance: parseFloat(json?.distance) ?? 0.0,
  });
}

// Convert to JSON
export function serviceProviderToJson(provider) {
  return {
    uid: provider.uid,
    userInfo: provider.userInfo,
    businessInfo: provider.businessInfo,
    distance: provider.distance,
  };
}

// Helper methods
export const ServiceProviderHelpers = {
  businessName: (provider) => provider.businessInfo?.name ?? '',
  rating: (provider) => provider.businessInfo?.rating ?? 0.0,
  services: (provider) => provider.businessInfo?.services ?? [],
  isBusinessProfileComplete: (provider) =>
    provider.businessInfo?.businessProfileComplete ?? false,
  coverPhotoUrl: (provider) => provider.businessInfo?.coverPhotoUrl ?? null,
  portfolioPictureUrls: (provider) =>
    provider.businessInfo?.portfolioPictureUrls ?? [],
  workingHours: (provider) => provider.businessInfo?.workingHours ?? {},
  isOpenNow: (provider) => provider.businessInfo?.isOpenNow ?? false,
  todaysHours: (provider) => provider.businessInfo?.todaysHours ?? null,
};
