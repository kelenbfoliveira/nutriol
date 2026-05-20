import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Apple, Plus, Search, FileText, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import NewMealPlanModal from '../components/NewMealPlanModal';

const MealPlans: React.FC = () => {
  const [planos, setPlanos] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchPlanos = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch patients for the modal
    const { data: pts } = await supabase.from('pacientes').select('id, nome').eq('nutricionista_id', session.user.id);
    if (pts) setPatients(pts);

    // Fetch meal plans
    const { data: mps, error } = await supabase
      .from('planos_alimentares')
      .select('*, pacientes(nome)');

    if (!error && mps) {
      setPlanos(mps);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlanos();
  }, [fetchPlanos]);

  const filteredPlanos = planos.filter(p => {
    const patientName = p.pacientes?.nome?.toLowerCase() || '';
    const title = p.titulo?.toLowerCase() || '';
    return patientName.includes(searchTerm.toLowerCase()) || title.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">Planos Alimentares</h1>
          <p className="page-subtitle">Crie e gerencie as dietas dos seus pacientes.</p>
        </div>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          Novo Plano
        </button>
      </header>

      <div className="card" style={{ padding: '0', overflow: 'visible' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
            <input 
              type="text" 
              placeholder="Buscar por título ou nome do paciente..." 
              style={{ paddingLeft: '48px', backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '12px', height: '48px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--primary)' }}>Carregando planos...</div>
        ) : filteredPlanos.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Apple size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--accent-gold)' }} />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', marginBottom: '8px' }}>Nenhum plano encontrado</h3>
            <p>Você ainda não criou nenhum plano alimentar.</p>
            <button className="btn-outline" style={{ margin: '24px auto 0', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Criar Primeiro Plano
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '24px' }}>
            {filteredPlanos.map(plano => (
              <div key={plano.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', backgroundColor: '#faf9f6', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-gold-light)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ backgroundColor: 'rgba(197, 160, 89, 0.1)', padding: '8px', borderRadius: '8px', color: 'var(--accent-gold)' }}>
                    <FileText size={20} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {plano.criado_em ? format(parseISO(plano.criado_em), "dd/MM/yyyy") : ''}
                  </span>
                </div>
                
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', fontWeight: 600, marginBottom: '4px' }}>{plano.titulo}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} /> {plano.pacientes?.nome || 'Paciente Desconhecido'}
                  </p>
                </div>
                
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {plano.descricao || 'Sem descrição.'}
                </p>
                
                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <button className="btn-outline" style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem', padding: '8px' }} onClick={() => navigate(`/patients/${plano.paciente_id}`)}>
                    Ver Perfil do Paciente
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewMealPlanModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => fetchPlanos()}
        patients={patients}
      />
    </div>
  );
};

export default MealPlans;
