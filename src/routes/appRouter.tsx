import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Login from '../pages/login';
import Register from '../pages/register';
import Verificate from '../pages/verificate';
import Inicio from '../pages/inicio';
import AdminPanel from '../pages/adminpanel';
import Referidos from '../pages/referidos';
import SorteoVIP from '../pages/sorteoVIP';
import Ruleta from '../pages/ruleta';
import Juegos from '../pages/juegos';
import Dados from '../pages/dados';
import Tragamonedas from '../pages/tragamones';
import Blackjack from '../pages/blackjack';
import Minas from '../pages/minas';
import Deposito from '../components/deposito';
import Retiro from '../components/retiro';

interface Usuario {
  id: number;
  username: string;
  saldo: number;
  verificado: boolean;
}

const AppRouter = () => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [mensaje, setMensaje] = useState<{ text: string; type?: "info" | "success" | "error" } | null>(null);
  const navigate = useNavigate();

  const showMsg = (text: string, type: "info" | "success" | "error" = "info") => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 5000);
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUsuario(null);
    showMsg("Sesión cerrada correctamente", "success");
    setTimeout(() => {
      navigate('/login');
    }, 1500);
  };

  return (
    <>
      {mensaje && (
        <div style={{ textAlign: 'center', padding: '0.5rem', background: '#d4edda', color: '#155724' }}>
          {mensaje.text}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verificate" element={<Verificate />} />
        <Route path="/inicio" element={<Inicio />} />

        {/* Admin */}
        <Route path="/adminpanel" element={<AdminPanel />} />
        <Route path="/adminpanel/usuarios" element={<AdminPanel />} />
        <Route path="/adminpanel/verificaciones" element={<AdminPanel />} />
        <Route path="/transacciones/admin/depositos/pendientes" element={<AdminPanel />} />
        <Route path="/adminpanel/retiros" element={<AdminPanel />} />

        {/* Usuario verificado */}
        <Route path="/sorteovip" element={<SorteoVIP />} />

        {/* Juegos */}
        <Route path="/juegos" element={<Juegos/>} />
        <Route path="/juegos/ruleta" element={<Ruleta />} />
        <Route path="/juegos/dados" element={<Dados />} />
        <Route path="/juegos/tragamonedas" element={<Tragamonedas />} />
        <Route path="/juegos/blackjack" element={<Blackjack />} />
        <Route path="/juegos/minas" element={<Minas />} />
        <Route path="/transacciones/deposito" element={<Deposito usuario={usuario} cerrarSesion={cerrarSesion} setUsuario={setUsuario} />} />
        <Route path="/transacciones/retiro" element={<Retiro usuario={usuario} cerrarSesion={cerrarSesion} setUsuario={setUsuario} />} />
        <Route path="/referidos" element={<Referidos usuario={usuario} cerrarSesion={cerrarSesion} setUsuario={setUsuario}/>} />
        <Route path="/transacciones/admin/depositos/pendientes" element={<AdminPanel />} />
        <Route path="/transacciones/admin/depositos/:depositoId/aprobar" element={<AdminPanel />} />
        <Route path="/transacciones/admin/depositos/:depositoId/rechazar" element={<AdminPanel />} />
        <Route path="/transacciones/admin/retiros/pendientes" element={<AdminPanel />} />
        <Route path="/transacciones/admin/retiros/:retiroId/aprobar" element={<AdminPanel />} />
        <Route path="/transacciones/admin/retiros/:retiroId/rechazar" element={<AdminPanel />} />
        

        {/* Fallback */}
        <Route path="*" element={<Login />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AppRouter />
    </Router>
  );
};

export default App;
