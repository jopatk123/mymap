/*
  Warnings:

  - You are about to drop the column `active_expires` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `idle_expires` on the `sessions` table. All the data in the column will be lost.
  - Added the required column `expires_at` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sid" TEXT NOT NULL,
  "userId" INTEGER,
  "expires_at" DATETIME NOT NULL,
  "data" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_sessions" ("created_at", "data", "expires_at", "id", "sid", "updated_at", "userId")
SELECT
  "created_at",
  "data",
  COALESCE(datetime("active_expires" / 1000, 'unixepoch'), datetime('now')),
  "id",
  "sid",
  "updated_at",
  "userId"
FROM "sessions";
DROP TABLE "sessions";
ALTER TABLE "new_sessions" RENAME TO "sessions";
CREATE UNIQUE INDEX "sessions_sid_key" ON "sessions"("sid");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
