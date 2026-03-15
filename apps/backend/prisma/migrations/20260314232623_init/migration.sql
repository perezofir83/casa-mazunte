-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'WHATSAPP_CAPTURE',
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "sender_phone_hash" TEXT NOT NULL,
    "sender_phone_enc" TEXT,
    "rawText" TEXT NOT NULL,
    "parsed_data" TEXT,
    "group_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storage_key" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listing_id" TEXT NOT NULL,
    "is_promoted" BOOLEAN NOT NULL DEFAULT false,
    "promoted_at" DATETIME,
    "expires_at" DATETIME,
    "donation_receipt_url" TEXT,
    "approved_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promotions_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "renter_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone_hash" TEXT NOT NULL,
    "phone_enc" TEXT,
    "min_price" INTEGER,
    "max_price" INTEGER,
    "locations" TEXT,
    "min_bedrooms" INTEGER,
    "date_from" DATETIME,
    "date_to" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX "listings_created_at_idx" ON "listings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_listing_id_key" ON "promotions"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");
