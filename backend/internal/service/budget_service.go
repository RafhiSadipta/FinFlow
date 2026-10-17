package service

import (
	"finflow-backend/internal/models"
	"finflow-backend/internal/repository"

	"github.com/google/uuid"
)

type BudgetService interface {
	SetBudget(userID uuid.UUID, req *models.SetBudgetRequest) (*models.Budget, error)
	GetBudgets(userID uuid.UUID, month int, year int) ([]models.BudgetProgressResponse, error)
	DeleteBudget(id uuid.UUID, userID uuid.UUID) error
}

type budgetService struct {
	budgetRepo   repository.BudgetRepository
	categoryRepo repository.CategoryRepository
	txRepo       repository.TransactionRepository
}

func NewBudgetService(budgetRepo repository.BudgetRepository, categoryRepo repository.CategoryRepository, txRepo repository.TransactionRepository) BudgetService {
	return &budgetService{
		budgetRepo:   budgetRepo,
		categoryRepo: categoryRepo,
		txRepo:       txRepo,
	}
}

func (s *budgetService) SetBudget(userID uuid.UUID, req *models.SetBudgetRequest) (*models.Budget, error) {
	budget := &models.Budget{
		UserID:      userID,
		CategoryID:  req.CategoryID,
		LimitAmount: req.LimitAmount,
		Month:       req.Month,
		Year:        req.Year,
	}

	if err := s.budgetRepo.Upsert(budget); err != nil {
		return nil, err
	}

	return s.budgetRepo.GetByID(budget.ID, userID)
}

func (s *budgetService) GetBudgets(userID uuid.UUID, month int, year int) ([]models.BudgetProgressResponse, error) {
	budgets, err := s.budgetRepo.GetByUserAndPeriod(userID, month, year)
	if err != nil {
		return nil, err
	}

	categorySpendings, err := s.txRepo.GetCategorySpendings(userID, month, year)
	if err != nil {
		return nil, err
	}

	var responses []models.BudgetProgressResponse
	for _, b := range budgets {
		spent := categorySpendings[b.CategoryID]
		remaining := b.LimitAmount - spent
		percentage := 0.0
		if b.LimitAmount > 0 {
			percentage = (spent / b.LimitAmount) * 100
		}

		catName := "Kategori"
		catIcon := "category"
		catColor := "#10B981"
		if b.Category != nil {
			catName = b.Category.Name
			catIcon = b.Category.Icon
			catColor = b.Category.Color
		}

		responses = append(responses, models.BudgetProgressResponse{
			ID:              b.ID,
			CategoryID:      b.CategoryID,
			CategoryName:    catName,
			CategoryIcon:    catIcon,
			CategoryColor:   catColor,
			LimitAmount:     b.LimitAmount,
			SpentAmount:     spent,
			RemainingAmount: remaining,
			Percentage:      percentage,
			Month:           b.Month,
			Year:            b.Year,
		})
	}

	return responses, nil
}

func (s *budgetService) DeleteBudget(id uuid.UUID, userID uuid.UUID) error {
	return s.budgetRepo.Delete(id, userID)
}
