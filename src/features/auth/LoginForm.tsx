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
  'w-full rounded-xl bg-mx-hover px-4 py-3 text-[16px] outline-none placeholder:text-mx-secondary focus:ring-2 focus:ring-mx-accent'

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
    <main className="mx-wallpaper grid h-full place-items-center p-4">
      <form
        onSubmit={handleSubmit((v) => connect.mutate(v))}
        className="mx-pop w-full max-w-sm space-y-4 rounded-[24px] bg-mx-surface p-8 shadow-2xl ring-1 ring-mx-ring"
        noValidate
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-mx-accent text-white">
            <MessageCircle size={22} />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Telegram Chat</h1>
            <p className="text-xs text-mx-secondary">Sign in with your GREEN-API instance</p>
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
          <p
            role="alert"
            className="rounded-lg bg-mx-error-bg px-3 py-2 text-sm text-mx-error-text"
          >
            {connect.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={connect.isPending}
          className="w-full rounded-xl bg-mx-accent py-3 text-[16px] font-medium text-white hover:bg-mx-accent-dark disabled:opacity-60"
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
      <span className="text-xs font-medium text-mx-secondary">{label}</span>
      {children}
      {error && <span className="block text-xs text-mx-danger">{error}</span>}
    </label>
  )
}
