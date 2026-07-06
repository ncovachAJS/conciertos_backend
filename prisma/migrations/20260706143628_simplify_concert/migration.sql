/*
  Warnings:

  - You are about to drop the column `festivalId` on the `Concert` table. All the data in the column will be lost.
  - You are about to drop the `Festival` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `festival` to the `Concert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Concert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `venue` to the `Concert` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Concert" DROP CONSTRAINT "Concert_festivalId_fkey";

-- AlterTable
ALTER TABLE "public"."Concert" DROP COLUMN "festivalId",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "festival" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "venue" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."Festival";
