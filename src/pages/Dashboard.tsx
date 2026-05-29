import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Users, Calendar, AlertCircle, Clock, ChevronRight, 
  UserPlus, Apple, CalendarPlus, TrendingUp, BarChart2
} from 'lucide-react';
import { startOfWeek, endOfWeek, subDays, isAfter, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isTomorrow } from '../lib/utils';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';

interface Paciente {
  id: string;
  nome: string;
  objetivo_texto?: string;
}

interface Consulta {
  id: string;
  paciente_id: string;
  data_consulta: string;
  pacientes?: {
    nome: string;
  };
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({
    totalPacientes: 0,
    consultasSemana: 0,
    totalPlanos: 0,
  });
  const [pacientesSemRetorno, setPacientesSemRetorno] = useState<Paciente[]>([]);
  const [todaysAppointments, setTodaysAppointments] = useState<Consulta[]>([]);
  const [tomorrowAppointmentsCount, setTomorrowAppointmentsCount] = useState(0);
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [goalsChartData, setGoalsChartData] = useState<any[]>([]);
  
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

        // Fetch Pacientes
        const { data: activePatients } = await supabase
          .from('pacientes')
          .select('id, nome, objetivo_texto')
          .eq('nutricionista_id', session.user.id);

        const totalPts = activePatients?.length || 0;

        // Fetch Consultations belonging to this dietitian's patients
        const { data: consData } = await supabase
          .from('consultas')
          .select('*, pacientes!inner(id, nome, whatsapp, nutricionista_id)')
          .eq('pacientes.nutricionista_id', session.user.id);

        const consultations = consData || [];

        // Calculate Tomorrow's consultations
        const tomorrowCons = consultations.filter(c => isTomorrow(c.proximo_retorno || c.data_consulta));
        setTomorrowAppointmentsCount(tomorrowCons.length);

        // Fetch Meal Plans belonging to this dietitian's patients
        const { data: plansData } = await supabase
          .from('planos_alimentares')
          .select('*, pacientes!inner(id, nome, nutricionista_id)')
          .eq('pacientes.nutricionista_id', session.user.id);

        const totalPlansCount = plansData?.length || 0;

        // Calculate Weekly Consultations
        const now = new Date();
        const startWeek = startOfWeek(now, { weekStartsOn: 0 });
        const endWeek = endOfWeek(now, { weekStartsOn: 0 });
        
        const weekCons = consultations.filter(c => {
          const targetDate = c.proximo_retorno || c.data_consulta;
          const d = parseISO(targetDate.replace(' ', 'T'));
          return d >= startWeek && d <= endWeek;
        });

        setStats({
          totalPacientes: totalPts,
          consultasSemana: weekCons.length,
          totalPlanos: totalPlansCount
        });

        // Filter Today's consultations
        const todayStr = format(now, 'yyyy-MM-dd');
        const todaysCons = consultations
          .filter(c => {
            const targetDate = c.proximo_retorno || c.data_consulta;
            return targetDate.startsWith(todayStr);
          })
          .sort((a, b) => {
            const dateA = a.proximo_retorno || a.data_consulta;
            const dateB = b.proximo_retorno || b.data_consulta;
            return dateA.localeCompare(dateB);
          })
          .map(c => ({
            id: c.id,
            paciente_id: c.paciente_id,
            data_consulta: c.proximo_retorno || c.data_consulta,
            pacientes: {
              nome: (c.pacientes as any)?.nome || 'Paciente'
            }
          }));

        setTodaysAppointments(todaysCons);

        // Generate Monthly Consultations Data (last 6 months)
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthLabel = format(d, 'MMM', { locale: ptBR });
          const monthPrefix = format(d, 'yyyy-MM');
          const count = consultations.filter(c => c.data_consulta.startsWith(monthPrefix)).length;
          monthlyData.push({ name: monthLabel, 'Atendimentos': count });
        }
        setMonthlyChartData(monthlyData);

        // Generate Patient Goals Distribution
        const goalsMap: { [key: string]: number } = {};
        (activePatients || []).forEach(p => {
          const goal = p.objetivo_texto || 'Não definido';
          goalsMap[goal] = (goalsMap[goal] || 0) + 1;
        });
        const goalsData = Object.keys(goalsMap).map(goal => ({
          name: goal,
          'Pacientes': goalsMap[goal]
        })).sort((a, b) => b.Pacientes - a.Pacientes).slice(0, 5);
        setGoalsChartData(goalsData);

        // Calculate Pacientes sem retorno (last consultation > 30 days ago, and no future consultations)
        if (activePatients) {
          const thirtyDaysAgo = subDays(new Date(), 30);
          const withoutReturn: Paciente[] = [];

          activePatients.forEach((patient) => {
            const patientConsultations = consultations.filter(c => c.paciente_id === patient.id);
            if (patientConsultations.length > 0) {
              const sorted = patientConsultations.sort((a, b) => 
                new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime()
              );
              const latestDate = new Date(sorted[0].data_consulta);

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

  // Percentage calculations for meta bars
  const patientMetaPercent = Math.min(Math.round((stats.totalPacientes / 50) * 100), 100);
  const consultationMetaPercent = Math.min(Math.round((stats.consultasSemana / 10) * 100), 100);
  const planCoveragePercent = stats.totalPacientes > 0 
    ? Math.min(Math.round((stats.totalPlanos / stats.totalPacientes) * 100), 100) 
    : 0;

  return (
    <div className="fade-in">
      {/* Premium Dashboard Header Banner */}
      <div className="dashboard-profile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="avatar-monogram" style={{ width: '64px', height: '64px', fontSize: '1.5rem', backgroundColor: 'var(--accent-gold)', border: '2px solid rgba(255,255,255,0.4)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              {userName ? userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'NU'}
            </div>
            <div>
              <h1 className="page-title" style={{ color: 'var(--white)', marginBottom: '4px', fontSize: '2.2rem' }}>Olá, {userName || 'Nutricionista'}!</h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', margin: 0, fontWeight: 500 }}>
                Bem-vinda de volta. Aqui está o resumo do seu consultório hoje.
              </p>
            </div>
          </div>

          {/* Refined quote banner as glassmorphism card inside the header */}
          <div style={{
            padding: '16px 24px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            maxWidth: '400px',
          }}>
            <p style={{ 
              fontStyle: 'italic', 
              color: 'var(--white)', 
              fontSize: '0.9rem', 
              lineHeight: 1.5,
              fontWeight: 500,
              margin: 0
            }}>
              "Nutrir não é apenas fornecer calorias, mas entregar saúde, vida e transformação a cada refeição."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <div style={{ height: '1px', width: '12px', backgroundColor: 'var(--accent-gold)' }}></div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
                Inspiração Diária
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tomorrow's Confirmation Alert Banner */}
      {tomorrowAppointmentsCount > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '16px',
          marginTop: '24px',
          marginBottom: '4px',
          boxShadow: 'var(--shadow-sm)',
          animation: 'fadeIn 0.4s ease-out',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⚠️</span>
            <div>
              <p style={{ margin: 0, color: '#b45309', fontWeight: 600, fontSize: '0.92rem', lineHeight: 1.4 }}>
                Você tem {tomorrowAppointmentsCount} consulta{tomorrowAppointmentsCount !== 1 ? 's' : ''} amanhã. Envie confirmações pelo WhatsApp.
              </p>
            </div>
          </div>
          <button 
            className="btn-primary" 
            onClick={() => navigate('/appointments')}
            style={{ 
              width: 'auto', 
              padding: '8px 16px', 
              fontSize: '0.85rem', 
              backgroundColor: '#25d366', 
              borderColor: '#25d366',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#128c7e'; e.currentTarget.style.borderColor = '#128c7e'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#25d366'; e.currentTarget.style.borderColor = '#25d366'; }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>Confirmar na Agenda</span>
          </button>
        </div>
      )}
      
      {/* Top Cards Row (Grid of 3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px', marginTop: '24px' }}>
        
        {/* Card 1: Total Pacientes Ativos */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ backgroundColor: 'rgba(24, 63, 46, 0.06)', padding: '16px', borderRadius: '16px', color: 'var(--primary)' }}>
              <Users size={32} strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Pacientes Ativos</p>
              <h3 style={{ fontSize: '2.25rem', color: 'var(--primary)', fontWeight: 800, lineHeight: 1 }}>{stats.totalPacientes}</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Meta mensal (50 pacientes)</span>
              <span>{patientMetaPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${patientMetaPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent-gold))', borderRadius: '10px' }} />
            </div>
          </div>
        </div>

        {/* Card 2: Consultas da Semana */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ backgroundColor: 'rgba(197, 160, 89, 0.1)', padding: '16px', borderRadius: '16px', color: 'var(--accent-gold)' }}>
              <Calendar size={32} strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Consultas na Semana</p>
              <h3 style={{ fontSize: '2.25rem', color: 'var(--primary)', fontWeight: 800, lineHeight: 1 }}>{stats.consultasSemana}</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Ocupação esperada (10 consult.)</span>
              <span>{consultationMetaPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${consultationMetaPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-gold-hover))', borderRadius: '10px' }} />
            </div>
          </div>
        </div>

        {/* Card 3: Planos Alimentares */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ backgroundColor: 'rgba(150, 91, 104, 0.08)', padding: '16px', borderRadius: '16px', color: 'var(--secondary)' }}>
              <Apple size={32} strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Planos Criados</p>
              <h3 style={{ fontSize: '2.25rem', color: 'var(--primary)', fontWeight: 800, lineHeight: 1 }}>{stats.totalPlanos}</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Cobertura de Pacientes</span>
              <span>{planCoveragePercent}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${planCoveragePercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--secondary), #b57a87)', borderRadius: '10px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Analytics Hub Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px', marginBottom: '32px' }}>
        
        {/* Left Column: Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Chart 1: Evolução de Consultas */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'rgba(24, 63, 46, 0.05)', padding: '8px', borderRadius: '10px', color: 'var(--primary)' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', fontWeight: 700 }}>Evolução de Atendimentos</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Consultas realizadas nos últimos 6 meses</p>
              </div>
            </div>
            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAtendimentos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', fontFamily: 'inherit' }}
                    formatter={(v: any) => [`${v} consultas`, 'Atendimentos']}
                  />
                  <Area type="monotone" dataKey="Atendimentos" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorAtendimentos)" dot={{ fill: 'var(--primary)', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Objetivo dos Pacientes */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'rgba(197, 160, 89, 0.1)', padding: '8px', borderRadius: '10px', color: 'var(--accent-gold)' }}>
                <BarChart2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', fontWeight: 700 }}>Metas Clínicas</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Distribuição dos objetivos principais dos pacientes ativos</p>
              </div>
            </div>
            {goalsChartData.length === 0 ? (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Nenhum objetivo registrado ainda.
              </div>
            ) : (
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={goalsChartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="var(--text-dark)" fontSize={12} tickLine={false} axisLine={false} width={120} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}
                      formatter={(v: any) => [`${v} pacientes`, 'Quantidade']}
                    />
                    <Bar dataKey="Pacientes" fill="var(--accent-gold)" radius={[0, 8, 8, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Today's Schedule & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quick Actions Hub */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', fontWeight: 700, marginBottom: '16px' }}>Atalhos Rápidos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link to="/patients/new" style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px',
                backgroundColor: 'rgba(24, 63, 46, 0.03)', borderRadius: '14px', textDecoration: 'none',
                color: 'var(--primary)', fontWeight: 600, border: '1px solid transparent', transition: 'var(--transition)'
              }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(24, 63, 46, 0.15)'; e.currentTarget.style.backgroundColor = 'rgba(24, 63, 46, 0.06)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'rgba(24, 63, 46, 0.03)'; }}>
                <UserPlus size={20} />
                <span>Novo Paciente</span>
              </Link>
              
              <Link to="/appointments" style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px',
                backgroundColor: 'rgba(197, 160, 89, 0.06)', borderRadius: '14px', textDecoration: 'none',
                color: 'var(--accent-gold-hover)', fontWeight: 600, border: '1px solid transparent', transition: 'var(--transition)'
              }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(197, 160, 89, 0.2)'; e.currentTarget.style.backgroundColor = 'rgba(197, 160, 89, 0.1)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'rgba(197, 160, 89, 0.06)'; }}>
                <CalendarPlus size={20} />
                <span>Agendar Consulta</span>
              </Link>

              <Link to="/meal-plans" style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px',
                backgroundColor: 'rgba(150, 91, 104, 0.04)', borderRadius: '14px', textDecoration: 'none',
                color: 'var(--secondary)', fontWeight: 600, border: '1px solid transparent', transition: 'var(--transition)'
              }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(150, 91, 104, 0.12)'; e.currentTarget.style.backgroundColor = 'rgba(150, 91, 104, 0.08)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'rgba(150, 91, 104, 0.04)'; }}>
                <Apple size={20} />
                <span>Criar Plano Alimentar</span>
              </Link>
            </div>
          </div>

          {/* Today's Agenda */}
          <div className="glass-card" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', fontWeight: 700, margin: 0 }}>Agenda de Hoje</h3>
              <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--secondary-light)', color: 'var(--secondary)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                {format(new Date(), "dd 'de' MMM", { locale: ptBR })}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {todaysAppointments.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Calendar size={36} strokeWidth={1.2} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.9rem', margin: 0 }}>Nenhum atendimento agendado para hoje.</p>
                </div>
              ) : (
                todaysAppointments.map((consulta, idx) => (
                  <Link 
                    key={consulta.id}
                    to={`/patients/${consulta.paciente_id}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px',
                      backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '12px',
                      textDecoration: 'none', transition: 'var(--transition)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.backgroundColor = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.backgroundColor = '#faf9f6'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className={`avatar-monogram avatar-color-${idx % 5}`} style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        {consulta.pacientes?.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'PA'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem', margin: 0 }}>{consulta.pacientes?.nome}</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={12} />
                          {consulta.data_consulta.length > 10 ? format(parseISO(consulta.data_consulta.replace(' ', 'T')), "HH:mm") : '--:--'} hs
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row: Pacientes Sem Retorno */}
      <div className="glass-card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '12px', color: '#ef4444' }}>
            <AlertCircle size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', fontWeight: 700, margin: 0 }}>Atenção aos Retornos</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Pacientes cuja última consulta foi há mais de 30 dias e não possuem retorno agendado.</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pacientesSemRetorno.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
              <p style={{ margin: 0 }}>Nenhum paciente sem retorno no momento. Excelente!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {pacientesSemRetorno.slice(0, 6).map((paciente, idx) => (
                <Link 
                  key={paciente.id} 
                  to={`/patients/${paciente.id}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '14px 18px', 
                    backgroundColor: '#faf9f6', 
                    borderRadius: '16px',
                    textDecoration: 'none',
                    color: 'var(--text-dark)',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-gold-light)';
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.backgroundColor = '#faf9f6';
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className={`avatar-monogram avatar-color-${idx % 5}`}>
                      {paciente.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem' }}>{paciente.nome}</span>
                  </div>
                  <ChevronRight size={18} color="var(--accent-gold)" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
