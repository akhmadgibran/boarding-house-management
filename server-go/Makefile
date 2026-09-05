include .env
export

run:
	air

build:
	go build -o tmp/main cmd/api/main.go

migrate-create:
	goose -dir db/migrations postgres "${DATABASE_URL}" create $(name) sql

migrate-up:
	goose -dir db/migrations postgres "${DATABASE_URL}" up

migrate-down:
	goose -dir db/migrations postgres "${DATABASE_URL}" down

sqlc:
	sqlc generate

seed:
	go run cmd/seeder/main.go
