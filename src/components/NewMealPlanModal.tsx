import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

interface Patient {
  id: string;
  nome: string;
}

interface NewMealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patients: Patient[];
}

const createEmptyPlan = () => {
  const emptyDay = () => ({
    cafe_manha: ['', '', '', '', ''],
    lanche_manha: ['', '', '', '', ''],
    almoco: ['', '', '', '', ''],
    lanche_tarde: ['', '', '', '', ''],
    jantar: ['', '', '', '', '']
  });

  return {
    dias: {
      segunda: emptyDay(),
      terca: emptyDay(),
      quarta: emptyDay(),
      quinta: emptyDay(),
      sexta: emptyDay(),
      sabado: emptyDay(),
      domingo: emptyDay()
    }
  };
};

const NewMealPlanModal: React.FC<NewMealPlanModalProps> = ({ isOpen, onClose, onSuccess, patients }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    paciente_id: '',
    titulo: '',
    descricao: ''
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

      const { error: insertError } = await supabase
        .from('planos_alimentares')
        .insert([
          {
            paciente_id: formData.paciente_id,
            titulo: formData.titulo,
            descricao: formData.descricao,
            conteudo: createEmptyPlan()
          }
        ]);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao criar plano alimentar. Verifique a tabela no banco.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: '600px', margin: '20px', padding: '32px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', color: 'var(--text-muted)' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-dark)' }}>Novo Plano Alimentar</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Crie um plano alimentar básico para o seu paciente.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Paciente *</label>
            <select name="paciente_id" required value={formData.paciente_id} onChange={handleChange} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', backgroundColor: '#faf9f6' }}>
              <option value="" disabled>Selecione um paciente...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Título do Plano *</label>
            <input type="text" name="titulo" required value={formData.titulo} onChange={handleChange} placeholder="Ex: Dieta de Hipertrofia - Verão" />
          </div>

          <div className="form-group">
            <label className="form-label">Descrição / Orientações</label>
            <textarea name="descricao" value={formData.descricao} onChange={handleChange} placeholder="Orientações gerais, substituições, etc." style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', backgroundColor: '#faf9f6', minHeight: '150px', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button type="button" className="btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>{loading ? 'Salvando...' : 'Criar Plano'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewMealPlanModal;
