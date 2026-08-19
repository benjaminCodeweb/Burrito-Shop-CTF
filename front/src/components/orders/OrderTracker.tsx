import { useEffect, useState } from 'react'
import { httpClient } from '../../lib/http/httpClient'
import type { Order, OrderStatus } from '../../types'

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'Pendiente' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'out_for_delivery', label: 'En camino' },
  { key: 'delivered', label: 'Entregado' },
]

const FULFILLMENT_LABEL: Record<string, string> = {
  pickup: 'Retiro en el local',
  delivery: 'Envío a domicilio',
}

export default function OrderTracker({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      const res = await httpClient.get<{ order: Order }>(`/api/orders/${orderId}`)
      if (cancelled) return
      setOrder(res.data.order)
      if (res.data.order.status !== 'delivered') {
        setTimeout(poll, 1500)
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (!order) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-stone-400">Cargando estado del pedido...</p>
      </section>
    )
  }

  const currentIndex = STEPS.findIndex((s) => s.key === order.status)

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold tracking-tight text-stone-900">
        Pedido #{order.id.slice(0, 8)}
      </h2>

      <ol className="mb-4 flex items-center">
        {STEPS.map((step, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          return (
            <li key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    done || active ? 'bg-red-700 text-white' : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span
                  className={`text-[11px] whitespace-nowrap ${
                    active ? 'font-semibold text-red-700' : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 ${done ? 'bg-red-700' : 'bg-stone-100'}`} />
              )}
            </li>
          )
        })}
      </ol>

      <p className="text-sm text-stone-500">
        Total: <span className="font-semibold text-stone-900">${order.total.toFixed(2)}</span>
      </p>
      {order.fulfillment && (
        <p className="mt-1 text-sm text-stone-500">
          Entrega:{' '}
          <span className="font-semibold text-stone-900">
            {FULFILLMENT_LABEL[order.fulfillment] ?? order.fulfillment}
          </span>
        </p>
      )}
    </section>
  )
}
