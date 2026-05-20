import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, Calendar, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { startOfWeek, endOfWeek, subDays, isAfter } from 'date-fns';

interface Paciente {
  id: string;
  nome: string;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({
    totalPacientes: 0,
    consultasSemana: 0,
  });
  const [pacientesSemRetorno, setPacientesSemRetorno] = useState<Paciente[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/login');
          return;
        }

        // Fetch Nutricionista Name
        const { data: nutriData } = await supabase
          .from('nutricionistas')
          .select('nome')
          .eq('id', session.user.id)
          .single();

        if (nutriData) {
          setUserName(nutriData.nome);
        }

        // Fetch Pacientes count
        const { count: pacientesCount } = await supabase
          .from('pacientes')
          .select('*', { count: 'exact', head: true })
          .eq('nutricionista_id', session.user.id);

        // Fetch Consultas da semana
        const now = new Date();
        const start = startOfWeek(now, { weekStartsOn: 0 }).toISOString();
        const end = endOfWeek(now, { weekStartsOn: 0 }).toISOString();

        const { count: consultasCount } = await supabase
          .from('consultas')
          .select('*', { count: 'exact', head: true })
          .gte('data_consulta', start)
          .lte('data_consulta', end);

        setStats({
          totalPacientes: pacientesCount || 0,
          consultasSemana: consultasCount || 0
        });

        // Calculate Pacientes sem retorno
        const { data: activePatients } = await supabase
          .from('pacientes')
          .select('id, nome')
          .eq('nutricionista_id', session.user.id);

        const { data: consultations } = await supabase
          .from('consultas')
          .select('paciente_id, data_consulta');

        if (activePatients && consultations) {
          const thirtyDaysAgo = subDays(new Date(), 30);
          const withoutReturn: Paciente[] = [];

          activePatients.forEach((patient) => {
            const patientConsultations = consultations.filter(c => c.paciente_id === patient.id);
            if (patientConsultations.length > 0) {
              const sorted = patientConsultations.sort((a, b) => 
                new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime()
              );
              const latestDate = new Date(sorted[0].data_consulta);

              // If the latest consultation was more than 30 days ago and there are no future consultations
              if (latestDate < thirtyDaysAgo && !isAfter(latestDate, new Date())) {
                withoutReturn.push(patient);
              }
            }
          });

          setPacientesSemRetorno(withoutReturn);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--primary)' }}>
        <Clock className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
        <div>
          <h1 className="page-title">Olá, {userName}!</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Aqui está o resumo do seu consultório hoje.</p>
        </div>
        
        <div style={{
          position: 'relative',
          padding: '24px 32px',
          backgroundColor: '#faf9f6',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          borderLeft: '4px solid var(--accent-gold)',
          boxShadow: 'var(--shadow-sm)',
          maxWidth: '500px',
          overflow: 'hidden'
        }}>
          {/* Subtle decorative background element */}
          <div style={{ position: 'absolute', right: '-10%', top: '-20%', opacity: 0.05, transform: 'scale(2)', color: 'var(--primary)', pointerEvents: 'none' }}>
            <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
          </div>
          
          <p style={{ 
            fontStyle: 'italic', 
            color: 'var(--text-dark)', 
            fontSize: '1rem', 
            lineHeight: 1.6,
            fontWeight: 500,
            position: 'relative',
            zIndex: 1
          }}>
            "Nutrir não é apenas fornecer calorias, mas entregar saúde, vida e transformação a cada refeição."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', position: 'relative', zIndex: 1 }}>
            <div style={{ height: '1px', width: '20px', backgroundColor: 'var(--accent-gold)' }}></div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Inspiração Diária
            </p>
          </div>
        </div>
      </header>
      
      {/* Top Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Card 1: Total Pacientes Ativos */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="card-accent"></div>
          <div style={{ backgroundColor: 'rgba(26, 79, 54, 0.08)', padding: '16px', borderRadius: '16px', color: 'var(--primary)' }}>
            <Users size={32} strokeWidth={1.5} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500, marginBottom: '4px' }}>Pacientes Ativos</p>
            <h3 style={{ fontSize: '2.25rem', color: 'var(--text-dark)', fontWeight: 700, lineHeight: 1 }}>{stats.totalPacientes}</h3>
          </div>
        </div>

        {/* Card 2: Consultas da Semana */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="card-accent"></div>
          <div style={{ backgroundColor: 'rgba(197, 160, 89, 0.1)', padding: '16px', borderRadius: '16px', color: 'var(--accent-gold)' }}>
            <Calendar size={32} strokeWidth={1.5} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500, marginBottom: '4px' }}>Consultas na Semana</p>
            <h3 style={{ fontSize: '2.25rem', color: 'var(--text-dark)', fontWeight: 700, lineHeight: 1 }}>{stats.consultasSemana}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Card 3: Pacientes Sem Retorno */}
        <div className="card">
          <div className="card-accent"></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '12px', color: '#ef4444' }}>
              <AlertCircle size={24} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', fontWeight: 600 }}>Pacientes Sem Retorno</h3>
          </div>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Pacientes cuja última consulta foi há mais de 30 dias e sem retorno agendado.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pacientesSemRetorno.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                <p>Nenhum paciente sem retorno no momento</p>
              </div>
            ) : (
              pacientesSemRetorno.map((paciente) => (
                <Link 
                  key={paciente.id} 
                  to={`/patients/${paciente.id}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '16px', 
                    backgroundColor: '#faf9f6', 
                    borderRadius: '12px',
                    textDecoration: 'none',
                    color: 'var(--text-dark)',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-gold-light)';
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.backgroundColor = '#faf9f6';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{paciente.nome}</span>
                  <ChevronRight size={18} color="var(--accent-gold)" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
