import { useState } from 'react';
import { loginComEmail, loginComGoogle, type LocalSession } from '@/lib/localAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTheme, type Theme } from '@/lib/theme';
import { Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  onLogin: (session: LocalSession) => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; label: string }[] = [
    { id: 'light', label: '☀️ Light' },
    { id: 'dark', label: '🌑 Dark' },
    { id: 'bmg', label: '🎵 BMG' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const sessao = loginComEmail(email, password);
      onLogin(sessao);
    } catch (err: any) {
      toast({ title: 'Login failed', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleGoogleLogin = () => {
    try {
      const sessao = loginComGoogle();
      onLogin(sessao);
    } catch {
      toast({ title: 'Google login failed', description: 'Não foi possível entrar com Google.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[440px] space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-4xl mb-2">🎵</div>
          <h1 className="text-2xl font-bold text-foreground">Setlist Agent</h1>
          <p className="text-muted-foreground text-sm">
            Extraction & standardization of music setlists
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-border bg-card p-8 space-y-5 shadow-lg">
          {/* Google OAuth (simulado) */}
          <Button
            type="button"
            variant="outline"
            className="w-full font-medium gap-2"
            onClick={handleGoogleLogin}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>ou entre com email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
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
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? '⏳ ...' : 'Sign In'}
            </Button>
          </form>
        </div>

        {/* Restricted access notice */}
        <p className="text-center text-sm text-muted-foreground">
          Acesso restrito a usuários autorizados. Contate seu administrador.
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
