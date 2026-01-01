/*
  Warnings:

  - You are about to drop the column `pinnedId` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TITLE_UPDATED';

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "pinnedId";

-- CreateIndex
CREATE INDEX "Message_chatId_id_idx" ON "Message"("chatId", "id");

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Participant_chatId_userId_idx" ON "Participant"("chatId", "userId");

-- CreateIndex
CREATE INDEX "Participant_userId_idx" ON "Participant"("userId");

-- CreateIndex
CREATE INDEX "PinnedMessage_chatId_messageId_idx" ON "PinnedMessage"("chatId", "messageId");

-- CreateIndex
CREATE INDEX "PinnedMessage_pinnedByUserId_idx" ON "PinnedMessage"("pinnedByUserId");

-- CreateIndex
CREATE INDEX "PinnedMessage_messageId_idx" ON "PinnedMessage"("messageId");
