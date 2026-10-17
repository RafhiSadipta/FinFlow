package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Budget struct {
	ID          uuid.UUID      `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	CategoryID  uuid.UUID      `gorm:"type:uuid;not null;index" json:"category_id"`
	LimitAmount float64        `gorm:"type:numeric(15,2);not null" json:"limit_amount"`
	Month       int            `gorm:"not null" json:"month"`
	Year        int            `gorm:"not null" json:"year"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	Category *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

type SetBudgetRequest struct {
	CategoryID  uuid.UUID `json:"category_id" binding:"required"`
	LimitAmount float64   `json:"limit_amount" binding:"required,gt=0"`
	Month       int       `json:"month" binding:"required,min=1,max=12"`
	Year        int       `json:"year" binding:"required,min=2000"`
}

type BudgetProgressResponse struct {
	ID             uuid.UUID `json:"id"`
	CategoryID     uuid.UUID `json:"category_id"`
	CategoryName   string    `json:"category_name"`
	CategoryIcon   string    `json:"category_icon"`
	CategoryColor  string    `json:"category_color"`
	LimitAmount    float64   `json:"limit_amount"`
	SpentAmount    float64   `json:"spent_amount"`
	RemainingAmount float64  `json:"remaining_amount"`
	Percentage     float64   `json:"percentage"`
	Month          int       `json:"month"`
	Year           int       `json:"year"`
}
