import { useState, type FormEvent } from 'react'
import type { CartLine, MenuItem } from '../../types'
import { inputClass, fieldLabelClass, primaryButtonClass } from '../../lib/ui'

export default function Checkout({
  cart,
  items,
  onBack,
  onConfirm,
}: {
  cart: CartLine[]
  items: MenuItem[]
  onBack: () => void
  onConfirm: () => Promise<void>
}) {
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lines = cart
    .map((line) => ({ line, item: items.find((i) => i.id === line.id) }))
    .filter((l): l is { line: CartLine; item: MenuItem } => Boolean(l.item))
  const total = lines.reduce((sum, { line, item }) => sum + item.price * line.qty, 0)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPaying(true)
    setError(null)
    try {
      await onConfirm()
    } catch {
      setError('No pudimos procesar tu pago. Verificá los datos de tu tarjeta e intentá de nuevo.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <button onClick={onBack} className="mb-4 text-sm font-semibold text-stone-500 hover:text-stone-700">
        ← Volver al pedido
      </button>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold tracking-tight text-stone-900">Resumen del pedido</h2>
        <ul className="mb-4 space-y-2 border-b border-stone-100 pb-4">
          {lines.map(({ line, item }) => (
            <li key={line.id} className="flex justify-between text-sm">
              <span className="text-stone-600">
                {line.qty} × {item.name}
              </span>
              <span className="font-medium text-stone-800">${(item.price * line.qty).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mb-6 flex justify-between text-base font-bold text-stone-900">
          <span>Total a pagar</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <h2 className="mb-3 text-sm font-bold tracking-wide text-stone-500 uppercase">Método de pago</h2>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800">
          <span aria-hidden>💳</span> Tarjeta de crédito / débito
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className={fieldLabelClass}>Titular de la tarjeta</label>
            <input className={inputClass} placeholder="Nombre y apellido" required />
          </div>
          <div className="space-y-1">
            <label className={fieldLabelClass}>Número de tarjeta</label>
            <input
              className={inputClass}
              placeholder="0000 0000 0000 0000"
              inputMode="numeric"
              maxLength={19}
              required
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className={fieldLabelClass}>Vencimiento</label>
              <input className={inputClass} placeholder="MM/AA" maxLength={5} required />
            </div>
            <div className="w-24 space-y-1">
              <label className={fieldLabelClass}>CVV</label>
              <input className={inputClass} placeholder="123" inputMode="numeric" maxLength={4} required />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
          )}

          <button type="submit" disabled={paying} className={primaryButtonClass}>
            {paying ? 'Procesando pago...' : `Pagar $${total.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  )
}
