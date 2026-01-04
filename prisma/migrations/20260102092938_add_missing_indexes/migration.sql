-- DropIndex
DROP INDEX "Chat_lastMessageAt_idx";

-- DropIndex
DROP INDEX "Notification_receiverId_createdAt_idx";

-- CreateIndex
CREATE INDEX "Chat_lastMessageAt_idx" ON "Chat"("lastMessageAt");

-- CreateIndex
CREATE INDEX "Notification_receiverId_createdAt_idx" ON "Notification"("receiverId", "createdAt");
