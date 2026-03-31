// ServiceCategory model - converted from Flutter service_category_model.dart

export function createServiceCategoryModel(data = {}) {
  return {
    id: data.id ?? '',
    name: data.name ?? '',
    description: data.description ?? '',
    image: data.image ?? null,
    icon: data.icon ?? null,
    services: data.services ?? [],
    isActive: data.isActive ?? true,
    order: data.order ?? 0,
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt ?? new Date(),
  };
}

// Parse from Firestore
export function serviceCategoryFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createServiceCategoryModel({
    id: doc.id ?? data?.id ?? '',
    name: data?.name ?? '',
    description: data?.description ?? '',
    image: data?.image ?? null,
    icon: data?.icon ?? null,
    services: data?.services ?? [],
    isActive: data?.isActive ?? true,
    order: data?.order ?? 0,
    createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt) ?? new Date(),
    updatedAt: data?.updatedAt?.toDate?.() ?? new Date(data?.updatedAt) ?? new Date(),
  });
}

// Convert to Firestore
export function serviceCategoryToFirestore(category) {
  return {
    name: category.name,
    description: category.description,
    ...(category.image && { image: category.image }),
    ...(category.icon && { icon: category.icon }),
    services: category.services,
    isActive: category.isActive,
    order: category.order,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}
