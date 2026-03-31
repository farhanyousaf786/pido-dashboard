// TopUpWallet model - converted from Flutter top_up_wallet_model.dart

export function createTopUpWalletModel(data = {}) {
  return {
    id: data.id ?? '',
    userId: data.userId ?? '',
    amount: data.amount ?? 0.0,
    method: data.method ?? 'card',
    status: data.status ?? 'pending',
    transactionId: data.transactionId ?? null,
    currency: data.currency ?? 'USD',
    createdAt: data.createdAt ?? new Date(),
    processedAt: data.processedAt ?? null,
  };
}

// Parse from Firestore
export function topUpWalletFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createTopUpWalletModel({
    id: doc.id ?? data?.id ?? '',
    userId: data?.userId ?? '',
    amount: data?.amount?.toDouble?.() ?? parseFloat(data?.amount) ?? 0.0,
    method: data?.method ?? 'card',
    status: data?.status ?? 'pending',
    transactionId: data?.transactionId ?? null,
    currency: data?.currency ?? 'USD',
    createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt) ?? new Date(),
    processedAt: data?.processedAt?.toDate?.() ?? (data?.processedAt ? new Date(data.processedAt) : null),
  });
}

// Helper methods
export const TopUpWalletHelpers = {
  isPending: (topup) => topup.status === 'pending',
  isCompleted: (topup) => topup.status === 'completed',
  isFailed: (topup) => topup.status === 'failed',
  formattedAmount: (topup) => `${topup.currency} ${topup.amount.toFixed(2)}`,
};
