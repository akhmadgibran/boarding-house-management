package delivery

import (
	"encoding/json"
	"math/big"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"server-go/internal/domain"
	"server-go/internal/finance/repository"
	"server-go/internal/middleware"
	"server-go/pkg/response"
)

type FinanceHandler struct {
	financeUC domain.FinanceUseCase
}

func NewFinanceHandler(r chi.Router, financeUC domain.FinanceUseCase) {
	handler := &FinanceHandler{
		financeUC: financeUC,
	}

	r.Route("/api/v1/admin/financial", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware)
		r.Use(middleware.AuthorizeRole("ADMIN", "OPERATOR"))
		r.Get("/", handler.GetAllFinancialRecords)
		r.Post("/expenses", handler.CreateExpense)
		r.Put("/expenses/{id}", handler.UpdateExpense)
	})
}

func (h *FinanceHandler) GetAllFinancialRecords(w http.ResponseWriter, r *http.Request) {
	res, err := h.financeUC.GetAllFinancialRecords(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	mapped := make([]map[string]interface{}, 0)
	for _, rec := range res {
		mapped = append(mapped, map[string]interface{}{
			"id": rec.ID,
			"type": rec.Type,
			"amount": func() float64 { v, _ := rec.Amount.Float64Value(); return v.Float64 }(),
			"description": rec.Description.String,
			"date": rec.Date.Time,
			"paymentId": rec.PaymentID,
			"assetId": rec.AssetID,
			"expenseCategory": rec.ExpenseCategory,
			"paymentImportCode": rec.PaymentImportCode.String,
			"assetName": rec.AssetName.String,
			"createdAt": rec.CreatedAt.Time,
			"updatedAt": rec.UpdatedAt.Time,
		})
	}
	response.Success(w, http.StatusOK, "Financial records retrieved", map[string]interface{}{"records": mapped})
}

func floatToNumeric(f float64) pgtype.Numeric {
	n := pgtype.Numeric{}
	n.Int = big.NewInt(int64(f)) // Simplified for kost pricing
	n.Valid = true
	return n
}

func (h *FinanceHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Amount          float64 `json:"amount"`
		Description     string  `json:"description"`
		ExpenseCategory string  `json:"expenseCategory"`
		AssetID         *string `json:"assetId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	arg := repository.CreateFinancialRecordParams{
		Type:            repository.TransactionTypeEnumEXPENSE,
		Amount:          floatToNumeric(req.Amount),
		Description:     pgtype.Text{String: req.Description, Valid: true},
		Date:            pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}

	if req.ExpenseCategory != "" {
		arg.ExpenseCategory = repository.NullExpenseCategoryEnum{
			ExpenseCategoryEnum: repository.ExpenseCategoryEnum(req.ExpenseCategory),
			Valid:               true,
		}
	}

	if req.AssetID != nil && *req.AssetID != "" {
		parsed, err := uuid.Parse(*req.AssetID)
		if err == nil {
			var pgUUID pgtype.UUID
			pgUUID.Bytes = parsed
			pgUUID.Valid = true
			arg.AssetID = pgUUID
		}
	}

	res, err := h.financeUC.CreateFinancialRecord(r.Context(), arg)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, "Expense created", res)
}

func (h *FinanceHandler) UpdateExpense(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid ID format")
		return
	}

	var req struct {
		Amount          float64 `json:"amount"`
		Description     string  `json:"description"`
		ExpenseCategory string  `json:"expenseCategory"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	arg := repository.UpdateExpenseParams{
		ID:          id,
		Amount:      floatToNumeric(req.Amount),
		Description: pgtype.Text{String: req.Description, Valid: true},
		Date:        pgtype.Timestamptz{Time: time.Now(), Valid: true},
	}
	if req.ExpenseCategory != "" {
		arg.ExpenseCategory = repository.NullExpenseCategoryEnum{
			ExpenseCategoryEnum: repository.ExpenseCategoryEnum(req.ExpenseCategory),
			Valid:               true,
		}
	}

	res, err := h.financeUC.UpdateExpense(r.Context(), arg)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusOK, "Expense updated", res)
}
