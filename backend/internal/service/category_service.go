package service

import (
	"finflow-backend/internal/models"
	"finflow-backend/internal/repository"

	"github.com/google/uuid"
)

type CategoryService interface {
	CreateCategory(userID uuid.UUID, req *models.CreateCategoryRequest) (*models.Category, error)
	GetCategories(userID uuid.UUID) ([]models.Category, error)
	GetCategoryByID(id uuid.UUID, userID uuid.UUID) (*models.Category, error)
	GetDeletedCategories(userID uuid.UUID) ([]models.Category, error)
	UpdateCategory(id uuid.UUID, userID uuid.UUID, req *models.UpdateCategoryRequest) (*models.Category, error)
	DeleteCategory(id uuid.UUID, userID uuid.UUID) error
	RestoreCategory(id uuid.UUID, userID uuid.UUID) error
}

type categoryService struct {
	categoryRepo repository.CategoryRepository
}

func NewCategoryService(categoryRepo repository.CategoryRepository) CategoryService {
	return &categoryService{categoryRepo: categoryRepo}
}

func (s *categoryService) CreateCategory(userID uuid.UUID, req *models.CreateCategoryRequest) (*models.Category, error) {
	category := &models.Category{
		UserID:          &userID,
		Name:            req.Name,
		Type:            req.Type,
		AllocationGroup: req.AllocationGroup,
		Icon:            req.Icon,
		Color:           req.Color,
	}

	if err := s.categoryRepo.Create(category); err != nil {
		return nil, err
	}
	return category, nil
}

func (s *categoryService) GetCategories(userID uuid.UUID) ([]models.Category, error) {
	return s.categoryRepo.GetByUserID(userID)
}

func (s *categoryService) GetCategoryByID(id uuid.UUID, userID uuid.UUID) (*models.Category, error) {
	return s.categoryRepo.GetByID(id, userID)
}

func (s *categoryService) GetDeletedCategories(userID uuid.UUID) ([]models.Category, error) {
	return s.categoryRepo.GetDeleted(userID)
}

func (s *categoryService) UpdateCategory(id uuid.UUID, userID uuid.UUID, req *models.UpdateCategoryRequest) (*models.Category, error) {
	category, err := s.categoryRepo.GetByID(id, userID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		category.Name = *req.Name
	}
	if req.Type != nil {
		category.Type = *req.Type
	}
	if req.AllocationGroup != nil {
		category.AllocationGroup = req.AllocationGroup
	}
	if req.Icon != nil {
		category.Icon = *req.Icon
	}
	if req.Color != nil {
		category.Color = *req.Color
	}

	if err := s.categoryRepo.Update(category); err != nil {
		return nil, err
	}

	return category, nil
}

func (s *categoryService) DeleteCategory(id uuid.UUID, userID uuid.UUID) error {
	return s.categoryRepo.Delete(id, userID)
}

func (s *categoryService) RestoreCategory(id uuid.UUID, userID uuid.UUID) error {
	return s.categoryRepo.Restore(id, userID)
}
