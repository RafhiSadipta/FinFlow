package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SavingsGoal struct {
	ID              uuid.UUID      `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID          uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Name            string         `gorm:"type:varchar(100);not null" json:"name"`
	TargetAmount    float64        `gorm:"type:numeric(15,2);not null" json:"target_amount"`
	CurrentAmount   float64        `gorm:"type:numeric(15,2);not null;default:0.00" json:"current_amount"`
	TargetDate      string         `gorm:"type:varchar(50)" json:"target_date"`
	AutoDebitAmount float64        `gorm:"type:numeric(15,2);default:0.00" json:"auto_debit_amount"`
	Icon            string         `gorm:"type:varchar(50);default:'savings'" json:"icon"`
	Color           string         `gorm:"type:varchar(20);default:'#4EDE93'" json:"color"`
	IsCompleted     bool           `gorm:"default:false" json:"is_completed"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

type CreateSavingsGoalRequest struct {
	Name            string  `json:"name" binding:"required"`
	TargetAmount    float64 `json:"target_amount" binding:"required,gt=0"`
	CurrentAmount   float64 `json:"current_amount"`
	TargetDate      string  `json:"target_date"`
	AutoDebitAmount float64 `json:"auto_debit_amount"`
	Icon            string  `json:"icon"`
	Color           string  `json:"color"`
}

type UpdateSavingsGoalRequest struct {
	Name            *string  `json:"name"`
	TargetAmount    *float64 `json:"target_amount"`
	CurrentAmount   *float64 `json:"current_amount"`
	TargetDate      *string  `json:"target_date"`
	AutoDebitAmount *float64 `json:"auto_debit_amount"`
	Icon            *string  `json:"icon"`
	Color           *string  `json:"color"`
	IsCompleted     *bool    `json:"is_completed"`
}

type DepositSavingsGoalRequest struct {
	Amount   float64    `json:"amount" binding:"required,gt=0"`
	WalletID *uuid.UUID `json:"wallet_id"` // Optional: for reference
}

type CompleteSavingsGoalRequest struct {
	ActualAmount float64    `json:"actual_amount" binding:"required,gt=0"`
	WalletID     uuid.UUID  `json:"wallet_id" binding:"required"`
	CategoryID   *uuid.UUID `json:"category_id"`
	Notes        string     `json:"notes"`
}
