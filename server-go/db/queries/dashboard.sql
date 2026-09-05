-- name: GetTotalRooms :one
SELECT COUNT(*) FROM rooms;

-- name: GetOccupiedRoomsCount :one
SELECT COUNT(*) FROM rooms WHERE status = 'OCCUPIED';

-- name: GetActiveTenantsCount :one
SELECT COUNT(DISTINCT user_id) FROM occupant_details WHERE status = 'ACTIVE';

-- name: GetMonthlyIncome :one
SELECT COALESCE(SUM(amount), 0)::numeric FROM financial_records 
WHERE type = 'INCOME' AND date >= $1 AND date <= $2;

-- name: GetTotalIncome :one
SELECT COALESCE(SUM(amount), 0)::numeric FROM financial_records WHERE type = 'INCOME';

-- name: GetTotalExpense :one
SELECT COALESCE(SUM(amount), 0)::numeric FROM financial_records WHERE type = 'EXPENSE';

-- name: GetRecentActivities :many
SELECT fr.id, fr.amount, fr.date, fr.type, 
       COALESCE(p.payment_method, 'CASH')::text as method,
       COALESCE(od.name, 'System') as tenant_name
FROM financial_records fr
LEFT JOIN payments p ON fr.id = p.id
LEFT JOIN occupant_details od ON p.occupant_id = od.user_id
WHERE fr.type = 'INCOME'
ORDER BY fr.date DESC LIMIT 5;

-- name: GetRecentComplaints :many
SELECT c.id, c.category::text as category, c.status::text as status, c.created_at, od.name as tenant_name
FROM complaints c
LEFT JOIN occupant_details od ON c.reported_by_id = od.user_id
ORDER BY c.created_at DESC LIMIT 5;
