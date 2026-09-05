package usecase

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"server-go/internal/domain"
	"server-go/internal/occupant/repository"
)

type occupantUseCase struct {
	repo repository.Querier
}

func NewOccupantUseCase(repo repository.Querier) domain.OccupantUseCase {
	return &occupantUseCase{
		repo: repo,
	}
}

func (u *occupantUseCase) ListOccupants(ctx context.Context) ([]repository.ListOccupantsRow, error) {
	occupants, err := u.repo.ListOccupants(ctx)
	if err != nil {
		return nil, errors.New("failed to fetch occupants")
	}
	if occupants == nil {
		occupants = []repository.ListOccupantsRow{}
	}
	return occupants, nil
}

func (u *occupantUseCase) GetOccupantDetail(ctx context.Context, userID uuid.UUID) (repository.GetOccupantDetailRow, error) {
	occupant, err := u.repo.GetOccupantDetail(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return repository.GetOccupantDetailRow{}, errors.New("occupant not found")
		}
		return repository.GetOccupantDetailRow{}, errors.New("failed to fetch occupant detail")
	}
	return occupant, nil
}
