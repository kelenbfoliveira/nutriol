import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

interface Patient {
  id: string;
  nome: string;
}

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patients: Patient[];
}

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ isOpen, onClose, onSuccess, patients }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    paciente_id: '',
    data_consulta: '',
    hora_consulta: '',
    observacoes: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      // Combine date and time
      const datetimeString = `${formData.data_consulta}T${formData.hora_consulta}:00`;

      const { error: insertError } = await supabase
        .from('consultas')
        .insert([
          {
            paciente_id: formData.paciente_id,
            data_consulta: datetimeString,
            observacoes: formData.observacoes
          }
        ]);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao agendar consulta. Verifique a tabela no banco.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: '500px', margin: '20px', padding: '32px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', color: 'var(--text-muted)' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-dark)' }}>Agendar Consulta</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Selecione o paciente e o horário para o atendimento.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Paciente *</label>
            <select 
              name="paciente_id"
              required 
              value={formData.paciente_id} 
              onChange={handleChange}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', backgroundColor: '#faf9f6' }}
            >
              <option value="" disabled>Selecione um paciente...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Data *</label>
              <input type="date" name="data_consulta" required value={formData.data_consulta} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Hora *</label>
              <input type="time" name="hora_consulta" required value={formData.hora_consulta} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea 
              name="observacoes"
              value={formData.observacoes} 
              onChange={handleChange}
              placeholder="Ex: Primeira consulta, trazer exames..."
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', backgroundColor: '#faf9f6', minHeight: '100px', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button type="button" className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Salvando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewAppointmentModal;
