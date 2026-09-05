-- +goose Up

-- 1. Create Missing Enums
CREATE TYPE maintenance_status_enum AS ENUM ('PROCESS', 'PENDING', 'FINISHED');
CREATE TYPE complaint_category_enum AS ENUM ('ASSET', 'OTHERS');
CREATE TYPE complaint_status_enum AS ENUM ('PENDING', 'PROCESSED', 'RESOLVED');
CREATE TYPE payment_method_enum AS ENUM ('TRANSFER', 'QRIS', 'E_WALLET', 'CASH');
CREATE TYPE expense_category_enum AS ENUM ('ASSET_REPAIR', 'LISTRIK', 'GAJI_PRT', 'OPS_DAPUR', 'BTN', 'INTERNET', 'LAIN_LAIN');
CREATE TYPE occupant_occupation_enum AS ENUM ('BEKERJA', 'KULIAH');

-- 2. Alter Existing Tables

-- Users
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Occupant Details
ALTER TABLE occupant_details DROP COLUMN occupation;
ALTER TABLE occupant_details ADD COLUMN occupation occupant_occupation_enum NOT NULL DEFAULT 'BEKERJA';

-- Invoices
ALTER TABLE invoices ADD COLUMN import_code VARCHAR(100) UNIQUE;
ALTER TABLE invoices ADD COLUMN is_dp_reservation BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN waiting_for_room_vacant BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN prior_occupant_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE invoices ALTER COLUMN occupant_id DROP NOT NULL; -- In Prisma schema, occupantId is optional

-- Payments
ALTER TABLE payments ADD COLUMN import_code VARCHAR(100) UNIQUE;
ALTER TABLE payments ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE payments DROP COLUMN payment_method;
ALTER TABLE payments ADD COLUMN payment_method payment_method_enum NOT NULL DEFAULT 'CASH';

-- Financial Records
ALTER TABLE financial_records ADD COLUMN date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE financial_records ADD COLUMN asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE financial_records DROP COLUMN expense_category;
ALTER TABLE financial_records ADD COLUMN expense_category expense_category_enum;

-- 3. Create Missing Tables

CREATE TABLE operator_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    status profile_status_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asset_maintenance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    details TEXT NOT NULL,
    status maintenance_status_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category complaint_category_enum NOT NULL,
    detail TEXT NOT NULL,
    status complaint_status_enum NOT NULL DEFAULT 'PENDING',
    reported_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_occupancy_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INT NOT NULL,
    month INT NOT NULL,
    occupied_rooms INT NOT NULL,
    total_rooms INT NOT NULL,
    snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, month)
);

-- +goose Down
DROP TABLE IF EXISTS room_occupancy_snapshots;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS asset_maintenance_log;
DROP TABLE IF EXISTS operator_details;

ALTER TABLE financial_records DROP COLUMN expense_category;
ALTER TABLE financial_records ADD COLUMN expense_category VARCHAR(100);
ALTER TABLE financial_records DROP COLUMN asset_id;
ALTER TABLE financial_records DROP COLUMN date;

ALTER TABLE payments DROP COLUMN payment_method;
ALTER TABLE payments ADD COLUMN payment_method VARCHAR(100) NOT NULL DEFAULT 'CASH';
ALTER TABLE payments DROP COLUMN payment_date;
ALTER TABLE payments DROP COLUMN import_code;

ALTER TABLE invoices DROP COLUMN prior_occupant_id;
ALTER TABLE invoices DROP COLUMN waiting_for_room_vacant;
ALTER TABLE invoices DROP COLUMN is_dp_reservation;
ALTER TABLE invoices DROP COLUMN import_code;

ALTER TABLE occupant_details DROP COLUMN occupation;
ALTER TABLE occupant_details ADD COLUMN occupation TEXT;

ALTER TABLE users DROP COLUMN deleted_at;

DROP TYPE IF EXISTS occupant_occupation_enum;
DROP TYPE IF EXISTS expense_category_enum;
DROP TYPE IF EXISTS payment_method_enum;
DROP TYPE IF EXISTS complaint_status_enum;
DROP TYPE IF EXISTS complaint_category_enum;
DROP TYPE IF EXISTS maintenance_status_enum;
