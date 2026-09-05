package usecase

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"server-go/internal/asset/repository"
	"server-go/internal/domain"
)

type assetUseCase struct {
	repo repository.Querier
}

func NewAssetUseCase(repo repository.Querier) domain.AssetUseCase {
	return &assetUseCase{
		repo: repo,
	}
}

func (u *assetUseCase) ListAssets(ctx context.Context) ([]repository.ListAssetsRow, error) {
	assets, err := u.repo.ListAssets(ctx)
	if err != nil {
		return nil, errors.New("failed to fetch assets")
	}
	if assets == nil {
		assets = []repository.ListAssetsRow{}
	}
	return assets, nil
}

func (u *assetUseCase) ListAssetsByRoom(ctx context.Context, roomID uuid.UUID) ([]repository.ListAssetsByRoomRow, error) {
	assets, err := u.repo.ListAssetsByRoom(ctx, roomID)
	if err != nil {
		return nil, errors.New("failed to fetch assets for room")
	}
	if assets == nil {
		assets = []repository.ListAssetsByRoomRow{}
	}
	return assets, nil
}

func (u *assetUseCase) CreateAssetMaster(ctx context.Context, name string) (repository.AssetMaster, error) {
	return u.repo.CreateAssetMaster(ctx, name)
}

func (u *assetUseCase) UpdateAssetMaster(ctx context.Context, id uuid.UUID, name string) (repository.AssetMaster, error) {
	return u.repo.UpdateAssetMaster(ctx, repository.UpdateAssetMasterParams{
		ID:   id,
		Name: name,
	})
}

func (u *assetUseCase) DeleteAssetMaster(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteAssetMaster(ctx, id)
}

func (u *assetUseCase) CreateMaintenanceLog(ctx context.Context, arg repository.CreateMaintenanceLogParams) (repository.AssetMaintenanceLog, error) {
	return u.repo.CreateMaintenanceLog(ctx, arg)
}

func (u *assetUseCase) UpdateMaintenanceLog(ctx context.Context, arg repository.UpdateMaintenanceLogParams) (repository.AssetMaintenanceLog, error) {
	return u.repo.UpdateMaintenanceLog(ctx, arg)
}

func (u *assetUseCase) DeleteMaintenanceLog(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteMaintenanceLog(ctx, id)
}

func (u *assetUseCase) GetMaintenanceLogsByAssetId(ctx context.Context, assetID uuid.UUID) ([]repository.AssetMaintenanceLog, error) {
	logs, err := u.repo.GetMaintenanceLogsByAssetId(ctx, assetID)
	if logs == nil {
		logs = []repository.AssetMaintenanceLog{}
	}
	return logs, err
}

func (u *assetUseCase) ListAssetMasters(ctx context.Context) ([]repository.ListAssetMastersRow, error) {
	return u.repo.ListAssetMasters(ctx)
}
