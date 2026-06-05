import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import * as chatbotController from '../controllers/chatbot.controller.js';

const router = Router();
router.use(isAuthenticated);

// Chatbots
router.post('/', chatbotController.createChatbot);
router.get('/', chatbotController.listChatbots);
router.get('/:id', chatbotController.getChatbot);
router.patch('/:id', chatbotController.updateChatbot);
router.delete('/:id', chatbotController.deleteChatbot);

// Keywords
router.post('/:id/keywords', chatbotController.addKeyword);
router.get('/:id/keywords', chatbotController.listKeywords);
router.patch('/:id/keywords/:kwId', chatbotController.updateKeyword);
router.delete('/:id/keywords/:kwId', chatbotController.deleteKeyword);

// Templates
router.post('/:id/templates', chatbotController.createTemplate);
router.get('/:id/templates', chatbotController.listTemplates);
router.get('/:id/templates/:tplId', chatbotController.getTemplate);
router.patch('/:id/templates/:tplId', chatbotController.updateTemplate);
router.delete('/:id/templates/:tplId', chatbotController.deleteTemplate);

// Variables
router.post('/:id/variables', chatbotController.addVariable);
router.get('/:id/variables', chatbotController.listVariables);
router.patch('/:id/variables/:vId', chatbotController.updateVariable);
router.delete('/:id/variables/:vId', chatbotController.deleteVariable);

// Flows
router.post('/:id/flows', chatbotController.createFlowStep);
router.get('/:id/flows', chatbotController.listFlowSteps);
router.patch('/:id/flows/:stepId', chatbotController.updateFlowStep);
router.delete('/:id/flows/:stepId', chatbotController.deleteFlowStep);

// Menus
router.post('/:id/menus', chatbotController.createMenu);
router.get('/:id/menus', chatbotController.listMenus);
router.get('/:id/menus/:menuId', chatbotController.getMenu);
router.patch('/:id/menus/:menuId', chatbotController.updateMenu);
router.delete('/:id/menus/:menuId', chatbotController.deleteMenu);

// Form Fields
router.post('/:id/form-fields', chatbotController.addFormField);
router.get('/:id/form-fields', chatbotController.listFormFields);
router.patch('/:id/form-fields/:fieldId', chatbotController.updateFormField);
router.delete('/:id/form-fields/:fieldId', chatbotController.deleteFormField);

export default router;
