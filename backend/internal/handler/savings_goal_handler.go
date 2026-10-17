package handler

import (
	"finflow-backend/internal/middleware"
	"finflow-backend/internal/models"
	"finflow-backend/internal/service"
	"finflow-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type SavingsGoalHandler struct {
	goalService service.SavingsGoalService
}

func NewSavingsGoalHandler(goalService service.SavingsGoalService) *SavingsGoalHandler {
	return &SavingsGoalHandler{goalService: goalService}
}

func (h *SavingsGoalHandler) Create(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req models.CreateSavingsGoalRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	if req.Name == "" || req.TargetAmount <= 0 {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Name and valid target amount are required")
	}

	goal, err := h.goalService.CreateGoal(userID, &req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to create savings goal", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Savings goal created successfully", goal)
}

func (h *SavingsGoalHandler) GetAll(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	goals, err := h.goalService.GetGoals(userID)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to fetch savings goals", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Savings goals retrieved successfully", goals)
}

func (h *SavingsGoalHandler) GetByID(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	goalID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid goal ID format")
	}

	goal, err := h.goalService.GetGoalByID(goalID, userID)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusNotFound, "Savings goal not found")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Savings goal retrieved successfully", goal)
}

func (h *SavingsGoalHandler) Update(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	goalID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid goal ID format")
	}

	var req models.UpdateSavingsGoalRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	goal, err := h.goalService.UpdateGoal(goalID, userID, &req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Failed to update savings goal", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Savings goal updated successfully", goal)
}

func (h *SavingsGoalHandler) Deposit(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	goalID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid goal ID format")
	}

	var req models.DepositSavingsGoalRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	if req.Amount <= 0 {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Deposit amount must be greater than 0")
	}

	goal, err := h.goalService.DepositGoal(userID, goalID, &req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Deposit failed", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Deposit successful! Savings goal updated", goal)
}

func (h *SavingsGoalHandler) Delete(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	goalID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid goal ID format")
	}

	if err := h.goalService.DeleteGoal(goalID, userID); err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to delete savings goal", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Savings goal deleted successfully", nil)
}
