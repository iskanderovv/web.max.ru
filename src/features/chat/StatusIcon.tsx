import { Check, CheckCheck, CircleAlert, Clock } from 'lucide-react'
import type { MessageStatus } from '@/store/chats'

const STATUS_LABEL: Record<MessageStatus, string> = {
  sending: 'Sending',
  failed: 'Failed to send',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
}

/** Clock / single check / double check, as in Telegram. Decorative when `label` is false. */
export function StatusIcon({
  status,
  size = 14,
  label = true,
}: {
  status: MessageStatus
  size?: number
  label?: boolean
}) {
  const a11y = label ? { 'aria-label': STATUS_LABEL[status] } : { 'aria-hidden': true as const }
  const common = { ...a11y, 'data-status': status }
  switch (status) {
    case 'sending':
      return <Clock size={size - 1} {...common} />
    case 'failed':
      return <CircleAlert size={size + 1} {...common} />
    case 'read':
      return <CheckCheck size={size + 2} {...common} />
    default:
      return <Check size={size} {...common} />
  }
}
