
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { FC } from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Compass, Home, Edit3, BarChart3, Lightbulb, BookOpen, Settings, LogOut, LogIn, Users, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

interface NavItem {
  href: string;
  label: string;
  icon: FC<React.SVGProps<SVGSVGElement>>;
  tooltip: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home, tooltip: 'Dashboard' },
  { href: '/log-interaction', label: 'Log Interaction', icon: Edit3, tooltip: 'Log Interaction' },
  { href: '/timeline', label: 'Energy Timeline', icon: BarChart3, tooltip: 'Energy Timeline' },
  { href: '/insights', label: 'Custom Insights', icon: Lightbulb, tooltip: 'Custom Insights' },
  { href: '/reports', label: 'Energy Reports', icon: FileText, tooltip: 'View Energy Reports' },
  { href: '/journal', label: 'Private Journal', icon: BookOpen, tooltip: 'Private Journal' },
  { href: '/people', label: 'Manage People', icon: Users, tooltip: 'Manage People' },
];

const AppSidebar: FC = () => {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth(); // Get user and logout function

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Compass className="h-8 w-8 text-sidebar-primary transition-transform duration-300 group-hover/sidebar-wrapper:rotate-12" />
          <span className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Social Compass
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={{ children: item.tooltip, className: "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" }}
                  className="justify-start"
                >
                  <a>
                    <item.icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/settings" passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/settings'}
                tooltip={{ children: "Settings", className: "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" }}
                className="justify-start"
              >
                <a>
                  <Settings aria-hidden="true" />
                  <span>Settings</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          {!loading && (
            user ? (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={logout}
                  variant="outline"
                  tooltip={{ children: "Log Out", className: "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" }}
                  className="justify-start text-destructive hover:bg-destructive/10 w-full"
                >
                  <LogOut aria-hidden="true" />
                  <span>Log Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : (
              <SidebarMenuItem>
                <Link href="/login" passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild
                    tooltip={{ children: "Log In", className: "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border" }}
                    className="justify-start w-full"
                  >
                    <a>
                      <LogIn aria-hidden="true" />
                      <span>Log In</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;

    