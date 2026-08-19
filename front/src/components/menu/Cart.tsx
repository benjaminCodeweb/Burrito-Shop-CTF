import type { CartLine, MenuItem } from '../../types'
import { primaryButtonClass } from '../../lib/ui'

export default function Cart({
  cart,
  items,
  onIncrement,
  onDecrement,
  onContinue,
}: {
  cart: CartLine[]
  items: MenuItem[]
  onIncrement: (itemId: string) => void
  onDecrement: (itemId: string) => void
  onContinue: () => void
}) {
  const lines = cart
    .map((line) => ({ line, item: items.find((i) => i.id === line.id) }))
    .filter((l): l is { line: CartLine; item: MenuItem } => Boolean(l.item))

  const subtotal = lines.reduce((sum, { line, item }) => sum + item.price * line.qty, 0)
  const totalItems = cart.reduce((sum, l) => sum + l.qty, 0)

  return (
    <aside className="sticky top-4 h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold tracking-tight text-stone-900">Mi pedido</h2>

      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-2xl">🧾</div>
          <p className="text-sm font-medium text-stone-400">Tu pedido está vacío</p>
        </div>
      ) : (
        <>
          <ul className="mb-4 space-y-3 border-b border-stone-100 pb-4">
            {lines.map(({ line, item }) => (
              <li key={line.id} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-lg">
                  {item.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-800">{item.name}</p>
                  <p className="text-xs text-stone-400">${item.price.toFixed(2)} c/u</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 px-1 py-1">
                  <button
                    onClick={() => onDecrement(item.id)}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-stone-600 hover:bg-stone-100"
                    aria-label="Quitar"
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-xs font-semibold text-stone-800">{line.qty}</span>
                  <button
                    onClick={() => onIncrement(item.id)}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-stone-600 hover:bg-stone-100"
                    aria-label="Agregar"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mb-4 space-y-1.5 border-b border-stone-100 pb-4 text-sm">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal ({totalItems} {totalItems === 1 ? 'producto' : 'productos'})</span>
              <span className="font-medium text-stone-700">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-stone-900">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}

      <button disabled={totalItems === 0} onClick={onContinue} className={primaryButtonClass}>
        Continuar
      </button>
    </aside>
  )
}
