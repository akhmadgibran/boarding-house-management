package usecase

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"server-go/internal/domain"
	"server-go/internal/room/repository"
)

type roomUseCase struct {
	repo   repository.Querier
	dbPool *pgxpool.Pool
}

func NewRoomUseCase(repo repository.Querier, dbPool *pgxpool.Pool) domain.RoomUseCase {
	return &roomUseCase{
		repo:   repo,
		dbPool: dbPool,
	}
}

func (u *roomUseCase) ListRooms(ctx context.Context) ([]repository.ListRoomsWithAssetsRow, error) {
	rooms, err := u.repo.ListRoomsWithAssets(ctx)
	if err != nil {
		return nil, errors.New("failed to fetch rooms")
	}
	if rooms == nil {
		rooms = []repository.ListRoomsWithAssetsRow{}
	}
	return rooms, nil
}

func (u *roomUseCase) GetRoom(ctx context.Context, id uuid.UUID) (repository.Room, error) {
	room, err := u.repo.GetRoom(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return repository.Room{}, errors.New("room not found")
		}
		return repository.Room{}, errors.New("failed to fetch room details")
	}
	return room, nil
}

func (u *roomUseCase) CreateRoom(ctx context.Context, req repository.CreateRoomParams) (repository.Room, error) {
	room, err := u.repo.CreateRoom(ctx, req)
	if err != nil {
		return repository.Room{}, errors.New("failed to create room")
	}
	return room, nil
}

func (u *roomUseCase) UpdateRoom(ctx context.Context, req repository.UpdateRoomParams) (repository.Room, error) {
	room, err := u.repo.UpdateRoom(ctx, req)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return repository.Room{}, errors.New("room not found")
		}
		return repository.Room{}, errors.New("failed to update room")
	}
	return room, nil
}

func (u *roomUseCase) DeleteRoom(ctx context.Context, id uuid.UUID) error {
	err := u.repo.DeleteRoom(ctx, id)
	if err != nil {
		return errors.New("failed to delete room")
	}
	return nil
}

func (u *roomUseCase) CheckoutRoom(ctx context.Context, id uuid.UUID) (string, error) {
	tx, err := u.dbPool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	q := u.repo.(*repository.Queries).WithTx(tx)

	// 1. Lock room
	room, err := q.LockRoom(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", errors.New("room not found")
		}
		return "", err
	}

	// 2. Get active occupancy
	currentOccupancy, err := q.GetActiveRoomOccupancy(ctx, room.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", errors.New("room has no active occupant currently")
		}
		return "", err
	}

	// 3. Truncate invoice
	err = q.TruncateInvoicePeriod(ctx, currentOccupancy.ID)
	if err != nil {
		return "", err
	}

	// 4. Deactivate occupant
	if currentOccupancy.OccupantID.Valid {
		_, err = q.LockUser(ctx, currentOccupancy.OccupantID.Bytes)
		if err == nil {
			q.DeactivateOccupant(ctx, currentOccupancy.OccupantID.Bytes)
		}
	}

	// 5. Get waiting reservation
	waitingRes, err := q.GetWaitingReservation(ctx, room.ID)
	if err == nil {
		// Activate reservation
		q.ActivateReservation(ctx, waitingRes.ID)
		if waitingRes.OccupantID.Valid {
			_, err = q.LockUser(ctx, waitingRes.OccupantID.Bytes)
			if err == nil {
				q.ActivateOccupant(ctx, waitingRes.OccupantID.Bytes)
			}
		}

		_, err = q.UpdateRoom(ctx, repository.UpdateRoomParams{
			ID:     room.ID,
			Name:   room.Name,
			Price:  room.Price,
			Status: repository.RoomStatusEnumOCCUPIED,
		})

		tx.Commit(ctx)
		return "Previous tenant successfully checked out. Active reservation has been converted to a regular invoice.", nil
	}

	// No waiting reservation, set to vacant
	_, err = q.UpdateRoom(ctx, repository.UpdateRoomParams{
		ID:     room.ID,
		Name:   room.Name,
		Price:  room.Price,
		Status: repository.RoomStatusEnumVACANT,
	})

	tx.Commit(ctx)
	return "Previous tenant successfully checked out. Room is now vacant.", nil
}
