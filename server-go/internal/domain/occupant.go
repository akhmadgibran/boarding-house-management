package domain

import (
	"context"
	"github.com/google/uuid"
	"server-go/internal/occupant/repository"
)

type OccupantUseCase interface {
	ListOccupants(ctx context.Context) ([]repository.ListOccupantsRow, error)
	GetOccupantDetail(ctx context.Context, userID uuid.UUID) (repository.GetOccupantDetailRow, error)
	CreateOccupant(ctx context.Context, email, password, name, phone, idCard, emergencyContact string) (repository.OccupantDetail, error)
	UpdateOccupant(ctx context.Context, userID uuid.UUID, name, phone, idCard, emergencyContact string) (repository.OccupantDetail, error)
	UpdateOccupantStatus(ctx context.Context, userID uuid.UUID, status string) (repository.OccupantDetail, error)
}
