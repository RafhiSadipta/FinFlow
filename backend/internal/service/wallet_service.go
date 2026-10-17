package service

import (
	"finflow-backend/internal/models"
	"finflow-backend/internal/repository"

	"github.com/google/uuid"
)

type WalletService interface {
	CreateWallet(userID uuid.UUID, req *models.CreateWalletRequest) (*models.Wallet, error)
	GetWallets(userID uuid.UUID) ([]models.Wallet, float64, error)
	GetWalletByID(id uuid.UUID, userID uuid.UUID) (*models.Wallet, error)
	UpdateWallet(id uuid.UUID, userID uuid.UUID, req *models.UpdateWalletRequest) (*models.Wallet, error)
	DeleteWallet(id uuid.UUID, userID uuid.UUID) error
}

type walletService struct {
	walletRepo repository.WalletRepository
}

func NewWalletService(walletRepo repository.WalletRepository) WalletService {
	return &walletService{walletRepo: walletRepo}
}

func (s *walletService) CreateWallet(userID uuid.UUID, req *models.CreateWalletRequest) (*models.Wallet, error) {
	color := req.Color
	if color == "" {
		color = "#10B981"
	}
	icon := req.Icon
	if icon == "" {
		icon = "account_balance_wallet"
	}

	wallet := &models.Wallet{
		UserID:        userID,
		Name:          req.Name,
		Type:          req.Type,
		Balance:       req.Balance,
		AccountNumber: req.AccountNumber,
		Icon:          icon,
		Color:         color,
		IsActive:      true,
	}

	if err := s.walletRepo.Create(wallet); err != nil {
		return nil, err
	}
	return wallet, nil
}

func (s *walletService) GetWallets(userID uuid.UUID) ([]models.Wallet, float64, error) {
	wallets, err := s.walletRepo.GetByUserID(userID)
	if err != nil {
		return nil, 0, err
	}

	var totalBalance float64
	for _, w := range wallets {
		if w.IsActive {
			totalBalance += w.Balance
		}
	}

	return wallets, totalBalance, nil
}

func (s *walletService) GetWalletByID(id uuid.UUID, userID uuid.UUID) (*models.Wallet, error) {
	return s.walletRepo.GetByID(id, userID)
}

func (s *walletService) UpdateWallet(id uuid.UUID, userID uuid.UUID, req *models.UpdateWalletRequest) (*models.Wallet, error) {
	wallet, err := s.walletRepo.GetByID(id, userID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		wallet.Name = *req.Name
	}
	if req.Type != nil {
		wallet.Type = *req.Type
	}
	if req.Balance != nil {
		wallet.Balance = *req.Balance
	}
	if req.AccountNumber != nil {
		wallet.AccountNumber = req.AccountNumber
	}
	if req.Icon != nil {
		wallet.Icon = *req.Icon
	}
	if req.Color != nil {
		wallet.Color = *req.Color
	}
	if req.IsActive != nil {
		wallet.IsActive = *req.IsActive
	}

	if err := s.walletRepo.Update(wallet); err != nil {
		return nil, err
	}

	return wallet, nil
}

func (s *walletService) DeleteWallet(id uuid.UUID, userID uuid.UUID) error {
	return s.walletRepo.Delete(id, userID)
}
