package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID                  uuid.UUID      `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Email               string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash        string         `gorm:"type:varchar(255);not null" json:"-"`
	FullName            string         `gorm:"type:varchar(100);not null" json:"full_name"`
	AvatarURL           *string        `gorm:"type:text" json:"avatar_url"`
	Currency            string         `gorm:"type:varchar(10);default:'IDR'" json:"currency"`
	MonthlyBudget       float64        `gorm:"type:numeric(15,2);default:0.00" json:"monthly_budget"`
	MonthlyIncomeTarget float64        `gorm:"type:numeric(15,2);default:0.00" json:"monthly_income_target"`
	NeedsPercentage     float64        `gorm:"type:numeric(5,2);default:50.00" json:"needs_percentage"`
	WantsPercentage     float64        `gorm:"type:numeric(5,2);default:30.00" json:"wants_percentage"`
	SavingsPercentage   float64        `gorm:"type:numeric(5,2);default:20.00" json:"savings_percentage"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Wallets      []Wallet      `gorm:"foreignKey:UserID" json:"wallets,omitempty"`
	Transactions []Transaction `gorm:"foreignKey:UserID" json:"transactions,omitempty"`
	Budgets      []Budget      `gorm:"foreignKey:UserID" json:"budgets,omitempty"`
	SavingsGoals []SavingsGoal `gorm:"foreignKey:UserID" json:"savings_goals,omitempty"`
}

// DTOs
type RegisterRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
	FullName string `json:"full_name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type UpdateProfileRequest struct {
	FullName            *string  `json:"full_name"`
	AvatarURL           *string  `json:"avatar_url"`
	Currency            *string  `json:"currency"`
	MonthlyBudget       *float64 `json:"monthly_budget"`
	MonthlyIncomeTarget *float64 `json:"monthly_income_target"`
	NeedsPercentage     *float64 `json:"needs_percentage"`
	WantsPercentage     *float64 `json:"wants_percentage"`
	SavingsPercentage   *float64 `json:"savings_percentage"`
}
