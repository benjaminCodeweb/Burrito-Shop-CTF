import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import writeup from '../../content/writeup.md?raw'

interface WriteupPageProps {
  onBack: () => void
}

export default function WriteupPage({ onBack }: WriteupPageProps) {
  const [showWriteup, setShowWriteup] = useState(false)

  if (!showWriteup) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:px-6">
        <section className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-7 shadow-lg sm:p-10">
          <button
            type="button"
            onClick={onBack}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-100"
          >
            <span aria-hidden="true">←</span>
            Volver a la tienda
          </button>

          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-2xl">
            🔐
          </div>

          <span className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
            Documentación técnica
          </span>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Write-up del laboratorio
          </h1>

          <p className="mt-5 text-base leading-7 text-stone-600">
            Esta sección contiene la explicación completa de las
            vulnerabilidades, los payloads, los pasos de explotación y sus
            mitigaciones.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <span className="text-xl" aria-hidden="true">
                ⚠️
              </span>

              <div>
                <h2 className="text-sm font-bold text-amber-900">
                  Advertencia de spoilers
                </h2>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Si todavía no resolviste el laboratorio, te recomendamos
                  explorarlo antes de continuar.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowWriteup(true)}
              className="inline-flex items-center justify-center rounded-full bg-red-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
            >
              Mostrar write-up
            </button>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-100"
            >
              Seguir explorando
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:border-stone-400 hover:bg-stone-100"
          >
            <span aria-hidden="true">←</span>
            Volver a la tienda
          </button>

          <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-800">
            Write-up completo
          </span>
        </nav>

        <article className="writeup-content rounded-3xl border border-stone-200 bg-white p-6 text-stone-700 shadow-sm sm:p-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {writeup}
          </ReactMarkdown>
        </article>
      </div>
    </main>
  )
}