package main

import (
	"context"
	"log"
	"os"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	dbURL := os.Getenv("DATABASE_URL")
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer dbPool.Close()

	ctx := context.Background()

	// Clear existing data safely due to constraints (in correct order or CASCADE)
	log.Println("Clearing existing data...")
	_, _ = dbPool.Exec(ctx, "TRUNCATE operator_details, asset_maintenance_log, complaints, room_occupancy_snapshots, users, rooms, asset_masters, assets, occupant_details, invoices, payments, invoice_payments, financial_records CASCADE")

	// 1. Create Admin
	hashedPw, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	var adminID uuid.UUID
	err = dbPool.QueryRow(ctx, "INSERT INTO users (email, password, role) VALUES ($1, $2, 'ADMIN') RETURNING id", "admin@kost.com", string(hashedPw)).Scan(&adminID)
	if err != nil {
		log.Fatalf("Admin seed failed: %v", err)
	}
	log.Printf("Seeded Admin: %v", adminID)

	// 2. Create Rooms
	roomNames := []string{"1A", "1B", "1C", "2A", "2B", "2C"}
	var roomIDs []uuid.UUID
	for _, name := range roomNames {
		var rID uuid.UUID
		err = dbPool.QueryRow(ctx, "INSERT INTO rooms (name, price, status) VALUES ($1, $2, 'VACANT') RETURNING id", name, 1500000).Scan(&rID)
		if err == nil {
			roomIDs = append(roomIDs, rID)
		}
	}
	log.Printf("Seeded %d Rooms", len(roomIDs))

	// 3. Asset Masters
	masterNames := []string{"Air Conditioner 1/2 PK", "Springbed Mattress", "Wardrobe"}
	var masterIDs []uuid.UUID
	for _, name := range masterNames {
		var mID uuid.UUID
		err = dbPool.QueryRow(ctx, "INSERT INTO asset_masters (name) VALUES ($1) RETURNING id", name).Scan(&mID)
		if err == nil {
			masterIDs = append(masterIDs, mID)
		}
	}

	// 4. Assign Assets to Rooms
	for _, rID := range roomIDs {
		for _, mID := range masterIDs {
			dbPool.Exec(ctx, "INSERT INTO assets (asset_master_id, room_id, name) VALUES ($1, $2, $3)", mID, rID, "Room Asset")
		}
	}
	log.Println("Seeded Asset Masters and Assets")

	// 5. Occupants
	var occupantUserID uuid.UUID
	err = dbPool.QueryRow(ctx, "INSERT INTO users (email, password, role) VALUES ($1, $2, 'OCCUPANT') RETURNING id", "john.doe@gmail.com", string(hashedPw)).Scan(&occupantUserID)
	if err == nil {
		dbPool.Exec(ctx, "INSERT INTO occupant_details (user_id, name, phone_number, occupation) VALUES ($1, $2, $3, $4)", occupantUserID, "John Doe", "081234567890", "KULIAH")
		
		// Update room status
		dbPool.Exec(ctx, "UPDATE rooms SET status = 'OCCUPIED' WHERE id = $1", roomIDs[0])
		log.Println("Seeded Occupant John Doe in Room 1A")
	}

	log.Println("✅ Seeding completed successfully!")
}
