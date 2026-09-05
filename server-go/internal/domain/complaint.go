package domain

import (
	"context"
	"github.com/google/uuid"
	"server-go/internal/complaint/repository"
)

type ComplaintUseCase interface {
	CreateComplaint(ctx context.Context, arg repository.CreateComplaintParams) (repository.Complaint, error)
	GetAllComplaints(ctx context.Context) ([]repository.GetAllComplaintsRow, error)
	GetOccupantComplaints(ctx context.Context, reportedByID uuid.UUID) ([]repository.GetComplaintsByReporterRow, error)
	UpdateComplaintStatus(ctx context.Context, id uuid.UUID, status string) (repository.Complaint, error)
}
