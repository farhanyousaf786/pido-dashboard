// Category model - converted from Flutter category_model.dart

export function createCategoryModel(data = {}) {
  return {
    id: data.id ?? '',
    name: data.name ?? '',
    services: data.services ?? [],
    imageUrl: data.imageUrl ?? null,
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt ?? new Date(),
    rating: data.rating ?? 0.0,
    totalJobs: data.totalJobs ?? 0,
  };
}

// Parse from Firestore document
export function categoryFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  const id = doc.id ?? data?.id ?? '';

  return createCategoryModel({
    id,
    name: data?.name ?? '',
    services: Array.isArray(data?.services) ? data.services : [],
    imageUrl: data?.imageUrl ?? null,
    createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt) ?? new Date(),
    updatedAt: data?.updatedAt?.toDate?.() ?? new Date(data?.updatedAt) ?? new Date(),
    rating: data?.rating?.toDouble?.() ?? parseFloat(data?.rating) ?? 0.0,
    totalJobs: data?.totalJobs?.toInt?.() ?? parseInt(data?.totalJobs) ?? 0,
  });
}

// Convert to Firestore format
export function categoryToFirestore(category) {
  return {
    name: category.name,
    services: category.services,
    ...(category.imageUrl && { imageUrl: category.imageUrl }),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    rating: category.rating,
    totalJobs: category.totalJobs,
  };
}

// Convert to JSON
export function categoryToJson(category) {
  return {
    id: category.id,
    name: category.name,
    services: category.services,
    imageUrl: category.imageUrl,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    rating: category.rating,
    totalJobs: category.totalJobs,
  };
}

// Helper methods
export const CategoryHelpers = {
  formattedRating: (category) => category.rating.toFixed(1),
  hasJobs: (category) => category.totalJobs > 0,
  isRated: (category) => category.rating > 0,
};
