import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { format, differenceInCalendarDays, isBefore } from 'date-fns';
import { getBusinessDaysDifference, formatWhatsAppNumber, parseLocalDateTime } from '../lib/utils';
import { Send, MessageSquare, Check, X, Bell, Loader2 } from 'lucide-react';

interface PendingMessage {
  id: string; // ID da consulta
  pacienteId: string;
  nomePaciente: string;
  whatsapp: string;
  tipo: 'confirmacao' | 'lembrete' | 'pos-consulta';
  dataConsulta: string;
  mensagem: string;
  dbField: 'whatsapp_confirmation_sent' | 'whatsapp_reminder_sent' | 'whatsapp_thankyou_sent';
}

const WhatsAppAutomation: React.FC = () => {
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const webhookUrl = import.meta.env.VITE_WHATSAPP_WEBHOOK_URL || '';

  const checkPendingMessages = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Trava de Concorrência Multi-Aba: evita execuções simultâneas em abas paralelas da nutricionista
      const lastCheck = localStorage.getItem('nutriol_last_whatsapp_check');
      const nowTime = Date.now();
      if (lastCheck && nowTime - parseInt(lastCheck) < 4 * 60 * 1000) {
        return;
      }
      localStorage.setItem('nutriol_last_whatsapp_check', nowTime.toString());

      const now = new Date();
      
      // Busca consultas dos últimos 5 dias e dos próximos 10 dias para abranger todas as regras
      const startRange = new Date();
      startRange.setDate(now.getDate() - 5);
      const endRange = new Date();
      endRange.setDate(now.getDate() + 10);

      const { data: consultas, error } = await supabase
        .from('consultas')
        .select('*, pacientes!inner(id, nome, whatsapp, nutricionista_id)')
        .eq('pacientes.nutricionista_id', session.user.id)
        .gte('data_consulta', startRange.toISOString())
        .lte('data_consulta', endRange.toISOString());

      if (error || !consultas) return;

      const list: PendingMessage[] = [];

      for (const c of consultas) {
        const targetDate = parseLocalDateTime(c.data_consulta);
        const patientName = c.pacientes?.nome || 'Paciente';
        const rawWhatsapp = c.pacientes?.whatsapp || '';
        if (!rawWhatsapp) continue;

        const cleanNumber = formatWhatsAppNumber(rawWhatsapp);
        const formattedDate = format(targetDate, 'dd/MM/yyyy');
        const formattedTime = format(targetDate, 'HH:mm');

        // 1. Confirmação (Exatamente 3 dias úteis antes)
        // Regra: status não confirmado/cancelado/finalizado, e whatsapp_confirmation_sent = false
        const isConfirmable = 
          c.status !== 'confirmada' && 
          c.status !== 'cancelada' && 
          c.status !== 'finalizada' && 
          !c.whatsapp_confirmation_sent;

        if (isConfirmable) {
          const businessDaysDiff = getBusinessDaysDifference(now, targetDate);
          if (businessDaysDiff === 3) {
            const confirmationLink = `${window.location.origin}/confirmar?id=${c.id}`;
            const msg = `Olá, ${patientName}! Gostaria de confirmar sua consulta agendada para o dia ${formattedDate} às ${formattedTime}h. Por favor, confirme sua presença clicando no link a seguir: ${confirmationLink}`;
            list.push({
              id: c.id,
              pacienteId: c.paciente_id,
              nomePaciente: patientName,
              whatsapp: cleanNumber,
              tipo: 'confirmacao',
              dataConsulta: c.data_consulta,
              mensagem: msg,
              dbField: 'whatsapp_confirmation_sent'
            });
            continue; // Evita mandar duas mensagens para a mesma consulta de uma vez
          }
        }

        // 2. Lembrete (Exatamente 1 dia antes)
        // Regra: status confirmado e whatsapp_reminder_sent = false
        const isLembreteable = 
          c.status === 'confirmada' && 
          !c.whatsapp_reminder_sent;

        if (isLembreteable) {
          const calendarDaysDiff = differenceInCalendarDays(targetDate, now);
          if (calendarDaysDiff === 1) {
            const msg = `Olá, ${patientName}! Tudo bem? Passando para lembrar da nossa consulta amanhã, dia ${formattedDate} às ${formattedTime}h. Nos vemos em breve! Abraço.`;
            list.push({
              id: c.id,
              pacienteId: c.paciente_id,
              nomePaciente: patientName,
              whatsapp: cleanNumber,
              tipo: 'lembrete',
              dataConsulta: c.data_consulta,
              mensagem: msg,
              dbField: 'whatsapp_reminder_sent'
            });
            continue;
          }
        }

        // 3. Pós-Consulta (2 horas após o término do atendimento)
        // Regra: finalizada ou com peso, whatsapp_thankyou_sent = false
        const isFinished = (c.status === 'finalizada' || c.peso) && !c.whatsapp_thankyou_sent;
        if (isFinished) {
          // Término = data_consulta + 1h (estimado)
          // Gatilho = término + 2h = data_consulta + 3h
          const triggerTime = new Date(targetDate.getTime() + 3 * 60 * 60 * 1000);
          
          // Se já passou do horário de gatilho, e foi nos últimos 2 dias (para evitar mandar para o passado distante)
          if (isBefore(triggerTime, now) && differenceInCalendarDays(now, targetDate) <= 2) {
            // Busca o plano alimentar mais recente do paciente
            const { data: plano } = await supabase
              .from('planos_alimentares')
              .select('id')
              .eq('paciente_id', c.paciente_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const planLink = plano 
              ? `${window.location.origin}/plano-alimentar?id=${plano.id}`
              : `${window.location.origin}/patients/${c.paciente_id}`;

            const msg = `Olá, ${patientName}! Foi um prazer atender você hoje. Aqui está o seu plano alimentar: ${planLink}. Qualquer dúvida, estou por aqui. Um abraço!`;
            list.push({
              id: c.id,
              pacienteId: c.paciente_id,
              nomePaciente: patientName,
              whatsapp: cleanNumber,
              tipo: 'pos-consulta',
              dataConsulta: c.data_consulta,
              mensagem: msg,
              dbField: 'whatsapp_thankyou_sent'
            });
          }
        }
      }

      setPendingMessages(list);

      // Se houver webhook cadastrado, envia automaticamente as pendentes
      if (webhookUrl && list.length > 0) {
        for (const msg of list) {
          await triggerWebhook(msg);
          // Atraso artificial de 2 segundos para evitar rate limit ou bloqueio por spam no WhatsApp
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

    } catch (err) {
      console.error('Erro na verificação da automação de WhatsApp:', err);
    }
  }, [webhookUrl]);

  // Executa a checagem ao montar o componente e a cada 5 minutos
  useEffect(() => {
    checkPendingMessages();
    const interval = setInterval(checkPendingMessages, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkPendingMessages]);

  const triggerWebhook = async (msg: PendingMessage) => {
    const processId = msg.id + '-' + msg.tipo;
    try {
      setProcessingId(processId);
      
      // 1. Atualização otimista no banco de dados para bloquear concorrência imediatamente
      const updatePayload = { [msg.dbField]: true };
      const { error: dbError } = await supabase.from('consultas').update(updatePayload).eq('id', msg.id);
      if (dbError) throw new Error('Falha na trava de segurança do banco: ' + dbError.message);

      // 2. Disparo do webhook HTTP
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: msg.whatsapp,
          message: msg.mensagem,
          type: msg.tipo,
          patientName: msg.nomePaciente,
          appointmentId: msg.id
        })
      });

      if (!response.ok) {
        // Em caso de erro, reverte a flag no banco de dados
        const revertPayload = { [msg.dbField]: false };
        await supabase.from('consultas').update(revertPayload).eq('id', msg.id);
        throw new Error(`Falha ao enviar webhook (status ${response.status}).`);
      }

      setSuccessToast(`Mensagem de ${msg.tipo === 'confirmacao' ? 'confirmação' : msg.tipo === 'lembrete' ? 'lembrete' : 'pós-consulta'} enviada para ${msg.nomePaciente}!`);
      setTimeout(() => setSuccessToast(null), 5000);

      // Recarrega as pendentes
      setPendingMessages(prev => prev.filter(item => !(item.id === msg.id && item.tipo === msg.tipo)));
    } catch (err) {
      console.error('Erro ao disparar webhook de WhatsApp:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleManualSend = async (msg: PendingMessage) => {
    try {
      setProcessingId(msg.id + '-' + msg.tipo);

      // Abre o link do WhatsApp Web
      const url = `https://api.whatsapp.com/send?phone=${msg.whatsapp}&text=${encodeURIComponent(msg.mensagem)}`;
      window.open(url, '_blank');

      // Atualiza no banco que foi enviado
      const updatePayload = { [msg.dbField]: true };
      const { error } = await supabase
        .from('consultas')
        .update(updatePayload)
        .eq('id', msg.id);

      if (error) throw error;

      setSuccessToast(`Mensagem enviada via link direto e status atualizado para ${msg.nomePaciente}.`);
      setTimeout(() => setSuccessToast(null), 4000);

      // Recarrega as pendentes
      setPendingMessages(prev => prev.filter(item => !(item.id === msg.id && item.tipo === msg.tipo)));
    } catch (err) {
      console.error('Erro ao marcar consulta como enviada:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (pendingMessages.length === 0) return null;

  // Se o webhook estiver ativo, roda de forma 100% invisível em background
  if (webhookUrl) {
    return (
      <>
        {successToast && (
          <div className="whatsapp-toast-fixed">
            <Check size={18} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{successToast}</span>
          </div>
        )}
      </>
    );
  }

  // Se for assistido, exibe o painel flutuante
  return (
    <div className="whatsapp-automation-fixed">
      {/* Floating Badge Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(24, 63, 46, 0.25)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Bell size={24} className="animate-bounce" />
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#ef4444',
            color: '#fff',
            borderRadius: '50%',
            width: '22px',
            height: '22px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff'
          }}>
            {pendingMessages.length}
          </span>
        </button>
      )}

      {/* Floating Panel */}
      {isOpen && (
        <div className="glass-card fade-in" style={{
          width: '350px',
          maxHeight: '450px',
          padding: '20px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--glass-border)',
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={16} color="var(--primary)" /> Mensagens Pendentes
            </h4>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}>
              <X size={16} />
            </button>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {pendingMessages.map(msg => {
              const isProcessing = processingId === (msg.id + '-' + msg.tipo);
              const formattedDate = format(parseLocalDateTime(msg.dataConsulta), "dd/MM 'às' HH:mm");
              return (
                <div 
                  key={msg.id + '-' + msg.tipo}
                  style={{
                    backgroundColor: '#faf9f6',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h5 style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-dark)', fontWeight: 600 }}>{msg.nomePaciente}</h5>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Consulta: {formattedDate}
                      </p>
                    </div>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      backgroundColor: msg.tipo === 'confirmacao' ? '#dcfce7' : msg.tipo === 'lembrete' ? '#e0f2fe' : '#fef3c7',
                      color: msg.tipo === 'confirmacao' ? '#16a34a' : msg.tipo === 'lembrete' ? '#0369a1' : '#d97706',
                      border: `1px solid ${msg.tipo === 'confirmacao' ? '#bbf7d0' : msg.tipo === 'lembrete' ? '#bae6fd' : '#fde68a'}`
                    }}>
                      {msg.tipo === 'confirmacao' ? 'Confirmação' : msg.tipo === 'lembrete' ? 'Lembrete' : 'Pós-Consulta'}
                    </span>
                  </div>

                  <p style={{
                    margin: 0,
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    backgroundColor: '#fff',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #f3f4f6',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.4
                  }}>
                    {msg.mensagem}
                  </p>

                  <button
                    onClick={() => handleManualSend(msg)}
                    disabled={isProcessing}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#25d366',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#128c7e'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#25d366'}
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>
                        <Send size={12} /> Enviar WhatsApp
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Success Toast */}
      {successToast && (
        <div className="whatsapp-toast-fixed">
          <Check size={18} />
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{successToast}</span>
        </div>
      )}
    </div>
  );
};

export default WhatsAppAutomation;
