import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  ChefHat,
  Settings,
  LogOut,
  Refrigerator,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  emphasised?: boolean;
}

const NAV: NavItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/app/add-item', label: 'Add', Icon: PlusCircle, emphasised: true },
  { to: '/app/households', label: 'Households', Icon: Users },
  { to: '/app/recipes', label: 'Recipes', Icon: ChefHat },
  { to: '/app/settings', label: 'Settings', Icon: Settings },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (to: string) => location.pathname === to;

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 shadow-sm">
        <Link to="/app/dashboard" className="flex items-center gap-2">
          <Refrigerator className="h-6 w-6 text-primary" />
          <span className="font-display text-3xl leading-none text-primary">FridgeCheck</span>
        </Link>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-[220px] md:flex-col md:border-r md:border-border md:bg-surface">
        <Link to="/app/dashboard" className="flex items-center gap-2 px-5 py-5">
          <Refrigerator className="h-7 w-7 text-primary" />
          <span className="font-display text-3xl leading-none text-primary">FridgeCheck</span>
        </Link>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                className={clsx(
                  'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-surface-subtle hover:text-primary',
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="px-2 pb-2">
            <p className="truncate text-xs text-text-muted">{user?.email}</p>
          </div>
          <button
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-semibold text-text-muted transition-all duration-150 hover:bg-surface-subtle hover:text-primary cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-border bg-surface px-2 shadow-lg"
        aria-label="Primary"
      >
        {NAV.map(({ to, label, Icon, emphasised }) => {
          const active = isActive(to);
          if (emphasised) {
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                className={clsx(
                  'flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-all duration-200 cursor-pointer',
                  'hover:bg-accent-dark hover:-translate-y-4 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20',
                )}
              >
                <Icon className="h-7 w-7" />
              </Link>
            );
          }
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className={clsx(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-semibold transition-colors duration-150',
                active ? 'text-primary' : 'text-text-muted',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
