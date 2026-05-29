import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Sparkles, CheckCircle, ArrowLeft } from 'lucide-react';

const Register: React.FC = () => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Insert into nutricionistas table
        const { error: dbError } = await supabase
          .from('nutricionistas')
          .insert([
            {
              id: authData.user.id,
              nome,
              email,
            },
          ]);

        if (dbError) throw dbError;

        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar a conta.');
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
            <span>Cadastre-se Gratuitamente</span>
          </div>
          <h2>Dê o próximo passo na sua carreira clínica</h2>
          <p>
            Junte-se a centenas de nutricionistas que otimizaram seus atendimentos,
            organizaram seus históricos de pacientes e elevaram o engajamento com planos eficientes.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <CheckCircle className="auth-feature-icon" size={18} />
              <span>Experimente grátis, sem compromisso</span>
            </div>
            <div className="auth-feature-item">
              <CheckCircle className="auth-feature-icon" size={18} />
              <span>Criação rápida de planos e acompanhamento</span>
            </div>
            <div className="auth-feature-item">
              <CheckCircle className="auth-feature-icon" size={18} />
              <span>Interface intuitiva que seus pacientes adoram</span>
            </div>
          </div>
        </div>

        <div className="auth-banner-footer">
          <p>&copy; {new Date().getFullYear()} NutriOl. A plataforma definitiva para nutrição.</p>
        </div>
      </div>

      {/* Right side: Register form */}
      <div className="auth-form-side">
        <div className="auth-form-wrapper" style={{ maxWidth: '440px' }}>
          <div className="auth-form-logo-mobile">
            <img src="/favicon.svg" alt="NutriOl Logo" style={{ width: '32px', height: '32px' }} />
            <h1 className="logo-text" style={{ fontSize: '1.75rem', marginBottom: 0 }}>Nutri<span>Ol</span></h1>
          </div>
          
          <div className="auth-form-card" style={{ padding: '36px' }}>
            <Link to="/" className="auth-back-link">
              <ArrowLeft size={16} />
              Voltar para o site
            </Link>
            <h2 className="auth-title" style={{ textAlign: 'left', marginBottom: '8px' }}>Criar conta</h2>
            <p className="auth-subtitle" style={{ textAlign: 'left', marginBottom: '24px' }}>Comece a gerenciar seus pacientes de forma profissional.</p>
            
            <form onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="nome">Nome completo</label>
                <input
                  id="nome"
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
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

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="password">Senha</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" htmlFor="confirmPassword">Confirmar senha</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>

              <div className="auth-footer" style={{ marginTop: '20px', textAlign: 'center' }}>
                Já tem conta? <Link to="/login" className="auth-link">Faça login</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
