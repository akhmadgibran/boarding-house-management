-- name: CreateComplaint :one
INSERT INTO complaints (category, detail, status, reported_by_id, asset_id)
VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: GetAllComplaints :many
SELECT c.*, u.email as reporter_email, o.name as reporter_name, a.name as asset_name, r.name as room_name
FROM complaints c
JOIN users u ON c.reported_by_id = u.id
LEFT JOIN occupant_details o ON u.id = o.user_id
LEFT JOIN assets a ON c.asset_id = a.id
LEFT JOIN rooms r ON a.room_id = r.id
ORDER BY c.created_at DESC;

-- name: GetComplaintsByReporter :many
SELECT c.*, a.name as asset_name
FROM complaints c
LEFT JOIN assets a ON c.asset_id = a.id
WHERE c.reported_by_id = $1
ORDER BY c.created_at DESC;

-- name: UpdateComplaintStatus :one
UPDATE complaints 
SET status = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 RETURNING *;

-- name: GetOccupantCurrentRoomAssets :many
SELECT a.*, r.name as room_name, m.name as master_name
FROM assets a
JOIN rooms r ON a.room_id = r.id
JOIN asset_masters m ON a.asset_master_id = m.id
WHERE a.room_id = (
  SELECT room_id FROM invoices
  WHERE occupant_id = $1
  ORDER BY period_end DESC LIMIT 1
)
ORDER BY a.name ASC;

-- name: CreateAssetMaintenanceLog :one
INSERT INTO asset_maintenance_log (asset_id, details, status)
VALUES ($1, $2, $3) RETURNING *;
