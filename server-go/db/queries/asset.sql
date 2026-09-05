-- name: ListAssets :many
SELECT a.*, m.name as master_name
FROM assets a
JOIN asset_masters m ON a.asset_master_id = m.id
ORDER BY a.created_at DESC;

-- name: ListAssetsByRoom :many
SELECT a.*, m.name as master_name
FROM assets a
JOIN asset_masters m ON a.asset_master_id = m.id
WHERE a.room_id = $1
ORDER BY a.created_at DESC;

-- name: CreateAssetMaster :one
INSERT INTO asset_masters (name) VALUES ($1) RETURNING *;

-- name: UpdateAssetMaster :one
UPDATE asset_masters SET name = $2 WHERE id = $1 RETURNING *;

-- name: DeleteAssetMaster :exec
DELETE FROM asset_masters WHERE id = $1;

-- name: CreateMaintenanceLog :one
INSERT INTO asset_maintenance_log (asset_id, details, status)
VALUES ($1, $2, $3) RETURNING *;

-- name: UpdateMaintenanceLog :one
UPDATE asset_maintenance_log 
SET details = $2, status = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 RETURNING *;

-- name: DeleteMaintenanceLog :exec
DELETE FROM asset_maintenance_log WHERE id = $1;

-- name: GetMaintenanceLogsByAssetId :many
SELECT * FROM asset_maintenance_log WHERE asset_id = $1 ORDER BY created_at DESC;

-- name: ListAssetMasters :many
SELECT 
    am.id, am.name, am.created_at, am.updated_at,
    (SELECT COUNT(*) FROM assets a WHERE a.asset_master_id = am.id) as assets_count
FROM asset_masters am
ORDER BY am.name ASC;
