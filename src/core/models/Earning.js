// Earning model - converted from Flutter earning_model.dart

export function createEarningModel(data = {}) {
  return {
    id: data.id ?? '',
    userId: data.userId ?? '',
    amount: data.amount ?? 0.0,
    type: data.type ?? 'booking',
    description: data.description ?? '',
    bookingId: data.bookingId ?? null,
    status: data.status ?? 'pending',
    createdAt: data.createdAt ?? new Date(),
    paidAt: data.paidAt ?? null,
  };
}

// Parse from Firestore
export function earningFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createEarningModel({
    id: doc.id ?? data?.id ?? '',
    userId: data?.userId ?? '',
    amount: data?.amount?.toDouble?.() ?? parseFloat(data?.amount) ?? 0.0,
    type: data?.type ?? 'booking',
    description: data?.description ?? '',
    bookingId: data?.bookingId ?? null,
    status: data?.status ?? 'pending',
    createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt) ?? new Date(),
    paidAt: data?.paidAt?.toDate?.() ?? (data?.paidAt ? new Date(data.paidAt) : null),
  });
}
