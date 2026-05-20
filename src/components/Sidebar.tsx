import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Apple, 
  Settings, 
  LogOut 
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo-text" style={{ textAlign: 'center', marginTop: '12px' }}>
          Nutri<span>Ol</span>
        </h1>
      </div>
      
      <nav style={{ flex: 1 }}>
        <ul className="nav-list">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard />
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/patients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users />
              Pacientes
            </NavLink>
          </li>
          <li>
            <NavLink to="/appointments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Calendar />
              Agenda
            </NavLink>
          </li>
          <li>
            <NavLink to="/meal-plans" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Apple />
              Planos Alimentares
            </NavLink>
          </li>
        </ul>
      </nav>

      <div style={{ padding: '0 16px', marginTop: 'auto' }}>
        <ul className="nav-list">
          <li>
            <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings />
              Configurações
            </NavLink>
          </li>
          <li>
            <button onClick={handleLogout} className="nav-item" style={{ width: '100%', textAlign: 'left', background: 'none' }}>
              <LogOut />
              Sair
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
