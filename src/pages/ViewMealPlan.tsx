import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { Apple, Printer, Loader2, AlertCircle, Calendar, Clock, User } from 'lucide-react';

interface DayMeals {
  cafe_manha: string[];
  lanche_manha: string[];
  almoco: string[];
  lanche_tarde: string[];
  jantar: string[];
}

interface MealPlanContent {
  config?: {
    numRefeicoes?: 3 | 4 | 5;
  };
  dias: {
    segunda: DayMeals;
    terca: DayMeals;
    quarta: DayMeals;
    quinta: DayMeals;
    sexta: DayMeals;
    sabado: DayMeals;
    domingo: DayMeals;
  };
}

interface MealPlan {
  id: string;
  paciente_id: string;
  titulo: string;
  descricao: string;
  conteudo: MealPlanContent | string | null;
  created_at: string;
  pacientes: {
    nome: string;
    nutricionistas: {
      nome: string;
    };
  };
}

const DAYS_CONFIG = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
] as const;

const getActiveMeals = (num: number) => {
  if (num === 3) {
    return [
      { key: 'cafe_manha', label: '☀️ Café da Manhã' },
      { key: 'almoco', label: '🍲 Almoço' },
      { key: 'jantar', label: '🌙 Jantar' }
    ] as const;
  }
  if (num === 4) {
    return [
      { key: 'cafe_manha', label: '☀️ Café da Manhã' },
      { key: 'almoco', label: '🍲 Almoço' },
      { key: 'lanche_tarde', label: '☕ Lanche da Tarde' },
      { key: 'jantar', label: '🌙 Jantar' }
    ] as const;
  }
  return [
    { key: 'cafe_manha', label: '☀️ Café da Manhã' },
    { key: 'lanche_manha', label: '🍏 Lanche da Manhã' },
    { key: 'almoco', label: '🍲 Almoço' },
    { key: 'lanche_tarde', label: '☕ Lanche da Tarde' },
    { key: 'jantar', label: '🌙 Jantar' }
  ] as const;
};

const ViewMealPlan: React.FC = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plano, setPlano] = useState<MealPlan | null>(null);

  useEffect(() => {
    const fetchPlano = async () => {
      if (!planId) {
        setError('Código do plano alimentar não especificado.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from('planos_alimentares')
          .select('*, pacientes!inner(nome, nutricionistas!inner(nome))')
          .eq('id', planId)
          .single();

        if (dbError || !data) {
          throw new Error('Plano alimentar não encontrado. Verifique o link enviado.');
        }

        setPlano(data as any);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar o plano alimentar.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlano();
  }, [planId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={40} style={{ margin: '0 auto 16px' }} />
          <p style={{ fontWeight: 500 }}>Carregando seu plano alimentar...</p>
        </div>
      </div>
    );
  }

  if (error || !plano) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-color)', padding: '24px' }}>
        <div className="card" style={{ maxWidth: '440px', padding: '32px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', marginBottom: '8px', fontWeight: 700 }}>Ops! Não foi possível carregar</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>{error || 'Plano alimentar inválido.'}</p>
        </div>
      </div>
    );
  }

  let parsedContent: MealPlanContent | null = null;
  let legacyText = '';

  if (typeof plano.conteudo === 'string') {
    try {
      parsedContent = JSON.parse(plano.conteudo);
    } catch {
      legacyText = plano.conteudo;
    }
  } else if (plano.conteudo && typeof plano.conteudo === 'object') {
    parsedContent = plano.conteudo as any;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fbfbf9',
      padding: '24px 16px',
      fontFamily: 'inherit',
      color: 'var(--text-dark)'
    }}>
      <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto' }}>
        {/* Top Header Controls (Hidden on Print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Apple size={24} color="var(--primary)" />
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit' }}>Nutri<span style={{ color: 'var(--accent-gold)' }}>Ol</span></span>
          </div>
          <button 
            className="btn-primary" 
            style={{ width: 'auto', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }} 
            onClick={() => window.print()}
          >
            <Printer size={16} /> Imprimir Plano
          </button>
        </div>

        {/* Plan Header Card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, #1c4533 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: 'var(--shadow)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle decoration */}
          <div style={{ position: 'absolute', right: '-40px', bottom: '-40px', opacity: 0.08, color: '#fff' }}>
            <Apple size={200} />
          </div>

          <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Plano Alimentar</p>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '6px 0 8px 0', lineHeight: 1.2 }}>{plano.titulo}</h1>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '14px', marginTop: '14px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} style={{ opacity: 0.8 }} />
              <span>Paciente: <strong>{plano.pacientes?.nome}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} style={{ opacity: 0.8 }} />
              <span>Nutricionista: <strong>{plano.pacientes?.nutricionistas?.nome}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} style={{ opacity: 0.8 }} />
              <span>Emissão: {format(parseISO(plano.created_at), 'dd/MM/yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Orientation / Description */}
        {plano.descricao && (
          <div style={{
            backgroundColor: 'var(--white)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-sm)',
            borderLeft: '4px solid var(--accent-gold)'
          }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: 'var(--accent-gold-hover)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Instruções Gerais</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{plano.descricao}</p>
          </div>
        )}

        {/* Weekly Meals Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {parsedContent && parsedContent.dias ? (
            DAYS_CONFIG.map(dayInfo => {
              const dayData = parsedContent?.dias?.[dayInfo.key];
              if (!dayData) return null;

              const planNumRefeicoes = parsedContent?.config?.numRefeicoes || 5;
              const activeMeals = getActiveMeals(planNumRefeicoes);
              
              // Only display days that actually have items filled
              const hasMeals = activeMeals.some(m => dayData[m.key]?.some(item => item.trim()));
              if (!hasMeals) return null;

              return (
                <div 
                  key={dayInfo.key} 
                  style={{
                    backgroundColor: 'var(--white)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: 'var(--shadow-sm)',
                    pageBreakInside: 'avoid'
                  }}
                >
                  <h3 style={{
                    fontWeight: 700,
                    color: 'var(--primary)',
                    fontSize: '1.1rem',
                    marginBottom: '16px',
                    borderBottom: '2px solid #ecfdf5',
                    paddingBottom: '8px',
                    display: 'inline-block'
                  }}>
                    {dayInfo.label}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeMeals.map(mealInfo => {
                      const mealOptions = dayData[mealInfo.key] || [];
                      const filledOptions = mealOptions.filter(opt => opt.trim());
                      if (filledOptions.length === 0) return null;

                      return (
                        <div 
                          key={mealInfo.key} 
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '150px 1fr',
                            gap: '12px',
                            borderBottom: '1px solid #f3f4f6',
                            paddingBottom: '10px',
                            alignItems: 'start'
                          }}
                        >
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dark)' }}>{mealInfo.label}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {filledOptions.map((opt, i) => (
                              <p key={i} style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, display: 'flex', gap: '6px', lineHeight: 1.4 }}>
                                {filledOptions.length > 1 && <span style={{ color: 'var(--primary-light)', fontWeight: 'bold' }}>•</span>}
                                <span>{opt}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            // Legacy / plain text fallback
            <div style={{
              backgroundColor: 'var(--white)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {legacyText || 'Nenhum cardápio disponível neste plano alimentar.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '36px', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '20px', paddingBottom: '20px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Plano Alimentar Digital • Gerado por NutriOl
          </p>
        </div>
      </div>
      <style>{`
        @media print {
          body {
            background-color: #fff !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .card, div {
            box-shadow: none !important;
            border-color: #e5e7eb !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ViewMealPlan;
