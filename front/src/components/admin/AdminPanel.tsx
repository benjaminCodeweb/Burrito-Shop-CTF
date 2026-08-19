import { useEffect, useState } from 'react'
import { httpClient } from '../../lib/http/httpClient'
import type { EmailRenderReport, Order, User } from '../../types'

interface AdminOrder extends Order {
  customer: User
}

export default function AdminPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [reports, setReports] = useState<Record<string, EmailRenderReport>>({})
  const [renderingId, setRenderingId] = useState<string | null>(null)

  useEffect(() => {
    httpClient.get<{ orders: AdminOrder[] }>('/api/admin/orders').then((res) => setOrders(res.data.orders))
  }, [])

  async function exportEmail(orderId: string) {
    setRenderingId(orderId)
    try {
      const res = await httpClient.post<EmailRenderReport>(`/api/admin/emails/${orderId}/render`)
      setReports((prev) => ({ ...prev, [orderId]: res.data }))
    } finally {
      setRenderingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
          Panel de soporte (admin)
        </h2>
        <p className="mt-1 max-w-2xl text-xs text-slate-500">
          "Exportar email" genera una vista previa en PDF del email de confirmacion del pedido,
          resolviendo del lado del servidor las imagenes que referencia.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Pedido</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Nickname</th>
              <th className="px-4 py-2 font-medium">Entrega</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/40">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-2 font-mono text-xs text-slate-400">{order.id.slice(0, 8)}</td>
                <td className="px-4 py-2 text-slate-300">{order.customer.email}</td>
                <td className="max-w-[220px] truncate px-4 py-2 font-mono text-xs text-amber-300">
                  {order.customer.nickname}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {order.fulfillment === 'pickup' ? 'Retiro en el local' : (order.fulfillment ?? '—')}
                </td>
                <td className="px-4 py-2 text-slate-400">{order.status}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    disabled={renderingId === order.id}
                    onClick={() => exportEmail(order.id)}
                    className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-50"
                  >
                    {renderingId === order.id ? 'Exportando...' : 'Exportar email a PDF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Object.entries(reports).map(([orderId, report]) => (
        <div key={orderId} className="overflow-hidden rounded-lg border border-slate-800">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-2 text-xs text-slate-400">
            <span>
              Reporte de export · pedido <span className="font-mono text-slate-300">{orderId.slice(0, 8)}</span>
            </span>
            <span>{report.renderedAt}</span>
          </div>

          {report.resources.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No se encontraron recursos externos en el email.</p>
          ) : (
            <div className="divide-y divide-slate-800">
              {report.resources.map((resource, i) => (
                <div key={i} className="p-4">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <code className="rounded bg-slate-950 px-1.5 py-0.5 text-slate-400">{resource.url}</code>
                    {resource.ok ? (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-medium text-red-300">
                        {resource.status} {resource.contentType}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">
                        error: {resource.error}
                      </span>
                    )}
                  </div>
                  {resource.ok && (
                    <pre className="overflow-x-auto rounded-md bg-black p-3 font-mono text-xs whitespace-pre-wrap text-emerald-400">
                      {resource.bodyPreview}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
