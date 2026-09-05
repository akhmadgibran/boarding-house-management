package main

import (
	"context"
	"log"
	"os"
	"io/ioutil"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file found")
	}

	dbURL := os.Getenv("DATABASE_URL")
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer dbPool.Close()

	sqlBytes, err := ioutil.ReadFile("../docs/postgres_seed.sql")
	if err != nil {
		log.Fatalf("Failed to read SQL file: %v", err)
	}

	_, err = dbPool.Exec(context.Background(), string(sqlBytes))
	if err != nil {
		log.Fatalf("Failed to execute SQL: %v", err)
	}

	log.Println("Successfully applied postgres_seed.sql!")
}
