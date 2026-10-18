-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'VINYL',
    "year" INTEGER,
    "label" TEXT,
    "country" TEXT,
    "coverUrl" TEXT,
    "discogsId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Record_userId_createdAt_idx" ON "Record"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Record_userId_discogsId_key" ON "Record"("userId", "discogsId");

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
