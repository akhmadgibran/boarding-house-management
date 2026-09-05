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
