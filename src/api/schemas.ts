import { z } from 'zod'

export const credentialsSchema = z.object({
  apiUrl: z.url('Valid URL required').transform((u) => u.replace(/\/+$/, '')),
  idInstance: z.string().regex(/^\d+$/, 'Digits only'),
  apiTokenInstance: z.string().min(1, 'Required'),
})
export type Credentials = z.infer<typeof credentialsSchema>

export const stateInstanceSchema = z.object({ stateInstance: z.string() })

export const settingsSchema = z.looseObject({ incomingWebhook: z.string().optional() })

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

export const incomingTextBodySchema = z.looseObject({
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
