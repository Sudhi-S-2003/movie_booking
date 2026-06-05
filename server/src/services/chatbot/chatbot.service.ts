import { Chatbot } from '../../models/chatbot.model.js';
import { ChatbotKeyword } from '../../models/chatbotKeyword.model.js';
import { ChatbotTemplate } from '../../models/chatbotTemplate.model.js';
import { ChatbotVariable } from '../../models/chatbotVariable.model.js';
import { ChatbotFlow } from '../../models/chatbotFlow.model.js';
import { ChatbotMenu } from '../../models/chatbotMenu.model.js';
import { ChatbotFormField } from '../../models/chatbotFormField.model.js';
import ApiError from '../error/ApiError.js';

// Helper to check chatbot ownership
async function checkChatbotOwner(chatbotId: string, userId: string) {
  const chatbot = await Chatbot.findById(chatbotId);
  if (!chatbot) {
    throw new ApiError(404, 'Chatbot not found', 'NOT_FOUND');
  }
  if (chatbot.userId.toString() !== userId) {
    throw new ApiError(403, 'You do not have access to this chatbot', 'FORBIDDEN');
  }
  return chatbot;
}

// Chatbot CRUD
export async function createChatbot(userId: string, data: any) {
  const chatbot = new Chatbot({
    ...data,
    userId,
  });
  return await chatbot.save();
}

export async function listChatbots(
  userId: string,
  query: { type?: string; isActive?: boolean; q?: string; page?: number; limit?: number },
) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 10);
  const skip = (page - 1) * limit;

  const filter: any = { userId };
  if (query.type) {
    filter.type = query.type;
  }
  if (query.isActive !== undefined) {
    filter.isActive = String(query.isActive) === 'true';
  }
  if (query.q) {
    filter.name = { $regex: query.q, $options: 'i' };
  }

  const total = await Chatbot.countDocuments(filter);
  const chatbotsRaw = await Chatbot.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Compute counts for each chatbot
  const chatbots = await Promise.all(
    chatbotsRaw.map(async (bot) => {
      const botId = bot._id;
      const [
        keywordCount,
        templateCount,
        flowStepCount,
        menuCount,
        formFieldCount,
      ] = await Promise.all([
        ChatbotKeyword.countDocuments({ chatbotId: botId }),
        ChatbotTemplate.countDocuments({ chatbotId: botId }),
        ChatbotFlow.countDocuments({ chatbotId: botId }),
        ChatbotMenu.countDocuments({ chatbotId: botId }),
        ChatbotFormField.countDocuments({ chatbotId: botId }),
      ]);

      const botObj = bot.toJSON();
      return {
        ...botObj,
        keywordCount,
        templateCount,
        flowStepCount,
        menuCount,
        formFieldCount,
      };
    }),
  );

  return {
    chatbots,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getChatbotById(id: string, userId: string) {
  return await checkChatbotOwner(id, userId);
}

export async function updateChatbot(id: string, userId: string, data: any) {
  await checkChatbotOwner(id, userId);
  const chatbot = await Chatbot.findByIdAndUpdate(id, data, { returnDocument: 'after' });
  if (!chatbot) {
    throw new ApiError(404, 'Chatbot not found', 'NOT_FOUND');
  }
  return chatbot;
}

export async function deleteChatbot(id: string, userId: string) {
  await checkChatbotOwner(id, userId);

  await Promise.all([
    ChatbotTemplate.deleteMany({ chatbotId: id }),
    ChatbotKeyword.deleteMany({ chatbotId: id }),
    ChatbotVariable.deleteMany({ chatbotId: id }),
    ChatbotFlow.deleteMany({ chatbotId: id }),
    ChatbotMenu.deleteMany({ chatbotId: id }),
    ChatbotFormField.deleteMany({ chatbotId: id }),
    Chatbot.deleteOne({ _id: id }),
  ]);

  return { success: true };
}

// Keywords
export async function addKeyword(chatbotId: string, userId: string, data: any) {
  await checkChatbotOwner(chatbotId, userId);
  const keyword = new ChatbotKeyword({
    ...data,
    chatbotId,
  });
  return await keyword.save();
}

export async function listKeywords(
  chatbotId: string,
  userId: string,
  query: { sessionId?: string; isActive?: boolean; matchType?: string; q?: string },
) {
  await checkChatbotOwner(chatbotId, userId);

  const filter: any = { chatbotId };
  if (query.sessionId) {
    filter.sessionId = query.sessionId;
  }
  if (query.isActive !== undefined) {
    filter.isActive = String(query.isActive) === 'true';
  }
  if (query.matchType) {
    filter.matchType = query.matchType;
  }
  if (query.q) {
    filter.keyword = { $regex: query.q, $options: 'i' };
  }

  return await ChatbotKeyword.find(filter).sort({ priority: -1, createdAt: -1 });
}

export async function updateKeyword(chatbotId: string, kwId: string, userId: string, data: any) {
  await checkChatbotOwner(chatbotId, userId);
  const keyword = await ChatbotKeyword.findOneAndUpdate(
    { _id: kwId, chatbotId },
    data,
    { returnDocument: 'after' },
  );
  if (!keyword) {
    throw new ApiError(404, 'Keyword not found', 'NOT_FOUND');
  }
  return keyword;
}

export async function deleteKeyword(chatbotId: string, kwId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);
  const result = await ChatbotKeyword.deleteOne({ _id: kwId, chatbotId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, 'Keyword not found', 'NOT_FOUND');
  }
  return { success: true };
}

// Templates
export async function createTemplate(chatbotId: string, userId: string, data: any) {
  await checkChatbotOwner(chatbotId, userId);
  const template = new ChatbotTemplate({
    ...data,
    chatbotId,
  });
  return await template.save();
}

export async function listTemplates(chatbotId: string, userId: string, query: { status?: string, q?: string }) {
  await checkChatbotOwner(chatbotId, userId);

  const filter: any = { chatbotId };
  if (query.status) {
    filter.status = query.status;
  }
  if (query.q) {
    filter.name = { $regex: query.q, $options: 'i' };
  }

  return await ChatbotTemplate.find(filter).sort({ createdAt: -1 });
}

export async function getTemplateById(chatbotId: string, tplId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);
  const template = await ChatbotTemplate.findOne({ _id: tplId, chatbotId });
  if (!template) {
    throw new ApiError(404, 'Template not found', 'NOT_FOUND');
  }
  return template;
}

export async function updateTemplate(chatbotId: string, tplId: string, userId: string, data: any) {
  await checkChatbotOwner(chatbotId, userId);
  const template = await ChatbotTemplate.findOneAndUpdate(
    { _id: tplId, chatbotId },
    data,
    { returnDocument: 'after' },
  );
  if (!template) {
    throw new ApiError(404, 'Template not found', 'NOT_FOUND');
  }
  return template;
}

export async function deleteTemplate(chatbotId: string, tplId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);

  const result = await ChatbotTemplate.deleteOne({ _id: tplId, chatbotId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, 'Template not found', 'NOT_FOUND');
  }

  return { success: true };
}

// Variables
export async function addVariable(chatbotId: string, userId: string, data: any) {
  await checkChatbotOwner(chatbotId, userId);
  const variable = new ChatbotVariable({
    ...data,
    chatbotId,
  });
  return await variable.save();
}

export async function listVariables(chatbotId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);
  return await ChatbotVariable.find({ chatbotId }).sort({ name: 1 });
}

export async function updateVariable(
  chatbotId: string,
  varId: string,
  userId: string,
  data: any,
) {
  await checkChatbotOwner(chatbotId, userId);
  const variable = await ChatbotVariable.findOneAndUpdate(
    { _id: varId, chatbotId },
    data,
    { returnDocument: 'after' },
  );
  if (!variable) {
    throw new ApiError(404, 'Variable not found', 'NOT_FOUND');
  }
  return variable;
}

export async function deleteVariable(chatbotId: string, varId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);
  const result = await ChatbotVariable.deleteOne({ _id: varId, chatbotId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, 'Variable not found', 'NOT_FOUND');
  }
  return { success: true };
}

// Flows
export async function createFlowStep(chatbotId: string, userId: string, data: any) {
  await checkChatbotOwner(chatbotId, userId);
  const flowStep = new ChatbotFlow({
    ...data,
    chatbotId,
  });
  return await flowStep.save();
}

export async function listFlowSteps(chatbotId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);
  return await ChatbotFlow.find({ chatbotId }).sort({ order: 1 });
}

export async function updateFlowStep(
  chatbotId: string,
  stepId: string,
  userId: string,
  data: any,
) {
  await checkChatbotOwner(chatbotId, userId);
  const flowStep = await ChatbotFlow.findOneAndUpdate(
    { _id: stepId, chatbotId },
    data,
    { returnDocument: 'after' },
  );
  if (!flowStep) {
    throw new ApiError(404, 'Flow step not found', 'NOT_FOUND');
  }
  return flowStep;
}

export async function deleteFlowStep(chatbotId: string, stepId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);
  const result = await ChatbotFlow.deleteOne({ _id: stepId, chatbotId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, 'Flow step not found', 'NOT_FOUND');
  }
  return { success: true };
}

// Menus
export async function createMenu(chatbotId: string, userId: string, data: any) {
  await checkChatbotOwner(chatbotId, userId);
  const menu = new ChatbotMenu({
    ...data,
    chatbotId,
  });
  return await menu.save();
}

export async function listMenus(chatbotId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);
  return await ChatbotMenu.find({ chatbotId }).sort({ createdAt: -1 });
}

export async function getMenuById(chatbotId: string, menuId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);
  const menu = await ChatbotMenu.findOne({ _id: menuId, chatbotId });
  if (!menu) {
    throw new ApiError(404, 'Menu not found', 'NOT_FOUND');
  }
  return menu;
}

export async function updateMenu(chatbotId: string, menuId: string, userId: string, data: any) {
  await checkChatbotOwner(chatbotId, userId);
  const menu = await ChatbotMenu.findOneAndUpdate(
    { _id: menuId, chatbotId },
    data,
    { returnDocument: 'after' },
  );
  if (!menu) {
    throw new ApiError(404, 'Menu not found', 'NOT_FOUND');
  }
  return menu;
}

export async function deleteMenu(chatbotId: string, menuId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);
  const result = await ChatbotMenu.deleteOne({ _id: menuId, chatbotId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, 'Menu not found', 'NOT_FOUND');
  }
  return { success: true };
}

// Form Fields
export async function addFormField(chatbotId: string, userId: string, data: any) {
  await checkChatbotOwner(chatbotId, userId);
  const field = new ChatbotFormField({
    ...data,
    chatbotId,
  });
  return await field.save();
}

export async function listFormFields(chatbotId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);
  return await ChatbotFormField.find({ chatbotId }).sort({ order: 1 });
}

export async function updateFormField(
  chatbotId: string,
  fieldId: string,
  userId: string,
  data: any,
) {
  await checkChatbotOwner(chatbotId, userId);
  const field = await ChatbotFormField.findOneAndUpdate(
    { _id: fieldId, chatbotId },
    data,
    { returnDocument: 'after' },
  );
  if (!field) {
    throw new ApiError(404, 'Form field not found', 'NOT_FOUND');
  }
  return field;
}

export async function deleteFormField(chatbotId: string, fieldId: string, userId: string) {
  await checkChatbotOwner(chatbotId, userId);
  const result = await ChatbotFormField.deleteOne({ _id: fieldId, chatbotId });
  if (result.deletedCount === 0) {
    throw new ApiError(404, 'Form field not found', 'NOT_FOUND');
  }
  return { success: true };
}
