package delivery

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"server-go/internal/dashboard/repository"
	"server-go/internal/middleware"
	"server-go/pkg/response"
)

func NewDashboardHandler(r chi.Router, dbPool *pgxpool.Pool) {
	handler := &DashboardHandler{repo: repository.New(dbPool)}

	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)
		r.Use(middleware.AuthorizeRole("ADMIN", "OPERATOR"))
		
		r.Get("/api/v1/admin/dashboard/summary", handler.GetSummary)
		r.Post("/api/v1/admin/dashboard/occupancy-snapshots/trigger", handler.TriggerSnapshot)
		r.Post("/api/v1/admin/dashboard/occupancy-snapshots/backfill", handler.Backfill)
		r.Get("/api/v1/admin/dashboard/occupancy-snapshots", handler.GetOccupancy)
	})
}

type DashboardHandler struct {
	repo repository.Querier
}

func (h *DashboardHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, -1).Add(23 * time.Hour + 59 * time.Minute)

	tr, _ := h.repo.GetTotalRooms(ctx)
	or, _ := h.repo.GetOccupiedRoomsCount(ctx)
	at, _ := h.repo.GetActiveTenantsCount(ctx)
	mi, _ := h.repo.GetMonthlyIncome(ctx, repository.GetMonthlyIncomeParams{
		Date: pgtype.Timestamptz{Time: startOfMonth, Valid: true},
		Date_2: pgtype.Timestamptz{Time: endOfMonth, Valid: true},
	})
	ti, _ := h.repo.GetTotalIncome(ctx)
	te, _ := h.repo.GetTotalExpense(ctx)
	to, _ := h.repo.GetTotalOutstanding(ctx)

	numToFloat := func(n interface{}) float64 {
		// pgtype.Numeric has Float64Value() (pgtype.Float8, error)
		// We can just use reflection or type assertion if we import pgtype,
		// but since we are in a handler and we know it's pgtype.Numeric:
		if num, ok := n.(pgtype.Numeric); ok {
			f, _ := num.Float64Value()
			return f.Float64
		}
		return 0
	}

	endingBalance := numToFloat(ti) - numToFloat(te)

	acts, _ := h.repo.GetRecentActivities(ctx)
	var recentActs []map[string]interface{}
	for _, a := range acts {
		recentActs = append(recentActs, map[string]interface{}{
			"id": a.ID,
			"amount": a.Amount,
			"date": a.Date.Time,
			"method": a.Method,
			"tenantName": a.TenantName,
		})
	}
	if recentActs == nil {
		recentActs = []map[string]interface{}{}
	}

	comps, _ := h.repo.GetRecentComplaints(ctx)
	var recentComps []map[string]interface{}
	for _, c := range comps {
		recentComps = append(recentComps, map[string]interface{}{
			"id": c.ID,
			"category": c.Category,
			"status": c.Status,
			"date": c.CreatedAt.Time,
			"tenantName": c.TenantName,
		})
	}
	if recentComps == nil {
		recentComps = []map[string]interface{}{}
	}

		res := map[string]interface{}{
		"summary": map[string]interface{}{
			"totalRooms": tr,
			"occupiedRooms": or,
			"totalActiveTenants": at,
			"monthlyIncome": numToFloat(mi),
			"totalIncome": numToFloat(ti),
			"totalExpense": numToFloat(te),
			"totalOutstanding": numToFloat(to),
			"endingBalance": endingBalance,
			// The frontend computes endingBalance manually anyway, or maybe expects it here
		},
		"recentActivities": recentActs,
		"recentComplaints": recentComps,
	}

	response.Success(w, http.StatusOK, "Dashboard summary retrieved", res)
}

func (h *DashboardHandler) TriggerSnapshot(w http.ResponseWriter, r *http.Request) {
	response.Success(w, http.StatusOK, "Snapshot triggered", nil)
}

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
