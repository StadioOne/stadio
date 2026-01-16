import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
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
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

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
  { key: "analytics", path: "/analytics", icon: BarChart3 },
];

export function AdminSidebar() {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

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
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">S</span>
          </div>
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
          <SidebarGroupContent>{renderNavItems(adminNavItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <p className="text-xs text-muted-foreground">Stadio Admin v1.0</p>
      </SidebarFooter>
    </Sidebar>
  );
}
