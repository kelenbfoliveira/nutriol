import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, Plus, Clock, Search, User } from 'lucide-react';
import { format, parseISO, isAfter, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import NewAppointmentModal from '../components/NewAppointmentModal';

const Appointments: React.FC = () => {
  const [consultas, setConsultas] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchConsultas = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch patients for the modal
    const { data: pts } = await supabase.from('pacientes').select('id, nome').eq('nutricionista_id', session.user.id);
    if (pts) setPatients(pts);

    // Fetch consultations
    const { data: cons, error } = await supabase
      .from('consultas')
      .select('*, pacientes(nome)')
      .order('data_consulta', { ascending: true });

    if (!error && cons) {
      setConsultas(cons);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConsultas();
  }, [fetchConsultas]);

  const filteredConsultas = consultas.filter(c => {
    const patientName = c.pacientes?.nome?.toLowerCase() || '';
    return patientName.includes(searchTerm.toLowerCase());
  });

  const upcomingConsultas = filteredConsultas.filter(c => isAfter(parseISO(c.data_consulta.replace(' ', 'T')), new Date()) || isToday(parseISO(c.data_consulta.replace(' ', 'T'))));
  const pastConsultas = filteredConsultas.filter(c => !isAfter(parseISO(c.data_consulta.replace(' ', 'T')), new Date()) && !isToday(parseISO(c.data_consulta.replace(' ', 'T'))));

  return (
    <div className="fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">Acompanhe seus próximos atendimentos.</p>
        </div>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          Agendar Consulta
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px' }}>
        {/* Left Column: Mini Calendar & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarIcon size={48} color="var(--accent-gold)" style={{ marginBottom: '16px', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)' }}>{format(new Date(), "MMMM yyyy", { locale: ptBR })}</h3>
            <p style={{ color: 'var(--text-muted)' }}>{upcomingConsultas.length} próximas consultas</p>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="card" style={{ padding: '0', overflow: 'visible' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
              <input 
                type="text" 
                placeholder="Buscar por nome do paciente..." 
                style={{ paddingLeft: '48px', backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '12px', height: '48px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--primary)' }}>Carregando agenda...</div>
          ) : filteredConsultas.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CalendarIcon size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--accent-gold)' }} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', marginBottom: '8px' }}>Nenhuma consulta agendada</h3>
              <p>Sua agenda está livre. Que tal agendar o seu primeiro paciente?</p>
              <button className="btn-outline" style={{ margin: '24px auto 0', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} onClick={() => setIsModalOpen(true)}>
                <Plus size={16} /> Agendar Consulta
              </button>
            </div>
          ) : (
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--primary)" /> Próximas Consultas
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {upcomingConsultas.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>Sem consultas futuras.</p>
                ) : upcomingConsultas.map(consulta => (
                  <div key={consulta.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: '#faf9f6', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-gold-light)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                    <div style={{ backgroundColor: 'var(--white)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', minWidth: '70px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{format(parseISO(consulta.data_consulta.replace(' ', 'T')), 'MMM', { locale: ptBR })}</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', lineHeight: 1 }}>{format(parseISO(consulta.data_consulta.replace(' ', 'T')), 'dd')}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} color="var(--text-muted)" /> {consulta.pacientes?.nome || 'Paciente Desconhecido'}
                      </h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <Clock size={14} /> {consulta.data_consulta.length > 10 ? format(parseISO(consulta.data_consulta.replace(' ', 'T')), "HH:mm") : '--:--'}
                      </p>
                    </div>
                    <button className="btn-outline" style={{ fontSize: '0.85rem', padding: '8px 12px' }} onClick={() => navigate(`/patients/${consulta.paciente_id}`)}>Ver Perfil</button>
                  </div>
                ))}
              </div>

              {pastConsultas.length > 0 && (
                <>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                    Histórico Recente
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: 0.7 }}>
                    {pastConsultas.slice(-5).reverse().map(consulta => (
                      <div key={consulta.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '1rem', color: 'var(--text-dark)', fontWeight: 500 }}>{consulta.pacientes?.nome || 'Paciente Desconhecido'}</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {format(parseISO(consulta.data_consulta.replace(' ', 'T')), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <NewAppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => fetchConsultas()}
        patients={patients}
      />
    </div>
  );
};

export default Appointments;
