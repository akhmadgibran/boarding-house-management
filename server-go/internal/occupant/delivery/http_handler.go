package delivery

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

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

	r.Route("/api/v1/occupants", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)
		
		r.Get("/", handler.ListOccupants)
		r.Get("/{id}", handler.GetOccupantDetail)
	})
}

func (h *OccupantHandler) ListOccupants(w http.ResponseWriter, r *http.Request) {
	occupants, err := h.occupantUC.ListOccupants(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	var data interface{} = occupants
	if occupants == nil {
		data = []interface{}{}
	}
	response.Success(w, http.StatusOK, "Successfully fetched occupants", map[string]interface{}{"occupants": data})
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
