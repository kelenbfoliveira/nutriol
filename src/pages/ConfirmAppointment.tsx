import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, CheckCircle2, AlertTriangle, CalendarRange, User } from 'lucide-react';

const ConfirmAppointment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [consulta, setConsulta] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const fetchConsulta = async () => {
      if (!appointmentId) {
        setError('Link de confirmação inválido ou incompleto.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from('consultas')
          .select('*, pacientes!inner(nome, whatsapp, nutricionistas(nome))')
          .eq('id', appointmentId)
          .single();

        if (dbError || !data) {
          throw new Error('Consulta não encontrada. Verifique o link enviado.');
        }

        setConsulta(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados da consulta.');
      } finally {
        setLoading(false);
      }
    };

    fetchConsulta();
  }, [appointmentId]);

  const handleUpdateStatus = async (newStatus: 'confirmada' | 'reagendar') => {
    if (!appointmentId) return;
    setUpdating(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('consultas')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      setConsulta((prev: any) => ({ ...prev, status: newStatus }));
      
      if (newStatus === 'confirmada') {
        setStatusMessage('Presença confirmada com sucesso! Nos vemos em breve.');
      } else {
        setStatusMessage('Solicitação de reagendamento enviada. A nutricionista entrará em contato em breve.');
      }
    } catch (err: any) {
      setError('Não foi possível atualizar o status da consulta. Tente novamente.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 16px' }}></div>
          <p style={{ fontWeight: 500 }}>Carregando dados da consulta...</p>
        </div>
      </div>
    );
  }

  const targetDate = consulta?.proximo_retorno || consulta?.data_consulta;
  const dateStr = targetDate ? targetDate.replace(' ', 'T') : '';
  const parsedDate = dateStr ? parseISO(dateStr) : null;
  const formattedDate = parsedDate ? format(parsedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '';
  const formattedTime = parsedDate ? format(parsedDate, "HH:mm") : '';

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '24px',
      background: 'linear-gradient(135deg, #fdf2f4 0%, #fdfaf9 100%)',
      fontFamily: 'inherit'
    }}>
      <div className="fade-in" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        padding: '36px',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--primary), var(--accent-gold))' }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
            Nutri<span>Ol</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: '4px 0 0 0', fontWeight: 600 }}>Confirmar Consulta</p>
        </div>

        {error ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', marginBottom: '8px' }}>Ops! Ocorreu um erro</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>{error}</p>
          </div>
        ) : (
          <div>
            {/* Appointment Status Cards */}
            {consulta.status === 'confirmada' ? (
              <div style={{ textAlign: 'center', padding: '12px 0', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: 'rgba(37, 211, 102, 0.1)', color: '#25d366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '6px' }}>Presença Confirmada!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                  {statusMessage || 'Sua presença já foi registrada no sistema. Obrigado!'}
                </p>
              </div>
            ) : consulta.status === 'reagendar' ? (
              <div style={{ textAlign: 'center', padding: '12px 0', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: 'rgba(197, 160, 89, 0.1)', color: 'var(--accent-gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(197, 160, 89, 0.2)' }}>
                  <CalendarRange size={32} />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--accent-gold-hover)', fontWeight: 700, marginBottom: '6px' }}>Reagendamento Solicitado</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                  {statusMessage || 'A nutricionista entrará em contato em breve para remarcar o melhor horário.'}
                </p>
              </div>
            ) : (
              <div>
                {/* Info Card */}
                <div style={{ backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', marginBottom: '28px' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <User size={16} color="var(--accent-gold)" /> Olá, {consulta.pacientes?.nome}!
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <Calendar size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Data</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: 500 }}>{formattedDate}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <Clock size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Horário</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: 500 }}>{formattedTime} hs</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                      <User size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Nutricionista</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: 500 }}>{consulta.pacientes?.nutricionistas?.nome}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => handleUpdateStatus('confirmada')}
                    disabled={updating}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      backgroundColor: 'var(--primary)',
                      color: 'var(--white)',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(24, 63, 46, 0.12)',
                      cursor: 'pointer',
                      opacity: updating ? 0.7 : 1
                    }}
                  >
                    {updating ? 'Processando...' : 'Confirmar Presença'}
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('reagendar')}
                    disabled={updating}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      backgroundColor: 'transparent',
                      color: 'var(--secondary)',
                      border: '1px solid rgba(150, 91, 104, 0.3)',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      opacity: updating ? 0.7 : 1
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--secondary-light)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Solicitar Reagendamento
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmAppointment;
