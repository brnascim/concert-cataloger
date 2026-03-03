import { Globe, LogOut } from 'lucide-react';
import bmgLogo from '@/assets/bmg-logo.png';
import { useTheme, type Theme } from '@/lib/theme';
import { useI18n, LOCALE_LABELS, type Locale } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface AppHeaderProps {
  activeTab: 'import' | 'search' | 'docs';
  onTabChange: (tab: 'import' | 'search' | 'docs') => void;
}

export function AppHeader({ activeTab, onTabChange }: AppHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { session, signOut } = useAuth();

  const themes: { id: Theme; label: string }[] = [
    { id: 'light', label: t('themeLight') },
    { id: 'dark', label: t('themeDark') },
    { id: 'bmg', label: t('themeBmg') },
  ];

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        {/* Logo + Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={bmgLogo} alt="BMG" className="h-9 w-9 rounded-lg object-cover" />
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">{t('appName')}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">{t('appSubtitle')}</p>
            </div>
          </div>

          <nav className="flex gap-1 rounded-lg bg-secondary p-1">
            <button
              onClick={() => onTabChange('import')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'import' ? 'bg-card text-primary glow-amber-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📥 {t('navImport')}
            </button>
            <button
              onClick={() => onTabChange('search')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'search' ? 'bg-card text-primary glow-amber-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🔍 {t('navSearch')}
            </button>
            <button
              onClick={() => onTabChange('docs')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                activeTab === 'docs' ? 'bg-card text-primary glow-amber-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📄 Docs
            </button>
          </nav>
        </div>

        {/* Theme + Language + User */}
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg bg-secondary p-0.5">
            {themes.map(th => (
              <button
                key={th.id}
                onClick={() => setTheme(th.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  theme === th.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>

          <Select value={locale} onValueChange={v => setLocale(v as Locale)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <Globe className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([code, label]) => (
                <SelectItem key={code} value={code}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {session && (
            <span className="text-xs text-muted-foreground hidden md:inline">
              {session.avatar} {session.nome}
            </span>
          )}

          <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-xs">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
