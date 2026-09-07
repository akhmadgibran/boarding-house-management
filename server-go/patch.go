func (h *DashboardHandler) Backfill(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	totalRooms, _ := h.repo.GetTotalRooms(ctx)
	occupiedRooms, _ := h.repo.GetOccupiedRoomsCount(ctx)
	
	now := time.Now()
	_, err := h.repo.CreateOccupancySnapshot(ctx, repository.CreateOccupancySnapshotParams{
		Year:          int32(now.Year()),
		Month:         int32(now.Month()),
		OccupiedRooms: int32(occupiedRooms),
		TotalRooms:    int32(totalRooms),
	})
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Backfill triggered", nil)
}

func (h *DashboardHandler) GetOccupancy(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	snapshots, err := h.repo.GetOccupancySnapshots(ctx)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	var result []map[string]interface{}
	for _, s := range snapshots {
		result = append(result, map[string]interface{}{
			"year": s.Year,
			"month": s.Month,
			"occupiedRooms": s.OccupiedRooms,
			"totalRooms": s.TotalRooms,
		})
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	response.Success(w, http.StatusOK, "Occupancy retrieved", map[string]interface{}{"snapshots": result})
}
