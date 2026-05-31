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

const money = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
const money0 = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

function PlaneSVG({ variant = "md", glow = false }: { variant?: "sm" | "md" | "lg"; glow?: boolean }) {
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
      style={{ filter: glow ? "drop-shadow(0 0 18px #3B82F6) drop-shadow(0 0 40px rgba(59,130,246,0.4))" : "drop-shadow(0 12px 30px rgba(0,0,0,0.5))" }}
    >
      <defs>
        <linearGradient id="skyGlowA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="bodyA" x1="80" y1="70" x2="360" y2="120">
          <stop offset="0%" stopColor="#E0EAFF" />
          <stop offset="50%" stopColor="#C7D7F8" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id="wingA" x1="160" y1="80" x2="280" y2="170">
          <stop offset="0%" stopColor="#BFCFEE" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id="trailA" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.0" />
          <stop offset="40%" stopColor="#3B82F6" stopOpacity="0.5" />
          <stop offset="75%" stopColor="#8B5CF6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity="0.0" />
        </linearGradient>
        <filter id="softBlurA" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="planeShadowA" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.4" />
        </filter>
      </defs>
      <g opacity="0.4" filter="url(#softBlurA)">
        <path d="M58 78c8-12 24-16 38-10 6-12 22-18 36-12 12 5 18 17 16 29 11 1 20 10 20 22 0 13-10 23-23 23H55c-13 0-23-10-23-23 0-13 10-23 23-23h3z" fill="#BAC8FF" />
        <path d="M290 54c7-10 20-13 32-9 5-10 18-15 30-10 10 4 15 14 14 24 9 1 16 8 16 18 0 11-9 20-20 20h-78c-11 0-20-9-20-20 0-11 9-20 20-20h6z" fill="#C7D2FE" opacity="0.8" />
      </g>
      <path d="M30 160 C 110 160, 140 145, 190 132 C 240 118, 290 115, 380 120" stroke="url(#trailA)" strokeWidth="16" strokeLinecap="round" opacity="0.9" />
      <path d="M35 170 C 120 170, 145 155, 198 142 C 250 128, 296 126, 385 130" stroke="url(#trailA)" strokeWidth="8" strokeLinecap="round" opacity="0.5" />
      <g filter="url(#planeShadowA)">
        <path d="M92 120 C 145 92, 228 82, 312 92 C 338 95, 356 104, 372 118 C 356 133, 338 142, 312 145 C 228 154, 145 146, 92 120 Z" fill="url(#bodyA)" stroke="#94A3B8" strokeWidth="1.5" />
        <path d="M150 110 C 170 98, 205 92, 235 95 C 210 110, 178 118, 150 118 Z" fill="#60A5FA" opacity="0.35" stroke="#93C5FD" strokeWidth="1.5" />
        <path d="M208 126 L 152 176 C 190 182, 240 182, 282 171 L 314 129 C 280 134, 240 134, 208 126 Z" fill="url(#wingA)" opacity="0.95" />
        <path d="M92 120 L 52 86 L 66 122 L 52 154 Z" fill="#94A3B8" stroke="#64748B" strokeWidth="1.5" />
        <path d="M122 108 L 92 72 L 148 90 Z" fill="#7B96C8" opacity="0.9" />
        <ellipse cx="242" cy="165" rx="18" ry="11" fill="#334155" opacity="0.7" />
        <ellipse cx="242" cy="165" rx="10" ry="6" fill="#0F172A" opacity="0.7" />
        <g fill="#93C5FD" opacity="0.9">
          {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={205 + i * 18} cy={118} r="3.4" />)}
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
    const s = localStorage.getItem("estadisticas_aviator");
    if (s) try { return JSON.parse(s); } catch {}
    return { total_vuelos: 0, vuelos_ganados: 0, vuelos_perdidos: 0, ganancia_total: 0, perdida_total: 0, balance: 0, mayor_ganancia: 0, multiplicador_record: 0 };
  });
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(() => localStorage.getItem("aviator_last_updated_at"));

  const [puntosGrafico, setPuntosGrafico] = useState<Array<{ x: number; y: number }>>([]);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState<number>(0);
  const [duracionTotal, setDuracionTotal] = useState<number>(0);

  const animacionRef = useRef<number | null>(null);
  const tiempoInicioRef = useRef<number>(0);
  const tiempoUltimoFrameRef = useRef<number>(0);
  const multiplicadorCrashRef = useRef<number>(2.0);
  const duracionTotalRef = useRef<number>(0);

  const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

  useEffect(() => { localStorage.setItem("estadisticas_aviator", JSON.stringify(estadisticas)); }, [estadisticas]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    const u = localStorage.getItem("usuario");
    if (u) try { setUsuario(JSON.parse(u)); } catch {}
  }, [navigate]);

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const res = await axios.get(`${API_URL}/juegos/aviator/apuestas-permitidas`);
        setApuestasPermitidas(res.data.apuestas_permitidas);
        setApuestaSeleccionada(res.data.apuestas_permitidas[1] || 500);
      } catch {}
    };
    cargarConfiguracion();
    cargarHistorialPublico();
    cargarHistorialPersonal();
  }, []);

  const cargarHistorialPublico = async () => {
    try {
      const res = await axios.get(`${API_URL}/juegos/aviator/historial?limite=20`);
      setHistorialPublico(res.data.historial);
    } catch {}
  };

  const cargarHistorialPersonal = () => {
    const h = localStorage.getItem("historial_aviator");
    if (h) try { setHistorial(JSON.parse(h)); } catch {}
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
        showMsg("💥 ¡CRASH! Perdiste tu apuesta", "error");
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
    if (!usuario) return showMsg("Debes iniciar sesión.", "error");
    if (usuario.saldo < apuestaSeleccionada) return showMsg(`Saldo insuficiente. Necesitas $${apuestaSeleccionada}.`, "error");
    setCargando(true); setMensaje(""); setMultiplicadorActual(1.0); setMultiplicadorCrash(null);
    setMultiplicadorRetiro(null); setGanancia(0); setPuntosGrafico([]); setTiempoTranscurrido(0); setApuestaActual(apuestaSeleccionada);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/juegos/aviator/iniciar?apuesta=${apuestaSeleccionada}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.data || typeof res.data.duracion_total !== "number" || typeof res.data.multiplicador_crash !== "number") throw new Error("Datos inválidos");
      const crashMultiplier = Math.max(1.0, Math.min(res.data.multiplicador_crash || 2.0, 500.0));
      const duracion = Math.max(0.5, Math.min(res.data.duracion_total || 5.0, 30.0));
      multiplicadorCrashRef.current = crashMultiplier;
      duracionTotalRef.current = duracion;
      setSessionId(res.data.session_id);
      setDuracionTotal(duracion);
      if (res.data.nuevo_saldo != null) setUsuario((prev) => (prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev));
      setEstado("vuelo");
      setMensaje("¡El avión despegó! Retira antes de que explote.");
    } catch (error: any) {
      setMensaje(error.response?.data?.detail || error.message || "Error al iniciar.");
      setEstado("esperando");
    } finally { setCargando(false); }
  };

  const hacerCashout = async (multiplicador: number) => {
    if (!sessionId || estado !== "vuelo") return;
    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/aviator/${sessionId}/cashout?multiplicador_actual=${multiplicador}`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      detenerAnimacion();
      if (res.data.estado === "cashout") {
        setEstado("cashout"); setMultiplicadorCrash(res.data.multiplicador_crash);
        setMultiplicadorRetiro(res.data.multiplicador_retiro); setGanancia(res.data.ganancia); setMensaje(res.data.resultado);
        if (res.data.nuevo_saldo != null) setUsuario((prev) => (prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev));
        if (res.data.ganancia > apuestaActual) animarConfetti();
        agregarAlHistorial("cashout", res.data.multiplicador_crash, res.data.multiplicador_retiro, res.data.ganancia, apuestaActual);
        showMsg(`✅ ¡Retiro exitoso! Ganaste $${res.data.ganancia.toFixed(2)}`, "success");
      } else {
        setEstado("explosion"); setMultiplicadorCrash(res.data.multiplicador_crash); setMensaje(res.data.resultado);
        agregarAlHistorial("explosion", res.data.multiplicador_crash, null, 0, apuestaActual);
        showMsg("💥 ¡CRASH! Perdiste tu apuesta", "error");
      }
    } catch (error: any) { setMensaje(error.response?.data?.detail || "Error al retirar."); }
    finally { setCargando(false); }
  };

  const agregarAlHistorial = (resultado: string, crash: number, retiro: number | null, ganancia: number, apuesta: number) => {
    const nuevoVuelo: Vuelo = {
      id: Date.now(), multiplicador_crash: crash, multiplicador_retiro: retiro, resultado, ganancia, apuesta,
      fecha: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), retiro_manual: resultado === "cashout",
    };
    const nuevoHistorial = [nuevoVuelo, ...historial.slice(0, 9)];
    setHistorial(nuevoHistorial);
    localStorage.setItem("historial_aviator", JSON.stringify(nuevoHistorial));
    actualizarEstadisticasConVuelo(nuevoVuelo);
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastUpdatedAt(now); localStorage.setItem("aviator_last_updated_at", now);
  };

  const actualizarEstadisticasConVuelo = (vuelo: Vuelo) => {
    setEstadisticas((prev) => {
      const esVictoria = vuelo.resultado === "cashout";
      const nuevaGanancia = esVictoria ? vuelo.ganancia : 0;
      const nuevaPerdida = esVictoria ? 0 : vuelo.apuesta;
      return {
        total_vuelos: prev.total_vuelos + 1, vuelos_ganados: prev.vuelos_ganados + (esVictoria ? 1 : 0),
        vuelos_perdidos: prev.vuelos_perdidos + (esVictoria ? 0 : 1),
        ganancia_total: prev.ganancia_total + nuevaGanancia, perdida_total: prev.perdida_total + nuevaPerdida,
        balance: prev.balance + (nuevaGanancia - nuevaPerdida),
        mayor_ganancia: Math.max(prev.mayor_ganancia, nuevaGanancia),
        multiplicador_record: Math.max(prev.multiplicador_record, vuelo.multiplicador_retiro || 0),
      };
    });
  };

  const recalcularStatsSoloUltima = () => {
    if (historial.length === 0) return showMsg("No hay historial.", "info");
    const ultima = historial[0];
    const esVictoria = ultima.resultado === "cashout";
    const nuevaGanancia = esVictoria ? ultima.ganancia : 0;
    const nuevaPerdida = esVictoria ? 0 : ultima.apuesta;
    setEstadisticas({
      total_vuelos: 1, vuelos_ganados: esVictoria ? 1 : 0, vuelos_perdidos: esVictoria ? 0 : 1,
      ganancia_total: nuevaGanancia, perdida_total: nuevaPerdida, balance: nuevaGanancia - nuevaPerdida,
      mayor_ganancia: nuevaGanancia, multiplicador_record: ultima.multiplicador_retiro || 0,
    });
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastUpdatedAt(now); localStorage.setItem("aviator_last_updated_at", now);
    showMsg("Estadísticas reemplazadas con la última partida", "success");
  };

  const restablecerEstadisticas = () => {
    if (!window.confirm("¿Restablecer todas las estadísticas a cero?")) return;
    setEstadisticas({ total_vuelos: 0, vuelos_ganados: 0, vuelos_perdidos: 0, ganancia_total: 0, perdida_total: 0, balance: 0, mayor_ganancia: 0, multiplicador_record: 0 });
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastUpdatedAt(now); localStorage.setItem("aviator_last_updated_at", now);
    showMsg("Estadísticas restablecidas", "info");
  };

  const animarConfetti = () => {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#3B82F6', '#8B5CF6', '#FFD700'] });
    setTimeout(() => {
      confetti({ particleCount: 150, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 150, angle: 120, spread: 55, origin: { x: 1 } });
    }, 300);
  };

  const reiniciarJuego = () => {
    detenerAnimacion(); setEstado("esperando"); setSessionId(null); setMultiplicadorActual(1.0);
    setMultiplicadorCrash(null); setMultiplicadorRetiro(null); setMensaje(""); setGanancia(0);
    setPuntosGrafico([]); setTiempoTranscurrido(0); setDuracionTotal(0); setApuestaActual(0);
    setAutoRetiroActivo(false); multiplicadorCrashRef.current = 2.0; duracionTotalRef.current = 0;
    tiempoInicioRef.current = 0; tiempoUltimoFrameRef.current = 0;
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
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      setAutoRetiroActivo(!autoRetiroActivo);
      showMsg(res.data.mensaje, "success");
    } catch {}
  };

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotificacion({ text, type });
    setTimeout(() => setNotificacion(null), 4500);
  };

  const limpiarHistorial = () => {
    if (!window.confirm("¿Limpiar el historial?")) return;
    setHistorial([]); localStorage.removeItem("historial_aviator"); showMsg("Historial limpiado", "info");
  };

  const formatearTiempo = (segundos: number) => segundos < 0 ? "0.0s" : `${Math.max(0, segundos).toFixed(1)}s`;

  const progresoAvion = useMemo(() => {
    const p = duracionTotal > 0 ? Math.min(tiempoTranscurrido / duracionTotal, 1) : 0;
    return p;
  }, [tiempoTranscurrido, duracionTotal]);

  // Color del multiplicador según valor
  const multColor = multiplicadorActual >= 100 ? "#00FF88" : multiplicadorActual >= 50 ? "#FFD700" : multiplicadorActual >= 10 ? "#60A5FA" : multiplicadorActual >= 5 ? "#A78BFA" : "#E2E8F0";
  const multGlow = multiplicadorActual >= 100 ? "0 0 30px #00FF88, 0 0 60px rgba(0,255,136,0.4)" : multiplicadorActual >= 10 ? "0 0 30px #60A5FA, 0 0 60px rgba(96,165,250,0.4)" : "none";

  const renderEscenaPrincipal = () => {
    const x = estado === "vuelo" ? 8 + progresoAvion * 82 : estado === "cashout" ? 90 : estado === "explosion" ? 90 : 12;
    const showGraph = estado === "vuelo" && puntosGrafico.length > 1;

    const maxX = showGraph ? Math.max(Math.min(Math.max(...puntosGrafico.map(p => p.x), duracionTotal || 10), 30), 1) : 10;
    const maxY = showGraph ? Math.max(Math.min(Math.max(...puntosGrafico.map(p => p.y), multiplicadorCrashRef.current || 5), 500), 2) : 5;
    const escalaX = (x: number) => (Math.min(x, maxX) / maxX) * 100;
    const escalaY = (y: number) => 100 - ((Math.min(y, maxY) - 1) / (maxY - 1)) * 85;
    const puntosSVG = showGraph ? puntosGrafico.map((p, i) => `${i === 0 ? "M" : "L"} ${escalaX(p.x)} ${escalaY(p.y)}`).join(" ") : "";
    const lastPoint = showGraph ? puntosGrafico[puntosGrafico.length - 1] : null;

    return (
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{
          height: 300,
          background: "linear-gradient(180deg, #020617 0%, #0a0e2a 40%, #050820 100%)",
          border: estado === "explosion" ? "2px solid rgba(239,68,68,0.6)" : estado === "cashout" ? "2px solid rgba(34,197,94,0.5)" : "2px solid rgba(59,130,246,0.2)",
          boxShadow: estado === "explosion" ? "inset 0 0 80px rgba(239,68,68,0.15), 0 0 40px rgba(239,68,68,0.2)" : estado === "cashout" ? "inset 0 0 80px rgba(34,197,94,0.08), 0 0 30px rgba(34,197,94,0.15)" : "inset 0 0 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Estrellas */}
        <div className="absolute inset-0" style={{ overflow: "hidden" }}>
          {[...Array(30)].map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 60}%`,
              width: i % 4 === 0 ? 2 : 1,
              height: i % 4 === 0 ? 2 : 1,
              borderRadius: "50%",
              background: "white",
              opacity: 0.3 + (i % 5) * 0.12,
            }} />
          ))}
        </div>

        {/* Grid lines */}
        {showGraph && (
          <div className="absolute inset-0">
            {[1, 2, 5, 10, 20, 50, 100, 200, 500].filter(y => y <= maxY).map(y => (
              <div key={y} className="absolute left-0 right-0" style={{ bottom: `${escalaY(y)}%`, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ position: "absolute", left: 8, top: -14, fontSize: 9, color: "rgba(148,163,184,0.6)", fontWeight: 700 }}>{y}x</span>
              </div>
            ))}
          </div>
        )}

        {/* Gráfico SVG */}
        {showGraph && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradAv" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#EC4899" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="areaGradAv" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
                <stop offset="60%" stopColor="#8B5CF6" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.00" />
              </linearGradient>
              <filter id="glowAv">
                <feGaussianBlur stdDeviation="1.8" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <path d={`${puntosSVG} L ${escalaX(lastPoint!.x)} 100 L 0 100 Z`} fill="url(#areaGradAv)" />
            <path d={puntosSVG} fill="none" stroke="url(#lineGradAv)" strokeWidth="2.5" filter="url(#glowAv)" />
            {lastPoint && (
              <circle cx={escalaX(lastPoint.x)} cy={escalaY(lastPoint.y)} r="2" fill="#fff" opacity="0.9" filter="url(#glowAv)" />
            )}
          </svg>
        )}

        {/* Runway */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: 3, background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.6), rgba(139,92,246,0.6), transparent)" }} />

        {/* Avión */}
        {estado !== "explosion" && (
          <div
            className="absolute transition-[left] duration-200 ease-out"
            style={{
              left: `${x}%`,
              bottom: estado === "vuelo" ? `${20 + progresoAvion * 40}%` : "20%",
              transform: "translateX(-50%)",
            }}
          >
            <div className="hidden sm:block"><PlaneSVG variant="md" glow={estado === "vuelo"} /></div>
            <div className="sm:hidden"><PlaneSVG variant="lg" glow={estado === "vuelo"} /></div>
          </div>
        )}

        {/* CRASH explosion */}
        {estado === "explosion" && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "crashPulse 0.5s ease-out" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 80, lineHeight: 1 }}>💥</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#EF4444", textShadow: "0 0 20px #EF4444", marginTop: 8 }}>
                CRASH @ {multiplicadorCrash?.toFixed(2)}x
              </div>
            </div>
          </div>
        )}

        {/* CASHOUT success */}
        {estado === "cashout" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 60 }}>✅</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#4ADE80", textShadow: "0 0 20px #4ADE80", marginTop: 8 }}>
                +${ganancia.toFixed(2)} · {multiplicadorRetiro?.toFixed(2)}x
              </div>
            </div>
          </div>
        )}

        {/* Multiplicador HUD */}
        <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
          <div style={{
            padding: "8px 28px", borderRadius: 999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
            border: `1px solid ${multColor}40`,
            boxShadow: estado === "vuelo" ? multGlow : "none",
          }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textAlign: "center", letterSpacing: "0.15em", textTransform: "uppercase" }}>Multiplicador</div>
            <div style={{
              fontSize: 48, fontWeight: 900, color: multColor, lineHeight: 1, textAlign: "center",
              textShadow: estado === "vuelo" ? multGlow : "none",
              fontVariantNumeric: "tabular-nums",
            }}>
              {multiplicadorActual.toFixed(2)}<span style={{ fontSize: 24, opacity: 0.8 }}>x</span>
            </div>
          </div>
        </div>

        {/* Tiempo HUD */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          <div style={{ padding: "6px 12px", borderRadius: 10, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 9, color: "#94A3B8", letterSpacing: "0.1em" }}>TIEMPO</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{formatearTiempo(tiempoTranscurrido)}</div>
          </div>
          {duracionTotal > 0 && estado === "vuelo" && (
            <div style={{ padding: "6px 12px", borderRadius: 10, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 9, color: "#94A3B8", letterSpacing: "0.1em" }}>DURACIÓN</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{formatearTiempo(duracionTotal)}</div>
            </div>
          )}
        </div>

        {/* Estado badge */}
        <div className="absolute bottom-4 right-4">
          <div style={{
            padding: "6px 14px", borderRadius: 999,
            background: estado === "vuelo" ? "rgba(59,130,246,0.2)" : estado === "cashout" ? "rgba(34,197,94,0.2)" : estado === "explosion" ? "rgba(239,68,68,0.2)" : "rgba(0,0,0,0.5)",
            border: `1px solid ${estado === "vuelo" ? "rgba(59,130,246,0.5)" : estado === "cashout" ? "rgba(34,197,94,0.5)" : estado === "explosion" ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: estado === "vuelo" ? "#93C5FD" : estado === "cashout" ? "#86EFAC" : estado === "explosion" ? "#FCA5A5" : "#94A3B8",
          }}>
            {estado === "vuelo" ? "✈ EN VUELO" : estado === "cashout" ? "✅ RETIRADO" : estado === "explosion" ? "💥 CRASH" : "⏳ ESPERANDO"}
          </div>
        </div>
      </div>
    );
  };

  if (!usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at center, #05001a 0%, #07070f 100%)" }}>
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ boxShadow: "0 0 30px #3B82F6" }} />
          <p className="font-bold tracking-widest" style={{ color: "#60A5FA" }}>CARGANDO AVIATOR...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #05001a 0%, #07070f 50%, #0a0510 100%)" }}>
      <style>{`
        @keyframes shimmerBlue {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGreen {
          0%, 100% { box-shadow: 0 0 20px rgba(34,197,94,0.5), 0 0 40px rgba(34,197,94,0.2); }
          50% { box-shadow: 0 0 40px rgba(34,197,94,0.8), 0 0 80px rgba(34,197,94,0.3); }
        }
        @keyframes pulseBlue {
          0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.5); }
          50% { box-shadow: 0 0 50px rgba(59,130,246,0.8), 0 0 80px rgba(139,92,246,0.3); }
        }
        @keyframes crashPulse {
          0% { background: rgba(239,68,68,0.3); }
          100% { background: transparent; }
        }
        @keyframes multPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .blue-text {
          background: linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899, #8B5CF6, #3B82F6);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerBlue 3s linear infinite;
        }
        .gold-text {
          background: linear-gradient(90deg, #DAA520, #FFD700, #FFA500, #FFD700, #DAA520);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerBlue 3s linear infinite;
        }
        .casino-card {
          background: linear-gradient(135deg, rgba(5,10,30,0.95), rgba(7,7,20,0.98));
          border: 1px solid rgba(59,130,246,0.15);
          backdrop-filter: blur(10px);
        }
        .float-up { animation: floatUp 0.4s ease-out forwards; }
        .cashout-btn { animation: pulseGreen 1.5s ease-in-out infinite; }
        .start-btn { animation: pulseBlue 2s ease-in-out infinite; }
        .scrollbar-av::-webkit-scrollbar { width: 4px; }
        .scrollbar-av::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .scrollbar-av::-webkit-scrollbar-thumb { background: #3B82F6; border-radius: 2px; }
        .mult-display { animation: multPulse 0.8s ease-in-out infinite; }
      `}</style>

      {/* Notificación */}
      {notificacion && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center gap-3 shadow-2xl float-up`}
          style={{
            background: notificacion.type === "success" ? "linear-gradient(135deg,#064e3b,#065f46)" : notificacion.type === "error" ? "linear-gradient(135deg,#450a0a,#7f1d1d)" : "linear-gradient(135deg,#0c1a40,#1e3a8a)",
            border: `1px solid ${notificacion.type === "success" ? "rgba(34,197,94,0.5)" : notificacion.type === "error" ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.5)"}`,
            color: notificacion.type === "success" ? "#86efac" : notificacion.type === "error" ? "#fca5a5" : "#93c5fd",
          }}>
          <span style={{ fontSize: 20 }}>{notificacion.type === "success" ? "✅" : notificacion.type === "error" ? "💥" : "ℹ️"}</span>
          <span>{notificacion.text}</span>
        </div>
      )}

      <Header usuario={usuario} cerrarSesion={() => { localStorage.clear(); navigate("/login"); }} setUsuario={setUsuario} />

      {/* Hero Banner */}
      <div className="relative overflow-hidden py-7 px-4" style={{ borderBottom: "1px solid rgba(59,130,246,0.15)", background: "radial-gradient(ellipse at center, rgba(59,130,246,0.06) 0%, transparent 70%)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span style={{ fontSize: 36 }}>✈️</span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight blue-text">AVIATOR ELITE</h1>
              <span style={{ fontSize: 36 }}>🚀</span>
            </div>
            <p style={{ color: "#94A3B8" }}>Multiplicadores hasta <span style={{ color: "#FFD700", fontWeight: 700 }}>500x</span> · Retira antes del crash · Retiro automático</p>
          </div>
          <div className="flex gap-4">
            <div className="casino-card rounded-2xl px-5 py-4 text-center" style={{ boxShadow: "0 0 20px rgba(59,130,246,0.1)" }}>
              <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.12em" }}>Saldo</div>
              <div className="text-2xl font-black gold-text">${usuario?.saldo?.toLocaleString() ?? 0}</div>
            </div>
            <div className="casino-card rounded-2xl px-5 py-4 text-center">
              <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.12em" }}>Vuelos</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#60A5FA" }}>{estadisticas.total_vuelos}</div>
            </div>
            <div className="casino-card rounded-2xl px-5 py-4 text-center">
              <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.12em" }}>Récord</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#FFD700" }}>{estadisticas.multiplicador_record.toFixed(2)}x</div>
            </div>
          </div>
        </div>
      </div>

      {/* Historial público de crashes rápidos */}
      {historialPublico.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap", fontWeight: 700 }}>Últimos crashes:</span>
            {historialPublico.slice(0, 15).map((h) => (
              <div key={h.id} style={{
                padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0,
                background: h.multiplicador < 2 ? "rgba(239,68,68,0.15)" : h.multiplicador < 5 ? "rgba(59,130,246,0.15)" : "rgba(34,197,94,0.15)",
                border: `1px solid ${h.multiplicador < 2 ? "rgba(239,68,68,0.4)" : h.multiplicador < 5 ? "rgba(59,130,246,0.4)" : "rgba(34,197,94,0.4)"}`,
                fontSize: 11, fontWeight: 700,
                color: h.multiplicador < 2 ? "#FCA5A5" : h.multiplicador < 5 ? "#93C5FD" : "#86EFAC",
              }}>
                {h.multiplicador.toFixed(2)}x
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* === PANEL PRINCIPAL === */}
          <div className="xl:col-span-2 space-y-5">

            {/* Escena de vuelo */}
            <div className="casino-card rounded-3xl p-5" style={{ boxShadow: "0 0 40px rgba(59,130,246,0.08)" }}>
              {renderEscenaPrincipal()}

              {/* Métricas rápidas */}
              <div className="grid grid-cols-4 gap-3 mt-5">
                {[
                  { label: "Multiplicador", val: `${multiplicadorActual.toFixed(2)}x`, color: multColor },
                  { label: "Tiempo", val: formatearTiempo(tiempoTranscurrido), color: "#E2E8F0" },
                  { label: "Apuesta", val: `$${apuestaActual > 0 ? money0(apuestaActual) : "0"}`, color: "#FFD700" },
                  { label: "Ganancia", val: `$${ganancia > 0 ? ganancia.toFixed(2) : "0.00"}`, color: ganancia > 0 ? "#4ADE80" : "#475569" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{
                    padding: "12px 8px", borderRadius: 12, textAlign: "center",
                    background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)"
                  }}>
                    <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel de apuestas */}
            {estado === "esperando" && (
              <div className="casino-card rounded-3xl p-6" style={{ boxShadow: "0 0 20px rgba(59,130,246,0.08)" }}>
                <h3 className="text-sm font-black blue-text uppercase tracking-widest mb-5 text-center">💰 Selecciona tu Apuesta</h3>
                <div className="flex gap-3 justify-center flex-wrap mb-6">
                  {apuestasPermitidas.map((apuesta) => (
                    <button
                      key={apuesta}
                      onClick={() => setApuestaSeleccionada(apuesta)}
                      disabled={usuario.saldo < apuesta}
                      style={{
                        padding: "10px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, transition: "all 0.15s", cursor: usuario.saldo < apuesta ? "not-allowed" : "pointer",
                        background: apuestaSeleccionada === apuesta ? "linear-gradient(135deg, #1d4ed8, #4f46e5)" : "rgba(255,255,255,0.04)",
                        border: apuestaSeleccionada === apuesta ? "2px solid rgba(96,165,250,0.8)" : "2px solid rgba(59,130,246,0.15)",
                        color: apuestaSeleccionada === apuesta ? "white" : usuario.saldo < apuesta ? "#374151" : "#94A3B8",
                        boxShadow: apuestaSeleccionada === apuesta ? "0 0 20px rgba(59,130,246,0.3)" : "none",
                        opacity: usuario.saldo < apuesta ? 0.4 : 1,
                        transform: apuestaSeleccionada === apuesta ? "scale(1.05)" : "scale(1)",
                      }}
                    >
                      ${money0(apuesta)}
                    </button>
                  ))}
                </div>

                {/* Auto-retiro */}
                <div style={{ padding: "16px 20px", borderRadius: 16, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(59,130,246,0.15)", marginBottom: 20 }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 18 }}>⚡</span>
                      <span style={{ fontWeight: 700, color: "#E2E8F0", fontSize: 14 }}>Retiro Automático</span>
                    </div>
                    <button
                      onClick={() => setAutoRetiroActivo(!autoRetiroActivo)}
                      style={{
                        padding: "6px 16px", borderRadius: 999, fontWeight: 700, fontSize: 12, cursor: "pointer", border: "none",
                        background: autoRetiroActivo ? "linear-gradient(135deg,#065f46,#047857)" : "rgba(55,65,81,0.6)",
                        color: autoRetiroActivo ? "#86EFAC" : "#6B7280",
                        boxShadow: autoRetiroActivo ? "0 0 15px rgba(34,197,94,0.3)" : "none",
                        transition: "all 0.2s",
                      }}
                    >
                      {autoRetiroActivo ? "✓ ACTIVADO" : "DESACTIVADO"}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 10 }}>
                    Retirar automáticamente en: <span style={{ color: "#FFD700", fontWeight: 700, fontSize: 15 }}>{multiplicadorAuto.toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min="1.1" max="100" step="0.1" value={multiplicadorAuto}
                      onChange={e => setMultiplicadorAuto(parseFloat(e.target.value))}
                      style={{ flex: 1, height: 6, borderRadius: 3, accentColor: "#3B82F6", cursor: "pointer" }}
                    />
                    <div style={{
                      padding: "6px 14px", borderRadius: 10, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
                      fontWeight: 700, color: "#93C5FD", fontSize: 14, minWidth: 60, textAlign: "center"
                    }}>
                      {multiplicadorAuto.toFixed(1)}x
                    </div>
                  </div>
                </div>

                {/* Botón principal */}
                <button
                  onClick={iniciarVuelo}
                  disabled={cargando || usuario.saldo < apuestaSeleccionada}
                  className={cargando || usuario.saldo < apuestaSeleccionada ? "" : "start-btn"}
                  style={{
                    width: "100%", padding: "20px", borderRadius: 16, fontWeight: 900, fontSize: 20, letterSpacing: "0.05em",
                    cursor: cargando || usuario.saldo < apuestaSeleccionada ? "not-allowed" : "pointer", border: "none",
                    background: cargando || usuario.saldo < apuestaSeleccionada
                      ? "rgba(30,41,59,0.6)"
                      : "linear-gradient(135deg, #1d4ed8, #4f46e5, #7c3aed)",
                    color: cargando || usuario.saldo < apuestaSeleccionada ? "#475569" : "white",
                    transition: "all 0.2s",
                  }}
                >
                  {cargando ? "🔄 Preparando vuelo..." : `✈️ INICIAR VUELO · $${money0(apuestaSeleccionada)}`}
                </button>
              </div>
            )}

            {/* Botones de acción durante el vuelo */}
            {estado === "vuelo" && (
              <div className="casino-card rounded-3xl p-5">
                <div style={{ textAlign: "center", fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12, fontWeight: 700 }}>
                  ¡Actúa ahora!
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => hacerCashout(multiplicadorActual)}
                    disabled={cargando}
                    className={cargando ? "" : "cashout-btn"}
                    style={{
                      flex: 1, padding: "20px", borderRadius: 16, fontWeight: 900, fontSize: 22, letterSpacing: "0.03em",
                      cursor: cargando ? "not-allowed" : "pointer", border: "2px solid rgba(34,197,94,0.6)",
                      background: cargando ? "rgba(20,30,20,0.5)" : "linear-gradient(135deg, #064e3b, #065f46, #047857)",
                      color: cargando ? "#374151" : "white",
                    }}
                  >
                    💰 RETIRAR ({multiplicadorActual.toFixed(2)}x)
                    {apuestaActual > 0 && (
                      <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 400, marginTop: 4 }}>
                        ≈ ${(apuestaActual * multiplicadorActual).toFixed(2)}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={configurarAutoretiro}
                    disabled={cargando}
                    style={{
                      padding: "20px 20px", borderRadius: 16, fontWeight: 900, fontSize: 14, cursor: "pointer",
                      border: autoRetiroActivo ? "2px solid rgba(234,179,8,0.6)" : "2px solid rgba(255,255,255,0.1)",
                      background: autoRetiroActivo ? "rgba(78,63,0,0.6)" : "rgba(15,23,42,0.6)",
                      color: autoRetiroActivo ? "#FDE68A" : "#6B7280",
                      boxShadow: autoRetiroActivo ? "0 0 20px rgba(234,179,8,0.3)" : "none",
                      minWidth: 100, textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 20 }}>⚡</div>
                    <div>AUTO</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{multiplicadorAuto.toFixed(1)}x</div>
                  </button>
                </div>
              </div>
            )}

            {/* Resultado post-vuelo */}
            {(estado === "cashout" || estado === "explosion") && (
              <div className="casino-card rounded-3xl p-6" style={{
                border: estado === "cashout" ? "2px solid rgba(34,197,94,0.4)" : "2px solid rgba(239,68,68,0.4)",
                boxShadow: estado === "cashout" ? "0 0 40px rgba(34,197,94,0.15)" : "0 0 40px rgba(239,68,68,0.15)",
                textAlign: "center"
              }}>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div style={{ padding: "16px", borderRadius: 14, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Crash</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#FCA5A5" }}>{multiplicadorCrash?.toFixed(2)}x</div>
                  </div>
                  <div style={{ padding: "16px", borderRadius: 14, background: estado === "cashout" ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)", border: `1px solid ${estado === "cashout" ? "rgba(34,197,94,0.3)" : "rgba(100,116,139,0.2)"}` }}>
                    <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tu Retiro</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: estado === "cashout" ? "#86EFAC" : "#94A3B8" }}>
                      {multiplicadorRetiro ? `${multiplicadorRetiro.toFixed(2)}x` : "—"}
                    </div>
                  </div>
                </div>
                {estado === "cashout" && (
                  <div style={{ marginBottom: 20, fontSize: 28, fontWeight: 900, color: "#4ADE80", textShadow: "0 0 20px #4ADE80" }}>
                    +${ganancia.toFixed(2)} ganados ✈️
                  </div>
                )}
                <button
                  onClick={reiniciarJuego}
                  style={{
                    width: "100%", padding: "18px", borderRadius: 14, fontWeight: 900, fontSize: 18, cursor: "pointer",
                    background: "linear-gradient(135deg, #1d4ed8, #4f46e5, #7c3aed)",
                    border: "2px solid rgba(96,165,250,0.4)", color: "white",
                    boxShadow: "0 0 30px rgba(59,130,246,0.3)",
                  }}
                >
                  ✈️ NUEVO VUELO
                </button>
              </div>
            )}
          </div>

          {/* === PANEL LATERAL === */}
          <div className="space-y-5">

            {/* Estadísticas */}
            <div className="casino-card rounded-2xl p-5" style={{ boxShadow: "0 0 20px rgba(59,130,246,0.06)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black blue-text uppercase tracking-widest">📊 Estadísticas</h3>
                <div className="flex gap-1">
                  <button onClick={recalcularStatsSoloUltima} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 9, background: "rgba(29,78,216,0.2)", border: "1px solid rgba(59,130,246,0.3)", color: "#93C5FD", cursor: "pointer", fontWeight: 700 }}>↻ Última</button>
                  <button onClick={restablecerEstadisticas} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 9, background: "rgba(127,29,29,0.2)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", cursor: "pointer", fontWeight: 700 }}>✕</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Vuelos", val: estadisticas.total_vuelos, color: "#60A5FA" },
                  { label: "Ganados", val: estadisticas.vuelos_ganados, color: "#4ADE80" },
                  { label: "Perdidos", val: estadisticas.vuelos_perdidos, color: "#F87171" },
                  {
                    label: "Win Rate", color: "#FFD700",
                    val: estadisticas.total_vuelos > 0 ? `${((estadisticas.vuelos_ganados / estadisticas.total_vuelos) * 100).toFixed(1)}%` : "0%"
                  },
                  {
                    label: "Balance", color: estadisticas.balance >= 0 ? "#4ADE80" : "#F87171",
                    val: `${estadisticas.balance >= 0 ? "+" : ""}$${estadisticas.balance.toFixed(0)}`
                  },
                  { label: "Récord", val: `${estadisticas.multiplicador_record.toFixed(2)}x`, color: "#FFD700" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ padding: "12px 8px", borderRadius: 12, textAlign: "center", background: "rgba(0,0,0,0.4)", border: `1px solid ${color}20` }}>
                    <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
                  </div>
                ))}
              </div>
              {estadisticas.total_vuelos > 0 && (
                <div style={{ marginTop: 12, padding: "10px", borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 11, color: "#64748B" }}>Total Ganado</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#4ADE80" }}>${estadisticas.ganancia_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ fontSize: 11, color: "#64748B" }}>Total Perdido</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#F87171" }}>${estadisticas.perdida_total.toFixed(2)}</span>
                  </div>
                  {lastUpdatedAt && <div style={{ fontSize: 9, color: "#374151", textAlign: "center", marginTop: 6 }}>Actualizado: {lastUpdatedAt}</div>}
                </div>
              )}
            </div>

            {/* Historial personal */}
            <div className="casino-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black blue-text uppercase tracking-widest">📜 Tus Vuelos</h3>
                {historial.length > 0 && (
                  <button onClick={limpiarHistorial} style={{ fontSize: 11, color: "#F87171", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Limpiar</button>
                )}
              </div>
              {historial.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0" }}>
                  <div style={{ fontSize: 36, opacity: 0.2 }}>✈️</div>
                  <div style={{ color: "#374151", fontSize: 13, marginTop: 8 }}>Sin vuelos aún</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-av pr-1">
                  {historial.map((vuelo, i) => (
                    <div key={vuelo.id} style={{
                      padding: "12px", borderRadius: 10,
                      background: vuelo.ganancia > 0 ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.06)",
                      border: `1px solid ${vuelo.ganancia > 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)"}`,
                      opacity: i === 0 ? 1 : 0.85,
                    }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: vuelo.ganancia > 0 ? "#4ADE80" : "#F87171" }}>
                            {vuelo.resultado === "cashout" ? "💰 Retirado" : "💥 Crash"}
                          </div>
                          <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>
                            {vuelo.fecha} · Apuesta ${money0(vuelo.apuesta)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: vuelo.ganancia > 0 ? "#4ADE80" : "#F87171" }}>
                            {vuelo.ganancia > 0 ? `+$${vuelo.ganancia.toFixed(2)}` : `-$${money0(vuelo.apuesta)}`}
                          </div>
                          <div style={{ fontSize: 10, color: "#64748B" }}>
                            {vuelo.multiplicador_retiro ? `${vuelo.multiplicador_retiro.toFixed(2)}x ✓` : `Crash ${vuelo.multiplicador_crash.toFixed(2)}x`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="casino-card rounded-2xl p-5" style={{ border: "1px solid rgba(59,130,246,0.15)" }}>
              <h4 className="text-sm font-black blue-text uppercase tracking-widest mb-4">💡 Cómo Jugar</h4>
              <div className="space-y-2">
                {[
                  "Elige tu apuesta y lanza el vuelo",
                  "El multiplicador sube desde 1x",
                  "Retira antes de que explote",
                  "Cuanto más esperes, más ganas... o pierdes todo",
                  "El retiro automático te protege",
                  "Multiplicadores hasta 500x posibles",
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-2" style={{ fontSize: 12, color: "#94A3B8" }}>
                    <span style={{ color: "#3B82F6", fontWeight: 900, flexShrink: 0 }}>{i + 1}.</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
