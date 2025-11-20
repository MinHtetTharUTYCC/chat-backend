/*
  Warnings:

  - A unique constraint covering the columns `[userId,chatId]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Participant_userId_chatId_key" ON "Participant"("userId", "chatId");
