-- DropForeignKey
ALTER TABLE `asset` DROP FOREIGN KEY `Asset_assetMasterId_fkey`;

-- DropForeignKey
ALTER TABLE `asset` DROP FOREIGN KEY `Asset_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `assetmaintenancelog` DROP FOREIGN KEY `AssetMaintenanceLog_assetId_fkey`;

-- DropForeignKey
ALTER TABLE `financialrecord` DROP FOREIGN KEY `FinancialRecord_assetId_fkey`;

-- DropForeignKey
ALTER TABLE `financialrecord` DROP FOREIGN KEY `FinancialRecord_paymentId_fkey`;

-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_occupantId_fkey`;

-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_roomId_fkey`;

-- DropForeignKey
ALTER TABLE `invoicepayment` DROP FOREIGN KEY `InvoicePayment_invoiceId_fkey`;

-- DropForeignKey
ALTER TABLE `invoicepayment` DROP FOREIGN KEY `InvoicePayment_paymentId_fkey`;

-- DropForeignKey
ALTER TABLE `occupantdetails` DROP FOREIGN KEY `OccupantDetails_userId_fkey`;

-- DropForeignKey
ALTER TABLE `operatordetails` DROP FOREIGN KEY `OperatorDetails_userId_fkey`;

-- DropForeignKey
ALTER TABLE `payment` DROP FOREIGN KEY `Payment_occupantId_fkey`;

-- AddForeignKey
ALTER TABLE `occupantdetails` ADD CONSTRAINT `occupantdetails_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operatordetails` ADD CONSTRAINT `operatordetails_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset` ADD CONSTRAINT `asset_assetMasterId_fkey` FOREIGN KEY (`assetMasterId`) REFERENCES `assetmaster`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset` ADD CONSTRAINT `asset_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assetmaintenancelog` ADD CONSTRAINT `assetmaintenancelog_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `asset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice` ADD CONSTRAINT `invoice_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice` ADD CONSTRAINT `invoice_occupantId_fkey` FOREIGN KEY (`occupantId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `payment_occupantId_fkey` FOREIGN KEY (`occupantId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoicepayment` ADD CONSTRAINT `invoicepayment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoicepayment` ADD CONSTRAINT `invoicepayment_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financialrecord` ADD CONSTRAINT `financialrecord_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financialrecord` ADD CONSTRAINT `financialrecord_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `asset` RENAME INDEX `Asset_roomId_assetMasterId_name_key` TO `asset_roomId_assetMasterId_name_key`;

-- RenameIndex
ALTER TABLE `assetmaster` RENAME INDEX `AssetMaster_name_key` TO `assetmaster_name_key`;

-- RenameIndex
ALTER TABLE `financialrecord` RENAME INDEX `FinancialRecord_type_expenseCategory_amount_description_date_key` TO `financialrecord_type_expenseCategory_amount_description_date_key`;

-- RenameIndex
ALTER TABLE `invoice` RENAME INDEX `Invoice_importCode_key` TO `invoice_importCode_key`;

-- RenameIndex
ALTER TABLE `invoicepayment` RENAME INDEX `InvoicePayment_invoiceId_paymentId_amountApplied_key` TO `invoicepayment_invoiceId_paymentId_amountApplied_key`;

-- RenameIndex
ALTER TABLE `occupantdetails` RENAME INDEX `OccupantDetails_userId_key` TO `occupantdetails_userId_key`;

-- RenameIndex
ALTER TABLE `operatordetails` RENAME INDEX `OperatorDetails_userId_key` TO `operatordetails_userId_key`;

-- RenameIndex
ALTER TABLE `payment` RENAME INDEX `Payment_importCode_key` TO `payment_importCode_key`;

-- RenameIndex
ALTER TABLE `room` RENAME INDEX `Room_name_key` TO `room_name_key`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `User_email_key` TO `user_email_key`;
