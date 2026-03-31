// SelectedServices model - converted from Flutter selected_services_model.dart

export function createSelectedServicesModel(data = {}) {
  return {
    id: data.id ?? '',
    name: data.name ?? '',
    price: data.price ?? 0.0,
    duration: data.duration ?? 0,
    description: data.description ?? '',
    image: data.image ?? null,
    quantity: data.quantity ?? 1,
    categoryId: data.categoryId ?? '',
  };
}

// Parse from Map
export function selectedServiceFromMap(map) {
  return createSelectedServicesModel({
    id: map?.id ?? '',
    name: map?.name ?? '',
    price: map?.price?.toDouble?.() ?? parseFloat(map?.price) ?? 0.0,
    duration: map?.duration?.toInt?.() ?? parseInt(map?.duration) ?? 0,
    description: map?.description ?? '',
    image: map?.image ?? null,
    quantity: map?.quantity ?? 1,
    categoryId: map?.categoryId ?? '',
  });
}

// Convert to Map
export function selectedServiceToMap(service) {
  return {
    id: service.id,
    name: service.name,
    price: service.price,
    duration: service.duration,
    description: service.description,
    image: service.image,
    quantity: service.quantity,
    categoryId: service.categoryId,
  };
}

// Parse list of services
export function parseSelectedServices(services) {
  if (!Array.isArray(services)) return [];
  return services.map((s) =>
    typeof s === 'object' ? selectedServiceFromMap(s) : createSelectedServicesModel()
  );
}
