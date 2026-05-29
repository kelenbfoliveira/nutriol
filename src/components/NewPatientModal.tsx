import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';
import { formatPhoneNumber } from '../lib/utils';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewPatientModal: React.FC<NewPatientModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    data_nascimento: '',
    sexo: '',
    objetivo_texto: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    if (name === 'whatsapp') {
      value = formatPhoneNumber(value);
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      const { error: insertError } = await supabase
        .from('pacientes')
        .insert([
          {
            ...formData,
            nutricionista_id: session.user.id,
            data_nascimento: formData.data_nascimento || null
          }
        ]);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao cadastrar paciente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: '500px', margin: '20px', padding: '32px', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', color: 'var(--text-muted)' }}
        >
          <X size={24} />
        </button>
        
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-dark)' }}>Novo Paciente</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Preencha os dados básicos para cadastrar um novo paciente.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input 
              type="text" 
              name="nome"
              required 
              value={formData.nome} 
              onChange={handleChange}
              placeholder="Ex: João da Silva"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input 
                type="text" 
                name="whatsapp"
                value={formData.whatsapp} 
                onChange={handleChange}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Data de Nascimento</label>
              <input 
                type="date" 
                name="data_nascimento"
                value={formData.data_nascimento} 
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              name="email"
              value={formData.email} 
              onChange={handleChange}
              placeholder="joao@email.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Objetivo Principal</label>
            <input 
              type="text" 
              name="objetivo_texto"
              value={formData.objetivo_texto} 
              onChange={handleChange}
              placeholder="Ex: Emagrecimento, Hipertrofia..."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button 
              type="button" 
              className="btn-outline" 
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPatientModal;
