import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Search, Plus, UserPlus, MoreVertical, Filter, ChevronDown, 
  Calendar as CalendarIcon, Users, Target, Activity 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPatientPhoto } from '../lib/utils';

const PatientsList: React.FC = () => {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('az'); // az, za, com_whats

  const navigate = useNavigate();

  const fetchPacientes = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('pacientes')
      .select('*, consultas(data_consulta)')
      .eq('nutricionista_id', session.user.id);

    if (!error && data) {
      setPacientes(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  let filteredPacientes = pacientes.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.whatsapp && p.whatsapp.includes(searchTerm))
  );

  // Apply filters
  if (activeFilter === 'az') {
    filteredPacientes.sort((a, b) => a.nome.localeCompare(b.nome));
  } else if (activeFilter === 'za') {
    filteredPacientes.sort((a, b) => b.nome.localeCompare(a.nome));
  } else if (activeFilter === 'com_whats') {
    filteredPacientes = filteredPacientes.filter(p => p.whatsapp && p.whatsapp.trim() !== '');
  }

  const handleRowClick = (id: string) => {
    navigate(`/patients/${id}`);
  };

  const getLastConsultation = (consultas: any[]) => {
    if (!consultas || consultas.length === 0) return 'Não agendada';
    const sorted = [...consultas].sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime());
    return format(parseISO(sorted[0].data_consulta.replace(' ', 'T')), "dd/MM/yyyy", { locale: ptBR });
  };

  // Calculate analytical CRM metrics
  const totalPacientes = pacientes.length;
  
  const ages = pacientes.map(p => {
    if (!p.data_nascimento) return null;
    const birth = new Date(p.data_nascimento);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }).filter(a => a !== null) as number[];
  const avgAge = ages.length > 0 ? Math.round(ages.reduce((sum, val) => sum + val, 0) / ages.length) : 0;

  const goalsMap: { [key: string]: number } = {};
  pacientes.forEach(p => {
    const goal = p.objetivo_texto || 'Não definido';
    goalsMap[goal] = (goalsMap[goal] || 0) + 1;
  });
  let topGoal = 'Nenhum';
  let maxCount = 0;
  Object.keys(goalsMap).forEach(g => {
    if (goalsMap[g] > maxCount) {
      maxCount = goalsMap[g];
      topGoal = g;
    }
  });

  return (
    <div className="fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '2px' }}>Pacientes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {totalPacientes} paciente{totalPacientes !== 1 ? 's' : ''} cadastrado{totalPacientes !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '0.9rem' }} onClick={() => navigate('/patients/new')}>
          <Plus size={18} />
          Novo Paciente
        </button>
      </header>

      {/* CRM Statistics Row */}
      {!loading && pacientes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px' }}>
            <div style={{ backgroundColor: 'rgba(24, 63, 46, 0.06)', padding: '10px', borderRadius: '10px', color: 'var(--primary)', flexShrink: 0 }}>
              <Users size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>Total</p>
              <h4 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 700, margin: '1px 0 0 0' }}>{totalPacientes} ativos</h4>
            </div>
          </div>

          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px' }}>
            <div style={{ backgroundColor: 'rgba(197, 160, 89, 0.1)', padding: '10px', borderRadius: '10px', color: 'var(--accent-gold)', flexShrink: 0 }}>
              <Target size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>Objetivo Top</p>
              <h4 style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: 700, margin: '1px 0 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{topGoal}</h4>
            </div>
          </div>

          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px' }}>
            <div style={{ backgroundColor: 'rgba(150, 91, 104, 0.08)', padding: '10px', borderRadius: '10px', color: 'var(--secondary)', flexShrink: 0 }}>
              <Activity size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>Média Idade</p>
              <h4 style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 700, margin: '1px 0 0 0' }}>{avgAge > 0 ? `${avgAge} anos` : '—'}</h4>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: '0', overflow: 'visible' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou WhatsApp..."
              style={{ paddingLeft: '44px', backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '10px', height: '40px', fontSize: '0.9rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              className="btn-outline" 
              style={{ height: '48px', borderRadius: '12px' }}
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            >
              <Filter size={18} />
              Filtros
              <ChevronDown size={16} />
            </button>
            
            {filterMenuOpen && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                right: 0, 
                marginTop: '8px', 
                backgroundColor: 'var(--white)', 
                boxShadow: 'var(--shadow-lg)', 
                borderRadius: '12px', 
                padding: '8px',
                zIndex: 50,
                width: '200px',
                border: '1px solid var(--border-color)'
              }}>
                <div 
                  style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '8px', backgroundColor: activeFilter === 'az' ? 'var(--bg-color)' : 'transparent', color: activeFilter === 'az' ? 'var(--primary)' : 'var(--text-dark)' }}
                  onClick={() => { setActiveFilter('az'); setFilterMenuOpen(false); }}
                >
                  Ordem Alfabética (A-Z)
                </div>
                <div 
                  style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '8px', backgroundColor: activeFilter === 'za' ? 'var(--bg-color)' : 'transparent', color: activeFilter === 'za' ? 'var(--primary)' : 'var(--text-dark)' }}
                  onClick={() => { setActiveFilter('za'); setFilterMenuOpen(false); }}
                >
                  Ordem Alfabética (Z-A)
                </div>
                <div 
                  style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '8px', backgroundColor: activeFilter === 'com_whats' ? 'var(--bg-color)' : 'transparent', color: activeFilter === 'com_whats' ? 'var(--primary)' : 'var(--text-dark)' }}
                  onClick={() => { setActiveFilter('com_whats'); setFilterMenuOpen(false); }}
                >
                  Com WhatsApp
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--primary)' }}>Carregando pacientes...</div>
        ) : filteredPacientes.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <UserPlus size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--accent-gold)' }} />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', marginBottom: '8px' }}>Nenhum paciente encontrado</h3>
            <p>Você ainda não possui pacientes cadastrados ou a busca não retornou resultados.</p>
            <button 
              className="btn-outline" 
              style={{ margin: '24px auto 0', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
              onClick={() => navigate('/patients/new')}
            >
              <Plus size={16} /> Cadastrar Primeiro Paciente
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', padding: '0 4px' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>WhatsApp</th>
                  <th>Objetivo</th>
                  <th>Última Consulta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredPacientes.map((paciente) => (
                  <tr 
                    key={paciente.id} 
                    onClick={() => handleRowClick(paciente.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div className="patient-avatar-container">
                          <img 
                            src={getPatientPhoto(paciente.id, paciente.sexo, paciente.foto_url)} 
                            alt={paciente.nome}
                            className="patient-avatar-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span style={{ 
                            position: 'absolute', 
                            fontSize: '0.8rem', 
                            fontWeight: 600, 
                            color: 'var(--white)',
                            zIndex: -1 
                          }}>
                            {paciente.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                          {paciente.nome}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{paciente.whatsapp || '-'}</td>
                    <td>
                      <span className="premium-badge-goal">
                        {paciente.objetivo_texto || 'Não definido'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarIcon size={14} />
                        {getLastConsultation(paciente.consultas)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <button style={{ background: 'none', color: 'var(--text-muted)', padding: '8px', borderRadius: '50%' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-color)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientsList;
