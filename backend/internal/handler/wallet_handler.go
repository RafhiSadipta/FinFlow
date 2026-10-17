package handler

import (
	"finflow-backend/internal/middleware"
	"finflow-backend/internal/models"
	"finflow-backend/internal/service"
	"finflow-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type WalletHandler struct {
	walletService service.WalletService
}

func NewWalletHandler(walletService service.WalletService) *WalletHandler {
	return &WalletHandler{walletService: walletService}
}

func (h *WalletHandler) Create(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req models.CreateWalletRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	if req.Name == "" || req.Type == "" {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Wallet name and type are required")
	}

	wallet, err := h.walletService.CreateWallet(userID, &req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to create wallet", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Wallet created successfully", wallet)
}

func (h *WalletHandler) GetAll(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	wallets, totalBalance, err := h.walletService.GetWallets(userID)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to fetch wallets", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Wallets retrieved successfully", fiber.Map{
		"wallets":       wallets,
		"total_balance": totalBalance,
	})
}

func (h *WalletHandler) GetByID(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	walletID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid wallet ID format")
	}

	wallet, err := h.walletService.GetWalletByID(walletID, userID)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusNotFound, "Wallet not found")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Wallet retrieved successfully", wallet)
}

func (h *WalletHandler) Update(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	walletID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid wallet ID format")
	}

	var req models.UpdateWalletRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	wallet, err := h.walletService.UpdateWallet(walletID, userID, &req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Failed to update wallet", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Wallet updated successfully", wallet)
}

func (h *WalletHandler) Delete(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	walletID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid wallet ID format")
	}

	if err := h.walletService.DeleteWallet(walletID, userID); err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to delete wallet", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Wallet deleted successfully", nil)
}
