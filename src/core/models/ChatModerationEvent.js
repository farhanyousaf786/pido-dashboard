export function mapChatModerationEvent(id, data) {
  const d = data || {};
  return {
    id,
    chatType: d.chatType ?? 'p2p',
    chatId: d.chatId ?? '',
    messageId: d.messageId ?? null,
    senderId: d.senderId ?? '',
    receiverId: d.receiverId ?? null,
    senderName: d.senderName ?? 'Unknown',
    senderRole: d.senderRole ?? 'customer',
    reporterId: d.reporterId ?? null,
    reporterName: d.reporterName ?? null,
    reporterRole: d.reporterRole ?? null,
    violationTypes: Array.isArray(d.violationTypes) ? d.violationTypes : [],
    blockReason: d.blockReason ?? '',
    matchedSnippetRedacted: d.matchedSnippetRedacted ?? '',
    source: d.source ?? 'client_block',
    status: d.status ?? 'open',
    severity: d.severity ?? 'low',
    reviewedBy: d.reviewedBy ?? null,
    reviewedAt: d.reviewedAt ?? null,
    adminNote: d.adminNote ?? '',
    createdAt: d.createdAt ?? null,
  };
}

export const ChatModerationEventHelpers = {
  roleLabel(role) {
    if (role === 'provider') return 'Provider';
    if (role === 'customer') return 'Customer';
    return role || 'Unknown';
  },

  typesLabel(types) {
    if (!types?.length) return '—';
    return types.join(', ');
  },

  severityClass(severity) {
    const s = (severity || 'low').toLowerCase();
    if (s === 'high') return 'high';
    if (s === 'medium') return 'medium';
    return 'low';
  },
};
