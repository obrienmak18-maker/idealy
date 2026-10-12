import React from "react";
import {
  Zap,
  Flame,
  Eye,
  Sparkles,
  Brain,
  Shield,
  ShieldAlert,
  Sword,
  Target,
  Key,
  HeartPulse,
  Award,
  Crown,
  Terminal,
  Code2,
  Palette,
  Layers,
  CheckCheck,
  Radio,
  Bug,
  AlertTriangle,
  FileCode,
  Activity,
  Cloud,
  Compass,
  Cpu,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  // Common / Agents
  alvin: Radio,
  minato: Zap,
  naruto: Flame,
  sasuke: Eye,
  sakura: Sparkles,
  shikamaru: Brain,
  erza: Shield,
  natsu: Flame,
  lucie: Sparkles,
  luxus: Zap,
  mirajane: ShieldAlert,
  netero: Award,
  gon: Target,
  killua: Zap,
  kurapika: Key,
  leolio: HeartPulse,
  daniel: Terminal,
  kevin: Code2,
  leslie: Palette,
  maya: CheckCheck,
  bill: Cloud,

  // Antagonists
  madara: AlertTriangle,
  obito: Activity,
  kaguya: Cpu,
  zabuza: Layers,
  zetsu: Bug,
  acnologia: Flame,
  zelef: Bug,
  "mardy geer": FileCode,
  august: Compass,
  hermes: Radio,
  hisoka: Target,
  chrollo: Key,
  feitan: Flame,
  meruem: Crown,
  neferpitou: Eye,
  illumi: ShieldAlert,
};

interface AgentIconProps {
  name?: string;
  iconName?: string;
  className?: string;
  size?: number;
}

export function AgentIcon({
  name = "",
  iconName = "",
  className = "size-4",
  size = 16,
}: AgentIconProps) {
  const key = (name || iconName).toLowerCase().trim();
  const IconComponent = ICON_MAP[key] ?? Sparkles;
  return <IconComponent className={className} size={size} />;
}
