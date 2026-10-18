package repository

import (
	"errors"
	"time"

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
	Deposit(userID uuid.UUID, goalID uuid.UUID, amount float64) (*models.SavingsGoal, error)
	CompleteGoal(userID uuid.UUID, goalID uuid.UUID, walletID uuid.UUID, categoryID *uuid.UUID, actualAmount float64, notes string) (*models.SavingsGoal, error)
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

// Deposit: Menabung / menambah progres target tanpa memotong saldo dompet atau mencatat expense semu.
// Duit masih ada di rekening pengguna, hanya di-alokasikan untuk target impian.
func (r *savingsGoalRepository) Deposit(userID uuid.UUID, goalID uuid.UUID, amount float64) (*models.SavingsGoal, error) {
	var goal models.SavingsGoal
	if err := r.db.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
		return nil, err
	}

	goal.CurrentAmount += amount

	if err := r.db.Save(&goal).Error; err != nil {
		return nil, err
	}
	return &goal, nil
}

// CompleteGoal: Realisasi Pembelian Target Impian
// Memotong saldo dompet sesuai harga aktual, mencatat transaksi expense belanja nyata, dan menandai target selesai.
func (r *savingsGoalRepository) CompleteGoal(userID uuid.UUID, goalID uuid.UUID, walletID uuid.UUID, categoryID *uuid.UUID, actualAmount float64, notes string) (*models.SavingsGoal, error) {
	var goal models.SavingsGoal
	err := r.db.Transaction(func(tx *gorm.DB) error {
		// 1. Find goal
		if err := tx.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
			return errors.New("target impian tidak ditemukan")
		}

		// 2. Check wallet balance
		var wallet models.Wallet
		if err := tx.Where("id = ? AND user_id = ?", walletID, userID).First(&wallet).Error; err != nil {
			return errors.New("dompet pembayaran tidak ditemukan")
		}

		if wallet.Balance < actualAmount {
			return errors.New("saldo dompet tidak mencukupi untuk pembelian ini")
		}

		// 3. Potong saldo dompet pembayaran
		if err := tx.Model(&models.Wallet{}).Where("id = ?", walletID).
			UpdateColumn("balance", gorm.Expr("balance - ?", actualAmount)).Error; err != nil {
			return err
		}

		// 4. Update status goal menjadi selesai
		goal.IsCompleted = true
		if goal.CurrentAmount < actualAmount {
			goal.CurrentAmount = actualAmount
		}
		if err := tx.Save(&goal).Error; err != nil {
			return err
		}

		// 5. Category resolution (default to 'wants' or 'expense')
		catID := categoryID
		if catID == nil {
			var cat models.Category
			if err := tx.Where("(user_id = ? OR user_id IS NULL) AND type = 'expense' AND (allocation_group = 'wants' OR LOWER(name) LIKE '%belanja%')", userID).
				Order("user_id DESC NULLS LAST").First(&cat).Error; err == nil {
				catID = &cat.ID
			}
		}

		txNotes := notes
		if txNotes == "" {
			txNotes = "Pembelian Target Impian: " + goal.Name
		}

		// 6. Catat transaksi pengeluaran (expense) belanja nyata
		trans := &models.Transaction{
			UserID:          userID,
			WalletID:        walletID,
			CategoryID:      catID,
			Type:            "expense",
			Amount:          actualAmount,
			TransactionDate: time.Now().UTC(),
			Notes:           txNotes,
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
