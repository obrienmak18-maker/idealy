import React from "react";

export function GitHubLogo({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export function SupabaseLogo({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M13.4 2.5L3.8 14.4C3.3 15 3.7 16 4.6 16H11V21.5L20.6 9.6C21.1 9 20.7 8 19.8 8H13.4V2.5Z"
        fill="url(#supabase-gradient-brand)"
      />
      <defs>
        <linearGradient id="supabase-gradient-brand" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3ECF8E" />
          <stop offset="1" stopColor="#34B27B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function StripeLogo({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.977 15.617.41 12.378.41 6.88.41 3.25 3.284 3.25 7.644c0 4.298 3.518 5.787 7.027 6.996 2.37.828 3.178 1.488 3.178 2.457 0 .977-.872 1.487-2.316 1.487-2.186 0-5.048-1.077-7.143-2.193l-.916 5.467c2.039 1.092 5.097 1.732 7.766 1.732 5.86 0 9.905-2.756 9.905-7.391 0-4.498-3.414-5.894-6.791-7.049z" />
    </svg>
  );
}

export function VercelLogo({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2L23 21H1L12 2Z" />
    </svg>
  );
}

export function FigmaLogo({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8 12C5.79086 12 4 10.2091 4 8C4 5.79086 5.79086 4 8 4H12V12H8Z" fill="#F24E1E" />
      <path d="M12 4H16C18.2091 4 20 5.79086 20 8C20 10.2091 18.2091 12 16 12C13.7909 12 12 10.2091 12 8V4Z" fill="#FF7262" />
      <path d="M12 12H16C18.2091 12 20 13.7909 20 16C20 18.2091 18.2091 20 16 20C13.7909 20 12 18.2091 12 16V12Z" fill="#1ABCFE" />
      <path d="M4 16C4 13.7909 5.79086 12 8 12H12V16C12 18.2091 10.2091 20 8 20C5.79086 20 4 18.2091 4 16Z" fill="#0ACF83" />
      <path d="M8 8C5.79086 8 4 9.79086 4 12C4 14.2091 5.79086 16 8 16C10.2091 16 12 14.2091 12 12C12 9.79086 10.2091 8 8 8Z" fill="#A259FF" />
    </svg>
  );
}

export function CanvaLogo({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#00C4CC" />
      <path
        d="M15.5 15.2c-1.3 1.2-3.1 1.6-4.8 1.1-2.2-.7-3.4-2.8-3.1-4.9.3-2.1 2.2-3.7 4.4-3.5 1.5.1 2.8.9 3.6 2.1l-1.6 1.1c-.5-.7-1.3-1.2-2.2-1.2-1.3-.1-2.4.8-2.6 2.1-.2 1.3.5 2.5 1.8 2.9 1 .3 2.1 0 2.8-.7l1.7 1.1z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function SlackLogo({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 15a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2a2 2 0 0 1-2 2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5z" fill="#E01E5A"/>
      <path d="M9 6a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2h-2a2 2 0 0 1-2-2zm0 1a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h3z" fill="#36C5F0"/>
      <path d="M18 9a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2V11a2 2 0 0 1 2-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5z" fill="#2EB67D"/>
      <path d="M15 18a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2a2 2 0 0 1 2 2zm0-1a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-3z" fill="#ECB22E"/>
    </svg>
  );
}

export function GoogleDriveLogo({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7.71 3.5L1.29 14.5h6.42L14.13 3.5H7.71z" fill="#0066DA"/>
      <path d="M14.13 3.5L20.55 14.5l-3.21 5.5H4.5l3.21-5.5h6.42z" fill="#00AC47"/>
      <path d="M22.71 14.5L16.29 3.5h-4.32l6.42 11h4.32z" fill="#EA4335" opacity="0.1"/>
      <path d="M1.29 14.5l3.21 5.5h12.84l3.21-5.5H1.29z" fill="#FFBA00"/>
    </svg>
  );
}

export function PostgreSQLLogo({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.5 7.5C16.8 5.8 15.2 4.5 13.4 4.1c-2.4-.5-4.8.4-6.2 2.3-1.4 1.9-1.5 4.5-.4 6.6l.8 1.4c-.6.9-1 1.9-1.1 3-.1 1.1.2 2.2.9 3 .8.8 2 1.2 3.1 1.1 1.6-.2 3.1-1.1 4-2.4 1.4.3 2.9.1 4.1-.7 1.3-.9 2.1-2.4 2.1-4 0-2.6-1.5-5.3-3.2-6.9zm-4.7 9.8c-.8.8-2 .9-2.9.4-.9-.6-1.4-1.7-1.2-2.8.2-1 .9-1.8 1.8-2.2l1.6 3.6c.3.4.5.7.7 1zm2.7-3.7c-.5.8-1.3 1.4-2.2 1.7l-1.6-3.6c.5-.4 1.1-.7 1.8-.7.7 0 1.4.3 1.9.8.4.5.4 1.2.1 1.8z" />
    </svg>
  );
}

export function NotionLogo({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.203-.84c1.121-.093 1.308-.467 1.308-1.308 0-.467-.28-.747-.747-.747-.467 0-1.027.093-1.68.14l-11.39.84c-.747.047-1.12.327-1.122 1.449zm.373 3.642v11.95c0 1.307.653 1.774 2.148 1.68l11.483-.84c1.307-.093 1.587-.84 1.587-1.868V6.915c0-.934-.373-1.308-1.4-1.214l-12.043.887c-1.12.093-1.775.56-1.775 1.262zm12.323 1.027c.093.56.093 1.12.093 1.68v7.096c0 .84-.373 1.214-1.214 1.26l-1.68.094c-.654.047-.934-.14-1.12-.653l-4.108-6.442v5.975c.467.094.747.374.747.84 0 .468-.28.748-.747.748l-2.894.233c-.093-.56-.093-1.12-.093-1.68V11.13c0-.84.373-1.214 1.214-1.26l1.774-.14c.747-.047 1.027.187 1.214.653l3.92 6.162V10.71c-.466-.093-.746-.373-.746-.84 0-.467.28-.747.746-.747z"/>
    </svg>
  );
}

export function getConnectorBrandLogo(id: string, className = "", size = 18): React.ReactNode {
  switch (id) {
    case "github":
      return <GitHubLogo size={size} className={className} />;
    case "supabase":
      return <SupabaseLogo size={size} className={className} />;
    case "stripe":
      return <StripeLogo size={size} className={className} />;
    case "vercel":
      return <VercelLogo size={size} className={className} />;
    case "canva":
      return <CanvaLogo size={size} className={className} />;
    case "figma":
      return <FigmaLogo size={size} className={className} />;
    case "slack":
      return <SlackLogo size={size} className={className} />;
    case "google-drive":
    case "google":
      return <GoogleDriveLogo size={size} className={className} />;
    case "postgres":
    case "postgresql":
      return <PostgreSQLLogo size={size} className={className} />;
    case "notion":
      return <NotionLogo size={size} className={className} />;
    default:
      return null;
  }
}
