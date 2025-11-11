import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavigationProps {
  className?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ className }) => {
  const currentPath = window.location.pathname;

  const navItems = [
    { path: '/', label: 'Game', icon: '🎮' },
    { path: '/treasure', label: 'Treasure', icon: '💎' },
    { path: '/hide-treasure', label: 'Hide Treasure', icon: '🗺️' },
    { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  ];

  const handleNavigate = (path: string) => {
    window.location.href = path;
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/' || currentPath === '/entry-screen';
    }
    return currentPath.includes(path);
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-slate-900/95 backdrop-blur-sm border-b border-slate-700',
        'shadow-lg',
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">Dotty</span>
            <span className="text-xs text-slate-400 hidden sm:inline">DEV NAV</span>
          </div>

          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                variant={isActive(item.path) ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'transition-all',
                  isActive(item.path)
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                )}
              >
                <span className="mr-1.5">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};
