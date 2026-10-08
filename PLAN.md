# PLAN: Telegram Chat (React + GREEN-API)

Maqsad: GREEN-API orqali **Telegram**'da matnli xabar yuborish/qabul qilish uchun minimal chat UI. Muddat: 5 kun.

> **Qaror (2026-10-08):** task MAX'ni asosiy deb belgilaydi, lekin WhatsApp/Telegram'ni ham ruxsat beradi. MAX `checkAccount` faqat RU/BY raqamlarini qabul qiladi, biz O'zbekistondamiz, shuning uchun **Telegram** tanlandi (docs: https://green-api.com/telegram). UI uchun prototip web.max.ru o'rniga Telegram Web uslubida. Messenjer qatlami adapter orqali ajratiladi, kerak bo'lsa MAX'ga o'tish oson.

## 1. Stack (tasdiqlangan)

Vite · React · TypeScript · Zustand (+persist) · TanStack Query · fetch · Tailwind CSS · lucide-react · Zod + React Hook Form · Vitest + RTL · ESLint + Prettier · Vercel.

Qasddan yo'q: Next.js, Redux, UI kutubxona, router (auth holatiga qarab render).

## 2. API shartnomasi (docs'dan tasdiqlangan)

Umumiy: `{apiUrl}/waInstance{idInstance}/{method}/{apiTokenInstance}` (`v3` prefiks ixtiyoriy).

| Maqsad                  | Metod  | Yo'l                                       | Tana / param                                                                                                                                            | Javob                                                                                                   |
| ----------------------- | ------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Raqam/username → chatId | POST   | `checkAccount`                             | `{phoneNumber: number}` **yoki** `{username: "@name"}` (ikkalasi birga emas), `force?: boolean`. Faqat raqamlar, `+` yo'q. Davlat cheklovi docs'da yo'q | `{exist, chatId, username, phoneNumber, fromCache}`; yo'q yoki maxfiy bo'lsa `{exist:false, chatId:""}` |
| Yuborish                | POST   | `sendMessage`                              | `{chatId, message}` (max **4096** belgi). chatId: `"10000000"` yoki `"79876543210@c.us"`                                                                | `{idMessage}`                                                                                           |
| Qabul qilish            | GET    | `receiveNotification?receiveTimeout=5..60` |                                                                                                                                                         | `{receiptId, body}` yoki bo'sh                                                                          |
| O'chirish               | DELETE | `deleteNotification/{receiptId}`           |                                                                                                                                                         | `{result, reason}`                                                                                      |

Kiruvchi matn: `body.typeWebhook === "incomingMessageReceived"` va `body.messageData.typeMessage === "textMessage"`.
Matn: `body.messageData.textMessageData.textMessage`. Chat: `body.senderData.chatId` (oddiy raqamli satr, `@c.us` yo'q). `instanceData.typeInstance === "telegram"`. Vaqt: `body.timestamp`. ID: `body.idMessage`.

Muhim qoidalar:

- `receiveNotification` har chaqiriqda bitta xabar qaytaradi; `deleteNotification` chaqirilmasa o'sha xabar qayta keladi.
- Webhook URL o'rnatilgan bo'lsa receive ishlamaydi (400). Instance'da `webhookUrl` bo'sh va `incomingWebhook: yes` bo'lishi kerak.
- Navbat 24 soat saqlanadi. Eski xabarlar tarixi API'da yo'q, tarixni o'zimiz saqlaymiz.
- `checkAccount` cheklovlari: javobda `rate_limit_exceeded` (HTTP 200, `retryAfter` bor) → 2 soat pauza; HTTP 469 (Telegram cheklagan) → bir necha soat; 500 → bir necha daqiqadan keyin. Mavjud bo'lmagan raqamni qayta-qayta tekshirmaslik.
- `exist:false` raqam yo'qligini yoki foydalanuvchi maxfiylik sozlamasi raqamni yashirganini bildiradi. Zaxira: `@username` bilan qidirish.
- Developer tarifi: 3 chat, 100 ta mavjudlik tekshiruvi. Test uchun yetarli.
- Telegram'da qabul qiluvchi senga birinchi yozishi shart emas, lekin akkaunt avval instance orqali avtorizatsiya qilingan bo'lishi kerak (kabinet).

## 3. Ochiq xavflar (0-qadamda yopiladi)

| #   | Xavf                                                                                                         | Tekshirish                                                           | Zaxira                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| R1  | **CORS**: docs'da yo'q. `api.green-api.com` ga probe 403 berdi (apiUrl instance'ga xos host bo'lishi mumkin) | Haqiqiy credentials bilan `curl -i -X OPTIONS` va brauzerdan `fetch` | Dev: Vite proxy. Prod: Vercel rewrites (`/api/*` → apiUrl). Backend kerak emas |
| R2  | **apiUrl** qiymati                                                                                           | Kabinetdan olish                                                     | Login formasida `apiUrl` maydoni (default bilan)                               |
| R3  | Instance avtorizatsiyasi (Telegram akkaunt ulangan bo'lishi kerak)                                           | Kabinetda status                                                     | Foydalanuvchiga ko'rsatma README'da                                            |
| R4  | `senderData.chatId` ↔ `checkAccount.chatId` bir xilligi                                                      | Real xabar bilan solishtirish                                        | Chat kaliti sifatida faqat `chatId`                                            |
| R5  | Rate limit / polling kvotasi                                                                                 | Real sinov                                                           | Backoff + `receiveTimeout=20`                                                  |

Foydalanuvchidan kerak: GREEN-API'da **Telegram** instance (Developer tarifi, bepul): `idInstance`, `apiTokenInstance`, `apiUrl` (kabinetdan); javob berish uchun ikkinchi Telegram akkaunt (boshqa telefon yoki do'st).

## 4. Arxitektura

```
src/
  api/        client.ts (fetch wrapper, xato turlari), green.ts (4 metod), schemas.ts (Zod)
  store/      auth.ts, chats.ts            (Zustand + persist)
  hooks/      useNotificationPoller.ts, useSendMessage.ts
  features/   auth/LoginForm, chat/{Sidebar, NewChatDialog, ChatWindow, MessageList, MessageInput}
  lib/        phone.ts, time.ts
  App.tsx, main.tsx
```

Qarorlar:

- **Credentials**: `auth` store → localStorage. Repo'ga hech qachon tushmaydi (`.env` faqat dev proxy target).
- **Polling**: `useNotificationPoller` ichida `while (active)` sikl: receive → (typing/matn bo'lsa store'ga) → delete → yana. `AbortController` bilan unmount/logout'da to'xtaydi. Xatoda eksponensial backoff (1s → 30s).
- **Idempotentlik**: xabar `idMessage` bo'yicha dedup (delete muvaffaqiyatsiz bo'lsa dublikat chiqmasin).
- **Noma'lum turdagi** bildirishnomalar (rasm, status...) ham delete qilinadi, UI'da ko'rsatilmaydi.
- **Optimistik yuborish**: xabar `sending` holatida darrov chiqadi → `sent` / `failed` (qayta urinish tugmasi).
- **Chatlar**: `Record<chatId, {chatId, title, phone?, messages[]}>`, localStorage'ga persist; hajmni cheklash (har chatda oxirgi ~500 xabar).
- **Zod**: API javoblari runtime'da tekshiriladi; noto'g'ri shakl → aniq xato.
- **Telefon**: normallash (`+998 90 123-45-67` → `998901234567`), faqat raqamlar, `checkAccount`'ga number sifatida; `@username` ham qabul qilinadi.

## 5. Qadamlar

Har qadam oxirida: `tsc --noEmit`, lint, test yashil + alohida commit.

### Qadam 0: Spike (BAJARILDI, 2026-10-08) (≈1-2 soat)

- Credentials olish, `curl` bilan 4 metodni qo'lda sinash.
- Brauzer `fetch` (CORS) tekshiruvi → R1 qarori: to'g'ridan-to'g'ri yoki proxy.
- Haqiqiy `receiveNotification` JSON'ini namuna sifatida saqlash (`fixtures/`).
- **Chiqish**: R1-R5 yopilgan, plan kerak bo'lsa yangilangan.

### Qadam 1: Scaffold

- Vite + React + TS, Tailwind, ESLint/Prettier, Vitest + RTL, path alias, `.gitignore`, `.env.example`.
- Papka strukturasi, `git init`, dastlabki commit.
- **Chiqish**: bo'sh ilova ishga tushadi, test/lint/build ishlaydi.

### Qadam 2: API qatlami

- `client.ts` (URL yig'ish, xato turlari: network/HTTP/validation), `green.ts` (4 metod), Zod sxemalari.
- Unit testlar (`fetch` mock): URL qurilishi, xato xaritasi, notification parser (fixture bilan).
- **Chiqish**: UI'siz to'liq tipli va testlangan API.

### Qadam 3: Auth ekrani

- `auth` store + persist, `LoginForm` (idInstance, apiTokenInstance, apiUrl), validatsiya.
- Ulanishni tekshirish (yengil chaqiriq), xato xabarlari, "Chiqish" tugmasi (store + chatlarni tozalash).
- **Chiqish**: login/logout ishlaydi, sahifa yangilanganda sessiya saqlanadi.

### Qadam 4: Chat store va yangi chat

- `chats` store (persist, dedup, kesish), `NewChatDialog`: raqam → normallash → `checkAccount` → chat yaratish.
- Holatlar: raqam yo'q (`exist: false`), 469 limit, noto'g'ri format.
- **Chiqish**: raqam kiritib chat yaratiladi, ro'yxatda ko'rinadi.

### Qadam 5: Xabar yuborish

- `MessageInput` (Enter yuboradi, Shift+Enter yangi qator, 4096 limit), `useSendMessage` (optimistik, failed + retry).
- **Chiqish**: xabar Telegram'dagi qabul qiluvchiga yetib boradi.

### Qadam 6: Xabar qabul qilish

- `useNotificationPoller`: sikl, delete, dedup, backoff, abort.
- Kiruvchi xabarni tegishli chatga qo'shish; noma'lum chat bo'lsa avtomatik yaratish (title = `senderName`).
- Messenjer adapteri (`api/messenger.ts` interfeysi: `resolveChat`, `send`, `receive`, `ack`) orqasida Telegram implementatsiyasi.
- Testlar: poller (fake timers), dedup, delete har doim chaqirilishi.
- **Chiqish**: qabul qiluvchi javob yozadi, u chatda paydo bo'ladi (asosiy E2E stsenariy).

### Qadam 7: UI sayqali (Telegram Web uslubi)

- 2 ustunli layout (sidebar + chat), xabar pufakchalari, vaqt, avtoskroll, o'qilmagan belgi, bo'sh holatlar, loading/error toast, mobil moslashuv, a11y (fokus, aria-label, klaviatura).
- **Chiqish**: web.telegram.org'ga yaqin, toza ko'rinish.

### Qadam 8: Mustahkamlash

- Offline/tarmoq xatosi holati, polling qayta ulanish, tab ko'rinmaganda polling siyrak, tokenni log'ga yozmaslik.
- Test qamrovi: parser, store, poller, telefon normallash, asosiy komponentlar.
- Qo'lda to'liq E2E o'tish (5-bo'limdagi qabul mezonlari).

### Qadam 9: Deploy va topshirish

- Vercel deploy (kerak bo'lsa `rewrites` proxy), env sozlash.
- **README.md**: tavsif, stack, lokal ishga tushirish yo'riqnomasi, instance sozlash (R3), arxitektura, cheklovlar.
- Skrinshotlar + qisqa video (GIF/screencast).
- Email: `hr@green-api.com`, mavzu: `Тестовое задание на должность - Фронтенд разработчик React`; ichida: rezyume PDF (+telegram), GitHub, yo'riqnoma havolasi, deploy, skrin/video, ish formati (masofaviy / Ximki / Astana).

## 6. Qabul mezonlari (taskdan)

- [ ] Foydalanuvchi `idInstance` + `apiTokenInstance` kiritadi
- [ ] Telefon raqam kiritib yangi chat yaratadi
- [ ] Matnli xabar yozib Telegram'dagi qabul qiluvchiga yuboradi
- [ ] Qabul qiluvchi Telegram'da javob beradi
- [ ] Javob chatda ko'rinadi
- [ ] React ishlatilgan, faqat matn, minimal interfeys
- [ ] GitHub repo + README (lokal ishga tushirish) + deploy + skrin/video

## 7. Vaqt taqsimoti (5 kun)

| Kun | Qadamlar                      |
| --- | ----------------------------- |
| 1   | 0, 1, 2                       |
| 2   | 3, 4, 5                       |
| 3   | 6 (asosiy stsenariy ishlaydi) |
| 4   | 7, 8                          |
| 5   | 9 + zaxira vaqt               |

## 8. Xavfsizlik va sifat qoidalari

- `apiTokenInstance` kodga, commit'ga, log'ga, URL'ga tashqari API chaqiruvdan boshqa joyga tushmaydi.
- Foydalanuvchi matni faqat React orqali render (`dangerouslySetInnerHTML` yo'q).
- Conventional Commits, kichik atomar commitlar.
- Har qadam tugagach reja belgilari (`[x]`) yangilanadi.

## 9. Spike natijalari (2026-10-08)

- **R1 CORS: yopildi.** `access-control-allow-origin: *`, metodlar `GET, POST, OPTIONS, DELETE`, header `Content-Type` ruxsat. Proxy kerak emas, brauzerdan to'g'ridan-to'g'ri chaqiramiz.
- **R2 apiUrl:** `https://4100.api.green-api.com` (instance raqamidan: `4100`). Login formasida maydon sifatida qoladi.
- **R3:** instance `authorized`, `typeInstance: "telegram"`.
- **Topilma:** `incomingWebhook` default `"no"`, shu holatda kiruvchi xabar navbatga tushmaydi. `setSettings {incomingWebhook:"yes"}` yuborildi (`saveSettings:true`); GREEN-API bo'yicha qo'llanishi bir necha daqiqa olishi mumkin. README'ga qo'lda sozlash yo'riqnomasini yozish kerak. Ilova login'da `getSettings` o'qib, o'chiq bo'lsa ogohlantiradi.
- **Bo'sh navbat:** `receiveNotification` bo'sh bo'lsa HTTP 200 va tana `null`. Klient `null`ni bo'sh deb qabul qilishi shart.
