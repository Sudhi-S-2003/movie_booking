import mongoose from 'mongoose';
import {
  STOP_VERBS,
  START_VERBS,
  BOT_SINGLE,
  BOT_MULTI,
  NEGATION_WORDS,
} from './chatbotControl.constants.js';
import { Chatbot } from '../../models/chatbot.model.js';
import { ChatbotKeyword, type IChatbotKeyword } from '../../models/chatbotKeyword.model.js';
import { ChatbotTemplate } from '../../models/chatbotTemplate.model.js';
import { ChatbotVariable } from '../../models/chatbotVariable.model.js';
import { ChatbotFlow } from '../../models/chatbotFlow.model.js';
import { ChatbotMenu } from '../../models/chatbotMenu.model.js';
import { ChatbotFormField } from '../../models/chatbotFormField.model.js';
import { ChatbotSession } from '../../models/chatbotSession.model.js';
import { Conversation, ChatMessage, ConversationParticipant } from '../../models/chat.model.js';
import { forEachParticipant } from '../chat/conversationParticipants.service.js';
import { getChatMessagesNamespace, getChatListNamespace } from '../../socket/index.js';
import { emitNewMessage } from '../../socket/channels/chat-messages.channel.js';
import { emitChatUnreadChanged, emitConversationUpdated } from '../../socket/channels/chat-list.channel.js';

/**
 * Compiles a text template by injecting variables.
 */
async function compileText(
  text: string,
  chatbotId: mongoose.Types.ObjectId,
  sessionData?: Map<string, string>,
  context: { senderName: string; chatbotName: string } = { senderName: '', chatbotName: '' },
): Promise<string> {
  let compiled = text;

  // 1. Context variables
  compiled = compiled.replace(/\{\{sender_name\}\}/g, context.senderName || '');
  compiled = compiled.replace(/\{\{chatbot_name\}\}/g, context.chatbotName || '');
  compiled = compiled.replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString());

  // 2. Session variables
  if (sessionData) {
    for (const [key, value] of sessionData.entries()) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      compiled = compiled.replace(regex, value || '');
    }
  }

  // 3. Chatbot default variables
  const defaultVars = await ChatbotVariable.find({ chatbotId });
  for (const v of defaultVars) {
    const regex = new RegExp(`\\{\\{${v.name}\\}\\}`, 'g');
    compiled = compiled.replace(regex, v.defaultValue || '');
  }

  return compiled;
}

/**
 * Sends a formatted menu as a plain-text message with numbered options.
 * Extracts repeated boilerplate from menu handling branches.
 */
async function sendMenuMessage(
  conversationId: string,
  chatbot: any,
  text: string,
): Promise<void> {
  const createdMsg = new ChatMessage({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    senderName: chatbot.name,
    senderAvatarUrl: chatbot.avatarUrl,
    contentType: 'text',
    text,
    isSystem: false,
  });
  await createdMsg.save();

  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessageId: createdMsg._id,
        lastMessageAt: createdMsg.createdAt,
        lastMessageText: text,
        lastMessageSender: chatbot.name,
      },
      $inc: { messageCount: 1 },
    },
  );

  const chatMsgNs = getChatMessagesNamespace();
  emitNewMessage(chatMsgNs, conversationId, {
    ...createdMsg.toObject(),
    deliveryStatus: 'sent',
  });
}

/**
 * Compiles menu options text for a given menu document.
 */
function compileMenuText(menu: { title: string; body?: string; footerText?: string; items: Array<{ order: number; label: string }> }): string {
  const items = (menu.items || []).slice().sort((a, b) => a.order - b.order);
  const optionsText  = items.map(i => `${i.order}. ${i.label}`).join('\n');
  const bodyPart     = menu.body       ? `\n${menu.body}`       : '';
  const footerPart   = menu.footerText ? `\n\n${menu.footerText}` : '';
  return `${menu.title}${bodyPart}\n\n${optionsText}${footerPart}`;
}

/**
 * Sends a response message from the chatbot into the conversation.
 */
async function sendChatbotResponse(
  conversationId: string,
  chatbot: any,
  templateId: mongoose.Types.ObjectId,
  sessionData?: Map<string, string>,
  context: { senderName: string; chatbotName: string } = { senderName: '', chatbotName: '' },
): Promise<void> {
  const template = await ChatbotTemplate.findById(templateId);
  if (!template) return;

  const headers = [];
  for (const h of template.headers || []) {
    headers.push({
      type: h.type,
      key: h.key,
      value: await compileText(h.value, chatbot._id, sessionData, context),
      order: h.order,
    });
  }

  const bodies = [];
  for (const b of template.bodies || []) {
    bodies.push({
      key: b.key,
      value: await compileText(b.value, chatbot._id, sessionData, context),
      order: b.order,
    });
  }

  const footers = [];
  for (const f of template.footers || []) {
    footers.push({
      key: f.key,
      value: await compileText(f.value, chatbot._id, sessionData, context),
      order: f.order,
    });
  }

  const textHeaders = headers.filter(h => h.type === 'text').map(h => h.value);
  const textBodies = bodies.map(b => b.value);
  const textFooters = footers.map(f => f.value);

  const headerText = textHeaders.join('\n');
  const bodyText = textBodies.join('\n');
  const footerText = textFooters.join('\n');

  const fullText = [headerText, bodyText, footerText].filter(Boolean).join('\n\n');
  const attachments = headers.filter(h => h.type !== 'text').map(h => h.value);

  const message = new ChatMessage({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    senderName: chatbot.name,
    senderAvatarUrl: chatbot.avatarUrl,
    contentType: 'chatbot_template',
    text: fullText || 'Template Message',
    attachments,
    isSystem: false,
    chatbotTemplate: {
      templateId: template._id as mongoose.Types.ObjectId,
      name: template.name,
      headers,
      bodies,
      footers,
    },
  });
  await message.save();

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return;

  const previewText = fullText || 'Media Attachment';
  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessageId: message._id,
        lastMessageAt: message.createdAt,
        lastMessageText: previewText,
        lastMessageSender: chatbot.name,
      },
      $inc: { messageCount: 1 },
    },
  );

  // Broadcast via socket
  const chatMsgNs = getChatMessagesNamespace();
  emitNewMessage(chatMsgNs, conversationId, {
    ...message.toObject(),
    deliveryStatus: 'sent',
  });

  const chatListNs = getChatListNamespace();
  const nextMessageCount = conversation.messageCount + 1;
  await forEachParticipant(conversationId, (pid) => {
    const pidStr = pid.toString();
    emitChatUnreadChanged(chatListNs, pidStr, {
      conversationId,
      count: -1,
    });

    emitConversationUpdated(chatListNs, pidStr, {
      conversationId,
      lastMessageAt: message.createdAt.toISOString(),
      lastMessageText: previewText,
      lastMessageSender: chatbot.name,
      messageCount: nextMessageCount,
    });
  });
}
async function sendSystemNotification(
  conversationId: string,
  text: string,
  botName: string,
  botAvatar: string,
): Promise<void> {
  const createdMsg = new ChatMessage({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    senderName: botName,
    senderAvatarUrl: botAvatar,
    contentType: 'text',
    text,
    isSystem: false,
  });
  await createdMsg.save();

  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessageId: createdMsg._id,
        lastMessageAt: createdMsg.createdAt,
        lastMessageText: text,
        lastMessageSender: botName,
      },
      $inc: { messageCount: 1 },
    },
  );

  const chatMsgNs = getChatMessagesNamespace();
  emitNewMessage(chatMsgNs, conversationId, {
    ...createdMsg.toObject(),
    deliveryStatus: 'sent',
  });
}

/**
 * Main trigger entrypoint.
 * Evaluates keywords and runs chatbot type state machines.
 */
export async function handleChatbotTrigger(
  conversationId: string,
  messageText: string,
  _senderId: string | null,
  senderName: string,
): Promise<void> {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.isActive) return;
  if (conversation.type !== 'direct' && conversation.type !== 'api') return;

  const lowerText = messageText.toLowerCase().trim();

  // Resolve bot identity for system notifications & trigger queries
  let botName = 'CineNexus Bot';
  let botAvatar = 'https://images.unsplash.com/photo-1549082900-972300b9356a?w=150';

  let ownerId = conversation.createdBy;
  if (conversation.type === 'direct' && _senderId) {
    const participants = await ConversationParticipant.find({ conversationId });
    const recipientPart = participants.find(p => p.userId.toString() !== _senderId.toString());
    if (recipientPart) {
      ownerId = recipientPart.userId;
    }
  }

  if (ownerId) {
    const activeChatbot = await Chatbot.findOne({ userId: ownerId, isActive: true });
    if (activeChatbot) {
      botName = activeChatbot.name;
      if (activeChatbot.avatarUrl) {
        botAvatar = activeChatbot.avatarUrl;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // BOT CONTROL COMMAND DETECTION — full symmetric refactor
  //
  // Design principles:
  //  1. Token-level matching — whole words only, no substring false-positives
  //  2. Verb + Target BOTH required — can't trigger on verb or target alone
  //  3. Negation-aware — "don't stop bot" / "please don't start chatbot" won't fire
  //  4. Mutual exclusivity — if both STOP and START verbs present, intent is ambiguous → neither fires
  //  5. Symmetric — DEACTIVATE and ACTIVATE are exact logical opposites
  //  6. Strict when disabled — shouldActivate cannot contain any deactivation signal
  //     and shouldDeactivate cannot contain any activation signal (true opposites)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Tokenise text: lowercase, strip punctuation, split into whole-word tokens.
   * e.g. "Don't stop!" → ["dont", "stop"]
   */
  const tokenise = (text: string): string[] =>
    text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);

  const msgTokens  = tokenise(lowerText);
  const msgNormed  = lowerText.replace(/[^\w\s]/g, ' '); // for multi-word phrase checks

  // ── Vocabulary imported from chatbotControl.constants.ts ──────────────────
  //   STOP_VERBS, START_VERBS, BOT_SINGLE, BOT_MULTI, NEGATION_WORDS

  // ── Signal extraction ───────────────────────────────────────────────────────

  /** True if the message contains a bot identifier */
  const hasBotTarget =
    [...BOT_SINGLE].some(w => msgTokens.includes(w)) ||
    BOT_MULTI.some(p => msgNormed.includes(p));

  /**
   * Check whether every occurrence of verbs from `verbSet` in `tokens`
   * is immediately preceded (within 2 tokens) by a negation word.
   * Returns true if at least one UN-negated verb from the set exists.
   */
  const hasEffectiveVerb = (verbSet: Set<string>): boolean => {
    for (let i = 0; i < msgTokens.length; i++) {
      if (!verbSet.has(msgTokens[i] ?? '')) continue;
      const pre1 = msgTokens[i - 1] ?? '';
      const pre2 = msgTokens[i - 2] ?? '';
      const isNegated = NEGATION_WORDS.has(pre1) || NEGATION_WORDS.has(pre2);
      if (!isNegated) return true; // found at least one non-negated verb
    }
    return false;
  };

  const effectiveStopVerb  = hasBotTarget && hasEffectiveVerb(STOP_VERBS);
  const effectiveStartVerb = hasBotTarget && hasEffectiveVerb(START_VERBS);

  // ── shouldDeactivate — strict opposite of shouldActivate ────────────────────
  //
  //  ✅ Requires:   bot target + un-negated STOP verb
  //  ❌ Excluded:   any un-negated START verb present (ambiguous intent)
  //
  //  Examples that fire:
  //    "stop bot"            → stop(✓) + bot(✓) + no start → ✅
  //    "please terminate chatbot" → terminate(✓) + chatbot(✓) → ✅
  //    "chatbot disable"     → disable(✓) + chatbot(✓) → ✅
  //    "pause the assistant" → pause(✓) + assistant(✓) → ✅
  //  Examples that DON'T fire:
  //    "don't stop the bot"  → stop negated by "don't" → ❌
  //    "I can't stop laughing" → no bot target → ❌
  //    "stop and start bot"  → both verbs = ambiguous → ❌
  //    "start bot"           → only START verb, no STOP → ❌

  const shouldDeactivate = effectiveStopVerb && !effectiveStartVerb;

  if (shouldDeactivate) {
    if (!conversation.chatbotDisabled) {
      await Conversation.updateOne({ _id: conversationId }, { $set: { chatbotDisabled: true } });
      await ChatbotSession.deleteOne({ sessionKey: conversationId });
      await sendSystemNotification(
        conversationId,
        `🤖 ${botName} has been deactivated. Send "start bot" or "activate bot" to turn me back on anytime.`,
        botName,
        botAvatar,
      );
    }
    return;
  }

  // ── shouldActivate — strict opposite of shouldDeactivate ───────────────────
  //
  //  ✅ Requires:   bot target + un-negated START verb
  //  ❌ Excluded:   any un-negated STOP verb present (ambiguous intent)
  //                (symmetric opposite of shouldDeactivate)
  //
  //  Examples that fire:
  //    "start bot"           → start(✓) + bot(✓) + no stop → ✅
  //    "please activate chatbot" → activate(✓) + chatbot(✓) → ✅
  //    "bot enable"          → enable(✓) + bot(✓) → ✅
  //    "resume the assistant" → resume(✓) + assistant(✓) → ✅
  //  Examples that DON'T fire:
  //    "don't start the bot" → start negated by "don't" → ❌
  //    "notification"        → no bot target, no verb → ❌
  //    "starting my day"     → no bot target → ❌
  //    "stop bot"            → only STOP verb, no START → ❌
  //    "stop and start bot"  → both verbs = ambiguous → ❌

  const shouldActivate = effectiveStartVerb && !effectiveStopVerb;

  if (shouldActivate) {
    await Conversation.updateOne({ _id: conversationId }, { $set: { chatbotDisabled: false } });
    await sendSystemNotification(
      conversationId,
      `🤖 ${botName} is now active! I'm ready to help. Send "stop bot" to deactivate me anytime.`,
      botName,
      botAvatar,
    );
    return;
  }

  // If chatbot is disabled, ignore all incoming messages
  if (conversation.chatbotDisabled) {
    return;
  }

  if (!ownerId) return;

  // 1. Check if there is an active session.
  //    Query ONLY on sessionKey — it has a unique index ({ chatbotId, sessionKey }).
  //    The old pattern `{ chatbotId: { $exists: true }, sessionKey }` bypassed the index
  //    and caused a full collection scan on every incoming message.
  let session = await ChatbotSession.findOne({ sessionKey: conversationId });

  if (session) {
    const chatbot = await Chatbot.findOne({ _id: session.chatbotId, isActive: true });
    if (!chatbot) {
      await ChatbotSession.deleteOne({ _id: session._id });
      return;
    }

    const context = { senderName, chatbotName: chatbot.name };

    // -------------------------------------------------------------
    // FLOW CHATBOT SESSION
    // -------------------------------------------------------------
    if (chatbot.type === 'flow' && session.currentStepId) {
      const nextSteps = await ChatbotFlow.find({
        chatbotId: chatbot._id,
        'previousStep.stepId': session.currentStepId,
      });

      let matchedStep = null;
      for (const step of nextSteps) {
        if (step.condition) {
          const regex = new RegExp(step.condition, 'i');
          if (regex.test(messageText)) {
            matchedStep = step;
            break;
          }
        } else {
          matchedStep = step; // default fallback if no condition
        }
      }

      if (matchedStep) {
        // Advance session step
        session.currentStepId = matchedStep._id as mongoose.Types.ObjectId;
        await session.save();

        await sendChatbotResponse(conversationId, chatbot, matchedStep.templateId, session.data, context);

        // Check if next step points to end (i.e. template has no nextFlowStepId)
        const template = await ChatbotTemplate.findById(matchedStep.templateId);
        if (!template || !template.nextFlowStepId) {
          await ChatbotSession.deleteOne({ _id: session._id });
        }
      } else {
        // Handle fallback if configured
        if (chatbot.fallbackTemplateId) {
          await sendChatbotResponse(conversationId, chatbot, chatbot.fallbackTemplateId, session.data, context);
        }
      }
      return;
    }

    // -------------------------------------------------------------
    // MENU CHATBOT SESSION
    // -------------------------------------------------------------
    if (chatbot.type === 'menu') {
      // Find current active menu ID from session data
      const activeMenuId = session.data.get('active_menu_id');
      if (!activeMenuId) {
        await ChatbotSession.deleteOne({ _id: session._id });
        return;
      }

      const menu = await ChatbotMenu.findById(activeMenuId);
      if (!menu) {
        await ChatbotSession.deleteOne({ _id: session._id });
        return;
      }

      // Sort items by order
      const menuItems = (menu.items || []).slice().sort((a, b) => a.order - b.order);

      // Match input to item label or option number (1-indexed order)
      let matchedItem = null;
      const cleanInput = messageText.trim().toLowerCase();
      for (const item of menuItems) {
        if (
          cleanInput === item.label.toLowerCase() ||
          cleanInput === String(item.order)
        ) {
          matchedItem = item;
          break;
        }
      }

      if (matchedItem) {
        if (matchedItem.actionType === 'template' && matchedItem.templateId) {
          await sendChatbotResponse(conversationId, chatbot, matchedItem.templateId, session.data, context);
          await ChatbotSession.deleteOne({ _id: session._id });
        } else if (matchedItem.actionType === 'flow' && matchedItem.flowStepId) {
          const step = await ChatbotFlow.findById(matchedItem.flowStepId);
          if (step) {
            session.currentStepId = step._id as mongoose.Types.ObjectId;
            await session.save();
            await sendChatbotResponse(conversationId, chatbot, step.templateId, session.data, context);
          } else {
            await ChatbotSession.deleteOne({ _id: session._id });
          }
        } else if (matchedItem.actionType === 'menu' && matchedItem.subMenuId) {
          const subMenu = await ChatbotMenu.findById(matchedItem.subMenuId);
          if (subMenu) {
            session.data.set('active_menu_id', String(subMenu._id));
            await session.save();
            await sendMenuMessage(conversationId, chatbot, compileMenuText(subMenu));
          } else {
            await ChatbotSession.deleteOne({ _id: session._id });
          }
        }
      } else {
        if (chatbot.fallbackTemplateId) {
          await sendChatbotResponse(conversationId, chatbot, chatbot.fallbackTemplateId, session.data, context);
        }
      }
      return;
    }

    // -------------------------------------------------------------
    // FORM CHATBOT SESSION
    // -------------------------------------------------------------
    if (chatbot.type === 'form') {
      const fields = await ChatbotFormField.find({ chatbotId: chatbot._id }).sort({ order: 1 });
      if (fields.length === 0) {
        await ChatbotSession.deleteOne({ _id: session._id });
        return;
      }

      // Find which field we are waiting response for
      let currentFieldIndex = -1;
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        if (field && !session.data.has(field.name)) {
          currentFieldIndex = i;
          break;
        }
      }

      if (currentFieldIndex === -1) {
        await ChatbotSession.deleteOne({ _id: session._id });
        return;
      }

      const currentField = fields[currentFieldIndex];
      if (!currentField) return;

      // Validate field input format
      let isValid = true;
      if (currentField.fieldType === 'email') {
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(messageText.trim());
      } else if (currentField.fieldType === 'number') {
        isValid = !isNaN(Number(messageText.trim()));
      } else if (currentField.validationRegex) {
        try {
          const regex = new RegExp(currentField.validationRegex);
          isValid = regex.test(messageText);
        } catch {
          isValid = false;
        }
      }

      if (!isValid) {
        // Send validation failed warning message
        const warningText = currentField.validationMessage || `Invalid value for ${currentField.label}. Please try again.`;
        const warningMsg = new ChatMessage({
          conversationId: new mongoose.Types.ObjectId(conversationId),
          senderName: chatbot.name,
          senderAvatarUrl: chatbot.avatarUrl,
          contentType: 'text',
          text: warningText,
          isSystem: false,
        });
        await warningMsg.save();

        await Conversation.updateOne(
          { _id: conversationId },
          {
            $set: {
              lastMessageId: warningMsg._id,
              lastMessageAt: warningMsg.createdAt,
              lastMessageText: warningText,
              lastMessageSender: chatbot.name,
            },
            $inc: { messageCount: 1 },
          },
        );

        const chatMsgNs = getChatMessagesNamespace();
        emitNewMessage(chatMsgNs, conversationId, {
          ...warningMsg.toObject(),
          deliveryStatus: 'sent',
        });
        return;
      }

      // Input is valid! Save it
      session.data.set(currentField.name, messageText.trim());
      await session.save();

      // Determine next field
      const nextFieldIndex = currentFieldIndex + 1;
      if (nextFieldIndex < fields.length) {
        const nextField = fields[nextFieldIndex];
        if (!nextField) return;
        const nextPromptText = nextField.label;

        const promptMsg = new ChatMessage({
          conversationId: new mongoose.Types.ObjectId(conversationId),
          senderName: chatbot.name,
          senderAvatarUrl: chatbot.avatarUrl,
          contentType: 'text',
          text: nextPromptText,
          isSystem: false,
        });
        await promptMsg.save();

        await Conversation.updateOne(
          { _id: conversationId },
          {
            $set: {
              lastMessageId: promptMsg._id,
              lastMessageAt: promptMsg.createdAt,
              lastMessageText: nextPromptText,
              lastMessageSender: chatbot.name,
            },
            $inc: { messageCount: 1 },
          },
        );

        const chatMsgNs = getChatMessagesNamespace();
        emitNewMessage(chatMsgNs, conversationId, {
          ...promptMsg.toObject(),
          deliveryStatus: 'sent',
        });
      } else {
        // Finalized all fields! Trigger submission response
        if (currentField.submissionTemplateId) {
          await sendChatbotResponse(conversationId, chatbot, currentField.submissionTemplateId, session.data, context);
        }
        await ChatbotSession.deleteOne({ _id: session._id });
      }
      return;
    }
  }

  // 2. Evaluate keywords if no active session
  const activeChatbots = await Chatbot.find({ userId: ownerId, isActive: true });
  if (activeChatbots.length === 0) return;

  const botIds = activeChatbots.map(b => b._id);
  const keywords = await ChatbotKeyword.find({ chatbotId: { $in: botIds }, isActive: true }).sort({ priority: -1 });

  let matchedKeyword: IChatbotKeyword | null = null;
  const cleanInput = messageText.trim().toLowerCase();

  for (const kw of keywords) {
    if (kw.matchType === 'exact') {
      if (cleanInput === kw.keyword) {
        matchedKeyword = kw;
        break;
      }
    } else if (kw.matchType === 'startsWith') {
      if (cleanInput.startsWith(kw.keyword)) {
        matchedKeyword = kw;
        break;
      }
    } else if (kw.matchType === 'contains') {
      if (cleanInput.includes(kw.keyword)) {
        matchedKeyword = kw;
        break;
      }
    } else if (kw.matchType === 'regex') {
      try {
        const regex = new RegExp(kw.keyword, 'i');
        if (regex.test(messageText)) {
          matchedKeyword = kw;
          break;
        }
      } catch (err) {
        console.error('Invalid keyword regex:', kw.keyword, err);
      }
    }
  }

  if (matchedKeyword) {
    const chatbot = activeChatbots.find(b => b._id.toString() === matchedKeyword!.chatbotId.toString())!;
    const context = { senderName, chatbotName: chatbot.name };

    // Initialize state depending on type
    if (chatbot.type === 'keyword-only') {
      await sendChatbotResponse(conversationId, chatbot, matchedKeyword.templateId, undefined, context);
    } else if (chatbot.type === 'flow') {
      // Find entry point step
      const entryStep = await ChatbotFlow.findOne({
        chatbotId: chatbot._id,
        templateId: matchedKeyword.templateId,
      });

      if (entryStep) {
        // Create new session
        session = new ChatbotSession({
          chatbotId: chatbot._id,
          sessionKey: conversationId,
          currentStepId: entryStep._id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
        });
        await session.save();

        await sendChatbotResponse(conversationId, chatbot, entryStep.templateId, session.data, context);
      } else {
        // Standard template trigger fallback
        await sendChatbotResponse(conversationId, chatbot, matchedKeyword.templateId, undefined, context);
      }
    } else if (chatbot.type === 'menu') {
      // Find menu linked to this keyword trigger
      const menu = await ChatbotMenu.findOne({ chatbotId: chatbot._id, keywordId: matchedKeyword._id });
      if (menu) {
        session = new ChatbotSession({
          chatbotId: chatbot._id,
          sessionKey: conversationId,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });
        session.data.set('active_menu_id', String(menu._id));
        await session.save();
        await sendMenuMessage(conversationId, chatbot, compileMenuText(menu));
      } else {
        await sendChatbotResponse(conversationId, chatbot, matchedKeyword.templateId, undefined, context);
      }
    } else if (chatbot.type === 'form') {
      const fields = await ChatbotFormField.find({ chatbotId: chatbot._id }).sort({ order: 1 });
      if (fields.length > 0) {
        session = new ChatbotSession({
          chatbotId: chatbot._id,
          sessionKey: conversationId,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });
        await session.save();

        // Send first form field prompt question
        const firstField = fields[0];
        if (!firstField) return;
        const promptText = firstField.label;

        const promptMsg = new ChatMessage({
          conversationId: new mongoose.Types.ObjectId(conversationId),
          senderName: chatbot.name,
          senderAvatarUrl: chatbot.avatarUrl,
          contentType: 'text',
          text: promptText,
          isSystem: false,
        });
        await promptMsg.save();

        await Conversation.updateOne(
          { _id: conversationId },
          {
            $set: {
              lastMessageId: promptMsg._id,
              lastMessageAt: promptMsg.createdAt,
              lastMessageText: promptText,
              lastMessageSender: chatbot.name,
            },
            $inc: { messageCount: 1 },
          },
        );

        const chatMsgNs = getChatMessagesNamespace();
        emitNewMessage(chatMsgNs, conversationId, {
          ...promptMsg.toObject(),
          deliveryStatus: 'sent',
        });
      }
    }
  }
}
