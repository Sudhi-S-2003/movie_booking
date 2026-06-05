import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, ChevronUp, ChevronDown, Menu as MenuIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { chatbotApi, type ChatbotMenu, type ChatbotMenuItem, type ChatbotKeyword, type ChatbotFlow } from '../../../services/api/chatbot.api.js';
import { toast } from '../../../utils/toast.js';
import { AsyncSelect } from '../../../components/common/AsyncSelect.js';

export const ChatbotMenus: React.FC = React.memo(() => {
  const { id } = useParams<{ id: string }>();

  const [menus, setMenus] = useState<ChatbotMenu[]>([]);
  const [keywords, setKeywords] = useState<ChatbotKeyword[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const [newMenuForm, setNewMenuForm] = useState({
    name: '',
    title: '',
    body: '',
    footerText: '',
    keywordId: '',
  });

  const [newMenuItemForm, setNewMenuItemForm] = useState({
    label: '',
    description: '',
    order: 0,
    actionType: 'template' as 'template' | 'flow' | 'menu',
    templateId: '',
    flowStepId: '',
    subMenuId: '',
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      chatbotApi.listMenus(id),
      chatbotApi.listKeywords(id, {}),
      chatbotApi.listTemplates(id, {}),
      chatbotApi.listFlows(id)
    ])
      .then(([mRes, kRes, tRes, fRes]) => {
        setMenus(mRes.menus || []);
        setKeywords(kRes.keywords || []);
        setTemplates(tRes.templates || []);
        setFlows(fRes.flows || []);
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to load menus data');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const searchKeywords = useCallback(async (q: string) => {
    if (!id) return [];
    try {
      const res = await chatbotApi.listKeywords(id, { q });
      return (res.keywords || []).map(k => ({ value: k._id, label: k.keyword }));
    } catch {
      return [];
    }
  }, [id]);

  const searchTemplates = useCallback(async (q: string) => {
    if (!id) return [];
    try {
      const res = await chatbotApi.listTemplates(id, { q });
      return (res.templates || []).map(t => ({ value: t._id, label: t.name }));
    } catch {
      return [];
    }
  }, [id]);

  const handleCreateMenu = useCallback(async () => {
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
  }, [id, newMenuForm]);

  const handleToggleMenuAccordion = useCallback(async (menuId: string) => {
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
  }, [id, expandedMenu]);

  const handleDeleteMenu = useCallback(async (menuId: string) => {
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
  }, [id, expandedMenu]);

  const handleAddMenuItem = useCallback(async (menuId: string) => {
    if (!id) return;
    const menuObj = menus.find(m => m._id === menuId);
    if (!menuObj) return;

    if (!newMenuItemForm.label.trim()) {
      toast.error('Label is required');
      return;
    }
    if (newMenuItemForm.actionType === 'template' && !newMenuItemForm.templateId) {
      toast.error('Please select a target template');
      return;
    }
    if (newMenuItemForm.actionType === 'flow' && !newMenuItemForm.flowStepId) {
      toast.error('Please select a target flow step');
      return;
    }
    if (newMenuItemForm.actionType === 'menu' && !newMenuItemForm.subMenuId) {
      toast.error('Please select a target submenu');
      return;
    }

    const newItem: ChatbotMenuItem = {
      label: newMenuItemForm.label,
      description: newMenuItemForm.description || undefined,
      order: newMenuItemForm.order,
      actionType: newMenuItemForm.actionType,
      templateId: (newMenuItemForm.actionType === 'template' && newMenuItemForm.templateId) ? newMenuItemForm.templateId : undefined,
      flowStepId: (newMenuItemForm.actionType === 'flow' && newMenuItemForm.flowStepId) ? newMenuItemForm.flowStepId : undefined,
      subMenuId: (newMenuItemForm.actionType === 'menu' && newMenuItemForm.subMenuId) ? newMenuItemForm.subMenuId : undefined,
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
  }, [id, menus, newMenuItemForm]);

  const handleDeleteMenuItem = useCallback(async (menuId: string, idx: number) => {
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
  }, [id, menus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
      </div>
    );
  }

  return (
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
            <AsyncSelect
              value={newMenuForm.keywordId || ''}
              onChange={val => setNewMenuForm(prev => ({ ...prev, keywordId: val }))}
              onSearch={searchKeywords}
              defaultLabel={keywords.find(k => k._id === newMenuForm.keywordId)?.keyword}
              placeholder="(Click Option - Submenu only)"
              className="w-full"
            />
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
                  'glass-card transition-all duration-300',
                  isExpanded ? 'border-accent-purple/30 bg-slate-900/10' : 'border-white/5 overflow-hidden'
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
                      initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                      animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                      exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-white/5 relative"
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
                                  <AsyncSelect
                                    value={newMenuItemForm.templateId}
                                    onChange={val => setNewMenuItemForm(prev => ({ ...prev, templateId: val }))}
                                    onSearch={searchTemplates}
                                    defaultLabel={templates.find(t => t._id === newMenuItemForm.templateId)?.name}
                                    placeholder="(Select response template)"
                                    className="w-full text-xs"
                                  />
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
  );
});
