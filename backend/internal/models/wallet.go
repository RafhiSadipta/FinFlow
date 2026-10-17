package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Wallet struct {
	ID            uuid.UUID      `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID        uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Name          string         `gorm:"type:varchar(100);not null" json:"name"`
	Type          string         `gorm:"type:varchar(50);not null;default:'bank'" json:"type"` // bank, cash, ewallet, investment
	Balance       float64        `gorm:"type:numeric(15,2);not null;default:0.00" json:"balance"`
	AccountNumber *string        `gorm:"type:varchar(100)" json:"account_number"`
	Icon          string         `gorm:"type:varchar(50);default:'account_balance_wallet'" json:"icon"`
	Color         string         `gorm:"type:varchar(20);default:'#10B981'" json:"color"`
	IsActive      bool           `gorm:"default:true" json:"is_active"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

type CreateWalletRequest struct {
	Name          string  `json:"name" binding:"required"`
	Type          string  `json:"type" binding:"required"`
	Balance       float64 `json:"balance"`
	AccountNumber *string `json:"account_number"`
	Icon          string  `json:"icon"`
	Color         string  `json:"color"`
}

type UpdateWalletRequest struct {
	Name          *string  `json:"name"`
	Type          *string  `json:"type"`
	Balance       *float64 `json:"balance"`
	AccountNumber *string  `json:"account_number"`
	Icon          *string  `json:"icon"`
	Color         *string  `json:"color"`
	IsActive      *bool    `json:"is_active"`
}
