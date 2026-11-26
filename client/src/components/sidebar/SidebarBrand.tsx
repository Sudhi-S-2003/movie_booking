import { Link } from 'react-router-dom';

interface SidebarBrandProps {
  title: string;
  accent: string;
  accentColor?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const SidebarBrand: React.FC<SidebarBrandProps> = ({
  title,
  accent,
  accentColor = 'text-accent-blue',
  subtitle,
  icon,
}) => (
  <Link to="/" className="block mb-6 px-3 hover:opacity-80 transition-opacity group">
    <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
      {icon}
      {title} <span className={`${accentColor} font-bold`}>{accent}</span>
    </h2>
    {subtitle && (
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
    )}
  </Link>
);
