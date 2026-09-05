package usecase

import (
	"context"
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"

	"server-go/internal/auth/repository"
	"server-go/internal/domain"
)

type authUseCase struct {
	repo repository.Querier
}

func NewAuthUseCase(repo repository.Querier) domain.AuthUseCase {
	return &authUseCase{
		repo: repo,
	}
}

func (u *authUseCase) Register(ctx context.Context, req domain.RegisterRequest) (repository.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return repository.User{}, errors.New("failed to hash password")
	}
	roleEnum := repository.RoleEnum(req.Role)
	arg := repository.CreateUserParams{
		Email:    req.Email,
		Password: string(hashedPassword),
		Role:     roleEnum,
	}
	user, err := u.repo.CreateUser(ctx, arg)
	if err != nil {
		return repository.User{}, errors.New("failed to create user, email might exist")
	}
	user.Password = "" // sanitize
	return user, nil
}

func (u *authUseCase) Login(ctx context.Context, req domain.LoginRequest) (domain.LoginResponse, error) {
	user, err := u.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.LoginResponse{}, errors.New("invalid email or password")
		}
		return domain.LoginResponse{}, errors.New("failed to authenticate")
	}
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return domain.LoginResponse{}, errors.New("invalid email or password")
	}
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "secret"
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.String(),
		"role":    string(user.Role),
		"email":   user.Email,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return domain.LoginResponse{}, errors.New("failed to generate token")
	}
	return domain.LoginResponse{
		Token: tokenString,
		User: map[string]interface{}{
			"id": user.ID,
			"email": user.Email,
			"role": user.Role,
		},
	}, nil
}

func (u *authUseCase) GetMe(ctx context.Context, userID uuid.UUID) (repository.GetMeRow, error) {
	me, err := u.repo.GetMe(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return repository.GetMeRow{}, errors.New("user not found")
		}
		return repository.GetMeRow{}, errors.New("failed to fetch user profile")
	}
	return me, nil
}

func (u *authUseCase) GetAllUsers(ctx context.Context) ([]repository.GetAllUsersRow, error) {
	users, err := u.repo.GetAllUsers(ctx)
	if users == nil {
		users = []repository.GetAllUsersRow{}
	}
	return users, err
}

func (u *authUseCase) CreateOperator(ctx context.Context, req domain.CreateOperatorRequest) (repository.OperatorDetail, error) {
	return u.repo.CreateOperatorDetails(ctx, repository.CreateOperatorDetailsParams{
		UserID:      req.UserID,
		Name:        req.Name,
		PhoneNumber: req.PhoneNumber,
		Address:     req.Address,
		Status:      repository.ProfileStatusEnum(req.Status),
	})
}

func (u *authUseCase) CreateOccupant(ctx context.Context, req domain.CreateOccupantRequest) (repository.OccupantDetail, error) {
	var moveIn, moveOut pgtype.Timestamptz
	if req.MoveInDate != nil {
		moveIn.Time = *req.MoveInDate
		moveIn.Valid = true
	}
	if req.MoveOutDate != nil {
		moveOut.Time = *req.MoveOutDate
		moveOut.Valid = true
	}

	return u.repo.CreateOccupantDetails(ctx, repository.CreateOccupantDetailsParams{
		UserID:      req.UserID,
		Name:        req.Name,
		PhoneNumber: pgtype.Text{String: req.PhoneNumber, Valid: req.PhoneNumber != ""},
		Address:     pgtype.Text{String: req.Address, Valid: req.Address != ""},
		Occupation:  repository.OccupantOccupationEnum(req.Occupation),
		Status:      repository.ProfileStatusEnum(req.Status),
		MoveInDate:  moveIn,
		MoveOutDate: moveOut,
	})
}

func (u *authUseCase) UpdateOperator(ctx context.Context, userID uuid.UUID, req domain.UpdateOperatorRequest) (repository.OperatorDetail, error) {
	return u.repo.UpdateOperatorDetails(ctx, repository.UpdateOperatorDetailsParams{
		UserID:      userID,
		Name:        req.Name,
		PhoneNumber: req.PhoneNumber,
		Address:     req.Address,
		Status:      repository.ProfileStatusEnum(req.Status),
	})
}

func (u *authUseCase) UpdateOccupant(ctx context.Context, userID uuid.UUID, req domain.UpdateOccupantRequest) (repository.OccupantDetail, error) {
	var moveIn, moveOut pgtype.Timestamptz
	if req.MoveInDate != nil {
		moveIn.Time = *req.MoveInDate
		moveIn.Valid = true
	}
	if req.MoveOutDate != nil {
		moveOut.Time = *req.MoveOutDate
		moveOut.Valid = true
	}

	return u.repo.UpdateOccupantDetails(ctx, repository.UpdateOccupantDetailsParams{
		UserID:      userID,
		Name:        req.Name,
		PhoneNumber: pgtype.Text{String: req.PhoneNumber, Valid: req.PhoneNumber != ""},
		Address:     pgtype.Text{String: req.Address, Valid: req.Address != ""},
		Occupation:  repository.OccupantOccupationEnum(req.Occupation),
		Status:      repository.ProfileStatusEnum(req.Status),
		MoveInDate:  moveIn,
		MoveOutDate: moveOut,
	})
}

func (u *authUseCase) SoftDeleteUser(ctx context.Context, id uuid.UUID) error {
	return u.repo.SoftDeleteUser(ctx, id)
}
