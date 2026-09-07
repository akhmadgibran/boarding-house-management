package usecase

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
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

func (u *occupantUseCase) CreateOccupant(ctx context.Context, email, password, name, phone, idCard, emergencyContact string) (repository.OccupantDetail, error) {
	// Simple mock hashing for password
	userID, err := u.repo.CreateUser(ctx, repository.CreateUserParams{
		Email:    email,
		Password: password, // Should be hashed in real app
	})
	if err != nil {
		return repository.OccupantDetail{}, errors.New("failed to create user")
	}

	detail, err := u.repo.CreateOccupantDetail(ctx, repository.CreateOccupantDetailParams{
		UserID:           userID,
		Name:             name,
		PhoneNumber:      pgtype.Text{String: phone, Valid: phone != ""},
		IDCardNumber:     pgtype.Text{String: idCard, Valid: idCard != ""},
		EmergencyContact: pgtype.Text{String: emergencyContact, Valid: emergencyContact != ""},
	})
	if err != nil {
		return repository.OccupantDetail{}, errors.New("failed to create occupant detail")
	}

	return detail, nil
}

func (u *occupantUseCase) UpdateOccupant(ctx context.Context, userID uuid.UUID, name, phone, idCard, emergencyContact string) (repository.OccupantDetail, error) {
	detail, err := u.repo.UpdateOccupantDetail(ctx, repository.UpdateOccupantDetailParams{
		UserID:           userID,
		Name:             name,
		PhoneNumber:      pgtype.Text{String: phone, Valid: phone != ""},
		IDCardNumber:     pgtype.Text{String: idCard, Valid: idCard != ""},
		EmergencyContact: pgtype.Text{String: emergencyContact, Valid: emergencyContact != ""},
	})
	if err != nil {
		return repository.OccupantDetail{}, errors.New("failed to update occupant detail")
	}
	return detail, nil
}

func (u *occupantUseCase) UpdateOccupantStatus(ctx context.Context, userID uuid.UUID, status string) (repository.OccupantDetail, error) {
	detail, err := u.repo.UpdateOccupantStatus(ctx, repository.UpdateOccupantStatusParams{
		UserID: userID,
		Status: repository.ProfileStatusEnum(status),
	})
	if err != nil {
		return repository.OccupantDetail{}, errors.New("failed to update occupant status")
	}
	return detail, nil
}
