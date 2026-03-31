// CosmetologistProfile model - converted from Flutter cosmetologist_profile_model.dart

export function createCosmetologistProfileModel(data = {}) {
  return {
    uid: data.uid ?? '',
    name: data.name ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    imageUrl: data.imageUrl ?? null,
    bio: data.bio ?? '',
    specializations: data.specializations ?? [],
    experience: data.experience ?? 0,
    rating: data.rating ?? 0.0,
    totalJobs: data.totalJobs ?? 0,
    isAvailable: data.isAvailable ?? true,
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt ?? new Date(),
  };
}

// Parse from Firestore
export function cosmetologistProfileFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createCosmetologistProfileModel({
    uid: doc.id ?? data?.uid ?? '',
    name: data?.name ?? '',
    email: data?.email ?? '',
    phone: data?.phone ?? '',
    imageUrl: data?.imageUrl ?? null,
    bio: data?.bio ?? '',
    specializations: data?.specializations ?? [],
    experience: data?.experience ?? 0,
    rating: data?.rating?.toDouble?.() ?? parseFloat(data?.rating) ?? 0.0,
    totalJobs: data?.totalJobs?.toInt?.() ?? parseInt(data?.totalJobs) ?? 0,
    isAvailable: data?.isAvailable ?? true,
    createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt) ?? new Date(),
    updatedAt: data?.updatedAt?.toDate?.() ?? new Date(data?.updatedAt) ?? new Date(),
  });
}
