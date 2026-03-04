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
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/images/auth-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div className="w-full max-w-[460px] space-y-5 relative z-10">
        {/* Logo & Title */}
        <div className="text-center">
          <img
            src={bmgLogo}
            alt="BMG Logo"
            className="mx-auto h-36 w-36 object-contain drop-shadow-[0_0_30px_rgba(100,200,220,0.4)]"
          />
        </div>

        {/* Glass Card */}
        <div
          className="rounded-2xl p-8 space-y-5 shadow-2xl border"
          style={{
            background: 'linear-gradient(135deg, rgba(20,57,76,0.85) 0%, rgba(30,70,90,0.75) 100%)',
            borderColor: 'rgba(100,200,220,0.2)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg px-4 py-3 font-medium text-white/90 transition-all hover:bg-white/10 disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('loginWithGoogle')}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <span>{mode === 'login' ? t('orLoginWithEmail') : t('orSignupWithEmail')}</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Tab toggle */}
          <div
            className="flex rounded-lg p-1"
            style={{ background: 'rgba(0,0,0,0.3)' }}
          >
            <button
              onClick={() => setMode('login')}
              className="flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-all"
              style={{
                color: mode === 'login' ? '#d0dd00' : 'rgba(255,255,255,0.5)',
                background: mode === 'login' ? 'rgba(208,221,0,0.1)' : 'transparent',
                borderLeft: mode === 'login' ? '2px solid #d0dd00' : '2px solid transparent',
              }}
            >
              {t('login')}
            </button>
            <button
              onClick={() => setMode('signup')}
              className="flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-all"
              style={{
                color: mode === 'signup' ? '#d0dd00' : 'rgba(255,255,255,0.5)',
                background: mode === 'signup' ? 'rgba(208,221,0,0.1)' : 'transparent',
                borderLeft: mode === 'signup' ? '2px solid #d0dd00' : '2px solid transparent',
              }}
            >
              {t('signup')}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {t('fullName')}
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder={t('fullNamePlaceholder')}
                  autoComplete="name"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#d0dd00]/50 focus:ring-[#d0dd00]/20"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#d0dd00]/50 focus:ring-[#d0dd00]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {t('passwordLabel')}
              </label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="pr-10 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#d0dd00]/50 focus:ring-[#d0dd00]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  aria-label={showPass ? t('hidePassword') : t('showPassword')}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-3 font-bold text-sm tracking-wide transition-all disabled:opacity-50 hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #d0dd00 0%, #b8c400 100%)',
                color: '#14394c',
              }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : mode === 'login' ? t('login') : t('createAccount')}
            </button>
          </form>
        </div>

        {/* Info */}
        <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {mode === 'login' ? t('noAccountHint') : t('afterSignupHint')}
        </p>

        {/* Theme Switcher */}
        <div className="flex justify-center gap-1.5">
          {themes.map(th => (
            <button
              key={th.id}
              onClick={() => setTheme(th.id)}
              className="px-3 py-1.5 text-xs font-medium rounded-full transition-all"
              style={{
                background: theme === th.id ? '#d0dd00' : 'rgba(255,255,255,0.08)',
                color: theme === th.id ? '#14394c' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${theme === th.id ? '#d0dd00' : 'rgba(255,255,255,0.15)'}`,
              }}
            >
              {th.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
