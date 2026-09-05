-- AddColumn: deletedAt pada tabel user (soft delete)
ALTER TABLE `user` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateTable: roomoccupancysnapshot
CREATE TABLE `roomoccupancysnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `occupiedRooms` INTEGER NOT NULL,
    `totalRooms` INTEGER NOT NULL,
    `snapshotDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roomoccupancysnapshot_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
