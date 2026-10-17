package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"finflow-backend/config"
	"finflow-backend/internal/handler"
	"finflow-backend/internal/middleware"
	"finflow-backend/internal/repository"
	"finflow-backend/internal/service"
	"finflow-backend/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// 1. Load Config
	cfg := config.LoadConfig()

	// 2. Init Database (PostgreSQL / Supabase)
	db, err := config.InitDatabase(cfg)
	if err != nil {
		log.Fatalf("[FATAL] Failed to connect to database: %v", err)
	}

	// 3. Init Repositories
	userRepo := repository.NewUserRepository(db)
	walletRepo := repository.NewWalletRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	txRepo := repository.NewTransactionRepository(db)
	budgetRepo := repository.NewBudgetRepository(db)
	goalRepo := repository.NewSavingsGoalRepository(db)

	// 4. Init Services
	authService := service.NewAuthService(userRepo, walletRepo, categoryRepo, cfg)
	walletService := service.NewWalletService(walletRepo)
	categoryService := service.NewCategoryService(categoryRepo)
	txService := service.NewTransactionService(txRepo, walletRepo)
	budgetService := service.NewBudgetService(budgetRepo, categoryRepo, txRepo)
	goalService := service.NewSavingsGoalService(goalRepo)
	analyticsService := service.NewAnalyticsService(txRepo, walletRepo, userRepo, categoryRepo)

	// 5. Init Handlers
	authHandler := handler.NewAuthHandler(authService)
	walletHandler := handler.NewWalletHandler(walletService)
	categoryHandler := handler.NewCategoryHandler(categoryService)
	txHandler := handler.NewTransactionHandler(txService)
	budgetHandler := handler.NewBudgetHandler(budgetService)
	goalHandler := handler.NewSavingsGoalHandler(goalService)
	analyticsHandler := handler.NewAnalyticsHandler(analyticsService)

	// 6. Init Fiber App
	app := fiber.New(fiber.Config{
		AppName:      "FinFlow REST API v1.0",
		ServerHeader: "Fiber",
	})

	// Middlewares
	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// Health check route
	app.Get("/health", func(c *fiber.Ctx) error {
		return utils.SuccessResponse(c, fiber.StatusOK, "FinFlow API is healthy and operational", fiber.Map{
			"status": "up",
			"env":    cfg.AppEnv,
		})
	})

	// API Route Group
	api := app.Group("/api/v1")

	// Public Auth Routes
	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)

	// Protected Routes (Require JWT)
	protected := api.Group("", middleware.AuthRequired(cfg))

	// User Profile
	protected.Get("/auth/profile", authHandler.GetProfile)
	protected.Put("/auth/profile", authHandler.UpdateProfile)

	// Wallets
	protected.Post("/wallets", walletHandler.Create)
	protected.Get("/wallets", walletHandler.GetAll)
	protected.Get("/wallets/:id", walletHandler.GetByID)
	protected.Put("/wallets/:id", walletHandler.Update)
	protected.Delete("/wallets/:id", walletHandler.Delete)

	// Categories
	protected.Post("/categories", categoryHandler.Create)
	protected.Get("/categories", categoryHandler.GetAll)
	protected.Get("/categories/deleted", categoryHandler.GetDeleted)
	protected.Get("/categories/:id", categoryHandler.GetByID)
	protected.Put("/categories/:id", categoryHandler.Update)
	protected.Delete("/categories/:id", categoryHandler.Delete)
	protected.Post("/categories/:id/restore", categoryHandler.Restore)

	// Transactions
	protected.Post("/transactions", txHandler.Create)
	protected.Get("/transactions", txHandler.GetAll)
	protected.Get("/transactions/:id", txHandler.GetByID)
	protected.Put("/transactions/:id", txHandler.Update)
	protected.Delete("/transactions/:id", txHandler.Delete)

	// Budgets
	protected.Post("/budgets", budgetHandler.SetBudget)
	protected.Get("/budgets", budgetHandler.GetBudgets)
	protected.Delete("/budgets/:id", budgetHandler.Delete)

	// Savings Goals
	protected.Post("/savings-goals", goalHandler.Create)
	protected.Get("/savings-goals", goalHandler.GetAll)
	protected.Get("/savings-goals/:id", goalHandler.GetByID)
	protected.Put("/savings-goals/:id", goalHandler.Update)
	protected.Post("/savings-goals/:id/deposit", goalHandler.Deposit)
	protected.Delete("/savings-goals/:id", goalHandler.Delete)

	// Analytics & Dashboard
	protected.Get("/analytics/dashboard", analyticsHandler.GetDashboardSummary)
	protected.Get("/analytics/overview", analyticsHandler.GetAnalyticsOverview)

	// Start server in goroutine
	go func() {
		port := cfg.Port
		log.Printf("[INFO] FinFlow API running on port %s", port)
		if err := app.Listen(":" + port); err != nil {
			log.Fatalf("[FATAL] Server failed: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("[INFO] Shutting down FinFlow API gracefully...")
	if err := app.Shutdown(); err != nil {
		log.Fatalf("[FATAL] Server forced to shutdown: %v", err)
	}
	log.Println("[INFO] FinFlow API exited cleanly")
}
