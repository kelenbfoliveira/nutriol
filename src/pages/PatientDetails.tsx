import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, Save, Plus, X, Check, Scale, Activity, Utensils,
  Calendar, FileText, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const OBJECTIVES = ['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance esportiva', 'Reeducação alimentar'];
const ACTIVITY_LEVELS = ['Sedentário', 'Levemente ativo', 'Moderadamente ativo', 'Muito ativo', 'Extremamente ativo'];
const PATHOLOGIES = ['Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'];
const RESTRICTIONS = ['Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'];
const ALLERGIES = ['Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'];

// ─── Subcomponente: Modal de Nova Consulta ─────────────────────────────────
interface NovaConsultaModalProps {
  pacienteId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NovaConsultaModal: React.FC<NovaConsultaModalProps> = ({ pacienteId, isOpen, onClose, onSuccess }) => {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    data_consulta: today,
    peso: '',
    cintura: '',
    quadril: '',
    percentual_gordura: '',
    observacoes: '',
    proximo_retorno: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm({ data_consulta: today, peso: '', cintura: '', quadril: '', percentual_gordura: '', observacoes: '', proximo_retorno: '' });
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.peso) { setError('O peso é obrigatório.'); return; }
    setLoading(true);
    setError('');
    try {
      const payload: any = {
        paciente_id: pacienteId,
        data_consulta: form.data_consulta,
        peso: parseFloat(form.peso.replace(',', '.')),
        observacoes: form.observacoes || null,
        proximo_retorno: form.proximo_retorno || null
      };
      if (form.cintura) payload.cintura = parseFloat(form.cintura.replace(',', '.'));
      if (form.quadril) payload.quadril = parseFloat(form.quadril.replace(',', '.'));
      if (form.percentual_gordura) payload.percentual_gordura = parseFloat(form.percentual_gordura.replace(',', '.'));

      const { error: dbError } = await supabase.from('consultas').insert([payload]);
      if (dbError) throw dbError;
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar consulta.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)',
    borderRadius: '8px', outline: 'none', backgroundColor: '#f9fafb',
    fontFamily: 'inherit', fontSize: '0.95rem', transition: 'border-color 0.2s'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: '560px', padding: '32px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', color: 'var(--text-muted)', padding: '4px' }}>
          <X size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '10px' }}>
            <Activity size={22} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-dark)' }}>Nova Consulta</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>Registre os dados antropométricos do atendimento.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Data da Consulta *</label>
              <input type="date" name="data_consulta" value={form.data_consulta} onChange={handleChange} style={inputStyle} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label className="form-label">Peso Atual (kg) *</label>
              <input type="number" step="0.1" name="peso" value={form.peso} onChange={handleChange} placeholder="Ex: 72.5" style={{ ...inputStyle, paddingRight: '40px' }} />
              <span style={{ position: 'absolute', right: '14px', bottom: '11px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>kg</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label className="form-label">Cintura <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span></label>
              <input type="number" step="0.1" name="cintura" value={form.cintura} onChange={handleChange} placeholder="cm" style={{ ...inputStyle, paddingRight: '36px' }} />
              <span style={{ position: 'absolute', right: '14px', bottom: '11px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>cm</span>
            </div>
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label className="form-label">Quadril <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span></label>
              <input type="number" step="0.1" name="quadril" value={form.quadril} onChange={handleChange} placeholder="cm" style={{ ...inputStyle, paddingRight: '36px' }} />
              <span style={{ position: 'absolute', right: '14px', bottom: '11px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>cm</span>
            </div>
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label className="form-label">% Gordura <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span></label>
              <input type="number" step="0.1" name="percentual_gordura" value={form.percentual_gordura} onChange={handleChange} placeholder="%" style={{ ...inputStyle, paddingRight: '30px' }} />
              <span style={{ position: 'absolute', right: '14px', bottom: '11px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>%</span>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Observações</label>
            <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Evolução, intercorrências, orientações..." style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Próximo Retorno</label>
            <input type="date" name="proximo_retorno" value={form.proximo_retorno} onChange={handleChange} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Consulta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Componente de chip de tag ─────────────────────────────────────────────
const TagChip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '6px 14px', borderRadius: '9999px', fontSize: '0.85rem',
      border: `1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
      backgroundColor: active ? '#ecfdf5' : '#fff',
      color: active ? 'var(--primary)' : 'var(--text-muted)',
      display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s'
    }}
  >
    {active && <Check size={12} />}{label}
  </button>
);

// ─── Componente Principal ──────────────────────────────────────────────────
const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Patient Data State ──
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'pessoal' | 'clinico' | 'habitos'>('pessoal');

  // Pessoal
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [idade, setIdade] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  // Clínico
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [objetivoOutro, setObjetivoOutro] = useState('');
  const [nivelAtividade, setNivelAtividade] = useState('');
  const [patologias, setPatologias] = useState<string[]>([]);
  const [patologiasOutro, setPatologiasOutro] = useState('');
  const [restricoes, setRestricoes] = useState<string[]>([]);
  const [restricoesOutro, setRestricoesOutro] = useState('');
  const [alergias, setAlergias] = useState<string[]>([]);
  const [alergiasOutro, setAlergiasOutro] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [suplementos, setSuplementos] = useState('');
  // Hábitos
  const [refeicoesDia, setRefeicoesDia] = useState('');
  const [horaAcorda, setHoraAcorda] = useState('');
  const [horaDorme, setHoraDorme] = useState('');
  const [aguaDia, setAguaDia] = useState('');
  const [praticaAtividade, setPraticaAtividade] = useState('nao');
  const [qualAtividade, setQualAtividade] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // ── Consultas State ──
  const [consultas, setConsultas] = useState<any[]>([]);
  const [consultasLoading, setConsultasLoading] = useState(true);
  const [isConsultaModalOpen, setIsConsultaModalOpen] = useState(false);
  const [expandedConsulta, setExpandedConsulta] = useState<string | null>(null);

  // ── Planos State ──
  const [planos, setPlanos] = useState<any[]>([]);
  const [planosLoading, setPlanosLoading] = useState(true);
  const [expandedPlano, setExpandedPlano] = useState<string | null>(null);

  // ── Computed ──
  const pesoNum = parseFloat(peso.replace(',', '.'));
  const alturaNum = parseFloat(altura);
  const imc = pesoNum && alturaNum ? (pesoNum / ((alturaNum / 100) ** 2)).toFixed(1) : '';

  // ── Age Calculation ──
  useEffect(() => {
    if (dataNascimento) {
      const birth = new Date(dataNascimento);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      setIdade(age.toString());
    } else setIdade('');
  }, [dataNascimento]);

  // ── Fetch Patient ──
  useEffect(() => {
    if (!id) return;
    const fetchPaciente = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('pacientes').select('*').eq('id', id).single();
      if (!error && data) {
        setNome(data.nome || '');
        setDataNascimento(data.data_nascimento || '');
        setSexo(data.sexo || '');
        setTelefone(data.telefone || '');
        setWhatsapp(data.whatsapp || '');
        setEmail(data.email || '');
        setPeso(data.peso_inicial ? data.peso_inicial.toString() : '');
        setAltura(data.altura ? data.altura.toString() : '');
        const dbObj = data.objetivos || [];
        setObjetivos(dbObj.filter((o: string) => OBJECTIVES.includes(o)));
        setObjetivoOutro(dbObj.find((o: string) => !OBJECTIVES.includes(o)) || '');
        setNivelAtividade(data.nivel_atividade || '');
        const dbPat = data.patologias || [];
        setPatologias(dbPat.includes('Nenhum') ? ['Nenhum'] : dbPat.filter((p: string) => PATHOLOGIES.includes(p)));
        setPatologiasOutro(dbPat.find((p: string) => !PATHOLOGIES.includes(p) && p !== 'Nenhum') || '');
        const dbRest = data.restricoes_alimentares || [];
        setRestricoes(dbRest.includes('Nenhum') ? ['Nenhum'] : dbRest.filter((r: string) => RESTRICTIONS.includes(r)));
        setRestricoesOutro(dbRest.find((r: string) => !RESTRICTIONS.includes(r) && r !== 'Nenhum') || '');
        const dbAler = data.alergias || [];
        setAlergias(dbAler.includes('Nenhum') ? ['Nenhum'] : dbAler.filter((a: string) => ALLERGIES.includes(a)));
        setAlergiasOutro(dbAler.find((a: string) => !ALLERGIES.includes(a) && a !== 'Nenhum') || '');
        setMedicamentos(data.medicamentos || '');
        setSuplementos(data.suplementos || '');
        setRefeicoesDia(data.refeicoes_por_dia ? data.refeicoes_por_dia.toString() : '');
        setHoraAcorda(data.horario_acorda || '');
        setHoraDorme(data.horario_dorme || '');
        setAguaDia(data.litros_agua ? data.litros_agua.toString() : '');
        setPraticaAtividade(data.atividade_fisica ? 'sim' : 'nao');
        setQualAtividade(data.atividade_fisica_descricao || '');
        setObservacoes(data.observacoes || '');
      }
      setLoading(false);
    };
    fetchPaciente();
  }, [id]);

  // ── Fetch Consultas ──
  const fetchConsultas = useCallback(async () => {
    if (!id) return;
    setConsultasLoading(true);
    const { data, error } = await supabase
      .from('consultas')
      .select('*')
      .eq('paciente_id', id)
      .order('data_consulta', { ascending: true });
    if (!error && data) setConsultas(data);
    setConsultasLoading(false);
  }, [id]);

  useEffect(() => { fetchConsultas(); }, [fetchConsultas]);

  // ── Fetch Planos ──
  const fetchPlanos = useCallback(async () => {
    if (!id) return;
    setPlanosLoading(true);
    const { data, error } = await supabase
      .from('planos_alimentares')
      .select('*')
      .eq('paciente_id', id)
      .order('created_at', { ascending: false });
    if (!error && data) setPlanos(data);
    setPlanosLoading(false);
  }, [id]);

  useEffect(() => { fetchPlanos(); }, [fetchPlanos]);

  // ── Save Patient ──
  const handleSave = async () => {
    if (!nome.trim()) { setErrorMsg('O nome é obrigatório.'); return; }
    setSaveLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase.from('pacientes').update({
        nome,
        data_nascimento: dataNascimento || null,
        sexo: sexo || null,
        whatsapp: whatsapp || null,
        email: email || null,
        peso_inicial: pesoNum && !isNaN(pesoNum) ? pesoNum : null,
        altura: alturaNum && !isNaN(alturaNum) ? alturaNum : null,
        objetivos: [...objetivos, objetivoOutro].filter(Boolean),
        objetivo_texto: objetivos[0] || objetivoOutro || null,
        nivel_atividade: nivelAtividade || null,
        patologias: [...patologias, patologiasOutro].filter(Boolean),
        restricoes_alimentares: [...restricoes, restricoesOutro].filter(Boolean),
        alergias: [...alergias, alergiasOutro].filter(Boolean),
        medicamentos: medicamentos || null,
        suplementos: suplementos || null,
        refeicoes_por_dia: refeicoesDia ? parseInt(refeicoesDia) : null,
        horario_acorda: horaAcorda || null,
        horario_dorme: horaDorme || null,
        litros_agua: aguaDia ? parseFloat(aguaDia.replace(',', '.')) : null,
        atividade_fisica: praticaAtividade === 'sim',
        atividade_fisica_descricao: qualAtividade || null,
        observacoes: observacoes || null
      }).eq('id', id!);
      if (error) throw error;
      setSuccessMsg('Alterações salvas com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar.');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Multi-select helper ──
  const handleMultiSelect = (setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[], item: string) => {
    if (item === 'Nenhum') { setter(['Nenhum']); return; }
    let next = list.includes('Nenhum') ? [] : [...list];
    next = next.includes(item) ? next.filter(i => i !== item) : [...next, item];
    setter(next);
  };

  // ── Chart data ──
  const chartData = consultas.map(c => ({
    date: format(parseISO(c.data_consulta), 'dd/MM', { locale: ptBR }),
    peso: c.peso,
    gordura: c.percentual_gordura
  }));

  // ── Styles ──
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-dark)',
    marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px'
  };
  const sectionIconStyle: React.CSSProperties = {
    backgroundColor: '#ecfdf5', padding: '8px', borderRadius: '10px'
  };
  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)',
    borderRadius: '8px', outline: 'none', backgroundColor: '#f9fafb', fontFamily: 'inherit'
  };
  const textareaStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1px solid var(--border-color)',
    borderRadius: '8px', outline: 'none', minHeight: '80px', fontFamily: 'inherit',
    backgroundColor: '#f9fafb', resize: 'vertical'
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: 'var(--primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #ecfdf5', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        Carregando perfil...
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .consult-card:hover { border-color: var(--primary) !important; } .plano-card:hover { border-color: var(--accent-gold-light) !important; }`}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: '28px' }}>
        <Link to="/patients" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '12px', fontSize: '0.9rem', fontWeight: 500 }}>
          <ArrowLeft size={15} /> Voltar para Pacientes
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: '4px' }}>{nome || 'Paciente'}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {idade ? `${idade} anos` : 'Idade não informada'}
              {whatsapp ? ` • ${whatsapp}` : ''}
              {email ? ` • ${email}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ── Seção 1: Dados do Paciente ── */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={sectionTitleStyle}>
            <span style={sectionIconStyle}><FileText size={20} color="var(--primary)" /></span>
            Dados do Paciente
          </h2>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={handleSave} disabled={saveLoading}>
            <Save size={16} />
            {saveLoading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

        {successMsg && (
          <div style={{ margin: '0 28px', marginTop: '16px', backgroundColor: '#ecfdf5', color: 'var(--primary)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #a7f3d0', fontWeight: 500 }}>
            <Check size={16} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ margin: '0 28px', marginTop: '16px' }} className="error-message">
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />{errorMsg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: '#faf9f6' }}>
          {(['pessoal', 'clinico', 'habitos'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '16px 20px', fontWeight: 600, fontSize: '0.95rem',
              background: 'none', borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)', transition: 'all 0.2s'
            }}>
              {tab === 'pessoal' ? '1. Pessoal' : tab === 'clinico' ? '2. Clínico' : '3. Hábitos'}
            </button>
          ))}
        </div>

        <div style={{ padding: '28px' }}>
          {/* TAB: PESSOAL */}
          {activeTab === 'pessoal' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome Completo *</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do paciente" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Data de Nascimento</label>
                  <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Idade (Automática)</label>
                  <input type="text" disabled value={idade ? `${idade} anos` : ''} style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Sexo</label>
                  <select value={sexo} onChange={e => setSexo(e.target.value)} style={selectStyle}>
                    <option value="">Selecione...</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">WhatsApp</label>
                  <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Telefone</label>
                  <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 0000-0000" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="paciente@email.com" />
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLÍNICO */}
          {activeTab === 'clinico' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                  <label className="form-label">Peso Inicial</label>
                  <input type="number" step="0.1" value={peso} onChange={e => setPeso(e.target.value)} placeholder="0.0" style={{ paddingRight: '36px' }} />
                  <span style={{ position: 'absolute', right: '14px', bottom: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>kg</span>
                </div>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                  <label className="form-label">Altura</label>
                  <input type="number" value={altura} onChange={e => setAltura(e.target.value)} placeholder="Ex: 170" style={{ paddingRight: '36px' }} />
                  <span style={{ position: 'absolute', right: '14px', bottom: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>cm</span>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">IMC (Automático)</label>
                  <input type="text" disabled value={imc} style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: imc ? 'var(--primary)' : 'inherit', fontWeight: 'bold' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Objetivo</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  {OBJECTIVES.map(obj => <TagChip key={obj} label={obj} active={objetivos.includes(obj)} onClick={() => handleMultiSelect(setObjetivos, objetivos, obj)} />)}
                </div>
                <input type="text" value={objetivoOutro} onChange={e => setObjetivoOutro(e.target.value)} placeholder="Outro objetivo..." />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nível de Atividade Física</label>
                <select value={nivelAtividade} onChange={e => setNivelAtividade(e.target.value)} style={selectStyle}>
                  <option value="">Selecione...</option>
                  {ACTIVITY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Patologias / Condições</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  <TagChip label="Nenhum" active={patologias.includes('Nenhum')} onClick={() => handleMultiSelect(setPatologias, patologias, 'Nenhum')} />
                  {PATHOLOGIES.map(p => <TagChip key={p} label={p} active={patologias.includes(p)} onClick={() => handleMultiSelect(setPatologias, patologias, p)} />)}
                </div>
                <input type="text" value={patologiasOutro} onChange={e => setPatologiasOutro(e.target.value)} placeholder="Outra condição..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Restrições Alimentares</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    <TagChip label="Nenhum" active={restricoes.includes('Nenhum')} onClick={() => handleMultiSelect(setRestricoes, restricoes, 'Nenhum')} />
                    {RESTRICTIONS.map(r => <TagChip key={r} label={r} active={restricoes.includes(r)} onClick={() => handleMultiSelect(setRestricoes, restricoes, r)} />)}
                  </div>
                  <input type="text" value={restricoesOutro} onChange={e => setRestricoesOutro(e.target.value)} placeholder="Outras restrições..." />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Alergias Alimentares</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    <TagChip label="Nenhum" active={alergias.includes('Nenhum')} onClick={() => handleMultiSelect(setAlergias, alergias, 'Nenhum')} />
                    {ALLERGIES.map(a => <TagChip key={a} label={a} active={alergias.includes(a)} onClick={() => handleMultiSelect(setAlergias, alergias, a)} />)}
                  </div>
                  <input type="text" value={alergiasOutro} onChange={e => setAlergiasOutro(e.target.value)} placeholder="Outras alergias..." />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Medicamentos Contínuos</label>
                  <textarea value={medicamentos} onChange={e => setMedicamentos(e.target.value)} placeholder="Nomes, dosagens..." style={textareaStyle} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Suplementos em uso</label>
                  <textarea value={suplementos} onChange={e => setSuplementos(e.target.value)} placeholder="Whey, Creatina..." style={textareaStyle} />
                </div>
              </div>
            </div>
          )}

          {/* TAB: HÁBITOS */}
          {activeTab === 'habitos' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Refeições/dia</label>
                  <input type="number" value={refeicoesDia} onChange={e => setRefeicoesDia(e.target.value)} placeholder="Ex: 4" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Hora que acorda</label>
                  <input type="text" value={horaAcorda} onChange={e => setHoraAcorda(e.target.value)} placeholder="Ex: 07:00" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Hora que dorme</label>
                  <input type="text" value={horaDorme} onChange={e => setHoraDorme(e.target.value)} placeholder="Ex: 23:00" />
                </div>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                  <label className="form-label">Água por dia</label>
                  <input type="number" step="0.1" value={aguaDia} onChange={e => setAguaDia(e.target.value)} placeholder="Ex: 2.5" style={{ paddingRight: '46px' }} />
                  <span style={{ position: 'absolute', right: '14px', bottom: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>litros</span>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Pratica Atividade Física?</label>
                <div style={{ display: 'flex', gap: '20px', marginBottom: praticaAtividade === 'sim' ? '12px' : 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="praticaAtividade" value="sim" checked={praticaAtividade === 'sim'} onChange={() => setPraticaAtividade('sim')} /> Sim
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="praticaAtividade" value="nao" checked={praticaAtividade === 'nao'} onChange={() => setPraticaAtividade('nao')} /> Não
                  </label>
                </div>
                {praticaAtividade === 'sim' && <input type="text" value={qualAtividade} onChange={e => setQualAtividade(e.target.value)} placeholder="Qual atividade e frequência? Ex: Musculação 4x/semana" />}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Observações Gerais</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Informações relevantes sobre o paciente..." style={{ ...textareaStyle, minHeight: '100px' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Seção 2: Consultas ── */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={sectionTitleStyle}>
            <span style={sectionIconStyle}><Scale size={20} color="var(--primary)" /></span>
            Consultas
          </h2>
          <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setIsConsultaModalOpen(true)}>
            <Plus size={16} /> Nova Consulta
          </button>
        </div>

        {/* Chart */}
        <div style={{ padding: '28px', borderBottom: '1px solid var(--border-color)' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-dark)', marginBottom: '16px', fontSize: '0.95rem' }}>Evolução de Peso</p>
          {consultasLoading ? (
            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Carregando dados...</div>
          ) : chartData.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
              <Scale size={36} style={{ opacity: 0.3, marginBottom: '10px', color: 'var(--primary)' }} />
              <p style={{ fontWeight: 500 }}>Nenhuma consulta registrada ainda</p>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Adicione a primeira consulta para visualizar o gráfico.</p>
            </div>
          ) : (
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: 'var(--shadow-lg)', fontFamily: 'inherit' }}
                    formatter={(v: any) => [`${v} kg`, 'Peso']}
                  />
                  <Area type="monotone" dataKey="peso" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorPeso)" dot={{ fill: 'var(--primary)', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Consultas List */}
        <div style={{ padding: '28px' }}>
          {consultasLoading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Carregando consultas...</p>
          ) : consultas.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Nenhuma consulta registrada ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[...consultas].reverse().map(c => (
                <div key={c.id} className="consult-card" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  <button
                    onClick={() => setExpandedConsulta(expandedConsulta === c.id ? null : c.id)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ backgroundColor: '#ecfdf5', padding: '8px 14px', borderRadius: '8px', textAlign: 'center', minWidth: '70px' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                          {format(parseISO(c.data_consulta), 'MMM', { locale: ptBR })}
                        </p>
                        <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                          {format(parseISO(c.data_consulta), 'dd')}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                          {format(parseISO(c.data_consulta), 'yyyy')}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        {c.peso && <div><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>PESO</p><p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.05rem' }}>{c.peso} kg</p></div>}
                        {c.cintura && <div><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>CINTURA</p><p style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{c.cintura} cm</p></div>}
                        {c.quadril && <div><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>QUADRIL</p><p style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{c.quadril} cm</p></div>}
                        {c.percentual_gordura && <div><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>% GORDURA</p><p style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{c.percentual_gordura}%</p></div>}
                      </div>
                    </div>
                    {expandedConsulta === c.id ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </button>
                  {expandedConsulta === c.id && (
                    <div style={{ borderTop: '1px solid var(--border-color)', padding: '16px 20px', backgroundColor: '#fafafa' }}>
                      {c.observacoes && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Observações</p>
                          <p style={{ color: 'var(--text-dark)', fontSize: '0.95rem' }}>{c.observacoes}</p>
                        </div>
                      )}
                      {c.proximo_retorno && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ecfdf5', padding: '10px 14px', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 500 }}>
                          <Calendar size={15} />
                          Próximo retorno: {format(parseISO(c.proximo_retorno), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                        </div>
                      )}
                      {!c.observacoes && !c.proximo_retorno && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sem observações ou retorno registrado.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Seção 3: Planos Alimentares ── */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={sectionTitleStyle}>
            <span style={sectionIconStyle}><Utensils size={20} color="var(--primary)" /></span>
            Planos Alimentares
          </h2>
          <button
            className="btn-primary"
            style={{ width: 'auto', opacity: 0.7, cursor: 'not-allowed' }}
            disabled
            title="Em breve: geração automática de planos"
          >
            <Plus size={16} /> Gerar Plano Alimentar
          </button>
        </div>

        <div style={{ padding: '28px' }}>
          {planosLoading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Carregando planos...</p>
          ) : planos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
              <Utensils size={40} style={{ opacity: 0.25, margin: '0 auto 12px', color: 'var(--accent-gold)', display: 'block' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>Nenhum plano alimentar gerado ainda</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Em breve será possível gerar planos automaticamente com IA.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {planos.map(p => (
                <div key={p.id} className="plano-card" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  <button
                    onClick={() => setExpandedPlano(expandedPlano === p.id ? null : p.id)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ backgroundColor: 'rgba(197,160,89,0.1)', padding: '10px', borderRadius: '8px' }}>
                        <FileText size={18} color="var(--accent-gold)" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-dark)', marginBottom: '2px' }}>{p.titulo || 'Plano sem título'}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {p.created_at ? format(parseISO(p.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR }) : ''}
                        </p>
                      </div>
                    </div>
                    {expandedPlano === p.id ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </button>
                  {expandedPlano === p.id && (
                    <div style={{ borderTop: '1px solid var(--border-color)', padding: '20px', backgroundColor: '#fafafa' }}>
                      {p.descricao && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px', fontStyle: 'italic' }}>{p.descricao}</p>}
                      <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-dark)', fontSize: '0.95rem', lineHeight: 1.7 }}>
                        {p.conteudo || 'Sem conteúdo registrado.'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Nova Consulta */}
      <NovaConsultaModal
        pacienteId={id!}
        isOpen={isConsultaModalOpen}
        onClose={() => setIsConsultaModalOpen(false)}
        onSuccess={() => { fetchConsultas(); }}
      />
    </div>
  );
};

export default PatientDetails;
