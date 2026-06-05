import type { Request, Response, NextFunction } from 'express';
import { requireAuthUser } from '../interfaces/auth.interface.js';
import * as chatbotService from '../services/chatbot/chatbot.service.js';

// Chatbot CRUD
export const createChatbot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.createChatbot(user._id.toString(), req.body);
    res.status(201).json({ success: true, chatbot: result });
  } catch (err) {
    next(err);
  }
};

export const listChatbots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const { type, isActive, q, page, limit } = req.query;
    const queryParams: any = {};
    if (type) queryParams.type = type as string;
    if (isActive !== undefined) queryParams.isActive = isActive === 'true';
    if (q) queryParams.q = q as string;
    if (page) queryParams.page = Number(page);
    if (limit) queryParams.limit = Number(limit);

    const result = await chatbotService.listChatbots(user._id.toString(), queryParams);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getChatbot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const chatbot = await chatbotService.getChatbotById(req.params.id as string, user._id.toString());
    res.status(200).json({ success: true, chatbot });
  } catch (err) {
    next(err);
  }
};

export const updateChatbot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const chatbot = await chatbotService.updateChatbot(req.params.id as string, user._id.toString(), req.body);
    res.status(200).json({ success: true, chatbot });
  } catch (err) {
    next(err);
  }
};

export const deleteChatbot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    await chatbotService.deleteChatbot(req.params.id as string, user._id.toString());
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Keywords
export const addKeyword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.addKeyword(req.params.id as string, user._id.toString(), req.body);
    res.status(201).json({ success: true, keyword: result });
  } catch (err) {
    next(err);
  }
};

export const listKeywords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const { sessionId, isActive, matchType, q } = req.query;
    const queryParams: any = {};
    if (sessionId) queryParams.sessionId = sessionId as string;
    if (isActive !== undefined) queryParams.isActive = isActive === 'true';
    if (matchType) queryParams.matchType = matchType as string;
    if (q) queryParams.q = q as string;

    const keywords = await chatbotService.listKeywords(req.params.id as string, user._id.toString(), queryParams);
    res.status(200).json({ success: true, keywords });
  } catch (err) {
    next(err);
  }
};

export const updateKeyword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.updateKeyword(
      req.params.id as string,
      req.params.kwId as string,
      user._id.toString(),
      req.body,
    );
    res.status(200).json({ success: true, keyword: result });
  } catch (err) {
    next(err);
  }
};

export const deleteKeyword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    await chatbotService.deleteKeyword(req.params.id as string, req.params.kwId as string, user._id.toString());
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Templates
export const createTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.createTemplate(req.params.id as string, user._id.toString(), req.body);
    res.status(201).json({ success: true, template: result });
  } catch (err) {
    next(err);
  }
};

export const listTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const { status, q } = req.query;
    const templates = await chatbotService.listTemplates(req.params.id as string, user._id.toString(), {
      status: status as string,
      q: q as string,
    });
    res.status(200).json({ success: true, templates });
  } catch (err) {
    next(err);
  }
};

export const getTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const template = await chatbotService.getTemplateById(
      req.params.id as string,
      req.params.tplId as string,
      user._id.toString(),
    );
    res.status(200).json({ success: true, template });
  } catch (err) {
    next(err);
  }
};

export const updateTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.updateTemplate(
      req.params.id as string,
      req.params.tplId as string,
      user._id.toString(),
      req.body,
    );
    res.status(200).json({ success: true, template: result });
  } catch (err) {
    next(err);
  }
};

export const deleteTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    await chatbotService.deleteTemplate(req.params.id as string, req.params.tplId as string, user._id.toString());
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Variables
export const addVariable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.addVariable(req.params.id as string, user._id.toString(), req.body);
    res.status(201).json({ success: true, variable: result });
  } catch (err) {
    next(err);
  }
};

export const listVariables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const variables = await chatbotService.listVariables(req.params.id as string, user._id.toString());
    res.status(200).json({ success: true, variables });
  } catch (err) {
    next(err);
  }
};

export const updateVariable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.updateVariable(
      req.params.id as string,
      req.params.vId as string,
      user._id.toString(),
      req.body,
    );
    res.status(200).json({ success: true, variable: result });
  } catch (err) {
    next(err);
  }
};

export const deleteVariable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    await chatbotService.deleteVariable(req.params.id as string, req.params.vId as string, user._id.toString());
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Flows
export const createFlowStep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.createFlowStep(req.params.id as string, user._id.toString(), req.body);
    res.status(201).json({ success: true, flowStep: result });
  } catch (err) {
    next(err);
  }
};

export const listFlowSteps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const flowSteps = await chatbotService.listFlowSteps(req.params.id as string, user._id.toString());
    res.status(200).json({ success: true, flowSteps });
  } catch (err) {
    next(err);
  }
};

export const updateFlowStep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.updateFlowStep(
      req.params.id as string,
      req.params.stepId as string,
      user._id.toString(),
      req.body,
    );
    res.status(200).json({ success: true, flowStep: result });
  } catch (err) {
    next(err);
  }
};

export const deleteFlowStep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    await chatbotService.deleteFlowStep(req.params.id as string, req.params.stepId as string, user._id.toString());
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Menus
export const createMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.createMenu(req.params.id as string, user._id.toString(), req.body);
    res.status(201).json({ success: true, menu: result });
  } catch (err) {
    next(err);
  }
};

export const listMenus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const menus = await chatbotService.listMenus(req.params.id as string, user._id.toString());
    res.status(200).json({ success: true, menus });
  } catch (err) {
    next(err);
  }
};

export const getMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const menu = await chatbotService.getMenuById(req.params.id as string, req.params.menuId as string, user._id.toString());
    res.status(200).json({ success: true, menu });
  } catch (err) {
    next(err);
  }
};

export const updateMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.updateMenu(
      req.params.id as string,
      req.params.menuId as string,
      user._id.toString(),
      req.body,
    );
    res.status(200).json({ success: true, menu: result });
  } catch (err) {
    next(err);
  }
};

export const deleteMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    await chatbotService.deleteMenu(req.params.id as string, req.params.menuId as string, user._id.toString());
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Form Fields
export const addFormField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.addFormField(req.params.id as string, user._id.toString(), req.body);
    res.status(201).json({ success: true, formField: result });
  } catch (err) {
    next(err);
  }
};

export const listFormFields = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const formFields = await chatbotService.listFormFields(req.params.id as string, user._id.toString());
    res.status(200).json({ success: true, formFields });
  } catch (err) {
    next(err);
  }
};

export const updateFormField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    const result = await chatbotService.updateFormField(
      req.params.id as string,
      req.params.fieldId as string,
      user._id.toString(),
      req.body,
    );
    res.status(200).json({ success: true, formField: result });
  } catch (err) {
    next(err);
  }
};

export const deleteFormField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = requireAuthUser(req);
    await chatbotService.deleteFormField(
      req.params.id as string,
      req.params.fieldId as string,
      user._id.toString(),
    );
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};
