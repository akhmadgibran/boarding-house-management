-- name: GetActiveInvoicesExpiringSoon :many
SELECT i.id, i.room_id, i.occupant_id, i.period_end, r.price as room_price 
FROM invoices i
JOIN rooms r ON i.room_id = r.id
JOIN occupant_details od ON i.occupant_id = od.user_id
WHERE i.waiting_for_room_vacant = false 
  AND od.status = 'ACTIVE'
  AND i.period_end <= $1
  AND i.period_end >= CURRENT_TIMESTAMP;

-- name: CheckInvoiceExistsForPeriod :one
SELECT id FROM invoices 
WHERE room_id = $1 AND occupant_id = $2 AND waiting_for_room_vacant = false
  AND period_start < $4 AND period_end > $3 LIMIT 1;

-- name: CountOccupiedRoomsForMonth :one
SELECT COUNT(DISTINCT room_id) 
FROM invoices 
WHERE occupant_id IS NOT NULL 
  AND waiting_for_room_vacant = false 
  AND period_start <= $1 AND period_end >= $1;

-- name: CountTotalRooms :one
SELECT COUNT(id) FROM rooms;

-- name: UpsertOccupancySnapshot :exec
INSERT INTO room_occupancy_snapshots (year, month, total_rooms, occupied_rooms, snapshot_date)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (year, month) DO UPDATE 
SET total_rooms = EXCLUDED.total_rooms, 
    occupied_rooms = EXCLUDED.occupied_rooms, 
    snapshot_date = EXCLUDED.snapshot_date,
    updated_at = CURRENT_TIMESTAMP;

-- name: CreateAutoInvoice :exec
INSERT INTO invoices (room_id, occupant_id, price_applied, paid_nominal, period_start, period_end, status, note, waiting_for_room_vacant, is_dp_reservation)
VALUES ($1, $2, $3, 0, $4, $5, 'UNPAID', 'Tagihan otomatis (auto-generated)', false, false);
