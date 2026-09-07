package delivery

import (
	"math/big"
	"github.com/jackc/pgx/v5/pgtype"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"server-go/internal/domain"
	"server-go/internal/middleware"
	"server-go/internal/room/repository"
	"server-go/pkg/response"
)

type RoomHandler struct {
	roomUC domain.RoomUseCase
}

func NewRoomHandler(r chi.Router, roomUC domain.RoomUseCase) {
	handler := &RoomHandler{
		roomUC: roomUC,
	}

	r.Route("/api/v1/admin/rooms", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)
		r.Use(middleware.AuthorizeRole("ADMIN", "OPERATOR"))
		r.Get("/", handler.ListRooms)
		r.Get("/{id}", handler.GetRoom)
		r.Post("/", handler.CreateRoom)
		r.Put("/{id}", handler.UpdateRoom)
		r.Post("/{id}/checkout", handler.CheckoutRoom)
		r.Delete("/{id}", handler.DeleteRoom)
	})
}

func (h *RoomHandler) ListRooms(w http.ResponseWriter, r *http.Request) {
	rooms, err := h.roomUC.ListRooms(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	mappedRooms := make([]map[string]interface{}, 0)
	for _, rm := range rooms {
		var assets []interface{}
		json.Unmarshal(rm.Assets, &assets)
		if assets == nil {
			assets = []interface{}{}
		}
		
		var activeOccupant interface{}
		json.Unmarshal(rm.ActiveOccupant, &activeOccupant)

		mappedRooms = append(mappedRooms, map[string]interface{}{
			"id": rm.ID,
			"name": rm.Name,
			"status": rm.Status,
			"price": rm.Price,
			"createdAt": rm.CreatedAt.Time,
			"updatedAt": rm.UpdatedAt.Time,
			"assets": assets,
			"activeOccupant": activeOccupant,
			"_count": map[string]interface{}{
				"invoices": rm.InvoicesCount,
				"payments": rm.PaymentsCount,
			},
		})
	}
	
	response.Success(w, http.StatusOK, "Successfully fetched rooms", map[string]interface{}{"rooms": mappedRooms})
}

func (h *RoomHandler) GetRoom(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID format")
		return
	}
	room, err := h.roomUC.GetRoomDetails(r.Context(), id)
	if err != nil {
		if err.Error() == "room not found" {
			response.Error(w, http.StatusNotFound, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Successfully fetched room details", map[string]interface{}{"room": room})
}

func (h *RoomHandler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name   string `json:"name"`
		Price  float64 `json:"price"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	arg := repository.CreateRoomParams{
		Name:   req.Name,
		Price:  floatToNumeric(req.Price),
		Status: repository.RoomStatusEnum(req.Status),
	}

	room, err := h.roomUC.CreateRoom(r.Context(), arg)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, "Room created successfully", room)
}

func (h *RoomHandler) UpdateRoom(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID format")
		return
	}

	var req struct {
		Name   string `json:"name"`
		Price  float64 `json:"price"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	arg := repository.UpdateRoomParams{
		ID:     id,
		Name:   req.Name,
		Price:  floatToNumeric(req.Price),
		Status: repository.RoomStatusEnum(req.Status),
	}

	room, err := h.roomUC.UpdateRoom(r.Context(), arg)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Room updated successfully", room)
}

func (h *RoomHandler) DeleteRoom(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID format")
		return
	}

	if err := h.roomUC.DeleteRoom(r.Context(), id); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Room deleted successfully", nil)
}

func floatToNumeric(f float64) pgtype.Numeric {
	n := pgtype.Numeric{}
	n.Int = big.NewInt(int64(f))
	n.Valid = true
	return n
}

func (h *RoomHandler) CheckoutRoom(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID format")
		return
	}

	msg, err := h.roomUC.CheckoutRoom(r.Context(), id)
	if err != nil {
		if err.Error() == "room not found" || err.Error() == "room has no active occupant currently" {
			response.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(w, http.StatusOK, msg, nil)
}
