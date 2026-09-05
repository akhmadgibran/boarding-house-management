package delivery

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"server-go/internal/asset/repository"
	"server-go/internal/domain"
	"server-go/internal/middleware"
	"server-go/pkg/response"
)

type AssetHandler struct {
	assetUC domain.AssetUseCase
}

func NewAssetHandler(r chi.Router, assetUC domain.AssetUseCase) {
	handler := &AssetHandler{
		assetUC: assetUC,
	}

	r.Route("/api/v1/assets", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)
		r.Get("/", handler.ListAssets)
	})

	r.Route("/api/v1/rooms/{roomID}/assets", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)
		r.Get("/", handler.ListAssetsByRoom)
	})

	r.Route("/api/v1/admin/asset-masters", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware, middleware.AuthorizeRole("ADMIN"))
		r.Get("/", handler.ListAssetMasters)
		r.Post("/", handler.CreateAssetMaster)
		r.Put("/{id}", handler.UpdateAssetMaster)
		r.Delete("/{id}", handler.DeleteAssetMaster)
	})

	r.Route("/api/v1/admin/maintenance", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware, middleware.AuthorizeRole("ADMIN"))
		r.Post("/", handler.CreateMaintenanceLog)
		r.Put("/{id}", handler.UpdateMaintenanceLog)
		r.Delete("/{id}", handler.DeleteMaintenanceLog)
		r.Get("/asset/{assetID}", handler.GetMaintenanceLogs)
	})
}

func (h *AssetHandler) ListAssets(w http.ResponseWriter, r *http.Request) {
	assets, err := h.assetUC.ListAssets(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Successfully fetched assets", assets)
}

func (h *AssetHandler) ListAssetsByRoom(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "roomID")
	roomID, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid room ID format")
		return
	}

	assets, err := h.assetUC.ListAssetsByRoom(r.Context(), roomID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Successfully fetched room assets", assets)
}

func (h *AssetHandler) CreateAssetMaster(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	res, err := h.assetUC.CreateAssetMaster(r.Context(), req.Name)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, "Asset Master created", res)
}

func (h *AssetHandler) UpdateAssetMaster(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid ID format")
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	res, err := h.assetUC.UpdateAssetMaster(r.Context(), id, req.Name)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Asset Master updated", res)
}

func (h *AssetHandler) DeleteAssetMaster(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid ID format")
		return
	}
	if err := h.assetUC.DeleteAssetMaster(r.Context(), id); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Asset Master deleted", nil)
}

func (h *AssetHandler) CreateMaintenanceLog(w http.ResponseWriter, r *http.Request) {
	var req repository.CreateMaintenanceLogParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	res, err := h.assetUC.CreateMaintenanceLog(r.Context(), req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, "Maintenance log created", res)
}

func (h *AssetHandler) UpdateMaintenanceLog(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid ID format")
		return
	}
	var req repository.UpdateMaintenanceLogParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	req.ID = id
	res, err := h.assetUC.UpdateMaintenanceLog(r.Context(), req)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Maintenance log updated", res)
}

func (h *AssetHandler) DeleteMaintenanceLog(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid ID format")
		return
	}
	if err := h.assetUC.DeleteMaintenanceLog(r.Context(), id); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Maintenance log deleted", nil)
}

func (h *AssetHandler) GetMaintenanceLogs(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "assetID")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid asset ID format")
		return
	}
	logs, err := h.assetUC.GetMaintenanceLogsByAssetId(r.Context(), id)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	var data interface{} = logs
	if logs == nil {
		data = []interface{}{}
	}
	response.Success(w, http.StatusOK, "Maintenance logs retrieved", map[string]interface{}{"logs": data})
}

func (h *AssetHandler) ListAssetMasters(w http.ResponseWriter, r *http.Request) {
	masters, err := h.assetUC.ListAssetMasters(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	mappedMasters := make([]map[string]interface{}, 0)
	for _, m := range masters {
		mappedMasters = append(mappedMasters, map[string]interface{}{
			"id": m.ID,
			"name": m.Name,
			"createdAt": m.CreatedAt.Time,
			"updatedAt": m.UpdatedAt.Time,
			"_count": map[string]interface{}{
				"assets": m.AssetsCount,
			},
		})
	}
	
	response.Success(w, http.StatusOK, "Asset Masters retrieved", map[string]interface{}{"assetMasters": mappedMasters})
}
