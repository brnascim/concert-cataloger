import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTheme, type Theme } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import bmgLogo from '@/assets/bmg-logo.png';

type AuthMode = 'login' | 'signup';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  const themes: { id: Theme; label: string }[] = [
    { id: 'light', label: t('themeLight') },
    { id: 'dark', label: t('themeDark') },
    { id: 'bmg', label: t('themeBmg') },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      toast({ title: t('loginFailed'), description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: t('signupFailed'), description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: t('verifyEmail'),
        description: t('verifyEmailDesc', { email: email.trim() }),
      });
      setMode('login');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: t('googleLoginFailed'), description: String(error), variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[440px] space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <img src={bmgLogo} alt="BMG Logo" className="mx-auto h-20 w-20 rounded-xl object-cover" />
          <h1 className="text-2xl font-bold text-foreground">{t('appName')}</h1>
          <p className="text-muted-foreground text-sm">{t('authSubtitle')}</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-border bg-card p-8 space-y-5 shadow-lg">
          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            className="w-full font-medium gap-2"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('loginWithGoogle')}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>{mode === 'login' ? t('orLoginWithEmail') : t('orSignupWithEmail')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Tab toggle */}
          <div className="flex rounded-lg bg-secondary p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-card text-primary glow-amber-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('login')}
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                mode === 'signup' ? 'bg-card text-primary glow-amber-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('signup')}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{t('fullName')}</label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder={t('fullNamePlaceholder')}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t('emailLabel')}</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t('passwordLabel')}</label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPass ? t('hidePassword') : t('showPassword')}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? t('login') : t('createAccount')}
            </Button>
          </form>
        </div>

        {/* Info */}
        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? t('noAccountHint') : t('afterSignupHint')}
        </p>

        {/* Theme Switcher */}
        <div className="flex justify-center gap-1.5">
          {themes.map(th => (
            <button
              key={th.id}
              onClick={() => setTheme(th.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                theme === th.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-primary'
              }`}
            >
              {th.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
