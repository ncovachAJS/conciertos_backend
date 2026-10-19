-- CreateTable
CREATE TABLE "DiscogsConnection" (
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "accessSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscogsConnection_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "DiscogsConnection" ADD CONSTRAINT "DiscogsConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
