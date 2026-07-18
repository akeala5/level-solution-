-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "parentId" TEXT;
-- CreateTable
CREATE TABLE "seller_wallets" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seller_wallets_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "orderId" TEXT,
    "payoutRequestId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "destination" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "seller_wallets_sellerId_key" ON "seller_wallets"("sellerId");
-- CreateIndex
CREATE INDEX "wallet_transactions_sellerId_createdAt_idx" ON "wallet_transactions"("sellerId", "createdAt");
-- CreateIndex
CREATE INDEX "payout_requests_sellerId_status_idx" ON "payout_requests"("sellerId", "status");
-- CreateIndex
CREATE INDEX "payout_requests_status_createdAt_idx" ON "payout_requests"("status", "createdAt");
-- CreateIndex
CREATE INDEX "orders_parentId_idx" ON "orders"("parentId");
-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "seller_wallets" ADD CONSTRAINT "seller_wallets_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_wallets"("sellerId") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
