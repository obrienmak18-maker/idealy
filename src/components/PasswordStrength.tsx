import type { PasswordStrength } from '@/hooks/useAuth';

interface PasswordStrengthProps {
  strength: PasswordStrength;
}

export function PasswordStrength({ strength }: PasswordStrengthProps) {
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < strength.score ? strength.color : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-ink-400">
        Force du mot de passe : <span className={`font-medium ${strength.score <= 1 ? 'text-red-400' : strength.score === 2 ? 'text-yellow-400' : 'text-green-400'}`}>{strength.label}</span>
      </p>
    </div>
  );
}