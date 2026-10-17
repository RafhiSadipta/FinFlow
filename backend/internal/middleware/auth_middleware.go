package middleware

import (
	"strings"

	"finflow-backend/config"
	"finflow-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func AuthRequired(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return utils.FailResponse(c, fiber.StatusUnauthorized, "Authorization header is required")
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return utils.FailResponse(c, fiber.StatusUnauthorized, "Invalid authorization format. Format must be 'Bearer <token>'")
		}

		tokenString := parts[1]
		claims, err := utils.ValidateToken(tokenString, cfg.JWTSecret)
		if err != nil {
			return utils.FailResponse(c, fiber.StatusUnauthorized, "Invalid or expired authorization token", err.Error())
		}

		// Store user details in fiber context
		c.Locals("userID", claims.UserID)
		c.Locals("userEmail", claims.Email)

		return c.Next()
	}
}

func GetUserID(c *fiber.Ctx) (uuid.UUID, error) {
	val := c.Locals("userID")
	if val == nil {
		return uuid.Nil, fiber.NewError(fiber.StatusUnauthorized, "Unauthorized")
	}
	userID, ok := val.(uuid.UUID)
	if !ok {
		return uuid.Nil, fiber.NewError(fiber.StatusUnauthorized, "Invalid user context")
	}
	return userID, nil
}
