import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Shield, Info, Palette, Users, Sliders, Database, Link as LinkIcon, Cloud } from 'lucide-react';
import { useIdealyStore } from '@/stores/idealyStore';
import { WAYS, type WayId } from '@/lore/ways';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'api' | 'connectors' | 'voie' | 'general' | 'about'>('api');
  
  // API Keys state
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [groqKey, setGroqKey] = useState('');

  // Connectors State
  const connectors = useIdealyStore((s) => s.connectors);
  const updateConnectors = useIdealyStore((s) => s.updateConnectors);
  
  const [localConnectors, setLocalConnectors] = useState({
    vercelToken: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    stripeSecretKey: '',
    webcontainerKey: '',
  });

  // App State
  const currentWay = useIdealyStore((s) => s.way);
  const setWay = useIdealyStore((s) => s.setWay);

  useEffect(() => {
    if (open) {
      setOpenRouterKey(localStorage.getItem('IDEALY_OPENROUTER_KEY') || '');
      setGroqKey(localStorage.getItem('IDEALY_GROQ_KEY') || '');
      
      setLocalConnectors({
        vercelToken: connectors.vercelToken || '',
        supabaseUrl: connectors.supabaseUrl || '',
        supabaseAnonKey: connectors.supabaseAnonKey || '',
        stripeSecretKey: connectors.stripeSecretKey || '',
        webcontainerKey: connectors.webcontainerKey || '',
      });
    }
  }, [open, connectors]);

  const save = () => {
    if (openRouterKey.trim()) localStorage.setItem('IDEALY_OPENROUTER_KEY', openRouterKey.trim());
    else localStorage.removeItem('IDEALY_OPENROUTER_KEY');

    if (groqKey.trim()) localStorage.setItem('IDEALY_GROQ_KEY', groqKey.trim());
    else localStorage.removeItem('IDEALY_GROQ_KEY');

    updateConnectors(localConnectors);

    onClose();
  };

  const tabs = [
    { id: 'api', label: 'Moteurs IA', icon: Sliders },
    { id: 'connectors', label: 'Connecteurs', icon: LinkIcon },
    { id: 'voie', label: 'Voie (Univers)', icon: Users },
    { id: 'general', label: 'Apparence', icon: Palette },
    { id: 'about', label: 'À Propos', icon: Info },
  ] as const;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 z-50 flex h-[550px] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl glass shadow-2xl"
          >
            {/* Sidebar */}
            <div className="w-56 shrink-0 border-r border-white/5 bg-ink-950/30 p-4">
              <h2 className="mb-6 px-2 text-lg font-semibold text-white">Centre de Contrôle</h2>
              <div className="flex flex-col gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      activeTab === tab.id
                        ? 'bg-electric-600/20 text-electric-300'
                        : 'text-ink-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <tab.icon size={16} /> {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {tabs.find((t) => t.id === activeTab)?.label}
                </h3>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
                {activeTab === 'api' && (
                  <div className="space-y-6">
                    <div className="rounded-xl bg-electric-500/10 p-4 flex gap-3 text-sm text-electric-200 border border-electric-500/20">
                      <Shield className="shrink-0 mt-0.5" size={16} />
                      <p>
                        Configurez les moteurs d'IA utilisés par Idealy. Les clés sont stockées localement.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink-200">
                          Clé OpenRouter (Raisonnement Complexe - Optionnel)
                        </label>
                        <input
                          type="password"
                          value={openRouterKey}
                          onChange={(e) => setOpenRouterKey(e.target.value)}
                          placeholder="sk-or-v1-..."
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink-200">
                          Clé Groq (Exécution Rapide - Optionnel)
                        </label>
                        <input
                          type="password"
                          value={groqKey}
                          onChange={(e) => setGroqKey(e.target.value)}
                          placeholder="gsk_..."
                          className="input"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'connectors' && (
                  <div className="space-y-6">
                     <p className="text-sm text-ink-300">
                      Connectez Idealy à des services tiers (comme Roq.ai ou Emergent.sh) pour déployer et scaler votre application instantanément.
                    </p>

                    <div className="grid gap-6">
                      <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-4">
                        <h4 className="font-semibold text-white flex items-center gap-2">
                          <Cloud size={16} className="text-blue-400"/> Déploiement & Environnement
                        </h4>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-400">Vercel API Token (Déploiement)</label>
                          <input
                            type="password"
                            value={localConnectors.vercelToken}
                            onChange={(e) => setLocalConnectors({...localConnectors, vercelToken: e.target.value})}
                            placeholder="Entrez votre token Vercel"
                            className="input text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-400">WebContainer API Key (Rendu Live)</label>
                          <input
                            type="password"
                            value={localConnectors.webcontainerKey}
                            onChange={(e) => setLocalConnectors({...localConnectors, webcontainerKey: e.target.value})}
                            placeholder="wc_api_..."
                            className="input text-sm"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-4">
                        <h4 className="font-semibold text-white flex items-center gap-2">
                          <Database size={16} className="text-emerald-400"/> Base de données (Supabase)
                        </h4>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-400">Supabase Project URL</label>
                          <input
                            type="text"
                            value={localConnectors.supabaseUrl}
                            onChange={(e) => setLocalConnectors({...localConnectors, supabaseUrl: e.target.value})}
                            placeholder="https://xyz.supabase.co"
                            className="input text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-400">Supabase Anon Key</label>
                          <input
                            type="password"
                            value={localConnectors.supabaseAnonKey}
                            onChange={(e) => setLocalConnectors({...localConnectors, supabaseAnonKey: e.target.value})}
                            placeholder="eyJ..."
                            className="input text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-4">
                        <h4 className="font-semibold text-white flex items-center gap-2">
                          <Key size={16} className="text-purple-400"/> Paiements (Stripe)
                        </h4>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-400">Stripe Secret/Test Key</label>
                          <input
                            type="password"
                            value={localConnectors.stripeSecretKey}
                            onChange={(e) => setLocalConnectors({...localConnectors, stripeSecretKey: e.target.value})}
                            placeholder="rk_test_..."
                            className="input text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'voie' && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-orange-500/10 p-4 border border-orange-500/20 mb-4">
                      <p className="text-sm text-orange-200">
                        Attention : Vous êtes dans la Voie du {WAYS[currentWay as WayId]?.name || 'Ninja'}. Modifier votre voie écrasera vos préférences de dialogue avec l'IA.
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {(Object.entries(WAYS) as [WayId, typeof WAYS[WayId]][]).map(([id, way]) => (
                        <div
                          key={id}
                          onClick={() => setWay(id)}
                          className={`cursor-pointer rounded-xl border p-4 transition ${
                            currentWay === id
                              ? 'border-electric-500 bg-electric-500/10'
                              : 'border-white/5 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${way.primaryClass}`}>
                              <Users size={20} className="text-ink-950" />
                            </div>
                            <div>
                              <h4 className={`text-base font-semibold ${currentWay === id ? 'text-electric-300' : 'text-white'}`}>
                                {way.name}
                              </h4>
                              <p className="text-xs text-ink-400 mt-1">
                                Énergie : {way.energyUnit} • Membres : {way.agents.map(a => a.name).join(', ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-3">Thème Visuel</h4>
                      <div className="flex gap-3">
                        <button className="rounded-xl border border-electric-500 bg-electric-500/10 px-4 py-3 text-sm text-electric-300 font-medium">
                          Sombre (Défaut)
                        </button>
                        <button className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-ink-400 hover:text-white transition disabled:opacity-50" disabled>
                          Clair (Bientôt)
                        </button>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-3">Langue des Agents</h4>
                      <select className="input max-w-xs">
                        <option value="fr">Français</option>
                        <option value="en">Anglais</option>
                        <option value="jp">Japonais (RP Manga)</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTab === 'about' && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-4 h-20 w-20 rounded-2xl bg-gradient-to-br from-electric-400 to-indigo-600 p-0.5 shadow-lg shadow-electric-600/20">
                      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-ink-950 font-bold text-white text-2xl">
                        ID
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white">Idealy</h3>
                    <p className="mt-1 text-sm text-ink-400">Version 2.0 (Edition PWA & Multi-fichiers)</p>
                    <p className="mt-4 max-w-md text-sm text-ink-300">
                      Un IDE IA de nouvelle génération (inspiré par Cursor, Rork et Emergent.sh), conçu pour offrir une expérience de développement immersive, gamifiée et sans serveur avec des déploiements instantanés Vercel/Netlify.
                    </p>
                    <div className="mt-8 flex gap-4">
                      <a href="#" className="text-sm font-medium text-electric-400 hover:underline">Documentation</a>
                      <a href="#" className="text-sm font-medium text-electric-400 hover:underline">Support</a>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex shrink-0 justify-end gap-3 pt-4 border-t border-white/5">
                <button onClick={onClose} className="btn-ghost">
                  Annuler
                </button>
                <button onClick={save} className="btn-primary">
                  Sauvegarder
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
