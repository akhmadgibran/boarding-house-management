package domain

import (
	"context"

	"github.com/google/uuid"
	"server-go/internal/room/repository"
)

type RoomUseCase interface {
	ListRooms(ctx context.Context) ([]repository.ListRoomsWithAssetsRow, error)
	GetRoomDetails(ctx context.Context, id uuid.UUID) (repository.GetRoomDetailsRow, error)
	CreateRoom(ctx context.Context, req repository.CreateRoomParams) (repository.Room, error)
	UpdateRoom(ctx context.Context, req repository.UpdateRoomParams) (repository.Room, error)
	DeleteRoom(ctx context.Context, id uuid.UUID) error
	CheckoutRoom(ctx context.Context, id uuid.UUID) (string, error)
}
