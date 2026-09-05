/*
  Warnings:

  - The values [OTHERS] on the enum `financialrecord_expenseCategory` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `updatedAt` to the `assetmaintenancelog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `assetmaintenancelog` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `reportedById` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `financialrecord` MODIFY `expenseCategory` ENUM('ASSET_REPAIR', 'LISTRIK', 'GAJI_PRT', 'OPS_DAPUR', 'BTN', 'INTERNET', 'LAIN_LAIN') NULL;

-- AddForeignKey
ALTER TABLE `assetmaintenancelog` ADD CONSTRAINT `assetmaintenancelog_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
