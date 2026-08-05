import React, { useState } from 'react';
import { useIdealyStore, type IdealyConnectors } from '@/stores/idealyStore';
import { Save, Check, ExternalLink } from 'lucide-react';

type Connector = {
  id: string;
  name: string;
  description: string;
  link: string;
  price: string;
  fields: Array<{ key: keyof IdealyConnectors; label: string; placeholder: string; secret?: boolean }>;
};

const CONNECTORS: Connector[] = [
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Déploiement en un clic de vos projets front-end.',
    link: 'https://vercel.com/account/tokens',
    price: 'Hobby Gratuit',
    fields: [
      { key: 'vercelToken', label: 'Access Token', placeholder: 'vk1_xxxxxxxxxxxxxxxxxxx', secret: true }
    ]
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Backend as a Service (Postgres, Auth, Storage).',
    link: 'https://supabase.com/dashboard/project/_/settings/api',
    price: 'Plan Gratuit Généreux',
    fields: [
      { key: 'supabaseUrl', label: 'Project URL', placeholder: 'https://xxxx.supabase.co' },
      { key: 'supabaseAnonKey', label: 'Anon Public Key', placeholder: 'eyJh...', secret: true }
    ]
  },
  {
    id: 'firebase',
    name: 'Firebase',
    description: 'Plateforme Google (Firestore, Auth, Hosting).',
    link: 'https://console.firebase.google.com/',
    price: 'Plan Spark Gratuit',
    fields: [
      { key: 'firebaseConfig', label: 'Config JSON', placeholder: '{"apiKey": "...", ...}' }
    ]
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Sauvegarde du code source et CI/CD.',
    link: 'https://github.com/settings/tokens',
    price: 'Gratuit',
    fields: [
      { key: 'githubToken', label: 'Personal Access Token', placeholder: 'ghp_xxxxxxxxxxxxxxxxxxx', secret: true }
    ]
  },
  {
    id: 'clerk',
    name: 'Clerk',
    description: 'Authentification complète et gestion utilisateurs.',
    link: 'https://dashboard.clerk.com/',
    price: 'Jusqu\'à 10,000 MAUs gratuit',
    fields: [
      { key: 'clerkSecretKey', label: 'Secret Key', placeholder: 'sk_test_...', secret: true }
    ]
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Paiements en ligne et abonnements.',
    link: 'https://dashboard.stripe.com/apikeys',
    price: 'Pay as you go (frais de transaction)',
    fields: [
      { key: 'stripeSecretKey', label: 'Secret Key', placeholder: 'sk_test_...', secret: true }
    ]
  },
];

export function ConnectorsPanel() {
  const connectors = useIdealyStore(s => s.connectors);
  const updateConnectors = useIdealyStore(s => s.updateConnectors);
  const [expanded, setExpanded] = useState<string | null>(null);
  
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleExpand = (id: string) => {
    setExpanded(id === expanded ? null : id);
    setLocalValues({});
    setSavedMsg(null);
  };

  const handleSave = (id: string) => {
    updateConnectors(localValues);
    setSavedMsg(id);
    setTimeout(() => setSavedMsg(null), 2000);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Connecteurs Externes</h3>
        <p className="text-xs text-ink-400 mt-1">Configurez vos clés API pour qu'Idealy puisse interagir avec ces services lors de la construction ou du déploiement.</p>
      </div>

      <div className="space-y-3">
        {CONNECTORS.map(connector => {
          const isExpanded = expanded === connector.id;
          const hasData = connector.fields.some((field) => Boolean(connectors[field.key]));

          return (
            <div key={connector.id} className={`rounded-xl border transition-all ${isExpanded ? 'border-electric-500/30 bg-white/5' : 'border-white/5 bg-ink-900/30 hover:border-white/10'}`}>
              <div 
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => handleExpand(connector.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white text-xs">
                    {connector.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      {connector.name}
                      {hasData && <Check size={12} className="text-green-400" />}
                    </div>
                    <div className="text-[11px] text-ink-400">{connector.description}</div>
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-white/5 text-ink-300">
                  {connector.price}
                </div>
              </div>

              {isExpanded && (
                <div className="p-3 pt-0 border-t border-white/5 mt-2">
                  <div className="flex items-center justify-between mb-3 pt-2">
                    <span className="text-xs text-ink-300">Configuration</span>
                    <a 
                      href={connector.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-electric-400 hover:text-electric-300 flex items-center gap-1"
                    >
                      Obtenir les clés <ExternalLink size={12} />
                    </a>
                  </div>
                  
                  <div className="space-y-3">
                    {connector.fields.map(field => {
                      const value = localValues[field.key] !== undefined 
                        ? localValues[field.key] 
                        : connectors[field.key] || '';
                        
                      return (
                        <div key={field.key}>
                          <label className="block text-[11px] text-ink-400 mb-1">{field.label}</label>
                          <input 
                            type={field.secret ? "password" : "text"}
                            value={value}
                            onChange={(e) => setLocalValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-ink-600 focus:outline-none focus:border-electric-500/50"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={() => handleSave(connector.id)}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition"
                    >
                      {savedMsg === connector.id ? (
                        <><Check size={14} className="text-green-400" /> Sauvegardé</>
                      ) : (
                        <><Save size={14} /> Enregistrer</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
