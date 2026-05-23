import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Apple, 
  Plus, 
  Trash2, 
  Edit, 
  Sparkles, 
  Clock, 
  FileText, 
  Save, 
  X, 
  Check,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Types ──
export interface DayMeals {
  cafe_manha: string[];
  lanche_manha: string[];
  almoco: string[];
  lanche_tarde: string[];
  jantar: string[];
}

export interface MealPlanContent {
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

export interface MealPlan {
  id: string;
  paciente_id: string;
  titulo: string;
  descricao: string;
  conteudo: MealPlanContent | string | null;
  created_at: string;
}

interface PatientData {
  nome: string;
  objetivos?: string[];
  objetivo_texto?: string;
  nivel_atividade?: string;
  patologias?: string[];
  restricoes_alimentares?: string[];
  alergias?: string[];
  peso_inicial?: number;
  altura?: number;
  observacoes?: string;
}

interface MealPlanManagerProps {
  pacienteId: string;
  pacienteDados: PatientData;
}

// Days helper for translation & keys
const DAYS_CONFIG = [
  { key: 'segunda', label: 'Segunda', fullLabel: 'Segunda-feira' },
  { key: 'terca', label: 'Terça', fullLabel: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta', fullLabel: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta', fullLabel: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta', fullLabel: 'Sexta-feira' },
  { key: 'sabado', label: 'Sábado', fullLabel: 'Sábado' },
  { key: 'domingo', label: 'Domingo', fullLabel: 'Domingo' }
] as const;

// Meals helper
const MEALS_CONFIG = [
  { key: 'cafe_manha', label: '☀️ Café da Manhã' },
  { key: 'lanche_manha', label: '🍏 Lanche da Manhã' },
  { key: 'almoco', label: '🍲 Almoço' },
  { key: 'lanche_tarde', label: '☕ Lanche da Tarde' },
  { key: 'jantar', label: '🌙 Jantar' }
] as const;

// Default empty plan creator
const createEmptyPlan = (): MealPlanContent => {
  const emptyDay = (): DayMeals => ({
    cafe_manha: ['', '', '', '', ''],
    lanche_manha: ['', '', '', '', ''],
    almoco: ['', '', '', '', ''],
    lanche_tarde: ['', '', '', '', ''],
    jantar: ['', '', '', '', '']
  });

  return {
    dias: {
      segunda: emptyDay(),
      terca: emptyDay(),
      quarta: emptyDay(),
      quinta: emptyDay(),
      sexta: emptyDay(),
      sabado: emptyDay(),
      domingo: emptyDay()
    }
  };
};

export const MealPlanManager: React.FC<MealPlanManagerProps> = ({ pacienteId, pacienteDados }) => {
  // Modes: 'list' | 'editor'
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [editorAction, setEditorAction] = useState<'create' | 'edit'>('create');
  
  // Data States
  const [planos, setPlanos] = useState<MealPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // Form States
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [conteudo, setConteudo] = useState<MealPlanContent>(createEmptyPlan());
  const [activeDay, setActiveDay] = useState<keyof MealPlanContent['dias']>('segunda');
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Status States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aiLoadingMessage, setAiLoadingMessage] = useState('Analisando dados do paciente...');

  // Cycle messages during AI generation to keep UX dynamic
  useEffect(() => {
    let interval: any;
    if (generatingAI) {
      const messages = [
        'Analisando objetivos e restrições do paciente...',
        'Consultando o Gemini 2.5 Flash...',
        'Processando alergias e preferências alimentares...',
        'Evitando repetições e estruturando cardápio brasileiro...',
        'Formatando o plano alimentar semanal em JSON...',
        'Finalizando os últimos ajustes do cardápio...'
      ];
      let index = 0;
      interval = setInterval(() => {
        index = (index + 1) % messages.length;
        setAiLoadingMessage(messages[index]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [generatingAI]);

  // Fetch plans from Supabase
  const fetchPlanos = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('planos_alimentares')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlanos(data || []);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
      setErrorMessage('Erro ao carregar o histórico de planos alimentares.');
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    fetchPlanos();
  }, [fetchPlanos]);

  // Parse AI response into our uncompiled structure B
  const parseAIPlan = (aiData: any): MealPlanContent => {
    const plan = createEmptyPlan();
    
    // Look for the array inside the response
    const planoSemanal = aiData.plano_semanal || aiData;
    if (!Array.isArray(planoSemanal)) {
      return plan;
    }

    const dayMap: { [key: string]: keyof MealPlanContent['dias'] } = {
      'segunda-feira': 'segunda',
      'segunda': 'segunda',
      'terça-feira': 'terca',
      'terça': 'terca',
      'terca-feira': 'terca',
      'terca': 'terca',
      'quarta-feira': 'quarta',
      'quarta': 'quarta',
      'quinta-feira': 'quinta',
      'quinta': 'quinta',
      'sexta-feira': 'sexta',
      'sexta': 'sexta',
      'sábado': 'sabado',
      'sabado': 'sabado',
      'domingo': 'domingo'
    };

    planoSemanal.forEach((dayObj: any) => {
      const rawDia = (dayObj.dia || '').toLowerCase().trim();
      const mappedDayKey = dayMap[rawDia];
      if (!mappedDayKey) return;

      const rawRefeicoes = dayObj.refeicoes || {};
      const targetDay = plan.dias[mappedDayKey];

      const fillMeal = (rawItems: any): string[] => {
        let items: string[] = [];
        if (Array.isArray(rawItems)) {
          items = rawItems.map(i => String(i).trim());
        } else if (typeof rawItems === 'string') {
          items = [rawItems.trim()];
        }
        
        // Ensure exactly 5 items
        while (items.length < 5) {
          items.push('');
        }
        return items.slice(0, 5);
      };

      targetDay.cafe_manha = fillMeal(rawRefeicoes.cafe_da_manha || rawRefeicoes.cafe_manha);
      targetDay.lanche_manha = fillMeal(rawRefeicoes.lanche_manha);
      targetDay.almoco = fillMeal(rawRefeicoes.almoco);
      targetDay.lanche_tarde = fillMeal(rawRefeicoes.lanche_tarde || rawRefeicoes.lanche_da_tarde);
      targetDay.jantar = fillMeal(rawRefeicoes.jantar);
    });

    return plan;
  };

  // Generate meal plan using AI
  const handleGenerateAI = async () => {
    if (!pacienteId) return;
    setGeneratingAI(true);
    setErrorMessage(null);
    setAiLoadingMessage('Reunindo histórico e anamnese do paciente...');

    // Build the clinical context details
    const dadosPacientePrompt = {
      nome: pacienteDados.nome,
      peso: pacienteDados.peso_inicial ? `${pacienteDados.peso_inicial} kg` : 'Não informado',
      altura: pacienteDados.altura ? `${pacienteDados.altura} cm` : 'Não informado',
      objetivos: pacienteDados.objetivos?.join(', ') || pacienteDados.objetivo_texto || 'Não especificados',
      nivel_atividade: pacienteDados.nivel_atividade || 'Não informado',
      patologias: pacienteDados.patologias?.join(', ') || 'Nenhuma informada',
      restricoes: pacienteDados.restricoes_alimentares?.join(', ') || 'Nenhuma informada',
      alergias: pacienteDados.alergias?.join(', ') || 'Nenhuma informada',
      observacoes: pacienteDados.observacoes || 'Nenhuma'
    };

    try {
      // Call Supabase Edge Function directly
      // If deployed, it uses supabase.functions.invoke.
      // We will first try to invoke it, and if it fails or returns 404, we will fall back to calling the Vercel serverless function or REST endpoint
      const { data, error } = await supabase.functions.invoke('gerar-plano', {
        body: { dados_do_paciente: dadosPacientePrompt }
      });

      let responseJSON: any = null;

      if (!error && data) {
        responseJSON = data;
      } else {
        // If Edge function fails or is not deployed, fall back to /api/gerar-plano
        console.warn('Supabase Edge Function failed or not found, falling back to local serverless api...', error);
        
        const response = await fetch('/api/gerar-plano', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dados_do_paciente: dadosPacientePrompt })
        });

        if (!response.ok) {
          throw new Error('Falha ao comunicar com os serviços de inteligência artificial (Gemini).');
        }
        responseJSON = await response.json();
      }

      if (!responseJSON) {
        throw new Error('Resposta vazia da inteligência artificial.');
      }

      const parsedPlan = parseAIPlan(responseJSON);
      
      // Set Form State
      setTitulo(`Plano Gerado por IA - ${format(new Date(), 'dd/MM/yyyy')}`);
      setDescricao(`Plano alimentar personalizado baseado em objetivos: ${dadosPacientePrompt.objetivos}. Alergias/Restrições: ${dadosPacientePrompt.alergias}/${dadosPacientePrompt.restricoes}.`);
      setConteudo(parsedPlan);
      setActiveDay('segunda');
      
      setEditorAction('create');
      setSelectedPlanId(null);
      setMode('editor');
      
      setSuccessMessage('Plano alimentar elaborado pela IA com sucesso! Edite os detalhes abaixo.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('AI Generation error:', err);
      setErrorMessage('Não foi possível gerar o plano com IA no momento. Deseja tentar novamente ou criar um Plano Manual?');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Open manual blank planner
  const handleNewManual = () => {
    setTitulo(`Plano Alimentar - ${format(new Date(), 'dd/MM/yyyy')}`);
    setDescricao('');
    setConteudo(createEmptyPlan());
    setActiveDay('segunda');
    setEditorAction('create');
    setSelectedPlanId(null);
    setMode('editor');
    setErrorMessage(null);
  };

  // Edit existing plan
  const handleEditPlan = (plan: MealPlan) => {
    setTitulo(plan.titulo);
    setDescricao(plan.descricao || '');
    
    // Parse the stored JSON content safely
    let parsedContent: MealPlanContent;
    if (typeof plan.conteudo === 'string') {
      try {
        parsedContent = JSON.parse(plan.conteudo);
      } catch {
        parsedContent = createEmptyPlan();
      }
    } else if (plan.conteudo && typeof plan.conteudo === 'object') {
      parsedContent = plan.conteudo as any;
    } else {
      parsedContent = createEmptyPlan();
    }

    // Ensure all days and meals are structural padded to 5 elements
    const verifiedContent = createEmptyPlan();
    DAYS_CONFIG.forEach(d => {
      const dayKey = d.key;
      const rawDayData = parsedContent.dias?.[dayKey] || {} as any;
      MEALS_CONFIG.forEach(m => {
        const mealKey = m.key;
        const arr = Array.isArray(rawDayData[mealKey]) ? rawDayData[mealKey] : [];
        const paddedArr = [...arr];
        while (paddedArr.length < 5) paddedArr.push('');
        verifiedContent.dias[dayKey][mealKey] = paddedArr.slice(0, 5);
      });
    });

    setConteudo(verifiedContent);
    setActiveDay('segunda');
    setSelectedPlanId(plan.id);
    setEditorAction('edit');
    setMode('editor');
    setErrorMessage(null);
  };

  // Handle text field changes in the grid
  const handleInputChange = (
    day: keyof MealPlanContent['dias'],
    meal: keyof DayMeals,
    index: number,
    value: string
  ) => {
    setConteudo(prev => {
      const updated = { ...prev };
      const updatedDay = { ...updated.dias[day] };
      const updatedMeal = [...updatedDay[meal]];
      updatedMeal[index] = value;
      updatedDay[meal] = updatedMeal;
      updated.dias[day] = updatedDay;
      return updated;
    });
  };

  // Save/Update plan in database
  const handleSavePlan = async () => {
    if (!pacienteId) return;
    if (!titulo.trim()) {
      setErrorMessage('O título do plano é obrigatório.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      if (editorAction === 'create') {
        const { error } = await supabase
          .from('planos_alimentares')
          .insert([
            {
              paciente_id: pacienteId,
              titulo: titulo.trim(),
              descricao: descricao.trim(),
              conteudo: conteudo
            }
          ]);
        if (error) throw error;
        setSuccessMessage('Plano alimentar salvo com sucesso!');
      } else {
        const { error } = await supabase
          .from('planos_alimentares')
          .update({
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            conteudo: conteudo
          })
          .eq('id', selectedPlanId!);
        if (error) throw error;
        setSuccessMessage('Plano alimentar atualizado com sucesso!');
      }

      setMode('list');
      fetchPlanos();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving plan:', err);
      setErrorMessage('Erro ao persistir o plano no banco de dados.');
    } finally {
      setSaving(false);
    }
  };

  // Delete plan
  const handleDeletePlan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir este plano alimentar definitivamente?')) return;
    try {
      const { error } = await supabase
        .from('planos_alimentares')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMessage('Plano alimentar excluído.');
      fetchPlanos();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error deleting plan:', err);
      setErrorMessage('Erro ao excluir o plano.');
    }
  };

  return (
    <div className="card" style={{ padding: '0', overflow: 'visible', position: 'relative' }}>
      
      {/* Toast Notification Messages */}
      {successMessage && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '12px 20px', borderRadius: '12px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.3s' }}>
          <Check size={18} />
          <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', left: '20px', backgroundColor: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', padding: '16px 20px', borderRadius: '12px', zIndex: 100, display: 'flex', alignItems: 'flex-start', gap: '12px', boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.3s' }}>
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>Atenção</p>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── AI Loading Overlay ── */}
      {generatingAI && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.92)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 99, borderRadius: 'var(--border-radius)', backdropFilter: 'blur(4px)' }}>
          <div className="pulsing-logo-container" style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--white)', borderColor: 'var(--accent-gold)' }}>
            <img src="/favicon.svg" alt="IA NutriOl" style={{ width: '64px', height: '64px' }} />
          </div>
          <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '8px' }}>Elaborando Plano Alimentar</h3>
          <p style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.95rem' }} className="animate-pulse">{aiLoadingMessage}</p>
          <div style={{ marginTop: '24px', width: '200px', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', height: '100%', width: '50%', backgroundColor: 'var(--primary)', borderRadius: '2px', animation: 'pulse-logo 2s infinite ease-in-out' }}></div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dark)' }}>
          <span style={{ display: 'inline-flex', padding: '8px', backgroundColor: 'rgba(24, 63, 46, 0.08)', borderRadius: '8px', color: 'var(--primary)' }}>
            <Apple size={20} />
          </span>
          Planos Alimentares
        </h2>

        {mode === 'list' ? (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-outline" 
              onClick={handleNewManual}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', borderColor: 'var(--border-color)', color: 'var(--text-dark)' }}
            >
              <Plus size={16} /> Novo Manual
            </button>
            <button 
              className="btn-primary" 
              onClick={handleGenerateAI}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', width: 'auto' }}
            >
              <Sparkles size={16} /> Geração IA
            </button>
          </div>
        ) : (
          <button 
            className="btn-outline" 
            onClick={() => setMode('list')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', padding: '8px 16px' }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        )}
      </div>

      {/* ── Mode 1: List / History ── */}
      {mode === 'list' && (
        <div style={{ padding: '28px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Carregando planos alimentares...</p>
          ) : planos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed var(--border-color)', borderRadius: '12px', backgroundColor: '#faf9f6' }}>
              <Apple size={44} style={{ opacity: 0.25, margin: '0 auto 16px', color: 'var(--accent-gold)' }} />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-dark)', fontWeight: 600, marginBottom: '6px' }}>Nenhum plano alimentar gerado</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 24px' }}>
                Comece gerando um cardápio semanal personalizado via inteligência artificial ou monte um plano estruturado manualmente.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn-outline" onClick={handleNewManual}>Criar Manual</button>
                <button className="btn-primary" style={{ width: 'auto' }} onClick={handleGenerateAI}>
                  <Sparkles size={16} /> Elaborar com IA
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {planos.map(plan => {
                const isExpanded = expandedPlanId === plan.id;
                let parsedContent: MealPlanContent | null = null;
                let legacyText = '';

                // Handle both structured JSON and legacy plain-text format safely
                if (typeof plan.conteudo === 'string') {
                  try {
                    parsedContent = JSON.parse(plan.conteudo);
                  } catch {
                    legacyText = plan.conteudo;
                  }
                } else if (plan.conteudo && typeof plan.conteudo === 'object') {
                  parsedContent = plan.conteudo as any;
                }

                return (
                  <div 
                    key={plan.id} 
                    style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#faf9f6', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}
                  >
                    {/* Header of Item */}
                    <div 
                      onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                      style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ backgroundColor: 'rgba(197, 160, 89, 0.12)', padding: '10px', borderRadius: '10px', color: 'var(--accent-gold)' }}>
                          <FileText size={18} />
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '1rem', marginBottom: '2px' }}>{plan.titulo}</h4>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {format(parseISO(plan.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button 
                          className="btn-outline" 
                          onClick={(e) => { e.stopPropagation(); handleEditPlan(plan); }}
                          style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit size={14} /> Editar
                        </button>
                        <button 
                          onClick={(e) => handleDeletePlan(plan.id, e)}
                          style={{ padding: '8px', background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'background-color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Collapsed content container */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border-color)', padding: '20px', backgroundColor: 'var(--white)' }}>
                        {plan.descricao && (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', marginBottom: '16px', borderLeft: '3px solid var(--accent-gold)', paddingLeft: '10px' }}>
                            {plan.descricao}
                          </p>
                        )}

                        {/* Rendering structured JSON diet grid */}
                        {parsedContent && parsedContent.dias ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {DAYS_CONFIG.map(dayInfo => {
                              const dayData = parsedContent?.dias?.[dayInfo.key];
                              if (!dayData) return null;

                              // Check if day has any items to display
                              const hasMeals = MEALS_CONFIG.some(m => dayData[m.key]?.some(item => item.trim()));
                              if (!hasMeals) return null;

                              return (
                                <div key={dayInfo.key} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', backgroundColor: '#faf9f6' }}>
                                  <h5 style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.05rem', marginBottom: '12px', borderBottom: '1.5px solid rgba(197, 160, 89, 0.2)', paddingBottom: '6px', display: 'inline-block' }}>
                                    {dayInfo.fullLabel}
                                  </h5>

                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                    {MEALS_CONFIG.map(mealInfo => {
                                      const mealOptions = dayData[mealInfo.key] || [];
                                      const filledOptions = mealOptions.filter(opt => opt.trim());
                                      if (filledOptions.length === 0) return null;

                                      return (
                                        <div key={mealInfo.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>{mealInfo.label}</span>
                                          <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0 }}>
                                            {filledOptions.map((opt, i) => (
                                              <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', borderLeft: '2px solid var(--primary-light)', paddingLeft: '6px' }}>
                                                {opt}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Fallback to legacy plain-text renderer
                          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-dark)', fontSize: '0.92rem', lineHeight: 1.6, padding: '10px', backgroundColor: '#faf9f6', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            {legacyText || 'Sem conteúdo estruturado.'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Mode 2: Form Editor (Manual or AI Pre-filled) ── */}
      {mode === 'editor' && (
        <div style={{ padding: '28px' }}>
          
          {/* Header metadata inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '28px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Título do Plano *</label>
              <input 
                type="text" 
                value={titulo} 
                onChange={e => setTitulo(e.target.value)} 
                placeholder="Ex: Plano de Definição Muscular - Fase 1" 
                style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px', height: '44px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Descrição & Orientações Gerais</label>
              <textarea 
                value={descricao} 
                onChange={e => setDescricao(e.target.value)} 
                placeholder="Orientações de consumo de água, restrições e alternativas..." 
                style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '10px', minHeight: '80px', fontFamily: 'inherit', backgroundColor: '#ffffff' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '14px', fontSize: '1rem' }}>Cardápio Semanal Estruturado</p>

            {/* Days Horizontal Tab navigation */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
              {DAYS_CONFIG.map(dayInfo => {
                const isSelected = activeDay === dayInfo.key;
                return (
                  <button
                    key={dayInfo.key}
                    type="button"
                    onClick={() => setActiveDay(dayInfo.key)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      whiteSpace: 'nowrap',
                      backgroundColor: isSelected ? 'var(--primary)' : '#faf9f6',
                      color: isSelected ? 'var(--white)' : 'var(--text-muted)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.25s'
                    }}
                  >
                    {dayInfo.label}
                  </button>
                );
              })}
            </div>

            {/* Meals layout for the active day */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {MEALS_CONFIG.map(mealInfo => {
                const mealOptions = conteudo.dias[activeDay][mealInfo.key] || ['', '', '', '', ''];
                
                return (
                  <div 
                    key={mealInfo.key} 
                    style={{ border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', backgroundColor: '#faf9f6', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <h5 style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-dark)', marginBottom: '14px' }}>
                      {mealInfo.label}
                    </h5>

                    {/* Render exactly 5 option text fields vertically stacked */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {mealOptions.map((optionValue, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', width: '20px', fontWeight: 600, textAlign: 'right' }}>
                            {idx + 1}.
                          </span>
                          <input 
                            type="text"
                            value={optionValue}
                            onChange={(e) => handleInputChange(activeDay, mealInfo.key, idx, e.target.value)}
                            placeholder={`Alimento / porção (Opção ${idx + 1})`}
                            style={{ 
                              backgroundColor: '#ffffff', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: '8px', 
                              padding: '8px 12px',
                              height: '38px',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons at the bottom of the editor */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '36px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
            <button 
              type="button" 
              className="btn-outline" 
              onClick={() => setMode('list')}
              style={{ flex: 1, justifyContent: 'center', height: '48px', fontWeight: 600 }}
              disabled={saving}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="btn-primary" 
              onClick={handleSavePlan}
              style={{ flex: 1, height: '48px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Gravando no banco...' : 'Salvar Plano Alimentar'}
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
