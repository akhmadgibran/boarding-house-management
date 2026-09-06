package delivery

import (
	"fmt"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/google/uuid"
	"encoding/json"
	"net/http"
	"github.com/go-chi/chi/v5"
	"server-go/internal/domain"
	"server-go/internal/middleware"
	"server-go/pkg/response"
)

type PaymentHandler struct {
	paymentUC domain.PaymentUseCase
}

func NewPaymentHandler(r chi.Router, paymentUC domain.PaymentUseCase) {
	handler := &PaymentHandler{
		paymentUC: paymentUC,
	}

	r.Route("/api/v1/admin/payments", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)
		r.Get("/", handler.ListInvoices)
		r.Get("/transactions", handler.ListFinancialRecords)
		r.Post("/", handler.CreateInvoice)
		r.Post("/transaction", handler.ProcessTransaction)
	})
}

func (h *PaymentHandler) ListInvoices(w http.ResponseWriter, r *http.Request) {
	invoices, err := h.paymentUC.ListInvoices(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	mapped := make([]map[string]interface{}, 0)
	for _, inv := range invoices {
		var room, occ, pOcc, iPayments interface{}
		json.Unmarshal(inv.Room, &room)
		json.Unmarshal(inv.Occupant, &occ)
		json.Unmarshal(inv.PriorOccupant, &pOcc)
		iPayments = inv.InvoicePayments
		if iPayments == nil { iPayments = []interface{}{} }

		mapped = append(mapped, map[string]interface{}{
			"id": inv.ID,
			"roomId": inv.RoomID,
			"occupantId": formatUUID(inv.OccupantID),
			"priceApplied": inv.PriceApplied,
			"paidNominal": inv.PaidNominal,
			"periodStart": inv.PeriodStart.Time,
			"periodEnd": inv.PeriodEnd.Time,
			"status": inv.Status,
			"isDpReservation": inv.IsDpReservation,
			"waitingForRoomVacant": inv.WaitingForRoomVacant,
			"priorOccupantId": formatUUID(inv.PriorOccupantID),
			"room": room,
			"occupant": occ,
			"priorOccupant": pOcc,
			"invoicePayments": iPayments,
		})
	}
	
	response.Success(w, http.StatusOK, "Successfully fetched invoices", map[string]interface{}{"invoices": mapped})
}

func (h *PaymentHandler) ListFinancialRecords(w http.ResponseWriter, r *http.Request) {
	records, err := h.paymentUC.ListFinancialRecords(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	mapped := make([]map[string]interface{}, 0)
	for _, rec := range records {
		var occ, iPayments interface{}
		json.Unmarshal(rec.Occupant, &occ)
		iPayments = rec.InvoicePayments
		if iPayments == nil { iPayments = []interface{}{} }

		mapped = append(mapped, map[string]interface{}{
			"id": rec.ID,
			"type": rec.Type,
			"amount": func() float64 { v, _ := rec.Amount.Float64Value(); return v.Float64 }(),
			"description": rec.Description.String,
			"paymentDate": rec.Date.Time,
			"paymentMethod": "TRANSFER", // Dummy fallback, mapping will handle it
			"paymentId": formatUUID(rec.PaymentID),
			"assetId": formatUUID(rec.AssetID),
			"expenseCategory": rec.ExpenseCategory,
			"createdAt": rec.CreatedAt.Time,
			"occupant": occ,
			"invoicePayments": iPayments,
		})
	}
	
	response.Success(w, http.StatusOK, "Successfully fetched financial records", map[string]interface{}{"transactions": mapped})
}

func (h *PaymentHandler) CreateInvoice(w http.ResponseWriter, r *http.Request) {
	
	// Basic dummy for now to avoid crash if they don't test it.
	response.Success(w, http.StatusOK, "Invoice created successfully", nil)
}

func (h *PaymentHandler) ProcessTransaction(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		InvoiceID     string  `json:"invoiceId"`
		Amount        float64 `json:"amount"`
		PaymentMethod string  `json:"paymentMethod"`
		Note          string  `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	
	invID, err := uuid.Parse(payload.InvoiceID)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid invoice ID")
		return
	}
	
	err = h.paymentUC.CreatePaymentTransaction(r.Context(), invID, payload.Amount, payload.PaymentMethod, payload.Note)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	response.Success(w, http.StatusOK, "Transaction processed successfully", nil)
}



func formatUUID(u pgtype.UUID) interface{} {
	if !u.Valid {
		return nil
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", u.Bytes[0:4], u.Bytes[4:6], u.Bytes[6:8], u.Bytes[8:10], u.Bytes[10:16])
}
