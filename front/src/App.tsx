import { useEffect, useState, type ReactNode } from 'react'
import './App.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { httpClient } from './lib/http/httpClient'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Menu from './components/menu/Menu'
import Cart from './components/menu/Cart'
import Checkout from './components/checkout/Checkout'
import OrderTracker from './components/orders/OrderTracker'
import EmailPreview from './components/orders/EmailPreview'
import AdminPanel from './components/admin/AdminPanel'
import ProfileEditor from './components/profile/ProfileEditor'
import type { CartLine, MenuItem, Order } from './types'
import WriteupPage  from './components/writeup/WriteUpPage'

type View = 'shopping' | 'checkout' | 'tracking' | 'profile' | 'admin' | 'writeup'

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active ? 'bg-red-700 text-white' : 'text-stone-600 hover:bg-stone-100'
      }`}
    >
      {children}
    </button>
  )
}

function Shop() {
  const { user, loading, logout } = useAuth()
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [view, setView] = useState<View>('shopping')
  const [items, setItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)

  useEffect(() => {
    httpClient.get<{ items: MenuItem[] }>('/api/menu').then((res) => setItems(res.data.items))
  }, [])

  if (loading) {
    return <p className="p-8 text-center text-sm text-stone-400">Cargando...</p>
  }

  if (!user) {
  if (view === 'writeup') {
    return <WriteupPage onBack={() => setView('shopping')} />
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-lg">
          {authMode === 'login' ? (
            <Login onSwitchToRegister={() => setAuthMode('register')} />
          ) : (
            <Register onSwitchToLogin={() => setAuthMode('login')} />
          )}
        </div>

        <button
          type="button"
          onClick={() => setView('writeup')}
          className="mt-5 w-full text-center text-sm font-medium text-stone-500 hover:text-red-700"
        >
          Ver write-up y soluciones
        </button>
      </div>
    </div>
  )
}

  function incrementQty(itemId: string) {
    setCart((prev) => {
      const existing = prev.find((l) => l.id === itemId)
      if (existing) {
        return prev.map((l) => (l.id === itemId ? { ...l, qty: l.qty + 1 } : l))
      }
      return [...prev, { id: itemId, qty: 1 }]
    })
  }

  function decrementQty(itemId: string) {
    setCart((prev) =>
      prev
        .map((l) => (l.id === itemId ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0),
    )
  }

  async function confirmPayment() {
    const res = await httpClient.post<{ order: Order }>('/api/orders', {
      items: cart,
      paymentOnline: true,
    })
    setActiveOrderId(res.data.order.id)
    setCart([])
    setView('tracking')
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white/70 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <span className="font-semibold text-stone-900">{user.nickname}</span>
          <span className="text-stone-300">·</span>
          <span>{user.email}</span>
          {user.isAdmin && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              admin
            </span>
          )}
        </div>
        <nav className="flex items-center gap-1">
          <NavButton active={view === 'shopping'} onClick={() => setView('shopping')}>
            Menu
          </NavButton>
          {activeOrderId && (
            <NavButton active={view === 'tracking'} onClick={() => setView('tracking')}>
              Mi pedido
            </NavButton>
          )}
          <NavButton active={view === 'profile'} onClick={() => setView('profile')}>
            Perfil
          </NavButton>
          {user.isAdmin && (
            <NavButton active={view === 'admin'} onClick={() => setView('admin')}>
              Admin
            </NavButton>
          )}

          <NavButton
  active={view === 'writeup'}
  onClick={() => setView('writeup')}
>
  Write-up
</NavButton>
          
          <button
            onClick={logout}
            className="ml-2 rounded-full px-3.5 py-1.5 text-sm font-semibold text-stone-500 hover:bg-stone-100 hover:text-red-700"
          >
            Salir
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

        
        {view === 'shopping' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <Menu cart={cart} onIncrement={incrementQty} onDecrement={decrementQty} />
            <Cart
              cart={cart}
              items={items}
              onIncrement={incrementQty}
              onDecrement={decrementQty}
              onContinue={() => setView('checkout')}
            />
          </div>
        )}

        {view === 'checkout' && (
          <Checkout cart={cart} items={items} onBack={() => setView('shopping')} onConfirm={confirmPayment} />
        )}
        {view === 'writeup' && (
  <WriteupPage onBack={() => setView('shopping')} />
)}

        {view === 'tracking' && activeOrderId && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <OrderTracker orderId={activeOrderId} />
            <EmailPreview orderId={activeOrderId} />
          </div>
        )}

        {view === 'profile' && <ProfileEditor />}

        {view === 'admin' && user.isAdmin && <AdminPanel />}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#faf5e9]">
        <div className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-700 text-lg">
              🌯
            </span>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-stone-900">Burrito Lab</h1>
              <p className="text-xs text-stone-500">Burritos rápidos, pedís y seguís tu pedido</p>
            </div>
          </div>
        </div>
        <Shop />
      </div>
    </AuthProvider>
  )
}

export default App
