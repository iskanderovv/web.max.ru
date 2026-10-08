import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { credentialsSchema } from '@/api/schemas'
import { verifyCredentials } from '@/api/verify'
import { useAuth } from '@/store/auth'

type FormValues = z.input<typeof credentialsSchema>

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-tg-blue/30'

export function LoginForm() {
  const login = useAuth((s) => s.login)
  const {
    register,
    handleSubmit,
    setValue,
    getFieldState,
    formState: { errors },
  } = useForm<FormValues, unknown, z.output<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { apiUrl: '', idInstance: '', apiTokenInstance: '' },
  })

  const connect = useMutation({
    mutationFn: async (c: z.output<typeof credentialsSchema>) => {
      await verifyCredentials(c)
      return c
    },
    onSuccess: (c) => login(c),
  })

  const idField = register('idInstance', {
    // Instance host is `https://{first 4 digits of id}.api.green-api.com`: prefill unless edited.
    onChange: (e) => {
      const id: string = e.target.value.trim()
      if (id.length >= 4 && !getFieldState('apiUrl').isDirty) {
        setValue('apiUrl', `https://${id.slice(0, 4)}.api.green-api.com`)
      }
    },
  })

  return (
    <main className="tg-wallpaper grid h-full place-items-center p-4">
      <form
        onSubmit={handleSubmit((v) => connect.mutate(v))}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-lg"
        noValidate
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-tg-blue text-white">
            <MessageCircle size={22} />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Telegram Chat</h1>
            <p className="text-xs text-slate-500">Sign in with your GREEN-API instance</p>
          </div>
        </div>

        <Field label="idInstance" error={errors.idInstance?.message}>
          <input {...idField} inputMode="numeric" autoComplete="off" className={inputCls} />
        </Field>
        <Field label="apiTokenInstance" error={errors.apiTokenInstance?.message}>
          <input
            {...register('apiTokenInstance')}
            type="password"
            autoComplete="off"
            className={inputCls}
          />
        </Field>
        <Field label="apiUrl" error={errors.apiUrl?.message}>
          <input
            {...register('apiUrl')}
            placeholder="https://4100.api.green-api.com"
            autoComplete="off"
            className={inputCls}
          />
        </Field>

        {connect.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {connect.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={connect.isPending}
          className="w-full rounded-lg bg-tg-blue py-2 text-sm font-medium text-white hover:bg-tg-blue-dark disabled:opacity-60"
        >
          {connect.isPending ? 'Connecting…' : 'Connect'}
        </button>
      </form>
    </main>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  )
}
