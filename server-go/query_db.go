package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := "postgres://kost_user:kost_password@localhost:5432/kost_db?sslmode=disable"
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		fmt.Println("Unable to connect to database:", err)
		os.Exit(1)
	}
	defer pool.Close()

	rows, err := pool.Query(context.Background(), "SELECT i.id, i.room_id, i.period_start, i.period_end, i.status FROM invoices i JOIN users u ON u.id = i.occupant_id WHERE u.email = 'alfi-a2@gmail.com'")
	if err != nil {
		fmt.Println("Query failed:", err)
		os.Exit(1)
	}
	defer rows.Close()

	for rows.Next() {
		var id, roomId, start, end, status string
		rows.Scan(&id, &roomId, &start, &end, &status)
		fmt.Printf("Invoice: %s, Room: %s, Start: %s, End: %s, Status: %s\n", id, roomId, start, end, status)
	}
}
