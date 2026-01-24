import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  FolderOpen,
  FileText,
  Users,
  ClipboardList,
  Workflow,
  BarChart3,
  PenTool,
  ChevronDown,
  Eye,
  Tv,
  Settings,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const mainNavItems = [
  { key: "dashboard", path: "/", icon: LayoutDashboard },
  { key: "events", path: "/events", icon: Calendar },
  { key: "pricing", path: "/pricing", icon: DollarSign },
  { key: "categories", path: "/categories", icon: FolderOpen },
];

const contentNavItems = [
  { key: "originals", path: "/originals", icon: FileText },
  { key: "authors", path: "/authors", icon: PenTool },
];

const adminNavItems = [
  { key: "users", path: "/users", icon: Users },
  { key: "auditLog", path: "/audit", icon: ClipboardList },
  { key: "workflows", path: "/workflows", icon: Workflow },
];

const analyticsSubItems = [
  { key: "overview", path: "/analytics", label: "Vue d'ensemble", icon: BarChart3 },
  { key: "fixtures", path: "/analytics/fixtures", label: "Événements", icon: Calendar },
  { key: "originals", path: "/analytics/originals", label: "Originals", icon: Tv },
];

const settingsSubItems = [
  { key: "apiFootball", path: "/settings/api-football", label: "API-Football", icon: Zap },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function AdminSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const { resolvedTheme } = useTheme();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isAnalyticsActive = location.pathname.startsWith("/analytics");
  const isSettingsActive = location.pathname.startsWith("/settings");

  // Logo adapté au thème
  const logoFileName = resolvedTheme === "dark" ? "emblem blanc.png" : "emblem noir.png";
  const logoUrl = `${SUPABASE_URL}/storage/v1/object/public/stadiologo/${encodeURIComponent(logoFileName)}`;

  const renderNavItems = (items: typeof mainNavItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.key}>
          <SidebarMenuButton asChild isActive={isActive(item.path)}>
            <Link to={item.path} className={cn("flex items-center gap-3")}>
              <item.icon className="h-4 w-4" />
              <span>{t(`nav.${item.key}`)}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to="/" className="flex items-center gap-3">
          <img 
            src={logoUrl} 
            alt="Stadio" 
            className="h-8 w-8 object-contain"
          />
          <span className="font-semibold">Stadio Admin</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>{renderNavItems(mainNavItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Contenus</SidebarGroupLabel>
          <SidebarGroupContent>{renderNavItems(contentNavItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderNavItems(adminNavItems)}
            
            {/* Analytics with sub-navigation */}
            <SidebarMenu>
              <Collapsible defaultOpen={isAnalyticsActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isAnalyticsActive}>
                      <BarChart3 className="h-4 w-4" />
                      <span>{t('nav.analytics')}</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {analyticsSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.key}>
                          <SidebarMenuSubButton asChild isActive={location.pathname === item.path}>
                            <Link to={item.path}>
                              <item.icon className="h-3.5 w-3.5" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
            
            {/* Settings with sub-navigation */}
            <SidebarMenu>
              <Collapsible defaultOpen={isSettingsActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isSettingsActive}>
                      <Settings className="h-4 w-4" />
                      <span>{t('nav.settings')}</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {settingsSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.key}>
                          <SidebarMenuSubButton asChild isActive={location.pathname === item.path}>
                            <Link to={item.path}>
                              <item.icon className="h-3.5 w-3.5" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <p className="text-xs text-muted-foreground">Stadio Admin v1.0</p>
      </SidebarFooter>
    </Sidebar>
  );
}
