import mongoose from 'mongoose';

export const getChatbotSeedData = (userId: mongoose.Types.ObjectId) => {
  // -------------------------------------------------------------
  // BOT 1: Welcome & Greetings Bot
  // -------------------------------------------------------------
  const welcomeBotId = new mongoose.Types.ObjectId();
  const greetTemplateId = new mongoose.Types.ObjectId();

  const welcomeBot = {
    _id: welcomeBotId,
    name: 'Welcome & Greetings Bot',
    description: 'Greets visitors and acts as a central directory to guide users to other bots.',
    userId,
    type: 'keyword-only',
    isActive: true,
    language: 'en',
    avatarUrl: 'https://images.unsplash.com/photo-1549082900-972300b9356a?w=150',
  };

  const greetTemplate = {
    _id: greetTemplateId,
    chatbotId: welcomeBotId,
    name: 'Welcome Greetings & Help Index',
    status: 'published',
    language: 'en',
    description: 'Central help index listing all available trigger words.',
    headers: [
      { type: 'text', key: 'title', value: "👋 Welcome to Sudhi S's Workspace!", order: 0 },
      { type: 'text', key: 'subtitle', value: "Your personal AI guide", order: 1 }
    ],
    bodies: [
      { key: 'greeting', value: "Hello! I am Sudhi's Greetings Assistant.", order: 0 },
      {
        key: 'main_content',
        value: "I can help you discover and talk to different interactive virtual agents running in this chat system.\n\nType any of the trigger words below to activate a bot:\n\n• 📋 \"portfolio\" or \"menu\" -> Professional Hub (Bio, Skills, Projects, Links)\n• 📝 \"hire\" or \"quote\" -> Submit an RFP / Hire Inquiry Form\n• 🔄 \"learn\" or \"design\" -> Technical System Design Q&A Flow\n• 🧠 \"quiz\" or \"test\" -> Play a Full-Stack Tech Trivia Game!\n• 🔑 \"otp\" -> Test OTP generation",
        order: 1
      }
    ],
    footers: [
      { key: 'help_info', value: 'Type "help" anytime to see this menu again.', order: 0 }
    ]
  };

  const greetKeywords = ['hi', 'hello', 'hey', 'greet', 'welcome', 'start', 'greetings', 'help'].map(kw => ({
    chatbotId: welcomeBotId,
    keyword: kw,
    matchType: 'contains',
    priority: 10,
    sessionId: 'global',
    templateId: greetTemplateId,
    isActive: true,
  }));

  // -------------------------------------------------------------
  // BOT 2: Professional Hub Bot
  // -------------------------------------------------------------
  const hubBotId = new mongoose.Types.ObjectId();
  const hubMainTemplateId = new mongoose.Types.ObjectId();
  const servicesTemplateId = new mongoose.Types.ObjectId();
  const recruiterTemplateId = new mongoose.Types.ObjectId();
  const linksTemplateId = new mongoose.Types.ObjectId();
  const ecommerceTplId = new mongoose.Types.ObjectId();
  const nutrifyTplId = new mongoose.Types.ObjectId();
  const chatTplId = new mongoose.Types.ObjectId();
  const projectsMenuId = new mongoose.Types.ObjectId();
  const mainMenuId = new mongoose.Types.ObjectId();
  const hubKeywordTemplateId = new mongoose.Types.ObjectId();

  const hubBot = {
    _id: hubBotId,
    name: "Sudhi's Portfolio Bot",
    description: "Interactive professional assistant explaining Sudhi's freelance services, career experience, and projects.",
    userId,
    type: 'menu',
    isActive: true,
    language: 'en',
    avatarUrl: 'https://avatars.githubusercontent.com/u/104332822?v=4',
    welcomeTemplateId: hubMainTemplateId,
    fallbackTemplateId: hubMainTemplateId,
  };

  const hubTemplates = [
    {
      _id: hubMainTemplateId,
      chatbotId: hubBotId,
      name: 'Hub Main Welcome',
      status: 'published',
      language: 'en',
      description: 'Welcome card showing choices to explore.',
      headers: [{ type: 'text', key: 'title', value: "💼 Sudhi's Main Menu", order: 0 }],
      bodies: [{ key: 'main_content', value: 'Type "portfolio" anytime to return here.', order: 0 }]
    },
    {
      _id: servicesTemplateId,
      chatbotId: hubBotId,
      name: 'Freelance Services Details',
      status: 'published',
      language: 'en',
      headers: [
        { type: 'image', key: 'media_image', value: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500', order: 0 },
        { type: 'text', key: 'title', value: "💼 Sudhi's Freelance & Consulting Services", order: 1 }
      ],
      bodies: [{ key: 'main_content', value: "• 🌐 Full Stack MERN Development:\nEnd-to-end web apps, custom SaaS dashboards, responsive layouts, secure JWT/2FA, and DB setups (React, Node, Express, MongoDB, PostgreSQL, Prisma ORM).\n\n• 🎨 Premium Frontend Engineering:\nPixel-perfect responsive mockups, advanced animations, dynamic charts, Redux/Zustand state architecture, and client caching (Framer Motion, Tailwind, TanStack Query).\n\n• ⚙️ Distributed Backend & API Design:\nHigh-throughput RESTful APIs, microservices integration, performance tuning, Redis caches, and RabbitMQ/BullMQ background message processing.", order: 0 }],
      footers: [{ key: 'branding', value: 'Powered by Sudhi Dev', order: 0 }]
    },
    {
      _id: recruiterTemplateId,
      chatbotId: hubBotId,
      name: 'Recruiter career overview',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: '🏢 Resume & Career Summary', order: 0 }],
      bodies: [{ key: 'main_content', value: "👨‍💻 Sudhi S | Full Stack Developer | Kochi, Kerala, India\n\n• Junior Software Developer @ Oxium Technologies (Jan 2024 - Present):\nEngineering microservices for India's ONDC digital commerce buyer/merchant platforms. Optimized app performance reducing page load times by 40% through refined state configurations.\n\n• MERN Stack Intern @ Avodha Technologies (Sep 2023 - Dec 2023):\nDeveloped responsive client applications, REST APIs, and authentication modules.\n\n• Education: BSc Computer Science — University of Kerala, UIT Pirappancode.", order: 0 }]
    },
    {
      _id: linksTemplateId,
      chatbotId: hubBotId,
      name: 'Social Links & Contact Connect',
      status: 'published',
      language: 'en',
      headers: [
        { type: 'text', key: 'title', value: '🔗 Connect with Sudhi', order: 0 },
        { type: 'text', key: 'announcement', value: 'Available for freelance opportunities!', order: 1 }
      ],
      bodies: [{ key: 'main_content', value: '• GitHub: https://github.com/Sudhi-S-2003\n• LinkedIn: https://www.linkedin.com/in/sudhi-s-a2a4ab30b\n• Portfolio: https://sudhis.netlify.app/\n• Email: sudhi@developer.com\n\n⭐ Check out my GitHub repositories and feel free to connect!', order: 0 }]
    },
    {
      _id: ecommerceTplId,
      chatbotId: hubBotId,
      name: 'E-Commerce Project Details',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: '🛒 Microservices E-Commerce Platform', order: 0 }],
      bodies: [{ key: 'main_content', value: 'An asynchronous e-commerce platform built using Node/Express microservices. Integrates RabbitMQ for cross-service events, BullMQ for task delegation, Redis for quick database caching, and supports campaigns and merchant inventories.', order: 0 }]
    },
    {
      _id: nutrifyTplId,
      chatbotId: hubBotId,
      name: 'Nutrify Project Details',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: '🥗 Nutrify Food Tracker', order: 0 }],
      bodies: [{ key: 'main_content', value: 'A nutritional diary platform serving 200+ users. Features frontend caching via TanStack Query and Redis query caching to retrieve food profiles 70% faster across 10,000+ items.', order: 0 }]
    },
    {
      _id: chatTplId,
      chatbotId: hubBotId,
      name: 'Chat Project Details',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: '💬 Real-Time Chat & MCP Ecosystem', order: 0 }],
      bodies: [{ key: 'main_content', value: 'A local messaging tool utilizing Docker environments, Redux layouts, and a custom MCP server allowing AI subagents to execute local tasks safely.', order: 0 }]
    },
    {
      _id: hubKeywordTemplateId,
      chatbotId: hubBotId,
      name: 'Hub Keyword Trigger Handler',
      status: 'published',
      language: 'en',
      description: 'Triggers when user asks for menu.',
      headers: [{ type: 'text', key: 'title', value: 'Loading Portfolio Hub...', order: 0 }],
    }
  ];

  const hubMenus = [
    {
      _id: projectsMenuId,
      chatbotId: hubBotId,
      name: 'projects_menu',
      title: '🚀 Featured Project Architectures',
      body: 'Select a project to explore its design details:',
      footerText: 'Choose from options 1-4.',
      items: [
        { label: '🛒 Microservices E-Commerce', order: 1, actionType: 'template', templateId: ecommerceTplId },
        { label: '🥗 Nutrify Caching', order: 2, actionType: 'template', templateId: nutrifyTplId },
        { label: '💬 Real-Time Chat & MCP', order: 3, actionType: 'template', templateId: chatTplId },
        { label: '⬅️ Back to Main Menu', order: 4, actionType: 'template', templateId: hubMainTemplateId },
      ]
    },
    {
      _id: mainMenuId,
      chatbotId: hubBotId,
      name: 'main_menu',
      title: "👋 Welcome to Sudhi's Interactive Hub",
      body: "Please choose an option to learn more about Sudhi's credentials:",
      footerText: 'Type option label or number to route.',
      keywordId: null, // will update later
      items: [
        { label: '💼 Freelance Services', order: 1, actionType: 'template', templateId: servicesTemplateId },
        { label: '🏢 Career & Biography', order: 2, actionType: 'template', templateId: recruiterTemplateId },
        { label: '🚀 Key Projects', order: 3, actionType: 'menu', subMenuId: projectsMenuId },
        { label: '📞 Connect Links', order: 4, actionType: 'template', templateId: linksTemplateId },
      ]
    }
  ];

  const portfolioKeywordId = new mongoose.Types.ObjectId();
  const hubKeywords = ['portfolio', 'menu', 'services', 'developer'].map(kw => ({
    _id: kw === 'portfolio' ? portfolioKeywordId : new mongoose.Types.ObjectId(),
    chatbotId: hubBotId,
    keyword: kw,
    matchType: 'contains',
    priority: 8,
    sessionId: 'global',
    templateId: hubKeywordTemplateId,
    isActive: true,
  }));
  hubMenus[1]!.keywordId = portfolioKeywordId as any;

  // -------------------------------------------------------------
  // BOT 3: Service RFP & Contact Form Bot
  // -------------------------------------------------------------
  const formBotId = new mongoose.Types.ObjectId();
  const rfpSubmissionTplId = new mongoose.Types.ObjectId();
  const rfpTrigTplId = new mongoose.Types.ObjectId();

  const formBot = {
    _id: formBotId,
    name: 'Service RFP & Contact Bot',
    description: 'Collects client RFPs, recruiter inquiries, and visitor messages step-by-step.',
    userId,
    type: 'form',
    isActive: true,
    language: 'en',
    avatarUrl: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=150',
  };

  const formTemplates = [
    {
      _id: rfpSubmissionTplId,
      chatbotId: formBotId,
      name: 'RFP Submission Receipt',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: '📝 Inquiry Logged Successfully', order: 0 }],
      bodies: [{ key: 'main_content', value: 'Thank you, {{sender_name}}! We have logged your request.\n\n• Profile: {{user_type}}\n• Interested In: {{inquiry_interest}}\n• Contact Email: {{sender_email}}\n• Message Detail: {{sender_message}}\n\nSudhi will review this RFP and email you back shortly.', order: 0 }],
      footers: [{ key: 'disclaimer', value: 'This is an automated receipt.', order: 0 }]
    },
    {
      _id: rfpTrigTplId,
      chatbotId: formBotId,
      name: 'RFP Form Trigger Init',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: 'Starting Contact Form...', order: 0 }],
    }
  ];

  const formFields = [
    { chatbotId: formBotId, name: 'user_type', label: 'Are you a: (1) Client, (2) Recruiter, (3) Developer, (4) General Visitor?', fieldType: 'select', options: ['Client', 'Recruiter', 'Developer', 'Visitor'], required: true, order: 1 },
    { chatbotId: formBotId, name: 'sender_name', label: 'What is your name?', fieldType: 'text', required: true, order: 2 },
    { chatbotId: formBotId, name: 'sender_email', label: 'What is your email address?', fieldType: 'email', required: true, validationRegex: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', validationMessage: 'Invalid email format. Please specify a correct email (e.g. name@domain.com).', order: 3 },
    { chatbotId: formBotId, name: 'inquiry_interest', label: 'What service/option are you interested in: (1) MERN Stack, (2) Frontend, (3) Backend API, (4) Direct Job Offer, (5) Other?', fieldType: 'select', options: ['MERN Stack', 'Frontend', 'Backend', 'Job Offer', 'Other'], required: true, order: 4 },
    { chatbotId: formBotId, name: 'sender_message', label: 'Please enter details about your inquiry or message:', fieldType: 'text', required: true, submissionTemplateId: rfpSubmissionTplId, order: 5 },
  ];

  const formKeywords = ['hire', 'contact', 'quote', 'message'].map(kw => ({
    chatbotId: formBotId, keyword: kw, matchType: 'contains', priority: 9, sessionId: 'global', templateId: rfpTrigTplId, isActive: true,
  }));

  // -------------------------------------------------------------
  // BOT 4: System Design Q&A Bot
  // -------------------------------------------------------------
  const flowBotId = new mongoose.Types.ObjectId();
  const ondcTplId = new mongoose.Types.ObjectId();
  const queueTplId = new mongoose.Types.ObjectId();
  const qaIntroTplId = new mongoose.Types.ObjectId();
  const qaTriggerTplId = new mongoose.Types.ObjectId();
  
  const entryStepId = new mongoose.Types.ObjectId();
  const ondcStepId = new mongoose.Types.ObjectId();
  const queueStepId = new mongoose.Types.ObjectId();

  const flowBot = {
    _id: flowBotId,
    name: 'Architecture Q&A Bot',
    description: 'Answers developer and client queries about ONDC onboarding, RabbitMQ queues, and Redis designs.',
    userId,
    type: 'flow',
    isActive: true,
    language: 'en',
    avatarUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150',
  };

  const flowTemplates = [
    {
      _id: ondcTplId,
      chatbotId: flowBotId,
      name: 'ONDC Deep Dive Response',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: 'ONDC Catalog Onboarding Design', order: 0 }],
      bodies: [{ key: 'instructions', value: 'ONDC Merchant Integration Architecture:\n\n1. Merchant onboarding registers catalog schemas, validating product availability.\n2. Buyer-side caches active merchant lists for instant search queries.\n3. Maintains a 99.5% service level uptime.\n\nType "queue" to learn about microservices queues, or "exit" to complete.', order: 0 }]
    },
    {
      _id: queueTplId,
      chatbotId: flowBotId,
      name: 'Queue Deep Dive Response',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: 'Microservices Queue Design', order: 0 }],
      bodies: [{ key: 'instructions', value: 'Background Processing & Messages:\n\n1. Long-running user exports are pushed to BullMQ workers to run in background processes.\n2. Cross-service domain changes (checkout, payments) publish events on RabbitMQ exchanges.\n3. Type "ondc" to go back to ONDC details, or "exit" to complete.', order: 0 }]
    },
    {
      _id: qaIntroTplId,
      chatbotId: flowBotId,
      name: 'QA Intro Prompt Template',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: '🚀 Technical Architecture Deep Dive', order: 0 }],
      bodies: [{ key: 'main_content', value: 'Welcome to the system architecture explorer! Please choose a topic to learn about:\n\n• Type "ondc" -> ONDC Merchant Onboarding\n• Type "queue" -> RabbitMQ & BullMQ Microservices Queue Workflow', order: 0 }],
      nextFlowStepId: null,
    },
    {
      _id: qaTriggerTplId,
      chatbotId: flowBotId,
      name: 'QA Trigger Init',
      status: 'published',
      language: 'en',
      description: 'Triggers architecture flow.',
      headers: [{ type: 'text', key: 'title', value: 'Initializing Q&A System...', order: 0 }],
      nextFlowStepId: entryStepId,
    }
  ];

  const flowSteps = [
    { _id: entryStepId, chatbotId: flowBotId, stepName: 'Topic Select Prompt', templateId: qaIntroTplId, previousStep: { stepId: null, type: 'chatbot-trigger' }, order: 1 },
    { _id: ondcStepId, chatbotId: flowBotId, stepName: 'ONDC Node', templateId: ondcTplId, previousStep: { stepId: entryStepId, type: 'chatbot-flow' }, condition: 'ondc', order: 2 },
    { _id: queueStepId, chatbotId: flowBotId, stepName: 'Queue Node', templateId: queueTplId, previousStep: { stepId: entryStepId, type: 'chatbot-flow' }, condition: 'queue', order: 3 },
    { chatbotId: flowBotId, stepName: 'ONDC to Queue loop', templateId: queueTplId, previousStep: { stepId: ondcStepId, type: 'chatbot-flow' }, condition: 'queue', order: 4 },
    { chatbotId: flowBotId, stepName: 'Queue to ONDC loop', templateId: ondcTplId, previousStep: { stepId: queueStepId, type: 'chatbot-flow' }, condition: 'ondc', order: 5 },
  ];

  const flowKeywords = ['learn', 'qa', 'design', 'architecture', 'ondc'].map(kw => ({
    chatbotId: flowBotId, keyword: kw, matchType: 'contains', priority: 9, sessionId: 'global', templateId: qaTriggerTplId, isActive: true,
  }));

  // -------------------------------------------------------------
  // BOT 5: Tech Trivia Quiz Bot
  // -------------------------------------------------------------
  const quizBotId = new mongoose.Types.ObjectId();
  const q1TplId = new mongoose.Types.ObjectId();
  const q2TplId = new mongoose.Types.ObjectId();
  const scoreTplId = new mongoose.Types.ObjectId();
  const quizTriggerTplId = new mongoose.Types.ObjectId();

  const quizEntryId = new mongoose.Types.ObjectId();
  const quizStep2Id = new mongoose.Types.ObjectId();
  const quizEndId = new mongoose.Types.ObjectId();

  const quizBot = {
    _id: quizBotId,
    name: 'Tech Trivia Quiz Bot',
    description: 'Interactive multiple choice quiz testing React, message queues, and caching.',
    userId,
    type: 'flow',
    isActive: true,
    language: 'en',
    avatarUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=150',
  };

  const quizTemplates = [
    {
      _id: q1TplId,
      chatbotId: quizBotId,
      name: 'Question 1 React/Queues',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: '🧠 Tech Trivia — Question 1/2', order: 0 }],
      bodies: [{ key: 'main_content', value: 'What is the primary role of a message broker like RabbitMQ?\n\nType options:\n• (A) Client UI Caching\n• (B) Async Microservice Decoupling\n• (C) Relational database index updates', order: 0 }]
    },
    {
      _id: q2TplId,
      chatbotId: quizBotId,
      name: 'Question 2 Hooks',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: '🧠 Tech Trivia — Question 2/2', order: 0 }],
      bodies: [{ key: 'main_content', value: 'Which React hook is used to cache heavy computations?\n\nType options:\n• (A) useEffect\n• (B) useMemo\n• (C) useState', order: 0 }]
    },
    {
      _id: scoreTplId,
      chatbotId: quizBotId,
      name: 'Quiz Completion Score',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: '🏁 Game Completed!', order: 0 }],
      bodies: [{ key: 'main_content', value: 'Thank you for playing the quiz!\n\nType "start" to see how to talk to other chatbots, or type "portfolio" to connect with Sudhi S.', order: 0 }]
    },
    {
      _id: quizTriggerTplId,
      chatbotId: quizBotId,
      name: 'Quiz Trigger Init',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: 'Launching Tech Quiz...', order: 0 }],
      nextFlowStepId: quizEntryId,
    }
  ];

  const quizSteps = [
    { _id: quizEntryId, chatbotId: quizBotId, stepName: 'Quiz Welcome Prompt', templateId: q1TplId, previousStep: { stepId: null, type: 'chatbot-trigger' }, order: 1 },
    { _id: quizStep2Id, chatbotId: quizBotId, stepName: 'Question 2 Prompt Node', templateId: q2TplId, previousStep: { stepId: quizEntryId, type: 'chatbot-flow' }, order: 2 },
    { _id: quizEndId, chatbotId: quizBotId, stepName: 'Results Node', templateId: scoreTplId, previousStep: { stepId: quizStep2Id, type: 'chatbot-flow' }, order: 3 },
  ];

  const quizKeywords = ['quiz', 'trivia', 'game', 'test'].map(kw => ({
    chatbotId: quizBotId, keyword: kw, matchType: 'contains', priority: 9, sessionId: 'global', templateId: quizTriggerTplId, isActive: true,
  }));

  // -------------------------------------------------------------
  // BOT 6: Utilities & Tests Bot
  // -------------------------------------------------------------
  const utilBotId = new mongoose.Types.ObjectId();
  const otpTplId = new mongoose.Types.ObjectId();

  const utilBot = {
    _id: utilBotId,
    name: 'Utilities & Demo Bot',
    description: 'Showcases various template rendering types like OTP codes, error messages, etc.',
    userId,
    type: 'keyword-only',
    isActive: true,
    language: 'en',
    avatarUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150',
  };

  const utilTemplates = [
    {
      _id: otpTplId,
      chatbotId: utilBotId,
      name: 'OTP Demo',
      status: 'published',
      language: 'en',
      headers: [{ type: 'text', key: 'title', value: '🔒 Security Verification', order: 0 }],
      bodies: [
        { key: 'intro', value: 'Please use the following code to verify your identity:', order: 0 },
        { key: 'otp_code', value: '849201', order: 1 },
        { key: 'error_notice', value: 'Do not share this code with anyone. It expires in 5 minutes.', order: 2 }
      ],
      footers: [
        { key: 'help_info', value: 'If you did not request this, please ignore.', order: 0 },
        { key: 'terms_link', value: 'https://example.com/terms', order: 1 }
      ]
    }
  ];

  const utilKeywords = [
    { chatbotId: utilBotId, keyword: 'otp', matchType: 'exact', priority: 10, sessionId: 'global', templateId: otpTplId, isActive: true }
  ];

  return {
    bots: [welcomeBot, hubBot, formBot, flowBot, quizBot, utilBot],
    templates: [
      greetTemplate, ...hubTemplates, ...formTemplates, ...flowTemplates, ...quizTemplates, ...utilTemplates
    ],
    keywords: [
      ...greetKeywords, ...hubKeywords, ...formKeywords, ...flowKeywords, ...quizKeywords, ...utilKeywords
    ],
    menus: hubMenus,
    forms: formFields,
    flows: [...flowSteps, ...quizSteps]
  };
};
