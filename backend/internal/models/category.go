package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Category struct {
	ID              uuid.UUID      `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID          *uuid.UUID     `gorm:"type:uuid;index" json:"user_id"` // NULL for system categories
	Name            string         `gorm:"type:varchar(100);not null" json:"name"`
	Type            string         `gorm:"type:varchar(20);not null" json:"type"` // 'expense' or 'income'
	AllocationGroup *string        `gorm:"type:varchar(20)" json:"allocation_group"` // 'needs', 'wants', 'savings', or null
	Icon            string         `gorm:"type:varchar(50);not null;default:'category'" json:"icon"`
	Color           string         `gorm:"type:varchar(20);default:'#06B6D4'" json:"color"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

type CreateCategoryRequest struct {
	Name            string  `json:"name" binding:"required"`
	Type            string  `json:"type" binding:"required"` // expense or income
	AllocationGroup *string `json:"allocation_group"`        // needs, wants, savings
	Icon            string  `json:"icon" binding:"required"`
	Color           string  `json:"color" binding:"required"`
}

type UpdateCategoryRequest struct {
	Name            *string `json:"name"`
	Type            *string `json:"type"`
	AllocationGroup *string `json:"allocation_group"`
	Icon            *string `json:"icon"`
	Color           *string `json:"color"`
}
