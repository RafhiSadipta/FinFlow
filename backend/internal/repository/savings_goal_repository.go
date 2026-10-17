package repository

import (
	"errors"
	"finflow-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SavingsGoalRepository interface {
	Create(goal *models.SavingsGoal) error
	GetByID(id uuid.UUID, userID uuid.UUID) (*models.SavingsGoal, error)
	GetByUserID(userID uuid.UUID) ([]models.SavingsGoal, error)
	Update(goal *models.SavingsGoal) error
	Delete(id uuid.UUID, userID uuid.UUID) error
	Deposit(userID uuid.UUID, goalID uuid.UUID, walletID uuid.UUID, amount float64) (*models.SavingsGoal, error)
}

type savingsGoalRepository struct {
	db *gorm.DB
}

func NewSavingsGoalRepository(db *gorm.DB) SavingsGoalRepository {
	return &savingsGoalRepository{db: db}
}

func (r *savingsGoalRepository) Create(goal *models.SavingsGoal) error {
	return r.db.Create(goal).Error
}

func (r *savingsGoalRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*models.SavingsGoal, error) {
	var goal models.SavingsGoal
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&goal).Error
	if err != nil {
		return nil, err
	}
	return &goal, nil
}

func (r *savingsGoalRepository) GetByUserID(userID uuid.UUID) ([]models.SavingsGoal, error) {
	var goals []models.SavingsGoal
	err := r.db.Where("user_id = ?", userID).Order("created_at ASC").Find(&goals).Error
	return goals, err
}

func (r *savingsGoalRepository) Update(goal *models.SavingsGoal) error {
	return r.db.Save(goal).Error
}

func (r *savingsGoalRepository) Delete(id uuid.UUID, userID uuid.UUID) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.SavingsGoal{}).Error
}

func (r *savingsGoalRepository) Deposit(userID uuid.UUID, goalID uuid.UUID, walletID uuid.UUID, amount float64) (*models.SavingsGoal, error) {
	var goal models.SavingsGoal
	err := r.db.Transaction(func(tx *gorm.DB) error {
		// 1. Check wallet balance
		var wallet models.Wallet
		if err := tx.Where("id = ? AND user_id = ?", walletID, userID).First(&wallet).Error; err != nil {
			return errors.New("wallet not found")
		}

		if wallet.Balance < amount {
			return errors.New("insufficient wallet balance")
		}

		// 2. Deduct wallet balance
		if err := tx.Model(&models.Wallet{}).Where("id = ?", walletID).
			UpdateColumn("balance", gorm.Expr("balance - ?", amount)).Error; err != nil {
			return err
		}

		// 3. Find goal and update amount
		if err := tx.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
			return err
		}

		goal.CurrentAmount += amount
		if goal.CurrentAmount >= goal.TargetAmount {
			goal.IsCompleted = true
		}

		if err := tx.Save(&goal).Error; err != nil {
			return err
		}

		// 4. Record as an expense/savings transaction
		trans := &models.Transaction{
			UserID:   userID,
			WalletID: walletID,
			Type:     "expense",
			Amount:   amount,
			Notes:    "Setoran Tabungan: " + goal.Name,
		}
		if err := tx.Create(trans).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	return &goal, nil
}
