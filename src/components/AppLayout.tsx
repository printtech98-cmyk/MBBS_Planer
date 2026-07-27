import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Bell,
  BarChart3,
  Activity,
  Menu,
  X,
  NotebookPen,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export type Page = 'dashboard' | 'subjects' | 'planner' | 'progress' | 'reminders' | 'notes';

interface LayoutProps {
  current: Page;
  onNavigate: (p: Page) => void;
  onboarding?: boolean;
  onDismissOnboarding?: () => void;
  children: ReactNode;
}

const NAV: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'planner', label: 'Planner', icon: CalendarDays },
  { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
];

export default function AppLayout({ current, onNavigate, onboarding, onDismissOnboarding, children }: LayoutProps) {
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItem = (item: (typeof NAV)[number]) => {
    const Icon = item.icon;
    const active = current === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          onNavigate(item.id);
          setMobileOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md shadow-sky-200'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
        {item.label}
      </button>
    );
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-md shadow-sky-200">
          <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 leading-tight">MBBS Planner</h1>
          <p className="text-xs text-slate-400">Study & Revision</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1.5 mt-2">{NAV.map(navItem)}</nav>

      <div className="px-3 pb-4">
        <button
          onClick={() => signOut().catch(() => {})}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex-col z-30">
        {sidebar}
      </aside>

      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-slate-800">MBBS Planner</span>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white border-r border-slate-200 shadow-xl">
            {sidebar}
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {onboarding && (
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-sky-50 to-teal-50 border border-sky-100 p-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-800">Welcome — let's get started!</h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Add your first subject to start tracking topics, build a study plan, and get spaced-revision reminders.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => onNavigate('subjects')}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600"
                  >
                    Add a subject
                  </button>
                  <button
                    onClick={() => onDismissOnboarding?.()}
                    className="px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-white"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
