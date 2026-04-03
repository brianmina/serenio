import Link from 'next/link'
import { logout } from '@/app/auth/actions'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/expenses', label: 'Expenses', icon: '💰' },
  { href: '/food', label: 'Food', icon: '🥗' },
  { href: '/sleep', label: 'Sleep', icon: '😴' },
  { href: '/journal', label: 'Journal', icon: '📓' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-200 flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-emerald-700">Serenio</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition text-sm font-medium"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-red-500 transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto pb-20 md:pb-8">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-gray-500 hover:text-emerald-700 transition"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
        <form action={logout} className="flex-1">
          <button
            type="submit"
            className="w-full h-full flex flex-col items-center gap-0.5 py-2.5 text-gray-500 hover:text-red-500 transition"
          >
            <span className="text-xl">↩</span>
            <span className="text-[10px] font-medium">Sign out</span>
          </button>
        </form>
      </nav>
    </div>
  )
}
