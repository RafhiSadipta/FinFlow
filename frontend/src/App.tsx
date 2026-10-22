import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
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

  // Native Mobile Optimizations (Status Bar & Android Hardware Back Button)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0F131D' }).catch(() => {});

      const backListener = CapApp.addListener('backButton', () => {
        const state = useFinFlowStore.getState();
        if (state.isRecordModalOpen) {
          state.setRecordModalOpen(false);
        } else if (state.isWalletModalOpen) {
          state.setWalletModalOpen(false);
        } else if (state.isCategoryModalOpen) {
          state.setCategoryModalOpen(false);
        } else if (state.isDateFilterModalOpen) {
          state.setDateFilterModalOpen(false);
        } else if (state.isAuthModalOpen) {
          state.setAuthModalOpen(false);
        } else if (state.activeTab !== 'dashboard') {
          state.setActiveTab('dashboard');
        } else {
          CapApp.exitApp();
        }
      });

      return () => {
        backListener.then((h) => h.remove()).catch(() => {});
      };
    }
  }, []);

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
      <main className="flex-1 w-full pt-[calc(env(safe-area-inset-top,0px)+4.75rem)] pb-28">
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
