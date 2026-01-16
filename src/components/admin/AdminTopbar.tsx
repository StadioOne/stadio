import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Moon, Sun, Globe, LogOut, User } from "lucide-react";

export function AdminTopbar() {
  const { t, i18n } = useTranslation();
  const { user, role, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "fr" ? "en" : "fr");
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleLanguage}>
          <Globe className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.email}</span>
              {role && (
                <span className="text-xs text-muted-foreground capitalize">
                  ({t(`users.roles.${role}`)})
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("auth.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
