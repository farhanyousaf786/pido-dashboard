// Review model - converted from Flutter review_model.dart

export function createReviewModel(data = {}) {
  return {
    uid: data.uid ?? '',
    giverUid: data.giverUid ?? '',
    giverMessage: data.giverMessage ?? '',
    giverProfileImage: data.giverProfileImage ?? '',
    giverUserType: data.giverUserType ?? '',
    rating: data.rating ?? 0.0,
    customerName: data.customerName ?? '',
    updatedAt: data.updatedAt ?? new Date(),
  };
}

// Parse from JSON/Firestore
export function reviewFromJson(json) {
  return createReviewModel({
    uid: json?.uid ?? '',
    giverUid: json?.giverUid ?? '',
    giverMessage: json?.giverMessage ?? '',
    giverProfileImage: json?.giverProfileImage ?? '',
    giverUserType: json?.giverUserType ?? '',
    rating: json?.rating?.toDouble?.() ?? parseFloat(json?.rating) ?? 0.0,
    customerName: json?.customerName ?? '',
    updatedAt: json?.updatedAt?.toDate?.() ?? new Date(json?.updatedAt) ?? new Date(),
  });
}

// Convert to JSON
export function reviewToJson(review) {
  return {
    uid: review.uid,
    giverUid: review.giverUid,
    giverMessage: review.giverMessage,
    giverProfileImage: review.giverProfileImage,
    giverUserType: review.giverUserType,
    rating: review.rating,
    customerName: review.customerName,
    updatedAt: review.updatedAt instanceof Date ? review.updatedAt.toISOString() : review.updatedAt,
  };
}
