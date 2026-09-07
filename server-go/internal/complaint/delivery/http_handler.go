package delivery

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/google/uuid"

	"server-go/internal/complaint/repository"
	"server-go/internal/domain"
	"server-go/internal/middleware"
	"server-go/pkg/response"
)

type ComplaintHandler struct {
	complaintUC domain.ComplaintUseCase
}

func NewComplaintHandler(r chi.Router, complaintUC domain.ComplaintUseCase) {
	handler := &ComplaintHandler{
		complaintUC: complaintUC,
	}

	r.Route("/api/v1/complaints", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)
		
		r.Post("/", handler.CreateComplaint)
		r.Get("/my-complaints", handler.GetOccupantComplaints)
		r.Get("/my-assets", handler.GetOccupantAssets)

		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthorizeRole("ADMIN"))
			r.Get("/", handler.GetAllComplaints)
			r.Patch("/{id}/status", handler.UpdateComplaintStatus)
		})
	})
}

func (h *ComplaintHandler) CreateComplaint(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Category string  `json:"category"`
		Details  string  `json:"details"`
		AssetID  *string `json:"assetId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	userID, ok := r.Context().Value(middleware.UserIDKey).(uuid.UUID)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	req := repository.CreateComplaintParams{
		Category:     repository.ComplaintCategoryEnum(payload.Category),
		Detail:       payload.Details,
		Status:       repository.ComplaintStatusEnumPENDING,
		ReportedByID: userID,
	}
	if payload.AssetID != nil && *payload.AssetID != "" {
		parsed, err := uuid.Parse(*payload.AssetID)
		if err == nil {
			req.AssetID = pgtype.UUID{Bytes: parsed, Valid: true}
		}
	}

	res, err := h.complaintUC.CreateComplaint(r.Context(), req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, "Complaint created", res)
}

func (h *ComplaintHandler) GetAllComplaints(w http.ResponseWriter, r *http.Request) {
	res, err := h.complaintUC.GetAllComplaints(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	mapped := make([]map[string]interface{}, 0)
	for _, rec := range res {
		mapped = append(mapped, map[string]interface{}{
			"id": rec.ID,
			"reportedById": rec.ReportedByID,
			"assetId": rec.AssetID,
			"category": rec.Category,
			"detail": rec.Detail,
			"status": rec.Status,
			"createdAt": rec.CreatedAt.Time,
			"updatedAt": rec.UpdatedAt.Time,
						"asset": func() interface{} {
				if !rec.AssetID.Valid { return nil }
				return map[string]interface{}{
					"id": rec.AssetID,
					"name": rec.AssetName.String,
					"room": map[string]interface{}{
						"name": "-",
					},
				}
			}(),
			"reportedBy": map[string]interface{}{
				"email": "",
				"occupantDetails": map[string]interface{}{
					"name": "Anda",
				},
			},
		})
	}
	response.Success(w, http.StatusOK, "Complaints retrieved", map[string]interface{}{"complaints": mapped})
}

func (h *ComplaintHandler) GetOccupantComplaints(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(uuid.UUID)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	res, err := h.complaintUC.GetOccupantComplaints(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	mapped := make([]map[string]interface{}, 0)
	for _, rec := range res {
		mapped = append(mapped, map[string]interface{}{
			"id": rec.ID,
			"reportedById": rec.ReportedByID,
			"assetId": rec.AssetID,
			"category": rec.Category,
			"detail": rec.Detail,
			"status": rec.Status,
			"createdAt": rec.CreatedAt.Time,
			"updatedAt": rec.UpdatedAt.Time,
			"asset": func() interface{} {
				if !rec.AssetID.Valid { return nil }
				return map[string]interface{}{
					"id": rec.AssetID,
					"name": rec.AssetName.String,
					"room": map[string]interface{}{
						"name": "-",
					},
				}
			}(),
			"reportedBy": map[string]interface{}{
				"email": "",
				"occupantDetails": map[string]interface{}{
					"name": "Anda",
				},
			},
		})
	}
	response.Success(w, http.StatusOK, "Complaints retrieved", map[string]interface{}{"complaints": mapped})
}

func (h *ComplaintHandler) UpdateComplaintStatus(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid ID format")
		return
	}

	var req struct {
		Status             string  `json:"status"`
		MaintenanceDetails *string `json:"maintenanceDetails"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	res, err := h.complaintUC.UpdateComplaintStatus(r.Context(), id, req.Status, req.MaintenanceDetails)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Complaint status updated", res)
}

func (h *ComplaintHandler) GetOccupantAssets(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(uuid.UUID)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	res, err := h.complaintUC.GetOccupantAssets(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	mapped := make([]map[string]interface{}, 0)
	var roomId string
	for _, rec := range res {
		roomId = rec.RoomID.String()
		mapped = append(mapped, map[string]interface{}{
			"id": rec.ID,
			"name": rec.Name,
			"details": rec.Details.String,
			"status": rec.Status,
		})
	}
	response.Success(w, http.StatusOK, "Occupant assets retrieved", map[string]interface{}{
		"roomId": roomId,
		"assets": mapped,
	})
}
