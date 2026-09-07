package usecase

import (
	"context"
	"errors"
	"math/big"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"server-go/internal/domain"
	"server-go/internal/payment/repository"
)

type paymentUseCase struct {
	repo   repository.Querier
	dbPool *pgxpool.Pool
}

func NewPaymentUseCase(repo repository.Querier, dbPool *pgxpool.Pool) domain.PaymentUseCase {
	return &paymentUseCase{
		repo:   repo,
		dbPool: dbPool,
	}
}

func (u *paymentUseCase) ListInvoices(ctx context.Context) ([]repository.ListInvoicesWithDetailsRow, error) {
	invoices, err := u.repo.ListInvoicesWithDetails(ctx)
	if invoices == nil {
		invoices = []repository.ListInvoicesWithDetailsRow{}
	}
	return invoices, err
}

func (u *paymentUseCase) ListFinancialRecords(ctx context.Context) ([]repository.ListFinancialRecordsWithDetailsRow, error) {
	records, err := u.repo.ListFinancialRecordsWithDetails(ctx)
	if records == nil {
		records = []repository.ListFinancialRecordsWithDetailsRow{}
	}
	return records, err
}

func floatToNumeric(f float64) pgtype.Numeric {
	n := pgtype.Numeric{}
	n.Int = big.NewInt(int64(f))
	n.Valid = true
	return n
}

func (u *paymentUseCase) CreateInvoice(ctx context.Context, arg repository.CreateInvoiceParams) (repository.Invoice, error) {
	// Simple wrapper for now
	return u.repo.CreateInvoice(ctx, arg)
}

func (u *paymentUseCase) CreatePaymentTransaction(ctx context.Context, invoiceID uuid.UUID, amount float64, method string, note string) error {
	tx, err := u.dbPool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	q := u.repo.(*repository.Queries).WithTx(tx)

	// Fetch invoice
	inv, err := q.GetInvoice(ctx, invoiceID)
	if err != nil {
		return errors.New("invoice not found")
	}

	// Create payment
	var pgMethod repository.PaymentMethodEnum
	if method != "" {
		pgMethod = repository.PaymentMethodEnum(method)
	}

	payment, err := q.CreatePayment(ctx, repository.CreatePaymentParams{
		OccupantID:    inv.OccupantID.Bytes,
		Amount:        floatToNumeric(amount),
		PaymentMethod: pgMethod,
		Note:          pgtype.Text{String: note, Valid: note != ""},
	})
	if err != nil {
		return err
	}

	// Link payment to invoice
	err = q.CreateInvoicePayment(ctx, repository.CreateInvoicePaymentParams{
		InvoiceID:     inv.ID,
		PaymentID:     payment.ID,
		AmountApplied: floatToNumeric(amount),
	})
	if err != nil {
		return err
	}

	// Update invoice status (simplification: if paid > 0, set to LUNAS for now, normally you'd check sum)
	err = q.UpdateInvoiceStatus(ctx, repository.UpdateInvoiceStatusParams{
		ID:          inv.ID,
		Status:      repository.PaymentStatusEnumPAID,
		PaidNominal: floatToNumeric(amount),
	})
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (u *paymentUseCase) GetOccupantInvoices(ctx context.Context, occupantID uuid.UUID) ([]repository.GetOccupantInvoicesRow, error) {
	return u.repo.GetOccupantInvoices(ctx, pgtype.UUID{Bytes: occupantID, Valid: true})
}

func (u *paymentUseCase) GetOccupantTransactions(ctx context.Context, occupantID uuid.UUID) ([]repository.GetOccupantTransactionsRow, error) {
	return u.repo.GetOccupantTransactions(ctx, occupantID)
}

func (u *paymentUseCase) CancelInvoice(ctx context.Context, id uuid.UUID) error {
	err := u.repo.DeleteInvoice(ctx, id)
	if err != nil {
		return errors.New("failed to cancel invoice")
	}
	return nil
}
