import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api/auth";

interface LoginForm {
  username: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginForm>({
    username: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 🔹 Limpiar sesión anterior al entrar al login
  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("usuario");
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Autenticación
      const response = await axios.post(`${API_URL}/login`, {
        username: form.username,
        password: form.password
      });

      const token = response.data.access_token;

      // 2. Guardar en localStorage
      localStorage.setItem("token", token);

      // 3. Obtener info del usuario autenticado
      const meResponse = await axios.get(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = meResponse.data;

      // Guardar usuario completo en localStorage para otras vistas
      localStorage.setItem("usuario", JSON.stringify(user));

      // 4. Redireccionar según tipo
      if (user.username === "admin") {
        navigate("/adminpanel");
      } else if (user.verificado && user.username !== "admin") {
        navigate("/inicio");
      } else {
        navigate("/verificate");
      }

    } catch (err: unknown) {
      if (err === 401) {
        setError("Credenciales incorrectas. Verifica tu usuario y contraseña.");
      } else if (err === 403) {
        setError("Cuenta suspendida. Contacta al soporte.");
      } else {
        setError("Error de conexión. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="relative w-full max-w-md">
        {/* Efectos de fondo */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-green-500/10 rounded-3xl blur-xl"></div>
        <div className="absolute -top-4 -left-4 w-20 h-20 bg-gradient-to-r from-yellow-500 to-green-500 rounded-full blur-lg opacity-30"></div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-r from-purple-500 to-red-500 rounded-full blur-lg opacity-20"></div>
        
        {/* Tarjeta principal */}
        <div className="relative bg-gray-900/90 backdrop-blur-lg border border-gray-700/50 shadow-2xl rounded-2xl overflow-hidden">
          {/* Cabecera con patrón de juego */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 border-b border-yellow-500/30">
            <div className="flex items-center justify-center mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">$</span>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
                  BETREF
                </h1>
              </div>
            </div>
            <p className="text-center text-gray-300 text-sm">Plataforma de Apuestas y Referidos</p>
          </div>
          
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-6 text-center text-white">
              Iniciar Sesión
            </h2>
            <p className="text-gray-400 text-center mb-8 text-sm">
              Accede a tu cuenta para comenzar a apostar y ganar recompensas
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Usuario o Correo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="username"
                    placeholder="Ingresa tu usuario o correo"
                    value={form.username}
                    onChange={handleChange}
                    className="w-full pl-10 p-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white placeholder-gray-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    name="password"
                    placeholder="Ingresa tu contraseña"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full pl-10 p-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white placeholder-gray-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-700 rounded bg-gray-800"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                    Recordar sesión
                  </label>
                </div>
                <Link to="/forgot-password" className="text-sm font-medium text-yellow-500 hover:text-yellow-400 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Iniciando sesión...
                  </>
                ) : (
                  "Acceder a la plataforma"
                )}
              </button>

              {/* Enlace de registro mejorado */}
              <div className="mt-6 p-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl">
                <p className="text-center text-gray-300">
                  ¿No tienes cuenta? 
                  <Link to="/register" className="ml-2 font-bold text-yellow-500 hover:text-yellow-400 transition-colors">
                    ¡Regístrate ahora y obtén un bono de bienvenida!
                  </Link>
                </p>
                <p className="text-center text-xs text-gray-500 mt-2">
                  Recibe 100 créditos gratis al registrarte y 10% extra por cada referido
                </p>
              </div>
            </form>

            {error && (
              <div className="mt-6 p-4 bg-red-900/30 border border-red-700/50 text-red-300 rounded-xl flex items-start">
                <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Información adicional de referidos */}
            <div className="mt-8 pt-6 border-t border-gray-800">
              <div className="flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <h3 className="text-lg font-bold text-white">Sistema de Referidos</h3>
              </div>
              <p className="text-center text-sm text-gray-400">
                Invita amigos y gana el <span className="font-bold text-yellow-500">15% de sus apuestas</span> para siempre
              </p>
            </div>
          </div>
        </div>

        {/* Notas legales */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Al iniciar sesión aceptas nuestros{' '}
            <a href="#" className="text-yellow-500 hover:text-yellow-400">Términos y Condiciones</a> y{' '}
            <a href="#" className="text-yellow-500 hover:text-yellow-400">Política de Privacidad</a>
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Juega responsablemente. Prohibido el acceso a menores de 18 años.
          </p>
        </div>
      </div>
    </div>
  );
}