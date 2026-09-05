-- name: CreateFinancialRecord :one
INSERT INTO financial_records (type, amount, description, payment_id, date, asset_id, expense_category)
VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;

-- name: UpdateExpense :one
UPDATE financial_records 
SET amount = $2, description = $3, expense_category = $4, date = $5, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND type = 'EXPENSE' RETURNING *;

-- name: DeleteFinancialRecord :exec
DELETE FROM financial_records WHERE id = $1;

-- name: GetAllFinancialRecords :many
SELECT f.*, p.import_code as payment_import_code, a.name as asset_name
FROM financial_records f
LEFT JOIN payments p ON f.payment_id = p.id
LEFT JOIN assets a ON f.asset_id = a.id
ORDER BY f.date DESC, f.created_at DESC;
