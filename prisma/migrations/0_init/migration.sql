-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('CONCERT_TAG', 'PHOTO_TAG', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'FRIEND_CONCERT');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Concert" (
    "id" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "festival" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "city" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "genre" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Concert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConcertParticipant" (
    "id" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ConcertParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConcertPhoto" (
    "id" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "ConcertPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PhotoParticipant" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PhotoParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Friendship" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "public"."FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WantToAttend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "ticketUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WantToAttend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "public"."User"("resetToken");

-- CreateIndex
CREATE INDEX "ConcertParticipant_userId_idx" ON "public"."ConcertParticipant"("userId");

-- CreateIndex
CREATE INDEX "ConcertParticipant_concertId_idx" ON "public"."ConcertParticipant"("concertId");

-- CreateIndex
CREATE UNIQUE INDEX "ConcertParticipant_concertId_userId_key" ON "public"."ConcertParticipant"("concertId", "userId");

-- CreateIndex
CREATE INDEX "ConcertPhoto_concertId_idx" ON "public"."ConcertPhoto"("concertId");

-- CreateIndex
CREATE INDEX "ConcertPhoto_userId_idx" ON "public"."ConcertPhoto"("userId");

-- CreateIndex
CREATE INDEX "PhotoParticipant_userId_idx" ON "public"."PhotoParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoParticipant_photoId_userId_key" ON "public"."PhotoParticipant"("photoId", "userId");

-- CreateIndex
CREATE INDEX "Friendship_receiverId_idx" ON "public"."Friendship"("receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_senderId_receiverId_key" ON "public"."Friendship"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "public"."Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WantToAttend_userId_idx" ON "public"."WantToAttend"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WantToAttend_userId_eventId_key" ON "public"."WantToAttend"("userId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "public"."DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "public"."DeviceToken"("userId");

-- AddForeignKey
ALTER TABLE "public"."Concert" ADD CONSTRAINT "Concert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConcertParticipant" ADD CONSTRAINT "ConcertParticipant_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "public"."Concert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConcertParticipant" ADD CONSTRAINT "ConcertParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConcertPhoto" ADD CONSTRAINT "ConcertPhoto_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "public"."Concert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConcertPhoto" ADD CONSTRAINT "ConcertPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoParticipant" ADD CONSTRAINT "PhotoParticipant_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "public"."ConcertPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoParticipant" ADD CONSTRAINT "PhotoParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WantToAttend" ADD CONSTRAINT "WantToAttend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

