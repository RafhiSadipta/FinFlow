package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Transaction struct {
	ID                  uuid.UUID      `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID              uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	WalletID            uuid.UUID      `gorm:"type:uuid;not null;index" json:"wallet_id"`
	DestinationWalletID *uuid.UUID     `gorm:"type:uuid" json:"destination_wallet_id"` // For transfer
	CategoryID          *uuid.UUID     `gorm:"type:uuid;index" json:"category_id"`
	Type                string         `gorm:"type:varchar(20);not null" json:"type"` // 'expense', 'income', 'transfer'
	Amount              float64        `gorm:"type:numeric(15,2);not null" json:"amount"`
	TransactionDate     time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"transaction_date"`
	Notes               string         `gorm:"type:text" json:"notes"`
	ReceiptURL          *string        `gorm:"type:text" json:"receipt_url"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Wallet            *Wallet   `gorm:"foreignKey:WalletID" json:"wallet,omitempty"`
	DestinationWallet *Wallet   `gorm:"foreignKey:DestinationWalletID" json:"destination_wallet,omitempty"`
	Category          *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

type CreateTransactionRequest struct {
	WalletID            uuid.UUID  `json:"wallet_id" binding:"required"`
	DestinationWalletID *uuid.UUID `json:"destination_wallet_id"`
	CategoryID          *uuid.UUID `json:"category_id"`
	Type                string     `json:"type" binding:"required"` // expense, income, transfer
	Amount              float64    `json:"amount" binding:"required,gt=0"`
	TransactionDate     *time.Time `json:"transaction_date"`
	Notes               string     `json:"notes"`
	ReceiptURL          *string    `json:"receipt_url"`
}

type UpdateTransactionRequest struct {
	WalletID            *uuid.UUID `json:"wallet_id"`
	DestinationWalletID *uuid.UUID `json:"destination_wallet_id"`
	CategoryID          *uuid.UUID `json:"category_id"`
	Type                *string    `json:"type"`
	Amount              *float64   `json:"amount"`
	TransactionDate     *time.Time `json:"transaction_date"`
	Notes               *string    `json:"notes"`
	ReceiptURL          *string    `json:"receipt_url"`
}

type TransactionFilter struct {
	Type       string
	CategoryID *uuid.UUID
	WalletID   *uuid.UUID
	StartDate  *time.Time
	EndDate    *time.Time
	Limit      int
	Offset     int
}
