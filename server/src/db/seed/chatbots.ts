import { User } from '../../models/user.model.js';
import { Chatbot } from '../../models/chatbot.model.js';
import { ChatbotKeyword } from '../../models/chatbotKeyword.model.js';
import { ChatbotTemplate } from '../../models/chatbotTemplate.model.js';
import { ChatbotVariable } from '../../models/chatbotVariable.model.js';
import { ChatbotFlow } from '../../models/chatbotFlow.model.js';
import { ChatbotMenu } from '../../models/chatbotMenu.model.js';
import { ChatbotFormField } from '../../models/chatbotFormField.model.js';
import { log } from './helpers.js';
import { getChatbotSeedData } from '../seedData/chatbots.data.js';

export const seedChatbots = async () => {
  log('🤖', 'Seeding portfolio chatbots for sudhi@developer.com...');

  const user = await User.findOne({ email: 'sudhi@developer.com' });
  if (!user) {
    throw new Error('User sudhi@developer.com not found, cannot seed chatbots');
  }

  const userId = user._id;

  // Clear existing chatbots for this user to ensure clean seeding
  const existingBots = await Chatbot.find({ userId });
  for (const bot of existingBots) {
    const id = bot._id;
    await Promise.all([
      ChatbotTemplate.deleteMany({ chatbotId: id }),
      ChatbotKeyword.deleteMany({ chatbotId: id }),
      ChatbotVariable.deleteMany({ chatbotId: id }),
      ChatbotFlow.deleteMany({ chatbotId: id }),
      ChatbotMenu.deleteMany({ chatbotId: id }),
      ChatbotFormField.deleteMany({ chatbotId: id }),
    ]);
  }
  await Chatbot.deleteMany({ userId });

  // Get extracted seed data for this user
  const data = getChatbotSeedData(userId as any);

  // Insert base bots first
  await Chatbot.insertMany(data.bots);

  // Insert nested templates and config next
  await Promise.all([
    ChatbotTemplate.insertMany(data.templates),
    ChatbotKeyword.insertMany(data.keywords),
    ChatbotMenu.insertMany(data.menus),
    ChatbotFormField.insertMany(data.forms),
    ChatbotFlow.insertMany(data.flows),
  ]);

  log('✅', `${data.bots.length} portfolio chatbots seeded successfully.`);
};
