-- CreateTable
CREATE TABLE "owners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone_hash" TEXT NOT NULL,
    "phone_enc" TEXT NOT NULL,
    "name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" DATETIME
);

-- CreateTable
CREATE TABLE "owner_otps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone_hash" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "availability_blocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT NOT NULL,
    "date_from" DATETIME NOT NULL,
    "date_to" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "availability_blocks_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storage_key" TEXT,
    "media_type" TEXT NOT NULL DEFAULT 'image',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_images" ("created_at", "id", "listing_id", "storage_key", "url") SELECT "created_at", "id", "listing_id", "storage_key", "url" FROM "images";
DROP TABLE "images";
ALTER TABLE "new_images" RENAME TO "images";
CREATE TABLE "new_listings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'WHATSAPP_CAPTURE',
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "sender_phone_hash" TEXT NOT NULL,
    "sender_phone_enc" TEXT,
    "rawText" TEXT NOT NULL,
    "parsed_data" TEXT,
    "group_name" TEXT,
    "owner_id" TEXT,
    "owner_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "listings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_listings" ("created_at", "group_name", "id", "parsed_data", "rawText", "sender_phone_enc", "sender_phone_hash", "source", "status", "updated_at") SELECT "created_at", "group_name", "id", "parsed_data", "rawText", "sender_phone_enc", "sender_phone_hash", "source", "status", "updated_at" FROM "listings";
DROP TABLE "listings";
ALTER TABLE "new_listings" RENAME TO "listings";
CREATE INDEX "listings_status_idx" ON "listings"("status");
CREATE INDEX "listings_created_at_idx" ON "listings"("created_at");
CREATE INDEX "listings_owner_id_idx" ON "listings"("owner_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "owners_phone_hash_key" ON "owners"("phone_hash");

-- CreateIndex
CREATE INDEX "owner_otps_phone_hash_idx" ON "owner_otps"("phone_hash");

-- CreateIndex
CREATE INDEX "availability_blocks_listing_id_idx" ON "availability_blocks"("listing_id");
