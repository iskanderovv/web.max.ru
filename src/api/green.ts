import { ApiError } from './errors'
import { request } from './client'
import { z } from 'zod'
import {
  avatarSchema,
  checkAccountSchema,
  contactsSchema,
  parseHistory,
  deleteNotificationSchema,
  notificationSchema,
  sendMessageSchema,
  settingsSchema,
  stateInstanceSchema,
  type CheckAccountResult,
  type Contact,
  type HistoryMessage,
  type Credentials,
  type Notification,
} from './schemas'

export const MAX_MESSAGE_LENGTH = 4096

/** What the user typed in "new chat": phone number or @username. */
export type Recipient = { phoneNumber: number } | { username: string }

export function createGreenApi(c: Credentials) {
  return {
    getStateInstance: (signal?: AbortSignal) =>
      request(c, 'getStateInstance', stateInstanceSchema, { signal }),

    getSettings: (signal?: AbortSignal) => request(c, 'getSettings', settingsSchema, { signal }),

    async checkAccount(to: Recipient, signal?: AbortSignal): Promise<CheckAccountResult> {
      const res = await request(c, 'checkAccount', checkAccountSchema, {
        method: 'POST',
        body: to,
        signal,
      })
      if (res.exist === undefined) {
        throw new ApiError('Too many lookups, pause for a while', 200, res)
      }
      return { exist: res.exist, chatId: res.chatId, username: res.username }
    },

    getContacts: (signal?: AbortSignal): Promise<Contact[]> =>
      request(c, 'getContacts', contactsSchema, { signal }),

    async getAvatar(chatId: string, signal?: AbortSignal): Promise<string> {
      const res = await request(c, 'getAvatar', avatarSchema, {
        method: 'POST',
        body: { chatId },
        signal,
      })
      return res.urlAvatar ?? ''
    },

    async getChatHistory(
      chatId: string,
      count = 30,
      signal?: AbortSignal,
    ): Promise<HistoryMessage[]> {
      const raw = await request(c, 'getChatHistory', z.array(z.unknown()), {
        method: 'POST',
        body: { chatId, count },
        signal,
      })
      return parseHistory(raw)
    },

    sendMessage: (chatId: string, message: string, signal?: AbortSignal) =>
      request(c, 'sendMessage', sendMessageSchema, {
        method: 'POST',
        body: { chatId, message },
        signal,
      }),

    /** One notification from the queue, or null when the queue is empty. */
    async receiveNotification(
      receiveTimeout = 20,
      signal?: AbortSignal,
    ): Promise<Notification | null> {
      return request(c, 'receiveNotification', notificationSchema.nullable(), {
        query: { receiveTimeout },
        signal,
      })
    },

    deleteNotification: (receiptId: number, signal?: AbortSignal) =>
      request(c, 'deleteNotification', deleteNotificationSchema, {
        method: 'DELETE',
        extra: receiptId,
        signal,
      }),
  }
}

export type GreenApi = ReturnType<typeof createGreenApi>
