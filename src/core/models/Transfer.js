// Transfer model - converted from Flutter transfer_model.dart

export function createTransferModel(data = {}) {
  return {
    id: data.id ?? '',
    senderId: data.senderId ?? '',
    senderName: data.senderName ?? '',
    receiverId: data.receiverId ?? '',
    receiverName: data.receiverName ?? '',
    amount: data.amount ?? 0.0,
    currency: data.currency ?? 'USD',
    status: data.status ?? 'pending',
    note: data.note ?? '',
    createdAt: data.createdAt ?? new Date(),
    completedAt: data.completedAt ?? null,
  };
}

// Parse from Firestore
export function transferFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createTransferModel({
    id: doc.id ?? data?.id ?? '',
    senderId: data?.senderId ?? '',
    senderName: data?.senderName ?? '',
    receiverId: data?.receiverId ?? '',
    receiverName: data?.receiverName ?? '',
    amount: data?.amount?.toDouble?.() ?? parseFloat(data?.amount) ?? 0.0,
    currency: data?.currency ?? 'USD',
    status: data?.status ?? 'pending',
    note: data?.note ?? '',
    createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt) ?? new Date(),
    completedAt: data?.completedAt?.toDate?.() ?? (data?.completedAt ? new Date(data.completedAt) : null),
  });
}

// Helper methods
export const TransferHelpers = {
  isPending: (transfer) => transfer.status === 'pending',
  isCompleted: (transfer) => transfer.status === 'completed',
  isFailed: (transfer) => transfer.status === 'failed',
  formattedAmount: (transfer) => `${transfer.currency} ${transfer.amount.toFixed(2)}`,
};
