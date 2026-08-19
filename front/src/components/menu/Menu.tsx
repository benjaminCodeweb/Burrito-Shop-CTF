import { useEffect, useMemo, useState } from 'react'
import { httpClient } from '../../lib/http/httpClient'
import type { CartLine, MenuItem } from '../../types'

function QtyStepper({
  qty,
  onIncrement,
  onDecrement,
}: {
  qty: number
  onIncrement: () => void
  onDecrement: () => void
}) {
  if (qty === 0) {
    return (
      <button
        onClick={onIncrement}
        className="mt-3 w-full rounded-full bg-red-700 px-3 py-1.5 text-xs font-bold tracking-wide text-white uppercase transition-colors hover:bg-red-800"
      >
        Agregar
      </button>
    )
  }
  return (
    <div className="mt-3 flex w-full items-center justify-between rounded-full bg-red-700 px-1 py-1">
      <button
        onClick={onDecrement}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white hover:bg-white/30"
        aria-label="Quitar"
      >
        −
      </button>
      <span className="text-sm font-bold text-white">{qty}</span>
      <button
        onClick={onIncrement}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white hover:bg-white/30"
        aria-label="Agregar"
      >
        +
      </button>
    </div>
  )
}

function ProductCard({
  item,
  qty,
  onIncrement,
  onDecrement,
}: {
  item: MenuItem
  qty: number
  onIncrement: () => void
  onDecrement: () => void
}) {
  const discountPct = item.originalPrice
    ? Math.round(100 - (item.price / item.originalPrice) * 100)
    : null

  return (
    <div className="relative flex flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {discountPct !== null && (
        <span className="absolute top-3 left-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-stone-900">
          {discountPct}% OFF
        </span>
      )}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-3xl">
        {item.emoji}
      </div>
      <p className="mt-3 text-center text-sm font-semibold text-stone-900">{item.name}</p>
      <p className="mt-0.5 line-clamp-2 text-center text-xs text-stone-500">{item.description}</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <span className="text-sm font-bold text-stone-900">${item.price.toFixed(2)}</span>
        {item.originalPrice && (
          <span className="text-xs text-stone-400 line-through">${item.originalPrice.toFixed(2)}</span>
        )}
      </div>
      <QtyStepper qty={qty} onIncrement={onIncrement} onDecrement={onDecrement} />
    </div>
  )
}

export default function Menu({
  cart,
  onIncrement,
  onDecrement,
}: {
  cart: CartLine[]
  onIncrement: (itemId: string) => void
  onDecrement: (itemId: string) => void
}) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('Promociones')

  useEffect(() => {
    httpClient.get<{ items: MenuItem[] }>('/api/menu').then((res) => setItems(res.data.items))
  }, [])

  const promos = useMemo(() => items.filter((i) => i.originalPrice), [items])
  const categories = useMemo(() => {
    const unique = Array.from(new Set(items.map((i) => i.category)))
    return promos.length > 0 ? ['Promociones', ...unique] : unique
  }, [items, promos])

  const visibleItems = activeCategory === 'Promociones' ? promos : items.filter((i) => i.category === activeCategory)

  function qtyOf(id: string) {
    return cart.find((l) => l.id === id)?.qty ?? 0
  }

  return (
    <section>
      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeCategory === cat ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'
            } border border-stone-200`}
          >
            {cat}
          </button>
        ))}
      </div>

      {activeCategory === 'Promociones' && promos.length > 0 && (
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-linear-to-r from-red-700 to-red-600 px-5 py-4 text-white shadow-sm">
          <div>
            <p className="text-lg font-extrabold tracking-tight">Promos de la semana</p>
            <p className="text-sm text-red-100">Descuentos por tiempo limitado</p>
          </div>
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold text-stone-900 uppercase">
            hasta 30% off
          </span>
        </div>
      )}

      <h2 className="mb-3 text-base font-bold tracking-tight text-stone-900">{activeCategory}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {visibleItems.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            qty={qtyOf(item.id)}
            onIncrement={() => onIncrement(item.id)}
            onDecrement={() => onDecrement(item.id)}
          />
        ))}
        {visibleItems.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-stone-400">No hay productos en esta categoria.</p>
        )}
      </div>
    </section>
  )
}
