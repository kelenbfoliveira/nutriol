import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Edit, Activity, Utensils, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockWeightData = [
  { date: '10 Jan', weight: 85, fat: 25 },
  { date: '10 Fev', weight: 83, fat: 24 },
  { date: '10 Mar', weight: 81, fat: 23 },
  { date: '10 Abr', weight: 79, fat: 21 },
  { date: '10 Mai', weight: 77.5, fat: 19 },
];

const PatientDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaciente = async () => {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setPaciente(data);
      }
      setLoading(false);
    };

    fetchPaciente();
  }, [id]);

  if (loading) return <div style={{ padding: '40px' }}>Carregando paciente...</div>;
  if (!paciente) return <div style={{ padding: '40px' }}>Paciente não encontrado.</div>;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '32px' }}>
        <Link to="/patients" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '16px', fontWeight: 500 }}>
          <ArrowLeft size={16} /> Voltar para Pacientes
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">{paciente.nome}</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              {paciente.idade ? `${paciente.idade} anos` : 'Idade não informada'} • {paciente.whatsapp || 'Sem WhatsApp'}
            </p>
          </div>
          <button className="btn-outline" onClick={() => navigate(`/patients/new`)}>
            <Edit size={16} /> Editar Paciente
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
        {/* Left Column: Quick Stats & Info */}
        <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '16px' }}>Métricas Atuais</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Peso Atual</p>
                <p style={{ color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 'bold' }}>{paciente.peso || paciente.peso_inicial || '75.0'} kg</p>
              </div>
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Altura</p>
                <p style={{ color: 'var(--text-dark)', fontSize: '1.25rem', fontWeight: 'bold' }}>{paciente.altura || '1.70'} m</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Objetivo Principal</h4>
              <p style={{ fontWeight: 500, color: 'var(--text-dark)' }}>{paciente.objetivo_texto || 'Não informado'}</p>
            </div>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '16px' }}>Ações Rápidas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn-outline" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/appointments')}>
                <Activity size={18} /> Agendar Consulta
              </button>
              <button className="btn-outline" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/meal-plans')}>
                <Utensils size={18} /> Criar Plano Alimentar
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Charts & History */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', marginBottom: '24px' }}>Evolução de Peso (Últimos 6 meses)</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockWeightData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow)' }}
                  />
                  <Area type="monotone" dataKey="weight" name="Peso (kg)" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)' }}>Últimas Anotações</h3>
              <button style={{ color: 'var(--primary)', background: 'none', fontWeight: 500, fontSize: '0.9rem' }}>Ver todas</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div style={{ backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '8px', height: 'fit-content' }}>
                  <FileText size={20} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '4px' }}>
                    <h4 style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Consulta de Retorno</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>10 de Maio, 2026</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Paciente relatou boa adaptação ao plano. Reduziu doces. Aumentaremos a ingestão de proteínas no café da manhã.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetails;
