import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/add-item', label: 'Add Item' },
  { to: '/households', label: 'Households' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/settings', label: 'Settings' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-emerald-600">FridgeCheck</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={clsx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname === link.to
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User menu */}
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-gray-600">{user?.username}</span>
            <button
              onClick={() => void logout()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-200 pb-3 md:hidden">
          <div className="space-y-1 px-4 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'block rounded-lg px-3 py-2 text-sm font-medium',
                  location.pathname === link.to
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 border-t border-gray-200 pt-3">
              <p className="px-3 text-sm text-gray-500">{user?.username}</p>
              <button
                onClick={() => void logout()}
                className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
