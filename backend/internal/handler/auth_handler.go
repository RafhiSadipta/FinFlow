package handler

import (
	"finflow-backend/internal/middleware"
	"finflow-backend/internal/models"
	"finflow-backend/internal/service"
	"finflow-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Email, password, and full name are required")
	}

	user, token, err := h.authService.Register(&req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "User registered successfully", fiber.Map{
		"user":  user,
		"token": token,
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	if req.Email == "" || req.Password == "" {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Email and password are required")
	}

	user, token, err := h.authService.Login(&req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Login successful", fiber.Map{
		"user":  user,
		"token": token,
	})
}

func (h *AuthHandler) GetProfile(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	user, err := h.authService.GetProfile(userID)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusNotFound, "User not found")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "User profile fetched successfully", user)
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req models.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Invalid request body", err.Error())
	}

	user, err := h.authService.UpdateProfile(userID, &req)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusBadRequest, "Failed to update profile", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Profile updated successfully", user)
}
