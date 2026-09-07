package usecase

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"server-go/internal/complaint/repository"
	"server-go/internal/domain"
)

type complaintUseCase struct {
	repo repository.Querier
}

func NewComplaintUseCase(repo repository.Querier) domain.ComplaintUseCase {
	return &complaintUseCase{
		repo: repo,
	}
}

func (u *complaintUseCase) CreateComplaint(ctx context.Context, arg repository.CreateComplaintParams) (repository.Complaint, error) {
	return u.repo.CreateComplaint(ctx, arg)
}

func (u *complaintUseCase) GetAllComplaints(ctx context.Context) ([]repository.GetAllComplaintsRow, error) {
	complaints, err := u.repo.GetAllComplaints(ctx)
	if err != nil {
		return nil, errors.New("failed to fetch complaints")
	}
	if complaints == nil {
		complaints = []repository.GetAllComplaintsRow{}
	}
	return complaints, nil
}

func (u *complaintUseCase) GetOccupantComplaints(ctx context.Context, reportedByID uuid.UUID) ([]repository.GetComplaintsByReporterRow, error) {
	complaints, err := u.repo.GetComplaintsByReporter(ctx, reportedByID)
	if err != nil {
		return nil, errors.New("failed to fetch complaints")
	}
	if complaints == nil {
		complaints = []repository.GetComplaintsByReporterRow{}
	}
	return complaints, nil
}


func (u *complaintUseCase) GetOccupantAssets(ctx context.Context, occupantID uuid.UUID) ([]repository.GetOccupantCurrentRoomAssetsRow, error) {
	pgUUID := pgtype.UUID{Bytes: occupantID, Valid: true}
	assets, err := u.repo.GetOccupantCurrentRoomAssets(ctx, pgUUID)
	if err != nil {
		return nil, errors.New("failed to fetch occupant assets")
	}
	if assets == nil {
		assets = []repository.GetOccupantCurrentRoomAssetsRow{}
	}
	return assets, nil
}
func (u *complaintUseCase) UpdateComplaintStatus(ctx context.Context, id uuid.UUID, status string, maintenanceDetails *string) (repository.Complaint, error) {
	comp, err := u.repo.UpdateComplaintStatus(ctx, repository.UpdateComplaintStatusParams{
		ID:     id,
		Status: repository.ComplaintStatusEnum(status),
	})
	if err != nil {
		return comp, err
	}
	
	if maintenanceDetails != nil && comp.AssetID.Valid {
		_, err = u.repo.CreateAssetMaintenanceLog(ctx, repository.CreateAssetMaintenanceLogParams{
			AssetID: comp.AssetID.Bytes,
			Details: *maintenanceDetails,
			Status:  repository.MaintenanceStatusEnumFINISHED, // Default to FINISHED
		})
	}
	
	return comp, nil
}
