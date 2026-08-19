import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { inputClass, primaryButtonClass, MAX_NICKNAME_LENGTH } from '../../lib/ui'

export default function Register({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    try {
      await register(name, email, nickname, password)
    } catch {
      setError('No se pudo crear la cuenta (el email ya existe?)')
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-700 text-2xl">
          🌯
        </div>
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Crear cuenta</h2>
        <p className="text-sm text-stone-500">Sumate para armar tu pedido</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input className={inputClass} placeholder="nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className={inputClass}
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <input
            className={inputClass}
            placeholder="nickname"
            value={nickname}
            maxLength={MAX_NICKNAME_LENGTH}
            onChange={(e) => setNickname(e.target.value)}
          />
          <p className="mt-1 text-right text-xs text-stone-400">
            {nickname.length}/{MAX_NICKNAME_LENGTH}
          </p>
        </div>
        <input
          className={inputClass}
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className={primaryButtonClass}>
          Registrarme
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-center text-sm text-stone-500">
        Ya tenes cuenta?{' '}
        <button onClick={onSwitchToLogin} className="font-semibold text-red-700 hover:underline">
          Login
        </button>
      </p>
    </div>
  )
}
