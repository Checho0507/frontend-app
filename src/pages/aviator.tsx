import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
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

interface Vuelo {
  id: number;
  multiplicador_crash: number;
  multiplicador_retiro: number | null;
  resultado: string;
  ganancia: number;
  fecha: string;
  apuesta: number;
  retiro_manual: boolean;
}

interface HistorialPublico {
  id: number;
  multiplicador: number;
  timestamp: string;
  color: string;
}

interface Estadisticas {
  total_vuelos: number;
  vuelos_ganados: number;
  vuelos_perdidos: number;
  ganancia_total: number;
  perdida_total: number;
  balance: number;
  mayor_ganancia: number;
  multiplicador_record: number;
}

type EstadoVuelo = "esperando" | "vuelo" | "cashout" | "explosion";

const money = (n: number) =>
  n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

const money0 = (n: number) =>
  n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

/**
 * SVG bonito, limpio, responsive:
 * - Sin animateTransform interno (mejor control desde React con translateX).
 * - Estela, nubes, gradientes y blur leve.
 */
function PlaneSVG({ variant = "md" }: { variant?: "sm" | "md" | "lg" }) {
  const size = variant === "sm" ? 110 : variant === "lg" ? 190 : 150;

  return (
    <svg
      width={size}
      height={(size * 0.55) | 0}
      viewBox="0 0 420 230"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Avión"
      role="img"
      className="drop-shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
    >
      <defs>
        <linearGradient id="skyGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.25" />
          <stop offset="55%" stopColor="#A78BFA" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#F472B6" stopOpacity="0.14" />
        </linearGradient>

        <linearGradient id="body" x1="80" y1="70" x2="360" y2="120">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="45%" stopColor="#E5E7EB" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        <linearGradient id="wing" x1="160" y1="80" x2="280" y2="170">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        <linearGradient id="trail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.0" />
          <stop offset="35%" stopColor="#22C55E" stopOpacity="0.16" />
          <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.0" />
        </linearGradient>

        <filter id="softBlur" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>

        <filter id="planeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* fondo glow */}
      <rect x="0" y="0" width="420" height="230" fill="url(#skyGlow)" opacity="0.65" />

      {/* nubes */}
      <g opacity="0.55" filter="url(#softBlur)">
        <path
          d="M58 78c8-12 24-16 38-10 6-12 22-18 36-12 12 5 18 17 16 29 11 1 20 10 20 22 0 13-10 23-23 23H55c-13 0-23-10-23-23 0-13 10-23 23-23h3z"
          fill="#E0F2FE"
        />
        <path
          d="M290 54c7-10 20-13 32-9 5-10 18-15 30-10 10 4 15 14 14 24 9 1 16 8 16 18 0 11-9 20-20 20h-78c-11 0-20-9-20-20 0-11 9-20 20-20h6z"
          fill="#E0E7FF"
          opacity="0.9"
        />
      </g>

      {/* estela */}
      <path
        d="M30 160 C 110 160, 140 145, 190 132 C 240 118, 290 115, 380 120"
        stroke="url(#trail)"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M35 168 C 120 168, 145 153, 198 140 C 250 126, 296 124, 385 128"
        stroke="url(#trail)"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* avión */}
      <g filter="url(#planeShadow)">
        {/* fuselaje */}
        <path
          d="M92 120
             C 145 92, 228 82, 312 92
             C 338 95, 356 104, 372 118
             C 356 133, 338 142, 312 145
             C 228 154, 145 146, 92 120 Z"
          fill="url(#body)"
          stroke="#CBD5E1"
          strokeWidth="2"
        />

        {/* cabina */}
        <path
          d="M150 110
             C 170 98, 205 92, 235 95
             C 210 110, 178 118, 150 118 Z"
          fill="#0EA5E9"
          opacity="0.25"
          stroke="#7DD3FC"
          strokeWidth="1.5"
        />

        {/* ala */}
        <path
          d="M208 126
             L 152 176
             C 190 182, 240 182, 282 171
             L 314 129
             C 280 134, 240 134, 208 126 Z"
          fill="url(#wing)"
          opacity="0.95"
        />

        {/* cola */}
        <path
          d="M92 120 L 52 86 L 66 122 L 52 154 Z"
          fill="#CBD5E1"
          stroke="#94A3B8"
          strokeWidth="1.5"
        />

        {/* estabilizador */}
        <path
          d="M122 108 L 92 72 L 148 90 Z"
          fill="#BFCFE3"
          opacity="0.9"
        />

        {/* motor */}
        <ellipse cx="242" cy="165" rx="18" ry="11" fill="#64748B" opacity="0.65" />
        <ellipse cx="242" cy="165" rx="10" ry="6" fill="#0F172A" opacity="0.65" />

        {/* ventanas */}
        <g fill="#60A5FA" opacity="0.8">
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={205 + i * 18} cy={118} r="3.4" />
          ))}
        </g>
      </g>
    </svg>
  );
}

export default function Aviator() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [estado, setEstado] = useState<EstadoVuelo>("esperando");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string>("");

  const [multiplicadorActual, setMultiplicadorActual] = useState<number>(1.0);
  const [multiplicadorCrash, setMultiplicadorCrash] = useState<number | null>(null);
  const [multiplicadorRetiro, setMultiplicadorRetiro] = useState<number | null>(null);
  const [ganancia, setGanancia] = useState<number>(0);
  const [apuestaActual, setApuestaActual] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(500);
  const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([100, 500, 1000, 2000, 5000]);
  const [multiplicadorAuto, setMultiplicadorAuto] = useState<number>(2.0);
  const [autoRetiroActivo, setAutoRetiroActivo] = useState<boolean>(false);

  const [historial, setHistorial] = useState<Vuelo[]>([]);
  const [historialPublico, setHistorialPublico] = useState<HistorialPublico[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas>(() => {
    const estadisticasGuardadas = localStorage.getItem("estadisticas_aviator");
    if (estadisticasGuardadas) {
      try {
        return JSON.parse(estadisticasGuardadas);
      } catch {}
    }
    return {
      total_vuelos: 0,
      vuelos_ganados: 0,
      vuelos_perdidos: 0,
      ganancia_total: 0,
      perdida_total: 0,
      balance: 0,
      mayor_ganancia: 0,
      multiplicador_record: 0,
    };
  });

  // Guardamos “última actualización” real (no new Date() en render)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(() => {
    return localStorage.getItem("aviator_last_updated_at");
  });

  const [puntosGrafico, setPuntosGrafico] = useState<Array<{ x: number; y: number }>>([]);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState<number>(0);
  const [duracionTotal, setDuracionTotal] = useState<number>(0);

  const animacionRef = useRef<number | null>(null);
  const tiempoInicioRef = useRef<number>(0);
  const tiempoUltimoFrameRef = useRef<number>(0);
  const multiplicadorCrashRef = useRef<number>(2.0);
  const duracionTotalRef = useRef<number>(0);

  const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    localStorage.setItem("estadisticas_aviator", JSON.stringify(estadisticas));
  }, [estadisticas]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    const usuarioGuardado = localStorage.getItem("usuario");
    if (usuarioGuardado) {
      try {
        setUsuario(JSON.parse(usuarioGuardado));
      } catch {}
    }
  }, [navigate]);

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const res = await axios.get(`${API_URL}/juegos/aviator/apuestas-permitidas`);
        setApuestasPermitidas(res.data.apuestas_permitidas);
        setApuestaSeleccionada(res.data.apuestas_permitidas[1] || 500);
      } catch (error) {
        console.error("Error al cargar configuración:", error);
      }
    };

    cargarConfiguracion();
    cargarHistorialPublico();
    cargarHistorialPersonal();
  }, []);

  const cargarHistorialPublico = async () => {
    try {
      const res = await axios.get(`${API_URL}/juegos/aviator/historial?limite=20`);
      setHistorialPublico(res.data.historial);
    } catch (error) {
      console.error("Error al cargar historial público:", error);
    }
  };

  const cargarHistorialPersonal = () => {
    const historialGuardado = localStorage.getItem("historial_aviator");
    if (historialGuardado) {
      try {
        setHistorial(JSON.parse(historialGuardado));
      } catch {}
    }
  };

  useEffect(() => {
    if (estado === "vuelo") iniciarAnimacion();
    else detenerAnimacion();

    return () => detenerAnimacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const iniciarAnimacion = () => {
    if (!duracionTotalRef.current || duracionTotalRef.current <= 0) return;

    detenerAnimacion();
    tiempoInicioRef.current = performance.now();
    tiempoUltimoFrameRef.current = tiempoInicioRef.current;

    setPuntosGrafico([]);
    setTiempoTranscurrido(0);

    const animar = (currentTime: number) => {
      if (!tiempoInicioRef.current) return;

      const tiempoTrans = (currentTime - tiempoInicioRef.current) / 1000;
      setTiempoTranscurrido(tiempoTrans);

      const progreso = Math.min(tiempoTrans / duracionTotalRef.current, 1.0);
      const progresoEased = 1 - Math.pow(1 - progreso, 3);

      const rango = multiplicadorCrashRef.current - 1.0;
      const multiplicadorCalculado = 1.0 + rango * progresoEased;
      const multiplicadorRedondeado = Math.round(multiplicadorCalculado * 100) / 100;

      setMultiplicadorActual(multiplicadorRedondeado);

      setPuntosGrafico((prev) => {
        const nuevoPunto = { x: tiempoTrans, y: multiplicadorRedondeado };
        const nuevos = [...prev, nuevoPunto];
        return nuevos.length > 110 ? nuevos.slice(-110) : nuevos;
      });

      if (progreso >= 1.0) {
        setEstado("explosion");
        setMultiplicadorCrash(multiplicadorCrashRef.current);
        setMensaje(`¡CRASH! El avión explotó en ${multiplicadorCrashRef.current.toFixed(2)}x`);
        agregarAlHistorial("explosion", multiplicadorCrashRef.current, null, 0, apuestaActual);
        showMsg("¡CRASH! Perdiste tu apuesta", "error");
        detenerAnimacion();
        return;
      }

      if (autoRetiroActivo && multiplicadorRedondeado >= multiplicadorAuto && multiplicadorAuto > 1.0) {
        hacerCashout(multiplicadorAuto);
        return;
      }

      animacionRef.current = requestAnimationFrame(animar);
    };

    animacionRef.current = requestAnimationFrame(animar);
  };

  const detenerAnimacion = () => {
    if (animacionRef.current) cancelAnimationFrame(animacionRef.current);
    animacionRef.current = null;
    tiempoInicioRef.current = 0;
    tiempoUltimoFrameRef.current = 0;
  };

  const iniciarVuelo = async () => {
    if (!usuario) {
      setMensaje("Debes iniciar sesión para jugar.");
      return;
    }

    if (usuario.saldo < apuestaSeleccionada) {
      setMensaje(`Saldo insuficiente. Necesitas $${apuestaSeleccionada} para jugar.`);
      return;
    }

    setCargando(true);
    setMensaje("");
    setMultiplicadorActual(1.0);
    setMultiplicadorCrash(null);
    setMultiplicadorRetiro(null);
    setGanancia(0);
    setPuntosGrafico([]);
    setTiempoTranscurrido(0);
    setApuestaActual(apuestaSeleccionada);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/juegos/aviator/iniciar?apuesta=${apuestaSeleccionada}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data || typeof res.data.duracion_total !== "number" || typeof res.data.multiplicador_crash !== "number") {
        throw new Error("Datos inválidos recibidos del servidor");
      }

      const crashMultiplier = Math.max(1.0, Math.min(res.data.multiplicador_crash || 2.0, 500.0));
      const duracion = Math.max(0.5, Math.min(res.data.duracion_total || 5.0, 30.0));

      multiplicadorCrashRef.current = crashMultiplier;
      duracionTotalRef.current = duracion;

      setSessionId(res.data.session_id);
      setDuracionTotal(duracion);

      if (res.data.nuevo_saldo != null) {
        setUsuario((prev) => (prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev));
      }

      setEstado("vuelo");
      setMensaje("¡El avión despegó! Retira antes de que explote.");
    } catch (error: any) {
      console.error("Error al iniciar vuelo:", error);
      setMensaje(error.response?.data?.detail || error.message || "Error al iniciar el vuelo. Por favor, intenta nuevamente.");
      setEstado("esperando");
    } finally {
      setCargando(false);
    }
  };

  const hacerCashout = async (multiplicador: number) => {
    if (!sessionId || estado !== "vuelo") return;

    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/aviator/${sessionId}/cashout?multiplicador_actual=${multiplicador}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      detenerAnimacion();

      if (res.data.estado === "cashout") {
        setEstado("cashout");
        setMultiplicadorCrash(res.data.multiplicador_crash);
        setMultiplicadorRetiro(res.data.multiplicador_retiro);
        setGanancia(res.data.ganancia);
        setMensaje(res.data.resultado);

        if (res.data.nuevo_saldo != null) {
          setUsuario((prev) => (prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev));
        }

        if (res.data.ganancia > apuestaActual) animarConfetti();

        agregarAlHistorial("cashout", res.data.multiplicador_crash, res.data.multiplicador_retiro, res.data.ganancia, apuestaActual);
        showMsg(`¡Retiro exitoso! Ganaste $${res.data.ganancia.toFixed(2)}`, "success");
      } else {
        setEstado("explosion");
        setMultiplicadorCrash(res.data.multiplicador_crash);
        setMensaje(res.data.resultado);
        agregarAlHistorial("explosion", res.data.multiplicador_crash, null, 0, apuestaActual);
        showMsg("¡CRASH! Perdiste tu apuesta", "error");
      }
    } catch (error: any) {
      console.error("Error al retirar:", error);
      setMensaje(error.response?.data?.detail || "Error al retirar. Por favor, intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  const agregarAlHistorial = (resultado: string, crash: number, retiro: number | null, ganancia: number, apuesta: number) => {
    const nuevoVuelo: Vuelo = {
      id: Date.now(),
      multiplicador_crash: crash,
      multiplicador_retiro: retiro,
      resultado,
      ganancia,
      apuesta,
      fecha: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      retiro_manual: resultado === "cashout",
    };

    const nuevoHistorial = [nuevoVuelo, ...historial.slice(0, 9)];
    setHistorial(nuevoHistorial);
    localStorage.setItem("historial_aviator", JSON.stringify(nuevoHistorial));

    actualizarEstadisticasConVuelo(nuevoVuelo);

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastUpdatedAt(now);
    localStorage.setItem("aviator_last_updated_at", now);
  };

  const actualizarEstadisticasConVuelo = (vuelo: Vuelo) => {
    setEstadisticas((prev) => {
      const esVictoria = vuelo.resultado === "cashout";
      const nuevaGanancia = esVictoria ? vuelo.ganancia : 0;
      const nuevaPerdida = esVictoria ? 0 : vuelo.apuesta;

      // Nota: aquí asumes que vuelo.ganancia ya es “ganancia neta”
      // Si en tu backend ganancia es “pago total”, avísame y lo ajusto.
      const nuevoBalance = prev.balance + (nuevaGanancia - nuevaPerdida);

      return {
        total_vuelos: prev.total_vuelos + 1,
        vuelos_ganados: prev.vuelos_ganados + (esVictoria ? 1 : 0),
        vuelos_perdidos: prev.vuelos_perdidos + (esVictoria ? 0 : 1),
        ganancia_total: prev.ganancia_total + nuevaGanancia,
        perdida_total: prev.perdida_total + nuevaPerdida,
        balance: nuevoBalance,
        mayor_ganancia: Math.max(prev.mayor_ganancia, nuevaGanancia),
        multiplicador_record: Math.max(prev.multiplicador_record, vuelo.multiplicador_retiro || 0),
      };
    });
  };

  // Importante: tu función “Actualizar” anterior recalculaba SOLO con la última partida
  // Eso no es “actualizar”, eso es “reemplazar”. Aquí lo dejo pero renombrado para que sea honesto.
  const recalcularStatsSoloUltima = () => {
    if (historial.length === 0) {
      showMsg("No hay historial para actualizar", "info");
      return;
    }

    const ultima = historial[0];
    const esVictoria = ultima.resultado === "cashout";
    const nuevaGanancia = esVictoria ? ultima.ganancia : 0;
    const nuevaPerdida = esVictoria ? 0 : ultima.apuesta;

    const nuevas: Estadisticas = {
      total_vuelos: 1,
      vuelos_ganados: esVictoria ? 1 : 0,
      vuelos_perdidos: esVictoria ? 0 : 1,
      ganancia_total: nuevaGanancia,
      perdida_total: nuevaPerdida,
      balance: nuevaGanancia - nuevaPerdida,
      mayor_ganancia: nuevaGanancia,
      multiplicador_record: ultima.multiplicador_retiro || 0,
    };

    setEstadisticas(nuevas);

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastUpdatedAt(now);
    localStorage.setItem("aviator_last_updated_at", now);

    showMsg("Estadísticas reemplazadas con la última partida", "success");
  };

  const restablecerEstadisticas = () => {
    if (!window.confirm("¿Estás seguro de que quieres restablecer todas las estadísticas a cero?")) return;

    const cero: Estadisticas = {
      total_vuelos: 0,
      vuelos_ganados: 0,
      vuelos_perdidos: 0,
      ganancia_total: 0,
      perdida_total: 0,
      balance: 0,
      mayor_ganancia: 0,
      multiplicador_record: 0,
    };

    setEstadisticas(cero);

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastUpdatedAt(now);
    localStorage.setItem("aviator_last_updated_at", now);

    showMsg("Estadísticas restablecidas a cero", "info");
  };

  const animarConfetti = () => {
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
  };

  const reiniciarJuego = () => {
    detenerAnimacion();
    setEstado("esperando");
    setSessionId(null);
    setMultiplicadorActual(1.0);
    setMultiplicadorCrash(null);
    setMultiplicadorRetiro(null);
    setMensaje("");
    setGanancia(0);
    setPuntosGrafico([]);
    setTiempoTranscurrido(0);
    setDuracionTotal(0);
    setApuestaActual(0);
    setAutoRetiroActivo(false);
    multiplicadorCrashRef.current = 2.0;
    duracionTotalRef.current = 0;
    tiempoInicioRef.current = 0;
    tiempoUltimoFrameRef.current = 0;
  };

  const configurarAutoretiro = async () => {
    if (!sessionId || estado !== "vuelo") {
      setAutoRetiroActivo(!autoRetiroActivo);
      showMsg(`Retiro automático ${!autoRetiroActivo ? "activado" : "desactivado"} en ${multiplicadorAuto}x`, "info");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/aviator/${sessionId}/configurar-autoretiro?multiplicador_auto=${multiplicadorAuto}&activar=${!autoRetiroActivo}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAutoRetiroActivo(!autoRetiroActivo);
      showMsg(res.data.mensaje, "success");
    } catch (error) {
      console.error("Error al configurar autoretiro:", error);
    }
  };

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotificacion({ text, type });
    setTimeout(() => setNotificacion(null), 4500);
  };

  const limpiarHistorial = () => {
    if (!window.confirm("¿Estás seguro de que quieres limpiar el historial?")) return;
    setHistorial([]);
    localStorage.removeItem("historial_aviator");
    showMsg("Historial limpiado", "info");
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("historial_aviator");
    localStorage.removeItem("estadisticas_aviator");
    localStorage.removeItem("aviator_last_updated_at");
    setUsuario(null);
    showMsg("Sesión cerrada correctamente", "success");
    setTimeout(() => navigate("/login"), 1200);
  };

  const formatearTiempo = (segundos: number) => {
    if (segundos < 0) return "0.0s";
    return `${Math.max(0, segundos).toFixed(1)}s`;
  };

  // Control del avión en escenario (no en SVG)
  const progresoAvion = useMemo(() => {
    const p = duracionTotal > 0 ? Math.min(tiempoTranscurrido / duracionTotal, 1) : 0;
    return p;
  }, [tiempoTranscurrido, duracionTotal]);

  const renderEscenaAvion = () => {
    const x = 8 + progresoAvion * 84; // 8% -> 92%

    return (
      <div className="relative w-full h-64 sm:h-72 bg-gradient-to-b from-slate-950/60 via-slate-900/40 to-transparent rounded-2xl overflow-hidden border border-white/5">
        {/* Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(circle_at_70%_30%,rgba(167,139,250,0.10),transparent_50%),radial-gradient(circle_at_40%_80%,rgba(244,114,182,0.08),transparent_55%)]" />

        {/* “suelo” */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500/20 via-amber-500/30 to-yellow-600/20" />

        {/* HUD */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="bg-black/35 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2">
            <div className="text-[10px] text-gray-400 leading-none">Tiempo</div>
            <div className="text-sm font-bold text-gray-100">{formatearTiempo(tiempoTranscurrido)}</div>
          </div>
          {duracionTotal > 0 && estado === "vuelo" && (
            <div className="bg-black/35 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2">
              <div className="text-[10px] text-gray-400 leading-none">Duración</div>
              <div className="text-sm font-bold text-gray-100">{formatearTiempo(duracionTotal)}</div>
            </div>
          )}
        </div>

        <div className="absolute top-3 right-3 bg-black/35 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center">
          <div className="text-[10px] text-gray-400">MULTIPLICADOR</div>
          <div
            className={`text-3xl font-extrabold tracking-tight ${
              multiplicadorActual >= 100
                ? "text-emerald-300 animate-pulse"
                : multiplicadorActual >= 50
                ? "text-yellow-300"
                : multiplicadorActual >= 10
                ? "text-sky-300"
                : "text-white"
            }`}
          >
            {multiplicadorActual.toFixed(2)}
            <span className="text-lg opacity-80">x</span>
          </div>
        </div>

        {/* Avión (responsive: en móvil más grande y más abajo) */}
        <div
          className="absolute transition-[left] duration-200 ease-out"
          style={{ left: `${x}%`, bottom: "18%" }}
        >
          <div className="-translate-x-1/2">
            <div className="hidden sm:block">
              <PlaneSVG variant="md" />
            </div>
            <div className="sm:hidden">
              <PlaneSVG variant="lg" />
            </div>
          </div>
        </div>

        {/* Mensajito inferior discreto */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-xs text-gray-300/80">
          <span className="bg-black/30 border border-white/10 rounded-lg px-3 py-1 backdrop-blur-md">
            {estado === "esperando" ? "Listo para despegar" : "En vuelo"}
          </span>
          <span className="bg-black/30 border border-white/10 rounded-lg px-3 py-1 backdrop-blur-md">
            {formatearTiempo(tiempoTranscurrido)} / {formatearTiempo(duracionTotal)}
          </span>
        </div>
      </div>
    );
  };

  const renderGrafico = () => {
    // En espera: escena bonita con avión
    if (estado === "esperando") {
      return (
        <div className="w-full">
          {renderEscenaAvion()}
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-lg">Esperando despegue...</p>
            <p className="text-gray-500 text-sm mt-1">Selecciona tu apuesta y presiona “Iniciar Vuelo”</p>
          </div>
        </div>
      );
    }

    // Si no hay puntos, muestra escena
    if (puntosGrafico.length === 0) return renderEscenaAvion();

    const maxX = Math.max(Math.min(Math.max(...puntosGrafico.map((p) => p.x), duracionTotal || 10), 30), 1);
    const maxY = Math.max(Math.min(Math.max(...puntosGrafico.map((p) => p.y), multiplicadorCrashRef.current || 5), 500), 2);

    const escalaX = (x: number) => (Math.min(x, maxX) / maxX) * 100;
    const escalaY = (y: number) => 100 - ((Math.min(y, maxY) - 1) / (maxY - 1)) * 85;

    const puntosSVG = puntosGrafico
      .map((p, i) => {
        const x = escalaX(p.x);
        const y = escalaY(p.y);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    return (
      <div className="w-full h-64 sm:h-72 bg-gradient-to-b from-slate-950/60 via-slate-900/40 to-transparent rounded-2xl relative overflow-hidden border border-white/5">
        {/* grid lines */}
        <div className="absolute inset-0">
          {[1, 2, 5, 10, 20, 50, 100, 200, 500]
            .filter((y) => y <= maxY)
            .map((y) => (
              <div
                key={y}
                className="absolute left-0 right-0 border-t border-white/10"
                style={{ bottom: `${escalaY(y)}%` }}
              >
                <span className="absolute left-2 -top-3 text-[10px] text-gray-400/70">{y}x</span>
              </div>
            ))}
        </div>

        {/* (IMPORTANTE) Quitado:
            - El punto final (dot) que “marca” cuándo retirar
            - La línea horizontal de auto (AUTO: 2.0x) que también delata
        */}

        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.75" />
              <stop offset="40%" stopColor="#3B82F6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.14" />
              <stop offset="65%" stopColor="#3B82F6" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.00" />
            </linearGradient>

            <filter id="glow">
              <feGaussianBlur stdDeviation="1.6" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* área bajo curva (más bonito) */}
          <path
            d={`${puntosSVG} L 100 100 L 0 100 Z`}
            fill="url(#areaGradient)"
            opacity="0.95"
          />

          {/* línea */}
          <path d={puntosSVG} fill="none" stroke="url(#lineGradient)" strokeWidth="2.2" filter="url(#glow)" />
        </svg>

        {/* HUD inferior */}
        <div className="absolute bottom-3 left-3 bg-black/35 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200">
          {formatearTiempo(tiempoTranscurrido)} / {formatearTiempo(duracionTotal)}
        </div>
      </div>
    );
  };

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-xl font-bold">Cargando Aviator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {notificacion && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center space-x-3 shadow-2xl animate-slideIn ${
            notificacion.type === "success"
              ? "bg-gradient-to-r from-green-900/90 to-green-800/90 border border-green-500/50 text-green-200"
              : notificacion.type === "error"
              ? "bg-gradient-to-r from-red-900/90 to-red-800/90 border border-red-500/50 text-red-200"
              : "bg-gradient-to-r from-blue-900/90 to-blue-800/90 border border-blue-500/50 text-blue-200"
          }`}
        >
          <span className="text-xl">{notificacion.type === "success" ? "✅" : notificacion.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{notificacion.text}</span>
        </div>
      )}

      <Header usuario={usuario} cerrarSesion={cerrarSesion} setUsuario={setUsuario} />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>

        <div className="container mx-auto px-4 py-10 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block mb-6">
              <span className="px-6 py-3 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 border border-blue-500/30 rounded-full text-lg font-bold text-blue-200 backdrop-blur-sm">
                ✈️ AVIATOR ELITE
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
              <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                Aviator Pro
              </span>
              <br />
              <span className="text-white text-2xl md:text-3xl font-bold">Retira antes del crash</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 mb-2 max-w-2xl mx-auto">
              Multiplicadores de hasta <span className="text-yellow-400 font-bold">500x</span> · Probabilidades realistas · Retiro automático
            </p>
          </div>
        </div>
      </section>

      {/* MAIN */}
      <section className="container mx-auto px-4 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* izquierda */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-gray-700/50 shadow-2xl">
              <div className="mb-6">{estado === "vuelo" ? renderGrafico() : renderEscenaAvion()}</div>

              {/* métricas rápidas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-sm text-gray-400">Multiplicador</div>
                  <div className="text-3xl font-extrabold text-white">
                    {multiplicadorActual.toFixed(2)}
                    <span className="text-lg opacity-80">x</span>
                  </div>
                </div>

                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-sm text-gray-400">Tiempo</div>
                  <div className="text-3xl font-extrabold text-white">{formatearTiempo(tiempoTranscurrido)}</div>
                </div>

                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-sm text-gray-400">Apuesta</div>
                  <div className="text-3xl font-extrabold text-yellow-300">
                    ${apuestaActual > 0 ? money0(apuestaActual) : "0"}
                  </div>
                </div>

                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                  <div className="text-sm text-gray-400">Ganancia</div>
                  <div className={`text-3xl font-extrabold ${ganancia > 0 ? "text-emerald-300" : "text-gray-400"}`}>
                    ${ganancia > 0 ? ganancia.toFixed(2) : "0.00"}
                  </div>
                </div>
              </div>

              {/* Panel de apuestas / config */}
              {estado === "esperando" ? (
                <div className="mb-7">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">💰 Selecciona tu apuesta</h3>

                  <div className="flex gap-3 justify-center flex-wrap mb-6">
                    {apuestasPermitidas.map((apuesta) => (
                      <button
                        key={apuesta}
                        onClick={() => setApuestaSeleccionada(apuesta)}
                        disabled={usuario.saldo < apuesta}
                        className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                          apuestaSeleccionada === apuesta
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                            : usuario.saldo < apuesta
                            ? "bg-gray-800/50 text-gray-500 cursor-not-allowed"
                            : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/70"
                        }`}
                      >
                        ${money0(apuesta)}
                      </button>
                    ))}
                  </div>

                  <div className="bg-gray-800/30 rounded-2xl p-4 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-400">⚡</span>
                        <span className="text-white font-bold">Retiro Automático</span>
                      </div>

                      <button
                        onClick={() => setAutoRetiroActivo(!autoRetiroActivo)}
                        className={`px-4 py-1 rounded-full text-sm font-bold ${
                          autoRetiroActivo ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {autoRetiroActivo ? "ACTIVADO" : "DESACTIVADO"}
                      </button>
                    </div>

                    <label className="block text-gray-400 mb-2 text-sm">
                      Multiplicador (no se mostrará como guía en el gráfico):{" "}
                      <span className="text-yellow-300 font-bold">{multiplicadorAuto.toFixed(1)}x</span>
                    </label>

                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="1.1"
                        max="100"
                        step="0.1"
                        value={multiplicadorAuto}
                        onChange={(e) => setMultiplicadorAuto(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-700 rounded-lg accent-yellow-500"
                      />
                      <span className="text-white font-bold w-16 text-center bg-gray-800/50 px-3 py-1 rounded-lg border border-white/10">
                        {multiplicadorAuto.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 text-center">
                  <div className="text-lg text-white">
                    Saldo:{" "}
                    <span className="text-yellow-300 font-extrabold">
                      ${usuario?.saldo?.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                </div>
              )}

              {/* Mensaje */}
              {mensaje && (
                <div
                  className={`px-6 py-4 rounded-2xl font-bold mb-6 text-center border ${
                    mensaje.includes("CRASH")
                      ? "bg-red-950/50 text-red-200 border-red-500/30"
                      : mensaje.includes("Ganaste")
                      ? "bg-emerald-950/40 text-emerald-200 border-emerald-500/25"
                      : "bg-slate-950/40 text-gray-200 border-white/10"
                  }`}
                >
                  {mensaje}
                </div>
              )}

              {/* Botones principales */}
              <div className="text-center">
                {estado === "esperando" && (
                  <button
                    onClick={iniciarVuelo}
                    disabled={cargando || usuario.saldo < apuestaSeleccionada}
                    className={`w-full py-5 px-8 rounded-2xl font-extrabold text-xl ${
                      cargando || usuario.saldo < apuestaSeleccionada
                        ? "bg-gray-600 cursor-not-allowed opacity-70"
                        : "bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-[1.02] hover:from-blue-500 hover:to-purple-500"
                    } transition-all duration-300 shadow-[0_20px_60px_rgba(0,0,0,0.35)]`}
                  >
                    {cargando ? "Preparando..." : `✈️ INICIAR VUELO ($${money0(apuestaSeleccionada)})`}
                  </button>
                )}

                {estado === "vuelo" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => hacerCashout(multiplicadorActual)}
                      disabled={cargando}
                      className="flex-1 py-4 px-6 rounded-2xl font-extrabold text-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:scale-[1.02] transition-all duration-300 shadow-lg"
                    >
                      💰 RETIRAR ({multiplicadorActual.toFixed(2)}x)
                    </button>

                    <button
                      onClick={configurarAutoretiro}
                      disabled={cargando}
                      className={`py-4 px-6 rounded-2xl font-extrabold border border-white/10 ${
                        autoRetiroActivo ? "bg-yellow-600 text-black" : "bg-gray-800/60 text-gray-200"
                      }`}
                      title="Configurar auto-retiro"
                    >
                      ⚡ {multiplicadorAuto.toFixed(1)}x
                    </button>
                  </div>
                )}

                {(estado === "cashout" || estado === "explosion") && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-800/40 rounded-2xl border border-white/10">
                        <div className="text-sm text-gray-400">Crash</div>
                        <div className="text-2xl font-extrabold text-red-300">
                          {multiplicadorCrash?.toFixed(2)}x
                        </div>
                      </div>
                      <div className="p-4 bg-gray-800/40 rounded-2xl border border-white/10">
                        <div className="text-sm text-gray-400">Tu Retiro</div>
                        <div className="text-2xl font-extrabold text-emerald-300">
                          {multiplicadorRetiro ? `${multiplicadorRetiro.toFixed(2)}x` : "N/A"}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={reiniciarJuego}
                      className="w-full py-5 rounded-2xl font-extrabold text-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-[1.02] transition-all duration-300 shadow-lg"
                    >
                      ✈️ NUEVO VUELO
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* derecha */}
          <div className="space-y-6">
            {/* Estadísticas */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">📊 Estadísticas</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={recalcularStatsSoloUltima}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold"
                  >
                    🔄 Reemplazar (última)
                  </button>
                  <button
                    onClick={restablecerEstadisticas}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold"
                  >
                    🗑️ Restablecer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-white/5">
                  <div className="text-sm text-gray-400">Vuelos</div>
                  <div className="text-2xl font-extrabold text-blue-300">{estadisticas.total_vuelos}</div>
                </div>
                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-white/5">
                  <div className="text-sm text-gray-400">Ganados</div>
                  <div className="text-2xl font-extrabold text-emerald-300">{estadisticas.vuelos_ganados}</div>
                </div>

                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-white/5">
                  <div className="text-sm text-gray-400">Balance</div>
                  <div className={`text-2xl font-extrabold ${estadisticas.balance >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    ${estadisticas.balance.toFixed(2)}
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-white/5">
                  <div className="text-sm text-gray-400">Récord</div>
                  <div className="text-2xl font-extrabold text-yellow-300">
                    {estadisticas.multiplicador_record.toFixed(2)}x
                  </div>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4 mt-2">
                  <div className="text-center p-3 bg-gray-800/40 rounded-xl border border-white/5">
                    <div className="text-sm text-gray-400">Ganancia Total</div>
                    <div className="text-lg font-extrabold text-emerald-300">${estadisticas.ganancia_total.toFixed(2)}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-800/40 rounded-xl border border-white/5">
                    <div className="text-sm text-gray-400">Pérdida Total</div>
                    <div className="text-lg font-extrabold text-red-300">${estadisticas.perdida_total.toFixed(2)}</div>
                  </div>
                </div>

                <div className="col-span-2 text-center mt-2">
                  <div className="text-xs text-gray-500">
                    {estadisticas.total_vuelos > 0
                      ? `Última actualización: ${lastUpdatedAt ?? "—"}`
                      : "Sin datos guardados"}
                  </div>
                </div>
              </div>
            </div>

            {/* Historial */}
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
              <div className="flex justify-between mb-4">
                <h3 className="text-xl font-bold text-white">📝 Historial</h3>
                {historial.length > 0 && (
                  <button onClick={limpiarHistorial} className="text-sm text-red-300 hover:text-red-200 font-bold">
                    Limpiar
                  </button>
                )}
              </div>

              {historial.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">✈️</div>
                  <p className="text-gray-400">Sin vuelos</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {historial.map((vuelo) => (
                    <div key={vuelo.id} className="p-3 bg-gray-800/40 rounded-xl border border-white/5">
                      <div className="flex justify-between">
                        <div>
                          <span className={vuelo.ganancia > 0 ? "text-emerald-300 font-bold" : "text-red-300 font-bold"}>
                            {vuelo.resultado === "cashout" ? "💰 Ganado" : "💥 Perdido"}
                          </span>
                          <div className="text-xs text-gray-400">{vuelo.fecha}</div>
                        </div>

                        <div className="text-right">
                          <div className={`font-extrabold ${vuelo.ganancia > 0 ? "text-emerald-300" : "text-red-300"}`}>
                            {vuelo.ganancia > 0 ? `+$${vuelo.ganancia.toFixed(2)}` : `-$${money0(vuelo.apuesta)}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            {vuelo.multiplicador_retiro
                              ? `${vuelo.multiplicador_retiro.toFixed(2)}x`
                              : `Crash: ${vuelo.multiplicador_crash.toFixed(2)}x`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* (Opcional) Public history: si quieres lo integramos bonito también */}
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideIn { animation: slideIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}
