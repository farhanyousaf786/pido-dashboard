// Barber model - converted from Flutter barber_model.dart

export function createBarberModel(data = {}) {
  return {
    name: data.name ?? '',
    specialization: data.specialization ?? '',
    rating: data.rating ?? 0.0,
    totalJobs: data.totalJobs ?? 0,
    ratePerHour: data.ratePerHour ?? 0.0,
    imagePath: data.imagePath ?? '',
  };
}

// Convert to Firestore format
export function barberToFirestore(barber) {
  return {
    name: barber.name,
    specialization: barber.specialization,
    rating: barber.rating,
    totalJobs: barber.totalJobs,
    ratePerHour: barber.ratePerHour,
    imagePath: barber.imagePath,
  };
}

// Parse from Firestore document
export function barberFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createBarberModel({
    name: data?.name ?? '',
    specialization: data?.specialization ?? '',
    rating: data?.rating?.toDouble?.() ?? parseFloat(data?.rating) ?? 0.0,
    totalJobs: data?.totalJobs?.toInt?.() ?? parseInt(data?.totalJobs) ?? 0,
    ratePerHour: data?.ratePerHour?.toDouble?.() ?? parseFloat(data?.ratePerHour) ?? 0.0,
    imagePath: data?.imagePath ?? '',
  });
}
