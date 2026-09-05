package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/robfig/cron/v3"

	"server-go/internal/scheduler/repository"
)

type SchedulerService struct {
	cron *cron.Cron
	repo repository.Querier
}

func NewSchedulerService(dbPool *pgxpool.Pool) *SchedulerService {
	c := cron.New()
	repo := repository.New(dbPool)
	return &SchedulerService{
		cron: c,
		repo: repo,
	}
}

func (s *SchedulerService) Start() {
	_, err := s.cron.AddFunc("0 0 * * *", s.generateNextPeriodPayments)
	if err != nil {
		log.Fatalf("Failed to schedule auto-invoice job: %v", err)
	}

	_, err = s.cron.AddFunc("5 0 1 * *", s.upsertOccupancySnapshot)
	if err != nil {
		log.Fatalf("Failed to schedule occupancy snapshot job: %v", err)
	}

	s.cron.Start()
	log.Println("[Scheduler] Active. Job 1: invoices (daily 00:00) | Job 2: occupancy snapshot (1st of month 00:05)")
}

func (s *SchedulerService) Stop() {
	s.cron.Stop()
}

func (s *SchedulerService) generateNextPeriodPayments() {
	log.Println("[PaymentScheduler] Running auto-invoice checks...")
	ctx := context.Background()

	now := time.Now()
	threeDaysLater := now.AddDate(0, 0, 3)

	invoices, err := s.repo.GetActiveInvoicesExpiringSoon(ctx, pgtype.Timestamptz{Time: threeDaysLater, Valid: true})
	if err != nil {
		log.Printf("[PaymentScheduler] Error fetching invoices: %v", err)
		return
	}

	createdCount := 0
	for _, inv := range invoices {
		nextPeriodStart := inv.PeriodEnd.Time
		nextPeriodEnd := nextPeriodStart.AddDate(0, 1, 0) // +1 month

		_, err := s.repo.CheckInvoiceExistsForPeriod(ctx, repository.CheckInvoiceExistsForPeriodParams{
			RoomID:      inv.RoomID,
			OccupantID:  inv.OccupantID,
			PeriodStart: pgtype.Timestamptz{Time: nextPeriodStart, Valid: true},
			PeriodEnd:   pgtype.Timestamptz{Time: nextPeriodEnd, Valid: true},
		})
		
		if err == nil {
			continue // Already exists
		}

		err = s.repo.CreateAutoInvoice(ctx, repository.CreateAutoInvoiceParams{
			RoomID:       inv.RoomID,
			OccupantID:   inv.OccupantID,
			PriceApplied: inv.RoomPrice,
			PeriodStart:  pgtype.Timestamptz{Time: nextPeriodStart, Valid: true},
			PeriodEnd:    pgtype.Timestamptz{Time: nextPeriodEnd, Valid: true},
		})
		
		if err != nil {
			log.Printf("[PaymentScheduler] Failed to create invoice: %v", err)
			continue
		}
		
		createdCount++
	}

	if createdCount > 0 {
		log.Printf("[PaymentScheduler] %d new invoices generated", createdCount)
	}
}

func (s *SchedulerService) upsertOccupancySnapshot() {
	ctx := context.Background()
	
	now := time.Now()
	month := now.Month() - 1
	year := now.Year()
	if month == 0 {
		month = 12
		year = year - 1
	}

	log.Printf("[OccupancySnapshot] Recording snapshot for %d-%02d...", year, month)
	
	lastDay := time.Date(year, time.Month(month+1), 0, 23, 59, 59, 0, time.UTC)

	occupiedCount, err := s.repo.CountOccupiedRoomsForMonth(ctx, pgtype.Timestamptz{Time: lastDay, Valid: true})
	if err != nil {
		log.Printf("[OccupancySnapshot] Error counting occupied rooms: %v", err)
		return
	}

	totalCount, err := s.repo.CountTotalRooms(ctx)
	if err != nil {
		log.Printf("[OccupancySnapshot] Error counting total rooms: %v", err)
		return
	}

	err = s.repo.UpsertOccupancySnapshot(ctx, repository.UpsertOccupancySnapshotParams{
		Year:          int32(year),
		Month:         int32(month),
		TotalRooms:    int32(totalCount),
		OccupiedRooms: int32(occupiedCount),
		SnapshotDate:  pgtype.Timestamptz{Time: lastDay, Valid: true},
	})

	if err != nil {
		log.Printf("[OccupancySnapshot] Upsert failed: %v", err)
	} else {
		log.Printf("[OccupancySnapshot] Success: %d/%d rooms occupied", occupiedCount, totalCount)
	}
}
