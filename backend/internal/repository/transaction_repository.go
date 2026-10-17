package repository

import (
	"errors"
	"finflow-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TransactionRepository interface {
	Create(tx *models.Transaction) error
	GetByID(id uuid.UUID, userID uuid.UUID) (*models.Transaction, error)
	GetByFilter(userID uuid.UUID, filter models.TransactionFilter) ([]models.Transaction, int64, error)
	Update(oldTx *models.Transaction, updatedTx *models.Transaction) error
	Delete(id uuid.UUID, userID uuid.UUID) error
	GetMonthlySummary(userID uuid.UUID, month int, year int) (float64, float64, error)
	GetCategorySpendings(userID uuid.UUID, month int, year int) (map[uuid.UUID]float64, error)
	GetDB() *gorm.DB
}

type transactionRepository struct {
	db *gorm.DB
}

func NewTransactionRepository(db *gorm.DB) TransactionRepository {
	return &transactionRepository{db: db}
}

func (r *transactionRepository) GetDB() *gorm.DB {
	return r.db
}

func (r *transactionRepository) Create(t *models.Transaction) error {
	return r.db.Transaction(func(dbTx *gorm.DB) error {
		// 1. Create transaction record
		if err := dbTx.Create(t).Error; err != nil {
			return err
		}

		// 2. Adjust wallet balances atomically
		switch t.Type {
		case "expense":
			if err := dbTx.Model(&models.Wallet{}).Where("id = ? AND user_id = ?", t.WalletID, t.UserID).
				UpdateColumn("balance", gorm.Expr("balance - ?", t.Amount)).Error; err != nil {
				return err
			}
		case "income":
			if err := dbTx.Model(&models.Wallet{}).Where("id = ? AND user_id = ?", t.WalletID, t.UserID).
				UpdateColumn("balance", gorm.Expr("balance + ?", t.Amount)).Error; err != nil {
				return err
			}
		case "transfer":
			if t.DestinationWalletID == nil {
				return errors.New("destination wallet is required for transfer")
			}
			// Deduct from source wallet
			if err := dbTx.Model(&models.Wallet{}).Where("id = ? AND user_id = ?", t.WalletID, t.UserID).
				UpdateColumn("balance", gorm.Expr("balance - ?", t.Amount)).Error; err != nil {
				return err
			}
			// Add to destination wallet
			if err := dbTx.Model(&models.Wallet{}).Where("id = ? AND user_id = ?", *t.DestinationWalletID, t.UserID).
				UpdateColumn("balance", gorm.Expr("balance + ?", t.Amount)).Error; err != nil {
				return err
			}
		default:
			return errors.New("unsupported transaction type")
		}

		return nil
	})
}

func (r *transactionRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*models.Transaction, error) {
	var tx models.Transaction
	err := r.db.Preload("Wallet").Preload("DestinationWallet").Preload("Category").
		Where("id = ? AND user_id = ?", id, userID).First(&tx).Error
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *transactionRepository) GetByFilter(userID uuid.UUID, filter models.TransactionFilter) ([]models.Transaction, int64, error) {
	var transactions []models.Transaction
	var total int64

	query := r.db.Model(&models.Transaction{}).Preload("Wallet").Preload("DestinationWallet").Preload("Category").
		Where("user_id = ?", userID)

	if filter.Type != "" && filter.Type != "all" {
		query = query.Where("type = ?", filter.Type)
	}

	if filter.CategoryID != nil {
		query = query.Where("category_id = ?", *filter.CategoryID)
	}

	if filter.WalletID != nil {
		query = query.Where("wallet_id = ? OR destination_wallet_id = ?", *filter.WalletID, *filter.WalletID)
	}

	if filter.StartDate != nil {
		query = query.Where("transaction_date >= ?", *filter.StartDate)
	}

	if filter.EndDate != nil {
		query = query.Where("transaction_date <= ?", *filter.EndDate)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}

	err := query.Order("transaction_date DESC, created_at DESC").Limit(limit).Offset(filter.Offset).Find(&transactions).Error
	return transactions, total, err
}

func (r *transactionRepository) Update(oldTx *models.Transaction, updatedTx *models.Transaction) error {
	return r.db.Transaction(func(dbTx *gorm.DB) error {
		// 1. Revert old transaction balances
		switch oldTx.Type {
		case "expense":
			if err := dbTx.Model(&models.Wallet{}).Where("id = ?", oldTx.WalletID).
				UpdateColumn("balance", gorm.Expr("balance + ?", oldTx.Amount)).Error; err != nil {
				return err
			}
		case "income":
			if err := dbTx.Model(&models.Wallet{}).Where("id = ?", oldTx.WalletID).
				UpdateColumn("balance", gorm.Expr("balance - ?", oldTx.Amount)).Error; err != nil {
				return err
			}
		case "transfer":
			if oldTx.DestinationWalletID != nil {
				// Refund source wallet
				if err := dbTx.Model(&models.Wallet{}).Where("id = ?", oldTx.WalletID).
					UpdateColumn("balance", gorm.Expr("balance + ?", oldTx.Amount)).Error; err != nil {
					return err
				}
				// Deduct from destination wallet
				if err := dbTx.Model(&models.Wallet{}).Where("id = ?", *oldTx.DestinationWalletID).
					UpdateColumn("balance", gorm.Expr("balance - ?", oldTx.Amount)).Error; err != nil {
					return err
				}
			}
		}

		// 2. Apply new transaction balances
		switch updatedTx.Type {
		case "expense":
			if err := dbTx.Model(&models.Wallet{}).Where("id = ?", updatedTx.WalletID).
				UpdateColumn("balance", gorm.Expr("balance - ?", updatedTx.Amount)).Error; err != nil {
				return err
			}
		case "income":
			if err := dbTx.Model(&models.Wallet{}).Where("id = ?", updatedTx.WalletID).
				UpdateColumn("balance", gorm.Expr("balance + ?", updatedTx.Amount)).Error; err != nil {
				return err
			}
		case "transfer":
			if updatedTx.DestinationWalletID == nil {
				return errors.New("destination wallet is required for transfer")
			}
			if err := dbTx.Model(&models.Wallet{}).Where("id = ?", updatedTx.WalletID).
				UpdateColumn("balance", gorm.Expr("balance - ?", updatedTx.Amount)).Error; err != nil {
				return err
			}
			if err := dbTx.Model(&models.Wallet{}).Where("id = ?", *updatedTx.DestinationWalletID).
				UpdateColumn("balance", gorm.Expr("balance + ?", updatedTx.Amount)).Error; err != nil {
				return err
			}
		}

		// 3. Save updated transaction record
		return dbTx.Save(updatedTx).Error
	})
}

func (r *transactionRepository) Delete(id uuid.UUID, userID uuid.UUID) error {
	return r.db.Transaction(func(dbTx *gorm.DB) error {
		var tx models.Transaction
		if err := dbTx.Where("id = ? AND user_id = ?", id, userID).First(&tx).Error; err != nil {
			return err
		}

		// Revert balances
		switch tx.Type {
		case "expense":
			if err := dbTx.Model(&models.Wallet{}).Where("id = ?", tx.WalletID).
				UpdateColumn("balance", gorm.Expr("balance + ?", tx.Amount)).Error; err != nil {
				return err
			}
		case "income":
			if err := dbTx.Model(&models.Wallet{}).Where("id = ?", tx.WalletID).
				UpdateColumn("balance", gorm.Expr("balance - ?", tx.Amount)).Error; err != nil {
				return err
			}
		case "transfer":
			if tx.DestinationWalletID != nil {
				if err := dbTx.Model(&models.Wallet{}).Where("id = ?", tx.WalletID).
					UpdateColumn("balance", gorm.Expr("balance + ?", tx.Amount)).Error; err != nil {
					return err
				}
				if err := dbTx.Model(&models.Wallet{}).Where("id = ?", *tx.DestinationWalletID).
					UpdateColumn("balance", gorm.Expr("balance - ?", tx.Amount)).Error; err != nil {
					return err
				}
			}
		}

		return dbTx.Delete(&tx).Error
	})
}

func (r *transactionRepository) GetMonthlySummary(userID uuid.UUID, month int, year int) (float64, float64, error) {
	type Result struct {
		Type  string  `gorm:"column:type"`
		Total float64 `gorm:"column:total"`
	}

	var results []Result
	err := r.db.Model(&models.Transaction{}).
		Select("type, COALESCE(SUM(amount), 0) as total").
		Where("user_id = ? AND EXTRACT(MONTH FROM transaction_date) = ? AND EXTRACT(YEAR FROM transaction_date) = ?", userID, month, year).
		Group("type").
		Scan(&results).Error

	if err != nil {
		return 0, 0, err
	}

	var income, expense float64
	for _, res := range results {
		if res.Type == "income" {
			income = res.Total
		} else if res.Type == "expense" {
			expense = res.Total
		}
	}

	return income, expense, nil
}

func (r *transactionRepository) GetCategorySpendings(userID uuid.UUID, month int, year int) (map[uuid.UUID]float64, error) {
	type Result struct {
		CategoryID uuid.UUID `gorm:"column:category_id"`
		Total      float64   `gorm:"column:total"`
	}

	var results []Result
	err := r.db.Model(&models.Transaction{}).
		Select("category_id, COALESCE(SUM(amount), 0) as total").
		Where("user_id = ? AND type = 'expense' AND category_id IS NOT NULL AND EXTRACT(MONTH FROM transaction_date) = ? AND EXTRACT(YEAR FROM transaction_date) = ?", userID, month, year).
		Group("category_id").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	spendings := make(map[uuid.UUID]float64)
	for _, res := range results {
		spendings[res.CategoryID] = res.Total
	}

	return spendings, nil
}
