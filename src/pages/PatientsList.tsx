import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, UserPlus, MoreVertical, Filter, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  return (
    <div className="fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">Pacientes</h1>
          <p className="page-subtitle">Gerencie todos os seus pacientes em um só lugar.</p>
        </div>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/patients/new')}>
          <Plus size={20} />
          Novo Paciente
        </button>
      </header>

      <div className="card" style={{ padding: '0', overflow: 'visible' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou WhatsApp..." 
              style={{ paddingLeft: '48px', backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '12px', height: '48px' }}
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#faf9f6', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Nome</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>WhatsApp</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Objetivo</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Última Consulta</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredPacientes.map((paciente) => (
                  <tr 
                    key={paciente.id} 
                    onClick={() => handleRowClick(paciente.id)}
                    style={{ 
                      borderBottom: '1px solid var(--border-color)', 
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#faf9f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                        {paciente.nome}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', color: 'var(--text-muted)' }}>{paciente.whatsapp || '-'}</td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ backgroundColor: 'rgba(26, 79, 54, 0.08)', color: 'var(--primary)', padding: '6px 14px', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 500 }}>
                        {paciente.objetivo_texto || 'Não definido'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarIcon size={14} />
                        {getLastConsultation(paciente.consultas)}
                      </div>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
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
