-- name: ListInvoices :many
SELECT * FROM invoices ORDER BY period_start DESC;

-- name: ListFinancialRecords :many
SELECT * FROM financial_records ORDER BY created_at DESC;

-- name: CreatePayment :one
INSERT INTO payments (occupant_id, amount, payment_method, note, payment_date, import_code)
VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5) RETURNING *;

-- name: CreateInvoicePayment :exec
INSERT INTO invoice_payments (invoice_id, payment_id, amount_applied)
VALUES ($1, $2, $3);

-- name: UpdateInvoiceStatus :exec
UPDATE invoices SET status = $2, paid_nominal = paid_nominal + $3 WHERE id = $1;

-- name: CreateInvoice :one
INSERT INTO invoices (room_id, occupant_id, price_applied, period_start, period_end, status, is_dp_reservation, waiting_for_room_vacant, prior_occupant_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;

-- name: GetInvoice :one
SELECT * FROM invoices WHERE id = $1 LIMIT 1;

-- name: ListInvoicesWithDetails :many
SELECT 
    i.*,
    (SELECT json_build_object('id', r.id, 'name', r.name, 'price', r.price) FROM rooms r WHERE r.id = i.room_id) as room,
    (SELECT json_build_object('id', u.id, 'email', u.email, 'occupantDetails', json_build_object('name', od.name, 'status', od.status)) 
     FROM users u JOIN occupant_details od ON u.id = od.user_id WHERE u.id = i.occupant_id) as occupant,
    (SELECT json_build_object('id', u.id, 'email', u.email, 'occupantDetails', json_build_object('name', od.name, 'status', od.status)) 
     FROM users u JOIN occupant_details od ON u.id = od.user_id WHERE u.id = i.prior_occupant_id) as prior_occupant,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', ip.id,
            'amountApplied', ip.amount_applied,
            'payment', json_build_object(
                'id', p.id,
                'amount', p.amount,
                'paymentDate', p.payment_date,
                'paymentMethod', p.payment_method,
                'note', p.note
            )
        ))
        FROM invoice_payments ip
        JOIN payments p ON ip.payment_id = p.id
        WHERE ip.invoice_id = i.id),
        '[]'::json
    ) as invoice_payments
FROM invoices i
ORDER BY i.period_start DESC;

-- name: ListFinancialRecordsWithDetails :many
SELECT 
    fr.*,
    (SELECT json_build_object('id', u.id, 'email', u.email, 'occupantDetails', json_build_object('name', od.name, 'status', od.status)) 
     FROM users u JOIN occupant_details od ON u.id = od.user_id 
     JOIN payments p ON fr.payment_id = p.id WHERE p.occupant_id = u.id) as occupant,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', ip.id,
            'amountApplied', ip.amount_applied,
            'invoice', json_build_object(
                'id', i.id,
                'periodStart', i.period_start,
                'periodEnd', i.period_end,
                'room', (SELECT json_build_object('id', r.id, 'name', r.name) FROM rooms r WHERE r.id = i.room_id)
            )
        ))
        FROM payments p
        JOIN invoice_payments ip ON ip.payment_id = p.id
        JOIN invoices i ON ip.invoice_id = i.id
        WHERE p.id = fr.payment_id),
        '[]'::json
    ) as invoice_payments
FROM financial_records fr
ORDER BY fr.created_at DESC;
-- name: GetOccupantInvoices :many
SELECT 
    i.*,
    (SELECT json_build_object('id', r.id, 'name', r.name, 'price', r.price) FROM rooms r WHERE r.id = i.room_id) as room,
    (SELECT json_build_object('id', u.id, 'email', u.email, 'occupantDetails', json_build_object('name', od.name, 'status', od.status)) 
     FROM users u JOIN occupant_details od ON u.id = od.user_id WHERE u.id = i.occupant_id) as occupant,
    (SELECT json_build_object('id', u.id, 'email', u.email, 'occupantDetails', json_build_object('name', od.name, 'status', od.status)) 
     FROM users u JOIN occupant_details od ON u.id = od.user_id WHERE u.id = i.prior_occupant_id) as prior_occupant,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', ip.id,
            'amountApplied', ip.amount_applied,
            'payment', json_build_object(
                'id', p.id,
                'amount', p.amount,
                'paymentDate', p.payment_date,
                'paymentMethod', p.payment_method,
                'note', p.note
            )
        ))
        FROM invoice_payments ip
        JOIN payments p ON ip.payment_id = p.id
        WHERE ip.invoice_id = i.id),
        '[]'::json
    ) as invoice_payments
FROM invoices i
WHERE i.occupant_id = $1
ORDER BY i.period_start DESC;

-- name: GetOccupantTransactions :many
SELECT 
    fr.*,
    (SELECT json_build_object('id', u.id, 'email', u.email, 'occupantDetails', json_build_object('name', od.name, 'status', od.status)) 
     FROM users u JOIN occupant_details od ON u.id = od.user_id 
     JOIN payments p ON fr.payment_id = p.id WHERE p.occupant_id = u.id) as occupant,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', ip.id,
            'amountApplied', ip.amount_applied,
            'invoice', json_build_object(
                'id', i.id,
                'periodStart', i.period_start,
                'periodEnd', i.period_end,
                'room', (SELECT json_build_object('id', r.id, 'name', r.name) FROM rooms r WHERE r.id = i.room_id)
            )
        ))
        FROM payments p
        JOIN invoice_payments ip ON ip.payment_id = p.id
        JOIN invoices i ON ip.invoice_id = i.id
        WHERE p.id = fr.payment_id),
        '[]'::json
    ) as invoice_payments
FROM financial_records fr
JOIN payments p ON fr.payment_id = p.id
WHERE p.occupant_id = $1
ORDER BY fr.created_at DESC;

-- name: DeleteInvoice :exec
DELETE FROM invoices WHERE id = $1 AND status = 'UNPAID';
