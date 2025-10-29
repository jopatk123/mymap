-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "display_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sid" TEXT NOT NULL,
    "userId" INTEGER,
    "active_expires" BIGINT NOT NULL,
    "idle_expires" BIGINT NOT NULL,
    "data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "folders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" INTEGER,
    CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "folders_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "panoramas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "gcj02_lat" REAL,
    "gcj02_lng" REAL,
    "file_size" INTEGER,
    "file_type" TEXT,
    "folder_id" INTEGER,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" INTEGER,
    CONSTRAINT "panoramas_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "panoramas_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kml_files" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "is_basemap" BOOLEAN NOT NULL DEFAULT false,
    "folder_id" INTEGER,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" INTEGER,
    CONSTRAINT "kml_files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "kml_files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kml_points" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kml_file_id" INTEGER NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "gcj02_lat" REAL,
    "gcj02_lng" REAL,
    "altitude" REAL DEFAULT 0,
    "point_type" TEXT DEFAULT 'Point',
    "coordinates" TEXT,
    "style_data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" INTEGER,
    CONSTRAINT "kml_points_kml_file_id_fkey" FOREIGN KEY ("kml_file_id") REFERENCES "kml_files" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "kml_points_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "video_points" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "video_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "gcj02_lat" REAL,
    "gcj02_lng" REAL,
    "file_size" INTEGER,
    "file_type" TEXT,
    "duration" INTEGER,
    "folder_id" INTEGER,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" INTEGER,
    CONSTRAINT "video_points_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "video_points_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sid_key" ON "sessions"("sid");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "folders_parent_id_idx" ON "folders"("parent_id");

-- CreateIndex
CREATE INDEX "folders_sort_order_idx" ON "folders"("sort_order");

-- CreateIndex
CREATE INDEX "folders_name_idx" ON "folders"("name");

-- CreateIndex
CREATE INDEX "folders_owner_id_idx" ON "folders"("owner_id");

-- CreateIndex
CREATE INDEX "panoramas_latitude_longitude_idx" ON "panoramas"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "panoramas_gcj02_lat_gcj02_lng_idx" ON "panoramas"("gcj02_lat", "gcj02_lng");

-- CreateIndex
CREATE INDEX "panoramas_folder_id_idx" ON "panoramas"("folder_id");

-- CreateIndex
CREATE INDEX "panoramas_is_visible_idx" ON "panoramas"("is_visible");

-- CreateIndex
CREATE INDEX "panoramas_created_at_idx" ON "panoramas"("created_at");

-- CreateIndex
CREATE INDEX "panoramas_title_idx" ON "panoramas"("title");

-- CreateIndex
CREATE INDEX "panoramas_sort_order_idx" ON "panoramas"("sort_order");

-- CreateIndex
CREATE INDEX "panoramas_owner_id_idx" ON "panoramas"("owner_id");

-- CreateIndex
CREATE INDEX "kml_files_folder_id_idx" ON "kml_files"("folder_id");

-- CreateIndex
CREATE INDEX "kml_files_is_visible_idx" ON "kml_files"("is_visible");

-- CreateIndex
CREATE INDEX "kml_files_created_at_idx" ON "kml_files"("created_at");

-- CreateIndex
CREATE INDEX "kml_files_title_idx" ON "kml_files"("title");

-- CreateIndex
CREATE INDEX "kml_files_sort_order_idx" ON "kml_files"("sort_order");

-- CreateIndex
CREATE INDEX "kml_files_owner_id_idx" ON "kml_files"("owner_id");

-- CreateIndex
CREATE INDEX "kml_points_kml_file_id_idx" ON "kml_points"("kml_file_id");

-- CreateIndex
CREATE INDEX "kml_points_latitude_longitude_idx" ON "kml_points"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "kml_points_gcj02_lat_gcj02_lng_idx" ON "kml_points"("gcj02_lat", "gcj02_lng");

-- CreateIndex
CREATE INDEX "kml_points_point_type_idx" ON "kml_points"("point_type");

-- CreateIndex
CREATE INDEX "kml_points_owner_id_idx" ON "kml_points"("owner_id");

-- CreateIndex
CREATE INDEX "video_points_latitude_longitude_idx" ON "video_points"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "video_points_gcj02_lat_gcj02_lng_idx" ON "video_points"("gcj02_lat", "gcj02_lng");

-- CreateIndex
CREATE INDEX "video_points_folder_id_idx" ON "video_points"("folder_id");

-- CreateIndex
CREATE INDEX "video_points_is_visible_idx" ON "video_points"("is_visible");

-- CreateIndex
CREATE INDEX "video_points_created_at_idx" ON "video_points"("created_at");

-- CreateIndex
CREATE INDEX "video_points_title_idx" ON "video_points"("title");

-- CreateIndex
CREATE INDEX "video_points_sort_order_idx" ON "video_points"("sort_order");

-- CreateIndex
CREATE INDEX "video_points_owner_id_idx" ON "video_points"("owner_id");
