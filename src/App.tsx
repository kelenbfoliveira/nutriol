import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PatientsList from './pages/PatientsList';
import PatientDetails from './pages/PatientDetails';
import NewPatient from './pages/NewPatient';
import Appointments from './pages/Appointments';
import MealPlans from './pages/MealPlans';
import ConfirmAppointment from './pages/ConfirmAppointment';
import ViewMealPlan from './pages/ViewMealPlan';
import Layout from './components/Layout';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/confirmar" element={<ConfirmAppointment />} />
        <Route path="/plano-alimentar" element={<ViewMealPlan />} />
        
        {/* Protected Routes Wrapper */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patients" element={<PatientsList />} />
          <Route path="/patients/new" element={<NewPatient />} />
          <Route path="/patients/:id" element={<PatientDetails />} />
          <Route path="/patients/:id/edit" element={<NewPatient />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/meal-plans" element={<MealPlans />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
