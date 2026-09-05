-- +goose Up
CREATE TYPE payment_status_enum AS ENUM ('PAID', 'UNPAID', 'OVERDUE');
CREATE TYPE transaction_type_enum AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    occupant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price_applied DECIMAL(10, 2) NOT NULL,
    paid_nominal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status payment_status_enum NOT NULL DEFAULT 'UNPAID',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occupant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount_applied DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE financial_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type transaction_type_enum NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    expense_category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
DROP TABLE IF EXISTS financial_records;
DROP TABLE IF EXISTS invoice_payments;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TYPE IF EXISTS transaction_type_enum;
DROP TYPE IF EXISTS payment_status_enum;
