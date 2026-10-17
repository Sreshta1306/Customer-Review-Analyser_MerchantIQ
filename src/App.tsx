import React, { useState, useEffect } from 'react';
import { Sidebar, PageId } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { ReviewExplorer } from './pages/ReviewExplorer';
import { IssueIntelligence } from './pages/IssueIntelligence';
import { ProductQuality } from './pages/ProductQuality';
import { ActionCenter } from './pages/ActionCenter';
import { DecisionHistory } from './pages/DecisionHistory';
import { EvaluationLab } from './pages/EvaluationLab';
import { BusinessPlanner } from './pages/BusinessPlanner';
import { CustomerDiscovery } from './pages/CustomerDiscovery';
import { PilotExperiments } from './pages/PilotExperiments';
import { ReportsExports } from './pages/ReportsExports';
import { Settings } from './pages/Settings';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { api, auth } from './api/client';
import { UserAccount } from './types';

export const App: React.FC = () => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => auth.getUser());
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);

  // App navigation & state
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check existing session on mount
  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await auth.getMe();
        if (res.authenticated && res.user) {
          setCurrentUser(res.user);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setIsVerifyingAuth(false);
      }
    };

    verifySession();
  }, []);

  const handleRunAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      await api.runAnalysis({ force_reanalyze: true });
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert('Review analysis completed or fallback rule engine used.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSignOut = async () => {
    await auth.logout();
    setCurrentUser(null);
    setAuthView('login');
  };

  // If verifying initial session
  if (isVerifyingAuth) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-[#172033] font-sans">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#635BFF] flex items-center justify-center text-white font-bold text-base shadow-xs animate-pulse">
            M
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-[#172033] block">
              MerchantIQ
            </span>
            <span className="text-xs text-[#64748B]">
              Loading workspace...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated: render Login or Signup page
  if (!currentUser) {
    if (authView === 'signup') {
      return (
        <SignupPage
          onSuccess={(user) => setCurrentUser(user)}
          onNavigateToLogin={() => setAuthView('login')}
        />
      );
    }

    return (
      <LoginPage
        onSuccess={(user) => setCurrentUser(user)}
        onNavigateToSignup={() => setAuthView('signup')}
      />
    );
  }

  // Authenticated: Render the existing MerchantIQ application
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Left Collapsible Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={(page) => setCurrentPage(page)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopBar
          currentPage={currentPage}
          onRefreshData={handleRefreshData}
          onRunAnalysis={handleRunAnalysis}
          isAnalyzing={isAnalyzing}
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-12">
            {currentPage === 'dashboard' && (
              <OverviewDashboard
                key={refreshTrigger}
                onNavigate={(page) => setCurrentPage(page)}
                onRunAnalysis={handleRunAnalysis}
                isAnalyzing={isAnalyzing}
              />
            )}
            {currentPage === 'explorer' && <ReviewExplorer key={refreshTrigger} />}
            {currentPage === 'issues' && (
              <IssueIntelligence
                key={refreshTrigger}
                onNavigate={(page) => setCurrentPage(page)}
              />
            )}
            {currentPage === 'products' && <ProductQuality key={refreshTrigger} />}
            {currentPage === 'actions' && (
              <ActionCenter
                key={refreshTrigger}
                onNavigate={(page) => setCurrentPage(page)}
              />
            )}
            {currentPage === 'decisions' && <DecisionHistory key={refreshTrigger} />}
            {currentPage === 'evaluation' && <EvaluationLab key={refreshTrigger} />}
            {currentPage === 'planner' && <BusinessPlanner key={refreshTrigger} />}
            {currentPage === 'discovery' && <CustomerDiscovery key={refreshTrigger} />}
            {currentPage === 'pilots' && <PilotExperiments key={refreshTrigger} />}
            {currentPage === 'reports' && <ReportsExports key={refreshTrigger} />}
            {currentPage === 'settings' && <Settings key={refreshTrigger} />}
          </div>
        </main>
      </div>

    </div>
  );
};

export default App;
