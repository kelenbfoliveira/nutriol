import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Sparkles, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/dashboard');
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          throw new Error('E-mail ou senha incorretos.');
        }
        throw authError;
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-container">
      {/* Left side: Marketing banner */}
      <div className="auth-banner-side">
        <div className="auth-banner-header">
          <Link to="/" className="auth-banner-logo-text">
            <img src="/favicon.svg" alt="NutriOl Logo" className="auth-banner-logo-svg" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '10px' }} />
            Nutri<span>Ol</span>
          </Link>
        </div>

        <div className="auth-banner-body">
          <div className="landing-badge" style={{ color: 'var(--white)', borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <Sparkles size={14} />
            <span>Painel do Nutricionista</span>
          </div>
          <h2>Conecte-se e gerencie seus pacientes</h2>
          <p>
            Acesse seu espaço de trabalho personalizado. Crie novos prontuários,
            acompanhe a evolução em tempo real e prescreva dietas de forma ágil e segura.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <CheckCircle className="auth-feature-icon" size={18} />
              <span>Acesso rápido ao histórico de consultas</span>
            </div>
            <div className="auth-feature-item">
              <CheckCircle className="auth-feature-icon" size={18} />
              <span>Gráficos de evolução física automáticos</span>
            </div>
            <div className="auth-feature-item">
              <CheckCircle className="auth-feature-icon" size={18} />
              <span>Segurança de dados e conformidade clínica</span>
            </div>
          </div>
        </div>

        <div className="auth-banner-footer">
          <p>&copy; {new Date().getFullYear()} NutriOl. A plataforma definitiva para nutrição.</p>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="auth-form-side">
        <div className="auth-form-wrapper">
          <div className="auth-form-logo-mobile">
            <img src="/favicon.svg" alt="NutriOl Logo" style={{ width: '32px', height: '32px' }} />
            <h1 className="logo-text" style={{ fontSize: '1.75rem', marginBottom: 0 }}>Nutri<span>Ol</span></h1>
          </div>
          
          <div className="auth-form-card">
            <h2 className="auth-title" style={{ textAlign: 'left', marginBottom: '8px' }}>Bem-vindo de volta</h2>
            <p className="auth-subtitle" style={{ textAlign: 'left', marginBottom: '32px' }}>Acesse sua conta para gerenciar seus atendimentos.</p>
            
            <form onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label className="form-label" htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Senha</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="auth-footer" style={{ marginTop: '24px', textAlign: 'center' }}>
                Não tem conta? <Link to="/register" className="auth-link">Cadastre-se</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
