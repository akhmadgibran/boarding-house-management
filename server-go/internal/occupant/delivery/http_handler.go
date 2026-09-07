package delivery

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"encoding/json"

	"server-go/internal/domain"
	"server-go/internal/middleware"
	"server-go/pkg/response"
)

type OccupantHandler struct {
	occupantUC domain.OccupantUseCase
}

func NewOccupantHandler(r chi.Router, occupantUC domain.OccupantUseCase) {
	handler := &OccupantHandler{
		occupantUC: occupantUC,
	}

	r.Route("/api/v1/admin/occupants", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)
		r.Use(middleware.AuthorizeRole("ADMIN", "OPERATOR"))
		
		r.Get("/", handler.ListOccupants)
		r.Get("/{id}", handler.GetOccupantDetail)
		r.Post("/", handler.CreateOccupant)
		r.Put("/{id}", handler.UpdateOccupant)
		r.Patch("/{id}/status", handler.UpdateOccupantStatus)
	})
}

func (h *OccupantHandler) ListOccupants(w http.ResponseWriter, r *http.Request) {
	occupants, err := h.occupantUC.ListOccupants(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	mapped := make([]map[string]interface{}, 0)
	for _, occ := range occupants {
		mapped = append(mapped, map[string]interface{}{
			"id": occ.ID,
			"email": occ.Email,
			"name": occ.Name,
			"phoneNumber": occ.PhoneNumber.String,
			"status": occ.Status,
			"moveInDate": occ.MoveInDate.Time,
		})
	}
	response.Success(w, http.StatusOK, "Successfully fetched occupants", map[string]interface{}{"occupants": mapped})
}

func (h *OccupantHandler) GetOccupantDetail(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid occupant ID format")
		return
	}

	occupant, err := h.occupantUC.GetOccupantDetail(r.Context(), id)
	if err != nil {
		if err.Error() == "occupant not found" {
			response.Error(w, http.StatusNotFound, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Successfully fetched occupant detail", map[string]interface{}{"occupant": occupant})
}

func (h *OccupantHandler) CreateOccupant(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email            string `json:"email"`
		Password         string `json:"password"`
		Name             string `json:"name"`
		PhoneNumber      string `json:"phoneNumber"`
		IDCardNumber     string `json:"idCardNumber"`
		EmergencyContact string `json:"emergencyContact"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	occupant, err := h.occupantUC.CreateOccupant(r.Context(), req.Email, req.Password, req.Name, req.PhoneNumber, req.IDCardNumber, req.EmergencyContact)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, "Occupant created successfully", map[string]interface{}{"occupant": occupant})
}

func (h *OccupantHandler) UpdateOccupant(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid occupant ID format")
		return
	}

	var req struct {
		Name             string `json:"name"`
		PhoneNumber      string `json:"phoneNumber"`
		IDCardNumber     string `json:"idCardNumber"`
		EmergencyContact string `json:"emergencyContact"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	occupant, err := h.occupantUC.UpdateOccupant(r.Context(), id, req.Name, req.PhoneNumber, req.IDCardNumber, req.EmergencyContact)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Occupant updated successfully", map[string]interface{}{"occupant": occupant})
}

func (h *OccupantHandler) UpdateOccupantStatus(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid occupant ID format")
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	occupant, err := h.occupantUC.UpdateOccupantStatus(r.Context(), id, req.Status)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Occupant status updated successfully", map[string]interface{}{"occupant": occupant})
}
