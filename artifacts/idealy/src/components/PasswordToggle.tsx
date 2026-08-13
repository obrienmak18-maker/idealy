import { Eye, EyeOff } from 'lucide-react';

interface PasswordToggleProps {
  visible: boolean;
  onClick: () => void;
}

export function PasswordToggle({ visible, onClick }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white transition"
      aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}