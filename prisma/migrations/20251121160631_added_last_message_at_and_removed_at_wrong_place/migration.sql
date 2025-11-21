/*
  Warnings:

  - You are about to drop the column `lastMessageAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "lastMessageAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastMessageAt";
