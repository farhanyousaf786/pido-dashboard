// Service model - converted from Flutter service_model.dart

export function createServiceModel(data = {}) {
  return {
    title: data.title ?? '',
    image: data.image ?? '',
    isExpanded: data.isExpanded ?? false,
    services: data.services ?? [],
  };
}

// Parse from JSON/Firestore
export function serviceFromJson(json) {
  return createServiceModel({
    title: json?.title ?? '',
    image: json?.image ?? '',
    isExpanded: json?.isExpanded ?? false,
    services: Array.isArray(json?.services) ? json.services : [],
  });
}

// Convert to JSON/Firestore
export function serviceToJson(service) {
  return {
    title: service.title,
    image: service.image,
    isExpanded: service.isExpanded,
    services: service.services,
  };
}
