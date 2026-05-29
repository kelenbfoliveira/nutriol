import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, Plus, Clock, Search, User, CheckCircle, Trash2 } from 'lucide-react';
import { format, parseISO, isAfter, isToday, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import NewAppointmentModal from '../components/NewAppointmentModal';
import { isTomorrow, formatWhatsAppNumber } from '../lib/utils';

const Appointments: React.FC = () => {
  const [consultas, setConsultas] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();

  const getConsultaStatus = (consulta: any): string => {
    // Se o agendamento sendo exibido for o retorno
    if (consulta.proximo_retorno) {
      if (consulta.status === 'confirmada' || consulta.status === 'reagendar') {
        return consulta.status;
      }
      return 'agendada';
    }
    // Caso contrário, é a consulta principal
    return consulta.status || 'agendada';
  };

  const isWithinConfirmationWindow = (dateStr: string): boolean => {
    const parsedDate = parseISO(dateStr.replace(' ', 'T'));
    const today = new Date();
    const diff = differenceInCalendarDays(parsedDate, today);
    return diff >= 0 && diff <= 3;
  };

  const handleSendWhatsApp = async (consulta: any, type: 'confirmacao' | 'lembrete' = 'confirmacao') => {
    const rawNumber = consulta.pacientes?.whatsapp || '';
    if (!rawNumber) return;

    // A próxima consulta é o retorno se existir, senão a data do atendimento apenas se for futura
    const targetDate = consulta.proximo_retorno || (
      isAfter(parseISO(consulta.data_consulta.replace(' ', 'T')), new Date()) ? consulta.data_consulta : null
    );
    if (!targetDate) return;

    const cleanNumber = formatWhatsAppNumber(rawNumber);
    const patientName = consulta.pacientes?.nome || '';
    const dateStr = targetDate.replace(' ', 'T');
    const parsedDate = parseISO(dateStr);
    const formattedDate = format(parsedDate, "dd/MM/yyyy");
    const formattedTime = format(parsedDate, "HH:mm");

    let message = '';
    if (type === 'lembrete') {
      message = `Olá, ${patientName}! Tudo bem? Passando para lembrar da nossa consulta hoje, dia ${formattedDate} às ${formattedTime}h. Nos vemos em breve! Abraço.`;
      
      // Atualiza o status no banco de dados para evitar reenvio
      const { error } = await supabase
        .from('consultas')
        .update({ whatsapp_reminder_sent: true })
        .eq('id', consulta.id);
      
      if (!error) {
        setConsultas(prev => prev.map(c => c.id === consulta.id ? { ...c, whatsapp_reminder_sent: true } : c));
      }
    } else {
      // Link de confirmação
      const confirmationLink = `${window.location.origin}/confirmar?id=${consulta.id}`;
      const tomorrow = isTomorrow(targetDate);
      if (tomorrow) {
        message = `Olá, ${patientName}! Gostaria de confirmar sua consulta agendada para amanhã, dia ${formattedDate} às ${formattedTime}h. Por favor, confirme sua presença clicando no link a seguir: ${confirmationLink}`;
      } else {
        message = `Olá, ${patientName}! Gostaria de confirmar sua consulta agendada para o dia ${formattedDate} às ${formattedTime}h. Por favor, confirme sua presença clicando no link a seguir: ${confirmationLink}`;
      }
    }

    const url = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const fetchConsultas = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: pts } = await supabase.from('pacientes').select('id, nome').eq('nutricionista_id', session.user.id);
    if (pts) setPatients(pts);

    const { data: cons, error } = await supabase
      .from('consultas')
      .select('*, pacientes!inner(id, nome, whatsapp, nutricionista_id)')
      .eq('pacientes.nutricionista_id', session.user.id)
      .order('data_consulta', { ascending: true });

    if (!error && cons) setConsultas(cons);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConsultas(); }, [fetchConsultas]);

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    const { error } = await supabase.from('consultas').delete().eq('id', id);
    if (!error) {
      setConsultas(prev => prev.filter(c => c.id !== id));
      setDeleteConfirmId(null);
    }
    setDeleteLoading(false);
  };

  const filteredConsultas = consultas.filter(c => {
    const patientName = c.pacientes?.nome?.toLowerCase() || '';
    return patientName.includes(searchTerm.toLowerCase());
  });

  const upcomingConsultas = filteredConsultas.filter(c => {
    const targetDate = c.proximo_retorno || c.data_consulta;
    const parsed = parseISO(targetDate.replace(' ', 'T'));
    return isAfter(parsed, new Date()) || isToday(parsed);
  }).sort((a, b) => {
    const dateA = (a.proximo_retorno || a.data_consulta).replace(' ', 'T');
    const dateB = (b.proximo_retorno || b.data_consulta).replace(' ', 'T');
    return dateA.localeCompare(dateB);
  });
  const pastConsultas = filteredConsultas.filter(c => {
    const targetDate = c.proximo_retorno || c.data_consulta;
    const parsed = parseISO(targetDate.replace(' ', 'T'));
    return !isAfter(parsed, new Date()) && !isToday(parsed);
  });

  return (
    <div className="fade-in">
      {/* Compact Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '2px' }}>Agenda</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {upcomingConsultas.length} consulta{upcomingConsultas.length !== 1 ? 's' : ''} agendada{upcomingConsultas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '0.9rem' }} onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Agendar Consulta
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Month card */}
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CalendarIcon size={24} color="#fff" />
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', margin: '0 0 2px' }}>{upcomingConsultas.length}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Próximas consultas</p>
          </div>

          {/* Past card */}
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, background: 'rgba(24,63,46,0.06)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CheckCircle size={24} color="var(--primary)" />
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)', margin: '0 0 2px' }}>{pastConsultas.length}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Realizadas</p>
          </div>

          {/* Month label */}
          <div className="glass-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', margin: '0 0 4px' }}>Mês atual</p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', margin: 0, textTransform: 'capitalize' }}>
              {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Right Column: List */}
        <div className="glass-card" style={{ padding: '0', overflow: 'visible' }}>
          {/* Search bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
              <input
                type="text"
                placeholder="Buscar por paciente..."
                style={{ paddingLeft: '44px', backgroundColor: '#faf9f6', border: '1px solid var(--border-color)', borderRadius: '10px', height: '40px', fontSize: '0.9rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--primary)' }}>Carregando agenda...</div>
          ) : filteredConsultas.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CalendarIcon size={40} style={{ margin: '0 auto 12px', opacity: 0.5, color: 'var(--accent-gold)' }} />
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', marginBottom: '6px' }}>Nenhuma consulta agendada</h3>
              <p style={{ fontSize: '0.875rem' }}>Sua agenda está livre. Que tal agendar o seu primeiro paciente?</p>
              <button className="btn-outline" style={{ margin: '16px auto 0', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} onClick={() => setIsModalOpen(true)}>
                <Plus size={16} /> Agendar Consulta
              </button>
            </div>
          ) : (
            <div style={{ padding: '16px 20px' }}>
              {/* Upcoming */}
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="var(--primary)" /> Próximas
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {upcomingConsultas.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem consultas futuras.</p>
                ) : upcomingConsultas.map(consulta => {
                  const targetDate = consulta.proximo_retorno || consulta.data_consulta;
                  const statusCalculado = getConsultaStatus(consulta);
                  const isDateToday = isToday(parseISO(targetDate.replace(' ', 'T')));
                  const hasWhatsApp = !!consulta.pacientes?.whatsapp;

                  const isConfirmable = isWithinConfirmationWindow(targetDate) && 
                                       statusCalculado !== 'confirmada' && 
                                       statusCalculado !== 'cancelada' && 
                                       statusCalculado !== 'finalizada';

                  const isLembreteable = isDateToday && 
                                         statusCalculado === 'confirmada' && 
                                         !consulta.whatsapp_reminder_sent;
                  return (
                    <div
                      key={consulta.id}
                      className="appointment-ticket"
                      style={{ padding: '12px 16px', gap: '14px', border: `1px solid ${deleteConfirmId === consulta.id ? '#fca5a5' : 'var(--border-color)'}`, backgroundColor: deleteConfirmId === consulta.id ? '#fff5f5' : undefined }}
                    >
                      <div className="ticket-date-box" style={{ padding: '8px 12px', minWidth: '64px', backgroundColor: deleteConfirmId === consulta.id ? '#fee2e2' : undefined, borderColor: deleteConfirmId === consulta.id ? '#fca5a5' : undefined }}>
                        <p style={{ fontSize: '0.7rem', color: deleteConfirmId === consulta.id ? '#ef4444' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
                          {format(parseISO(targetDate.replace(' ', 'T')), 'MMM', { locale: ptBR })}
                        </p>
                        <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: deleteConfirmId === consulta.id ? '#ef4444' : 'var(--primary)', lineHeight: 1, margin: '2px 0 0 0' }}>
                          {format(parseISO(targetDate.replace(' ', 'T')), 'dd')}
                        </p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '0.95rem', color: 'var(--text-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', margin: 0 }}>
                          <User size={14} color="var(--accent-gold)" /> {consulta.pacientes?.nome || 'Paciente Desconhecido'}
                          {statusCalculado === 'confirmada' && (
                            <span style={{ fontSize: '0.7rem', color: '#16a34a', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid #bbf7d0', marginLeft: '6px' }}>
                              Confirmada
                            </span>
                          )}
                          {statusCalculado === 'reagendar' && (
                            <span style={{ fontSize: '0.7rem', color: '#d97706', backgroundColor: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid #fde68a', marginLeft: '6px' }}>
                              Reagendar
                            </span>
                          )}
                          {statusCalculado === 'finalizada' && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--primary)', backgroundColor: 'rgba(24,63,46,0.08)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid rgba(24,63,46,0.2)', marginLeft: '6px' }}>
                              Encerrada
                            </span>
                          )}
                          {isTomorrow(targetDate) && (
                            <span style={{ 
                              fontSize: '0.7rem', 
                              color: '#dc2626', 
                              backgroundColor: '#fee2e2', 
                              padding: '1px 6px', 
                              borderRadius: '4px', 
                              fontWeight: 600,
                              border: '1px solid #fca5a5',
                              marginLeft: '6px'
                            }}>
                              Amanhã
                            </span>
                          )}
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', margin: '3px 0 0 0' }}>
                          <Clock size={12} color="var(--primary)" />
                          {targetDate.length > 10 ? format(parseISO(targetDate.replace(' ', 'T')), 'HH:mm') : '--:--'} hs
                        </p>
                      </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {deleteConfirmId === consulta.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(consulta.id)}
                            disabled={deleteLoading}
                            style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}
                          >
                            {deleteLoading ? '...' : '🗑 Excluir'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          {hasWhatsApp && (
                            isLembreteable ? (
                              <button
                                onClick={() => handleSendWhatsApp(consulta, 'lembrete')}
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  fontSize: '0.8rem', 
                                  padding: '6px 12px', 
                                  borderRadius: '8px', 
                                  whiteSpace: 'nowrap',
                                  backgroundColor: '#0284c7',
                                  color: '#fff',
                                  border: 'none',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0369a1'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0284c7'}
                              >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                  <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm1-8h3v2h-5V7h2v5z"/>
                                </svg> Lembrete
                              </button>
                            ) : isConfirmable ? (
                              <button
                                onClick={() => handleSendWhatsApp(consulta, 'confirmacao')}
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  fontSize: '0.8rem', 
                                  padding: '6px 12px', 
                                  borderRadius: '8px', 
                                  whiteSpace: 'nowrap',
                                  backgroundColor: '#25d366',
                                  color: '#fff',
                                  border: 'none',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#128c7e'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#25d366'}
                              >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg> Confirmar
                              </button>
                            ) : null
                          )}
                          <button
                            className="btn-outline"
                            style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', whiteSpace: 'nowrap' }}
                            onClick={() => navigate(`/patients/${consulta.paciente_id}`)}
                          >
                            Ver Perfil
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(consulta.id)}
                            style={{ background: 'none', border: 'none', padding: '5px', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                            title="Excluir consulta"
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fee2e2'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

              {/* Past */}
              {pastConsultas.length > 0 && (
                <>
                  <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    Histórico Recente
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', opacity: 0.7 }}>
                    {pastConsultas.slice(-5).reverse().map(consulta => (
                      <div key={consulta.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', border: `1px solid ${deleteConfirmId === consulta.id ? '#fca5a5' : 'var(--border-color)'}`, borderRadius: '10px', backgroundColor: deleteConfirmId === consulta.id ? '#fff5f5' : 'var(--white)' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: 500, margin: 0 }}>{consulta.pacientes?.nome || 'Paciente Desconhecido'}</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '2px 0 0' }}>
                            {format(parseISO(consulta.data_consulta.replace(' ', 'T')), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {deleteConfirmId === consulta.id ? (
                            <>
                              <button
                                onClick={() => handleDelete(consulta.id)}
                                disabled={deleteLoading}
                                style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                              >
                                {deleteLoading ? '...' : '🗑 Excluir'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                style={{ fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', backgroundColor: 'rgba(197,160,89,0.08)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(197,160,89,0.2)', fontWeight: 600 }}>Realizada</span>
                              <button
                                onClick={() => setDeleteConfirmId(consulta.id)}
                                style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                                title="Excluir"
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fee2e2'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
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
