package service

import (
	"errors"
	"time"

	"finflow-backend/internal/models"
	"finflow-backend/internal/repository"

	"github.com/google/uuid"
)

type TransactionService interface {
	CreateTransaction(userID uuid.UUID, req *models.CreateTransactionRequest) (*models.Transaction, error)
	GetTransactions(userID uuid.UUID, filter models.TransactionFilter) ([]models.Transaction, int64, error)
	GetTransactionByID(id uuid.UUID, userID uuid.UUID) (*models.Transaction, error)
	UpdateTransaction(id uuid.UUID, userID uuid.UUID, req *models.UpdateTransactionRequest) (*models.Transaction, error)
	DeleteTransaction(id uuid.UUID, userID uuid.UUID) error
}

type transactionService struct {
	txRepo     repository.TransactionRepository
	walletRepo repository.WalletRepository
}

func NewTransactionService(txRepo repository.TransactionRepository, walletRepo repository.WalletRepository) TransactionService {
	return &transactionService{
		txRepo:     txRepo,
		walletRepo: walletRepo,
	}
}

func (s *transactionService) CreateTransaction(userID uuid.UUID, req *models.CreateTransactionRequest) (*models.Transaction, error) {
	// 1. Verify wallet belongs to user
	_, err := s.walletRepo.GetByID(req.WalletID, userID)
	if err != nil {
		return nil, errors.New("source wallet not found")
	}

	if req.Type == "transfer" {
		if req.DestinationWalletID == nil {
			return nil, errors.New("destination wallet is required for transfer")
		}
		if req.WalletID == *req.DestinationWalletID {
			return nil, errors.New("source and destination wallets cannot be the same")
		}
		_, err := s.walletRepo.GetByID(*req.DestinationWalletID, userID)
		if err != nil {
			return nil, errors.New("destination wallet not found")
		}
	}

	txDate := time.Now().UTC()
	if req.TransactionDate != nil {
		txDate = *req.TransactionDate
	}

	tx := &models.Transaction{
		UserID:              userID,
		WalletID:            req.WalletID,
		DestinationWalletID: req.DestinationWalletID,
		CategoryID:          req.CategoryID,
		Type:                req.Type,
		Amount:              req.Amount,
		TransactionDate:     txDate,
		Notes:               req.Notes,
		ReceiptURL:          req.ReceiptURL,
	}

	if err := s.txRepo.Create(tx); err != nil {
		return nil, err
	}

	return s.txRepo.GetByID(tx.ID, userID)
}

func (s *transactionService) GetTransactions(userID uuid.UUID, filter models.TransactionFilter) ([]models.Transaction, int64, error) {
	return s.txRepo.GetByFilter(userID, filter)
}

func (s *transactionService) GetTransactionByID(id uuid.UUID, userID uuid.UUID) (*models.Transaction, error) {
	return s.txRepo.GetByID(id, userID)
}

func (s *transactionService) UpdateTransaction(id uuid.UUID, userID uuid.UUID, req *models.UpdateTransactionRequest) (*models.Transaction, error) {
	oldTx, err := s.txRepo.GetByID(id, userID)
	if err != nil {
		return nil, err
	}

	updatedTx := *oldTx

	if req.WalletID != nil {
		updatedTx.WalletID = *req.WalletID
	}
	if req.DestinationWalletID != nil {
		updatedTx.DestinationWalletID = req.DestinationWalletID
	}
	if req.CategoryID != nil {
		updatedTx.CategoryID = req.CategoryID
	}
	if req.Type != nil {
		updatedTx.Type = *req.Type
	}
	if req.Amount != nil {
		updatedTx.Amount = *req.Amount
	}
	if req.TransactionDate != nil {
		updatedTx.TransactionDate = *req.TransactionDate
	}
	if req.Notes != nil {
		updatedTx.Notes = *req.Notes
	}
	if req.ReceiptURL != nil {
		updatedTx.ReceiptURL = req.ReceiptURL
	}

	if err := s.txRepo.Update(oldTx, &updatedTx); err != nil {
		return nil, err
	}

	return s.txRepo.GetByID(id, userID)
}

func (s *transactionService) DeleteTransaction(id uuid.UUID, userID uuid.UUID) error {
	return s.txRepo.Delete(id, userID)
}
