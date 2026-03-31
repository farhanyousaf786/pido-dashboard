// FetchBusinessInfo model - converted from Flutter fetch_business_info__model.dart

export function createFetchBusinessInfoModel(data = {}) {
  return {
    id: data.id ?? '',
    name: data.name ?? '',
    rating: data.rating ?? 0.0,
    services: data.services ?? [],
    businessProfileComplete: data.businessProfileComplete ?? false,
    coverPhotoUrl: data.coverPhotoUrl ?? null,
    portfolioPictureUrls: data.portfolioPictureUrls ?? [],
    workingHours: data.workingHours ?? {},
    address: data.address ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    description: data.description ?? '',
  };
}

// Parse from JSON/Firestore
export function fetchBusinessInfoFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createFetchBusinessInfoModel({
    id: doc.id ?? data?.id ?? '',
    name: data?.name ?? '',
    rating: data?.rating?.toDouble?.() ?? parseFloat(data?.rating) ?? 0.0,
    services: data?.services ?? [],
    businessProfileComplete: data?.businessProfileComplete ?? false,
    coverPhotoUrl: data?.coverPhotoUrl ?? null,
    portfolioPictureUrls: data?.portfolioPictureUrls ?? [],
    workingHours: data?.workingHours ?? {},
    address: data?.address ?? null,
    phone: data?.phone ?? null,
    email: data?.email ?? null,
    description: data?.description ?? '',
  });
}

// Helper methods
export const FetchBusinessInfoHelpers = {
  isOpenNow: (info) => {
    if (!info.workingHours) return false;
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const hours = info.workingHours[day];
    if (!hours || !hours.open || !hours.close) return false;
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = hours.open.split(':').map(Number);
    const [closeHour, closeMin] = hours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    return currentTime >= openTime && currentTime <= closeTime;
  },
  todaysHours: (info) => {
    if (!info.workingHours) return null;
    const day = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
    return info.workingHours[day] ?? null;
  },
};
