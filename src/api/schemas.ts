import { z } from 'zod'

export const credentialsSchema = z.object({
  apiUrl: z.url('Valid URL required').transform((u) => u.replace(/\/+$/, '')),
  idInstance: z.string().regex(/^\d+$/, 'Digits only'),
  apiTokenInstance: z.string().min(1, 'Required'),
})
export type Credentials = z.infer<typeof credentialsSchema>

export const stateInstanceSchema = z.object({ stateInstance: z.string() })

export const settingsSchema = z.looseObject({
  incomingWebhook: z.string().optional(),
  outgoingWebhook: z.string().optional(),
})

/** `exist` is optional: a 200 rate-limit reply (`retryAfter`) carries no `exist`. */
export const checkAccountSchema = z.looseObject({
  exist: z.boolean().optional(),
  chatId: z.string().default(''),
  retryAfter: z.number().optional(),
  username: z.string().optional(),
  phoneNumber: z.number().optional(),
  fromCache: z.boolean().optional(),
})
export type CheckAccountResult = { exist: boolean; chatId: string; username?: string }

export const sendMessageSchema = z.object({ idMessage: z.string() })

export const deleteNotificationSchema = z.object({
  result: z.boolean(),
  reason: z.string().optional(),
})

const senderDataSchema = z.looseObject({
  chatId: z.string(),
  chatName: z.string().optional(),
  sender: z.string().optional(),
  senderName: z.string().optional(),
  senderContactName: z.string().optional(),
})

const incomingTextBodySchema = z.looseObject({
  typeWebhook: z.literal('incomingMessageReceived'),
  timestamp: z.number(),
  idMessage: z.string(),
  senderData: senderDataSchema,
  messageData: z.looseObject({
    typeMessage: z.literal('textMessage'),
    textMessageData: z.looseObject({ textMessage: z.string() }),
  }),
})

/** Queue item. `body` stays loose: non-text notifications are acked and ignored. */
export const notificationSchema = z.object({
  receiptId: z.number(),
  body: z.looseObject({ typeWebhook: z.string().optional() }),
})
export type Notification = z.infer<typeof notificationSchema>

export interface IncomingText {
  idMessage: string
  chatId: string
  senderName: string
  text: string
  timestamp: number
}

/** Returns normalized text message, or null if the notification is anything else. */
export function parseIncomingText(body: unknown): IncomingText | null {
  const r = incomingTextBodySchema.safeParse(body)
  if (!r.success) return null
  const { senderData: s, messageData: m } = r.data
  return {
    idMessage: r.data.idMessage,
    chatId: s.chatId,
    senderName: s.senderName || s.senderContactName || s.chatName || s.chatId,
    text: m.textMessageData.textMessage,
    timestamp: r.data.timestamp,
  }
}

const contactSchema = z.looseObject({
  chatId: z.string(),
  name: z.string().optional(),
  contactName: z.string().optional(),
  type: z.string().optional(),
  phoneNumber: z.number().optional(),
  username: z.string().optional(),
})
export const contactsSchema = z.array(contactSchema)
export type Contact = z.infer<typeof contactSchema>

export const avatarSchema = z.looseObject({ urlAvatar: z.string().optional() })

const historyItemSchema = z.looseObject({
  type: z.enum(['incoming', 'outgoing']),
  idMessage: z.string(),
  timestamp: z.number(),
  typeMessage: z.string(),
  textMessage: z.string().optional(),
  statusMessage: z.string().optional(),
  senderName: z.string().optional(),
  senderContactName: z.string().optional(),
})

export interface HistoryMessage {
  id: string
  direction: 'in' | 'out'
  text: string
  timestamp: number
  /** Outgoing only. */
  delivery?: 'delivered' | 'read'
  /** Incoming only: sender display name (useful in groups). */
  author?: string
}

/** Keeps text messages only; one malformed row must not break the whole history. */
export function parseHistory(raw: unknown): HistoryMessage[] {
  if (!Array.isArray(raw)) return []
  const out: HistoryMessage[] = []
  for (const row of raw) {
    const r = historyItemSchema.safeParse(row)
    if (!r.success || r.data.typeMessage !== 'textMessage' || r.data.textMessage === undefined) {
      continue
    }
    const { data: m } = r
    out.push({
      id: m.idMessage,
      direction: m.type === 'outgoing' ? 'out' : 'in',
      text: m.textMessage ?? '',
      timestamp: m.timestamp,
      delivery:
        m.type === 'outgoing' && (m.statusMessage === 'read' || m.statusMessage === 'delivered')
          ? m.statusMessage
          : undefined,
      author: m.type === 'incoming' ? m.senderContactName || m.senderName || undefined : undefined,
    })
  }
  return out.sort((a, b) => a.timestamp - b.timestamp)
}

/** Methods that answer with an empty body on success (deleteMessage, sendTyping). */
export const emptyResponseSchema = z.unknown()

export const editMessageSchema = z.object({ idMessage: z.string() })

const CHAT_TYPES = ['user', 'bot', 'group', 'supergroup', 'channel'] as const
export type ChatType = (typeof CHAT_TYPES)[number]

export const chatTypeSchema = z.enum(CHAT_TYPES).catch('user')

const chatInfoSchema = z.looseObject({
  chatId: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  phoneNumber: z.number().optional(),
  username: z.string().optional(),
})
export const chatsSchema = z.array(chatInfoSchema)
export type ChatInfo = z.infer<typeof chatInfoSchema>

export const addContactSchema = z.looseObject({
  addContact: z.boolean().optional(),
  message: z.string().optional(),
})

export const contactInfoSchema = z.looseObject({
  lastSeen: z.number().optional(),
  name: z.string().optional(),
  contactName: z.string().optional(),
  chatType: z.string().optional(),
})
export type ContactInfo = z.infer<typeof contactInfoSchema>

export const accountSettingsSchema = z.looseObject({
  avatar: z.string().optional(),
  phone: z.string().optional(),
  chatId: z.string().optional(),
  username: z.string().optional(),
})
export type AccountSettings = z.infer<typeof accountSettingsSchema>

const outgoingStatusBodySchema = z.looseObject({
  typeWebhook: z.literal('outgoingMessageStatus'),
  chatId: z.string(),
  idMessage: z.string(),
  status: z.string(),
})

export interface OutgoingStatus {
  chatId: string
  idMessage: string
  /** `delivered` / `read` raise the tick marks; `failed` / `noAccount` mean it never arrived. */
  status: 'delivered' | 'read' | 'failed'
}

/** Normalizes an `outgoingMessageStatus` notification; null for anything else. */
export function parseOutgoingStatus(body: unknown): OutgoingStatus | null {
  const r = outgoingStatusBodySchema.safeParse(body)
  if (!r.success) return null
  const { chatId, idMessage, status } = r.data
  if (status === 'delivered' || status === 'read') return { chatId, idMessage, status }
  if (status === 'failed' || status === 'noAccount') return { chatId, idMessage, status: 'failed' }
  return null
}

export const setSettingsSchema = z.looseObject({ saveSettings: z.boolean().optional() })
