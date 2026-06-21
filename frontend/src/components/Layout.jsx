import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  Home, Building2, Upload, Settings, LogOut,
  BarChart3, Menu, X, HelpCircle, Wrench,
} from 'lucide-react'
import { useState } from 'react'

const MAIN_NAV = [
  { to: '/dashboard',  icon: BarChart3, label: 'Dashboard' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/uploads',    icon: Upload,    label: 'Upload Files' },
]

const TOOLS_NAV = [
  { to: '/help',     icon: HelpCircle, label: 'Help' },
  { to: '/settings', icon: Settings,   label: 'Settings' },
]

function NavItem({ to, icon: Icon, label, active }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 10px',
        borderRadius: 7,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? '#111827' : '#6b7280',
        background: active ? '#f3f4f6' : 'transparent',
        textDecoration: 'none',
        transition: 'background 0.15s, color 0.15s',
      }}
      className="hover:bg-gray-50 hover:text-gray-800"
    >
      <Icon style={{ width: 15, height: 15, flexShrink: 0, color: active ? '#374151' : '#9ca3af' }} />
      {label}
    </Link>
  )
}

function SidebarContent({ user, onLogout }) {
  const location = useLocation()
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'white',
      borderRight: '1px solid #e5e7eb',
    }}>

      {/* Logo */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: '#1e293b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Home style={{ width: 14, height: 14, color: 'white' }} />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', lineHeight: 1.2 }}>RentalProps</p>
            <p style={{ fontSize: 10, color: '#94a3b8' }}>RE Consolidation</p>
          </div>
        </div>
      </div>

      {/* Scrollable main nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px 0' }}>
        <p style={{
          fontSize: 10, fontWeight: 600, color: '#b0b7c3',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '2px 8px 6px',
        }}>Main</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {MAIN_NAV.map(({ to, icon, label }) => (
            <NavItem key={to} to={to} icon={icon} label={label} active={isActive(to)} />
          ))}
        </div>
      </div>

      {/* Tools + Profile — pinned to bottom */}
      <div style={{ flexShrink: 0 }}>

        {/* Tools */}
        <div style={{ padding: '8px 8px 6px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px 6px' }}>
            <Wrench style={{ width: 10, height: 10, color: '#b0b7c3' }} />
            <p style={{
              fontSize: 10, fontWeight: 600, color: '#b0b7c3',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>Resources</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {TOOLS_NAV.map(({ to, icon, label }) => (
              <NavItem key={to} to={to} icon={icon} label={label} active={isActive(to)} />
            ))}
          </div>
        </div>

        {/* Profile */}
        <div style={{ padding: '10px 10px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#e2e8f0', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                {user?.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontSize: 12, fontWeight: 600, color: '#1e293b',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{user?.name}</p>
              <p style={{
                fontSize: 10, color: '#94a3b8',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: '#6b7280', padding: '5px 8px', borderRadius: 6,
              border: 'none', background: 'transparent', cursor: 'pointer',
            }}
            className="hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <LogOut style={{ width: 13, height: 13 }} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    // Outer shell: exactly viewport height, no overflow — both columns are bounded here
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8f9fb' }}>

      {/* ── Desktop sidebar — same height as viewport, never taller ── */}
      <div
        className="hidden lg:flex"
        style={{ width: 216, flexShrink: 0, height: '100%' }}
      >
        <div style={{ width: '100%', height: '100%' }}>
          <SidebarContent user={user} onLogout={handleLogout} />
        </div>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}
          className="lg:hidden"
        >
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }}
            onClick={() => setMobileOpen(false)}
          />
          <div style={{ position: 'relative', width: 216, zIndex: 51, height: '100%' }}>
            <SidebarContent user={user} onLogout={handleLogout} />
            <button
              onClick={() => setMobileOpen(false)}
              style={{ position: 'absolute', top: 14, right: 12, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X style={{ width: 18, height: 18, color: '#6b7280' }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Main content column — scrolls independently ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>

        {/* Mobile top bar */}
        <div
          className="flex lg:hidden items-center justify-between px-4 py-3 bg-white"
          style={{ borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}
        >
          <button onClick={() => setMobileOpen(true)}>
            <Menu style={{ width: 20, height: 20, color: '#6b7280' }} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>RentalProps</span>
          <div style={{ width: 20 }} />
        </div>

        {/* Page content — this is the only thing that scrolls */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
