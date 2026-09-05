-- name: CreateUser :one
INSERT INTO users (
    email, password, role
) VALUES (
    $1, $2, $3
) RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: GetMe :one
SELECT u.id, u.email, u.role, u.created_at, 
       o.name as occupant_name, o.phone_number as occupant_phone,
       op.name as operator_name, op.phone_number as operator_phone
FROM users u
LEFT JOIN occupant_details o ON u.id = o.user_id
LEFT JOIN operator_details op ON u.id = op.user_id
WHERE u.id = $1 LIMIT 1;
