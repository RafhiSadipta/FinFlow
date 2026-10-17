package service

import (
	"time"

	"finflow-backend/internal/models"
	"finflow-backend/internal/repository"

	"github.com/google/uuid"
)

type AnalyticsService interface {
	GetDashboardSummary(userID uuid.UUID) (*DashboardSummaryResponse, error)
	GetAnalyticsOverview(userID uuid.UUID, month int, year int) (*AnalyticsOverviewResponse, error)
}

type DashboardSummaryResponse struct {
	NetWorth        float64           `json:"net_worth"`
	MonthlyIncome   float64           `json:"monthly_income"`
	MonthlyExpense  float64           `json:"monthly_expense"`
	MonthlyBudget   float64           `json:"monthly_budget"`
	BudgetSpent     float64           `json:"budget_spent"`
	BudgetRemaining float64           `json:"budget_remaining"`
	BudgetUsagePct  float64           `json:"budget_usage_pct"`
	WeeklyCashflow  []DailyCashflow   `json:"weekly_cashflow"`
}

type DailyCashflow struct {
	Day     string  `json:"day"`     // Sen, Sel, Rab, Kam, Jum, Sab, Min
	Date    string  `json:"date"`    // YYYY-MM-DD
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

type CategoryExpenseBreakdown struct {
	CategoryID   *uuid.UUID `json:"category_id"`
	CategoryName string     `json:"category_name"`
	Color        string     `json:"color"`
	Icon         string     `json:"icon"`
	Amount       float64    `json:"amount"`
	Percentage   float64    `json:"percentage"`
}

type SplineComparisonPoint struct {
	Day       int     `json:"day"`
	ThisMonth float64 `json:"this_month"`
	LastMonth float64 `json:"last_month"`
}

type AllocationGroupBreakdown struct {
	Group           string  `json:"group"` // needs, wants, savings
	Label           string  `json:"label"`
	TargetPercent   float64 `json:"target_percent"`
	TargetAmount    float64 `json:"target_amount"`
	ActualAmount    float64 `json:"actual_amount"`
	ActualPercent   float64 `json:"actual_percent"`
	Status          string  `json:"status"` // on_track, warning, over_budget
}

type AnalyticsOverviewResponse struct {
	Month                int                        `json:"month"`
	Year                 int                        `json:"year"`
	TotalIncome          float64                    `json:"total_income"`
	TotalExpense         float64                    `json:"total_expense"`
	NetSavings           float64                    `json:"net_savings"`
	SavingsRate          float64                    `json:"savings_rate"`
	CategoryBreakdown    []CategoryExpenseBreakdown `json:"category_breakdown"`
	CumulativeComparison []SplineComparisonPoint    `json:"cumulative_comparison"`
	Allocation503020     []AllocationGroupBreakdown `json:"allocation_50_30_20"`
}

type analyticsService struct {
	txRepo       repository.TransactionRepository
	walletRepo   repository.WalletRepository
	userRepo     repository.UserRepository
	categoryRepo repository.CategoryRepository
}

func NewAnalyticsService(
	txRepo repository.TransactionRepository,
	walletRepo repository.WalletRepository,
	userRepo repository.UserRepository,
	categoryRepo repository.CategoryRepository,
) AnalyticsService {
	return &analyticsService{
		txRepo:       txRepo,
		walletRepo:   walletRepo,
		userRepo:     userRepo,
		categoryRepo: categoryRepo,
	}
}

func (s *analyticsService) GetDashboardSummary(userID uuid.UUID) (*DashboardSummaryResponse, error) {
	now := time.Now().UTC()
	currentMonth := int(now.Month())
	currentYear := now.Year()

	// 1. User details & preferences
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}

	// 2. Net worth from active wallets
	wallets, err := s.walletRepo.GetByUserID(userID)
	if err != nil {
		return nil, err
	}
	netWorth := 0.0
	for _, w := range wallets {
		if w.IsActive {
			netWorth += w.Balance
		}
	}

	// 3. Monthly Income & Expense
	income, expense, err := s.txRepo.GetMonthlySummary(userID, currentMonth, currentYear)
	if err != nil {
		return nil, err
	}

	budgetLimit := user.MonthlyBudget
	budgetRemaining := budgetLimit - expense
	budgetUsagePct := 0.0
	if budgetLimit > 0 {
		budgetUsagePct = (expense / budgetLimit) * 100
	}

	// 4. Weekly Cashflow (last 7 days)
	var weekly []DailyCashflow
	db := s.txRepo.GetDB()
	dayNames := []string{"Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"}

	for i := 6; i >= 0; i-- {
		dayDate := now.AddDate(0, 0, -i)
		dateStr := dayDate.Format("2006-01-02")
		dayName := dayNames[dayDate.Weekday()]

		var dayIncome, dayExpense float64
		type SumResult struct {
			Type  string  `gorm:"column:type"`
			Total float64 `gorm:"column:total"`
		}
		var sums []SumResult

		_ = db.Model(&models.Transaction{}).
			Select("type, COALESCE(SUM(amount), 0) as total").
			Where("user_id = ? AND DATE(transaction_date) = ?", userID, dateStr).
			Group("type").
			Scan(&sums)

		for _, sum := range sums {
			if sum.Type == "income" {
				dayIncome = sum.Total
			} else if sum.Type == "expense" {
				dayExpense = sum.Total
			}
		}

		weekly = append(weekly, DailyCashflow{
			Day:     dayName,
			Date:    dateStr,
			Income:  dayIncome,
			Expense: dayExpense,
		})
	}

	return &DashboardSummaryResponse{
		NetWorth:        netWorth,
		MonthlyIncome:   income,
		MonthlyExpense:  expense,
		MonthlyBudget:   budgetLimit,
		BudgetSpent:     expense,
		BudgetRemaining: budgetRemaining,
		BudgetUsagePct:  budgetUsagePct,
		WeeklyCashflow:  weekly,
	}, nil
}

func (s *analyticsService) GetAnalyticsOverview(userID uuid.UUID, month int, year int) (*AnalyticsOverviewResponse, error) {
	if month <= 0 || month > 12 {
		month = int(time.Now().Month())
	}
	if year <= 0 {
		year = time.Now().Year()
	}

	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}

	db := s.txRepo.GetDB()

	// 1. Current Month Totals
	income, expense, err := s.txRepo.GetMonthlySummary(userID, month, year)
	if err != nil {
		return nil, err
	}

	netSavings := income - expense
	savingsRate := 0.0
	if income > 0 {
		savingsRate = (netSavings / income) * 100
	}

	// 2. Category Expense Breakdown
	type CatTotal struct {
		CategoryID      *uuid.UUID `gorm:"column:category_id"`
		CategoryName    string     `gorm:"column:category_name"`
		Color           string     `gorm:"column:color"`
		Icon            string     `gorm:"column:icon"`
		AllocationGroup *string    `gorm:"column:allocation_group"`
		Total           float64    `gorm:"column:total"`
	}
	var catTotals []CatTotal

	err = db.Table("transactions").
		Select("transactions.category_id, COALESCE(categories.name, 'Tanpa Kategori') as category_name, COALESCE(categories.color, '#64748B') as color, COALESCE(categories.icon, 'more_horiz') as icon, categories.allocation_group, COALESCE(SUM(transactions.amount), 0) as total").
		Joins("LEFT JOIN categories ON categories.id = transactions.category_id").
		Where("transactions.user_id = ? AND transactions.type = 'expense' AND transactions.deleted_at IS NULL AND EXTRACT(MONTH FROM transactions.transaction_date) = ? AND EXTRACT(YEAR FROM transactions.transaction_date) = ?", userID, month, year).
		Group("transactions.category_id, categories.name, categories.color, categories.icon, categories.allocation_group").
		Order("total DESC").
		Scan(&catTotals).Error

	if err != nil {
		return nil, err
	}

	var breakdown []CategoryExpenseBreakdown
	needsSpent, wantsSpent, savingsSpent := 0.0, 0.0, 0.0

	for _, ct := range catTotals {
		pct := 0.0
		if expense > 0 {
			pct = (ct.Total / expense) * 100
		}
		breakdown = append(breakdown, CategoryExpenseBreakdown{
			CategoryID:   ct.CategoryID,
			CategoryName: ct.CategoryName,
			Color:        ct.Color,
			Icon:         ct.Icon,
			Amount:       ct.Total,
			Percentage:   pct,
		})

		// Track 50/30/20 grouping
		if ct.AllocationGroup != nil {
			switch *ct.AllocationGroup {
			case "needs":
				needsSpent += ct.Total
			case "wants":
				wantsSpent += ct.Total
			case "savings":
				savingsSpent += ct.Total
			default:
				needsSpent += ct.Total
			}
		} else {
			needsSpent += ct.Total
		}
	}

	// 3. Dual Spline Cumulative Cashflow Comparison (This Month vs Last Month)
	lastMonth := month - 1
	lastMonthYear := year
	if lastMonth == 0 {
		lastMonth = 12
		lastMonthYear = year - 1
	}

	type DailySpent struct {
		Day   int     `gorm:"column:day"`
		Total float64 `gorm:"column:total"`
	}

	var thisMonthDays, lastMonthDays []DailySpent
	_ = db.Table("transactions").
		Select("EXTRACT(DAY FROM transaction_date) as day, COALESCE(SUM(amount), 0) as total").
		Where("user_id = ? AND type = 'expense' AND deleted_at IS NULL AND EXTRACT(MONTH FROM transaction_date) = ? AND EXTRACT(YEAR FROM transaction_date) = ?", userID, month, year).
		Group("EXTRACT(DAY FROM transaction_date)").
		Scan(&thisMonthDays)

	_ = db.Table("transactions").
		Select("EXTRACT(DAY FROM transaction_date) as day, COALESCE(SUM(amount), 0) as total").
		Where("user_id = ? AND type = 'expense' AND deleted_at IS NULL AND EXTRACT(MONTH FROM transaction_date) = ? AND EXTRACT(YEAR FROM transaction_date) = ?", userID, lastMonth, lastMonthYear).
		Group("EXTRACT(DAY FROM transaction_date)").
		Scan(&lastMonthDays)

	thisMonthMap := make(map[int]float64)
	for _, d := range thisMonthDays {
		thisMonthMap[d.Day] = d.Total
	}
	lastMonthMap := make(map[int]float64)
	for _, d := range lastMonthDays {
		lastMonthMap[d.Day] = d.Total
	}

	var comparison []SplineComparisonPoint
	cumThisMonth := 0.0
	cumLastMonth := 0.0

	// Check total days in current month
	daysInMonth := 31
	if month == 4 || month == 6 || month == 9 || month == 11 {
		daysInMonth = 30
	} else if month == 2 {
		if (year%4 == 0 && year%100 != 0) || (year%400 == 0) {
			daysInMonth = 29
		} else {
			daysInMonth = 28
		}
	}

	for d := 1; d <= daysInMonth; d++ {
		cumThisMonth += thisMonthMap[d]
		cumLastMonth += lastMonthMap[d]
		comparison = append(comparison, SplineComparisonPoint{
			Day:       d,
			ThisMonth: cumThisMonth,
			LastMonth: cumLastMonth,
		})
	}

	// 4. 50/30/20 Allocation Calculations
	incomeBase := user.MonthlyIncomeTarget
	if incomeBase <= 0 {
		incomeBase = 30000000.00
	}

	targetNeeds := incomeBase * (user.NeedsPercentage / 100.0)
	targetWants := incomeBase * (user.WantsPercentage / 100.0)
	targetSavings := incomeBase * (user.SavingsPercentage / 100.0)

	getStatus := func(actual, target float64) string {
		if actual > target {
			return "over_budget"
		} else if actual >= target*0.85 {
			return "warning"
		}
		return "on_track"
	}

	actualNeedsPct := 0.0
	actualWantsPct := 0.0
	actualSavingsPct := 0.0
	if incomeBase > 0 {
		actualNeedsPct = (needsSpent / incomeBase) * 100.0
		actualWantsPct = (wantsSpent / incomeBase) * 100.0
		actualSavingsPct = (savingsSpent / incomeBase) * 100.0
	}

	allocations := []AllocationGroupBreakdown{
		{
			Group:         "needs",
			Label:         "Kebutuhan Pokok (Needs)",
			TargetPercent: user.NeedsPercentage,
			TargetAmount:  targetNeeds,
			ActualAmount:  needsSpent,
			ActualPercent: actualNeedsPct,
			Status:        getStatus(needsSpent, targetNeeds),
		},
		{
			Group:         "wants",
			Label:         "Keinginan & Lifestyle (Wants)",
			TargetPercent: user.WantsPercentage,
			TargetAmount:  targetWants,
			ActualAmount:  wantsSpent,
			ActualPercent: actualWantsPct,
			Status:        getStatus(wantsSpent, targetWants),
		},
		{
			Group:         "savings",
			Label:         "Tabungan & Investasi (Savings)",
			TargetPercent: user.SavingsPercentage,
			TargetAmount:  targetSavings,
			ActualAmount:  savingsSpent,
			ActualPercent: actualSavingsPct,
			Status:        getStatus(savingsSpent, targetSavings),
		},
	}

	return &AnalyticsOverviewResponse{
		Month:                month,
		Year:                 year,
		TotalIncome:          income,
		TotalExpense:         expense,
		NetSavings:           netSavings,
		SavingsRate:          savingsRate,
		CategoryBreakdown:    breakdown,
		CumulativeComparison: comparison,
		Allocation503020:     allocations,
	}, nil
}
