import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Logo } from '@/components/Brand';
import { WAYS, WAY_LIST, type WayId } from '@/lore/ways';
import { useIdealyStore } from '@/stores/idealyStore';

export function OnboardingPage() {
  const setWay = useIdealyStore((s) => s.setWay);
  const setProfile = useIdealyStore((s) => s.setProfile);
  const completeOnboarding = useIdealyStore((s) => s.completeOnboarding);
  const profile = useIdealyStore((s) => s.profile);

  const [step, setStep] = useState<'way' | 'profile'>('way');
  const [selected, setSelected] = useState<WayId | null>(null);
  const [name, setName] = useState(profile?.displayName ?? '');
  const [team, setTeam] = useState('Solo');
  const [role, setRole] = useState('Créateur de produit');
  const [source, setSource] = useState('Une recommandation');

  function chooseWay(id: WayId) {
    setSelected(id);
    setWay(id);
  }

  function next() {
    if (selected) setStep('profile');
  }

  function finish() {
    setProfile({
      email: profile?.email ?? 'apprenti@idealy.studio',
      displayName: name || 'Apprenti',
      avatarHue: profile?.avatarHue ?? Math.floor(Math.random() * 360),
    });
    completeOnboarding();
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-electric-600/10 blur-[120px]" />
      </div>

      <header className="mx-auto max-w-7xl px-5 pt-6">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3 text-xs text-ink-400">
            <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-white/10 sm:block" aria-label={`Progression ${step === 'way' ? '50' : '100'} pour cent`}><motion.div className="h-full rounded-full bg-gradient-to-r from-electric-400 to-ember-400" animate={{ width: step === 'way' ? '50%' : '100%' }} /></div>
            <span className={step === 'way' ? 'text-white' : 'text-ink-500'}>1. Voie</span>
            <span className="text-ink-600">/</span>
            <span className={step === 'profile' ? 'text-white' : 'text-ink-500'}>2. Profil</span>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 'way' ? (
          <motion.div
            key="way"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-6xl px-5 py-12"
          >
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-semibold text-white md:text-5xl">
                Choisissez votre voie
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-ink-300">
                Choisissez la façon dont Idealy vous accompagne. Cela change le ton, le rythme et les suggestions — jamais votre capacité à créer.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {WAY_LIST.map((w, i) => {
                const isSelected = selected === w.id;
                return (
                  <motion.button
                    key={w.id}
                    onClick={() => chooseWay(w.id)}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -6 }}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`Choisir ${w.name} : ${w.tagline}`}
                    className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
                      isSelected
                        ? `${w.borderClass} ${w.glowClass}`
                        : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="aspect-[4/5] overflow-hidden">
                      <img
                        src={w.image}
                        alt={w.name}
                        className="h-full w-full object-cover opacity-55 transition duration-700 group-hover:scale-105 group-hover:opacity-75"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full ${w.primaryClass} text-ink-950`}
                      >
                        <Check size={15} strokeWidth={3} />
                      </motion.div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className={`mb-2 h-1 w-10 rounded-full ${w.primaryClass}`} />
                      <h3 className="text-lg font-semibold text-white">{w.name}</h3>
                      <p className="mt-1 text-xs text-ink-300">{w.tagline}</p>
                      <p className="mt-3 text-[11px] text-ink-400">
                        Énergie : <span className={w.textClass}>{w.energy}</span>
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-10 flex items-center justify-between">
              <div className="text-sm text-ink-400">
                {selected
                  ? `Voie sélectionnée : ${WAYS[selected].name}`
                  : 'Sélectionnez une voie pour continuer'}
              </div>
              <button
                onClick={next}
                disabled={!selected}
                className="btn-primary px-6"
              >
                Suivant
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-lg px-5 py-16"
          >
            {selected && (
              <>
                <div className="mb-8 text-center">
                  <div className={`mx-auto mb-4 h-1 w-12 rounded-full ${WAYS[selected].primaryClass}`} />
                  <h1 className="text-3xl font-semibold text-white">
                    Bienvenue, {WAYS[selected].vocab.task === 'Mission' ? 'Genin' : 'Apprenti'}
                  </h1>
                  <p className="mt-3 text-ink-300">
                    Quelques détails pour personnaliser votre espace sans vous ralentir.
                  </p>
                </div>

                <div className="card p-6">
                  <label className="mb-2 block text-sm text-ink-200">
                    Comment devons-nous vous appeler ?
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex : Marie, Studio Nova, Alex..."
                    className="input"
                    autoFocus
                  />

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <label className="text-xs text-ink-400">Vous êtes
                      <select value={team} onChange={(event) => setTeam(event.target.value)} className="input mt-1.5 w-full text-xs"><option>Solo</option><option>Une petite équipe</option><option>Une équipe produit</option></select>
                    </label>
                    <label className="text-xs text-ink-400">Votre rôle
                      <select value={role} onChange={(event) => setRole(event.target.value)} className="input mt-1.5 w-full text-xs"><option>Créateur de produit</option><option>Designer</option><option>Développeur</option><option>Fondateur</option></select>
                    </label>
                    <label className="text-xs text-ink-400">Vous nous avez trouvé via
                      <select value={source} onChange={(event) => setSource(event.target.value)} className="input mt-1.5 w-full text-xs"><option>Une recommandation</option><option>Recherche web</option><option>Réseaux sociaux</option><option>Un événement</option></select>
                    </label>
                  </div>

                  <div className="mt-5 rounded-xl bg-white/5 p-4">
                    <p className="text-xs text-ink-400">Voici votre première interaction</p>
                    <p className="mt-1.5 text-sm leading-6 text-ink-100">
                      <span className={WAYS[selected].textClass}>
                        {WAYS[selected].agents[0].name}
                      </span>
                      {' '}vous aidera à transformer une idée en plan clair, puis en première version testable.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button onClick={() => setStep('way')} className="btn-ghost">
                    <ArrowLeft size={16} />
                    Retour
                  </button>
                  <button onClick={finish} className="btn-primary px-6">
                    Entrer dans le quartier général
                    <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
