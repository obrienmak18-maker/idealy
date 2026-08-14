import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info, Link as LinkIcon, Palette, Shield, Sliders, Users, X } from 'lucide-react';
import { useIdealyStore } from '@/stores/idealyStore';
import { WAYS, type WayId } from '@/lore/ways';
import { ConnectorsPanel } from '@/components/workspace/ConnectorsPanel';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type SettingsTab = 'api' | 'connectors' | 'voie' | 'general' | 'about';

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('api');
  const currentWay = useIdealyStore((state) => state.way);
  const setWay = useIdealyStore((state) => state.setWay);

  useEffect(() => {
    if (open) setActiveTab('api');
  }, [open]);

  const save = () => onClose();

  const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Sliders }> = [
    { id: 'api', label: 'Moteurs IA', icon: Sliders },
    { id: 'connectors', label: 'Connecteurs', icon: LinkIcon },
    { id: 'voie', label: 'Voie (Univers)', icon: Users },
    { id: 'general', label: 'Apparence', icon: Palette },
    { id: 'about', label: 'À propos', icon: Info },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="fixed left-1/2 top-1/2 z-50 flex h-[550px] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl glass shadow-2xl">
            <aside className="w-56 shrink-0 border-r border-white/5 bg-ink-950/30 p-4">
              <h2 className="mb-6 px-2 text-lg font-semibold text-white">Centre de contrôle</h2>
              <div className="flex flex-col gap-1">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${activeTab === tab.id ? 'bg-electric-600/20 text-electric-300' : 'text-ink-400 hover:bg-white/5 hover:text-white'}`}>
                    <tab.icon size={16} /> {tab.label}
                  </button>
                ))}
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">{tabs.find((tab) => tab.id === activeTab)?.label}</h3>
                <button onClick={onClose} className="rounded-lg p-2 text-ink-400 transition hover:bg-white/5 hover:text-white"><X size={18} /></button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                {activeTab === 'api' && (
                  <div className="space-y-5">
                    <div className="flex gap-3 rounded-xl border border-electric-500/20 bg-electric-500/10 p-4 text-sm leading-5 text-electric-200">
                      <Shield className="mt-0.5 shrink-0" size={16} />
                      <p>Les moteurs IA sont appelés par les Edge Functions d’Idealy. Aucune clé OpenRouter, Groq ou autre fournisseur n’est demandée ni stockée dans le navigateur.</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-ink-300">Le modèle, les quotas et les secrets de fournisseur sont gérés côté serveur. L’application générée reçoit uniquement les résultats nécessaires à la mission.</div>
                  </div>
                )}

                {activeTab === 'connectors' && <ConnectorsPanel />}

                {activeTab === 'voie' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-200">Les quatre voies changent l’univers, les agents et le vocabulaire de la même expérience de création. Elles ne constituent pas des niveaux techniques ou tarifaires.</div>
                    <div className="grid gap-3">{(Object.entries(WAYS) as [WayId, (typeof WAYS)[WayId]][]).map(([id, way]) => (
                      <button key={id} onClick={() => setWay(id)} className={`rounded-xl border p-4 text-left transition ${currentWay === id ? 'border-electric-500 bg-electric-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                        <div className="flex items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${way.primaryClass}`}><Users size={20} className="text-ink-950" /></div><div><h4 className={`text-base font-semibold ${currentWay === id ? 'text-electric-300' : 'text-white'}`}>{way.name}</h4><p className="mt-1 text-xs text-ink-400">{way.tagline} · {way.agents.map((agent) => agent.name).join(', ')}</p></div></div>
                      </button>
                    ))}</div>
                  </div>
                )}

                {activeTab === 'general' && (
                  <div className="space-y-5"><div><h4 className="mb-3 text-sm font-medium text-white">Thème visuel</h4><button className="rounded-xl border border-electric-500 bg-electric-500/10 px-4 py-3 text-sm font-medium text-electric-300">Sombre (défaut)</button></div><div><h4 className="mb-3 text-sm font-medium text-white">Langue des agents</h4><select className="input max-w-xs"><option>Français</option><option>Anglais</option><option>Japonais (univers manga)</option></select></div></div>
                )}

                {activeTab === 'about' && (
                  <div className="flex flex-col items-center justify-center py-8 text-center"><div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-electric-400 to-indigo-600 text-2xl font-bold text-white">ID</div><h3 className="text-2xl font-bold text-white">Idealy</h3><p className="mt-1 text-sm text-ink-400">Studio IA de création d’applications</p><p className="mt-4 max-w-md text-sm leading-6 text-ink-300">Une mission, un univers, une équipe d’agents et une application que l’on peut comprendre, tester et publier.</p></div>
                )}
              </div>

              <div className="mt-4 flex shrink-0 justify-end border-t border-white/5 pt-4"><button onClick={save} className="btn-primary">Enregistrer</button></div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
