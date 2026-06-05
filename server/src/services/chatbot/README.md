# 🤖 CineNexus Chatbot — Internal Architecture & Developer Guide

This document covers the full internal design of the CineNexus chatbot system:
how it is structured, how each bot type works, how bot control commands are
detected, and how to extend the system.

---

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [High-Level Architecture](#high-level-architecture)
4. [Data Models](#data-models)
5. [Bot Types](#bot-types)
   - [keyword-only](#1-keyword-only)
   - [flow](#2-flow)
   - [menu](#3-menu)
   - [form](#4-form)
6. [Message Processing Pipeline](#message-processing-pipeline)
7. [Bot Control Commands (Activate / Deactivate)](#bot-control-commands-activate--deactivate)
   - [Detection Algorithm](#detection-algorithm)
   - [Vocabulary Constants](#vocabulary-constants)
   - [Logic Rules](#logic-rules)
   - [Command Examples](#command-examples)
   - [Extending the Vocabulary](#extending-the-vocabulary)
8. [Template System](#template-system)
   - [Template Keys (Headers / Bodies / Footers)](#template-keys-headers--bodies--footers)
   - [Variable Interpolation](#variable-interpolation)
9. [Session Management](#session-management)
10. [Keyword Matching](#keyword-matching)
11. [Real-Time Delivery (Socket.IO)](#real-time-delivery-socketio)
12. [CRUD API Summary](#crud-api-summary)
13. [Seed Data](#seed-data)

---

## Overview

CineNexus Chat has a first-party **chatbot engine** that lets admins (account
owners) configure automated responders for their incoming chat conversations.

Key capabilities:
- **4 bot types**: keyword-only, flow, menu, form
- **Per-conversation on/off toggle** — any participant can type a control
  command to enable or disable the bot for that conversation
- **Template-based responses** with dynamic variable injection
- **Session-aware** — multi-step flows and forms maintain state across messages
- **Real-time delivery** via Socket.IO — responses appear instantly without polling

---

## File Structure

```
server/src/services/chatbot/
├── chatbot.service.ts            # CRUD service — bots, keywords, templates,
│                                 #   variables, flow steps, menus, form fields
├── chatbotTrigger.service.ts     # Core message-processing engine
│                                 #   (called on every incoming chat message)
└── chatbotControl.constants.ts  # Vocabulary sets used by the bot control
                                  #   command detector (STOP_VERBS, START_VERBS…)
```

---

## High-Level Architecture

```
Incoming chat message
        │
        ▼
┌─────────────────────────────────┐
│  handleChatbotTrigger()         │  chatbotTrigger.service.ts
│                                 │
│  1. Guard: conversation type?   │──► not direct/api → EXIT
│  2. Resolve bot identity        │
│  3. Bot control command check   │──► shouldDeactivate → disable + notify → EXIT
│                                 │──► shouldActivate   → enable  + notify → EXIT
│  4. Guard: chatbotDisabled?     │──► disabled → EXIT
│  5. Active session exists?      │──► YES → run session state machine
│                                 │
│        ┌──────┬───────┬──────┐  │
│       flow   menu   form    │  │
│        └──────┴───────┴──────┘  │
│                                 │
│  6. No session → keyword scan   │
│     Match? → init session for  │
│     flow/menu/form, or send    │
│     immediate reply (keyword-only)│
└─────────────────────────────────┘
        │
        ▼
   ChatMessage saved to MongoDB
        │
        ▼
   Socket.IO emitNewMessage()
        │
        ▼
   All conversation participants receive live update
```

---

## Data Models

| Model | Collection | Purpose |
|---|---|---|
| `Chatbot` | `chatbots` | Bot configuration (name, type, avatar, active flag) |
| `ChatbotKeyword` | `chatbotkeywords` | Trigger keywords per bot, with match strategy |
| `ChatbotTemplate` | `chatbottemplates` | Structured message templates (header/body/footer) |
| `ChatbotVariable` | `chatbotvariables` | Default variable values for template injection |
| `ChatbotFlow` | `chatbotflows` | Directed graph steps for flow bots |
| `ChatbotMenu` | `chatbotmenus` | Menu trees for menu bots |
| `ChatbotFormField` | `chatbotformfields` | Ordered form questions for form bots |
| `ChatbotSession` | `chatbotsessions` | Per-conversation active session state |
| `Conversation` | `conversations` | Includes `chatbotDisabled` flag (on/off toggle) |

---

## Bot Types

### 1. `keyword-only`

The simplest type. When a keyword matches an incoming message, the bot sends
a **single template response** immediately — no session is created, no state
is stored.

```
User: "hello"
         │
         ▼
keyword match: "hello" → exact
         │
         ▼
sendChatbotResponse(templateId)
         │
         ▼
[done — no session]
```

**Use when**: FAQs, greetings, quick one-shot replies.

---

### 2. `flow`

A **directed graph** of steps. Each step has:
- a `templateId` — what message to send at this step
- a `previousStep.stepId` — which step precedes it
- an optional `condition` — regex to match user input before advancing

When a keyword triggers a flow bot, a `ChatbotSession` is created with
`currentStepId` set to the entry step. On each subsequent message, the engine
finds the next step whose `condition` matches (or the unconditioned default step)
and advances.

```
User: "book ticket"
         │  keyword match → flow bot
         ▼
entry step → "Which movie?"  (session created, currentStepId = step1)

User: "Avengers"
         │  session found
         ▼
next step (condition: /.*/) → "Which date?" (currentStepId = step2)

User: "12 June"
         │  session found
         ▼
final step → "Booking confirmed!" (template.nextFlowStepId = null → session deleted)
```

**Use when**: Multi-step conversations with conditional branching.

---

### 3. `menu`

Presents the user with a **numbered list of options**. The user replies with
either the option number or label. Each item can trigger:

- `template` — sends a template response and ends the session
- `flow` — enters a flow starting at a specific flow step
- `menu` — navigates into a sub-menu

Session `data` stores `active_menu_id` to track which menu level the user is on.

```
User: "help"
         │  keyword match → menu bot
         ▼
Menu: "How can I help?\n\n1. Bookings\n2. Refunds\n3. Contact"
         (session created, active_menu_id = rootMenuId)

User: "1"
         │  matchedItem = Bookings (actionType: 'menu')
         ▼
Sub-menu: "Bookings\n\n1. New Booking\n2. Cancel Booking"
         (active_menu_id = bookingsSubMenuId)

User: "New Booking"
         │  matchedItem (actionType: 'template')
         ▼
Template: "Visit /bookings to make a new reservation." → session deleted
```

**Use when**: Interactive choice-driven conversations, FAQs with categories.

---

### 4. `form`

Collects **structured data** from the user through a series of sequential
questions (fields). Each `ChatbotFormField` has:
- `label` — the prompt question
- `fieldType` — `text`, `email`, `number`
- `validationRegex` / `validationMessage` — optional custom validation
- `submissionTemplateId` — the confirmation template sent after the last field

The engine iterates through fields by `order`. If validation fails, it re-asks
the same question with the error message. When all fields are filled, it sends
the submission template and deletes the session.

```
User: "contact us"
         │  keyword match → form bot
         ▼
Prompt: "What is your name?"  (session created)

User: "Alex"           → saved to session.data.name
Prompt: "Your email?"

User: "notanemail"     → INVALID (fieldType: email) → re-prompt
Prompt: "Invalid email. Please try again."

User: "alex@email.com" → saved to session.data.email
         │  all fields done
         ▼
Submission template: "Thanks Alex! We'll be in touch at alex@email.com."
         → session deleted
```

**Use when**: Lead capture, support ticket creation, feedback collection.

---

## Message Processing Pipeline

Every time a message is saved in any `direct` or `api` conversation,
`handleChatbotTrigger()` is called. Here is the full ordered pipeline:

```
Step 1 — Conversation guard
  conversation.type must be 'direct' or 'api'

Step 2 — Resolve bot identity
  Find active chatbot for the conversation owner
  → sets botName and botAvatar for system notifications

Step 3 — Bot control command detection
  tokenise(lowerText) → check for STOP / START verb + bot target + negation
  shouldDeactivate → disable chatbot, clear session, send notification
  shouldActivate   → enable chatbot, send notification

Step 4 — Disabled guard
  if (conversation.chatbotDisabled) → return (ignore message)

Step 5 — Active session lookup
  ChatbotSession.findOne({ sessionKey: conversationId })
  (Optimized O(1) index lookup using sessionKey to prevent O(N) memory and performance degradation)
  
  If session found → run type-specific state machine:
    'flow' → advance step by matching condition regex
    'menu' → match input to menu item label/number
    'form' → validate and store field value, prompt next field

Step 6 — Keyword matching (no session)
  Chatbot.find({ userId: ownerId, isActive: true })
  ChatbotKeyword.find sorted by priority desc
  
  For each keyword: test cleanInput against matchType:
    'exact'      → cleanInput === keyword
    'startsWith' → cleanInput.startsWith(keyword)
    'contains'   → cleanInput.includes(keyword)
    'regex'      → new RegExp(keyword, 'i').test(messageText)
  
  First match wins.
  
  If match found → init session (for flow/menu/form) or reply instantly
    (keyword-only)
```

---

## Bot Control Commands (Activate / Deactivate)

Any user in a conversation can activate or deactivate the chatbot by sending
a natural-language command. The system uses a **token-level NLP** approach —
no regular-expression-based substring matching.

### Detection Algorithm

```
tokenise(text)
  └─► lowercase + strip punctuation + split on whitespace
      e.g. "Don't stop it!" → ["dont", "stop", "it"]

hasBotTarget
  └─► any BOT_SINGLE token in msgTokens
      OR any BOT_MULTI phrase in normalised text

hasEffectiveVerb(verbSet)
  └─► for each token in msgTokens:
        if token ∈ verbSet:
          check pre1 = msgTokens[i-1] ?? ''
          check pre2 = msgTokens[i-2] ?? ''
          if pre1 OR pre2 ∈ NEGATION_WORDS → verb is negated (skip)
          else → un-negated verb found → return true
      return false

effectiveStopVerb  = hasBotTarget AND hasEffectiveVerb(STOP_VERBS)
effectiveStartVerb = hasBotTarget AND hasEffectiveVerb(START_VERBS)

shouldDeactivate = effectiveStopVerb  AND NOT effectiveStartVerb
shouldActivate   = effectiveStartVerb AND NOT effectiveStopVerb
```

The two flags are **strict logical opposites** — if both are true the intent
is ambiguous and **neither** fires.

---

### Vocabulary Constants

All vocabulary is defined in [`chatbotControl.constants.ts`](./chatbotControl.constants.ts).

#### `STOP_VERBS` — Deactivation verbs
```
stop · terminate · deactivate · disable · end · quit
kill · pause · halt · mute · silence · cancel · close · shut
```

#### `START_VERBS` — Activation verbs
```
start · activate · enable · resume · restart · reactivate
wake · begin · launch · unmute · restore · run
```

#### `BOT_SINGLE` — Single-word bot targets (whole-token match)
```
bot · chatbot · assistant · cinenexus
```

#### `BOT_MULTI` — Multi-word bot targets (substring match)
```
"chat bot" · "cine nexus"
```

#### `NEGATION_WORDS` — Negate the verb within a 2-token window
```
not · dont · never · no · neither · nor
without · cannot · cant · wont · shouldnt · wouldnt · couldnt
```

---

### Logic Rules

| Rule | Explanation |
|---|---|
| **Verb + Target required** | A STOP/START verb alone never fires — must pair with a bot target |
| **Target + Verb required** | A bot target alone never fires — must pair with a verb |
| **Negation check** | If a negation word appears in the 2 tokens before a verb, that verb is treated as negated and discarded |
| **Mutual exclusivity** | If both STOP and START verbs are present (and un-negated), intent is ambiguous → neither fires |
| **Whole-word tokens** | Matching is token-level — `"notification"` never matches `"not"` |

---

### Command Examples

#### ✅ Deactivation — fires `shouldDeactivate`

| Message | Why |
|---|---|
| `stop bot` | stop(STOP) + bot(target) |
| `terminate chatbot` | terminate(STOP) + chatbot(target) |
| `please disable the assistant` | disable(STOP) + assistant(target) |
| `chatbot shut` | chatbot(target) + shut(STOP) |
| `pause cine nexus` | pause(STOP) + "cine nexus"(BOT_MULTI) |
| `halt the bot now` | halt(STOP) + bot(target) |

#### ✅ Activation — fires `shouldActivate`

| Message | Why |
|---|---|
| `start bot` | start(START) + bot(target) |
| `activate chatbot` | activate(START) + chatbot(target) |
| `enable the assistant` | enable(START) + assistant(target) |
| `bot resume` | bot(target) + resume(START) |
| `reactivate cinenexus` | reactivate(START) + cinenexus(target) |
| `wake up chat bot` | wake(START) + "chat bot"(BOT_MULTI) |

#### ❌ Neither fires

| Message | Why |
|---|---|
| `don't stop the bot` | `stop` negated by `dont` (2 tokens before) |
| `never start chatbot` | `start` negated by `never` |
| `I can't stop laughing` | no bot target |
| `notification` | no verb, no bot target |
| `starting my morning` | no bot target |
| `stop and start bot` | both STOP and START present → ambiguous |
| `the bot is great` | no STOP or START verb |

---

### Extending the Vocabulary

To add a new deactivation verb (e.g. `"freeze"`):

```ts
// chatbotControl.constants.ts
export const STOP_VERBS = new Set([
  // … existing words …
  'freeze',  // ← add here
]);
```

To add a new bot target (e.g. `"nexus"`):

```ts
export const BOT_SINGLE = new Set([
  // … existing words …
  'nexus',  // ← add here
]);
```

No changes needed anywhere else — the detection logic reads from these sets at
runtime.

---

## Template System

Templates (`ChatbotTemplate`) define the content structure of a bot response.
Each template has three sections, each being an ordered list of items:

| Section | Description |
|---|---|
| `headers` | Top section — supports `type: 'text'` or media types (image, video) |
| `bodies` | Middle section — rich text content (always `text`) |
| `footers` | Bottom section — supplementary text |

Each item has a `key` (logical name), `value` (content string), and `order`.

### Template Keys Taxonomy (Headers / Bodies / Footers)

The `key` field is a **logical identifier** for a template part. It is heavily utilized by the `ChatbotTemplateBubble.tsx` frontend component to determine how to render each block (e.g. `otp_code` gets an interactive copy-to-clipboard button, `error_notice` gets a highlighted warning style, `branding` gets a subtle badge).

**Header Keys:**
| Key | Usage |
|---|---|
| `title` / `subtitle` | Primary and secondary typography headings |
| `branding` | Small company branding or powered-by text |
| `announcement` | High-visibility top banner |
| `media_image` / `media_video` | Inline media attachments |
| `media_document` | Document or file download link |

**Body Keys:**
| Key | Usage |
|---|---|
| `greeting` / `intro` | Welcome lines |
| `main_content` | The primary text content |
| `booking_details` | Structured data block for tickets/bookings |
| `otp_code` | Renders a specialized large-text block with a "Copy Code" button |
| `instructions` | Step-by-step numbered lists |
| `error_notice` | Highlighted error or warning block |

**Footer Keys:**
| Key | Usage |
|---|---|
| `disclaimer` / `unsubscribe` | Fine print |
| `help_info` | Support contact text |
| `terms_link` | Hyperlink to external terms |

> **Keys are required** for specialized UI rendering on the frontend.
> The frontend supports legacy alias mapping (e.g., mapping `otp_message` to `otp_code`) for backwards compatibility with older stored database messages.

### Variable Interpolation

Template values support `{{variable_name}}` placeholders. These are resolved
in three passes inside `compileText()`:

```
Pass 1 — Context variables (always available)
  {{sender_name}}    → name of the user who sent the message
  {{chatbot_name}}   → name of the active chatbot
  {{current_date}}   → today's date (locale string)

Pass 2 — Session variables
  {{field_name}}     → any key stored in session.data (e.g. form field values)

Pass 3 — Default variables (ChatbotVariable collection)
  {{var_name}}       → admin-configured default values per chatbot
```

Example template body value:
```
Hello {{sender_name}}! Your booking for {{movie}} on {{current_date}} is confirmed.
```

---

## Session Management

A `ChatbotSession` is created when a `flow`, `menu`, or `form` bot is
triggered. It stores:

| Field | Description |
|---|---|
| `chatbotId` | Which bot owns this session |
| `sessionKey` | The `conversationId` — one session per conversation at a time |
| `currentStepId` | Current flow step (flow bots only) |
| `data` | `Map<string, string>` — arbitrary key-value state (form values, active menu ID) |
| `expiresAt` | TTL — 30 minutes from session creation |

**Session lifecycle:**
1. Created when a keyword match triggers a stateful bot type
2. Updated on each message (step advancement, field collection)
3. Deleted when:
   - The flow reaches a terminal step (no `nextFlowStepId`)
   - A menu item's template is sent
   - All form fields are collected
   - The user sends a deactivation command (`shouldDeactivate` clears session)

---

## Keyword Matching

Keywords are evaluated in **priority descending** order. The first keyword
that matches wins — lower-priority keywords are not evaluated.

| `matchType` | Behaviour |
|---|---|
| `exact` | `cleanInput === keyword` (case-insensitive, trimmed) |
| `startsWith` | `cleanInput.startsWith(keyword)` |
| `contains` | `cleanInput.includes(keyword)` |
| `regex` | `new RegExp(keyword, 'i').test(messageText)` |

> **Note**: `cleanInput` is `messageText.trim().toLowerCase()`. `regex`
> matchType uses the original `messageText` (preserves case for regex groups).

---

## Real-Time Delivery (Socket.IO)

Every message the chatbot sends (template response, menu, form prompt, system
notification) is emitted via Socket.IO immediately after being saved to MongoDB.

```
ChatMessage.save()
     │
     ▼
getChatMessagesNamespace()
  └─► emitNewMessage(ns, conversationId, { ...message, deliveryStatus: 'sent' })
         └─► All sockets in room conversationId receive the message live

getChatListNamespace()
  └─► emitChatUnreadChanged(ns, participantId, { conversationId, count: -1 })
  └─► emitConversationUpdated(ns, participantId, { lastMessageText, lastMessageAt, … })
         └─► Chat list sidebar updates instantly for all participants
```

---

## CRUD API Summary

All management operations are handled by [`chatbot.service.ts`](./chatbot.service.ts).
Every operation validates that the requesting `userId` owns the chatbot
(`checkChatbotOwner`).

| Resource | Operations |
|---|---|
| **Chatbot** | create, list (paginated, filterable by type/isActive/name), getById, update, delete (cascades all sub-resources) |
| **Keyword** | add, list (filterable by isActive/matchType), update, delete |
| **Template** | create, list (filterable by status), getById, update, delete |
| **Variable** | add, list, update, delete |
| **Flow Step** | create, list (sorted by order), update, delete |
| **Menu** | create, list, getById, update, delete |
| **Form Field** | add, list (sorted by order), update, delete |

`listChatbots` returns enriched objects including:
- `keywordCount` — number of keywords
- `templateCount` — number of templates
- `flowStepCount` — number of flow steps
- `menuCount` — number of menus
- `formFieldCount` — number of form fields

---

## Seed Data

The database seed script at `server/src/seed.ts` calls `seedChatbots()` which
populates sample bots for the developer account (`sudhi@developer.com`).
The constant data objects (bots, templates, keywords, forms, flows) are fully extracted into a data factory function at `server/src/db/seedData/chatbots.data.ts`, while the execution and iteration logic remains clean inside `server/src/db/seed/chatbots.ts`.

To re-seed:

```bash
cd server
npm run seed
```

> ⚠️ The seed script **drops and recreates** the chatbot collections each run.
> Do not run it against a production database.

---

*Last updated: June 2026 — CineNexus Chatbot Engine v1.0*
