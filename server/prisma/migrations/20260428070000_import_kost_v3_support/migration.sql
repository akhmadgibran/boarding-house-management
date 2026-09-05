-- Add stable import keys and support legacy invoices without mapped occupants
ALTER TABLE `invoice`
    ADD COLUMN `importCode` VARCHAR(191) NULL,
    MODIFY `occupantId` VARCHAR(191) NULL;

ALTER TABLE `payment`
    ADD COLUMN `importCode` VARCHAR(191) NULL;

-- Expand expense categories to include Excel operational categories.
ALTER TABLE `financialrecord`
    MODIFY `expenseCategory` ENUM(
        'ASSET_REPAIR',
        'OTHERS',
        'LISTRIK',
        'GAJI_PRT',
        'OPS_DAPUR',
        'BTN',
        'INTERNET',
        'LAIN_LAIN'
    ) NULL;

-- Natural keys used by the idempotent SQL seed.
CREATE UNIQUE INDEX `Room_name_key` ON `room`(`name`);
CREATE UNIQUE INDEX `AssetMaster_name_key` ON `assetmaster`(`name`);
CREATE UNIQUE INDEX `Asset_roomId_assetMasterId_name_key` ON `asset`(`roomId`, `assetMasterId`, `name`);
CREATE UNIQUE INDEX `Invoice_importCode_key` ON `invoice`(`importCode`);
CREATE UNIQUE INDEX `Payment_importCode_key` ON `payment`(`importCode`);
CREATE UNIQUE INDEX `InvoicePayment_invoiceId_paymentId_amountApplied_key` ON `invoicepayment`(`invoiceId`, `paymentId`, `amountApplied`);
CREATE UNIQUE INDEX `FinancialRecord_type_expenseCategory_amount_description_date_key`
    ON `financialrecord`(`type`, `expenseCategory`, `amount`, `description`(191), `date`);
