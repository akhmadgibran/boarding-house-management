package domain

import (
	"context"
	"github.com/google/uuid"
	"server-go/internal/payment/repository"
)

type PaymentUseCase interface {
	ListInvoices(ctx context.Context) ([]repository.ListInvoicesWithDetailsRow, error)
	ListFinancialRecords(ctx context.Context) ([]repository.ListFinancialRecordsWithDetailsRow, error)
	CreatePaymentTransaction(ctx context.Context, invoiceID uuid.UUID, amount float64, method string, note string) error
	CreateInvoice(ctx context.Context, arg repository.CreateInvoiceParams) (repository.Invoice, error)
}
