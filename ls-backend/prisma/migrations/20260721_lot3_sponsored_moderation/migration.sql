-- AlterTable (additif : colonnes avec valeurs par défaut, aucune donnée impactée)
ALTER TABLE "sponsored_ads" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'APPROVED';
