/*
  Warnings:

  - You are about to drop the column `isDpReservation` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `paidDate` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `paidNominal` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `periodEnd` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `periodStart` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `priceApplied` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `priorOccupantId` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `roomId` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `waitingForRoomVacant` on the `payment` table. All the data in the column will be lost.
  - Added the required column `amount` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Made the column `paymentMethod` on table `payment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `payment` DROP FOREIGN KEY `Payment_roomId_fkey`;

-- DropIndex
DROP INDEX `Payment_roomId_fkey` ON `payment`;

-- AlterTable
ALTER TABLE `occupantdetails` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `operatordetails` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `payment` DROP COLUMN `isDpReservation`,
    DROP COLUMN `paidDate`,
    DROP COLUMN `paidNominal`,
    DROP COLUMN `periodEnd`,
    DROP COLUMN `periodStart`,
    DROP COLUMN `priceApplied`,
    DROP COLUMN `priorOccupantId`,
    DROP COLUMN `roomId`,
    DROP COLUMN `status`,
    DROP COLUMN `waitingForRoomVacant`,
    ADD COLUMN `amount` DOUBLE NOT NULL,
    ADD COLUMN `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `paymentMethod` ENUM('TRANSFER', 'QRIS', 'E_WALLET', 'CASH') NOT NULL;

-- AlterTable
ALTER TABLE `user` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- CreateTable
CREATE TABLE `invoice` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `occupantId` VARCHAR(191) NOT NULL,
    `priceApplied` DOUBLE NOT NULL,
    `paidNominal` DOUBLE NOT NULL DEFAULT 0,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `note` TEXT NULL,
    `status` ENUM('PAID', 'UNPAID', 'NOT_FULLY_PAID') NOT NULL DEFAULT 'UNPAID',
    `isDpReservation` BOOLEAN NOT NULL DEFAULT false,
    `waitingForRoomVacant` BOOLEAN NOT NULL DEFAULT false,
    `priorOccupantId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoicepayment` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `amountApplied` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `invoice` ADD CONSTRAINT `Invoice_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice` ADD CONSTRAINT `Invoice_occupantId_fkey` FOREIGN KEY (`occupantId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoicepayment` ADD CONSTRAINT `InvoicePayment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoicepayment` ADD CONSTRAINT `InvoicePayment_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
