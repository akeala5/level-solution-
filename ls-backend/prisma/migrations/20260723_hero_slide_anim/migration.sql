-- AlterTable : ajout du type de transition du hero (fade|slide|zoom|none), defaut = comportement actuel
ALTER TABLE "hero_config" ADD COLUMN "slideAnim" TEXT NOT NULL DEFAULT 'fade';
