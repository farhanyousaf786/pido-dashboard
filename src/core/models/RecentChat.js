// RecentChat model - converted from Flutter recent_chat_model.dart

export function createRecentChatModel(data = {}) {
  return {
    chatId: data.chatId ?? '',
    userId: data.userId ?? '',
    userName: data.userName ?? '',
    userImage: data.userImage ?? null,
    lastMessage: data.lastMessage ?? '',
    lastMessageTime: data.lastMessageTime ?? null,
    unreadCount: data.unreadCount ?? 0,
    isOnline: data.isOnline ?? false,
    typing: data.typing ?? false,
  };
}

// Parse from Firestore
export function recentChatFromFirestore(doc) {
  const data = doc.data ? doc.data() : doc;
  return createRecentChatModel({
    chatId: doc.id ?? data?.chatId ?? '',
    userId: data?.userId ?? '',
    userName: data?.userName ?? '',
    userImage: data?.userImage ?? null,
    lastMessage: data?.lastMessage ?? '',
    lastMessageTime: data?.lastMessageTime?.toDate?.() ?? (data?.lastMessageTime ? new Date(data.lastMessageTime) : null),
    unreadCount: data?.unreadCount ?? 0,
    isOnline: data?.isOnline ?? false,
    typing: data?.typing ?? false,
  });
}

// Helper methods
export const RecentChatHelpers = {
  hasUnread: (chat) => chat.unreadCount > 0,
  formattedTime: (chat) => {
    if (!chat.lastMessageTime) return '';
    const date = chat.lastMessageTime instanceof Date
      ? chat.lastMessageTime
      : new Date(chat.lastMessageTime);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  },
};
