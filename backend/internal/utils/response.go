package utils

import (
	"github.com/gofiber/fiber/v2"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
}

type ErrorResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Errors  interface{} `json:"errors,omitempty"`
}

func SuccessResponse(c *fiber.Ctx, statusCode int, message string, data interface{}, meta ...interface{}) error {
	var m interface{}
	if len(meta) > 0 {
		m = meta[0]
	}
	return c.Status(statusCode).JSON(APIResponse{
		Success: true,
		Message: message,
		Data:    data,
		Meta:    m,
	})
}

func FailResponse(c *fiber.Ctx, statusCode int, message string, errors ...interface{}) error {
	var errDetails interface{}
	if len(errors) > 0 {
		errDetails = errors[0]
	}
	return c.Status(statusCode).JSON(ErrorResponse{
		Success: false,
		Message: message,
		Errors:  errDetails,
	})
}
