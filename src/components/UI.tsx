import type { ReactNode } from 'react';

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Tag({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'green' | 'red' | 'gold' }) {
  return <span className={`tag tag-${variant}`}>{children}</span>;
}

export function Chip({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'hot' | 'urgent' }) {
  return <span className={`chip chip-${variant}`}>{children}</span>;
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div className={`card ${className}`} onClick={onClick}>{children}</div>;
}

export function Button({ children, onClick, variant = 'primary', disabled = false, className = '' }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'sage' | 'ghost';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Divider() {
  return <div className="divider" />;
}

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return <div className={`toggle ${on ? 'on' : ''}`} onClick={onChange} />;
}

export function GeminiCard({ children, label = 'Gemini · Analysis' }: { children: ReactNode; label?: string }) {
  return (
    <div className="gemini-card">
      <div className="gemini-header">
        <div className="gemini-gem" />
        <span className="gemini-label">{label}</span>
      </div>
      <div className="gemini-body">{children}</div>
    </div>
  );
}

export function ShelterNotif({ children, shelterName }: { children: ReactNode; shelterName: string }) {
  return (
    <div className="shelter-notif">
      <div className="shelter-notif-head">🏠 Shelter Notified · {shelterName}</div>
      <div className="shelter-notif-body">{children}</div>
    </div>
  );
}

export function NeedPill({ level }: { level: 'high' | 'medium' | 'low' }) {
  const label = level === 'high' ? 'High need' : level === 'medium' ? 'Accepting' : 'Low need';
  return <span className={`need-pill need-${level}`}>{label}</span>;
}

export function AnimatedNumber({ target }: { target: number; duration?: number }) {
  return <span>{target}</span>;
}
