package service

import (
	"strings"

	"finflow-backend/internal/models"
	"finflow-backend/internal/repository"

	"github.com/google/uuid"
)

type SavingsGoalService interface {
	CreateGoal(userID uuid.UUID, req *models.CreateSavingsGoalRequest) (*models.SavingsGoal, error)
	GetGoals(userID uuid.UUID) ([]models.SavingsGoal, error)
	GetGoalByID(id uuid.UUID, userID uuid.UUID) (*models.SavingsGoal, error)
	UpdateGoal(id uuid.UUID, userID uuid.UUID, req *models.UpdateSavingsGoalRequest) (*models.SavingsGoal, error)
	DepositGoal(userID uuid.UUID, goalID uuid.UUID, req *models.DepositSavingsGoalRequest) (*models.SavingsGoal, error)
	CompleteGoal(userID uuid.UUID, goalID uuid.UUID, req *models.CompleteSavingsGoalRequest) (*models.SavingsGoal, error)
	DeleteGoal(id uuid.UUID, userID uuid.UUID) error
}

type savingsGoalService struct {
	goalRepo repository.SavingsGoalRepository
}

func NewSavingsGoalService(goalRepo repository.SavingsGoalRepository) SavingsGoalService {
	return &savingsGoalService{goalRepo: goalRepo}
}

func (s *savingsGoalService) CreateGoal(userID uuid.UUID, req *models.CreateSavingsGoalRequest) (*models.SavingsGoal, error) {
	icon := req.Icon
	if icon == "" {
		icon = "savings"
	}
	color := req.Color
	if color == "" {
		color = "#4EDE93"
	}

	targetDate := strings.TrimSpace(req.TargetDate)
	if idx := strings.Index(targetDate, "T"); idx != -1 {
		targetDate = targetDate[:idx]
	}
	if idx := strings.Index(targetDate, " "); idx != -1 {
		targetDate = targetDate[:idx]
	}

	goal := &models.SavingsGoal{
		UserID:          userID,
		Name:            req.Name,
		TargetAmount:    req.TargetAmount,
		CurrentAmount:   req.CurrentAmount,
		TargetDate:      targetDate,
		AutoDebitAmount: req.AutoDebitAmount,
		Icon:            icon,
		Color:           color,
		IsCompleted:     req.CurrentAmount >= req.TargetAmount,
	}

	if err := s.goalRepo.Create(goal); err != nil {
		return nil, err
	}
	return goal, nil
}

func (s *savingsGoalService) GetGoals(userID uuid.UUID) ([]models.SavingsGoal, error) {
	return s.goalRepo.GetByUserID(userID)
}

func (s *savingsGoalService) GetGoalByID(id uuid.UUID, userID uuid.UUID) (*models.SavingsGoal, error) {
	return s.goalRepo.GetByID(id, userID)
}

func (s *savingsGoalService) UpdateGoal(id uuid.UUID, userID uuid.UUID, req *models.UpdateSavingsGoalRequest) (*models.SavingsGoal, error) {
	goal, err := s.goalRepo.GetByID(id, userID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		goal.Name = *req.Name
	}
	if req.TargetAmount != nil {
		goal.TargetAmount = *req.TargetAmount
	}
	if req.CurrentAmount != nil {
		goal.CurrentAmount = *req.CurrentAmount
	}
	if req.TargetDate != nil {
		td := strings.TrimSpace(*req.TargetDate)
		if idx := strings.Index(td, "T"); idx != -1 {
			td = td[:idx]
		}
		if idx := strings.Index(td, " "); idx != -1 {
			td = td[:idx]
		}
		goal.TargetDate = td
	}
	if req.AutoDebitAmount != nil {
		goal.AutoDebitAmount = *req.AutoDebitAmount
	}
	if req.Icon != nil {
		goal.Icon = *req.Icon
	}
	if req.Color != nil {
		goal.Color = *req.Color
	}
	if req.IsCompleted != nil {
		goal.IsCompleted = *req.IsCompleted
	} else if goal.CurrentAmount >= goal.TargetAmount {
		goal.IsCompleted = true
	}

	if err := s.goalRepo.Update(goal); err != nil {
		return nil, err
	}

	return goal, nil
}

func (s *savingsGoalService) DepositGoal(userID uuid.UUID, goalID uuid.UUID, req *models.DepositSavingsGoalRequest) (*models.SavingsGoal, error) {
	return s.goalRepo.Deposit(userID, goalID, req.Amount)
}

func (s *savingsGoalService) CompleteGoal(userID uuid.UUID, goalID uuid.UUID, req *models.CompleteSavingsGoalRequest) (*models.SavingsGoal, error) {
	return s.goalRepo.CompleteGoal(userID, goalID, req.WalletID, req.CategoryID, req.ActualAmount, req.Notes)
}

func (s *savingsGoalService) DeleteGoal(id uuid.UUID, userID uuid.UUID) error {
	return s.goalRepo.Delete(id, userID)
}
