import { ApiError } from './errors'
import { request } from './client'
import { z } from 'zod'
import {
  addContactSchema,
  avatarSchema,
  chatsSchema,
  checkAccountSchema,
  contactsSchema,
  parseHistory,
  deleteNotificationSchema,
  editMessageSchema,
  emptyResponseSchema,
  notificationSchema,
  sendMessageSchema,
  settingsSchema,
  stateInstanceSchema,
  type CheckAccountResult,
  type ChatInfo,
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

    /** All dialogs of the account: users, bots, groups, supergroups and channels. */
    getChats: (signal?: AbortSignal): Promise<ChatInfo[]> =>
      request(c, 'getChats', chatsSchema, { signal }),

    /**
     * Adds (or renames) a Telegram contact by its chat id. An "already exists" refusal
     * is treated as success: the contact is there, which is all the caller needs.
     */
    async addContact(
      chatId: string,
      firstName: string,
      lastName?: string,
      signal?: AbortSignal,
    ): Promise<void> {
      try {
        const res = await request(c, 'addContact', addContactSchema, {
          method: 'POST',
          body: { chatId, firstName, ...(lastName ? { lastName } : {}) },
          signal,
        })
        if (res.addContact === false || (res.message && !res.addContact)) {
          if (/already exists/i.test(res.message ?? '')) return
          throw new ApiError(res.message || 'Could not add the contact', 200, res)
        }
      } catch (e) {
        if (e instanceof ApiError && /already exists/i.test(e.message)) return
        throw e
      }
    },

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

    /** Only own (outgoing) messages. `forEveryone=false` deletes just on our side. */
    deleteMessage: (chatId: string, idMessage: string, forEveryone = true, signal?: AbortSignal) =>
      request(c, 'deleteMessage', emptyResponseSchema, {
        method: 'POST',
        body: { chatId, idMessage, onlySenderDelete: !forEveryone },
        signal,
      }),

    /** Only own text messages, within the edit window (~48 h). */
    editMessage: (chatId: string, idMessage: string, message: string, signal?: AbortSignal) =>
      request(c, 'editMessage', editMessageSchema, {
        method: 'POST',
        body: { chatId, idMessage, message },
        signal,
      }),

    /** Shows "typing…" to the recipient for `typingTime` ms (1000-20000). */
    sendTyping: (chatId: string, typingTime = 2000, signal?: AbortSignal) =>
      request(c, 'sendTyping', emptyResponseSchema, {
        method: 'POST',
        body: { chatId, typingTime },
        signal,
      }),

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
