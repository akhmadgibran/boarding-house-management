package domain

import (
	"context"
	"github.com/google/uuid"
	"server-go/internal/asset/repository"
)

type AssetUseCase interface {
	ListAssets(ctx context.Context) ([]repository.ListAssetsRow, error)
	ListAssetsByRoom(ctx context.Context, roomID uuid.UUID) ([]repository.ListAssetsByRoomRow, error)

	ListAssetMasters(ctx context.Context) ([]repository.ListAssetMastersRow, error)
	CreateAssetMaster(ctx context.Context, name string) (repository.AssetMaster, error)
	UpdateAssetMaster(ctx context.Context, id uuid.UUID, name string) (repository.AssetMaster, error)
	DeleteAssetMaster(ctx context.Context, id uuid.UUID) error

	CreateMaintenanceLog(ctx context.Context, arg repository.CreateMaintenanceLogParams) (repository.AssetMaintenanceLog, error)
	UpdateMaintenanceLog(ctx context.Context, arg repository.UpdateMaintenanceLogParams) (repository.AssetMaintenanceLog, error)
	DeleteMaintenanceLog(ctx context.Context, id uuid.UUID) error
	GetMaintenanceLogsByAssetId(ctx context.Context, assetID uuid.UUID) ([]repository.AssetMaintenanceLog, error)
}
