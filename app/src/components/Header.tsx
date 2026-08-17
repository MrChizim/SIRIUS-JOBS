import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, Compass, ListChecks, BookOpen, LogOut, ClipboardList, Settings, Star } from 'lucide-react';
import NotificationBell from './NotificationBell';
import Avatar from './Avatar';
import logo from '../assets/brand/logo.png';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

const navLinks = [
  { to: '/', label: 'Home', icon: Compass },
  { to: '/browse-tasks', label: 'Browse Tasks', icon: ListChecks },
  { to: '/how-it-works', label: 'How It Works', icon: BookOpen },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `nav-link text-sm font-semibold transition-colors ${
    isActive ? 'text-primary' : 'text-gray-600 hover:text-primary'
  }`;
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const displayName = (user?.user_metadata?.full_name as string | undefined) || user?.email || '';

  useEffect(() => {
    if (!profileMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [user]);

  async function handleSignOut() {
    await signOut();
    setMobileOpen(false);
    setProfileMenuOpen(false);
    navigate('/');
  }

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <Link to="/" className="group flex items-center space-x-3">
              <img
                src={logo}
                alt="Sirius Jobs logo"
                className="h-10 w-auto drop-shadow-2xl transition-transform group-hover:scale-105 sm:h-12 md:h-14"
              />
            </Link>

            <div className="hidden items-center space-x-8 lg:flex">
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={navLinkClass}>
                  {link.label}
                </NavLink>
              ))}
            </div>

            <div className="hidden items-center space-x-4 lg:flex">
              {user ? (
                <>
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      onClick={() => setProfileMenuOpen((open) => !open)}
                      aria-haspopup="true"
                      aria-expanded={profileMenuOpen}
                      aria-label="Open profile menu"
                    >
                      <Avatar url={avatarUrl} name={displayName} size={40} />
                    </button>
                    <div
                      className={`absolute right-0 mt-2 w-48 rounded-xl border border-gray-200/70 bg-white p-2 shadow-lg transition-all ${
                        profileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'
                      }`}
                    >
                      <p className="truncate px-3 py-2 text-sm font-semibold text-gray-900">
                        {displayName}
                      </p>
                      <Link
                        to="/my-tasks"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary"
                      >
                        <ClipboardList className="h-4 w-4" />
                        My Tasks
                      </Link>
                      {user && (
                        <Link
                          to={`/users/${user.id}`}
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary"
                        >
                          <Star className="h-4 w-4" />
                          My Reviews
                        </Link>
                      )}
                      <Link
                        to="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                  <Link
                    to="/post-a-task"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl"
                  >
                    Post a Task
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-primary hover:text-primary"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/sign-up"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl"
                  >
                    Sign Up
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              {user && <NotificationBell />}
              <button
                className={`flex h-10 w-10 items-center justify-center ${mobileOpen ? 'hidden' : ''}`}
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div
        className={`fixed top-0 right-0 bottom-0 left-0 z-[1100] transition-opacity duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="gradient-mesh absolute inset-0" style={{ backgroundColor: '#fff' }} />

        <div className="relative flex h-full flex-col overflow-y-auto px-6 pt-6 pb-10">
          <div className="flex items-center justify-between">
            <img src={logo} alt="Sirius Jobs logo" className="h-10 w-auto" />
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {user && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
              <Avatar url={avatarUrl} name={displayName} size={44} />
              <span className="truncate font-semibold text-gray-900">{displayName}</span>
            </div>
          )}

          <nav className="mt-6 grid grid-cols-1 gap-3">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `bento-card flex items-center gap-4 rounded-2xl border p-4 shadow-sm ${
                    isActive
                      ? 'border-primary/20 bg-primary/5 text-primary'
                      : 'border-gray-200/70 bg-white text-gray-900'
                  }`
                }
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-lg font-bold">{label}</span>
              </NavLink>
            ))}
            {user && (
              <NavLink
                to="/my-tasks"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `bento-card flex items-center gap-4 rounded-2xl border p-4 shadow-sm ${
                    isActive
                      ? 'border-primary/20 bg-primary/5 text-primary'
                      : 'border-gray-200/70 bg-white text-gray-900'
                  }`
                }
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <span className="text-lg font-bold">My Tasks</span>
              </NavLink>
            )}
            {user && (
              <NavLink
                to={`/users/${user.id}`}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `bento-card flex items-center gap-4 rounded-2xl border p-4 shadow-sm ${
                    isActive
                      ? 'border-primary/20 bg-primary/5 text-primary'
                      : 'border-gray-200/70 bg-white text-gray-900'
                  }`
                }
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Star className="h-5 w-5" />
                </span>
                <span className="text-lg font-bold">My Reviews</span>
              </NavLink>
            )}
            {user && (
              <NavLink
                to="/settings"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `bento-card flex items-center gap-4 rounded-2xl border p-4 shadow-sm ${
                    isActive
                      ? 'border-primary/20 bg-primary/5 text-primary'
                      : 'border-gray-200/70 bg-white text-gray-900'
                  }`
                }
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Settings className="h-5 w-5" />
                </span>
                <span className="text-lg font-bold">Settings</span>
              </NavLink>
            )}
          </nav>

          <div className="mt-auto flex flex-col gap-3 pt-10">
            {user ? (
              <>
                <Link
                  to="/post-a-task"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-primary-700"
                >
                  Post a Task
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-100 px-8 py-4 text-lg font-bold text-gray-900 transition-all hover:bg-gray-200"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/sign-up"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-primary-700"
                >
                  Sign Up
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-8 py-4 text-lg font-bold text-gray-900 transition-all hover:border-primary hover:text-primary"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
