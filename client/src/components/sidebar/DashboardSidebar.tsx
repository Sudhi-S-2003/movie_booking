import React from 'react';
import * as LucideIcons from 'lucide-react';
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
  pillId?: string;
}

export const DashboardSidebar: React.FC<{ config: SidebarConfig }> = ({ config }) => {
  const pillId = config.pillId ?? 'dash-pill';

  const BrandIcon = config.brand.iconName
    ? (LucideIcons as any)[config.brand.iconName]
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
      <div className="space-y-6 flex-1">
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
      </div>

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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500/60 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
            >
              <div className="p-1.5 rounded-lg bg-white/5">
                <LucideIcons.LogOut size={16} />
              </div>
              <span className="font-bold text-[9px] uppercase tracking-widest">Sign Out</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
