import React, { useEffect } from 'react';
import { useFinFlowStore } from './store/useFinFlowStore';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LandingPage } from './pages/LandingPage';
import { RecordTransactionModal } from './pages/RecordTransactionModal';
import { DateRangeFilterModal } from './components/DateRangeFilterModal';
import { WalletManagementModal } from './components/WalletManagementModal';
import { CreateCategoryModal } from './components/CreateCategoryModal';
import { AuthModal } from './components/AuthModal';
import { Toast } from './components/Toast';

export const App: React.FC = () => {
  const { activeTab, isAuthenticated, fetchInitialData } = useFinFlowStore();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // If user is not authenticated, render the Obsidian Landing / Welcome Page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface text-on-surface relative">
        <Toast />
        <LandingPage />
      </div>
    );
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'history':
        return <HistoryPage />;
      case 'budgets':
        return <BudgetsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col justify-between selection:bg-primary-container selection:text-on-primary-container relative">
      {/* Top Fixed Header */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-20">
        {renderActivePage()}
      </main>

      {/* Floating Bottom Navigation Dock */}
      <BottomNav />

      {/* Global Interactive Modals */}
      <Toast />
      <RecordTransactionModal />
      <DateRangeFilterModal />
      <WalletManagementModal />
      <CreateCategoryModal />
      <AuthModal />
    </div>
  );
};

export default App;
