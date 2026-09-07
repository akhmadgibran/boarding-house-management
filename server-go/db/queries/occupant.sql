-- name: ListOccupants :many
SELECT u.id, u.email, o.name, o.phone_number, o.status, o.move_in_date 
FROM users u
JOIN occupant_details o ON u.id = o.user_id
WHERE u.role = 'OCCUPANT'
ORDER BY o.name ASC;

-- name: GetOccupantDetail :one
SELECT u.email, o.* 
FROM users u
JOIN occupant_details o ON u.id = o.user_id
WHERE u.id = $1 LIMIT 1;


-- name: CreateUser :one
INSERT INTO users (email, password, role)
VALUES ($1, $2, 'OCCUPANT') RETURNING id;

-- name: CreateOccupantDetail :one
INSERT INTO occupant_details (user_id, name, phone_number, id_card_number, emergency_contact)
VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: UpdateOccupantDetail :one
UPDATE occupant_details
SET name = $2, phone_number = $3, id_card_number = $4, emergency_contact = $5, updated_at = CURRENT_TIMESTAMP
WHERE user_id = $1 RETURNING *;

-- name: UpdateOccupantStatus :one
UPDATE occupant_details
SET status = $2, updated_at = CURRENT_TIMESTAMP
WHERE user_id = $1 RETURNING *;
