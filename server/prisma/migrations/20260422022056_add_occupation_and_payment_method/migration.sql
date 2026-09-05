-- AlterTable
ALTER TABLE `occupantdetails` ADD COLUMN `occupation` ENUM('BEKERJA', 'KULIAH') NOT NULL DEFAULT 'BEKERJA';

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `paymentMethod` ENUM('TRANSFER', 'QRIS', 'E_WALLET', 'CASH') NOT NULL DEFAULT 'CASH';
