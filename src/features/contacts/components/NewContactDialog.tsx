import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useGreenApi } from '@/features/auth/hooks/useGreenApi'
import { parseRecipient } from '@/features/contacts/lib/recipient'
import { useChats } from '@/features/chats/store'
import { Modal } from '@/shared/components/Modal'

const schema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(64),
  lastName: z.string().trim().max(64),
  phone: z.string().refine((v) => {
    const r = parseRecipient(v)
    return !!r && 'phoneNumber' in r
  }, 'Enter a valid phone number, e.g. +998 90 123 45 67'),
})
type Values = z.infer<typeof schema>

const NOT_FOUND =
  'This number is not on Telegram, or its privacy settings hide it. Check the number and try again.'

const fieldCls =
  'w-full rounded-xl bg-mx-hover px-4 py-3 text-[16px] outline-none placeholder:text-mx-secondary focus:ring-2 focus:ring-mx-accent'

export function NewContactDialog({ onClose }: { onClose: () => void }) {
  const api = useGreenApi()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', phone: '' },
  })

  const create = useMutation({
    mutationFn: async (v: Values) => {
      const recipient = parseRecipient(v.phone)
      if (!recipient || !('phoneNumber' in recipient)) throw new Error(NOT_FOUND)
      const found = await api.checkAccount(recipient)
      if (!found.exist || !found.chatId) throw new Error(NOT_FOUND)
      await api.addContact(found.chatId, v.firstName.trim(), v.lastName.trim() || undefined)
      return { chatId: found.chatId, username: found.username, v }
    },
    onSuccess: ({ chatId, username, v }) => {
      const title = [v.firstName.trim(), v.lastName.trim()].filter(Boolean).join(' ')
      useChats
        .getState()
        .ensureChat({ chatId, title, username: username || undefined, type: 'user' })
      useChats.getState().selectChat(chatId)
      void queryClient.invalidateQueries({ queryKey: ['contacts'] })
      void queryClient.invalidateQueries({ queryKey: ['chats'] })
      onClose()
    },
  })

  return (
    <Modal title="New Contact" onClose={onClose}>
      <form
        onSubmit={handleSubmit((v) => create.mutate(v))}
        noValidate
        className="space-y-4 px-5 pt-2 pb-5"
      >
        <div className="space-y-2">
          <input
            {...register('firstName')}
            autoFocus
            autoComplete="off"
            placeholder="First name (required)"
            aria-label="First name"
            className={fieldCls}
          />
          <input
            {...register('lastName')}
            autoComplete="off"
            placeholder="Last name (optional)"
            aria-label="Last name"
            className={fieldCls}
          />
        </div>
        {errors.firstName && <p className="text-sm text-mx-danger">{errors.firstName.message}</p>}

        <div className="space-y-1.5 border-t border-mx-border pt-4">
          <label htmlFor="phone" className="text-sm font-medium text-mx-secondary">
            Phone Number
          </label>
          <input
            id="phone"
            {...register('phone')}
            inputMode="tel"
            autoComplete="off"
            placeholder="+998 90 123 45 67"
            className={fieldCls}
          />
          {errors.phone ? (
            <p className="text-sm text-mx-danger">{errors.phone.message}</p>
          ) : (
            <p className="text-sm text-mx-secondary">
              The contact is added to your Telegram contacts.
            </p>
          )}
        </div>

        {create.error && (
          <p
            role="alert"
            className="rounded-lg bg-mx-error-bg px-3 py-2 text-sm text-mx-error-text"
          >
            {create.error.message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-[15px] font-medium text-mx-accent hover:bg-mx-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-xl bg-mx-action px-5 py-2.5 text-[15px] font-medium text-white hover:bg-mx-action-dark disabled:opacity-60"
          >
            {create.isPending ? 'Adding…' : 'Add contact'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
