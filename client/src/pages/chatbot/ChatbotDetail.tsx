import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  RefreshCw,
  MessageSquare,
  Workflow,
  Menu as MenuIcon,
  Layout,
  Settings,
  Code,
  Tag,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileCode,
  Layers,
} from 'lucide-react';
import {
  chatbotApi,
  type Chatbot,
  type ChatbotKeyword,
  type ChatbotTemplate,
  type ChatbotVariable,
  type ChatbotFlow,
  type ChatbotMenu,
  type ChatbotFormField,
  type ChatbotMenuItem,
} from '../../services/api/chatbot.api.js';
import { toast } from '../../utils/toast.js';
import { clsx } from 'clsx';
import { HEADER_KEY_OPTIONS, BODY_KEY_OPTIONS, FOOTER_KEY_OPTIONS } from '../../constants/chatbot.constants.js';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi / हिन्दी' },
  { code: 'ta', name: 'Tamil / தமிழ்' },
  { code: 'te', name: 'Telugu / తెలుగు' },
  { code: 'ml', name: 'Malayalam / മലയാളം' },
  { code: 'kn', name: 'Kannada / ಕನ್ನಡ' },
  { code: 'es', name: 'Spanish / Español' },
  { code: 'fr', name: 'French / Français' },
  { code: 'de', name: 'German / Deutsch' },
  { code: 'ja', name: 'Japanese / 日本語' },
  { code: 'ko', name: 'Korean / 한국어' },
];

export const ChatbotDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Sub-resource lists
  const [variables, setVariables] = useState<ChatbotVariable[]>([]);
  const [keywords, setKeywords] = useState<ChatbotKeyword[]>([]);
  const [templates, setTemplates] = useState<ChatbotTemplate[]>([]);
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [menus, setMenus] = useState<ChatbotMenu[]>([]);
  const [formFields, setFormFields] = useState<ChatbotFormField[]>([]);

  // Expand states for templates and menus accordions
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // Template edit details (headers, bodies, footers)
  const [templateDetail, setTemplateDetail] = useState<ChatbotTemplate | null>(null);

  // Danger zone confirm
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (id) {
      fetchChatbotData();
    }
  }, [id]);

  const fetchChatbotData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await chatbotApi.getById(id);
      setChatbot(res.chatbot);

      // Parallel fetch of other lists
      const [varsRes, kwsRes, tplsRes] = await Promise.all([
        chatbotApi.listVariables(id),
        chatbotApi.listKeywords(id),
        chatbotApi.listTemplates(id),
      ]);
      setVariables(varsRes.variables || []);
      setKeywords(kwsRes.keywords || []);
      setTemplates(tplsRes.templates || []);

      if (res.chatbot.type === 'flow') {
        const flowsRes = await chatbotApi.listFlows(id);
        setFlows(flowsRes.flows || []);
      } else if (res.chatbot.type === 'menu') {
        const menusRes = await chatbotApi.listMenus(id);
        setMenus(menusRes.menus || []);
      } else if (res.chatbot.type === 'form') {
        const fieldsRes = await chatbotApi.listFormFields(id);
        setFormFields(fieldsRes.fields || []);
      }
    } catch (err) {
      console.error('Error fetching chatbot detail:', err);
      toast.error('Failed to load chatbot details');
      navigate('../chatbots');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChatbot = async () => {
    if (!id || !chatbot) return;
    try {
      await chatbotApi.remove(id);
      toast.success(`Chatbot ${chatbot.name} deleted successfully`);
      navigate('../chatbots');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete chatbot');
    }
  };

  // -------------------------------------------------------------
  // TAB CONTROLS
  // -------------------------------------------------------------
  const getTabs = () => {
    const defaultTabs = [
      { id: 'overview', label: 'Overview', icon: <Settings className="w-4 h-4" /> },
      { id: 'variables', label: 'Variables', icon: <Code className="w-4 h-4" /> },
      { id: 'keywords', label: 'Keywords', icon: <Tag className="w-4 h-4" /> },
      { id: 'templates', label: 'Templates', icon: <FileCode className="w-4 h-4" /> },
    ];

    if (chatbot?.type === 'flow') {
      defaultTabs.push({ id: 'flow-builder', label: 'Flow Builder', icon: <Workflow className="w-4 h-4" /> });
    } else if (chatbot?.type === 'menu') {
      defaultTabs.push({ id: 'menu-builder', label: 'Menu Builder', icon: <MenuIcon className="w-4 h-4" /> });
    } else if (chatbot?.type === 'form') {
      defaultTabs.push({ id: 'form-builder', label: 'Form Builder', icon: <Layout className="w-4 h-4" /> });
    }

    return defaultTabs;
  };

  // -------------------------------------------------------------
  // OVERVIEW TAB LOGIC
  // -------------------------------------------------------------
  const [overviewForm, setOverviewForm] = useState({
    name: '',
    description: '',
    language: 'en',
    avatarUrl: '',
    isActive: true,
    welcomeTemplateId: '',
    fallbackTemplateId: '',
  });

  useEffect(() => {
    if (chatbot) {
      setOverviewForm({
        name: chatbot.name,
        description: chatbot.description || '',
        language: chatbot.language,
        avatarUrl: chatbot.avatarUrl || '',
        isActive: chatbot.isActive,
        welcomeTemplateId: chatbot.welcomeTemplateId || '',
        fallbackTemplateId: chatbot.fallbackTemplateId || '',
      });
    }
  }, [chatbot]);

  const handleUpdateOverview = async () => {
    if (!id || !chatbot) return;
    try {
      const payload: Partial<Chatbot> = {
        name: overviewForm.name,
        description: overviewForm.description,
        language: overviewForm.language,
        avatarUrl: overviewForm.avatarUrl || undefined,
        isActive: overviewForm.isActive,
        welcomeTemplateId: overviewForm.welcomeTemplateId || null,
        fallbackTemplateId: overviewForm.fallbackTemplateId || null,
      };
      const res = await chatbotApi.update(id, payload);
      setChatbot(res.chatbot);
      toast.success('Overview details saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update chatbot');
    }
  };

  // -------------------------------------------------------------
  // VARIABLES TAB LOGIC
  // -------------------------------------------------------------
  const [newVarForm, setNewVarForm] = useState({
    name: '',
    description: '',
    defaultValue: '',
    required: false,
  });

  const handleAddVariable = async () => {
    if (!id) return;
    if (!newVarForm.name.trim()) {
      toast.error('Variable name is required');
      return;
    }
    try {
      const res = await chatbotApi.addVariable(id, newVarForm);
      setVariables(prev => [...prev, res.variable].sort((a, b) => a.name.localeCompare(b.name)));
      setNewVarForm({ name: '', description: '', defaultValue: '', required: false });
      toast.success('Variable added');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add variable');
    }
  };

  const handleDeleteVariable = async (vId: string) => {
    if (!id) return;
    try {
      await chatbotApi.deleteVariable(id, vId);
      setVariables(prev => prev.filter(v => v._id !== vId));
      toast.success('Variable deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete variable');
    }
  };

  // -------------------------------------------------------------
  // KEYWORDS TAB LOGIC
  // -------------------------------------------------------------
  const [newKwForm, setNewKwForm] = useState({
    keyword: '',
    matchType: 'contains' as 'exact' | 'contains' | 'startsWith' | 'regex',
    priority: 0,
    sessionId: 'default',
    templateId: '',
    isActive: true,
  });

  const handleAddKeyword = async () => {
    if (!id) return;
    if (!newKwForm.keyword.trim()) {
      toast.error('Keyword triggers are required');
      return;
    }
    if (!newKwForm.templateId) {
      toast.error('Please link a response template');
      return;
    }
    try {
      const res = await chatbotApi.addKeyword(id, newKwForm);
      setKeywords(prev => [...prev, res.keyword].sort((a, b) => b.priority - a.priority));
      setNewKwForm({
        keyword: '',
        matchType: 'contains',
        priority: 0,
        sessionId: 'default',
        templateId: '',
        isActive: true,
      });
      toast.success('Keyword trigger added');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to add keyword');
    }
  };

  const handleDeleteKeyword = async (kwId: string) => {
    if (!id) return;
    try {
      await chatbotApi.deleteKeyword(id, kwId);
      setKeywords(prev => prev.filter(k => k._id !== kwId));
      toast.success('Keyword trigger deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete keyword');
    }
  };

  // -------------------------------------------------------------
  // TEMPLATES ACCORDION LOGIC
  // -------------------------------------------------------------
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    description: '',
    language: 'en',
  });

  const handleCreateTemplate = async () => {
    if (!id) return;
    if (!newTemplateForm.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    try {
      const res = await chatbotApi.createTemplate(id, {
        ...newTemplateForm,
        headers: [],
        bodies: [],
        footers: [],
      });
      setTemplates(prev => [res.template, ...prev]);
      setNewTemplateForm({ name: '', description: '', language: 'en' });
      setExpandedTemplate(res.template._id);
      setTemplateDetail(res.template);
      toast.success('Template created');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create template');
    }
  };

  const handleToggleTemplateAccordion = async (tplId: string) => {
    if (expandedTemplate === tplId) {
      setExpandedTemplate(null);
      setTemplateDetail(null);
    } else {
      setExpandedTemplate(tplId);
      setTemplateDetail(null);
      ensureTemplateSectionState(tplId);
      if (!id) return;
      try {
        const res = await chatbotApi.getTemplate(id, tplId);
        setTemplateDetail(res.template);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load template data');
      }
    }
  };

  const handleDeleteTemplate = async (tplId: string) => {
    if (!id) return;
    try {
      await chatbotApi.deleteTemplate(id, tplId);
      setTemplates(prev => prev.filter(t => t._id !== tplId));
      if (expandedTemplate === tplId) {
        setExpandedTemplate(null);
        setTemplateDetail(null);
      }
      toast.success('Template deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete template');
    }
  };

  const handleUpdateTemplateGeneral = async (tplId: string, payload: Partial<ChatbotTemplate>) => {
    if (!id) return;
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, payload);
      setTemplates(prev => prev.map(t => (t._id === tplId ? res.template : t)));
      setTemplateDetail(prev => (prev ? { ...prev, ...payload } : null));
      toast.success('Template settings updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update template settings');
    }
  };

  // Template Sections row editors (Local arrays directly saved in Document)
  // Per-template isolated section-form state.
  // Using templateId as key prevents stale state bleeding between accordions.
  const [templateSectionState, setTemplateSectionState] = useState<
    Record<string, {
      selectedKeys: { header: string; body: string; footer: string };
      newForms: {
        header: { type: string; key: string; value: string; order: number };
        body:   { key: string; value: string; order: number };
        footer: { key: string; value: string; order: number };
      };
    }>
  >({});

  /** Initialise per-template state if not already present. */
  const ensureTemplateSectionState = (tplId: string) => {
    setTemplateSectionState(prev => {
      if (prev[tplId]) return prev;
      return {
        ...prev,
        [tplId]: {
          selectedKeys: { header: 'title', body: 'main_content', footer: 'disclaimer' },
          newForms: {
            header: { type: 'text', key: 'title', value: '', order: 0 },
            body:   { key: 'main_content', value: '', order: 0 },
            footer: { key: 'disclaimer', value: '', order: 0 },
          },
        },
      };
    });
  };

  const handleAddHeaderRow = async (tplId: string) => {
    if (!id || !templateDetail) return;
    ensureTemplateSectionState(tplId);
    const st = templateSectionState[tplId];
    if (!st) return;
    const { type, key, value, order } = st.newForms.header;
    if (!key.trim() || !value.trim()) {
      toast.error('Header Key and Value are required');
      return;
    }
    const newHeaders = [...(templateDetail.headers || []), { type, key, value, order }].sort((a, b) => a.order - b.order);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { headers: newHeaders });
      setTemplateDetail(res.template);
      setTemplateSectionState(prev => ({
        ...prev,
        [tplId]: {
          ...prev[tplId]!,
          selectedKeys: { ...prev[tplId]!.selectedKeys, header: 'title' },
          newForms: { ...prev[tplId]!.newForms, header: { type: 'text', key: 'title', value: '', order: 0 } },
        },
      }));
      toast.success('Header row added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add header row');
    }
  };

  const handleDeleteHeaderRow = async (tplId: string, idx: number) => {
    if (!id || !templateDetail) return;
    const newHeaders = (templateDetail.headers || []).filter((_, i) => i !== idx);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { headers: newHeaders });
      setTemplateDetail(res.template);
      toast.success('Header row deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete header row');
    }
  };

  const handleAddBodyRow = async (tplId: string) => {
    if (!id || !templateDetail) return;
    ensureTemplateSectionState(tplId);
    const st = templateSectionState[tplId];
    if (!st) return;
    const { key, value, order } = st.newForms.body;
    if (!key.trim() || !value.trim()) {
      toast.error('Body Key and Value are required');
      return;
    }
    const newBodies = [...(templateDetail.bodies || []), { key, value, order }].sort((a, b) => a.order - b.order);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { bodies: newBodies });
      setTemplateDetail(res.template);
      setTemplateSectionState(prev => ({
        ...prev,
        [tplId]: {
          ...prev[tplId]!,
          selectedKeys: { ...prev[tplId]!.selectedKeys, body: 'main_content' },
          newForms: { ...prev[tplId]!.newForms, body: { key: 'main_content', value: '', order: 0 } },
        },
      }));
      toast.success('Body row added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add body row');
    }
  };

  const handleDeleteBodyRow = async (tplId: string, idx: number) => {
    if (!id || !templateDetail) return;
    const newBodies = (templateDetail.bodies || []).filter((_, i) => i !== idx);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { bodies: newBodies });
      setTemplateDetail(res.template);
      toast.success('Body row deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete body row');
    }
  };

  const handleAddFooterRow = async (tplId: string) => {
    if (!id || !templateDetail) return;
    ensureTemplateSectionState(tplId);
    const st = templateSectionState[tplId];
    if (!st) return;
    const { key, value, order } = st.newForms.footer;
    if (!key.trim() || !value.trim()) {
      toast.error('Footer Key and Value are required');
      return;
    }
    const newFooters = [...(templateDetail.footers || []), { key, value, order }].sort((a, b) => a.order - b.order);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { footers: newFooters });
      setTemplateDetail(res.template);
      setTemplateSectionState(prev => ({
        ...prev,
        [tplId]: {
          ...prev[tplId]!,
          selectedKeys: { ...prev[tplId]!.selectedKeys, footer: 'disclaimer' },
          newForms: { ...prev[tplId]!.newForms, footer: { key: 'disclaimer', value: '', order: 0 } },
        },
      }));
      toast.success('Footer row added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add footer row');
    }
  };

  const handleDeleteFooterRow = async (tplId: string, idx: number) => {
    if (!id || !templateDetail) return;
    const newFooters = (templateDetail.footers || []).filter((_, i) => i !== idx);
    try {
      const res = await chatbotApi.updateTemplate(id, tplId, { footers: newFooters });
      setTemplateDetail(res.template);
      toast.success('Footer row deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete footer row');
    }
  };

  // -------------------------------------------------------------
  // FLOW BUILDER TAB LOGIC
  // -------------------------------------------------------------
  const [newFlowForm, setNewFlowForm] = useState({
    stepName: '',
    description: '',
    templateId: '',
    previousStepId: '',
    previousStepType: 'chatbot-trigger' as 'chatbot-trigger' | 'chatbot-flow',
    condition: '',
    order: 0,
  });

  const handleAddFlowStep = async () => {
    if (!id) return;
    if (!newFlowForm.stepName.trim()) {
      toast.error('Step name is required');
      return;
    }
    if (!newFlowForm.templateId) {
      toast.error('Linking response template is required');
      return;
    }
    try {
      const payload: Partial<ChatbotFlow> = {
        stepName: newFlowForm.stepName,
        description: newFlowForm.description,
        templateId: newFlowForm.templateId,
        previousStep: {
          stepId: newFlowForm.previousStepId || null,
          type: newFlowForm.previousStepType,
        },
        condition: newFlowForm.condition || undefined,
        order: newFlowForm.order,
      };
      const res = await chatbotApi.createFlow(id, payload);
      setFlows(prev => [...prev, res.flow].sort((a, b) => a.order - b.order));
      setNewFlowForm({
        stepName: '',
        description: '',
        templateId: '',
        previousStepId: '',
        previousStepType: 'chatbot-trigger',
        condition: '',
        order: 0,
      });
      toast.success('Flow step created');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create flow step');
    }
  };

  const handleDeleteFlowStep = async (stepId: string) => {
    if (!id) return;
    try {
      await chatbotApi.deleteFlow(id, stepId);
      setFlows(prev => prev.filter(f => f._id !== stepId));
      toast.success('Flow step deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete flow step');
    }
  };

  // -------------------------------------------------------------
  // MENU BUILDER TAB LOGIC
  // -------------------------------------------------------------
  const [newMenuForm, setNewMenuForm] = useState({
    name: '',
    title: '',
    body: '',
    footerText: '',
    keywordId: '',
  });

  const handleCreateMenu = async () => {
    if (!id) return;
    if (!newMenuForm.name.trim() || !newMenuForm.title.trim()) {
      toast.error('Menu name and title are required');
      return;
    }
    try {
      const res = await chatbotApi.createMenu(id, {
        name: newMenuForm.name,
        title: newMenuForm.title,
        body: newMenuForm.body || undefined,
        footerText: newMenuForm.footerText || undefined,
        keywordId: newMenuForm.keywordId || undefined,
        items: [],
      });
      setMenus(prev => [res.menu, ...prev]);
      setNewMenuForm({ name: '', title: '', body: '', footerText: '', keywordId: '' });
      setExpandedMenu(res.menu._id);
      toast.success('Menu created');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create menu');
    }
  };

  const handleToggleMenuAccordion = async (menuId: string) => {
    if (expandedMenu === menuId) {
      setExpandedMenu(null);
    } else {
      setExpandedMenu(menuId);
      if (!id) return;
      try {
        const res = await chatbotApi.getMenu(id, menuId);
        setMenus(prev => prev.map(m => (m._id === menuId ? res.menu : m)));
      } catch (err) {
        console.error(err);
        toast.error('Failed to fetch menu details');
      }
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!id) return;
    try {
      await chatbotApi.deleteMenu(id, menuId);
      setMenus(prev => prev.filter(m => m._id !== menuId));
      if (expandedMenu === menuId) {
        setExpandedMenu(null);
      }
      toast.success('Menu deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete menu');
    }
  };

  // Menu items adding (Local items list directly saved in Document Menu)
  const [newMenuItemForm, setNewMenuItemForm] = useState({
    label: '',
    description: '',
    order: 0,
    actionType: 'template' as 'template' | 'flow' | 'menu',
    templateId: '',
    flowStepId: '',
    subMenuId: '',
  });

  const handleAddMenuItem = async (menuId: string) => {
    if (!id) return;
    const menuObj = menus.find(m => m._id === menuId);
    if (!menuObj) return;

    if (!newMenuItemForm.label.trim()) {
      toast.error('Label is required');
      return;
    }
    const newItem: ChatbotMenuItem = {
      label: newMenuItemForm.label,
      description: newMenuItemForm.description || undefined,
      order: newMenuItemForm.order,
      actionType: newMenuItemForm.actionType,
      templateId: newMenuItemForm.actionType === 'template' ? newMenuItemForm.templateId : undefined,
      flowStepId: newMenuItemForm.actionType === 'flow' ? newMenuItemForm.flowStepId : undefined,
      subMenuId: newMenuItemForm.actionType === 'menu' ? newMenuItemForm.subMenuId : undefined,
    };
    const newItems = [...(menuObj.items || []), newItem].sort((a, b) => a.order - b.order);

    try {
      const res = await chatbotApi.updateMenu(id, menuId, { items: newItems });
      setMenus(prev => prev.map(m => (m._id === menuId ? res.menu : m)));

      setNewMenuItemForm({
        label: '',
        description: '',
        order: 0,
        actionType: 'template',
        templateId: '',
        flowStepId: '',
        subMenuId: '',
      });
      toast.success('Menu option added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add menu option');
    }
  };

  const handleDeleteMenuItem = async (menuId: string, idx: number) => {
    if (!id) return;
    const menuObj = menus.find(m => m._id === menuId);
    if (!menuObj) return;

    const newItems = (menuObj.items || []).filter((_, i) => i !== idx);
    try {
      const res = await chatbotApi.updateMenu(id, menuId, { items: newItems });
      setMenus(prev => prev.map(m => (m._id === menuId ? res.menu : m)));
      toast.success('Option removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete option');
    }
  };

  // -------------------------------------------------------------
  // FORM BUILDER TAB LOGIC
  // -------------------------------------------------------------
  const [newFieldForm, setNewFieldForm] = useState({
    name: '',
    label: '',
    fieldType: 'text' as 'text' | 'number' | 'email' | 'phone' | 'date' | 'select',
    required: true,
    order: 0,
    optionsRaw: '',
    placeholder: '',
    validationRegex: '',
    validationMessage: '',
  });

  const [submissionTemplateId, setSubmissionTemplateId] = useState('');

  // Auto populate submission template from existing fields
  useEffect(() => {
    const firstField = formFields[0];
    if (firstField?.submissionTemplateId) {
      setSubmissionTemplateId(firstField.submissionTemplateId);
    }
  }, [formFields]);

  const handleAddFormField = async () => {
    if (!id) return;
    if (!newFieldForm.name.trim() || !newFieldForm.label.trim()) {
      toast.error('Field code name and question label are required');
      return;
    }
    try {
      const options = newFieldForm.fieldType === 'select'
        ? newFieldForm.optionsRaw.split(',').map(o => o.trim()).filter(Boolean)
        : undefined;

      const payload: Partial<ChatbotFormField> = {
        name: newFieldForm.name,
        label: newFieldForm.label,
        fieldType: newFieldForm.fieldType,
        required: newFieldForm.required,
        order: newFieldForm.order,
        options,
        placeholder: newFieldForm.placeholder || undefined,
        validationRegex: newFieldForm.validationRegex || undefined,
        validationMessage: newFieldForm.validationMessage || undefined,
      };

      const res = await chatbotApi.addFormField(id, payload);
      setFormFields(prev => [...prev, res.field].sort((a, b) => a.order - b.order));
      setNewFieldForm({
        name: '',
        label: '',
        fieldType: 'text',
        required: true,
        order: formFields.length + 1,
        optionsRaw: '',
        placeholder: '',
        validationRegex: '',
        validationMessage: '',
      });
      toast.success('Form input field added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add form field');
    }
  };

  const handleDeleteFormField = async (fieldId: string) => {
    if (!id) return;
    try {
      await chatbotApi.deleteFormField(id, fieldId);
      setFormFields(prev => prev.filter(f => f._id !== fieldId));
      toast.success('Form field deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete form field');
    }
  };

  const handleUpdateSubmissionTemplate = async (templateId: string) => {
    if (!id || formFields.length === 0) return;
    setSubmissionTemplateId(templateId);
    try {
      // Fire all updates in parallel — one network round-trip per field
      await Promise.all(
        formFields.map(field =>
          chatbotApi.updateFormField(id, field._id, { submissionTemplateId: templateId || null })
        )
      );
      setFormFields(prev => prev.map(f => ({ ...f, submissionTemplateId: templateId || null })));
      toast.success('Submission response template updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save submission template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-accent-purple animate-spin" />
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="p-6 text-center text-gray-500 font-bold">
        Chatbot not found
      </div>
    );
  }

  return (
    <div className="p-6 w-full space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('../chatbots')}
            className="p-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-lg text-gray-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2">
              {chatbot.name}
              <span className={clsx('px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase', chatbot.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400')}>
                {chatbot.isActive ? 'Active' : 'Inactive'}
              </span>
            </h1>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              Type: {chatbot.type} | Default Lang: {chatbot.language}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar gap-1">
        {getTabs().map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-6 py-3 border-b-2 font-bold uppercase tracking-wider text-xs whitespace-nowrap transition-all duration-300 flex items-center space-x-2',
              activeTab === tab.id
                ? 'border-accent-purple text-white bg-accent-purple/5'
                : 'border-transparent text-gray-400 hover:text-white hover:border-white/10'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="min-h-96">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Edit Details */}
              <div className="lg:col-span-2 glass-card p-6 space-y-6">
                <h3 className="text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  General Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Chatbot Name *
                    </label>
                    <input
                      type="text"
                      value={overviewForm.name}
                      onChange={e => setOverviewForm(prev => ({ ...prev, name: e.target.value }))}
                      className="glass-input w-full font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Language
                    </label>
                    <select
                      value={overviewForm.language}
                      onChange={e => setOverviewForm(prev => ({ ...prev, language: e.target.value }))}
                      className="glass-input w-full bg-slate-950 font-semibold"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Avatar URL
                    </label>
                    <input
                      type="text"
                      value={overviewForm.avatarUrl}
                      onChange={e => setOverviewForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                      className="glass-input w-full font-mono text-xs text-accent-blue"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Description
                    </label>
                    <textarea
                      value={overviewForm.description}
                      onChange={e => setOverviewForm(prev => ({ ...prev, description: e.target.value }))}
                      className="glass-input w-full text-sm"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="border-t border-white/5 pt-6 flex items-center justify-between">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overviewForm.isActive}
                      onChange={e => setOverviewForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 bg-slate-950 border-white/10 text-accent-purple rounded focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                      Activate Chatbot Routing
                    </span>
                  </label>

                  <button
                    onClick={handleUpdateOverview}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>

              {/* Welcome/Fallback Settings & Danger Zone */}
              <div className="space-y-6">
                <div className="glass-card p-6 space-y-6">
                  <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
                    Behavior Settings
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                        Welcome Response Template
                      </label>
                      <select
                        value={overviewForm.welcomeTemplateId}
                        onChange={e => setOverviewForm(prev => ({ ...prev, welcomeTemplateId: e.target.value }))}
                        className="glass-input w-full bg-slate-950 font-semibold"
                      >
                        <option value="">(None - Disabled)</option>
                        {templates.map(tpl => (
                          <option key={tpl._id} value={tpl._id}>
                            {tpl.name} ({tpl.status})
                          </option>
                        ))}
                      </select>
                      <span className="text-[9px] text-gray-500 font-bold block mt-1 leading-normal uppercase">
                        Sent automatically when a user opens a new chat session.
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                        Fallback Response Template
                      </label>
                      <select
                        value={overviewForm.fallbackTemplateId}
                        onChange={e => setOverviewForm(prev => ({ ...prev, fallbackTemplateId: e.target.value }))}
                        className="glass-input w-full bg-slate-950 font-semibold"
                      >
                        <option value="">(None - Disabled)</option>
                        {templates.map(tpl => (
                          <option key={tpl._id} value={tpl._id}>
                            {tpl.name} ({tpl.status})
                          </option>
                        ))}
                      </select>
                      <span className="text-[9px] text-gray-500 font-bold block mt-1 leading-normal uppercase">
                        Sent when keywords do not match and router falls back.
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleUpdateOverview}
                    className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all rounded-lg font-bold text-xs uppercase tracking-wider text-white"
                  >
                    Update Behavior Settings
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="glass-card p-6 border-red-500/20 bg-red-950/5 space-y-4">
                  <h3 className="text-base font-bold text-red-400 uppercase tracking-tight flex items-center gap-2">
                    Danger Zone
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Permanently delete this chatbot configuration. All related keywords, flow steps, variables, and templates will be lost.
                  </p>
                  {confirmDelete ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteChatbot}
                        className="flex-1 py-2 bg-red-500 hover:bg-red-600 transition-all rounded-lg font-bold text-xs uppercase text-white"
                      >
                        Yes, Delete Config
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 transition-all border border-white/5 rounded-lg font-bold text-xs uppercase text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all rounded-lg font-bold text-xs uppercase tracking-wider"
                    >
                      Delete Chatbot
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'variables' && (
            <motion.div
              key="variables"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="glass-card p-6 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase">
                    Variables Config
                  </h3>
                  <p className="text-gray-500 text-xs">
                    Define placeholders that can be injected into templates, like <code className="text-accent-blue font-mono font-bold">{"{{user_name}}"}</code>.
                  </p>
                </div>

                {/* Variables list table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-semibold">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 uppercase tracking-widest text-[10px]">
                        <th className="py-3 px-4">Placeholder</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Default Value</th>
                        <th className="py-3 px-4 text-center">Required</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variables.length > 0 ? (
                        variables.map(v => (
                          <tr key={v._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 px-4 font-mono font-bold text-accent-purple">
                              {"{{"}
                              {v.name}
                              {"}}"}
                            </td>
                            <td className="py-4 px-4 text-gray-400">{v.description || '—'}</td>
                            <td className="py-4 px-4 font-mono text-gray-400">{v.defaultValue || '—'}</td>
                            <td className="py-4 px-4 text-center">
                              {v.required ? (
                                <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] uppercase font-bold rounded-full">
                                  Required
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-500/10 border border-white/5 text-gray-500 text-[9px] uppercase font-bold rounded-full">
                                  Optional
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => handleDeleteVariable(v._id)}
                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                            No custom variables configured. Add one below.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Variable inline form */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
                  <h4 className="text-xs uppercase font-bold tracking-widest text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-accent-purple" /> Add Custom Variable
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Variable Key
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. user_name"
                        value={newVarForm.name}
                        onChange={e => setNewVarForm(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                        className="glass-input w-full font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Description
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Full name of the visitor"
                        value={newVarForm.description}
                        onChange={e => setNewVarForm(prev => ({ ...prev, description: e.target.value }))}
                        className="glass-input w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Default Fallback Value
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Customer"
                        value={newVarForm.defaultValue}
                        onChange={e => setNewVarForm(prev => ({ ...prev, defaultValue: e.target.value }))}
                        className="glass-input w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newVarForm.required}
                        onChange={e => setNewVarForm(prev => ({ ...prev, required: e.target.checked }))}
                        className="w-4 h-4 bg-slate-950 border-white/10 text-accent-purple rounded focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Mark field as required inputs
                      </span>
                    </label>

                    <button
                      onClick={handleAddVariable}
                      className="btn-primary flex items-center space-x-2 py-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Variable</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'keywords' && (
            <motion.div
              key="keywords"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="glass-card p-6 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase">
                    Keywords Routing
                  </h3>
                  <p className="text-gray-500 text-xs">
                    Assign keyword matching rules that direct users to specific response templates.
                  </p>
                </div>

                {/* Keywords list */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-semibold">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 uppercase tracking-widest text-[10px]">
                        <th className="py-3 px-4">Keyword Match</th>
                        <th className="py-3 px-4">Match Method</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Group/Session</th>
                        <th className="py-3 px-4">Target Template</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywords.length > 0 ? (
                        keywords.map(kw => {
                          const linkedTpl = templates.find(t => t._id === kw.templateId);
                          return (
                            <tr key={kw._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="py-4 px-4 font-bold text-white font-mono">{kw.keyword}</td>
                              <td className="py-4 px-4">
                                <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold rounded-md">
                                  {kw.matchType}
                                </span>
                              </td>
                              <td className="py-4 px-4 font-mono text-gray-400">{kw.priority}</td>
                              <td className="py-4 px-4 text-gray-400">{kw.sessionId}</td>
                              <td className="py-4 px-4 text-accent-blue font-bold">
                                {linkedTpl ? linkedTpl.name : '—'}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={clsx('w-2 h-2 rounded-full inline-block', kw.isActive ? 'bg-emerald-400' : 'bg-gray-600')} />
                              </td>
                              <td className="py-4 px-4 text-right">
                                <button
                                  onClick={() => handleDeleteKeyword(kw._id)}
                                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500 italic">
                            No keyword routing configured. Add one below.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Keyword inline form */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-4">
                  <h4 className="text-xs uppercase font-bold tracking-widest text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-accent-purple" /> Add Keyword Route
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Keyword / Regex Trigger
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ticket, support, reset"
                        value={newKwForm.keyword}
                        onChange={e => setNewKwForm(prev => ({ ...prev, keyword: e.target.value }))}
                        className="glass-input w-full font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Match Strategy
                      </label>
                      <select
                        value={newKwForm.matchType}
                        onChange={e => setNewKwForm(prev => ({ ...prev, matchType: e.target.value as any }))}
                        className="glass-input w-full bg-slate-950 font-semibold"
                      >
                        <option value="contains">Contains Word</option>
                        <option value="exact">Exact Match</option>
                        <option value="startsWith">Starts With</option>
                        <option value="regex">Regular Expression</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Route Priority
                      </label>
                      <input
                        type="number"
                        value={newKwForm.priority}
                        onChange={e => setNewKwForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
                        className="glass-input w-full font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Session Group ID
                      </label>
                      <input
                        type="text"
                        value={newKwForm.sessionId}
                        onChange={e => setNewKwForm(prev => ({ ...prev, sessionId: e.target.value }))}
                        className="glass-input w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t border-white/5 pt-4">
                    <div className="space-y-2 w-full md:max-w-md">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
                        Linked Response Template
                      </label>
                      <select
                        value={newKwForm.templateId}
                        onChange={e => setNewKwForm(prev => ({ ...prev, templateId: e.target.value }))}
                        className="glass-input w-full bg-slate-950 font-semibold"
                      >
                        <option value="">(Select a Template)</option>
                        {templates.map(tpl => (
                          <option key={tpl._id} value={tpl._id}>
                            {tpl.name} ({tpl.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-6 self-end w-full md:w-auto justify-between md:justify-start">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newKwForm.isActive}
                          onChange={e => setNewKwForm(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="w-4 h-4 bg-slate-950 border-white/10 text-accent-purple rounded focus:ring-0 focus:ring-offset-0"
                        />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Trigger is Active
                        </span>
                      </label>

                      <button
                        onClick={handleAddKeyword}
                        className="btn-primary flex items-center space-x-2 py-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Trigger</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Creator Form */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <Plus className="w-5 h-5 text-accent-purple" /> Add Response Template
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Template Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Booking Confirmation"
                      value={newTemplateForm.name}
                      onChange={e => setNewTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="glass-input w-full font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Language
                    </label>
                    <select
                      value={newTemplateForm.language}
                      onChange={e => setNewTemplateForm(prev => ({ ...prev, language: e.target.value }))}
                      className="glass-input w-full bg-slate-950 font-semibold"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Internal Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sent when movie is booked"
                      value={newTemplateForm.description}
                      onChange={e => setNewTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                      className="glass-input w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-white/5">
                  <button
                    onClick={handleCreateTemplate}
                    className="btn-primary flex items-center space-x-2 py-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Template</span>
                  </button>
                </div>
              </div>

              {/* Templates list with Accordions */}
              <div className="space-y-4">
                {templates.length > 0 ? (
                  templates.map(tpl => {
                    const isExpanded = expandedTemplate === tpl._id;
                    return (
                      <div
                        key={tpl._id}
                        className={clsx(
                          'glass-card overflow-hidden transition-all duration-300',
                          isExpanded ? 'border-accent-purple/30 bg-slate-900/10' : 'border-white/5'
                        )}
                      >
                        {/* Header bar */}
                        <div
                          onClick={() => handleToggleTemplateAccordion(tpl._id)}
                          className="p-5 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 text-gray-400">
                              <FileCode className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">{tpl.name}</h4>
                              <p className="text-gray-500 text-[10px] uppercase font-semibold">
                                Lang: {tpl.language} | {tpl.description || 'No description'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <span className={clsx('px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider', tpl.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border border-white/5')}>
                              {tpl.status}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                          </div>
                        </div>

                        {/* Accordion expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="border-t border-white/5 overflow-hidden"
                            >
                              <div className="p-6 space-y-6">
                                {/* General template options (nextFlowStepId) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-white/5 items-end">
                                  <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
                                      Status Mode
                                    </label>
                                    <select
                                      value={tpl.status}
                                      onChange={e => handleUpdateTemplateGeneral(tpl._id, { status: e.target.value as any })}
                                      className="glass-input w-full bg-slate-950 text-xs font-bold"
                                    >
                                      <option value="draft">Draft (Inactive)</option>
                                      <option value="published">Published (Live)</option>
                                    </select>
                                  </div>

                                  {chatbot.type === 'flow' && (
                                    <div className="space-y-2">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
                                        Next Dialogue Flow Step
                                      </label>
                                      <select
                                        value={tpl.nextFlowStepId || ''}
                                        onChange={e => handleUpdateTemplateGeneral(tpl._id, { nextFlowStepId: e.target.value || null })}
                                        className="glass-input w-full bg-slate-950 text-xs font-bold"
                                      >
                                        <option value="">(End conversation block)</option>
                                        {flows.map(step => (
                                          <option key={step._id} value={step._id}>
                                            Step: {step.stepName}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  <div className="flex justify-end self-end">
                                    <button
                                      onClick={() => handleDeleteTemplate(tpl._id)}
                                      className="px-4 py-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold uppercase flex items-center space-x-1.5 transition-all"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Template</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Section Rows Editors */}
                                {templateDetail ? (
                                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    {/* HEADERS */}
                                    <div className="space-y-4 glass-card p-5 bg-slate-950/20">
                                      <h5 className="text-xs uppercase font-bold tracking-widest text-white border-b border-white/5 pb-2">
                                        Template Headers
                                      </h5>
                                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                        {(templateDetail.headers || []).map((row, idx) => (
                                          <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-white/5 flex justify-between items-start text-[11px]">
                                            <div className="space-y-1 pr-4">
                                              <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-bold font-mono">
                                                {row.type}
                                              </span>
                                              <p className="font-bold text-white font-mono mt-1">{row.key}</p>
                                              <p className="text-gray-400 break-all font-mono">{row.value}</p>
                                            </div>
                                            <button
                                              onClick={() => handleDeleteHeaderRow(tpl._id, idx)}
                                              className="text-gray-500 hover:text-red-400 p-0.5 transition-colors"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Add Header row form */}
                                      {(() => {
                                        const st = templateSectionState[tpl._id];
                                        if (!st) return null;
                                        return (
                                          <div className="bg-slate-950 p-3 rounded-lg border border-white/5 space-y-2.5">
                                            <div className="grid grid-cols-2 gap-2">
                                              <select
                                                value={st.newForms.header.type}
                                                onChange={e => setTemplateSectionState(prev => ({
                                                  ...prev,
                                                  [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, header: { ...prev[tpl._id]!.newForms.header, type: e.target.value } } }
                                                }))}
                                                className="glass-input py-1 text-[11px] bg-slate-950 w-full"
                                              >
                                                <option value="text">Text</option>
                                                <option value="image">Image URL</option>
                                                <option value="video">Video URL</option>
                                                <option value="document">Doc URL</option>
                                              </select>
                                              <input
                                                type="number"
                                                placeholder="Order"
                                                value={st.newForms.header.order}
                                                onChange={e => setTemplateSectionState(prev => ({
                                                  ...prev,
                                                  [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, header: { ...prev[tpl._id]!.newForms.header, order: Number(e.target.value) } } }
                                                }))}
                                                className="glass-input py-1 text-[11px] w-full"
                                              />
                                            </div>
                                            <select
                                              value={st.selectedKeys.header}
                                              onChange={e => {
                                                const val = e.target.value;
                                                setTemplateSectionState(prev => ({
                                                  ...prev,
                                                  [tpl._id]: {
                                                    ...prev[tpl._id]!,
                                                    selectedKeys: { ...prev[tpl._id]!.selectedKeys, header: val },
                                                    newForms: { ...prev[tpl._id]!.newForms, header: { ...prev[tpl._id]!.newForms.header, key: val === 'custom' ? '' : val } },
                                                  }
                                                }));
                                              }}
                                              className="glass-input py-1 text-[11px] bg-slate-950 w-full font-semibold"
                                            >
                                              {HEADER_KEY_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                              ))}
                                            </select>
                                            {st.selectedKeys.header === 'custom' && (
                                              <input
                                                type="text"
                                                placeholder="Enter Custom Header Key"
                                                value={st.newForms.header.key}
                                                onChange={e => setTemplateSectionState(prev => ({
                                                  ...prev,
                                                  [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, header: { ...prev[tpl._id]!.newForms.header, key: e.target.value } } }
                                                }))}
                                                className="glass-input py-1 text-[11px] w-full"
                                              />
                                            )}
                                            <input
                                              type="text"
                                              placeholder="Header Value"
                                              value={st.newForms.header.value}
                                              onChange={e => setTemplateSectionState(prev => ({
                                                ...prev,
                                                [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, header: { ...prev[tpl._id]!.newForms.header, value: e.target.value } } }
                                              }))}
                                              className="glass-input py-1 text-[11px] w-full"
                                            />
                                            <button
                                              onClick={() => handleAddHeaderRow(tpl._id)}
                                              className="w-full py-1 bg-accent-purple/20 text-accent-purple hover:bg-accent-purple hover:text-white transition-all rounded text-[10px] uppercase font-bold"
                                            >
                                              Add Header Item
                                            </button>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* BODY */}
                                    <div className="space-y-4 glass-card p-5 bg-slate-950/20">
                                      <h5 className="text-xs uppercase font-bold tracking-widest text-white border-b border-white/5 pb-2">
                                        Template Body
                                      </h5>
                                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                        {(templateDetail.bodies || []).map((row, idx) => (
                                          <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-white/5 flex justify-between items-start text-[11px]">
                                            <div className="space-y-1 pr-4 w-full">
                                              <p className="font-bold text-white font-mono">{row.key}</p>
                                              <p className="text-gray-400 leading-relaxed font-mono whitespace-pre-wrap">{row.value}</p>
                                            </div>
                                            <button
                                              onClick={() => handleDeleteBodyRow(tpl._id, idx)}
                                              className="text-gray-500 hover:text-red-400 p-0.5 transition-colors"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Add Body row form */}
                                      {(() => {
                                        const st = templateSectionState[tpl._id];
                                        if (!st) return null;
                                        return (
                                          <div className="bg-slate-950 p-3 rounded-lg border border-white/5 space-y-2.5">
                                            <select
                                              value={st.selectedKeys.body}
                                              onChange={e => {
                                                const val = e.target.value;
                                                setTemplateSectionState(prev => ({
                                                  ...prev,
                                                  [tpl._id]: {
                                                    ...prev[tpl._id]!,
                                                    selectedKeys: { ...prev[tpl._id]!.selectedKeys, body: val },
                                                    newForms: { ...prev[tpl._id]!.newForms, body: { ...prev[tpl._id]!.newForms.body, key: val === 'custom' ? '' : val } },
                                                  }
                                                }));
                                              }}
                                              className="glass-input py-1 text-[11px] bg-slate-950 w-full font-semibold"
                                            >
                                              {BODY_KEY_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                              ))}
                                            </select>
                                            {st.selectedKeys.body === 'custom' && (
                                              <input
                                                type="text"
                                                placeholder="Enter Custom Body Key"
                                                value={st.newForms.body.key}
                                                onChange={e => setTemplateSectionState(prev => ({
                                                  ...prev,
                                                  [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, body: { ...prev[tpl._id]!.newForms.body, key: e.target.value } } }
                                                }))}
                                                className="glass-input py-1 text-[11px] w-full"
                                              />
                                            )}
                                            <textarea
                                              placeholder="Body content... supports {{var}}"
                                              rows={2}
                                              value={st.newForms.body.value}
                                              onChange={e => setTemplateSectionState(prev => ({
                                                ...prev,
                                                [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, body: { ...prev[tpl._id]!.newForms.body, value: e.target.value } } }
                                              }))}
                                              className="glass-input py-1 text-[11px] w-full font-mono"
                                            />
                                            <button
                                              onClick={() => handleAddBodyRow(tpl._id)}
                                              className="w-full py-1 bg-accent-purple/20 text-accent-purple hover:bg-accent-purple hover:text-white transition-all rounded text-[10px] uppercase font-bold"
                                            >
                                              Add Body Item
                                            </button>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* FOOTERS */}
                                    <div className="space-y-4 glass-card p-5 bg-slate-950/20">
                                      <h5 className="text-xs uppercase font-bold tracking-widest text-white border-b border-white/5 pb-2">
                                        Template Footer
                                      </h5>
                                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                        {(templateDetail.footers || []).map((row, idx) => (
                                          <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-white/5 flex justify-between items-start text-[11px]">
                                            <div className="space-y-1 pr-4">
                                              <p className="font-bold text-white font-mono">{row.key}</p>
                                              <p className="text-gray-400 break-all font-mono">{row.value}</p>
                                            </div>
                                            <button
                                              onClick={() => handleDeleteFooterRow(tpl._id, idx)}
                                              className="text-gray-500 hover:text-red-400 p-0.5 transition-colors"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Add Footer row form */}
                                      {(() => {
                                        const st = templateSectionState[tpl._id];
                                        if (!st) return null;
                                        return (
                                          <div className="bg-slate-950 p-3 rounded-lg border border-white/5 space-y-2.5">
                                            <select
                                              value={st.selectedKeys.footer}
                                              onChange={e => {
                                                const val = e.target.value;
                                                setTemplateSectionState(prev => ({
                                                  ...prev,
                                                  [tpl._id]: {
                                                    ...prev[tpl._id]!,
                                                    selectedKeys: { ...prev[tpl._id]!.selectedKeys, footer: val },
                                                    newForms: { ...prev[tpl._id]!.newForms, footer: { ...prev[tpl._id]!.newForms.footer, key: val === 'custom' ? '' : val } },
                                                  }
                                                }));
                                              }}
                                              className="glass-input py-1 text-[11px] bg-slate-950 w-full font-semibold"
                                            >
                                              {FOOTER_KEY_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                              ))}
                                            </select>
                                            {st.selectedKeys.footer === 'custom' && (
                                              <input
                                                type="text"
                                                placeholder="Enter Custom Footer Key"
                                                value={st.newForms.footer.key}
                                                onChange={e => setTemplateSectionState(prev => ({
                                                  ...prev,
                                                  [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, footer: { ...prev[tpl._id]!.newForms.footer, key: e.target.value } } }
                                                }))}
                                                className="glass-input py-1 text-[11px] w-full"
                                              />
                                            )}
                                            <input
                                              type="text"
                                              placeholder="Footer value"
                                              value={st.newForms.footer.value}
                                              onChange={e => setTemplateSectionState(prev => ({
                                                ...prev,
                                                [tpl._id]: { ...prev[tpl._id]!, newForms: { ...prev[tpl._id]!.newForms, footer: { ...prev[tpl._id]!.newForms.footer, value: e.target.value } } }
                                              }))}
                                              className="glass-input py-1 text-[11px] w-full"
                                            />
                                            <button
                                              onClick={() => handleAddFooterRow(tpl._id)}
                                              className="w-full py-1 bg-accent-purple/20 text-accent-purple hover:bg-accent-purple hover:text-white transition-all rounded text-[10px] uppercase font-bold"
                                            >
                                              Add Footer Item
                                            </button>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-center py-6 text-gray-500">
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 border border-dashed border-white/5 rounded-2xl text-center text-gray-500 text-xs italic">
                    No templates built. Create one using the form above.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'flow-builder' && (
            <motion.div
              key="flow-builder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Creator Form */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <Plus className="w-5 h-5 text-accent-purple" /> Add Flow Step
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Step Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ask Movie Genre"
                      value={newFlowForm.stepName}
                      onChange={e => setNewFlowForm(prev => ({ ...prev, stepName: e.target.value }))}
                      className="glass-input w-full font-semibold"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Step Description
                    </label>
                    <input
                      type="text"
                      placeholder="Explain what this node prompts"
                      value={newFlowForm.description}
                      onChange={e => setNewFlowForm(prev => ({ ...prev, description: e.target.value }))}
                      className="glass-input w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Response Template
                    </label>
                    <select
                      value={newFlowForm.templateId}
                      onChange={e => setNewFlowForm(prev => ({ ...prev, templateId: e.target.value }))}
                      className="glass-input w-full bg-slate-950 font-semibold"
                    >
                      <option value="">(Select template)</option>
                      {templates.map(tpl => (
                        <option key={tpl._id} value={tpl._id}>
                          {tpl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-white/5 pt-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
                      Previous Step Node
                    </label>
                    <select
                      value={newFlowForm.previousStepId}
                      onChange={e => setNewFlowForm(prev => ({ ...prev, previousStepId: e.target.value }))}
                      className="glass-input w-full bg-slate-950 font-semibold"
                    >
                      <option value="">(Entry Point - Trigger Only)</option>
                      {flows.map(step => (
                        <option key={step._id} value={step._id}>
                          {step.stepName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
                      Previous Link Type
                    </label>
                    <select
                      value={newFlowForm.previousStepType}
                      onChange={e => setNewFlowForm(prev => ({ ...prev, previousStepType: e.target.value as any }))}
                      className="glass-input w-full bg-slate-950 font-semibold"
                    >
                      <option value="chatbot-trigger">Trigger Match (Entry)</option>
                      <option value="chatbot-flow">Dialog Step (Intermediate)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Enter Condition (Keyword/Regex)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. confirm|yes"
                      value={newFlowForm.condition}
                      onChange={e => setNewFlowForm(prev => ({ ...prev, condition: e.target.value }))}
                      className="glass-input w-full font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Order Value
                    </label>
                    <input
                      type="number"
                      value={newFlowForm.order}
                      onChange={e => setNewFlowForm(prev => ({ ...prev, order: Number(e.target.value) }))}
                      className="glass-input w-full font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-white/5">
                  <button
                    onClick={handleAddFlowStep}
                    className="btn-primary flex items-center space-x-2 py-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Node Step</span>
                  </button>
                </div>
              </div>

              {/* Vertical Step Chain Visualization */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-accent-purple" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                    Conversation Path
                  </h4>
                </div>

                <div className="flex flex-col items-center max-w-lg mx-auto space-y-4">
                  <div className="bg-slate-950 border border-dashed border-white/10 rounded-xl p-4 text-center w-full text-xs text-gray-500 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>🔑 User Keyword Match Trigger</span>
                  </div>

                  {flows.length > 0 ? (
                    flows.map((step, idx) => {
                      const linkedTpl = templates.find(t => t._id === step.templateId);
                      return (
                        <div key={step._id} className="w-full flex flex-col items-center">
                          {/* Arrow spacer */}
                          <div className="w-0.5 h-6 bg-gradient-to-b from-accent-purple to-accent-blue" />

                          {/* Node card */}
                          <div className="glass-card p-5 w-full relative group border-accent-purple/10">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple border border-accent-purple/20 rounded mr-2">
                                  Node #{idx + 1}
                                </span>
                                <h4 className="text-white font-bold inline-block text-sm">{step.stepName}</h4>
                                <p className="text-gray-400 text-xs mt-1">{step.description || 'No description node.'}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteFlowStep(step._id)}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Node Metadata indicators */}
                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5 text-[11px] font-semibold text-gray-400">
                              <div>
                                <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px] block">
                                  Linked Response
                                </span>
                                <span className="text-accent-blue font-bold">
                                  {linkedTpl ? linkedTpl.name : 'Missing!'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px] block">
                                  Criteria Condition
                                </span>
                                <span className="font-mono text-emerald-400">
                                  {step.condition || '(None - Auto)'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-gray-500 italic text-xs w-full border border-dashed border-white/5 rounded-2xl">
                      No dialog steps configured yet.
                    </div>
                  )}

                  <div className="w-0.5 h-6 bg-white/5" />
                  <div className="bg-slate-950 border border-white/5 rounded-xl p-3 text-center w-full text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    🏁 Dialogue Session Ends / Repeats
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'menu-builder' && (
            <motion.div
              key="menu-builder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Creator Form */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <Plus className="w-5 h-5 text-accent-purple" /> Add New Menu Card
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Menu Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HelpDesk Main Menu"
                      value={newMenuForm.name}
                      onChange={e => setNewMenuForm(prev => ({ ...prev, name: e.target.value }))}
                      className="glass-input w-full font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Menu Heading Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. How can we help you today?"
                      value={newMenuForm.title}
                      onChange={e => setNewMenuForm(prev => ({ ...prev, title: e.target.value }))}
                      className="glass-input w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Body Text
                    </label>
                    <input
                      type="text"
                      placeholder="Subtitle menu desc (optional)"
                      value={newMenuForm.body}
                      onChange={e => setNewMenuForm(prev => ({ ...prev, body: e.target.value }))}
                      className="glass-input w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Trigger Keyword Rule
                    </label>
                    <select
                      value={newMenuForm.keywordId}
                      onChange={e => setNewMenuForm(prev => ({ ...prev, keywordId: e.target.value }))}
                      className="glass-input w-full bg-slate-950 font-semibold"
                    >
                      <option value="">(Click Option - Submenu only)</option>
                      {keywords.map(kw => (
                        <option key={kw._id} value={kw._id}>
                          Trigger: {kw.keyword}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t border-white/5 pt-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Footer Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Reply with menu option number"
                      value={newMenuForm.footerText}
                      onChange={e => setNewMenuForm(prev => ({ ...prev, footerText: e.target.value }))}
                      className="glass-input w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-white/5">
                  <button
                    onClick={handleCreateMenu}
                    className="btn-primary flex items-center space-x-2 py-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Menu Card</span>
                  </button>
                </div>
              </div>

              {/* Menus List and Options Editors */}
              <div className="space-y-4">
                {menus.length > 0 ? (
                  menus.map(menu => {
                    const isExpanded = expandedMenu === menu._id;
                    const triggerKw = keywords.find(k => k._id === menu.keywordId);
                    return (
                      <div
                        key={menu._id}
                        className={clsx(
                          'glass-card overflow-hidden transition-all duration-300',
                          isExpanded ? 'border-accent-purple/30 bg-slate-900/10' : 'border-white/5'
                        )}
                      >
                        {/* Accordion header */}
                        <div
                          onClick={() => handleToggleMenuAccordion(menu._id)}
                          className="p-5 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 text-gray-400">
                              <MenuIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">{menu.name}</h4>
                              <p className="text-gray-500 text-[10px] uppercase font-semibold">
                                Heading: {menu.title} | {triggerKw ? `Linked Trigger: ${triggerKw.keyword}` : 'Submenu Node'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">
                              {(menu.items || []).length} Options
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                          </div>
                        </div>

                        {/* Accordion expand */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="border-t border-white/5 overflow-hidden"
                            >
                              <div className="p-6 space-y-6">
                                <div className="flex justify-between items-center bg-slate-950 p-4 border border-white/5 rounded-xl">
                                  <div className="text-xs space-y-1">
                                    <p className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Menu Description Body</p>
                                    <p className="text-white">{menu.body || '—'}</p>
                                    <p className="text-gray-500 font-bold uppercase tracking-wider text-[9px] pt-2">Footer Guide Text</p>
                                    <p className="text-gray-400">{menu.footerText || '—'}</p>
                                  </div>

                                  <button
                                    onClick={() => handleDeleteMenu(menu._id)}
                                    className="px-4 py-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold uppercase flex items-center space-x-1.5 transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Menu</span>
                                  </button>
                                </div>

                                {/* Menu options listing */}
                                <div className="space-y-4">
                                  <h5 className="text-xs uppercase font-bold tracking-widest text-white border-b border-white/5 pb-2">
                                    Quick Reply Options
                                  </h5>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(menu.items || []).map((item, idx) => (
                                      <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-white/5 flex justify-between items-start text-xs font-semibold">
                                        <div className="space-y-2">
                                          <div className="flex items-center space-x-2">
                                            <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-mono text-[10px] text-gray-400 font-bold">
                                              {item.order}
                                            </span>
                                            <h5 className="text-white font-bold">{item.label}</h5>
                                          </div>
                                          {item.description && <p className="text-gray-400 pl-7 font-normal">{item.description}</p>}
                                          <div className="pl-7 pt-1 flex items-center gap-1.5 font-bold">
                                            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] uppercase border border-blue-500/20">
                                              {item.actionType}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-mono">
                                              Target: {
                                                item.actionType === 'template'
                                                  ? templates.find(t => t._id === item.templateId)?.name || 'Missing!'
                                                  : item.actionType === 'flow'
                                                  ? flows.find(f => f._id === item.flowStepId)?.stepName || 'Missing!'
                                                  : item.actionType === 'menu'
                                                  ? menus.find(m => m._id === item.subMenuId)?.name || 'Missing!'
                                                  : '—'
                                              }
                                            </span>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => handleDeleteMenuItem(menu._id, idx)}
                                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Add Menu Option Item Form */}
                                  <div className="bg-slate-950/40 p-5 rounded-xl border border-white/5 space-y-4">
                                    <h6 className="text-[10px] uppercase font-black tracking-wider text-accent-purple flex items-center gap-1">
                                      <Plus className="w-3.5 h-3.5" /> Add Options Action Row
                                    </h6>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                          Button / Option Label
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="e.g. Yes, Book Movie"
                                          value={newMenuItemForm.label}
                                          onChange={e => setNewMenuItemForm(prev => ({ ...prev, label: e.target.value }))}
                                          className="glass-input w-full text-xs font-semibold"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                          Option Description
                                        </label>
                                        <input
                                          type="text"
                                          placeholder="Sublabel info (optional)"
                                          value={newMenuItemForm.description}
                                          onChange={e => setNewMenuItemForm(prev => ({ ...prev, description: e.target.value }))}
                                          className="glass-input w-full text-xs"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                          Action Response Type
                                        </label>
                                        <select
                                          value={newMenuItemForm.actionType}
                                          onChange={e => setNewMenuItemForm(prev => ({ ...prev, actionType: e.target.value as any }))}
                                          className="glass-input w-full bg-slate-950 text-xs font-semibold"
                                        >
                                          <option value="template">Trigger Template</option>
                                          <option value="flow">Enter Dialogue Step</option>
                                          <option value="menu">Route Submenu Card</option>
                                        </select>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                          Trigger Order Value
                                        </label>
                                        <input
                                          type="number"
                                          value={newMenuItemForm.order}
                                          onChange={e => setNewMenuItemForm(prev => ({ ...prev, order: Number(e.target.value) }))}
                                          className="glass-input w-full font-mono text-xs"
                                        />
                                      </div>
                                    </div>

                                    {/* Action target pickers conditional */}
                                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center pt-2">
                                      <div className="space-y-2 w-full md:max-w-md">
                                        <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
                                          Linked Action Target
                                        </label>
                                        {newMenuItemForm.actionType === 'template' ? (
                                          <select
                                            value={newMenuItemForm.templateId}
                                            onChange={e => setNewMenuItemForm(prev => ({ ...prev, templateId: e.target.value }))}
                                            className="glass-input w-full bg-slate-950 text-xs font-semibold"
                                          >
                                            <option value="">(Select response template)</option>
                                            {templates.map(t => (
                                              <option key={t._id} value={t._id}>
                                                {t.name}
                                              </option>
                                            ))}
                                          </select>
                                        ) : newMenuItemForm.actionType === 'flow' ? (
                                          <select
                                            value={newMenuItemForm.flowStepId}
                                            onChange={e => setNewMenuItemForm(prev => ({ ...prev, flowStepId: e.target.value }))}
                                            className="glass-input w-full bg-slate-950 text-xs font-semibold"
                                          >
                                            <option value="">(Select flow step)</option>
                                            {flows.map(f => (
                                              <option key={f._id} value={f._id}>
                                                {f.stepName}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <select
                                            value={newMenuItemForm.subMenuId}
                                            onChange={e => setNewMenuItemForm(prev => ({ ...prev, subMenuId: e.target.value }))}
                                            className="glass-input w-full bg-slate-950 text-xs font-semibold"
                                          >
                                            <option value="">(Select submenu menu)</option>
                                            {menus.map(m => (
                                              <option key={m._id} value={m._id}>
                                                {m.name}
                                              </option>
                                            ))}
                                          </select>
                                        )}
                                      </div>

                                      <button
                                        onClick={() => handleAddMenuItem(menu._id)}
                                        className="btn-primary py-1.5 flex items-center space-x-1.5 text-xs self-end w-full md:w-auto justify-center"
                                      >
                                        <Plus className="w-4 h-4" />
                                        <span>Add Option</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 border border-dashed border-white/5 rounded-2xl text-center text-gray-500 text-xs italic">
                    No menus built. Add one using the form card above.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'form-builder' && (
            <motion.div
              key="form-builder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Creator Form */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <Plus className="w-5 h-5 text-accent-purple" /> Add Wizard Form Field Input
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Variable Key Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. visitor_email"
                      value={newFieldForm.name}
                      onChange={e => setNewFieldForm(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                      className="glass-input w-full font-mono text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Prompt Question Label *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Please enter your email address"
                      value={newFieldForm.label}
                      onChange={e => setNewFieldForm(prev => ({ ...prev, label: e.target.value }))}
                      className="glass-input w-full text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Field Input Type
                    </label>
                    <select
                      value={newFieldForm.fieldType}
                      onChange={e => setNewFieldForm(prev => ({ ...prev, fieldType: e.target.value as any }))}
                      className="glass-input w-full bg-slate-950 text-xs font-semibold"
                    >
                      <option value="text">Plain Text</option>
                      <option value="number">Numeric Number</option>
                      <option value="email">Email Address</option>
                      <option value="phone">Phone Number</option>
                      <option value="date">Calendar Date</option>
                      <option value="select">Dropdown Select</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-white/5 pt-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Input Placeholder
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. name@domain.com"
                      value={newFieldForm.placeholder}
                      onChange={e => setNewFieldForm(prev => ({ ...prev, placeholder: e.target.value }))}
                      className="glass-input w-full text-xs"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Validation Regular Expression
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$"
                      value={newFieldForm.validationRegex}
                      onChange={e => setNewFieldForm(prev => ({ ...prev, validationRegex: e.target.value }))}
                      className="glass-input w-full font-mono text-[11px] text-accent-purple"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Validation Error message
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Email syntax is invalid"
                      value={newFieldForm.validationMessage}
                      onChange={e => setNewFieldForm(prev => ({ ...prev, validationMessage: e.target.value }))}
                      className="glass-input w-full text-xs"
                    />
                  </div>
                </div>

                {newFieldForm.fieldType === 'select' && (
                  <div className="space-y-2 border-t border-white/5 pt-4">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
                      Select options (comma-separated list) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Support Request, Sales Query, Custom Issue"
                      value={newFieldForm.optionsRaw}
                      onChange={e => setNewFieldForm(prev => ({ ...prev, optionsRaw: e.target.value }))}
                      className="glass-input w-full text-xs"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-white/5 pt-4">
                  <div className="flex gap-6 items-center">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newFieldForm.required}
                        onChange={e => setNewFieldForm(prev => ({ ...prev, required: e.target.checked }))}
                        className="w-4 h-4 bg-slate-950 border-white/10 text-accent-purple rounded focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Field input is required
                      </span>
                    </label>

                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] uppercase font-bold text-gray-400">Order:</span>
                      <input
                        type="number"
                        value={newFieldForm.order}
                        onChange={e => setNewFieldForm(prev => ({ ...prev, order: Number(e.target.value) }))}
                        className="glass-input py-1 text-center w-12 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddFormField}
                    className="btn-primary flex items-center space-x-2 py-1.5 text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add input field</span>
                  </button>
                </div>
              </div>

              {/* Form fields visual list */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-accent-purple" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                    Registration Wizard Form Inputs
                  </h4>
                </div>

                <div className="space-y-3 max-w-2xl mx-auto">
                  {formFields.length > 0 ? (
                    formFields.map(field => (
                      <div key={field._id} className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex items-start justify-between text-xs font-semibold">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <span className="w-6 h-6 bg-accent-purple/10 border border-accent-purple/20 text-accent-purple flex items-center justify-center font-mono rounded font-bold">
                              {field.order}
                            </span>
                            <span className="text-white font-bold text-sm">
                              {field.label}
                            </span>
                            {field.required && (
                              <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded text-[9px] uppercase font-bold border border-rose-500/20">
                                Required
                              </span>
                            )}
                          </div>

                          <div className="pl-9 space-y-1.5 text-[11px] text-gray-400 leading-normal font-normal">
                            <p>
                              Variable Placeholder Code: <code className="text-accent-blue font-mono font-bold">{"{{"}{field.name}{"}}"}</code>
                            </p>
                            <p>
                              Input field Type: <span className="font-bold uppercase text-white font-mono">{field.fieldType}</span>
                            </p>
                            {field.placeholder && <p>Hint Placeholder: <span className="italic">"{field.placeholder}"</span></p>}
                            {field.options && field.options.length > 0 && (
                              <p>Dropdown choices: <span className="font-mono text-emerald-400">{field.options.join(' | ')}</span></p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteFormField(field._id)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 border border-dashed border-white/5 rounded-2xl text-center text-gray-500 text-xs italic">
                      No form fields configured. Add one using the form card.
                    </div>
                  )}

                  {/* Submission response template setup */}
                  {formFields.length > 0 && (
                    <div className="glass-card p-6 bg-slate-950/20 space-y-4 border-emerald-500/10 mt-6">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-emerald-400" />
                        <h5 className="text-sm font-bold text-white uppercase tracking-wider">
                          Form Submission Action
                        </h5>
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        Select the template response sent to the user immediately after filling in the final field.
                      </p>

                      <div className="space-y-2">
                        <select
                          value={submissionTemplateId}
                          onChange={e => handleUpdateSubmissionTemplate(e.target.value)}
                          className="glass-input w-full bg-slate-950 font-bold"
                        >
                          <option value="">(Select response template)</option>
                          {templates.map(tpl => (
                            <option key={tpl._id} value={tpl._id}>
                              {tpl.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
