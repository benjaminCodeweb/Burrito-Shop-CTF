import { useEffect, useState } from 'react'
import { httpClient } from '../../lib/http/httpClient'
import { useAuth } from '../../context/AuthContext'

const iconButtonClass = 'rounded-full p-1.5 text-gray-500 hover:bg-gray-100'

// Sink de la vulnerabilidad: el HTML viene sin sanitizar del backend y se
// renderiza tal cual con dangerouslySetInnerHTML.
export default function EmailPreview({ orderId }: { orderId: string }) {
  const { user } = useAuth()
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    httpClient
      .get<{ html: string }>(`/api/emails/${orderId}`)
      .then((res) => setHtml(res.data.html))
  }, [orderId])

  const receivedAt = new Date().toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm">
      <div className="flex items-center gap-1 border-b border-gray-100 px-3 py-2">
        <button className={iconButtonClass} title="Archivar">🗄️</button>
        <button className={iconButtonClass} title="Marcar como spam">🚫</button>
        <button className={iconButtonClass} title="Eliminar">🗑️</button>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <button className={iconButtonClass} title="Marcar como no leido">✉️</button>
        <button className={iconButtonClass} title="Posponer">🕒</button>
      </div>

      <div className="px-6 pt-4">
        <h1 className="text-xl font-normal text-gray-900">
          Confirmacion de tu pedido #{orderId.slice(0, 8)}
        </h1>
      </div>

      <div className="flex items-start gap-3 px-6 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-medium text-white">
          TL
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <p className="truncate text-sm">
              <span className="font-semibold text-gray-900">Tienda Lab</span>{' '}
              <span className="text-gray-500">&lt;no-reply@tienda-lab.local&gt;</span>
            </p>
            <span className="shrink-0 text-xs text-gray-500">{receivedAt}</span>
          </div>
          <p className="text-sm text-gray-500">para {user?.email ?? 'mi'}</p>
        </div>
        <button className="shrink-0 text-lg text-gray-300 hover:text-amber-500" title="Destacar">
          ☆
        </button>
      </div>

      <div className="px-6 pb-6">
        {html === null ? (
          <p className="text-sm text-gray-400">Cargando...</p>
        ) : (
          <div
            className="email-preview text-[15px] leading-relaxed text-gray-800"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-gray-100 px-6 py-4">
        <button className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
          ↩ Responder
        </button>
        <button className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
          ➦ Reenviar
        </button>
      </div>
    </section>
  )
}
