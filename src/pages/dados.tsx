// src/pages/dados.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import Header from '../components/header'; // Añadir esta línea
import Footer from '../components/footer'; // Añadir esta línea
import { API_URL } from "../api/auth";

interface Usuario {
  id: number;
  username: string;
  saldo: number;
  verificado: boolean;
  nivel?: string;
  verificado_pendiente?: boolean;
}

interface HistorialGiro {
  id: number;
  dados: [number, number];
  ganancia: number;
  fecha: string;
  apuesta: number;
  tipo: string;
}

export default function Dados() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [girando, setGirando] = useState(false);
  const [dados, setDados] = useState<[number, number]>([1, 1]);
  const [resultadoText, setResultadoText] = useState<string | null>(null);
  const [gananciaMostrar, setGananciaMostrar] = useState<number | null>(null);
  const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(500);
  const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([100, 500, 1000, 2000, 5000]);
  const [multiplicadores, setMultiplicadores] = useState<any>({ doble_6: 10, doble_otro: 5 });
  const [historial, setHistorial] = useState<HistorialGiro[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    totalTiradas: 0,
    gananciaTotal: 0,
    gastoTotal: 0,
    balance: 0,
    doblesObtenidos: 0
  });
  const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({
    totalTiradasAcum: 0,
    gananciaTotalAcum: 0,
    gastoTotalAcum: 0,
    doblesObtenidosAcum: 0
  });
  const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

  // Obtener usuario al cargar
  useEffect(() => {
    console.log('Usuario en Referidos:', usuario);
    axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then((res) => {
        const userData = res.data;
        setUsuario({
          id: userData.id,
          username: userData.username,
          saldo: userData.saldo,
          verificado: userData.verificado,
          nivel: userData.nivel,
          verificado_pendiente: userData.verificado_pendiente
        });
        localStorage.setItem("usuario", JSON.stringify(userData));
      })
      .catch(() => {
        setUsuario(null);
      });

    if (!usuario) {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate('/login');
        return;
      }
      // Si hay token pero usuario es null, intenta cargarlo desde localStorage
      const usuarioGuardado = localStorage.getItem('usuario');
      if (usuarioGuardado) {
        try {
          const usuarioParsed = JSON.parse(usuarioGuardado);
          setUsuario(usuarioParsed);
          console.log('Usuario cargado desde localStorage:', usuarioParsed);
        } catch (error) {
          console.error('Error al parsear usuario:', error);
        }
      }
    }
  }, [navigate, usuario, setUsuario]);

  // Cargar configuración del juego
  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const res = await axios.get(`${API_URL}/juegos/dados/juego/dados/apuestas-permitidas`);
        setApuestasPermitidas(res.data.apuestas_permitidas);
        setMultiplicadores(res.data.multiplicadores);
        setApuestaSeleccionada(res.data.apuestas_permitidas[1] || 500);
      } catch (error) {
        console.error("Error al cargar configuración:", error);
      }
    };

    cargarConfiguracion();
  }, []);

  // Cargar historial y estadísticas del localStorage
  useEffect(() => {
    // Cargar historial de últimos 10 tiradas
    const historialGuardado = localStorage.getItem('historial_dados');
    if (historialGuardado) {
      const historialParsed = JSON.parse(historialGuardado);
      setHistorial(historialParsed);
    }

    // Cargar estadísticas acumulativas
    const statsAcum = localStorage.getItem("estadisticas_acumulativas_dados");
    if (statsAcum) {
      const parsedStats = JSON.parse(statsAcum);
      setEstadisticasAcumulativas(parsedStats);

      // Calcular estadísticas iniciales basadas en las acumulativas
      const balance = parsedStats.gananciaTotalAcum - parsedStats.gastoTotalAcum;
      setEstadisticas({
        totalTiradas: parsedStats.totalTiradasAcum,
        gananciaTotal: parsedStats.gananciaTotalAcum,
        gastoTotal: parsedStats.gastoTotalAcum,
        balance: balance,
        doblesObtenidos: parsedStats.doblesObtenidosAcum
      });
    }
  }, []);

  // Guardar historial en localStorage
  useEffect(() => {
    if (historial.length > 0) {
      localStorage.setItem('historial_dados', JSON.stringify(historial.slice(0, 10)));
    }
  }, [historial]);

  // Guardar estadísticas acumulativas en localStorage
  useEffect(() => {
    if (estadisticasAcumulativas.totalTiradasAcum > 0) {
      localStorage.setItem("estadisticas_acumulativas_dados", JSON.stringify(estadisticasAcumulativas));
    }
  }, [estadisticasAcumulativas]);

  const actualizarEstadisticas = (nuevoGiro: HistorialGiro) => {
    const esDoble = nuevoGiro.tipo === 'doble_6' || nuevoGiro.tipo === 'doble_otro';

    // Actualizar estadísticas acumulativas
    setEstadisticasAcumulativas(prev => {
      const nuevoTotalTiradas = prev.totalTiradasAcum + 1;
      const nuevaGananciaTotal = prev.gananciaTotalAcum + (nuevoGiro.ganancia || 0);
      const nuevoGastoTotal = prev.gastoTotalAcum + nuevoGiro.apuesta;
      const nuevosDoblesObtenidos = prev.doblesObtenidosAcum + (esDoble ? 1 : 0);

      return {
        totalTiradasAcum: nuevoTotalTiradas,
        gananciaTotalAcum: nuevaGananciaTotal,
        gastoTotalAcum: nuevoGastoTotal,
        doblesObtenidosAcum: nuevosDoblesObtenidos
      };
    });

    // Actualizar estadísticas visibles
    setEstadisticas(prev => {
      const nuevoTotalTiradas = prev.totalTiradas + 1;
      const nuevaGananciaTotal = prev.gananciaTotal + (nuevoGiro.ganancia || 0);
      const nuevoGastoTotal = prev.gastoTotal + nuevoGiro.apuesta;
      const nuevosDoblesObtenidos = prev.doblesObtenidos + (esDoble ? 1 : 0);
      const nuevoBalance = nuevaGananciaTotal - nuevoGastoTotal;

      return {
        totalTiradas: nuevoTotalTiradas,
        gananciaTotal: nuevaGananciaTotal,
        gastoTotal: nuevoGastoTotal,
        balance: nuevoBalance,
        doblesObtenidos: nuevosDoblesObtenidos
      };
    });
  };

  const agregarAlHistorial = (dados: [number, number], ganancia: number, apuesta: number, tipo: string) => {
    const nuevoGiro: HistorialGiro = {
      id: Date.now(),
      dados,
      ganancia,
      apuesta,
      tipo,
      fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Agregar al historial (máximo 10 registros)
    const nuevoHistorial = [nuevoGiro, ...historial.slice(0, 9)];
    setHistorial(nuevoHistorial);

    // Actualizar estadísticas
    actualizarEstadisticas(nuevoGiro);
  };

  const animarConfetti = (tipo: string) => {
    if (tipo === "doble_6") {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    } else if (tipo === "doble_otro") {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }
  };

  const lanzarDados = async () => {
    if (!usuario) {
      setMensaje("Debes iniciar sesión para jugar.");
      return;
    }
    if (girando) return;
    if (usuario.saldo < apuestaSeleccionada) {
      setMensaje("Saldo insuficiente para apostar.");
      return;
    }

    setMensaje(null);
    setResultadoText(null);
    setGananciaMostrar(null);
    setGirando(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/dados/juego/dados?apuesta=${apuestaSeleccionada}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const dado1 = res.data?.dado1 ?? 1;
      const dado2 = res.data?.dado2 ?? 1;
      const ganancia = res.data?.ganancia ?? 0;
      const mensajeServidor = res.data?.mensaje ?? "Resultado procesado";
      const tipoResultado = res.data?.tipo_resultado ?? "sin_premio";

      // Animación de dados
      let frames = 0;
      const animacion = setInterval(() => {
        setDados([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
        frames++;
        if (frames > 12) {
          clearInterval(animacion);
          setDados([dado1, dado2]);
          setGananciaMostrar(ganancia);
          setResultadoText(mensajeServidor);
          setUsuario((prev) =>
            prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev
          );

          // Animación de confetti para premios
          if (tipoResultado !== "sin_premio") {
            animarConfetti(tipoResultado);
          }

          // Guardar en historial
          agregarAlHistorial([dado1, dado2], ganancia, apuestaSeleccionada, tipoResultado);

          setGirando(false);
        }
      }, 100);
    } catch (err: any) {
      console.error("Error al lanzar los dados:", err);
      setMensaje(err.response?.data?.detail || "Error al lanzar los dados");
      setGirando(false);
    }
  };

  const renderDado = (valor: number) => {
    const puntos = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [
        [25, 25],
        [75, 25],
        [25, 50],
        [75, 50],
        [25, 75],
        [75, 75],
      ],
    }[valor];

    return (
      <svg
        width="120"
        height="120"
        viewBox="0 0 100 100"
        className="rounded-xl bg-white shadow-2xl border-4 border-gray-800 transition-transform duration-300 hover:scale-105"
      >
        <rect x="0" y="0" width="100" height="100" rx="12" ry="12" fill="#fff" />
        {puntos?.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="8" fill="#1F2937" />
        ))}
      </svg>
    );
  };

  const getTipoResultadoLabel = (tipo: string) => {
    switch (tipo) {
      case 'doble_6': return '🎯 Doble 6';
      case 'doble_otro': return '🎲 Doble';
      default: return '❌ Sin premio';
    }
  };

  const getColorTipo = (tipo: string) => {
    switch (tipo) {
      case 'doble_6': return 'text-yellow-400';
      case 'doble_otro': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const limpiarHistorial = () => {
    setHistorial([]);
    localStorage.removeItem('historial_dados');
    // No limpiamos las estadísticas acumulativas
    // Solo reseteamos las estadísticas visibles a las acumulativas
    setEstadisticas({
      totalTiradas: estadisticasAcumulativas.totalTiradasAcum,
      gananciaTotal: estadisticasAcumulativas.gananciaTotalAcum,
      gastoTotal: estadisticasAcumulativas.gastoTotalAcum,
      balance: estadisticasAcumulativas.gananciaTotalAcum - estadisticasAcumulativas.gastoTotalAcum,
      doblesObtenidos: estadisticasAcumulativas.doblesObtenidosAcum
    });
  };

  const limpiarTodasEstadisticas = () => {
    setHistorial([]);
    setEstadisticas({
      totalTiradas: 0,
      gananciaTotal: 0,
      gastoTotal: 0,
      balance: 0,
      doblesObtenidos: 0
    });
    setEstadisticasAcumulativas({
      totalTiradasAcum: 0,
      gananciaTotalAcum: 0,
      gastoTotalAcum: 0,
      doblesObtenidosAcum: 0
    });
    localStorage.removeItem('historial_dados');
    localStorage.removeItem("estadisticas_acumulativas_dados");
    showMsg("Estadísticas reiniciadas completamente", "info");
  };

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotificacion({ text, type });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const cerrarSesion = () => {
    // Limpiar localStorage
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
    localStorage.removeItem('paso_verificacion');
    localStorage.removeItem('ultimo_usuario_id');
    localStorage.removeItem("fecha_envio_comprobante");
    localStorage.removeItem("historial_dados");
    localStorage.removeItem("estadisticas_acumulativas_dados");

    setUsuario(null);
    showMsg("Sesión cerrada correctamente", "success");
    setTimeout(() => navigate('/login'), 1500);
  };

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-xl font-bold">Cargando juego...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Notificación */}
      {notificacion && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center space-x-3 shadow-2xl animate-slideIn ${notificacion.type === "success"
            ? "bg-gradient-to-r from-green-900/90 to-green-800/90 border border-green-500/50 text-green-200"
            : notificacion.type === "error"
              ? "bg-gradient-to-r from-red-900/90 to-red-800/90 border border-red-500/50 text-red-200"
              : "bg-gradient-to-r from-blue-900/90 to-blue-800/90 border border-blue-500/50 text-blue-200"
          }`}>
          <span className="text-xl">
            {notificacion.type === "success" ? "✅" : notificacion.type === "error" ? "❌" : "ℹ️"}
          </span>
          <span>{notificacion.text}</span>
        </div>
      )}

      {/* Header - Usando el componente */}
      <Header
        usuario={usuario}
        cerrarSesion={cerrarSesion}
        setUsuario={setUsuario}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-green-500/10"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500 to-green-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-red-500 rounded-full blur-3xl opacity-20"></div>

        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block mb-6">
              <span className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-green-600/20 border border-blue-500/30 rounded-full text-sm font-bold text-blue-400">
                🎲 JUEGO DE DADOS VIP
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-green-400 to-blue-400 bg-clip-text text-transparent">
                Lanza y Gana
              </span>
              <br />
              <span className="text-white">¡Hasta {multiplicadores.doble_6}x tu apuesta!</span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Apuesta desde <span className="text-blue-400 font-bold">${apuestasPermitidas[0]}</span> hasta <span className="text-blue-400 font-bold">${apuestasPermitidas[apuestasPermitidas.length - 1]}</span>.
              <span className="text-green-400 font-bold"> ¡Doble 6 paga {multiplicadores.doble_6}x, cualquier otro doble {multiplicadores.doble_otro}x!</span>
            </p>
          </div>
        </div>
      </section>

      {/* Contenido Principal */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Área de juego */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="relative w-full max-w-md mx-auto">
                {/* Selector de apuesta */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">💰 Selecciona tu apuesta</h3>
                  <div className="flex gap-3 justify-center flex-wrap mb-4">
                    {apuestasPermitidas.map((apuesta) => (
                      <button
                        key={apuesta}
                        onClick={() => setApuestaSeleccionada(apuesta)}
                        disabled={usuario.saldo < apuesta}
                        className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 ${apuestaSeleccionada === apuesta
                            ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg scale-105'
                            : usuario.saldo < apuesta
                              ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700'
                              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white border border-gray-700'
                          }`}
                      >
                        ${apuesta.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-gray-400">
                    Apuesta seleccionada: <span className="text-blue-400 font-bold">${apuestaSeleccionada.toLocaleString()}</span>
                  </div>
                </div>

                {/* Dados */}
                <div className="mb-8">
                  <div className="flex justify-center gap-8 mb-8">
                    <div className={`transform transition-all duration-500 ${girando ? 'animate-bounce' : ''}`}>
                      {renderDado(dados[0])}
                    </div>
                    <div className={`transform transition-all duration-500 ${girando ? 'animate-bounce' : ''} animation-delay-200`}>
                      {renderDado(dados[1])}
                    </div>
                  </div>

                  <style>
                    {`
                      .animation-delay-200 {
                        animation-delay: 0.2s;
                      }
                    `}
                  </style>
                </div>

                {/* Botón de lanzar */}
                <div className="text-center">
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-white mb-2">
                      Saldo: <span className="text-yellow-400">${usuario?.saldo?.toLocaleString() ?? 0}</span>
                    </div>
                    {mensaje && (
                      <div className={`px-4 py-3 rounded-xl font-bold mb-4 ${mensaje.includes("Error") || mensaje.includes("insuficiente")
                          ? "bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200"
                          : "bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50 text-green-200"
                        }`}>
                        {mensaje}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={lanzarDados}
                    disabled={girando || !usuario || (usuario && usuario.saldo < apuestaSeleccionada)}
                    className={`w-full max-w-xs py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${girando
                        ? 'bg-gray-600 cursor-not-allowed opacity-70'
                        : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 hover:scale-105 active:scale-95'
                      } ${(!usuario || (usuario && usuario.saldo < apuestaSeleccionada)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {girando ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Lanzando...
                      </span>
                    ) : (
                      `🎲 Lanzar por $${apuestaSeleccionada.toLocaleString()}`
                    )}
                  </button>

                  {resultadoText && (
                    <div className="mt-6 p-6 bg-gradient-to-r from-gray-800/70 to-gray-900/70 border border-blue-500/30 rounded-2xl">
                      <div className="text-2xl font-bold text-white mb-2">{resultadoText}</div>
                      <div className="text-xl text-gray-300">
                        {gananciaMostrar !== null && gananciaMostrar > 0 ? (
                          <span className="text-green-400 font-bold">¡Ganaste ${gananciaMostrar.toLocaleString()}!</span>
                        ) : gananciaMostrar === 0 ? (
                          <span className="text-yellow-400">Sin ganancias esta vez</span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Panel Lateral */}
          <div className="space-y-6">
            {/* Estadísticas */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">📊 Tus Estadísticas</h3>
                <button
                  onClick={limpiarTodasEstadisticas}
                  className="px-3 py-1 text-sm bg-red-900/30 text-red-300 hover:bg-red-800/40 rounded-lg transition-colors"
                  title="Reiniciar todas las estadísticas"
                >
                  Reiniciar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                  <div className="text-sm text-gray-400">Total Tiradas</div>
                  <div className="text-2xl font-bold text-blue-400">{estadisticas.totalTiradas}</div>
                  <div className="text-xs text-gray-500 mt-1">Acumulativo</div>
                </div>
                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                  <div className="text-sm text-gray-400">Dobles Obtenidos</div>
                  <div className="text-2xl font-bold text-green-400">{estadisticas.doblesObtenidos}</div>
                  <div className="text-xs text-gray-500 mt-1">Todos los dobles</div>
                </div>
                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                  <div className="text-sm text-gray-400">Ganancia Total</div>
                  <div className="text-2xl font-bold text-green-400">${estadisticas.gananciaTotal}</div>
                  <div className="text-xs text-gray-500 mt-1">Ganancias brutas</div>
                </div>
                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                  <div className="text-sm text-gray-400">Balance</div>
                  <div className={`text-2xl font-bold ${estadisticas.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${estadisticas.balance}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {estadisticas.balance >= 0 ? 'Ganancia neta' : 'Pérdida neta'}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700/30">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Gasto Total</div>
                    <div className="text-xl font-bold text-red-400">${estadisticas.gastoTotal}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Ratio Dobles</div>
                    <div className="text-xl font-bold text-blue-400">
                      {estadisticas.totalTiradas > 0
                        ? `${((estadisticas.doblesObtenidos / estadisticas.totalTiradas) * 100).toFixed(1)}%`
                        : '0%'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Premios */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-xl font-bold text-white mb-4">🎯 Premios Disponibles</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-800/40 rounded-xl border border-yellow-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-white font-medium">Doble 6</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Multiplicador</div>
                      <div className="text-xl font-bold text-yellow-400">{multiplicadores.doble_6}x</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    Valor: <span className="text-yellow-400 font-bold">${(apuestaSeleccionada * multiplicadores.doble_6).toLocaleString()}</span>
                    <div className="mt-1 text-xs text-gray-500">Probabilidad: 1 en 36 (2.78%)</div>
                  </div>
                </div>

                <div className="p-4 bg-gray-800/40 rounded-xl border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-white font-medium">Cualquier otro doble</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Multiplicador</div>
                      <div className="text-xl font-bold text-green-400">{multiplicadores.doble_otro}x</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    Valor: <span className="text-green-400 font-bold">${(apuestaSeleccionada * multiplicadores.doble_otro).toLocaleString()}</span>
                    <div className="mt-1 text-xs text-gray-500">Probabilidad: 5 en 36 (13.89%)</div>
                  </div>
                </div>

                <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      <span className="text-white font-medium">Sin premio</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Multiplicador</div>
                      <div className="text-xl font-bold text-gray-400">0x</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    <div className="mt-1 text-xs text-gray-500">
                      Ocurre con cualquier combinación que no sea doble (30 en 36 = 83.33%)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Historial */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">📝 Historial de Tiradas</h3>
                {historial.length > 0 && (
                  <button
                    onClick={limpiarHistorial}
                    className="px-3 py-1 text-sm bg-red-900/30 text-red-300 hover:bg-red-800/40 rounded-lg transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {historial.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🎲</div>
                  <p className="text-gray-400">No hay tiradas registradas</p>
                  <p className="text-sm text-gray-500 mt-1">Lanza los dados para comenzar</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {historial.map((giro) => (
                    <div key={giro.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium flex items-center space-x-2">
                            <span>🎲 {giro.dados[0]}-{giro.dados[1]}</span>
                            <span className={`text-xs ${getColorTipo(giro.tipo)}`}>
                              {getTipoResultadoLabel(giro.tipo)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">{giro.fecha}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${giro.ganancia > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                            {giro.ganancia > 0 ? `+$${giro.ganancia}` : '$0'}
                          </div>
                          <div className="text-xs text-gray-400">Apuesta: ${giro.apuesta}</div>
                          <div className="text-xs text-gray-500">
                            {giro.ganancia > 0
                              ? `Neto: $${giro.ganancia - giro.apuesta}`
                              : `Pérdida: $${giro.apuesta}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Información */}
            <div className="bg-gradient-to-r from-blue-600/20 to-green-600/20 border border-blue-500/30 rounded-2xl p-6">
              <h4 className="text-lg font-bold text-white mb-3">💡 Consejos</h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>La probabilidad de sacar doble 6 es 1 en 36 (2.78%)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Cualquier doble (1-1, 2-2, etc.) paga {multiplicadores.doble_otro}x</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Probabilidad total de algún doble: 6 en 36 (16.67%)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Ajusta tu apuesta según tu saldo disponible</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Juega responsablemente</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Usando el componente */}
      <Footer />
    </div>
  );
}