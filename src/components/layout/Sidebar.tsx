import React from 'react';
import {
  LayoutDashboard,
  Search,
  AlertOctagon,
  PackageCheck,
  CheckSquare,
  History,
  FlaskConical,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'explorer'
  | 'issues'
  | 'products'
  | 'actions'
  | 'decisions'
  | 'evaluation'
  | 'planner'
  | 'discovery'
  | 'pilots'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLaunchDemoGuide: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  collapsed,
  onToggleCollapse,
  onLaunchDemoGuide
}) => {
  const navSections = [
    {
      title: 'INTELLIGENCE',
      items: [
        { id: 'dashboard' as PageId, label: 'Overview Dashboard', icon: LayoutDashboard },
        { id: 'explorer' as PageId, label: 'Review Explorer', icon: Search },
        { id: 'issues' as PageId, label: 'Issue Intelligence', icon: AlertOctagon },
        { id: 'products' as PageId, label: 'Product Quality', icon: PackageCheck }
      ]
    },
    {
      title: 'DECISION & ACTION',
      items: [
        { id: 'actions' as PageId, label: 'Action Center', icon: CheckSquare },
        { id: 'decisions' as PageId, label: 'Decision History', icon: History }
      ]
    },
    {
      title: 'EVALUATION & BENCHMARK',
      items: [
        { id: 'evaluation' as PageId, label: 'Evaluation Lab', icon: FlaskConical }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'reports' as PageId, label: 'Reports & Exports', icon: FileText },
        { id: 'settings' as PageId, label: 'Settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-200 shrink-0 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-slate-800">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
              R
            </div>
            <div className="truncate">
              <span className="font-bold text-sm tracking-tight text-white block">
                Review to Action
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 truncate">
                Fynd × NMIMS Hackathon C01
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            R
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navSections.map((section, idx) => (
          <div key={idx}>
            {!collapsed && (
              <h4 className="px-2 mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400">
                {section.title}
              </h4>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectPage(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Guided Walkthrough Launcher */}
      <div className="p-2 border-t border-slate-800 space-y-2">
        <button
          onClick={onLaunchDemoGuide}
          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/40 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Guided Hackathon Walkthrough for Judges"
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          {!collapsed && <span>Guided Demo (Judges)</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
