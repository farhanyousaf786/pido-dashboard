// RecentCall model - converted from Flutter recent_call_model.dart

export function createRecentCallModel(data = {}) {
  return {
    id: data.id ?? '',
    callerId: data.callerId ?? '',
    callerName: data.callerName ?? '',
    callerImage: data.callerImage ?? null,
    receiverId: data.receiverId ?? '',
    receiverName: data.receiverName ?? '',
    receiverImage: data.receiverImage ?? null,
    type: data.type ?? 'audio',
    status: data.status ?? 'missed',
    duration: data.duration ?? 0,
    startedAt: data.startedAt ?? null,
    endedAt: data.endedAt ?? null,
    isVideo: data.isVideo ?? false,
  };
}

// Parse from Firestore
export function recentCallFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createRecentCallModel({
    id: doc.id ?? data?.id ?? '',
    callerId: data?.callerId ?? '',
    callerName: data?.callerName ?? '',
    callerImage: data?.callerImage ?? null,
    receiverId: data?.receiverId ?? '',
    receiverName: data?.receiverName ?? '',
    receiverImage: data?.receiverImage ?? null,
    type: data?.type ?? 'audio',
    status: data?.status ?? 'missed',
    duration: data?.duration ?? 0,
    startedAt: data?.startedAt?.toDate?.() ?? (data?.startedAt ? new Date(data.startedAt) : null),
    endedAt: data?.endedAt?.toDate?.() ?? (data?.endedAt ? new Date(data.endedAt) : null),
    isVideo: data?.isVideo ?? false,
  });
}

// Helper methods
export const RecentCallHelpers = {
  isMissed: (call) => call.status === 'missed',
  isAnswered: (call) => call.status === 'answered',
  isRejected: (call) => call.status === 'rejected',
  isOutgoing: (call) => call.callerId === 'currentUserId',
  isIncoming: (call) => call.receiverId === 'currentUserId',
  formattedDuration: (call) => {
    if (!call.duration) return '0:00';
    const mins = Math.floor(call.duration / 60);
    const secs = call.duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
};
