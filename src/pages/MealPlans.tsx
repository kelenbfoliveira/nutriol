import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Apple, Plus, Search, FileText, LayoutGrid } from 'lucide-react';
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

    const { data: pts } = await supabase
      .from('pacientes')
      .select('id, nome')
      .eq('nutricionista_id', session.user.id);
    if (pts) setPatients(pts);

    const { data: mps, error } = await supabase
      .from('planos_alimentares')
      .select('*, pacientes!inner(id, nome, nutricionista_id)')
      .eq('pacientes.nutricionista_id', session.user.id);

    if (!error && mps) setPlanos(mps);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlanos(); }, [fetchPlanos]);

  const filteredPlanos = planos.filter(p => {
    const patientName = p.pacientes?.nome?.toLowerCase() || '';
    const title = p.titulo?.toLowerCase() || '';
    return patientName.includes(searchTerm.toLowerCase()) || title.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="fade-in">
      {/* Header compacto */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '2px' }}>Planos Alimentares</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {planos.length} plano{planos.length !== 1 ? 's' : ''} cadastrado{planos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px', fontSize: '0.9rem' }}
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={18} />
          Novo Plano
        </button>
      </header>

      {/* Card principal */}
      <div className="glass-card" style={{ padding: '0', overflow: 'visible' }}>

        {/* Barra de busca */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por título ou nome do paciente..."
              style={{ paddingLeft: '44px', backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '10px', height: '40px', fontSize: '0.9rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0 4px', whiteSpace: 'nowrap' }}>
            <LayoutGrid size={14} />
            {filteredPlanos.length} resultado{filteredPlanos.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--primary)' }}>Carregando planos...</div>
        ) : filteredPlanos.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Apple size={40} style={{ margin: '0 auto 12px', opacity: 0.4, color: 'var(--accent-gold)' }} />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', marginBottom: '6px' }}>Nenhum plano encontrado</h3>
            <p style={{ fontSize: '0.875rem' }}>Você ainda não criou nenhum plano alimentar.</p>
            <button
              className="btn-outline"
              style={{ margin: '16px auto 0', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} /> Criar Primeiro Plano
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            padding: '16px 20px'
          }}>
            {filteredPlanos.map((plano, idx) => (
              <div
                key={plano.id}
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'var(--transition)',
                  cursor: 'default',
                  boxShadow: 'var(--shadow-sm)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(197,160,89,0.35)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)';
                }}
              >
                {/* Header do card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ backgroundColor: 'rgba(197,160,89,0.1)', padding: '8px', borderRadius: '10px', color: 'var(--accent-gold)' }}>
                    <FileText size={18} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: '#faf9f6', padding: '3px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: 500 }}>
                    {plano.created_at ? format(parseISO(plano.created_at), 'dd/MM/yyyy') : ''}
                  </span>
                </div>

                {/* Título e paciente */}
                <div>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-dark)', fontWeight: 700, marginBottom: '4px', lineHeight: 1.3 }}>{plano.titulo}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      className={`avatar-monogram avatar-color-${idx % 5}`}
                      style={{ width: '20px', height: '20px', fontSize: '0.6rem', flexShrink: 0 }}
                    >
                      {plano.pacientes?.nome
                        ? plano.pacientes.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                        : 'PA'}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {plano.pacientes?.nome || 'Paciente Desconhecido'}
                    </span>
                  </div>
                </div>

                {/* Descrição truncada */}
                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.5,
                  margin: 0,
                  flexGrow: 1,
                }}>
                  {plano.descricao || 'Sem descrição.'}
                </p>

                {/* Ação */}
                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    className="btn-outline"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '8px', borderRadius: '8px' }}
                    onClick={() => navigate(`/patients/${plano.paciente_id}`)}
                  >
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
