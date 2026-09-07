-- name: ListRooms :many
SELECT * FROM rooms
ORDER BY name ASC;

-- name: GetRoom :one
SELECT * FROM rooms
WHERE id = $1 LIMIT 1;

-- name: CreateRoom :one
INSERT INTO rooms (name, price, status)
VALUES ($1, $2, $3) RETURNING *;

-- name: UpdateRoom :one
UPDATE rooms 
SET name = $2, price = $3, status = $4, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 RETURNING *;

-- name: DeleteRoom :exec
DELETE FROM rooms WHERE id = $1;

-- name: LockRoom :one
SELECT * FROM rooms WHERE id = $1 FOR UPDATE;

-- name: GetActiveRoomOccupancy :one
SELECT * FROM invoices 
WHERE room_id = $1 AND period_end > CURRENT_TIMESTAMP AND waiting_for_room_vacant = false
ORDER BY period_start ASC LIMIT 1;

-- name: TruncateInvoicePeriod :exec
UPDATE invoices SET period_end = CURRENT_TIMESTAMP WHERE id = $1;

-- name: LockUser :one
SELECT id FROM users WHERE id = $1 FOR UPDATE;

-- name: DeactivateOccupant :exec
UPDATE occupant_details SET status = 'INACTIVE', move_out_date = CURRENT_TIMESTAMP WHERE user_id = $1;

-- name: GetWaitingReservation :one
SELECT * FROM invoices 
WHERE room_id = $1 AND waiting_for_room_vacant = true AND is_dp_reservation = true AND period_end > CURRENT_TIMESTAMP
ORDER BY period_start ASC LIMIT 1;

-- name: ActivateReservation :exec
UPDATE invoices 
SET waiting_for_room_vacant = false, is_dp_reservation = false, prior_occupant_id = NULL 
WHERE id = $1;

-- name: ActivateOccupant :exec
UPDATE occupant_details SET status = 'ACTIVE', move_in_date = CURRENT_TIMESTAMP, move_out_date = NULL WHERE user_id = $1;


-- name: ListRoomsWithAssets :many
SELECT 
    r.id, r.name, r.status, r.price, r.created_at, r.updated_at,
    COALESCE(
        (SELECT json_agg(json_build_object(
                        'id', a.id,
            'assetMasterId', a.asset_master_id,
            'name', m.name,
            'details', a.details,
            'status', a.status,
            'roomId', a.room_id,
            'assetMaster', json_build_object(
                'id', m.id,
                'name', m.name
            )
        ))
        FROM assets a
        JOIN asset_masters m ON a.asset_master_id = m.id
        WHERE a.room_id = r.id), 
        '[]'::json
    )::json as assets,
    (SELECT COUNT(*) FROM invoices WHERE room_id = r.id) as invoices_count,
    (SELECT COUNT(DISTINCT p.id) FROM invoices i JOIN invoice_payments ip ON i.id = ip.invoice_id JOIN payments p ON ip.payment_id = p.id WHERE i.room_id = r.id) as payments_count,
    (SELECT json_build_object('id', u.id, 'email', u.email, 'name', od.name)
     FROM occupant_details od 
     JOIN users u ON od.user_id = u.id 
     JOIN invoices i ON i.occupant_id = u.id
     WHERE i.room_id = r.id AND od.status = 'ACTIVE' LIMIT 1
    )::json as active_occupant
FROM rooms r
ORDER BY r.name ASC;
-- name: GetRoomDetails :one
SELECT 
    r.id, r.name, r.price, r.status,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', a.id,
            'assetMasterId', a.asset_master_id,
            'roomId', a.room_id,
            'name', a.name,
            'details', a.details,
            'status', a.status,
            'assetMaster', (SELECT json_build_object('id', am.id, 'name', am.name) FROM asset_masters am WHERE am.id = a.asset_master_id),
            'maintenanceLog', COALESCE(
                (SELECT json_agg(json_build_object(
                    'id', aml.id,
                    'assetId', aml.asset_id,
                    'details', aml.details,
                    'status', aml.status
                )) FROM asset_maintenance_log aml WHERE aml.asset_id = a.id),
                '[]'::json
            )
        )) FROM assets a WHERE a.room_id = r.id),
        '[]'::json
    ) as assets,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', i.id,
            'paidDate', (SELECT MAX(p.payment_date) FROM invoice_payments ip JOIN payments p ON ip.payment_id = p.id WHERE ip.invoice_id = i.id),
            'priceApplied', i.price_applied,
            'paidNominal', i.paid_nominal,
            'periodStart', i.period_start,
            'periodEnd', i.period_end,
            'status', i.status,
            'paymentMethod', (SELECT p.payment_method FROM invoice_payments ip JOIN payments p ON ip.payment_id = p.id WHERE ip.invoice_id = i.id ORDER BY p.payment_date DESC LIMIT 1),
            'occupant', (SELECT json_build_object(
                'email', u.email,
                'occupantDetails', json_build_object('name', od.name)
            ) FROM users u JOIN occupant_details od ON u.id = od.user_id WHERE u.id = i.occupant_id)
        )) FROM invoices i WHERE i.room_id = r.id),
        '[]'::json
    ) as payments
FROM rooms r
WHERE r.id = $1 LIMIT 1;
-- name: GetOccupantActiveRoom :one
SELECT room_id FROM invoices 
WHERE occupant_id = $1 AND period_end > CURRENT_TIMESTAMP AND waiting_for_room_vacant = false
ORDER BY period_start ASC LIMIT 1;
