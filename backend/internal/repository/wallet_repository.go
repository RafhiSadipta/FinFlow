package repository

import (
	"finflow-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WalletRepository interface {
	Create(wallet *models.Wallet) error
	GetByID(id uuid.UUID, userID uuid.UUID) (*models.Wallet, error)
	GetByUserID(userID uuid.UUID) ([]models.Wallet, error)
	Update(wallet *models.Wallet) error
	Delete(id uuid.UUID, userID uuid.UUID) error
	UpdateBalance(tx *gorm.DB, walletID uuid.UUID, delta float64) error
}

type walletRepository struct {
	db *gorm.DB
}

func NewWalletRepository(db *gorm.DB) WalletRepository {
	return &walletRepository{db: db}
}

func (r *walletRepository) Create(wallet *models.Wallet) error {
	return r.db.Create(wallet).Error
}

func (r *walletRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*models.Wallet, error) {
	var wallet models.Wallet
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&wallet).Error
	if err != nil {
		return nil, err
	}
	return &wallet, nil
}

func (r *walletRepository) GetByUserID(userID uuid.UUID) ([]models.Wallet, error) {
	var wallets []models.Wallet
	err := r.db.Where("user_id = ?", userID).Order("created_at ASC").Find(&wallets).Error
	return wallets, err
}

func (r *walletRepository) Update(wallet *models.Wallet) error {
	return r.db.Save(wallet).Error
}

func (r *walletRepository) Delete(id uuid.UUID, userID uuid.UUID) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Wallet{}).Error
}

func (r *walletRepository) UpdateBalance(tx *gorm.DB, walletID uuid.UUID, delta float64) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.Model(&models.Wallet{}).Where("id = ?", walletID).UpdateColumn("balance", gorm.Expr("balance + ?", delta)).Error
}
