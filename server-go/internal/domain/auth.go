package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
	"server-go/internal/auth/repository"
)

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Role     string `json:"role" validate:"required,oneof=ADMIN OPERATOR OCCUPANT"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  interface{} `json:"user"`
}

type CreateOperatorRequest struct {
	UserID      uuid.UUID `json:"user_id" validate:"required"`
	Name        string    `json:"name" validate:"required"`
	PhoneNumber string    `json:"phone_number" validate:"required"`
	Address     string    `json:"address" validate:"required"`
	Status      string    `json:"status" validate:"required,oneof=ACTIVE INACTIVE"`
}

type CreateOccupantRequest struct {
	UserID      uuid.UUID  `json:"user_id" validate:"required"`
	Name        string     `json:"name" validate:"required"`
	PhoneNumber string     `json:"phone_number"`
	Address     string     `json:"address"`
	Occupation  string     `json:"occupation" validate:"required,oneof=BEKERJA KULIAH"`
	Status      string     `json:"status" validate:"required,oneof=ACTIVE INACTIVE"`
	MoveInDate  *time.Time `json:"move_in_date"`
	MoveOutDate *time.Time `json:"move_out_date"`
}

type UpdateOperatorRequest struct {
	Name        string `json:"name" validate:"required"`
	PhoneNumber string `json:"phone_number" validate:"required"`
	Address     string `json:"address" validate:"required"`
	Status      string `json:"status" validate:"required,oneof=ACTIVE INACTIVE"`
}

type UpdateOccupantRequest struct {
	Name        string     `json:"name" validate:"required"`
	PhoneNumber string     `json:"phone_number"`
	Address     string     `json:"address"`
	Occupation  string     `json:"occupation" validate:"required,oneof=BEKERJA KULIAH"`
	Status      string     `json:"status" validate:"required,oneof=ACTIVE INACTIVE"`
	MoveInDate  *time.Time `json:"move_in_date"`
	MoveOutDate *time.Time `json:"move_out_date"`
}

type AuthUseCase interface {
	Register(ctx context.Context, req RegisterRequest) (repository.User, error)
	Login(ctx context.Context, req LoginRequest) (LoginResponse, error)
	GetMe(ctx context.Context, userID uuid.UUID) (repository.GetMeRow, error)

	// Admin User Management
	GetAllUsers(ctx context.Context) ([]repository.GetAllUsersRow, error)
	CreateOperator(ctx context.Context, req CreateOperatorRequest) (repository.OperatorDetail, error)
	CreateOccupant(ctx context.Context, req CreateOccupantRequest) (repository.OccupantDetail, error)
	UpdateOperator(ctx context.Context, userID uuid.UUID, req UpdateOperatorRequest) (repository.OperatorDetail, error)
	UpdateOccupant(ctx context.Context, userID uuid.UUID, req UpdateOccupantRequest) (repository.OccupantDetail, error)
	SoftDeleteUser(ctx context.Context, userID uuid.UUID) error
}

