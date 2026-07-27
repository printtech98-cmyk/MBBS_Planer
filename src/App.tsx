import { useEffect, useState } from 'react';
import AppLayout, { type Page } from '@/components/AppLayout';
import Dashboard from '@/pages/Dashboard';
import SubjectsPage from '@/pages/Subjects';
import PlannerPage from '@/pages/Planner';
import RemindersPage from '@/pages/Reminders';
import ProgressPage from '@/pages/Progress';
import AuthScreen from '@/pages/AuthScreen';
import { AuthProvider, useAuth } from '@/lib/auth';
import { getSubjects } from '@/lib/db';
import { Spinner } from '@/components/ui';

function AppInner() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [onboardingNeeded, setOnboardingNeeded] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  useEffect(() => {
    if (!session) {
      setOnboardingNeeded(false);
      return;
    }
    setCheckingOnboarding(true);
    (async () => {
      try {
        const subjects = await getSubjects();
        setOnboardingNeeded(subjects.length === 0);
      } catch {
        setOnboardingNeeded(false);
      } finally {
        setCheckingOnboarding(false);
      }
    })();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <AppLayout
      current={page}
      onNavigate={setPage}
      onboarding={onboardingNeeded && !checkingOnboarding}
      onDismissOnboarding={() => setOnboardingNeeded(false)}
    >
      {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
      {page === 'subjects' && <SubjectsPage />}
      {page === 'planner' && <PlannerPage />}
      {page === 'reminders' && <RemindersPage />}
      {page === 'progress' && <ProgressPage />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
