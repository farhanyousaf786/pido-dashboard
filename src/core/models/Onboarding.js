// Onboarding model - converted from Flutter onboarding_model.dart

export function createOnboardingModel(data = {}) {
  return {
    id: data.id ?? '',
    title: data.title ?? '',
    description: data.description ?? '',
    image: data.image ?? '',
    order: data.order ?? 0,
  };
}

// Parse from JSON
export function onboardingFromJson(json) {
  return createOnboardingModel({
    id: json?.id ?? '',
    title: json?.title ?? '',
    description: json?.description ?? '',
    image: json?.image ?? '',
    order: json?.order ?? 0,
  });
}
