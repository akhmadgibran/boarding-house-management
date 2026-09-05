-- name: GetAllUsers :many
SELECT u.id, u.email, u.role, u.created_at, u.updated_at,
       o.id as occupant_id, o.name as occupant_name, o.phone_number as occupant_phone, 
       o.address as occupant_address, o.occupation as occupant_occupation, o.status as occupant_status,
       o.move_in_date as occupant_move_in, o.move_out_date as occupant_move_out,
       op.id as operator_id, op.name as operator_name, op.phone_number as operator_phone,
       op.address as operator_address, op.status as operator_status
FROM users u
LEFT JOIN occupant_details o ON u.id = o.user_id
LEFT JOIN operator_details op ON u.id = op.user_id
WHERE u.deleted_at IS NULL
ORDER BY u.created_at DESC;

-- name: SoftDeleteUser :exec
UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1;

-- name: CreateOperatorDetails :one
INSERT INTO operator_details (user_id, name, phone_number, address, status)
VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: UpdateOperatorDetails :one
UPDATE operator_details 
SET name = $2, phone_number = $3, address = $4, status = $5, updated_at = CURRENT_TIMESTAMP
WHERE user_id = $1 RETURNING *;

-- name: CreateOccupantDetails :one
INSERT INTO occupant_details (user_id, name, phone_number, address, occupation, status, move_in_date, move_out_date)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;

-- name: UpdateOccupantDetails :one
UPDATE occupant_details 
SET name = $2, phone_number = $3, address = $4, occupation = $5, status = $6, move_in_date = $7, move_out_date = $8, updated_at = CURRENT_TIMESTAMP
WHERE user_id = $1 RETURNING *;
