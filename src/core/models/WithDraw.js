// WithDraw model - converted from Flutter with_draw_model.dart

export function createWithDrawModel(data = {}) {
  return {
    id: data.id ?? '',
    userId: data.userId ?? '',
    amount: data.amount ?? 0.0,
    method: data.method ?? 'bank',
    accountDetails: data.accountDetails ?? {},
    status: data.status ?? 'pending',
    currency: data.currency ?? 'USD',
    fee: data.fee ?? 0.0,
    netAmount: data.netAmount ?? 0.0,
    referenceNumber: data.referenceNumber ?? null,
    createdAt: data.createdAt ?? new Date(),
    processedAt: data.processedAt ?? null,
    completedAt: data.completedAt ?? null,
  };
}

// Parse from Firestore
export function withDrawFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createWithDrawModel({
    id: doc.id ?? data?.id ?? '',
    userId: data?.userId ?? '',
    amount: data?.amount?.toDouble?.() ?? parseFloat(data?.amount) ?? 0.0,
    method: data?.method ?? 'bank',
    accountDetails: data?.accountDetails ?? {},
    status: data?.status ?? 'pending',
    currency: data?.currency ?? 'USD',
    fee: data?.fee?.toDouble?.() ?? parseFloat(data?.fee) ?? 0.0,
    netAmount: data?.netAmount?.toDouble?.() ?? parseFloat(data?.netAmount) ?? 0.0,
    referenceNumber: data?.referenceNumber ?? null,
    createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt) ?? new Date(),
    processedAt: data?.processedAt?.toDate?.() ?? (data?.processedAt ? new Date(data.processedAt) : null),
    completedAt: data?.completedAt?.toDate?.() ?? (data?.completedAt ? new Date(data.completedAt) : null),
  });
}

// Helper methods
export const WithDrawHelpers = {
  isPending: (withdraw) => withdraw.status === 'pending',
  isProcessing: (withdraw) => withdraw.status === 'processing',
  isCompleted: (withdraw) => withdraw.status === 'completed',
  isFailed: (withdraw) => withdraw.status === 'failed',
  formattedAmount: (withdraw) => `${withdraw.currency} ${withdraw.amount.toFixed(2)}`,
  formattedNetAmount: (withdraw) => `${withdraw.currency} ${withdraw.netAmount.toFixed(2)}`,
};
