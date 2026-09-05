package main

import (
	"server-go/internal/scheduler"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	httpSwagger "github.com/swaggo/http-swagger"

	_ "server-go/docs" // Swagger docs

	authDelivery "server-go/internal/auth/delivery"
	authRepository "server-go/internal/auth/repository"
	authUseCase "server-go/internal/auth/usecase"

	roomDelivery "server-go/internal/room/delivery"
	dashboardDelivery "server-go/internal/dashboard/delivery"
	roomRepository "server-go/internal/room/repository"
	roomUseCase "server-go/internal/room/usecase"

	occupantDelivery "server-go/internal/occupant/delivery"
	occupantRepository "server-go/internal/occupant/repository"
	occupantUseCase "server-go/internal/occupant/usecase"

	assetDelivery "server-go/internal/asset/delivery"
	assetRepository "server-go/internal/asset/repository"
	assetUseCase "server-go/internal/asset/usecase"

	paymentDelivery "server-go/internal/payment/delivery"
	paymentRepository "server-go/internal/payment/repository"
	paymentUseCase "server-go/internal/payment/usecase"
	complaintDelivery "server-go/internal/complaint/delivery"
	complaintRepository "server-go/internal/complaint/repository"
	complaintUseCase "server-go/internal/complaint/usecase"

	financeDelivery "server-go/internal/finance/delivery"
	financeRepository "server-go/internal/finance/repository"
	financeUseCase "server-go/internal/finance/usecase"
)

// @title Boarding House Management API
// @version 1.0
// @description API Server for Kost Management System.
// @host localhost:8080
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error loading it.")
	}

	dbURL := os.Getenv("DATABASE_URL")
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbPool.Close()

	if err := dbPool.Ping(context.Background()); err != nil {
		log.Fatalf("Unable to ping database: %v\n", err)
	}

	log.Println("Database connection established")

	validate := validator.New()

	// Init Repositories
	authRepo := authRepository.New(dbPool)
	roomRepo := roomRepository.New(dbPool)
	occupantRepo := occupantRepository.New(dbPool)
	assetRepo := assetRepository.New(dbPool)
	paymentRepo := paymentRepository.New(dbPool)

	// Init UseCases
	authUC := authUseCase.NewAuthUseCase(authRepo)
	roomUC := roomUseCase.NewRoomUseCase(roomRepo, dbPool)
	occupantUC := occupantUseCase.NewOccupantUseCase(occupantRepo)
	assetUC := assetUseCase.NewAssetUseCase(assetRepo)
	paymentUC := paymentUseCase.NewPaymentUseCase(paymentRepo, dbPool)
	complaintRepo := complaintRepository.New(dbPool)
	complaintUC := complaintUseCase.NewComplaintUseCase(complaintRepo)

	financeRepo := financeRepository.New(dbPool)
	financeUC := financeUseCase.NewFinanceUseCase(financeRepo)

	// Init Scheduler
	sched := scheduler.NewSchedulerService(dbPool)
	sched.Start()
	defer sched.Stop()

	// Init Router
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "ok", "message": "Server-go is running!"}`))
	})

	// Swagger Route
	r.Get("/swagger/*", httpSwagger.WrapHandler)

	// Init Delivery (Handlers)
	authDelivery.NewAuthHandler(r, authUC, validate)
	roomDelivery.NewRoomHandler(r, roomUC)
	occupantDelivery.NewOccupantHandler(r, occupantUC)
	assetDelivery.NewAssetHandler(r, assetUC)
	paymentDelivery.NewPaymentHandler(r, paymentUC)
	complaintDelivery.NewComplaintHandler(r, complaintUC)
	financeDelivery.NewFinanceHandler(r, financeUC)
	dashboardDelivery.NewDashboardHandler(r, dbPool)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s...", port)
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
