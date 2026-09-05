package delivery

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
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

		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthorizeRole("ADMIN"))
			r.Get("/", handler.GetAllComplaints)
			r.Patch("/{id}/status", handler.UpdateComplaintStatus)
		})
	})
}

func (h *ComplaintHandler) CreateComplaint(w http.ResponseWriter, r *http.Request) {
	var req repository.CreateComplaintParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	userID, ok := r.Context().Value(middleware.UserIDKey).(uuid.UUID)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	req.ReportedByID = userID

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
	var data interface{} = res
	if res == nil {
		data = []interface{}{}
	}
	response.Success(w, http.StatusOK, "Complaints retrieved", map[string]interface{}{"complaints": data})
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
	var data interface{} = res
	if res == nil {
		data = []interface{}{}
	}
	response.Success(w, http.StatusOK, "Complaints retrieved", map[string]interface{}{"complaints": data})
}

func (h *ComplaintHandler) UpdateComplaintStatus(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid ID format")
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	res, err := h.complaintUC.UpdateComplaintStatus(r.Context(), id, req.Status)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Complaint status updated", res)
}
