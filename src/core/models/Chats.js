// Chats model - converted from Flutter chats_model.dart

export function createChatsModel(data = {}) {
  return {
    chatId: data.chatId ?? '',
    participants: data.participants ?? [],
    lastMessage: data.lastMessage ?? null,
    lastMessageTime: data.lastMessageTime ?? null,
    unreadCount: data.unreadCount ?? 0,
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt ?? new Date(),
    isGroup: data.isGroup ?? false,
    groupName: data.groupName ?? null,
    groupImage: data.groupImage ?? null,
  };
}

// Parse from Firestore
export function chatsFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createChatsModel({
    chatId: doc.id ?? data?.chatId ?? '',
    participants: data?.participants ?? [],
    lastMessage: data?.lastMessage ?? null,
    lastMessageTime: data?.lastMessageTime?.toDate?.() ?? new Date(data?.lastMessageTime) ?? null,
    unreadCount: data?.unreadCount ?? 0,
    createdAt: data?.createdAt?.toDate?.() ?? new Date(data?.createdAt) ?? new Date(),
    updatedAt: data?.updatedAt?.toDate?.() ?? new Date(data?.updatedAt) ?? new Date(),
    isGroup: data?.isGroup ?? false,
    groupName: data?.groupName ?? null,
    groupImage: data?.groupImage ?? null,
  });
}
