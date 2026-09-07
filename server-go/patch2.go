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
