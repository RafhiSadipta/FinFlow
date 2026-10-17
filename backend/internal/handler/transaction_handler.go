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

type TransactionHandler struct {
	txService service.TransactionService
}

func NewTransactionHandler(txService service.TransactionService) *TransactionHandler {
	return &TransactionHandler{txService: txService}
}

func (h *TransactionHandler) Create(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req models.CreateTransactionRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	if req.Amount <= 0 {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Amount must be greater than 0")
	}
	if req.Type == "" {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Transaction type is required")
	}

	tx, err := h.txService.CreateTransaction(userID, &req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Failed to record transaction", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Transaction recorded successfully", tx)
}

func (h *TransactionHandler) GetAll(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	filter := models.TransactionFilter{
		Type: c.Query("type"),
	}

	if catStr := c.Query("category_id"); catStr != "" {
		if catID, err := uuid.Parse(catStr); err == nil {
			filter.CategoryID = &catID
		}
	}

	if walletStr := c.Query("wallet_id"); walletStr != "" {
		if walletID, err := uuid.Parse(walletStr); err == nil {
			filter.WalletID = &walletID
		}
	}

	if startStr := c.Query("start_date"); startStr != "" {
		if t, err := time.Parse("2006-01-02", startStr); err == nil {
			filter.StartDate = &t
		}
	}

	if endStr := c.Query("end_date"); endStr != "" {
		if t, err := time.Parse("2006-01-02", endStr); err == nil {
			// Set end of day
			tEnd := t.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			filter.EndDate = &tEnd
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			filter.Limit = l
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			filter.Offset = o
		}
	}

	transactions, total, err := h.txService.GetTransactions(userID, filter)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to fetch transactions", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Transactions retrieved successfully", transactions, fiber.Map{
		"total":  total,
		"limit":  filter.Limit,
		"offset": filter.Offset,
	})
}

func (h *TransactionHandler) GetByID(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	txID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid transaction ID format")
	}

	tx, err := h.txService.GetTransactionByID(txID, userID)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusNotFound, "Transaction not found")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Transaction retrieved successfully", tx)
}

func (h *TransactionHandler) Update(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	txID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid transaction ID format")
	}

	var req models.UpdateTransactionRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	tx, err := h.txService.UpdateTransaction(txID, userID, &req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Failed to update transaction", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Transaction updated successfully", tx)
}

func (h *TransactionHandler) Delete(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	txID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid transaction ID format")
	}

	if err := h.txService.DeleteTransaction(txID, userID); err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to delete transaction", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Transaction deleted successfully and balance reverted", nil)
}
