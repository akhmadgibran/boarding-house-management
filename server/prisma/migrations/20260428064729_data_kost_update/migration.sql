-- -- DropForeignKey
-- ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_occupantId_fkey`;

-- -- DropIndex
-- DROP INDEX `Invoice_occupantId_fkey` ON `invoice`;

-- -- AddForeignKey
-- ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_occupantId_fkey` FOREIGN KEY (`occupantId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_occupantId_fkey`;

-- DropIndex
DROP INDEX `Invoice_occupantId_fkey` ON `invoice`;

-- AlterTable: Buat occupantId nullable terlebih dahulu
ALTER TABLE `invoice` MODIFY COLUMN `occupantId` VARCHAR(191) NULL;

-- AddForeignKey dengan ON DELETE SET NULL
ALTER TABLE `invoice` ADD CONSTRAINT `Invoice_occupantId_fkey` FOREIGN KEY (`occupantId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
