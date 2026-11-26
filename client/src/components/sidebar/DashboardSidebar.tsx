import React from 'react';
import { Loader2, LogOut, ShieldCheck, User, Clapperboard, Building2, type LucideIcon } from 'lucide-react';

/** Brand icons by name (explicit map keeps the icon bundle tree-shaken). */
const BRAND_ICONS: Record<string, LucideIcon> = { ShieldCheck, User, Clapperboard, Building2 };
import { SidebarItem } from './SidebarItem.js';
import { SidebarGroup } from './SidebarGroup.js';
import { SidebarBrand } from './SidebarBrand.js';

export interface SidebarNavItem {
  icon: React.ElementType;
  label: string;
  to: string;
  colorClass?: string;
}

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

export interface SidebarConfig {
  brand: {
    title: string;
    accent: string;
    accentColor?: string;
    subtitle?: string;
    iconName?: string;
    iconColor?: string;
  };
  groups: SidebarNavGroup[];
  bottomItems?: SidebarNavItem[];
  showLogout?: boolean;
  onLogout?: () => void;
  isLogoutLoading?: boolean;
  pillId?: string;
}

export const DashboardSidebar: React.FC<{ config: SidebarConfig }> = React.memo(({ config }) => {
  const pillId = config.pillId ?? 'dash-pill';

  const BrandIcon = config.brand.iconName
    ? BRAND_ICONS[config.brand.iconName] ?? null
    : null;

  return (
    <div className="flex flex-col h-full">
      {}
      <SidebarBrand
        title={config.brand.title}
        accent={config.brand.accent}
        accentColor={config.brand.accentColor}
        subtitle={config.brand.subtitle}
        icon={
          BrandIcon ? (
            <BrandIcon className={config.brand.iconColor ?? 'text-accent-blue'} size={20} />
          ) : undefined
        }
      />

      {}
      <nav aria-label="Dashboard" className="space-y-5 flex-1">
        {config.groups.map((group) => (
          <SidebarGroup key={group.label} label={group.label}>
            {group.items.map((item) => (
              <SidebarItem
                key={item.to}
                icon={item.icon}
                label={item.label}
                to={item.to}
                colorClass={item.colorClass}
                pillId={pillId}
              />
            ))}
          </SidebarGroup>
        ))}
      </nav>

      {}
      {(config.bottomItems?.length || config.showLogout) && (
        <div className="mt-auto pt-6 border-t border-white/5 space-y-1">
          {config.bottomItems?.map((item) => (
            <SidebarItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              colorClass={item.colorClass}
              pillId={pillId}
            />
          ))}
          {config.showLogout && config.onLogout && (
            <button
              onClick={config.onLogout}
              disabled={config.isLogoutLoading}
              className={`w-full flex items-center gap-3 px-3 py-2 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors ${
                config.isLogoutLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
                {config.isLogoutLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <LogOut size={16} />
                )}
              <span className="text-[13px] font-medium">
                {config.isLogoutLoading ? "Signing out…" : "Sign out"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});

DashboardSidebar.displayName = 'DashboardSidebar';
