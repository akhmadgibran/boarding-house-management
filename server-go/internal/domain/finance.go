package domain

import (
	"context"
	"server-go/internal/finance/repository"
)

type FinanceUseCase interface {
	CreateFinancialRecord(ctx context.Context, arg repository.CreateFinancialRecordParams) (repository.FinancialRecord, error)
	UpdateExpense(ctx context.Context, arg repository.UpdateExpenseParams) (repository.FinancialRecord, error)
	GetAllFinancialRecords(ctx context.Context) ([]repository.GetAllFinancialRecordsRow, error)
}
