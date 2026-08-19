import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { inputClass, primaryButtonClass } from '../../lib/ui'

export default function Login({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
    } catch {
      setError('Credenciales invalidas')
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-700 text-2xl">
          🌯
        </div>
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Bienvenido de nuevo</h2>
        <p className="text-sm text-stone-500">Iniciá sesion para pedir</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className={inputClass}
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={inputClass}
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className={primaryButtonClass}>
          Entrar
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-center text-sm text-stone-500">
        No tenes cuenta?{' '}
        <button onClick={onSwitchToRegister} className="font-semibold text-red-700 hover:underline">
          Registrate
        </button>
      </p>
    </div>
  )
}
