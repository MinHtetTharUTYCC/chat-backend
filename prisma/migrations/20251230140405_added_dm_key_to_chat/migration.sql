/*
  Warnings:

  - A unique constraint covering the columns `[dmKey]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "dmKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Chat_dmKey_key" ON "Chat"("dmKey");
