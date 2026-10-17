package repository

import (
	"finflow-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BudgetRepository interface {
	Upsert(budget *models.Budget) error
	GetByUserAndPeriod(userID uuid.UUID, month int, year int) ([]models.Budget, error)
	GetByID(id uuid.UUID, userID uuid.UUID) (*models.Budget, error)
	Delete(id uuid.UUID, userID uuid.UUID) error
}

type budgetRepository struct {
	db *gorm.DB
}

func NewBudgetRepository(db *gorm.DB) BudgetRepository {
	return &budgetRepository{db: db}
}

func (r *budgetRepository) Upsert(budget *models.Budget) error {
	var existing models.Budget
	err := r.db.Where("user_id = ? AND category_id = ? AND month = ? AND year = ?", budget.UserID, budget.CategoryID, budget.Month, budget.Year).First(&existing).Error
	if err == nil {
		budget.ID = existing.ID
		return r.db.Model(&existing).Updates(map[string]interface{}{
			"limit_amount": budget.LimitAmount,
		}).Error
	}
	return r.db.Create(budget).Error
}

func (r *budgetRepository) GetByUserAndPeriod(userID uuid.UUID, month int, year int) ([]models.Budget, error) {
	var budgets []models.Budget
	err := r.db.Preload("Category").Where("user_id = ? AND month = ? AND year = ?", userID, month, year).Find(&budgets).Error
	return budgets, err
}

func (r *budgetRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*models.Budget, error) {
	var budget models.Budget
	err := r.db.Preload("Category").Where("id = ? AND user_id = ?", id, userID).First(&budget).Error
	if err != nil {
		return nil, err
	}
	return &budget, nil
}

func (r *budgetRepository) Delete(id uuid.UUID, userID uuid.UUID) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Budget{}).Error
}
