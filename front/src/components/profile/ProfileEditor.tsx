import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fieldLabelClass, inputClass, primaryButtonClass, MAX_NICKNAME_LENGTH } from '../../lib/ui'

export default function ProfileEditor() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await updateProfile({ name, nickname })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold tracking-tight text-stone-900 uppercase">Mi perfil</h2>
      <p className="mt-1 text-sm text-stone-500">Editá tu nombre y tu nickname.</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="space-y-1">
          <label className={fieldLabelClass}>Nombre</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className={fieldLabelClass}>Nickname</label>
          <input
            className={inputClass}
            value={nickname}
            maxLength={MAX_NICKNAME_LENGTH}
            onChange={(e) => setNickname(e.target.value)}
          />
          <p className="text-right text-xs text-stone-400">
            {nickname.length}/{MAX_NICKNAME_LENGTH}
          </p>
        </div>

        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {saved && <p className="mt-3 text-sm font-medium text-emerald-600">Perfil actualizado.</p>}
    </section>
  )
}
