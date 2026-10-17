package repository

import (
	"finflow-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CategoryRepository interface {
	Create(category *models.Category) error
	GetByID(id uuid.UUID, userID uuid.UUID) (*models.Category, error)
	GetByUserID(userID uuid.UUID) ([]models.Category, error)
	GetDeleted(userID uuid.UUID) ([]models.Category, error)
	Update(category *models.Category) error
	Delete(id uuid.UUID, userID uuid.UUID) error
	Restore(id uuid.UUID, userID uuid.UUID) error
}

type categoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) Create(category *models.Category) error {
	return r.db.Create(category).Error
}

func (r *categoryRepository) GetByID(id uuid.UUID, userID uuid.UUID) (*models.Category, error) {
	var category models.Category
	err := r.db.Where("id = ? AND (user_id = ? OR user_id IS NULL)", id, userID).First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *categoryRepository) GetByUserID(userID uuid.UUID) ([]models.Category, error) {
	var categories []models.Category
	// Fetch active user categories (GORM automatically excludes deleted_at IS NOT NULL)
	err := r.db.Where("user_id = ?", userID).Order("created_at ASC").Find(&categories).Error
	if err != nil {
		return nil, err
	}
	if len(categories) == 0 {
		// Fallback for safety if user has no personal categories yet
		_ = r.db.Where("user_id IS NULL").Order("created_at ASC").Find(&categories).Error
	}
	return categories, nil
}

func (r *categoryRepository) GetDeleted(userID uuid.UUID) ([]models.Category, error) {
	var categories []models.Category
	// Fetch soft-deleted categories using Unscoped()
	err := r.db.Unscoped().Where("user_id = ? AND deleted_at IS NOT NULL", userID).Order("deleted_at DESC").Find(&categories).Error
	return categories, err
}

func (r *categoryRepository) Update(category *models.Category) error {
	return r.db.Save(category).Error
}

func (r *categoryRepository) Delete(id uuid.UUID, userID uuid.UUID) error {
	// GORM soft-deletes the category by setting deleted_at = NOW()
	return r.db.Where("id = ? AND (user_id = ? OR user_id IS NULL)", id, userID).Delete(&models.Category{}).Error
}

func (r *categoryRepository) Restore(id uuid.UUID, userID uuid.UUID) error {
	// Restores soft-deleted category by resetting deleted_at to NULL
	return r.db.Unscoped().Model(&models.Category{}).Where("id = ? AND user_id = ?", id, userID).Update("deleted_at", nil).Error
}
