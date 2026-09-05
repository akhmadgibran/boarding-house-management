package domain

import (
	"context"
	"github.com/google/uuid"
	"server-go/internal/occupant/repository"
)

type OccupantUseCase interface {
	ListOccupants(ctx context.Context) ([]repository.ListOccupantsRow, error)
	GetOccupantDetail(ctx context.Context, userID uuid.UUID) (repository.GetOccupantDetailRow, error)
}
