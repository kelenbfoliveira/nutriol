import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, Save, Plus, X, Check, Scale, Activity,
  Calendar, FileText, ChevronDown, ChevronUp, AlertCircle, Trash2, Edit, Printer, Camera
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MealPlanManager } from '../components/MealPlanManager';
import { getPatientPhoto, formatPhoneNumber, formatWhatsAppNumber } from '../lib/utils';

const OBJECTIVES = ['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance esportiva', 'Reeducação alimentar'];
const ACTIVITY_LEVELS = ['Sedentário', 'Levemente ativo', 'Moderadamente ativo', 'Muito ativo', 'Extremamente ativo'];
const PATHOLOGIES = ['Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'];
const RESTRICTIONS = ['Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'];
const ALLERGIES = ['Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'];

// ─── Subcomponente: Modal de Nova/Edição de Consulta ────────────────────────────
interface NovaConsultaModalProps {
  pacienteId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  consultaParaEditar?: any; // se preenchido, entra em modo de edição
}

const NovaConsultaModal: React.FC<NovaConsultaModalProps> = ({ pacienteId, isOpen, onClose, onSuccess, consultaParaEditar }) => {
  const isEditing = !!consultaParaEditar;
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    data_consulta: today,
    hora_consulta: new Date().toTimeString().slice(0, 5),
    peso: '',
    cintura: '',
    quadril: '',
    percentual_gordura: '',
    observacoes: '',
    proximo_retorno: '',
    hora_retorno: '09:00'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (isEditing && consultaParaEditar) {
        // Pré-preenche com dados da consulta existente
        const dc = consultaParaEditar.data_consulta?.replace(' ', 'T') || '';
        const pr = consultaParaEditar.proximo_retorno?.replace(' ', 'T') || '';
        setForm({
          data_consulta: dc ? dc.slice(0, 10) : today,
          hora_consulta: dc.length > 10 ? dc.slice(11, 16) : '09:00',
          peso: consultaParaEditar.peso?.toString() || '',
          cintura: consultaParaEditar.cintura?.toString() || '',
          quadril: consultaParaEditar.quadril?.toString() || '',
          percentual_gordura: consultaParaEditar.percentual_gordura?.toString() || '',
          observacoes: consultaParaEditar.observacoes || '',
          proximo_retorno: pr ? pr.slice(0, 10) : '',
          hora_retorno: pr.length > 10 ? pr.slice(11, 16) : '09:00'
        });
      } else {
        setForm({
          data_consulta: today,
          hora_consulta: new Date().toTimeString().slice(0, 5),
          peso: '',
          cintura: '',
          quadril: '',
          percentual_gordura: '',
          observacoes: '',
          proximo_retorno: '',
          hora_retorno: '09:00'
        });
      }
      setError('');
    }
  }, [isOpen, isEditing, consultaParaEditar, today]);

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
      const datetimeString = `${form.data_consulta}T${form.hora_consulta || '00:00'}:00`;
      const proximoRetornoString = form.proximo_retorno
        ? `${form.proximo_retorno}T${form.hora_retorno || '09:00'}:00`
        : null;

      const now = new Date();
      const attendanceDate = new Date(datetimeString);
      if (attendanceDate > now) {
        throw new Error('A data e hora do atendimento não podem estar no futuro.');
      }

      if (proximoRetornoString) {
        const returnDate = new Date(proximoRetornoString);
        if (returnDate <= now) {
          throw new Error('A data e hora da próxima consulta (retorno) não podem estar no passado.');
        }
      }

      const payload: any = {
        paciente_id: pacienteId,
        data_consulta: datetimeString,
        peso: parseFloat(form.peso.replace(',', '.')),
        observacoes: form.observacoes || null,
        proximo_retorno: proximoRetornoString,
        status: 'finalizada'
      };
      if (form.cintura) payload.cintura = parseFloat(form.cintura.replace(',', '.'));
      if (form.quadril) payload.quadril = parseFloat(form.quadril.replace(',', '.'));
      if (form.percentual_gordura) payload.percentual_gordura = parseFloat(form.percentual_gordura.replace(',', '.'));

      if (isEditing) {
        // Se a data de consulta ou o próximo retorno mudaram, reseta as flags de WhatsApp e ajusta status
        const dataMudou = consultaParaEditar.data_consulta !== datetimeString || 
                          consultaParaEditar.proximo_retorno !== proximoRetornoString;
        if (dataMudou) {
          payload.whatsapp_confirmation_sent = false;
          payload.whatsapp_reminder_sent = false;
          payload.whatsapp_thankyou_sent = false;
          
          if (consultaParaEditar.status === 'reagendar') {
            payload.status = 'agendada';
          }
        }

        const { error: dbError } = await supabase.from('consultas').update(payload).eq('id', consultaParaEditar.id);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase.from('consultas').insert([payload]);
        if (dbError) throw dbError;
      }
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
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-dark)' }}>
            {isEditing ? 'Editar Consulta' : 'Nova Consulta'}
          </h2>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
          {isEditing ? 'Altere os dados antropométricos da consulta.' : 'Registre os dados antropométricos do atendimento.'}
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="grid-2-cols">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Data do Atendimento *</label>
              <input type="date" name="data_consulta" value={form.data_consulta} onChange={handleChange} style={inputStyle} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Hora do Atendimento *</label>
              <input type="time" name="hora_consulta" value={form.hora_consulta} onChange={handleChange} style={inputStyle} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label className="form-label">Peso Atual (kg) *</label>
              <input type="number" step="0.1" name="peso" value={form.peso} onChange={handleChange} placeholder="Ex: 72.5" style={{ ...inputStyle, paddingRight: '40px' }} />
              <span style={{ position: 'absolute', right: '14px', bottom: '11px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>kg</span>
            </div>
          </div>

          <div className="grid-3-cols">
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

          <div className="grid-2-cols">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Próxima Consulta (Data)</label>
              <input type="date" name="proximo_retorno" value={form.proximo_retorno} onChange={handleChange} style={inputStyle} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Próxima Consulta (Hora)</label>
              <input type="time" name="hora_retorno" value={form.hora_retorno} onChange={handleChange} style={inputStyle} disabled={!form.proximo_retorno} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Consulta' : 'Salvar Consulta'}
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
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
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
  const [consultaParaEditar, setConsultaParaEditar] = useState<any | null>(null);
  const [expandedConsulta, setExpandedConsulta] = useState<string | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'peso' | 'medidas'>('peso');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // ── Impressão State ──
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [printMode, setPrintMode] = useState<'cadastral' | 'tecnica' | null>(null);



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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .eq('nutricionista_id', session.user.id)
        .single();
      if (!error && data) {
        setNome(data.nome || '');
        setDataNascimento(data.data_nascimento || '');
        setSexo(data.sexo || '');
        setTelefone(formatPhoneNumber(data.telefone || ''));
        setWhatsapp(formatPhoneNumber(data.whatsapp || ''));
        setEmail(data.email || '');
        setFotoUrl(data.foto_url || null);
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

  // ── Delete Consulta ──
  const handleDeleteConsulta = async (consultaId: string) => {
    setDeleteLoading(true);
    const { error } = await supabase.from('consultas').delete().eq('id', consultaId);
    if (!error) {
      setConsultas(prev => prev.filter(c => c.id !== consultaId));
      setDeleteConfirmId(null);
      setExpandedConsulta(null);
    }
    setDeleteLoading(false);
  };

  // ── Finalizar Consulta ──
  const handleFinalizarConsulta = async (consultaId: string) => {
    try {
      const { error } = await supabase
        .from('consultas')
        .update({ status: 'finalizada' })
        .eq('id', consultaId);

      if (error) throw error;
      setConsultas(prev => prev.map(c => c.id === consultaId ? { ...c, status: 'finalizada' } : c));
    } catch (err: any) {
      console.error('Erro ao finalizar consulta:', err);
      alert('Não foi possível finalizar a consulta. Tente novamente.');
    }
  };

  // ── Enviar Agradecimento Pós-Consulta ──
  const handleSendAgradecimento = async (consultaId: string) => {
    if (!whatsapp) return;
    const cleanNumber = formatWhatsAppNumber(whatsapp);

    // Busca o plano alimentar mais recente do paciente
    const { data: plano } = await supabase
      .from('planos_alimentares')
      .select('id')
      .eq('paciente_id', id!)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const planLink = plano 
      ? `${window.location.origin}/plano-alimentar?id=${plano.id}`
      : `${window.location.origin}/patients/${id!}`;

    const message = `Olá, ${nome}! Foi um prazer atender você hoje. Aqui está o seu plano alimentar: ${planLink}. Qualquer dúvida, estou por aqui. Um abraço!`;
    const url = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    // Atualiza o status no banco de dados para evitar reenvio
    await supabase
      .from('consultas')
      .update({ whatsapp_thankyou_sent: true })
      .eq('id', consultaId);
  };

  // ── handlePhotoChange ──
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('A foto deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setFotoUrl(base64Data);

      try {
        setSaveLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão expirada. Faça login novamente.');

        const { error } = await supabase
          .from('pacientes')
          .update({ foto_url: base64Data })
          .eq('id', id!)
          .eq('nutricionista_id', session.user.id);

        if (error) throw error;
        setSuccessMsg('Foto atualizada com sucesso!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao salvar a foto.');
      } finally {
        setSaveLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Save Patient ──
  const handleSave = async () => {
    if (!nome.trim()) { setErrorMsg('O nome é obrigatório.'); return; }
    setSaveLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');
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
      }).eq('id', id!).eq('nutricionista_id', session.user.id);
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
    date: format(parseISO(c.data_consulta.replace(' ', 'T')), 'dd/MM', { locale: ptBR }),
    peso: c.peso,
    gordura: c.percentual_gordura,
    cintura: c.cintura,
    quadril: c.quadril
  }));

  // Calculate clinical deltas between first and latest consultations
  const getClinicalDeltas = () => {
    const deltas = {
      peso: { initial: 0, current: 0, diff: 0, hasData: false },
      gordura: { initial: 0, current: 0, diff: 0, hasData: false },
      cintura: { initial: 0, current: 0, diff: 0, hasData: false },
      quadril: { initial: 0, current: 0, diff: 0, hasData: false }
    };

    if (consultas && consultas.length > 0) {
      const sortedCons = [...consultas].sort((a, b) => new Date(a.data_consulta).getTime() - new Date(b.data_consulta).getTime());

      const weightCons = sortedCons.filter(c => c.peso !== null && c.peso !== undefined);
      if (weightCons.length > 0) {
        const first = weightCons[0];
        const latest = weightCons[weightCons.length - 1];
        deltas.peso = {
          initial: first.peso,
          current: latest.peso,
          diff: latest.peso - first.peso,
          hasData: true
        };
      }

      const fatCons = sortedCons.filter(c => c.percentual_gordura !== null && c.percentual_gordura !== undefined);
      if (fatCons.length > 0) {
        const first = fatCons[0];
        const latest = fatCons[fatCons.length - 1];
        deltas.gordura = {
          initial: first.percentual_gordura,
          current: latest.percentual_gordura,
          diff: latest.percentual_gordura - first.percentual_gordura,
          hasData: true
        };
      }

      const waistCons = sortedCons.filter(c => c.cintura !== null && c.cintura !== undefined);
      if (waistCons.length > 0) {
        const first = waistCons[0];
        const latest = waistCons[waistCons.length - 1];
        deltas.cintura = {
          initial: first.cintura,
          current: latest.cintura,
          diff: latest.cintura - first.cintura,
          hasData: true
        };
      }

      const hipCons = sortedCons.filter(c => c.quadril !== null && c.quadril !== undefined);
      if (hipCons.length > 0) {
        const first = hipCons[0];
        const latest = hipCons[hipCons.length - 1];
        deltas.quadril = {
          initial: first.quadril,
          current: latest.quadril,
          diff: latest.quadril - first.quadril,
          hasData: true
        };
      }
    }

    return deltas;
  };

  const clinicalDeltas = getClinicalDeltas();

  // ── Styles ──
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

  // ── PrintModal ──
  const PrintModal = () => {
    if (!printMode) return null;
    const isCadastral = printMode === 'cadastral';
    const lastConsulta = consultas.length > 0 ? consultas[consultas.length - 1] : null;

    const handlePrint = () => {
      window.print();
    };

    return createPortal(
      <div className="print-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 2000, backdropFilter: 'blur(4px)', padding: '20px', overflowY: 'auto' }}>
        <div id="print-content" style={{ width: '100%', maxWidth: '720px', backgroundColor: '#fff', borderRadius: '12px', padding: '40px', position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
          {/* Controles fora da área de impressão */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid var(--border-color)' }}>
            <h3 style={{ color: 'var(--text-dark)', fontWeight: 700, fontSize: '1.1rem' }}>
              {isCadastral ? 'Ficha Cadastral' : 'Ficha Técnica / Resumo Clínico'}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px', gap: '6px' }} onClick={handlePrint}>
                <Printer size={14} /> Imprimir
              </button>
              <button className="btn-outline" style={{ padding: '8px 12px' }} onClick={() => setPrintMode(null)}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Cabeçalho do documento */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/favicon.svg" alt="NutriOl" style={{ width: '36px', height: '36px' }} />
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>NutriOl</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Sistema de Gestão Nutricional</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{isCadastral ? 'FICHA CADASTRAL' : 'FICHA TÉCNICA'}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Emissão: {format(new Date(), "dd/MM/yyyy")}</p>
            </div>
          </div>

          {/* Nome do paciente */}
          <div style={{ backgroundColor: 'var(--primary)', color: '#fff', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{nome}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
              {idade ? `${idade} anos` : ''} {sexo ? `• ${sexo}` : ''}
            </p>
          </div>

          {isCadastral ? (
            // ── FICHA CADASTRAL ──
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Dados Pessoais</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[['Data de Nascimento', dataNascimento ? format(new Date(dataNascimento), 'dd/MM/yyyy') : '—'], ['Sexo', sexo || '—'], ['Telefone', telefone || '—'], ['WhatsApp', whatsapp || '—'], ['E-mail', email || '—']].map(([k, v]) => (
                    <div key={k}><p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{k}</p><p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: 500, margin: '2px 0 0' }}>{v}</p></div>
                  ))}
                </div>
              </section>
              <section>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Dados Clínicos</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {[['Peso Inicial', peso ? `${peso} kg` : '—'], ['Altura', altura ? `${altura} cm` : '—'], ['IMC Inicial', imc || '—']].map(([k, v]) => (
                    <div key={k}><p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{k}</p><p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: 500, margin: '2px 0 0' }}>{v}</p></div>
                  ))}
                </div>
              </section>
              {objetivos.length > 0 && (
                <section>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Objetivos</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)' }}>{[...objetivos, objetivoOutro].filter(Boolean).join(', ')}</p>
                </section>
              )}
              {patologias.length > 0 && (
                <section>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Patologias / Doenças</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)' }}>{[...patologias, patologiasOutro].filter(Boolean).join(', ')}</p>
                </section>
              )}
              {(restricoes.length > 0 || restricoesOutro) && (
                <section>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Restrições Alimentares</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)' }}>{[...restricoes, restricoesOutro].filter(Boolean).join(', ')}</p>
                </section>
              )}
              {(alergias.length > 0 || alergiasOutro) && (
                <section>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Alergias</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)' }}>{[...alergias, alergiasOutro].filter(Boolean).join(', ')}</p>
                </section>
              )}
              {medicamentos && (
                <section>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Medicamentos Contínuos</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', whiteSpace: 'pre-wrap' }}>{medicamentos}</p>
                </section>
              )}
              {suplementos && (
                <section>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Suplementos em uso</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', whiteSpace: 'pre-wrap' }}>{suplementos}</p>
                </section>
              )}
              {observacoes && (
                <section>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Observações Gerais</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', whiteSpace: 'pre-wrap' }}>{observacoes}</p>
                </section>
              )}
            </div>
          ) : (
            // ── FICHA TÉCNICA ──
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Evolução Clínica</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {clinicalDeltas.peso.hasData && (
                    <div style={{ backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Peso</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', margin: '3px 0 0' }}>{clinicalDeltas.peso.current} kg</p>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: clinicalDeltas.peso.diff <= 0 ? '#10b981' : '#ef4444', margin: '2px 0 0' }}>{clinicalDeltas.peso.diff > 0 ? '+' : ''}{clinicalDeltas.peso.diff.toFixed(1)} kg</p>
                      <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Inicial: {clinicalDeltas.peso.initial} kg</p>
                    </div>
                  )}
                  {clinicalDeltas.gordura.hasData && (
                    <div style={{ backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Gordura</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', margin: '3px 0 0' }}>{clinicalDeltas.gordura.current}%</p>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: clinicalDeltas.gordura.diff <= 0 ? '#10b981' : '#ef4444', margin: '2px 0 0' }}>{clinicalDeltas.gordura.diff > 0 ? '+' : ''}{clinicalDeltas.gordura.diff.toFixed(1)}%</p>
                      <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Inicial: {clinicalDeltas.gordura.initial}%</p>
                    </div>
                  )}
                  {clinicalDeltas.cintura.hasData && (
                    <div style={{ backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Cintura</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', margin: '3px 0 0' }}>{clinicalDeltas.cintura.current} cm</p>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: clinicalDeltas.cintura.diff <= 0 ? '#10b981' : '#ef4444', margin: '2px 0 0' }}>{clinicalDeltas.cintura.diff > 0 ? '+' : ''}{clinicalDeltas.cintura.diff.toFixed(1)} cm</p>
                      <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Inicial: {clinicalDeltas.cintura.initial} cm</p>
                    </div>
                  )}
                  {clinicalDeltas.quadril.hasData && (
                    <div style={{ backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Quadril</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)', margin: '3px 0 0' }}>{clinicalDeltas.quadril.current} cm</p>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: clinicalDeltas.quadril.diff <= 0 ? '#10b981' : '#ef4444', margin: '2px 0 0' }}>{clinicalDeltas.quadril.diff > 0 ? '+' : ''}{clinicalDeltas.quadril.diff.toFixed(1)} cm</p>
                      <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Inicial: {clinicalDeltas.quadril.initial} cm</p>
                    </div>
                  )}
                </div>
              </section>
              <section>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Histórico de Consultas ({consultas.length})</h4>
                {consultas.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma consulta registrada.</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead><tr style={{ borderBottom: '2px solid var(--border-color)' }}><th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Data</th><th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Peso</th><th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Cintura</th><th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Quadril</th><th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Gordura</th></tr></thead>
                    <tbody>
                      {consultas.map((c, i) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: i % 2 === 0 ? '#faf9f6' : '#fff' }}>
                          <td style={{ padding: '7px 8px', color: 'var(--text-dark)' }}>{format(parseISO(c.data_consulta.replace(' ', 'T')), "dd/MM/yyyy")}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>{c.peso ? `${c.peso} kg` : '—'}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--text-dark)' }}>{c.cintura ? `${c.cintura} cm` : '—'}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--text-dark)' }}>{c.quadril ? `${c.quadril} cm` : '—'}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--text-dark)' }}>{c.percentual_gordura ? `${c.percentual_gordura}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
              {lastConsulta?.observacoes && (
                <section>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Observações da Última Consulta</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', whiteSpace: 'pre-wrap' }}>{lastConsulta.observacoes}</p>
                </section>
              )}
              <section>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1.5px solid #ecfdf5', paddingBottom: '6px', marginBottom: '12px' }}>Dados do Plano</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[['Objetivos', [...objetivos, objetivoOutro].filter(Boolean).join(', ') || '—'], ['Nível de Atividade', nivelAtividade || '—'], ['Patologias', [...patologias, patologiasOutro].filter(Boolean).join(', ') || 'Nenhuma'], ['Restrições', [...restricoes, restricoesOutro].filter(Boolean).join(', ') || 'Nenhuma'], ['Alergias', [...alergias, alergiasOutro].filter(Boolean).join(', ') || 'Nenhuma']].map(([k, v]) => (
                    <div key={k}><p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{k}</p><p style={{ fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: 500, margin: '2px 0 0' }}>{v}</p></div>
                  ))}
                </div>
              </section>
            </div>
          )}

          <div className="no-print" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NutriOl — Sistema de Gestão Nutricional • Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="fade-in">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .consult-card:hover { border-color: var(--primary) !important; }
        .plano-card:hover { border-color: var(--accent-gold-light) !important; }
        @media print {
          .app-layout, .sidebar, .no-print {
            display: none !important;
          }
          .print-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background-color: transparent !important;
            padding: 0 !important;
            overflow: visible !important;
            backdrop-filter: none !important;
            z-index: auto !important;
            display: block !important;
          }
          #print-content {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            display: block !important;
            background: transparent !important;
          }
        }
        .patient-avatar-large:hover .avatar-hover-overlay { opacity: 1 !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          to="/patients"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 500, transition: 'var(--transition)' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-4px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
        >
          <ArrowLeft size={15} /> Voltar para Pacientes
        </Link>

        <div className="patient-profile-banner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div className="patient-avatar-large" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => document.getElementById('photo-upload')?.click()}>
                <img
                  src={getPatientPhoto(id || '', sexo, fotoUrl)}
                  alt={nome}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="avatar-hover-overlay" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '50%', opacity: 0, transition: 'opacity 0.2s', color: '#fff' }}>
                  <Camera size={20} />
                </div>
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />
                <span style={{
                  position: 'absolute',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.8)',
                  zIndex: -1
                }}>
                  {nome ? nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'PA'}
                </span>
              </div>

              <div>
                <h1 className="page-title" style={{ color: 'var(--white)', marginBottom: '6px', fontSize: '2rem' }}>{nome || 'Paciente'}</h1>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', margin: 0, fontWeight: 500 }}>
                  {idade ? `${idade} anos` : 'Idade não informada'} • {sexo || 'Sexo não informado'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {whatsapp && (
                    <a 
                      href={`https://api.whatsapp.com/send?phone=${formatWhatsAppNumber(whatsapp)}&text=${encodeURIComponent(`Olá, ${nome}! Passando para saber como você está indo com o plano alimentar e se tem alguma dúvida. Estou à disposição! Abraço.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#25d366', 
                        textDecoration: 'none', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        backgroundColor: 'rgba(37, 211, 102, 0.15)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontWeight: 600,
                        transition: 'all 0.25s ease',
                        border: '1px solid rgba(37, 211, 102, 0.25)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(37, 211, 102, 0.25)'; e.currentTarget.style.transform = 'scale(1.03)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(37, 211, 102, 0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
                      title="Enviar mensagem de acompanhamento / Dúvidas"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      <span>WhatsApp: {whatsapp}</span>
                    </a>
                  )}
                  {email && (
                    <span style={{ color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontWeight: 500 }}>
                      E-mail: {email}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Metric Counters inside Patient Header */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {peso && (
                <div className="patient-banner-metric">
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Peso Inicial</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--white)', marginTop: '2px' }}>{peso} kg</p>
                </div>
              )}
              {altura && (
                <div className="patient-banner-metric">
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Altura</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--white)', marginTop: '2px' }}>{altura} cm</p>
                </div>
              )}
              {imc && (
                <div className="patient-banner-metric" style={{ borderColor: 'rgba(197, 160, 89, 0.4)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-gold-light)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>IMC Inicial</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-gold-light)', marginTop: '2px' }}>{imc}</p>
                </div>
              )}
              {/* Botão Imprimir */}
              <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <button
                  onClick={() => setShowPrintMenu(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', backdropFilter: 'blur(4px)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.25)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.15)'}
                >
                  <Printer size={14} /> Imprimir
                </button>
                {showPrintMenu && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '6px', backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: '200px', overflow: 'hidden' }}>
                    <button onClick={() => { setPrintMode('cadastral'); setShowPrintMenu(false); }} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#faf9f6'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}>
                      <FileText size={14} color="var(--primary)" /> Ficha Cadastral
                    </button>
                    <button onClick={() => { setPrintMode('tecnica'); setShowPrintMenu(false); }} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#faf9f6'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}>
                      <Scale size={14} color="var(--primary)" /> Ficha Técnica / Resumo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Seção 1: Dados do Paciente ── */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span style={{ backgroundColor: '#ecfdf5', padding: '6px', borderRadius: '8px' }}><FileText size={16} color="var(--primary)" /></span>
            Dados do Paciente
          </h2>
          <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }} onClick={handleSave} disabled={saveLoading}>
            <Save size={14} />
            {saveLoading ? 'Salvando...' : 'Salvar'}
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
        <div style={{ padding: '0 16px', marginTop: '12px' }}>
          <div className="premium-tabs">
            {(['pessoal', 'clinico', 'habitos'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`premium-tab-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {tab === 'pessoal' ? 'Pessoal' : tab === 'clinico' ? 'Clínico' : 'Hábitos'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* TAB: PESSOAL */}
          {activeTab === 'pessoal' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome Completo *</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do paciente" />
              </div>
              <div className="grid-3-cols">
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
              <div className="grid-3-cols">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">WhatsApp</label>
                  <input type="tel" value={whatsapp} onChange={e => setWhatsapp(formatPhoneNumber(e.target.value))} placeholder="(00) 00000-0000" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Telefone</label>
                  <input type="tel" value={telefone} onChange={e => setTelefone(formatPhoneNumber(e.target.value))} placeholder="(00) 0000-0000" />
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
              <div className="grid-3-cols" style={{ paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
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

              <div className="grid-2-cols">
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

              <div className="grid-2-cols">
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
              <div className="grid-4-cols">
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
      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span style={{ backgroundColor: '#ecfdf5', padding: '6px', borderRadius: '8px' }}><Scale size={16} color="var(--primary)" /></span>
            Consultas · {consultas.length}
          </h2>
          <button className="btn-primary" style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }} onClick={() => setIsConsultaModalOpen(true)}>
            <Plus size={14} /> Nova Consulta
          </button>
        </div>

        {/* Deltas Scorecards Row */}
        {!consultasLoading && consultas.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', padding: '14px 20px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
            {clinicalDeltas.peso.hasData && (
              <div style={{ padding: '10px 14px', backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Peso</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '3px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>{clinicalDeltas.peso.current} kg</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: clinicalDeltas.peso.diff <= 0 ? '#10b981' : '#ef4444' }}>
                    {clinicalDeltas.peso.diff > 0 ? '+' : ''}{clinicalDeltas.peso.diff.toFixed(1)} kg
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.67rem', color: 'var(--text-muted)' }}>Inicial: {clinicalDeltas.peso.initial} kg</p>
              </div>
            )}
            {clinicalDeltas.gordura.hasData && (
              <div style={{ padding: '10px 14px', backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gordura</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '3px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>{clinicalDeltas.gordura.current}%</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: clinicalDeltas.gordura.diff <= 0 ? '#10b981' : '#ef4444' }}>
                    {clinicalDeltas.gordura.diff > 0 ? '+' : ''}{clinicalDeltas.gordura.diff.toFixed(1)}%
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.67rem', color: 'var(--text-muted)' }}>Inicial: {clinicalDeltas.gordura.initial}%</p>
              </div>
            )}
            {clinicalDeltas.cintura.hasData && (
              <div style={{ padding: '10px 14px', backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cintura</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '3px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>{clinicalDeltas.cintura.current} cm</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: clinicalDeltas.cintura.diff <= 0 ? '#10b981' : '#ef4444' }}>
                    {clinicalDeltas.cintura.diff > 0 ? '+' : ''}{clinicalDeltas.cintura.diff.toFixed(1)} cm
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.67rem', color: 'var(--text-muted)' }}>Inicial: {clinicalDeltas.cintura.initial} cm</p>
              </div>
            )}
            {clinicalDeltas.quadril.hasData && (
              <div style={{ padding: '10px 14px', backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quadril</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '3px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>{clinicalDeltas.quadril.current} cm</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: clinicalDeltas.quadril.diff <= 0 ? '#10b981' : '#ef4444' }}>
                    {clinicalDeltas.quadril.diff > 0 ? '+' : ''}{clinicalDeltas.quadril.diff.toFixed(1)} cm
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.67rem', color: 'var(--text-muted)' }}>Inicial: {clinicalDeltas.quadril.initial} cm</p>
              </div>
            )}
          </div>
        )}

        {/* Chart Header & Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.85rem', margin: 0 }}>Evolução Clínica</p>
          <div className="premium-tabs" style={{ marginBottom: 0, padding: '2px' }}>
            <button
              onClick={() => setActiveChartTab('peso')}
              className={`premium-tab-btn ${activeChartTab === 'peso' ? 'active' : ''}`}
              style={{ padding: '5px 12px', fontSize: '0.78rem' }}
            >
              Peso & Gordura
            </button>
            <button
              onClick={() => setActiveChartTab('medidas')}
              className={`premium-tab-btn ${activeChartTab === 'medidas' ? 'active' : ''}`}
              style={{ padding: '5px 12px', fontSize: '0.78rem' }}
            >
              Circunferências
            </button>
          </div>
        </div>

        {/* Chart */}
        <div style={{ padding: '12px 20px 16px', borderBottom: '1px solid var(--border-color)' }}>
          {consultasLoading ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Carregando dados...</div>
          ) : chartData.length === 0 ? (
            <div style={{ height: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', backgroundColor: '#fafafa', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
              <Scale size={28} style={{ opacity: 0.3, marginBottom: '8px', color: 'var(--primary)' }} />
              <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>Nenhuma consulta registrada ainda</p>
              <p style={{ fontSize: '0.8rem', marginTop: '2px' }}>Adicione a primeira consulta para ver o gráfico.</p>
            </div>
          ) : (
            <div style={{ height: '200px' }}>
              {activeChartTab === 'peso' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: -5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorGordura" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="var(--primary)" fontSize={10} tickLine={false} axisLine={false} width={32} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--secondary)" fontSize={10} tickLine={false} axisLine={false} width={32} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-lg)', fontFamily: 'inherit', fontSize: '0.82rem' }} />
                    <Legend verticalAlign="top" height={28} iconType="circle" />
                    <Area yAxisId="left" type="monotone" name="Peso (kg)" dataKey="peso" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPeso)" dot={{ fill: 'var(--primary)', r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                    <Area yAxisId="right" type="monotone" name="Gordura (%)" dataKey="gordura" stroke="var(--secondary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGordura)" dot={{ fill: 'var(--secondary)', r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-dark)" fontSize={10} tickLine={false} axisLine={false} width={32} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-lg)', fontFamily: 'inherit', fontSize: '0.82rem' }} />
                    <Legend verticalAlign="top" height={28} iconType="circle" />
                    <Line type="monotone" name="Cintura (cm)" dataKey="cintura" stroke="var(--accent-gold)" strokeWidth={2.5} dot={{ fill: 'var(--accent-gold)', r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                    <Line type="monotone" name="Quadril (cm)" dataKey="quadril" stroke="var(--primary)" strokeWidth={2.5} dot={{ fill: 'var(--primary)', r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>

        {/* Consultas List */}
        <div style={{ padding: '14px 20px' }}>
          {consultasLoading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', fontSize: '0.9rem' }}>Carregando consultas...</p>
          ) : consultas.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', fontSize: '0.9rem' }}>Nenhuma consulta registrada ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...consultas].reverse().map(c => (
                <div key={c.id} className="consult-card" style={{ border: `1px solid ${deleteConfirmId === c.id ? '#fca5a5' : 'var(--border-color)'}`, borderRadius: '10px', overflow: 'hidden', transition: 'all 0.2s', backgroundColor: deleteConfirmId === c.id ? '#fff5f5' : undefined }}>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                    {/* Lado esquerdo: data + métricas — clicável para expandir */}
                    <button
                      onClick={() => { setExpandedConsulta(expandedConsulta === c.id ? null : c.id); setDeleteConfirmId(null); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                    >
                      <div style={{ backgroundColor: deleteConfirmId === c.id ? '#fee2e2' : '#ecfdf5', padding: '6px 10px', borderRadius: '8px', textAlign: 'center', minWidth: '56px', flexShrink: 0 }}>
                        <p style={{ fontSize: '0.65rem', color: deleteConfirmId === c.id ? '#ef4444' : 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
                          {format(parseISO(c.data_consulta.replace(' ', 'T')), 'MMM', { locale: ptBR })}
                        </p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: deleteConfirmId === c.id ? '#ef4444' : 'var(--primary)', lineHeight: 1, margin: '1px 0' }}>
                          {format(parseISO(c.data_consulta.replace(' ', 'T')), 'dd')}
                        </p>
                        <p style={{ fontSize: '0.65rem', color: deleteConfirmId === c.id ? '#ef4444' : 'var(--primary)', margin: 0 }}>
                          {format(parseISO(c.data_consulta.replace(' ', 'T')), 'yyyy')}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {c.peso && <div><p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Peso</p><p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem', margin: '1px 0 0' }}>{c.peso} kg</p></div>}
                        {c.cintura && <div><p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Cintura</p><p style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem', margin: '1px 0 0' }}>{c.cintura} cm</p></div>}
                        {c.quadril && <div><p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Quadril</p><p style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem', margin: '1px 0 0' }}>{c.quadril} cm</p></div>}
                        {c.percentual_gordura && <div><p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Gordura</p><p style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem', margin: '1px 0 0' }}>{c.percentual_gordura}%</p></div>}
                        
                        {/* Status Badges */}
                        {c.status === 'confirmada' && (
                          <span style={{ fontSize: '0.68rem', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                            Confirmada
                          </span>
                        )}
                        {c.status === 'reagendar' && (
                          <span style={{ fontSize: '0.68rem', color: '#d97706', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, border: '1px solid #fde68a' }}>
                            Reagendar
                          </span>
                        )}
                        {(c.status === 'finalizada' || c.peso) && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--primary)', backgroundColor: 'rgba(24,63,46,0.08)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, border: '1px solid rgba(24,63,46,0.2)' }}>
                            Encerrada
                          </span>
                        )}
                        {(c.status === 'agendada' || !c.status) && !c.peso && (
                          <span style={{ fontSize: '0.68rem', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, border: '1px solid #e5e7eb' }}>
                            Agendada
                          </span>
                        )}

                        {/* WhatsApp Status Badges */}
                        {c.whatsapp_confirmation_sent && (
                          <span style={{ fontSize: '0.65rem', color: '#16a34a', backgroundColor: '#f0fdf4', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid rgba(22, 163, 74, 0.2)', fontWeight: 500 }} title="Confirmação de WhatsApp enviada">
                            💬 Confirmação
                          </span>
                        )}
                        {c.whatsapp_reminder_sent && (
                          <span style={{ fontSize: '0.65rem', color: '#0284c7', backgroundColor: '#f0f9ff', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid rgba(2, 132, 199, 0.2)', fontWeight: 500 }} title="Lembrete de WhatsApp enviado">
                            💬 Lembrete
                          </span>
                        )}
                        {c.whatsapp_thankyou_sent && (
                          <span style={{ fontSize: '0.65rem', color: '#15803d', backgroundColor: '#f0fdf4', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid rgba(21, 128, 61, 0.2)', fontWeight: 500 }} title="Mensagem pós-atendimento enviada">
                            💬 Agradecimento
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Lado direito: ações */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                      {deleteConfirmId === c.id ? (
                        <>
                          <button
                            onClick={() => handleDeleteConsulta(c.id)}
                            disabled={deleteLoading}
                            style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', opacity: deleteLoading ? 0.7 : 1 }}
                          >
                            {deleteLoading ? '...' : '🗑 Excluir'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Finalizar Button */}
                          {(c.status === 'agendada' || c.status === 'confirmada' || !c.status) && !c.peso && (
                            <button
                              onClick={() => handleFinalizarConsulta(c.id)}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600, 
                                color: '#15803d', 
                                backgroundColor: '#dcfce7', 
                                border: '1px solid #bbf7d0', 
                                borderRadius: '6px', 
                                padding: '4px 8px', 
                                cursor: 'pointer' 
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#bbf7d0'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#dcfce7'}
                              title="Sinalizar que a consulta foi concluída"
                            >
                              <Check size={13} /> Finalizar
                            </button>
                          )}

                          {/* Agradecer WhatsApp Button */}
                          {(c.status === 'finalizada' || c.peso) && whatsapp && (
                            <button
                              onClick={() => handleSendAgradecimento(c.id)}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600, 
                                color: '#fff', 
                                backgroundColor: '#15803d', 
                                border: 'none', 
                                borderRadius: '6px', 
                                padding: '4px 8px', 
                                cursor: 'pointer' 
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#166534'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#15803d'}
                              title="Enviar agradecimento pós-consulta"
                            >
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg> Agradecer
                            </button>
                          )}

                          <button
                            onClick={() => { setConsultaParaEditar(c); setIsConsultaModalOpen(true); }}
                            style={{ background: 'none', border: 'none', padding: '5px', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Editar consulta"
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ecfdf5'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => { setDeleteConfirmId(c.id); setExpandedConsulta(null); }}
                            style={{ background: 'none', border: 'none', padding: '5px', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Excluir consulta"
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fee2e2'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => { setExpandedConsulta(expandedConsulta === c.id ? null : c.id); setDeleteConfirmId(null); }}
                        style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                      >
                        {expandedConsulta === c.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {expandedConsulta === c.id && (
                    <div style={{ borderTop: '1px solid var(--border-color)', padding: '12px 14px', backgroundColor: '#fafafa' }}>
                      {c.observacoes && (
                        <div style={{ marginBottom: '10px' }}>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase' }}>Observações</p>
                          <p style={{ color: 'var(--text-dark)', fontSize: '0.88rem', margin: 0 }}>{c.observacoes}</p>
                        </div>
                      )}
                      {c.proximo_retorno && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ecfdf5', padding: '8px 12px', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 500 }}>
                          <Calendar size={13} />
                          Próximo retorno: {format(parseISO(c.proximo_retorno.replace(' ', 'T')), c.proximo_retorno.length > 10 ? "dd 'de' MMMM, yyyy 'às' HH:mm" : "dd 'de' MMMM, yyyy", { locale: ptBR })}
                        </div>
                      )}
                      {!c.observacoes && !c.proximo_retorno && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Sem observações ou retorno registrado.</p>
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
      <MealPlanManager
        pacienteId={id!}
        pacienteDados={{
          nome,
          objetivos: [...objetivos, objetivoOutro].filter(Boolean),
          objetivo_texto: objetivos[0] || objetivoOutro || undefined,
          nivel_atividade: nivelAtividade || undefined,
          patologias: [...patologias, patologiasOutro].filter(Boolean),
          restricoes_alimentares: [...restricoes, restricoesOutro].filter(Boolean),
          alergias: [...alergias, alergiasOutro].filter(Boolean),
          peso_inicial: pesoNum && !isNaN(pesoNum) ? pesoNum : undefined,
          altura: alturaNum && !isNaN(alturaNum) ? alturaNum : undefined,
          observacoes: observacoes || undefined
        }}
      />

      {/* Modal de Nova Consulta */}
      <NovaConsultaModal
        pacienteId={id!}
        isOpen={isConsultaModalOpen}
        onClose={() => {
          setIsConsultaModalOpen(false);
          setConsultaParaEditar(null);
        }}
        consultaParaEditar={consultaParaEditar}
        onSuccess={() => { fetchConsultas(); }}
      />

      {/* Modal de Impressão */}
      <PrintModal />
    </div>
  );
};

export default PatientDetails;
