-- CreateTable
CREATE TABLE `complaint` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('ASSET', 'OTHERS') NOT NULL,
    `detail` TEXT NOT NULL,
    `status` ENUM('PENDING', 'PROCESSED', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
    `reportedById` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `complaint` ADD CONSTRAINT `complaint_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint` ADD CONSTRAINT `complaint_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Clean up assetmaintenancelog (remove reportedById which was moved to complaint)
-- Note: We check if the column exists first to avoid errors if it was already removed manually
SET @dbname = DATABASE();
SET @tablename = 'assetmaintenancelog';
SET @columnname = 'reportedById';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'ALTER TABLE `assetmaintenancelog` DROP FOREIGN KEY `assetmaintenancelog_reportedById_fkey`, DROP COLUMN `reportedById`',
  'SELECT 1'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
