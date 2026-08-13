import { useEffect, useState } from 'react';
import { Check, ChevronDown, ExternalLink, LockKeyhole, Plug, ShieldCheck, TestTube2 } from 'lucide-react';
import { CONNECTOR_REGISTRY, type ConnectorDefinition, type ConnectorEnvironment } from '@/core/connectors/registry';
import { useIdealyStore } from '@/stores/idealyStore';
import { getSupabaseClient } from '@/supabaseClient';

const publicFields = [
  { key: 'supabaseUrl' as const, label: 'Project URL', placeholder: 'https://xxxx.supabase.co' },
  { key: 'supabaseAnonKey' as const, label: 'Publishable / anon key', placeholder: 'eyJ...' },
];

export function ConnectorsPanel() {
  const connectors = useIdealyStore((state) => state.connectors);
  const updateConnectors = useIdealyStore((state) => state.updateConnectors);
  const [expanded, setExpanded] = useState<string | null>('supabase');
  const [environment, setEnvironment] = useState<ConnectorEnvironment>('test');
  const [localSupabase, setLocalSupabase] = useState({
    supabaseUrl: connectors.supabaseUrl ?? '',
    supabaseAnonKey: connectors.supabaseAnonKey ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [serverConnected, setServerConnected] = useState<Set<string>>(new Set());
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      setStatusLoading(true);
      try {
        const { data } = await supabase.functions.invoke('integration-status', { body: {} });
        if (!cancelled && Array.isArray(data?.integrations)) {
          setServerConnected(new Set(data.integrations.map((item: { provider: string }) => item.provider)));
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    };
    void loadStatus();
    return () => { cancelled = true; };
  }, []);

  const saveSupabasePublicConfig = () => {
    updateConnectors(localSupabase);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="h-full overflow-y-auto p-4 scrollbar-thin">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <Plug size={16} className="text-electric-300" />
          <h3 className="text-sm font-semibold text-white">Capacités et connecteurs</h3>
        </div>
        <p className="mt-2 max-w-xl text-xs leading-5 text-ink-400">
          Idealy ne demande pas une clé pour chaque action. Il vérifie un environnement, expose des capacités précises et garde les secrets serveur hors du navigateur.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2">
          <TestTube2 size={15} className="text-amber-300" />
          <div>
            <p className="text-xs font-medium text-white">Environnement actif</p>
            <p className="text-[10px] text-ink-500">Les tests ne touchent pas la production.</p>
          </div>
        </div>
        <select value={environment} onChange={(event) => setEnvironment(event.target.value as ConnectorEnvironment)} className="rounded-lg border border-white/10 bg-ink-950 px-2 py-1.5 text-xs text-white outline-none">
          <option value="test">Test / sandbox</option>
          <option value="production">Production</option>
        </select>
      </div>

      <div className="space-y-3">
        {CONNECTOR_REGISTRY.map((connector) => {
          const isOpen = expanded === connector.id;
          const isSupabase = connector.id === 'supabase';
          const stateLabel = serverConnected.has(connector.id) ? 'OAuth connecté côté serveur' : isSupabase && localSupabase.supabaseUrl ? 'Configuration publique enregistrée' : connector.secretHandling === 'oauth' ? (statusLoading ? 'Vérification de la connexion...' : 'Connexion OAuth à autoriser') : connector.secretHandling === 'server-managed' ? 'Secret géré côté serveur' : 'Configuration requise';

          return (
            <section key={connector.id} className={`rounded-xl border transition ${isOpen ? 'border-electric-400/30 bg-white/[0.04]' : 'border-white/10 bg-ink-900/40'}`}>
              <button onClick={() => setExpanded(isOpen ? null : connector.id)} className="flex w-full items-center justify-between gap-3 p-3 text-left">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-semibold text-white">{connector.name[0]}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      {connector.name}
                      {(serverConnected.has(connector.id) || (isSupabase && localSupabase.supabaseUrl)) && <Check size={13} className="text-emerald-400" />}
                    </div>
                    <p className="truncate text-[11px] text-ink-400">{connector.description}</p>
                  </div>
                </div>
                <ChevronDown size={15} className={`shrink-0 text-ink-500 transition ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="border-t border-white/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-ink-200">{stateLabel}</p>
                      <p className="mt-1 text-[11px] leading-4 text-ink-500">{connector.capabilities.length} capacité(s) déclarée(s) pour {environment}.</p>
                    </div>
                    <a href={connector.setupUrl} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 text-[11px] text-electric-300 hover:text-electric-200">Documentation <ExternalLink size={11} /></a>
                  </div>

                  {isSupabase ? (
                    <>
                      <div className="mt-4 grid gap-3">
                        {publicFields.map((field) => (
                          <label key={field.key} className="block">
                            <span className="mb-1 block text-[11px] text-ink-400">{field.label}</span>
                            <input
                              type={field.key === 'supabaseAnonKey' ? 'password' : 'url'}
                              value={localSupabase[field.key]}
                              onChange={(event) => setLocalSupabase((current) => ({ ...current, [field.key]: event.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-xs text-white outline-none placeholder:text-ink-600 focus:border-electric-400/60"
                            />
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="flex items-center gap-1.5 text-[10px] leading-4 text-ink-500"><ShieldCheck size={12} className="text-emerald-400" /> Ces deux valeurs sont publiques côté client.</p>
                        <button onClick={saveSupabasePublicConfig} className="btn-primary px-3 py-1.5 text-xs">{saved ? 'Enregistré' : 'Enregistrer'}</button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 rounded-lg bg-amber-400/10 px-3 py-2.5 text-xs leading-5 text-amber-100">
                      <div className="flex items-start gap-2"><LockKeyhole size={14} className="mt-0.5 shrink-0 text-amber-300" /><span>La clé privée ne doit pas être saisie dans l’application. Cette connexion passera par OAuth ou par une fonction serveur lorsqu’elle sera activée.</span></div>
                    </div>
                  )}

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {connector.capabilities.map((capability) => (
                      <div key={capability.id} className="rounded-lg border border-white/5 bg-ink-950/60 p-2.5">
                        <p className="text-xs font-medium text-ink-200">{capability.label}</p>
                        <p className="mt-1 text-[10px] leading-4 text-ink-500">{capability.description}</p>
                        <p className="mt-1.5 font-mono text-[10px] text-electric-300/80">{capability.permission}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
