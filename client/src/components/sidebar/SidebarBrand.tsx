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
  <Link to="/" className="block mb-8 px-4 hover:opacity-80 transition-opacity group">
    <h2 className="text-lg font-black tracking-tighter flex items-center gap-2">
      {icon}
      {title} <span className={`${accentColor} font-black`}>{accent}</span>
    </h2>
    {subtitle && (
      <p className="text-[8px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1 opacity-50">{subtitle}</p>
    )}
  </Link>
);
