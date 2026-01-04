-- CreateIndex for Notification table - receiverId
CREATE INDEX "Notification_receiverId_idx" ON "Notification"("receiverId");

-- CreateIndex for Notification table - receiverId + createdAt for paginated queries
CREATE INDEX "Notification_receiverId_createdAt_idx" ON "Notification"("receiverId", "createdAt" DESC);

-- CreateIndex for Notification table - actorId
CREATE INDEX "Notification_actorId_idx" ON "Notification"("actorId");

-- CreateIndex for Notification table - chatId
CREATE INDEX "Notification_chatId_idx" ON "Notification"("chatId");

-- CreateIndex for Chat table - lastMessageAt for sorting
CREATE INDEX "Chat_lastMessageAt_idx" ON "Chat"("lastMessageAt" DESC);
