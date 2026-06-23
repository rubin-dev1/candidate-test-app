# Python Developer Test — Setup Guide

## Стек

| Слой       | Технология                          |
|------------|-------------------------------------|
| Frontend   | Next.js 15, React 19, Tailwind CSS  |
| Backend    | Next.js API Routes (Node.js)        |
| Хранилище  | Google Sheets API v4                |
| Auth       | JWT в HTTP-only cookies (jose)      |
| Деплой     | Vercel (рекомендуется)              |

---

## 1. Google Sheets — создание таблицы

### 1.1 Создайте новую таблицу
Откройте https://sheets.google.com и создайте пустую таблицу.  
Назовите её, например, **PythonTestDB**.

Скопируйте **ID таблицы** из URL:
```
https://docs.google.com/spreadsheets/d/  ← ВОТ ЭТО →  /edit
```

### 1.2 Создайте 4 листа с точными названиями

#### Лист `AllowedEmails`
| email | added_at | source | comment |
|-------|----------|--------|---------|
| candidate@example.com | 2025-01-01T00:00:00.000Z | manual | Иван Иванов |

#### Лист `Admins`
| email | role | added_at | comment |
|-------|------|----------|---------|
| admin@yourcompany.com | superadmin | 2025-01-01T00:00:00.000Z | HR |

#### Лист `Questions`
| id | group | question | options_json | correct_answers_json | question_type | explanation | active |
|----|-------|----------|--------------|----------------------|---------------|-------------|--------|
| 1 | 1 | Что такое Python? | ["Компилируемый язык","Интерпретируемый язык","Язык разметки"] | ["Интерпретируемый язык"] | single | Python — интерпретируемый язык высокого уровня | true |

#### Лист `Results`
| attempt_id | email | started_at | finished_at | status | correct_count | wrong_count | skipped_count | percent | questions_json | answers_json | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
*(оставьте пустым — заполняется автоматически)*

> **Важно:** Первая строка каждого листа — заголовки (скопируйте точно).  
> Данные начинаются со второй строки.

---

## 2. Google Cloud — настройка сервисного аккаунта

### 2.1 Создайте проект
1. Откройте https://console.cloud.google.com
2. Создайте новый проект (или выберите существующий)

### 2.2 Включите Google Sheets API
1. Перейдите: **APIs & Services → Library**
2. Найдите **"Google Sheets API"**
3. Нажмите **Enable**

### 2.3 Создайте Service Account
1. Перейдите: **APIs & Services → Credentials**
2. Нажмите **+ Create Credentials → Service account**
3. Задайте имя, нажмите **Create and continue**
4. Роль: **Editor** (или оставьте пустым), нажмите **Done**

### 2.4 Создайте JSON-ключ
1. Нажмите на созданный сервисный аккаунт
2. Вкладка **Keys** → **Add Key → Create new key → JSON**
3. Скачается файл вида `project-name-xxxx.json`

Из этого файла вам нужны:
- `client_email` → для `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → для `GOOGLE_PRIVATE_KEY`

### 2.5 Дайте доступ к таблице
1. Откройте вашу Google таблицу
2. Нажмите **Share (Поделиться)**
3. Вставьте email сервисного аккаунта (из `client_email`)
4. Выберите роль **Editor**
5. Нажмите **Share**

---

## 3. Локальный запуск

### 3.1 Клонируйте и установите зависимости
```bash
git clone <your-repo>
cd python-test-app
npm install
```

### 3.2 Создайте `.env.local`
```bash
cp .env.local.example .env.local
```

Заполните файл `.env.local`:
```env
GOOGLE_SPREADSHEET_ID=ваш_id_таблицы

GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com

# Из JSON-файла. Важно: сохраните ключ в одну строку с \n вместо переносов!
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----\n"

JWT_SECRET=сгенерируйте-длинную-случайную-строку-минимум-32-символа

PASS_THRESHOLD=70
RETAKE_COOLDOWN_DAYS=7
```

**Как получить GOOGLE_PRIVATE_KEY в правильном формате:**
```bash
# На macOS/Linux:
cat your-key-file.json | python3 -c "import json,sys; print(json.load(sys.stdin)['private_key'].replace('\n', '\\n'))"
```

### 3.3 Запустите
```bash
npm run dev
```
Откройте http://localhost:3000

---

## 4. Структура проекта

```
src/
├── app/
│   ├── page.tsx              # Страница входа
│   ├── test/page.tsx         # Страница теста
│   ├── result/page.tsx       # Страница результатов
│   ├── admin/page.tsx        # Панель администратора
│   └── api/
│       ├── auth/login/       # POST /api/auth/login
│       ├── auth/logout/      # POST /api/auth/logout
│       ├── test/start/       # GET  /api/test/start
│       ├── test/submit/      # POST /api/test/submit
│       ├── admin/emails/     # GET/POST /api/admin/emails
│       ├── admin/results/    # GET /api/admin/results
│       └── admin/questions/  # GET/POST/PATCH/DELETE
├── components/
│   ├── Timer.tsx
│   ├── QuestionCard.tsx
│   ├── ProgressBar.tsx
│   └── LanguageSwitcher.tsx
├── contexts/
│   └── LanguageContext.tsx
├── lib/
│   ├── auth.ts               # JWT утилиты
│   ├── sheets.ts             # Google Sheets CRUD
│   ├── translations.ts       # RU/EN переводы
│   └── types.ts              # TypeScript типы
└── middleware.ts             # Защита роутов
```

---

## 5. Деплой на Vercel

```bash
npm i -g vercel
vercel
```

В панели Vercel добавьте все переменные из `.env.local`:
- Settings → Environment Variables

> ⚠️ Для `GOOGLE_PRIVATE_KEY` в Vercel вставляйте значение **с реальными** переносами строк (не `\n`). Vercel сам обработает их корректно.

---

## 6. Добавление вопросов пачкой (CSV → Sheets)

Скачайте шаблон CSV и импортируйте через **File → Import** в Google Sheets.

**Формат CSV:**
```csv
id,group,question,options_json,correct_answers_json,question_type,explanation,active
1,1,"Что выведет print(type([]))?","[\"<class 'list'>\",\"<class 'tuple'>\",\"<class 'dict'>\"]","[\"<class 'list'>\"]",single,"type([]) возвращает тип объекта — list",true
2,1,"Какие из следующих типов являются изменяемыми?","[\"list\",\"tuple\",\"str\",\"dict\",\"frozenset\"]","[\"list\",\"dict\"]",multiple,"list и dict — изменяемые (mutable) структуры данных",true
```

**Правила:**
- `options_json` и `correct_answers_json` — JSON-массивы строк
- `question_type` — строго `single` или `multiple`
- `group` — число от 1 до 4
- `active` — `true` или `false`
- Правильные ответы должны **точно совпадать** с текстом в options_json

---

## 7. Безопасность

| Уязвимость | Защита |
|-----------|--------|
| Утечка правильных ответов | Ответы никогда не отправляются клиенту |
| Обход таймера | Сервер сохраняет время начала в JWT-куки |
| Повторная отправка | test_session очищается после submit |
| Доступ к админке | JWT проверяет `isAdmin` + middleware |
| Секреты в коде | Только `.env.local`, в `.gitignore` |
| XSS через куки | Все токены в `httpOnly` cookies |

---

## 8. Конфигурация (env)

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `PASS_THRESHOLD` | 70 | % правильных для "пройден" |
| `RETAKE_COOLDOWN_DAYS` | 7 | Дней между попытками (0 = отключено) |
| `JWT_SECRET` | — | Обязательно, мин. 32 символа |
| `GOOGLE_SPREADSHEET_ID` | — | ID таблицы |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | — | Email сервисного аккаунта |
| `GOOGLE_PRIVATE_KEY` | — | Приватный ключ |
