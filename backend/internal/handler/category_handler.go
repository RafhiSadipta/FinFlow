package handler

import (
	"finflow-backend/internal/middleware"
	"finflow-backend/internal/models"
	"finflow-backend/internal/service"
	"finflow-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type CategoryHandler struct {
	categoryService service.CategoryService
}

func NewCategoryHandler(categoryService service.CategoryService) *CategoryHandler {
	return &CategoryHandler{categoryService: categoryService}
}

func (h *CategoryHandler) Create(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req models.CreateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	if req.Name == "" || req.Type == "" {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Category name and type are required")
	}

	category, err := h.categoryService.CreateCategory(userID, &req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to create category", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Category created successfully", category)
}

func (h *CategoryHandler) GetAll(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	categories, err := h.categoryService.GetCategories(userID)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to fetch categories", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Categories retrieved successfully", categories)
}

func (h *CategoryHandler) GetByID(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	categoryID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid category ID format")
	}

	category, err := h.categoryService.GetCategoryByID(categoryID, userID)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusNotFound, "Category not found")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Category retrieved successfully", category)
}

func (h *CategoryHandler) Update(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	categoryID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid category ID format")
	}

	var req models.UpdateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	category, err := h.categoryService.UpdateCategory(categoryID, userID, &req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Failed to update category", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Category updated successfully", category)
}

func (h *CategoryHandler) Delete(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	categoryID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid category ID format")
	}

	if err := h.categoryService.DeleteCategory(categoryID, userID); err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to delete category", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Category soft-deleted successfully", nil)
}

func (h *CategoryHandler) GetDeleted(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	categories, err := h.categoryService.GetDeletedCategories(userID)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to fetch deleted categories", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Deleted categories retrieved successfully", categories)
}

func (h *CategoryHandler) Restore(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	categoryID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid category ID format")
	}

	if err := h.categoryService.RestoreCategory(categoryID, userID); err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to restore category", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Category restored successfully", nil)
}
