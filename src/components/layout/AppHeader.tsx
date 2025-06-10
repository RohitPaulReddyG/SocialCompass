
"use client";

import type { FC } from 'react';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Compass, PanelLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface AppHeaderProps {
  appName: string;
}

const AppHeader: FC<AppHeaderProps> = ({ appName }) => {
  const { theme, setTheme, effectiveTheme } = useTheme(); // Use effectiveTheme for icon display
  const { toggleSidebar: toggleDesktopSidebar, isMobile } = useSidebar();

  const handleThemeToggle = () => {
    if (theme === 'system') {
        // If current theme is system, toggle based on effective theme
        setTheme(effectiveTheme === 'light' ? 'dark' : 'light');
    } else {
        // Otherwise, cycle through light -> dark -> system
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
    }
  };


  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
      {/* Desktop Sidebar Toggle - only show if not mobile */}
      {!isMobile && (
         <Button variant="ghost" size="icon" onClick={toggleDesktopSidebar} className="h-8 w-8">
            <PanelLeft />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
      )}
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden">
        <SidebarTrigger className="h-8 w-8" />
      </div>
      
      <div className="flex items-center gap-2">
        <Compass className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {appName}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleThemeToggle} className="h-8 w-8">
          {effectiveTheme === 'light' ? <Moon /> : <Sun />}
          <span className="sr-only">Toggle theme (Currently: {theme}, Effective: {effectiveTheme})</span>
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
