import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Header from "../components/header";
import Footer from "../components/footer";
import { API_URL } from "../api/auth";

interface Usuario {
  id: number;
  username: string;
  saldo: number;
  verificado: boolean;
  nivel?: string;
  verificado_pendiente?: boolean;
}

const Inicio: React.FC = () => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

  const [stats] = useState({
    usuariosActivos: 12847,
    dineroMovido: 25600000,
    premiosEntregados: 156,
    satisfaccion: 98.7,
    retirosDiarios: 425,
    comisionesPagadas: 1250000,
  });

  // Ajusta si quieres que el Home sea “una vitrina” de inversión
  const tasaAnualInversion = 300; // 300%

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 5000);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios
        .get(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          const userData = res.data;
          setUsuario({
            id: userData.id,
            username: userData.username,
            saldo: userData.saldo,
            verificado: userData.verificado,
            nivel: userData.nivel,
            verificado_pendiente: userData.verificado_pendiente,
          });
          localStorage.setItem("usuario", JSON.stringify(userData));
          setLoading(false);
        })
        .catch(() => {
          setUsuario(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("comprobante_enviado");
    localStorage.removeItem("intentos_envio_comprobante");
    localStorage.removeItem("ultimo_intento_envio_comprobante");
    localStorage.removeItem("comprobante_verificado");
    localStorage.removeItem("verificacion_pendiente");
    localStorage.removeItem("monto_deposito_inicial");
    localStorage.removeItem("bono_deposito_inicial");
    localStorage.removeItem("deposito_inicial_realizado");
    localStorage.removeItem("fecha_deposito_inicial");
    localStorage.removeItem("ultimo_retiro");
    localStorage.removeItem("retiro_pendiente");
    localStorage.removeItem("ultimo_bono_referidos");
    localStorage.removeItem("paso_verificacion");
    localStorage.removeItem("ultimo_usuario_id");
    localStorage.removeItem("fecha_envio_comprobante");

    setUsuario(null);
    showMsg("Sesión cerrada correctamente", "success");
  };

  // Mini calculadora para home (proyección simple)
  const calcularGananciaDiaria = (monto: number) => (monto * tasaAnualInversion) / (365 * 100);
  const ejemploMonto = 100000;

  const proyeccion = useMemo(() => {
    const diaria = calcularGananciaDiaria(ejemploMonto);
    const mensual = diaria * 30;
    const anual = ejemploMonto * (tasaAnualInversion / 100);
    return { diaria, mensual, anual };
  }, [tasaAnualInversion]);

  const testimonios = [
    {
      nombre: "Carlos M.",
      mensaje: "Con Inversiones empecé con $100.000 y ver el interés crecer en tiempo real motiva bastante.",
      ganancia: "Interés diario",
      nivel: "PLATINO",
      tiempo: "Miembro desde hace 6 meses",
      foco: "INVERSIONES",
    },
    {
      nombre: "Ana R.",
      mensaje: "Invierto y además gano extra con referidos. Es como duplicar oportunidades.",
      ganancia: "Comisiones",
      nivel: "ORO",
      tiempo: "Miembro desde hace 3 meses",
      foco: "REFERIDOS",
    },
    {
      nombre: "Miguel S.",
      mensaje: "La combinación de invertir y participar en el Sorteo VIP me gusta: crecimiento + premios.",
      ganancia: "Retiró y reinvirtió",
      nivel: "DIAMANTE",
      tiempo: "Miembro desde hace 1 año",
      foco: "INVERSIONES",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-xl font-bold">Cargando plataforma...</p>
        </div>
      </div>
    );
  }

  const renderCtaPrincipal = () => {
    if (!usuario) {
      return (
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/register"
            className="group bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-teal-500/25 flex items-center space-x-3"
          >
            <span>💰</span>
            <span>Crear cuenta y empezar a invertir</span>
            <span className="group-hover:translate-x-2 transition-transform">→</span>
          </Link>

          <Link
            to="/login"
            className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center space-x-3"
          >
            <span>🔑</span>
            <span>Iniciar sesión</span>
            <span className="group-hover:translate-x-2 transition-transform">→</span>
          </Link>
        </div>
      );
    }

    // Usuario logueado pero no verificado
    if (!usuario.verificado && !usuario.verificado_pendiente) {
      return (
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <Link
            to="/verificate"
            className="group bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/25 flex items-center space-x-3"
          >
            <span>✅</span>
            <span>Verificar cuenta para activar Inversiones</span>
            <span className="group-hover:translate-x-2 transition-transform">→</span>
          </Link>

          <Link
            to="/juegos"
            className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center space-x-3"
          >
            <span>🎮</span>
            <span>Ir a juegos</span>
            <span className="group-hover:translate-x-2 transition-transform">→</span>
          </Link>
        </div>
      );
    }

    if (usuario.verificado_pendiente) {
      return (
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 px-8 py-4 rounded-2xl inline-block">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-300 font-bold">⏳ Verificación en proceso... (Inversiones se activarán al aprobar)</span>
          </div>
        </div>
      );
    }

    // Usuario verificado: CTA principal hacia inversiones
    return (
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Link
          to="/inversion"
          className="group bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-teal-500/25 flex items-center space-x-3"
        >
          <span>🚀</span>
          <span>Ir a Inversiones (300% anual)</span>
          <span className="group-hover:translate-x-2 transition-transform">→</span>
        </Link>

        <Link
          to="/sorteovip"
          className="group bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/25 flex items-center space-x-3"
        >
          <span>🎰</span>
          <span>Sorteo VIP</span>
          <span className="group-hover:translate-x-2 transition-transform">→</span>
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Notificación */}
      {mensaje && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center space-x-3 shadow-2xl animate-slideIn ${
            mensaje.type === "success"
              ? "bg-gradient-to-r from-green-900/90 to-green-800/90 border border-green-500/50 text-green-200"
              : mensaje.type === "error"
              ? "bg-gradient-to-r from-red-900/90 to-red-800/90 border border-red-500/50 text-red-200"
              : "bg-gradient-to-r from-blue-900/90 to-blue-800/90 border border-blue-500/50 text-blue-200"
          }`}
        >
          <span className="text-xl">{mensaje.type === "success" ? "✅" : mensaje.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{mensaje.text}</span>
        </div>
      )}

      <Header usuario={usuario} cerrarSesion={cerrarSesion} setUsuario={setUsuario} />

      {/* HERO — Enfocado en inversiones */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-green-500/10"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-teal-500 to-green-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl opacity-20"></div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-block mb-6">
              <span className="px-4 py-2 bg-gradient-to-r from-teal-600/20 to-green-600/20 border border-teal-500/30 rounded-full text-sm font-bold text-teal-300">
                💰 Inversiones con interés en tiempo real
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-teal-300 via-green-300 to-blue-300 bg-clip-text text-transparent animate-gradient">
                Haz crecer tu dinero
              </span>
              <br />
              <span className="text-white">
                con {tasaAnualInversion}% de interés anual
              </span>
            </h1>

            <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
              Invierte, mira tu interés acumularse y retira cuando corresponda:
              <span className="text-teal-300 font-bold"> intereses cada 30 días</span> y
              <span className="text-blue-300 font-bold"> capital a los 6 meses</span>.
              Además, potencia tus ganancias con juegos, referidos y Sorteo VIP.
            </p>

            {renderCtaPrincipal()}

            {/* Mini panel: saldo + proyección */}
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-2">📌 Proyección rápida</h3>
                <p className="text-gray-400 mb-4">Ejemplo con ${ejemploMonto.toLocaleString()}</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Ganancia diaria</span>
                    <span className="text-teal-300 font-bold">${proyeccion.diaria.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Ganancia mensual (30d)</span>
                    <span className="text-green-300 font-bold">${proyeccion.mensual.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Ganancia anual</span>
                    <span className="text-yellow-300 font-bold">${proyeccion.anual.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  *Cálculo estimado basado en {tasaAnualInversion}% anual.
                </div>
              </div>

              <div className="bg-gradient-to-br from-teal-900/30 to-green-900/30 backdrop-blur-sm rounded-2xl p-6 border border-teal-500/20">
                <h3 className="text-xl font-bold text-white mb-3">✅ Ventajas de Inversiones</h3>
                <ul className="space-y-2 text-gray-200">
                  <li className="flex items-start"><span className="mr-2 text-teal-300">✓</span> Interés acumulándose en tiempo real</li>
                  <li className="flex items-start"><span className="mr-2 text-teal-300">✓</span> Retiro de intereses cada 30 días</li>
                  <li className="flex items-start"><span className="mr-2 text-teal-300">✓</span> Retiro de capital a los 180 días</li>
                  <li className="flex items-start"><span className="mr-2 text-teal-300">✓</span> Depósitos ilimitados</li>
                </ul>

                <div className="mt-5">
                  <Link
                    to="/inversion"
                    className="inline-block w-full text-center bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-[1.01]"
                  >
                    Ver Inversiones
                  </Link>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
                <h3 className="text-xl font-bold text-white mb-3">👤 Tu estado</h3>
                {usuario ? (
                  <>
                    <div className="text-gray-300">Usuario: <span className="text-white font-bold">{usuario.username}</span></div>
                    <div className="text-gray-300 mt-2">
                      Saldo: <span className="text-teal-300 font-bold">${usuario.saldo.toLocaleString()}</span>
                    </div>
                    <div className="mt-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${
                          usuario.verificado
                            ? "bg-green-900/40 text-green-300 border border-green-500/30"
                            : "bg-yellow-900/40 text-yellow-300 border border-yellow-500/30"
                        }`}
                      >
                        {usuario.verificado ? "Cuenta verificada" : "Cuenta sin verificar"}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Link
                        to="/referidos"
                        className="text-center bg-gradient-to-r from-yellow-600 to-amber-600 hover:opacity-90 text-white px-4 py-3 rounded-xl font-bold"
                      >
                        👥 Referidos
                      </Link>
                      <Link
                        to="/juegos"
                        className="text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white px-4 py-3 rounded-xl font-bold"
                      >
                        🎮 Juegos
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-300 mb-4">
                      Inicia sesión para ver tu saldo, estado de verificación y acceder a Inversiones.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to="/login"
                        className="text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white px-4 py-3 rounded-xl font-bold"
                      >
                        Iniciar sesión
                      </Link>
                      <Link
                        to="/register"
                        className="text-center bg-gradient-to-r from-teal-600 to-green-600 hover:opacity-90 text-white px-4 py-3 rounded-xl font-bold"
                      >
                        Registrarme
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stats mini (mantienes credibilidad social) */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-white">{stats.usuariosActivos.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Usuarios activos</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-white">${(stats.dineroMovido / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-gray-400">Dinero movido</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-white">{stats.retirosDiarios}+</div>
                <div className="text-sm text-gray-400">Retiros diarios</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-white">${(stats.comisionesPagadas / 1000).toFixed(0)}K</div>
                <div className="text-sm text-gray-400">Comisiones pagadas</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección: Ecosistema (Inversiones principal, lo demás acompaña) */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">🧩 Todo trabaja para que ganes más</h2>
          <p className="text-gray-400 max-w-3xl mx-auto">
            La inversión es el corazón de la plataforma. Y para potenciar resultados, tienes juegos, referidos y Sorteo VIP.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Link
            to="/inversion"
            className="lg:col-span-2 bg-gradient-to-br from-teal-900/35 to-green-900/25 rounded-2xl p-7 border border-teal-500/25 hover:border-teal-500/50 transition-all duration-300 hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-xl flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <span className="px-3 py-1 bg-teal-900/40 text-teal-200 rounded-full text-sm font-bold border border-teal-500/20">
                PRINCIPAL
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Inversiones {tasaAnualInversion}% anual</h3>
            <p className="text-gray-300 mb-4">
              Interés acumulado en tiempo real. Retira intereses cada 30 días y capital a los 6 meses.
            </p>
            <div className="text-teal-200 font-bold">Entrar a Inversiones →</div>
          </Link>

          <Link
            to="/juegos"
            className="bg-gradient-to-br from-blue-900/30 to-purple-900/25 rounded-2xl p-7 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
              <span className="text-xl">🎮</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Juegos</h3>
            <p className="text-gray-300">Gana premios y complementa tus ganancias mientras inviertes.</p>
          </Link>

          <Link
            to="/referidos"
            className="bg-gradient-to-br from-yellow-900/25 to-amber-900/20 rounded-2xl p-7 border border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center mb-4">
              <span className="text-xl">👥</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Referidos</h3>
            <p className="text-gray-300">Invita amigos y recibe comisiones. Más red, más ingresos.</p>
          </Link>
        </div>

        <div className="mt-6">
          <Link
            to="/sorteovip"
            className="block bg-gradient-to-r from-yellow-600/15 to-green-600/15 border border-yellow-500/25 rounded-2xl p-6 hover:border-yellow-500/45 transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold text-white">🎰 Sorteo VIP</h3>
                <p className="text-gray-300">
                  Participa por premios exclusivos. Ideal para usuarios activos que invierten y juegan.
                </p>
              </div>
              <div className="text-yellow-300 font-bold">Ir al Sorteo VIP →</div>
            </div>
          </Link>
        </div>
      </section>

      {/* Testimonios (orientados a inversiones) */}
      <section className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-sm border-y border-gray-700/50">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">💬 Historias de usuarios</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Usuarios que empezaron por Inversiones y luego sumaron referidos, juegos y Sorteo VIP.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonios.map((t, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-teal-500/25 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h4 className="text-xl font-bold text-white">{t.nombre}</h4>
                    <p className="text-sm text-gray-400">{t.tiempo}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      t.foco === "INVERSIONES"
                        ? "bg-teal-900/40 text-teal-200 border border-teal-500/20"
                        : t.foco === "REFERIDOS"
                        ? "bg-yellow-900/40 text-yellow-200 border border-yellow-500/20"
                        : "bg-blue-900/40 text-blue-200 border border-blue-500/20"
                    }`}
                  >
                    {t.foco}
                  </span>
                </div>

                <p className="text-gray-300 italic mb-6">"{t.mensaje}"</p>

                <div className="pt-5 border-t border-gray-700/50">
                  <p className="text-sm text-gray-400">Resultado</p>
                  <p className="text-2xl font-bold text-white">{t.ganancia}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA final */}
          <div className="mt-16 bg-gradient-to-r from-teal-600/20 to-green-600/20 border border-teal-500/25 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Empieza por Inversiones</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Si quieres crecimiento constante, la mejor puerta de entrada es Inversiones.
              Luego potencia tus resultados con referidos, juegos y Sorteo VIP.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/inversion"
                className="bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
              >
                💰 Ir a Inversiones
              </Link>
              <Link
                to="/referidos"
                className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
              >
                👥 Ver Referidos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Inicio;
