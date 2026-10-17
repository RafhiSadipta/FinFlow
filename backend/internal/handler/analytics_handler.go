package handler

import (
	"strconv"
	"time"

	"finflow-backend/internal/middleware"
	"finflow-backend/internal/service"
	"finflow-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
)

type AnalyticsHandler struct {
	analyticsService service.AnalyticsService
}

func NewAnalyticsHandler(analyticsService service.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{analyticsService: analyticsService}
}

func (h *AnalyticsHandler) GetDashboardSummary(c *fiber.Ctx) error {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	summary, err := h.analyticsService.GetDashboardSummary(userID)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to get dashboard summary", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Dashboard summary fetched successfully", summary)
}

func (h *AnalyticsHandler) GetAnalyticsOverview(c *fiber.Ctx) error {
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

	analytics, err := h.analyticsService.GetAnalyticsOverview(userID, month, year)
	if err != nil {
		return utils.FailResponse(c, fiber.StatusInternalServerError, "Failed to get analytics overview", err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Analytics overview fetched successfully", analytics)
}
