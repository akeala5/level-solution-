-- CreateTable
CREATE TABLE "hero_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "slides" JSONB,
    "housePromos" JSONB,
    "slideMs" INTEGER NOT NULL DEFAULT 7000,
    "rotateMs" INTEGER NOT NULL DEFAULT 6500,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hero_config_pkey" PRIMARY KEY ("id")
);
