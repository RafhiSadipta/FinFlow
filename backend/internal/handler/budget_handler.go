package handler

import (
	"strconv"
	"time"

	"finflow-backend/internal/middleware"
	"finflow-backend/internal/models"
	"finflow-backend/internal/service"
	"finflow-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type BudgetHandler struct {
	budgetService service.BudgetService
}

func NewBudgetHandler(budgetService service.BudgetService) *BudgetHandler {
	return &BudgetHandler{budgetService: budgetService}
}

func (h *BudgetHandler) SetBudget(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req models.SetBudgetRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	if req.LimitAmount <= 0 {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Limit amount must be greater than 0")
	}
	if req.Month < 1 || req.Month > 12 {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Month must be between 1 and 12")
	}
	if req.Year < 2000 {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid year")
	}

	budget, err := h.budgetService.SetBudget(userID, &req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to set budget", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Budget saved successfully", budget)
}

func (h *BudgetHandler) GetBudgets(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	now := time.Now()
	month := int(now.Month())
	year := now.Year()

	if mStr := c.Query("month"); mStr != "" {
		if m, err := strconv.Atoi(mStr); err == nil && m >= 1 && m <= 12 {
			month = m
		}
	}
	if yStr := c.Query("year"); yStr != "" {
		if y, err := strconv.Atoi(yStr); err == nil && y >= 2000 {
			year = y
		}
	}

	budgets, err := h.budgetService.GetBudgets(userID, month, year)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to fetch budgets", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Budgets retrieved successfully", budgets)
}

func (h *BudgetHandler) Delete(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	budgetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid budget ID format")
	}

	if err := h.budgetService.DeleteBudget(budgetID, userID); err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to delete budget", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Budget deleted successfully", nil)
}
