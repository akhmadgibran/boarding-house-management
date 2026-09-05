package response

import (
	"encoding/json"
	"net/http"
)

type APIResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func JSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload != nil {
		json.NewEncoder(w).Encode(payload)
	}
}

func Success(w http.ResponseWriter, status int, message string, data interface{}) {
	JSON(w, status, APIResponse{
		Message: message,
		Data:    data,
	})
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, APIResponse{
		Message: message,
	})
}
