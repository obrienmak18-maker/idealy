import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Heart, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Brand';
import { WAYS, WAY_LIST, type WayId } from '@/lore/ways';
import { useIdealyStore } from '@/stores/idealyStore';

type OnboardingStep = 'way' | 'profile' | 'context';

type Choice = {
  label: string;
  value: string;
};

const TEAM_SIZES: Choice[] = [
  { label: 'Moi seul', value: 'solo' },
  { label: '2 à 10 personnes', value: '2-10' },
  { label: '11 à 50 personnes', value: '11-50' },
  { label: '51 personnes ou plus', value: '51-plus' },
];

const ROLES: Choice[] = [
  { label: 'Fondateur ou dirigeant', value: 'founder' },
  { label: 'Indépendant ou freelance', value: 'freelance' },
  { label: 'Produit ou design', value: 'product-design' },
  { label: 'Développement ou technique', value: 'engineering' },
  { label: 'Étudiant ou curieux', value: 'learner' },
];

const DISCOVERY_SOURCES: Choice[] = [
  { label: 'Une recommandation', value: 'recommendation' },
  { label: 'Une recherche sur internet', value: 'search' },
  { label: 'Une vidéo ou une démonstration', value: 'video' },
  { label: 'Une communauté ou un événement', value: 'community' },
  { label: 'Autre', value: 'other' },
];

export function OnboardingPage() {
  const setWay = useIdealyStore((s) => s.setWay);
  const setProfile = useIdealyStore((s) => s.setProfile);
  const completeOnboarding = useIdealyStore((s) => s.completeOnboarding);
  const profile = useIdealyStore((s) => s.profile);
  const reducedMotion = useReducedMotion();

  const [step, setStep] = useState<OnboardingStep>('way');
  const [selected, setSelected] = useState<WayId | null>(null);
  const [name, setName] = useState(profile?.displayName ?? '');
  const [teamSize, setTeamSize] = useState('');
  const [role, setRole] = useState('');
  const [heardFrom, setHeardFrom] = useState('');
  const [pulse, setPulse] = useState(0);

  const stepIndex = step === 'way' ? 1 : step === 'profile' ? 2 : 3;
  const canContinue = step === 'way'
    ? Boolean(selected)
    : step === 'profile'
      ? Boolean(name.trim())
      : Boolean(teamSize && role && heardFrom);

  const selectedWay = selected ? WAYS[selected] : null;
  const selectedWayName = useMemo(() => (selected ? WAYS[selected].name : 'ta voie'), [selected]);

  function chooseWay(id: WayId) {
    setSelected(id);
    setWay(id);
    setPulse((value) => value + 1);
  }

  function continueStep() {
    if (!canContinue) return;
    if (step === 'way') setStep('profile');
    else if (step === 'profile') setStep('context');
    else finish();
  }

  function finish() {
    setProfile({
      email: profile?.email ?? 'apprenti@idealy.studio',
      displayName: name.trim() || 'Apprenti',
      avatarHue: profile?.avatarHue ?? Math.floor(Math.random() * 360),
    });
    completeOnboarding();
  }

  function goBack() {
    if (step === 'profile') setStep('way');
    if (step === 'context') setStep('profile');
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0d0c12] text-[#f4f4f5]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(246,178,212,0.13),transparent_34%),radial-gradient(circle_at_12%_80%,rgba(142,222,226,0.08),transparent_28%)]" />

      <header className="mx-auto max-w-7xl px-5 pt-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3 text-xs text-[#8b8795]" aria-label={`Étape ${stepIndex} sur 3`}>
            <motion.div
              key={pulse}
              animate={reducedMotion ? undefined : { scale: [1, 1.14, 1] }}
              transition={{ duration: 0.48, ease: 'easeOut' }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#4c3546] bg-[#19141d] text-[#f6b2d4]"
            >
              <Heart className="h-3.5 w-3.5 fill-current" />
            </motion.div>
            <span className="hidden sm:inline">Ton espace prend forme</span>
            <span className="tabular-nums text-[#d9d0d8]">{stepIndex} / 3</span>
          </div>
        </div>
        <div className="mt-5 h-px bg-[#2c2731]">
          <motion.div
            className="h-px bg-gradient-to-r from-[#f6b2d4] via-[#f3d27a] to-[#8edee2]"
            initial={false}
            animate={{ width: `${(stepIndex / 3) * 100}%` }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 'way' && (
          <motion.div
            key="way"
            initial={reducedMotion ? undefined : { opacity: 0, x: 20 }}
            animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-6xl px-5 py-12 sm:px-8"
          >
            <div className="mb-10 text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#f6b2d4]">Première rencontre</p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#fff8fc] md:text-5xl">Choisis ta voie</h1>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#b4acb6]">
                Pas un niveau de prix. Une manière de créer, un vocabulaire et une énergie qui te ressemblent.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {WAY_LIST.map((w, i) => {
                const isSelected = selected === w.id;
                return (
                  <motion.button
                    key={w.id}
                    type="button"
                    onClick={() => chooseWay(w.id)}
                    initial={reducedMotion ? undefined : { opacity: 0, y: 18 }}
                    animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ delay: reducedMotion ? 0 : i * 0.06, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={reducedMotion ? undefined : { y: -4 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                    className={`group relative overflow-hidden rounded-2xl border text-left transition-colors duration-200 ${
                      isSelected ? `${w.borderClass} ${w.glowClass}` : 'border-[#302a34] hover:border-[#665063]'
                    }`}
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-[#19151d]">
                      <img src={w.image} alt={w.name} className="h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-105 group-hover:opacity-75" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0c12] via-[#0d0c12]/45 to-transparent" />
                    {isSelected && (
                      <motion.div
                        initial={reducedMotion ? undefined : { scale: 0.8, opacity: 0 }}
                        animate={reducedMotion ? undefined : { scale: 1, opacity: 1 }}
                        className={`absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full ${w.primaryClass} text-[#0d0c12]`}
                      >
                        <Check size={15} strokeWidth={3} />
                      </motion.div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className={`mb-2 h-1 w-10 rounded-full ${w.primaryClass}`} />
                      <h3 className="text-lg font-semibold text-white">{w.name}</h3>
                      <p className="mt-1 text-xs text-[#c4bac5]">{w.tagline}</p>
                      <p className="mt-3 text-[11px] text-[#8b8795]">Énergie : <span className={w.textClass}>{w.energy}</span></p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-10 flex items-center justify-between gap-4">
              <div className="text-sm text-[#8b8795]">{selected ? `Voie sélectionnée : ${WAYS[selected].name}` : 'Sélectionne une voie pour continuer'}</div>
              <button type="button" onClick={continueStep} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f6b2d4] to-[#f3d27a] px-5 py-2.5 text-sm font-semibold text-[#1a1219] transition-opacity disabled:cursor-not-allowed disabled:opacity-35">
                Continuer <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'profile' && selectedWay && (
          <motion.div
            key="profile"
            initial={reducedMotion ? undefined : { opacity: 0, x: 20 }}
            animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-xl px-5 py-16 sm:px-8"
          >
            <div className="mb-8 text-center">
              <div className={`mx-auto mb-4 h-1 w-12 rounded-full ${selectedWay.primaryClass}`} />
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#fff8fc]">Comment allons-nous t’appeler&nbsp;?</h1>
              <p className="mt-3 text-sm leading-6 text-[#b4acb6]">Ton nom apparaîtra dans les messages de tes agents.</p>
            </div>

            <div className="rounded-2xl border border-[#332b37] bg-[#17141c] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
              <label className="mb-2 block text-sm text-[#eee4ed]" htmlFor="specialist-name">Nom de spécialiste</label>
              <input id="specialist-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Amina, Naruto, Chris…" className="w-full rounded-xl border border-[#403644] bg-[#0f0d13] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#746b78] focus:border-[#f6b2d4]" autoFocus />
              <div className="mt-5 rounded-xl border border-[#302a34] bg-[#0f0d13] p-4">
                <p className="text-xs text-[#8b8795]">Aperçu de ta première conversation</p>
                <p className="mt-2 text-sm leading-6 text-[#eee4ed]"><span className={selectedWay.textClass}>{selectedWay.agents[0].name}</span> — « {name || 'Apprenti'}, que voulons-nous construire aujourd’hui&nbsp;? »</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button" onClick={goBack} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#a79eaa] hover:bg-white/5 hover:text-white"><ArrowLeft size={16} /> Retour</button>
              <button type="button" onClick={continueStep} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f6b2d4] to-[#f3d27a] px-5 py-2.5 text-sm font-semibold text-[#1a1219] transition-opacity disabled:cursor-not-allowed disabled:opacity-35">Continuer <ArrowRight size={16} /></button>
            </div>
          </motion.div>
        )}

        {step === 'context' && selectedWay && (
          <motion.div
            key="context"
            initial={reducedMotion ? undefined : { opacity: 0, x: 20 }}
            animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl px-5 py-12 sm:px-8"
          >
            <div className="mb-8 text-center">
              <Sparkles className="mx-auto mb-4 h-5 w-5 text-[#8edee2]" />
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#fff8fc]">Pour mieux t’accompagner</h1>
              <p className="mt-3 text-sm leading-6 text-[#b4acb6]">Trois réponses suffisent. Elles servent à personnaliser ton premier espace, sans te faire perdre du temps.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {[
                { title: 'Combien êtes-vous ?', value: teamSize, setValue: setTeamSize, choices: TEAM_SIZES },
                { title: 'Quel est ton rôle ?', value: role, setValue: setRole, choices: ROLES },
                { title: 'Comment nous as-tu connus ?', value: heardFrom, setValue: setHeardFrom, choices: DISCOVERY_SOURCES },
              ].map((group) => (
                <div key={group.title} className="rounded-2xl border border-[#332b37] bg-[#17141c] p-4">
                  <h2 className="mb-3 text-sm font-medium text-[#eee4ed]">{group.title}</h2>
                  <div className="space-y-2">
                    {group.choices.map((choice) => {
                      const active = group.value === choice.value;
                      return (
                        <button key={choice.value} type="button" onClick={() => { group.setValue(choice.value); setPulse((value) => value + 1); }} className={`w-full rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${active ? 'border-[#8edee2] bg-[#143237] text-[#baf1ef]' : 'border-[#302a34] bg-[#0f0d13] text-[#a79eaa] hover:border-[#665063] hover:text-white'}`}>
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button type="button" onClick={goBack} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#a79eaa] hover:bg-white/5 hover:text-white"><ArrowLeft size={16} /> Retour</button>
              <button type="button" onClick={continueStep} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f6b2d4] to-[#f3d27a] px-5 py-2.5 text-sm font-semibold text-[#1a1219] transition-opacity disabled:cursor-not-allowed disabled:opacity-35">Entrer dans Idealy <ArrowRight size={16} /></button>
            </div>
            <p className="mt-4 text-center text-[11px] text-[#746b78]">Tu pourras modifier ces réponses plus tard. L’authentification réelle sera branchée séparément.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
