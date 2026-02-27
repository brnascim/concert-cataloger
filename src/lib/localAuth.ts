// ── Sistema de autenticação 100% local em memória ──────────────────────

export interface LocalUser {
  id: string;
  email: string;
  password: string;
  nome: string;
  role: 'admin' | 'revenue_assurance' | 'viewer';
  avatar: string;
  confirmed: boolean;
}

export interface LocalSession {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'revenue_assurance' | 'viewer';
  avatar: string;
  metodo: string;
  token: string;
  loginAt: string;
  expiresAt: string;
}

const USUARIOS: LocalUser[] = [
  {
    id: 'usr_001',
    email: 'revenue.assurance@bmg.com',
    password: 'SetlistBMG@2025',
    nome: 'Revenue Assurance',
    role: 'revenue_assurance',
    avatar: 'RA',
    confirmed: true,
  },
  {
    id: 'usr_002',
    email: 'admin@setlistagent.com',
    password: 'Admin@2025',
    nome: 'Administrator',
    role: 'admin',
    avatar: 'AD',
    confirmed: true,
  },
  {
    id: 'usr_003',
    email: 'bruno-bsn@hotmail.com',
    password: 'Bruno@2025',
    nome: 'Bruno',
    role: 'revenue_assurance',
    avatar: 'BR',
    confirmed: true,
  },
];

function criarSessao(user: LocalUser, metodo = 'email'): LocalSession {
  const sessao: LocalSession = {
    id: user.id,
    email: user.email,
    nome: user.nome,
    role: user.role,
    avatar: user.avatar,
    metodo,
    token: `local-token-${user.id}-${Date.now()}`,
    loginAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };
  sessionStorage.setItem('setlist_sessao', JSON.stringify(sessao));
  return sessao;
}

export function loginComEmail(email: string, password: string): LocalSession {
  const user = USUARIOS.find(
    u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
  );
  if (!user) throw new Error('E-mail ou senha incorretos.');
  return criarSessao(user);
}

export function loginComGoogle(): LocalSession {
  // Simula o fluxo OAuth retornando o primeiro usuário
  const user = USUARIOS[0];
  return criarSessao(user, 'google');
}

export function getSessao(): LocalSession | null {
  try {
    const raw = sessionStorage.getItem('setlist_sessao');
    if (!raw) return null;
    const sessao = JSON.parse(raw) as LocalSession;
    // Check expiration
    if (new Date(sessao.expiresAt) < new Date()) {
      sessionStorage.removeItem('setlist_sessao');
      return null;
    }
    return sessao;
  } catch {
    return null;
  }
}

export function logout(): void {
  sessionStorage.removeItem('setlist_sessao');
}
