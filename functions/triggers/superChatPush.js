const { onDocumentCreated } = require('firebase-functions/v2/firestore');

/**
 * Push + in-app notification records are sent synchronously from
 * POST /admin/super-chat/message (same pattern as /admin/notifications/users).
 * This trigger is kept as a no-op so older deployments do not double-send.
 */
const onSuperChatMessageCreated = onDocumentCreated(
  'superChats/{chatId}/messages/{messageId}',
  async () => {}
);

module.exports = { onSuperChatMessageCreated };
