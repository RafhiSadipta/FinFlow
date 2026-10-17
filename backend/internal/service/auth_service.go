package service

import (
	"errors"
	"time"

	"finflow-backend/config"
	"finflow-backend/internal/models"
	"finflow-backend/internal/repository"
	"finflow-backend/internal/utils"

	"github.com/google/uuid"
)

type AuthService interface {
	Register(req *models.RegisterRequest) (*models.User, string, error)
	Login(req *models.LoginRequest) (*models.User, string, error)
	GetProfile(userID uuid.UUID) (*models.User, error)
	UpdateProfile(userID uuid.UUID, req *models.UpdateProfileRequest) (*models.User, error)
}

type authService struct {
	userRepo     repository.UserRepository
	walletRepo   repository.WalletRepository
	categoryRepo repository.CategoryRepository
	cfg          *config.Config
}

func NewAuthService(userRepo repository.UserRepository, walletRepo repository.WalletRepository, categoryRepo repository.CategoryRepository, cfg *config.Config) AuthService {
	return &authService{
		userRepo:     userRepo,
		walletRepo:   walletRepo,
		categoryRepo: categoryRepo,
		cfg:          cfg,
	}
}

func (s *authService) Register(req *models.RegisterRequest) (*models.User, string, error) {
	// Check if email already exists
	existingUser, _ := s.userRepo.GetByEmail(req.Email)
	if existingUser != nil {
		return nil, "", errors.New("email is already registered")
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, "", errors.New("failed to hash password")
	}

	var monthlyBudget float64 = 0
	var monthlyIncomeTarget float64 = 0
	if req.Email == "demo@finflow.app" {
		monthlyBudget = 18000000.00
		monthlyIncomeTarget = 30000000.00
	}

	user := &models.User{
		Email:               req.Email,
		PasswordHash:        hashedPassword,
		FullName:            req.FullName,
		Currency:            "IDR",
		MonthlyBudget:       monthlyBudget,
		MonthlyIncomeTarget: monthlyIncomeTarget,
		NeedsPercentage:     50.00,
		WantsPercentage:     30.00,
		SavingsPercentage:   20.00,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, "", err
	}

	// Create default wallets for new user (Rp 0 for real users, demo balance for demo account)
	var bcaBalance float64 = 0
	var cashBalance float64 = 0
	var gopayBalance float64 = 0

	if req.Email == "demo@finflow.app" {
		bcaBalance = 125000000
		cashBalance = 4500000
		gopayBalance = 1850000
	}

	defaultWallets := []models.Wallet{
		{
			UserID:  user.ID,
			Name:    "Rekening Utama (BCA)",
			Type:    "bank",
			Balance: bcaBalance,
			Color:   "#10B981",
			Icon:    "account_balance",
		},
		{
			UserID:  user.ID,
			Name:    "Dana Tunai (Cash)",
			Type:    "cash",
			Balance: cashBalance,
			Color:   "#4CD7F6",
			Icon:    "payments",
		},
		{
			UserID:  user.ID,
			Name:    "GoPay & E-Wallet",
			Type:    "ewallet",
			Balance: gopayBalance,
			Color:   "#F6AD55",
			Icon:    "account_balance_wallet",
		},
	}
	for _, w := range defaultWallets {
		_ = s.walletRepo.Create(&w)
	}

	// Seed default categories for this user
	needsGroup := "needs"
	wantsGroup := "wants"
	savingsGroup := "savings"

	defaultCategories := []models.Category{
		{UserID: &user.ID, Name: "Makanan & Minuman", Type: "expense", AllocationGroup: &needsGroup, Icon: "restaurant", Color: "#F59E0B"},
		{UserID: &user.ID, Name: "Transportasi", Type: "expense", AllocationGroup: &needsGroup, Icon: "directions_car", Color: "#06B6D4"},
		{UserID: &user.ID, Name: "Tagihan & Utilitas", Type: "expense", AllocationGroup: &needsGroup, Icon: "receipt_long", Color: "#EF4444"},
		{UserID: &user.ID, Name: "Kesehatan", Type: "expense", AllocationGroup: &needsGroup, Icon: "medical_services", Color: "#10B981"},
		{UserID: &user.ID, Name: "Pendidikan", Type: "expense", AllocationGroup: &needsGroup, Icon: "school", Color: "#3B82F6"},
		{UserID: &user.ID, Name: "Belanja & Kebutuhan", Type: "expense", AllocationGroup: &wantsGroup, Icon: "shopping_bag", Color: "#EC4899"},
		{UserID: &user.ID, Name: "Hiburan & Rekreasi", Type: "expense", AllocationGroup: &wantsGroup, Icon: "sports_esports", Color: "#8B5CF6"},
		{UserID: &user.ID, Name: "Lain-lain (Pengeluaran)", Type: "expense", AllocationGroup: &wantsGroup, Icon: "more_horiz", Color: "#64748B"},
		{UserID: &user.ID, Name: "Investasi & Tabungan", Type: "expense", AllocationGroup: &savingsGroup, Icon: "trending_up", Color: "#14B8A6"},
		{UserID: &user.ID, Name: "Gaji Utama", Type: "income", AllocationGroup: nil, Icon: "payments", Color: "#10B981"},
		{UserID: &user.ID, Name: "Bonus & THR", Type: "income", AllocationGroup: nil, Icon: "redeem", Color: "#34D399"},
		{UserID: &user.ID, Name: "Freelance & Side Job", Type: "income", AllocationGroup: nil, Icon: "laptop_mac", Color: "#06B6D4"},
		{UserID: &user.ID, Name: "Hasil Investasi / Dividen", Type: "income", AllocationGroup: nil, Icon: "candlestick_chart", Color: "#8B5CF6"},
		{UserID: &user.ID, Name: "Hadiah & Hibah", Type: "income", AllocationGroup: nil, Icon: "card_giftcard", Color: "#F43F5E"},
		{UserID: &user.ID, Name: "Lain-lain (Pemasukan)", Type: "income", AllocationGroup: nil, Icon: "account_balance_wallet", Color: "#64748B"},
	}
	for _, c := range defaultCategories {
		_ = s.categoryRepo.Create(&c)
	}

	// Generate JWT Token (Valid 30 days)
	token, err := utils.GenerateToken(user.ID, user.Email, s.cfg.JWTSecret, time.Hour*24*30)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

func (s *authService) Login(req *models.LoginRequest) (*models.User, string, error) {
	user, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, "", errors.New("invalid email or password")
	}

	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		return nil, "", errors.New("invalid email or password")
	}

	token, err := utils.GenerateToken(user.ID, user.Email, s.cfg.JWTSecret, time.Hour*24*30)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}

func (s *authService) GetProfile(userID uuid.UUID) (*models.User, error) {
	return s.userRepo.GetByID(userID)
}

func (s *authService) UpdateProfile(userID uuid.UUID, req *models.UpdateProfileRequest) (*models.User, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}

	if req.FullName != nil {
		user.FullName = *req.FullName
	}
	if req.AvatarURL != nil {
		user.AvatarURL = req.AvatarURL
	}
	if req.Currency != nil {
		user.Currency = *req.Currency
	}
	if req.MonthlyBudget != nil {
		user.MonthlyBudget = *req.MonthlyBudget
	}
	if req.MonthlyIncomeTarget != nil {
		user.MonthlyIncomeTarget = *req.MonthlyIncomeTarget
	}
	if req.NeedsPercentage != nil {
		user.NeedsPercentage = *req.NeedsPercentage
	}
	if req.WantsPercentage != nil {
		user.WantsPercentage = *req.WantsPercentage
	}
	if req.SavingsPercentage != nil {
		user.SavingsPercentage = *req.SavingsPercentage
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}
