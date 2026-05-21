import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Check, Save } from 'lucide-react';

const OBJECTIVES = ['Emagrecer', 'Ganhar massa', 'Controlar diabetes', 'Saúde geral', 'Performance esportiva', 'Reeducação alimentar'];
const ACTIVITY_LEVELS = ['Sedentário', 'Levemente ativo', 'Moderadamente ativo', 'Muito ativo', 'Extremamente ativo'];
const PATHOLOGIES = ['Diabetes', 'Hipertensão', 'Hipotireoidismo', 'Hipertireoidismo', 'Síndrome do ovário policístico', 'Doença celíaca', 'Colesterol alto'];
const RESTRICTIONS = ['Lactose', 'Glúten', 'Açúcar', 'Carne vermelha', 'Frutos do mar'];
const ALLERGIES = ['Amendoim', 'Leite', 'Ovo', 'Soja', 'Trigo', 'Frutos do mar'];

const NewPatient: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'pessoal' | 'clinico' | 'habitos'>('pessoal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tab 1: Pessoal
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [idade, setIdade] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // Tab 2: Clínico
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

  // Tab 3: Hábitos
  const [refeicoesDia, setRefeicoesDia] = useState('');
  const [horaAcorda, setHoraAcorda] = useState('');
  const [horaDorme, setHoraDorme] = useState('');
  const [aguaDia, setAguaDia] = useState('');
  const [praticaAtividade, setPraticaAtividade] = useState('nao');
  const [qualAtividade, setQualAtividade] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Calculate Age
  useEffect(() => {
    if (dataNascimento) {
      const birth = new Date(dataNascimento);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      setIdade(age.toString());
    } else {
      setIdade('');
    }
  }, [dataNascimento]);

  useEffect(() => {
    if (!id) return;

    const fetchPatientData = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: fetchError } = await supabase
          .from('pacientes')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (data) {
          setNome(data.nome || '');
          setDataNascimento(data.data_nascimento || '');
          setSexo(data.sexo || '');
          setWhatsapp(data.whatsapp || '');
          setEmail(data.email || '');
          
          setPeso(data.peso_inicial ? data.peso_inicial.toString() : '');
          setAltura(data.altura ? data.altura.toString() : '');
          
          const dbObjetivos = data.objetivos || [];
          const standardObjectives = dbObjetivos.filter((o: string) => OBJECTIVES.includes(o));
          const customObjective = dbObjetivos.find((o: string) => !OBJECTIVES.includes(o)) || '';
          setObjetivos(standardObjectives.length > 0 ? standardObjectives : (data.objetivo_texto ? [data.objetivo_texto] : []));
          setObjetivoOutro(customObjective || (data.objetivo_texto && !OBJECTIVES.includes(data.objetivo_texto) ? data.objetivo_texto : ''));
          
          setNivelAtividade(data.nivel_atividade || '');
          
          const dbPatologias = data.patologias || [];
          const standardPat = dbPatologias.filter((p: string) => PATHOLOGIES.includes(p));
          const customPat = dbPatologias.find((p: string) => !PATHOLOGIES.includes(p) && p !== 'Nenhum') || '';
          if (dbPatologias.includes('Nenhum')) {
            setPatologias(['Nenhum']);
          } else {
            setPatologias(standardPat);
            setPatologiasOutro(customPat);
          }

          const dbRestricoes = data.restricoes_alimentares || [];
          const standardRest = dbRestricoes.filter((r: string) => RESTRICTIONS.includes(r));
          const customRest = dbRestricoes.find((r: string) => !RESTRICTIONS.includes(r) && r !== 'Nenhum') || '';
          if (dbRestricoes.includes('Nenhum')) {
            setRestricoes(['Nenhum']);
          } else {
            setRestricoes(standardRest);
            setRestricoesOutro(customRest);
          }

          const dbAlergias = data.alergias || [];
          const standardAlergias = dbAlergias.filter((a: string) => ALLERGIES.includes(a));
          const customAlergias = dbAlergias.find((a: string) => !ALLERGIES.includes(a) && a !== 'Nenhum') || '';
          if (dbAlergias.includes('Nenhum')) {
            setAlergias(['Nenhum']);
          } else {
            setAlergias(standardAlergias);
            setAlergiasOutro(customAlergias);
          }

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
      } catch (err: any) {
        console.error('Erro ao buscar dados do paciente:', err);
        setError('Erro ao carregar dados do paciente para edição.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [id]);

  // Calculated IMC
  const pesoNum = parseFloat(peso.replace(',', '.'));
  const alturaNum = parseFloat(altura); // assumed in cm
  const imc = (pesoNum && alturaNum) ? (pesoNum / ((alturaNum / 100) * (alturaNum / 100))).toFixed(1) : '';

  // Time format helper
  const handleTimeBlur = (setter: any, value: string) => {
    if (!value) return;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 1 || digits.length === 2) {
      const h = parseInt(digits);
      if (h >= 0 && h < 24) setter(`${h.toString().padStart(2, '0')}:00`);
    } else if (digits.length === 3 || digits.length === 4) {
      const m = parseInt(digits.slice(-2));
      const h = parseInt(digits.slice(0, digits.length - 2));
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        setter(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
  };

  const handleMultiSelect = (setter: any, list: string[], item: string) => {
    if (item === 'Nenhum') {
      setter(['Nenhum']);
    } else {
      let newList = list.includes('Nenhum') ? [] : [...list];
      if (newList.includes(item)) {
        newList = newList.filter(i => i !== item);
      } else {
        newList.push(item);
      }
      setter(newList);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('O nome completo é obrigatório.');
      setActiveTab('pessoal');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');

      let query;
      if (id) {
        query = supabase
          .from('pacientes')
          .update({
            nome,
            data_nascimento: dataNascimento || null,
            sexo: sexo || null,
            whatsapp: whatsapp || null,
            email: email || null,
            peso_inicial: (pesoNum && !isNaN(pesoNum)) ? pesoNum : null,
            altura: (alturaNum && !isNaN(alturaNum)) ? alturaNum : null,
            objetivos: [...objetivos, objetivoOutro].filter(Boolean),
            objetivo_texto: objetivos.length > 0 ? objetivos[0] : objetivoOutro || null,
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
          })
          .eq('id', id);
      } else {
        query = supabase
          .from('pacientes')
          .insert([{
            nome,
            data_nascimento: dataNascimento || null,
            sexo: sexo || null,
            whatsapp: whatsapp || null,
            email: email || null,
            peso_inicial: (pesoNum && !isNaN(pesoNum)) ? pesoNum : null,
            altura: (alturaNum && !isNaN(alturaNum)) ? alturaNum : null,
            objetivos: [...objetivos, objetivoOutro].filter(Boolean),
            objetivo_texto: objetivos.length > 0 ? objetivos[0] : objetivoOutro || null,
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
            observacoes: observacoes || null,
            nutricionista_id: session.user.id
          }]);
      }

      const { data: insertedData, error: dbError } = await query
        .select()
        .single();

      if (dbError) throw dbError;

      alert(id ? 'Paciente atualizado com sucesso!' : 'Paciente cadastrado com sucesso!');
      navigate(`/patients/${insertedData.id}`);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao cadastrar paciente. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <header style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', color: 'var(--text-muted)' }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{id ? 'Editar Paciente' : 'Novo Paciente'}</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>{id ? 'Atualize os dados e a anamnese do paciente.' : 'Preencha a anamnese e os dados do paciente.'}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            <Save size={20} />
            {loading ? 'Salvando...' : id ? 'Salvar Alterações' : 'Salvar Paciente'}
          </button>
        </div>
      </header>

      {error && <div className="error-message" style={{ marginBottom: '24px' }}>{error}</div>}

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: '#faf9f6' }}>
          {['pessoal', 'clinico', 'habitos'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                flex: 1, padding: '20px', fontWeight: 600, fontSize: '1rem',
                textTransform: 'capitalize', transition: 'all 0.2s', background: 'none',
                borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              {tab === 'pessoal' ? '1. Pessoal' : tab === 'clinico' ? '2. Clínico' : '3. Hábitos'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          
          {/* TAB 1: PESSOAL */}
          {activeTab === 'pessoal' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome Completo *</label>
                <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria da Silva" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Data de Nascimento</label>
                  <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Idade (Automática)</label>
                  <input type="text" disabled value={idade ? `${idade} anos` : ''} style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Sexo</label>
                  <select value={sexo} onChange={(e) => setSexo(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', backgroundColor: '#faf9f6' }}>
                    <option value="">Selecione...</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">WhatsApp</label>
                  <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Telefone Alternativo</label>
                  <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 0000-0000" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@email.com" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLÍNICO */}
          {activeTab === 'clinico' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                  <label className="form-label">Peso Atual</label>
                  <input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="0.0" style={{ paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '38px', color: 'var(--text-muted)' }}>kg</span>
                </div>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                  <label className="form-label">Altura</label>
                  <input type="number" value={altura} onChange={(e) => setAltura(e.target.value)} placeholder="Ex: 170" style={{ paddingRight: '40px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '38px', color: 'var(--text-muted)' }}>cm</span>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">IMC (Automático)</label>
                  <input type="text" disabled value={imc} style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: imc ? 'var(--primary)' : 'inherit', fontWeight: 'bold' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Objetivo</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  {OBJECTIVES.map(obj => (
                    <button type="button" key={obj} onClick={() => handleMultiSelect(setObjetivos, objetivos, obj)} style={{ padding: '8px 16px', borderRadius: '9999px', border: `1px solid ${objetivos.includes(obj) ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: objetivos.includes(obj) ? '#ecfdf5' : '#fff', color: objetivos.includes(obj) ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {objetivos.includes(obj) && <Check size={14} />} {obj}
                    </button>
                  ))}
                </div>
                <input type="text" value={objetivoOutro} onChange={(e) => setObjetivoOutro(e.target.value)} placeholder="Outro objetivo..." />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nível de Atividade Física</label>
                <select value={nivelAtividade} onChange={(e) => setNivelAtividade(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', backgroundColor: '#faf9f6' }}>
                  <option value="">Selecione...</option>
                  {ACTIVITY_LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Patologias ou Condições de Saúde</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                  <button type="button" onClick={() => handleMultiSelect(setPatologias, patologias, 'Nenhum')} style={{ padding: '8px 16px', borderRadius: '9999px', border: `1px solid ${patologias.includes('Nenhum') ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: patologias.includes('Nenhum') ? '#ecfdf5' : '#fff', color: patologias.includes('Nenhum') ? 'var(--primary)' : 'var(--text-muted)' }}>
                    Nenhum
                  </button>
                  {PATHOLOGIES.map(pat => (
                    <button type="button" key={pat} onClick={() => handleMultiSelect(setPatologias, patologias, pat)} style={{ padding: '8px 16px', borderRadius: '9999px', border: `1px solid ${patologias.includes(pat) ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: patologias.includes(pat) ? '#ecfdf5' : '#fff', color: patologias.includes(pat) ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {pat}
                    </button>
                  ))}
                </div>
                <input type="text" value={patologiasOutro} onChange={(e) => setPatologiasOutro(e.target.value)} placeholder="Adicionar outra condição..." />
              </div>

              {/* Similar structures for Restrições and Alergias to keep it compact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Restrições Alimentares</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <button type="button" onClick={() => handleMultiSelect(setRestricoes, restricoes, 'Nenhum')} style={{ padding: '6px 12px', borderRadius: '9999px', fontSize: '0.85rem', border: `1px solid ${restricoes.includes('Nenhum') ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: restricoes.includes('Nenhum') ? '#ecfdf5' : '#fff' }}>Nenhum</button>
                    {RESTRICTIONS.map(r => <button type="button" key={r} onClick={() => handleMultiSelect(setRestricoes, restricoes, r)} style={{ padding: '6px 12px', borderRadius: '9999px', fontSize: '0.85rem', border: `1px solid ${restricoes.includes(r) ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: restricoes.includes(r) ? '#ecfdf5' : '#fff' }}>{r}</button>)}
                  </div>
                  <input type="text" value={restricoesOutro} onChange={(e) => setRestricoesOutro(e.target.value)} placeholder="Outras restrições..." />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Alergias Alimentares</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <button type="button" onClick={() => handleMultiSelect(setAlergias, alergias, 'Nenhum')} style={{ padding: '6px 12px', borderRadius: '9999px', fontSize: '0.85rem', border: `1px solid ${alergias.includes('Nenhum') ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: alergias.includes('Nenhum') ? '#ecfdf5' : '#fff' }}>Nenhum</button>
                    {ALLERGIES.map(a => <button type="button" key={a} onClick={() => handleMultiSelect(setAlergias, alergias, a)} style={{ padding: '6px 12px', borderRadius: '9999px', fontSize: '0.85rem', border: `1px solid ${alergias.includes(a) ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: alergias.includes(a) ? '#ecfdf5' : '#fff' }}>{a}</button>)}
                  </div>
                  <input type="text" value={alergiasOutro} onChange={(e) => setAlergiasOutro(e.target.value)} placeholder="Outras alergias..." />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Medicamentos Contínuos</label>
                  <textarea value={medicamentos} onChange={(e) => setMedicamentos(e.target.value)} placeholder="Nomes, dosagens..." style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', minHeight: '80px', fontFamily: 'inherit' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Suplementos em uso</label>
                  <textarea value={suplementos} onChange={(e) => setSuplementos(e.target.value)} placeholder="Whey, Creatina, Vitaminas..." style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', minHeight: '80px', fontFamily: 'inherit' }} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HÁBITOS */}
          {activeTab === 'habitos' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Refeições/dia</label>
                  <input type="number" value={refeicoesDia} onChange={(e) => setRefeicoesDia(e.target.value)} placeholder="Ex: 4" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Horário que acorda</label>
                  <input type="text" value={horaAcorda} onChange={(e) => setHoraAcorda(e.target.value)} onBlur={(e) => handleTimeBlur(setHoraAcorda, e.target.value)} placeholder="Ex: 06:30" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Horário que dorme</label>
                  <input type="text" value={horaDorme} onChange={(e) => setHoraDorme(e.target.value)} onBlur={(e) => handleTimeBlur(setHoraDorme, e.target.value)} placeholder="Ex: 23:00" />
                </div>
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                  <label className="form-label">Água por dia</label>
                  <input type="number" step="0.1" value={aguaDia} onChange={(e) => setAguaDia(e.target.value)} placeholder="Ex: 2.5" style={{ paddingRight: '50px' }} />
                  <span style={{ position: 'absolute', right: '16px', top: '38px', color: 'var(--text-muted)' }}>litros</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Pratica Atividade Física?</label>
                <div style={{ display: 'flex', gap: '16px', marginBottom: praticaAtividade === 'sim' ? '16px' : '0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="praticaAtividade" value="sim" checked={praticaAtividade === 'sim'} onChange={() => setPraticaAtividade('sim')} /> Sim
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="praticaAtividade" value="nao" checked={praticaAtividade === 'nao'} onChange={() => setPraticaAtividade('nao')} /> Não
                  </label>
                </div>
                {praticaAtividade === 'sim' && (
                  <input type="text" className="fade-in" value={qualAtividade} onChange={(e) => setQualAtividade(e.target.value)} placeholder="Qual atividade e qual a frequência semanal? (Ex: Musculação 4x na semana)" />
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Observações Gerais</label>
                <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Qualquer outra informação relevante sobre o paciente..." style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', minHeight: '120px', fontFamily: 'inherit' }} />
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default NewPatient;
