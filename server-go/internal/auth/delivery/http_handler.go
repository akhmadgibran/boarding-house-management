package delivery

import (
	"fmt"
	"github.com/jackc/pgx/v5/pgtype"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"server-go/internal/domain"
	"server-go/internal/middleware"
	"server-go/pkg/response"
)

type AuthHandler struct {
	authUC   domain.AuthUseCase
	validate *validator.Validate
}

func NewAuthHandler(r chi.Router, authUC domain.AuthUseCase, validate *validator.Validate) {
	handler := &AuthHandler{
		authUC:   authUC,
		validate: validate,
	}


	r.Route("/api/v1/auth", func(r chi.Router) {
		r.Post("/register", handler.Register)
		r.Post("/login", handler.Login)
		
		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthMiddleware)
			r.Get("/me", handler.GetMe)
		})
	})

	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)
		r.Use(middleware.AuthorizeRole("ADMIN", "OPERATOR"))
		
		r.Get("/api/v1/admin/users", handler.GetAllUsers)
		r.Delete("/api/v1/admin/users/{id}", handler.SoftDeleteUser)

		r.Post("/api/v1/admin/operators", handler.CreateOperator)
		r.Put("/api/v1/admin/operators/{id}", handler.UpdateOperator)

		r.Post("/api/v1/admin/occupants", handler.CreateOccupant)
		r.Put("/api/v1/admin/occupants/{id}", handler.UpdateOccupant)
	})
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req domain.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.validate.Struct(req); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	user, err := h.authUC.Register(r.Context(), req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(w, http.StatusCreated, "User registered successfully", user)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.validate.Struct(req); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	res, err := h.authUC.Login(r.Context(), req)
	if err != nil {
		if err.Error() == "invalid email or password" {
			response.Error(w, http.StatusUnauthorized, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Login successful", res)
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Invalid user ID in context")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Invalid user ID format")
		return
	}

	me, err := h.authUC.GetMe(r.Context(), userID)
	if err != nil {
		if err.Error() == "user not found" {
			response.Error(w, http.StatusNotFound, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(w, http.StatusOK, "Successfully fetched user profile", map[string]interface{}{"user": me})
}


func (h *AuthHandler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	res, err := h.authUC.GetAllUsers(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	mapped := make([]map[string]interface{}, 0)
	for _, u := range res {
		user := map[string]interface{}{
			"id": u.ID,
			"email": u.Email,
			"role": u.Role,
			"createdAt": u.CreatedAt.Time,
			"updatedAt": u.UpdatedAt.Time,
		}
		if u.OccupantID.Valid {
			user["occupantDetails"] = map[string]interface{}{
				"id": formatUUID(u.OccupantID),
				"userId": u.ID,
				"name": u.OccupantName.String,
				"phoneNumber": u.OccupantPhone.String,
				"address": u.OccupantAddress.String,
				"occupation": u.OccupantOccupation.OccupantOccupationEnum,
				"status": u.OccupantStatus.ProfileStatusEnum,
				"moveInDate": func() interface{} { if u.OccupantMoveIn.Valid { return u.OccupantMoveIn.Time } else { return nil } }(),
				"moveOutDate": func() interface{} { if u.OccupantMoveOut.Valid { return u.OccupantMoveOut.Time } else { return nil } }(),
			}
		}
		if u.OperatorID.Valid {
			user["operatorDetails"] = map[string]interface{}{
				"id": formatUUID(u.OperatorID),
				"userId": u.ID,
				"name": u.OperatorName.String,
				"phoneNumber": u.OperatorPhone.String,
				"address": u.OperatorAddress.String,
				"status": u.OperatorStatus.ProfileStatusEnum,
			}
		}
		mapped = append(mapped, user)
	}
	
	response.Success(w, http.StatusOK, "Users retrieved", map[string]interface{}{"users": mapped})
}

func (h *AuthHandler) CreateOperator(w http.ResponseWriter, r *http.Request) {
	response.Success(w, http.StatusCreated, "Operator created", nil)
}

func (h *AuthHandler) CreateOccupant(w http.ResponseWriter, r *http.Request) {
	response.Success(w, http.StatusCreated, "Occupant created", nil)
}

func (h *AuthHandler) UpdateOperator(w http.ResponseWriter, r *http.Request) {
	response.Success(w, http.StatusOK, "Operator updated", nil)
}

func (h *AuthHandler) UpdateOccupant(w http.ResponseWriter, r *http.Request) {
	response.Success(w, http.StatusOK, "Occupant updated", nil)
}

func (h *AuthHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid ID format")
		return
	}
	if err := h.authUC.SoftDeleteUser(r.Context(), id); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "User deleted", nil)
}

func (h *AuthHandler) SoftDeleteUser(w http.ResponseWriter, r *http.Request) {
	h.DeleteUser(w, r)
}


func formatUUID(u pgtype.UUID) interface{} {
	if !u.Valid {
		return nil
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", u.Bytes[0:4], u.Bytes[4:6], u.Bytes[6:8], u.Bytes[8:10], u.Bytes[10:16])
}
