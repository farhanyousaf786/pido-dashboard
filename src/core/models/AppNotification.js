// AppNotification model - converted from Flutter app_notification.dart

export function createAppNotificationModel(data = {}) {
  return {
    id: data.id ?? '',
    title: data.title ?? '',
    body: data.body ?? '',
    type: data.type ?? 'general',
    userId: data.userId ?? null,
    isRead: data.isRead ?? false,
    createdAt: data.createdAt ?? new Date(),
    data: data.data ?? {},
  };
}

// Parse from Firestore
export function appNotificationFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createAppNotificationModel({
    id: doc.id ?? data?.id ?? '',
    title: data?.title ?? '',
    body: data?.body ?? '',
    type: data?.type ?? 'general',
    userId: data?.userId ?? null,
    isRead: data?.isRead ?? false,
    createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt) ?? new Date(),
    data: data?.data ?? {},
  });
}
