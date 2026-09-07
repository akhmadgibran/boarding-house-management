package domain

import (
	"context"
	"github.com/google/uuid"
	"server-go/internal/payment/repository"
)

type PaymentUseCase interface {
	CancelInvoice(ctx context.Context, id uuid.UUID) error
	ListInvoices(ctx context.Context) ([]repository.ListInvoicesWithDetailsRow, error)
		ListFinancialRecords(ctx context.Context) ([]repository.ListFinancialRecordsWithDetailsRow, error)
	GetOccupantInvoices(ctx context.Context, occupantID uuid.UUID) ([]repository.GetOccupantInvoicesRow, error)
	GetOccupantTransactions(ctx context.Context, occupantID uuid.UUID) ([]repository.GetOccupantTransactionsRow, error)
	CreatePaymentTransaction(ctx context.Context, invoiceID uuid.UUID, amount float64, method string, note string) error
	CreateInvoice(ctx context.Context, arg repository.CreateInvoiceParams) (repository.Invoice, error)
}
