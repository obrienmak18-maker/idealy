import type React from "react";

export const PageHeader: React.FC<{
  action?: React.ReactNode;
  description?: React.ReactNode;
  eyebrow: string;
  title: string;
}> = ({ action, description, eyebrow, title }) => (
  <header className="idealy-page-header">
    <div className="idealy-page-header__copy">
      <p className="idealy-page-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description && (
        <p className="idealy-page-description">{description}</p>
      )}
    </div>
    {action && <div className="idealy-page-header__actions">{action}</div>}
  </header>
);
