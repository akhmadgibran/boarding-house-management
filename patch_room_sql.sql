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
