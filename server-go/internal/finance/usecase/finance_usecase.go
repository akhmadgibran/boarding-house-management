package usecase

import (
	"context"
	"server-go/internal/domain"
	"server-go/internal/finance/repository"
)

type financeUseCase struct {
	repo repository.Querier
}

func NewFinanceUseCase(repo repository.Querier) domain.FinanceUseCase {
	return &financeUseCase{
		repo: repo,
	}
}

func (u *financeUseCase) CreateFinancialRecord(ctx context.Context, arg repository.CreateFinancialRecordParams) (repository.FinancialRecord, error) {
	return u.repo.CreateFinancialRecord(ctx, arg)
}

func (u *financeUseCase) UpdateExpense(ctx context.Context, arg repository.UpdateExpenseParams) (repository.FinancialRecord, error) {
	return u.repo.UpdateExpense(ctx, arg)
}

func (u *financeUseCase) GetAllFinancialRecords(ctx context.Context) ([]repository.GetAllFinancialRecordsRow, error) {
	return u.repo.GetAllFinancialRecords(ctx)
}
