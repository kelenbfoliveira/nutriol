import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Clipboard, 
  Activity, 
  FileText, 
  Users, 
  ArrowRight 
} from 'lucide-react';

const Landing: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsLoggedIn(!!session);
      } catch (err) {
        console.error("Error checking auth session:", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="landing-container fade-in">
      {/* Floating Background Brand Watermarks */}
      <div className="bg-floating-logo logo-left-top" />
      <div className="bg-floating-logo logo-right-bottom" />

      {/* Header */}
      <header className="landing-header">
        <Link to="/" className="landing-logo">
          <div className="landing-logo-img-container" style={{ position: 'relative' }}>
            <img src="/favicon.svg" alt="NutriOl Logo" style={{ width: '32px', height: '32px' }} />
          </div>
          <h1 className="landing-logo-text">Nutri<span>Ol</span></h1>
        </Link>

        <nav className="landing-nav">
          <a href="#funcionalidades" className="landing-nav-link">Funcionalidades</a>
          <a href="#beneficios" className="landing-nav-link">Benefícios</a>
          <a href="#sobre" className="landing-nav-link">Sobre</a>
        </nav>

        <div className="landing-actions">
          {loading ? (
            <div style={{ width: '80px', height: '20px', backgroundColor: '#e5e7eb', borderRadius: '4px' }} className="animate-pulse" />
          ) : isLoggedIn ? (
            <Link to="/dashboard" className="landing-btn-register">
              Acessar Painel <ArrowRight size={16} style={{ marginLeft: '4px', display: 'inline' }} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="landing-btn-login">Entrar</Link>
              <Link to="/register" className="landing-btn-register">Solicitar Orçamento</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero" id="home">
        <div className="landing-hero-content">
          <div className="landing-badge">
            <img src="/favicon.svg" alt="NutriOl Logo" style={{ width: '14px', height: '14px' }} />
            <span>A plataforma completa para Nutricionistas</span>
          </div>
          <h2 className="landing-hero-title">
            Simplifique sua gestão. <span>Encante seus pacientes.</span>
          </h2>
          <p className="landing-hero-description">
            O NutriOl é o software de nutrição feito para profissionais que buscam excelência. 
            Crie prontuários dinâmicos, acompanhe a evolução física com gráficos de peso e monte 
            planos alimentares personalizados em poucos cliques.
          </p>
          <div className="landing-hero-ctas">
            {isLoggedIn ? (
              <Link to="/dashboard" className="landing-btn-hero-primary">
                Acessar meu consultório
              </Link>
            ) : (
              <>
                <Link to="/register" className="landing-btn-hero-primary">
                  Solicitar Orçamento
                </Link>
                <a href="#funcionalidades" className="landing-btn-hero-secondary">
                  Ver Funcionalidades
                </a>
              </>
            )}
          </div>
        </div>

        <div className="landing-hero-image-container">
          <img 
            src="/nutritionist_hero.png" 
            alt="Consultório Nutricionista NutriOl" 
            className="landing-hero-image" 
          />
          {/* Insígnia flutuante da marca sobre a imagem principal */}
          <div className="hero-floating-logo-badge">
            <div className="badge-icon">
              <img src="/favicon.svg" alt="NutriOl Selo" style={{ width: '18px', height: '18px' }} />
            </div>
            <div className="badge-text">
              <span className="badge-title">100% NutriOl</span>
              <span className="badge-subtitle">Consultório Digital</span>
            </div>
          </div>
          <div className="landing-hero-accent-circle" />
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features" id="funcionalidades">
        <div className="section-header">
          <div className="section-logo-divider">
            <img src="/favicon.svg" alt="Logo Divider" className="section-logo-divider-img" />
          </div>
          <h3 className="section-title">Tudo que você precisa em um único lugar</h3>
          <p className="section-subtitle">
            Diga adeus às planilhas complexas e papéis soltos. Tenha uma visão unificada 
            e automatizada de todos os seus atendimentos.
          </p>
        </div>

        <div className="features-grid">
          {/* Card 1 */}
          <div className="feature-card">
            <div className="feature-card-icon-container">
              <Clipboard size={24} />
            </div>
            <h3>Dados & Anamnese</h3>
            <p>
              Prontuário completo integrado com dados pessoais, histórico clínico 
              e hábitos de rotina. Totalmente editável e simples de gerenciar.
            </p>
          </div>

          {/* Card 2 */}
          <div className="feature-card">
            <div className="feature-card-icon-container">
              <Activity size={24} />
            </div>
            <h3>Acompanhamento de Consultas</h3>
            <p>
              Registre peso, medidas antropométricas e percentual de gordura. O sistema calcula 
              o progresso e gera o gráfico de evolução física instantaneamente.
            </p>
          </div>

          {/* Card 3 */}
          <div className="feature-card">
            <div className="feature-card-icon-container">
              <FileText size={24} />
            </div>
            <h3>Planos Alimentares</h3>
            <p>
              Monte planos e dietas detalhadas para os seus pacientes com título, 
              descrição e instruções específicas. Tudo armazenado no histórico do paciente.
            </p>
          </div>

          {/* Card 4 */}
          <div className="feature-card">
            <div className="feature-card-icon-container">
              <Users size={24} />
            </div>
            <h3>Controle de Retornos</h3>
            <p>
              Saiba exatamente quem são os pacientes sem retorno agendado há mais de 30 dias 
              e aja proativamente para reativá-los no consultório.
            </p>
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="landing-showcase">
        <div className="section-header">
          <div className="section-logo-divider">
            <img src="/favicon.svg" alt="Logo Divider" className="section-logo-divider-img" />
          </div>
          <h3 className="section-title">NutriOl em Ação</h3>
          <p className="section-subtitle">
            A combinação perfeita de cuidado personalizado e tecnologia digital moderna para encantar seus pacientes e otimizar seus atendimentos.
          </p>
        </div>

        <div className="showcase-visual-mosaic">
          {/* Item 1: Consultório */}
          <div className="mosaic-item item-nutritionist">
            <img src="/nutritionist_hero.png" alt="Consultório Nutricionista NutriOl" />
            <div className="mosaic-tag">
              <div className="mosaic-tag-info">
                <h5>Atendimento Premium</h5>
                <p>Consultório de Sucesso</p>
              </div>
              <img src="/favicon.svg" alt="Logo" className="mosaic-tag-logo" />
            </div>
          </div>

          {/* Item 2: Dashboard Preview */}
          <div className="mosaic-item item-dashboard">
            <img src="/dashboard_preview.png" alt="Acompanhamento Físico e Gráficos" />
            <div className="mosaic-tag">
              <div className="mosaic-tag-info">
                <h5>Evolução Física</h5>
                <p>Gráficos do Paciente</p>
              </div>
              <img src="/favicon.svg" alt="Logo" className="mosaic-tag-logo" />
            </div>
          </div>

          {/* Item 3: Estilo de Vida Saudável */}
          <div className="mosaic-item item-lifestyle">
            <img src="/patient_success_story.png" alt="Sucesso e Bem-estar do Paciente" />
            <div className="mosaic-tag">
              <div className="mosaic-tag-info">
                <h5>Qualidade de Vida</h5>
                <p>Resultados Duradouros</p>
              </div>
              <img src="/favicon.svg" alt="Logo" className="mosaic-tag-logo" />
            </div>
          </div>

          {/* Item 4: Plano Alimentar Preparado */}
          <div className="mosaic-item item-mealprep">
            <img src="/meal_plan.png" alt="Plano Alimentar Exemplo" />
            <div className="mosaic-tag">
              <div className="mosaic-tag-info">
                <h5>Nutrição Inteligente</h5>
                <p>Cardápios & Receitas</p>
              </div>
              <img src="/favicon.svg" alt="Logo" className="mosaic-tag-logo" />
            </div>
          </div>

          {/* Item 5: Alimentos Saudáveis */}
          <div className="mosaic-item item-fruits">
            <img src="/fresh_fruits.png" alt="Alimentação Saudável e Estilo de Vida" />
            <div className="mosaic-tag">
              <div className="mosaic-tag-info">
                <h5>Equilíbrio</h5>
                <p>Saúde Integrada</p>
              </div>
              <img src="/favicon.svg" alt="Logo" className="mosaic-tag-logo" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="landing-stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">500+</div>
            <div className="stat-label">Nutricionistas Ativas</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">15.000+</div>
            <div className="stat-label">Consultas Realizadas</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">99.8%</div>
            <div className="stat-label">Disponibilidade do Sistema</div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="landing-benefits" id="beneficios">
        <div className="benefits-grid">
          <div className="benefits-content">
            <div className="section-logo-divider" style={{ justifyContent: 'flex-start', margin: '0 0 16px 0' }}>
              <img src="/favicon.svg" alt="Logo Divider" className="section-logo-divider-img" style={{ margin: '0 16px 0 0' }} />
            </div>
            <h3>Por que escolher o NutriOl para o seu consultório?</h3>
            <div className="benefits-list">
              <div className="benefit-item">
                <div className="benefit-icon-container" style={{ border: '1px solid rgba(150, 91, 104, 0.15)', padding: '8px' }}>
                  <img src="/favicon.svg" alt="NutriOl Logo" style={{ width: '22px', height: '22px' }} />
                </div>
                <div className="benefit-text-container">
                  <h4>Ganho de Produtividade</h4>
                  <p>Economize até 40 minutos na preparação de relatórios e planos alimentares entre as consultas.</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon-container" style={{ border: '1px solid rgba(150, 91, 104, 0.15)', padding: '8px' }}>
                  <img src="/favicon.svg" alt="NutriOl Logo" style={{ width: '22px', height: '22px' }} />
                </div>
                <div className="benefit-text-container">
                  <h4>Organização Sem Esforço</h4>
                  <p>Encontre qualquer histórico de paciente, evolução ou dieta antiga em menos de 5 segundos.</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon-container" style={{ border: '1px solid rgba(150, 91, 104, 0.15)', padding: '8px' }}>
                  <img src="/favicon.svg" alt="NutriOl Logo" style={{ width: '22px', height: '22px' }} />
                </div>
                <div className="benefit-text-container">
                  <h4>Segurança e Privacidade</h4>
                  <p>Seus dados e históricos clínicos estão salvos na nuvem com criptografia de ponta a ponta.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="benefits-visual-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>
                Relato de Sucesso
              </span>
              <img src="/favicon.svg" alt="NutriOl Logo" style={{ width: '20px', height: '20px', opacity: 0.8 }} />
            </div>
            <p className="benefits-visual-quote">
              "O NutriOl transformou a rotina do meu consultório. Os pacientes adoram a clareza dos gráficos 
              de evolução de peso e eu consigo montar dietas com muito mais facilidade."
            </p>
            <div className="benefits-visual-author">
              Dra. Mariana Vasconcelos
              <span>Nutricionista Clínica & Esportiva</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta-section" id="sobre">
        <div className="landing-cta-content">
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '28px' }}>
            <div className="pulsing-logo-container" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.15)', borderColor: 'var(--accent-gold)' }}>
              <img src="/favicon.svg" alt="NutriOl Logo" style={{ width: '48px', height: '48px', filter: 'brightness(0) invert(1) sepia(0.5) saturate(1.5)' }} />
            </div>
          </div>
          <h2>Pronta para elevar o nível dos seus atendimentos?</h2>
          <p>
            Junte-se a centenas de profissionais de saúde e crie uma experiência digital, 
            profissional e focada no sucesso e saúde dos seus pacientes.
          </p>
          {isLoggedIn ? (
            <Link to="/dashboard" className="landing-cta-btn">
              Acessar Painel Administrativo
            </Link>
          ) : (
            <Link to="/register" className="landing-cta-btn">
              Solicitar Orçamento
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="landing-logo-img-container" style={{ padding: '6px' }}>
              <img src="/favicon.svg" alt="NutriOl Logo" style={{ width: '24px', height: '24px' }} />
            </div>
            <h4 className="footer-logo-text" style={{ color: 'var(--white)' }}>Nutri<span>Ol</span></h4>
          </div>
          <div className="footer-links">
            <a href="#funcionalidades" className="footer-link">Funcionalidades</a>
            <a href="#beneficios" className="footer-link">Benefícios</a>
            <Link to="/login" className="footer-link">Login</Link>
            <Link to="/register" className="footer-link">Solicitar Orçamento</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} NutriOl. Todos os direitos reservados. Design Comercial e Profissional.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
