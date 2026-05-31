import React, { useState, useEffect } from "react";
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

interface Carta {
  valor: number;
  nombre: string;
  palo: string;
}

interface HistorialPartida {
  id: number;
  resultado: string;
  ganancia: number;
  fecha: string;
  apuesta: number;
  puntajeJugador: number;
  puntajeBanca: number;
}

type EstadoJuego = "esperando" | "jugando" | "turno_banca" | "terminado";

export default function Blackjack() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [manoJugador, setManoJugador] = useState<Carta[]>([]);
  const [manoBanca, setManoBanca] = useState<Carta[]>([]);
  const [puntajeJugador, setPuntajeJugador] = useState<number>(0);
  const [puntajeBanca, setPuntajeBanca] = useState<number>(0);
  const [mensaje, setMensaje] = useState<string>("");
  const [estado, setEstado] = useState<EstadoJuego>("esperando");
  const [cargando, setCargando] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ganancia, setGanancia] = useState<number>(0);
  const [mostrarCartaBancaOculta, setMostrarCartaBancaOculta] = useState(false);

  const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(500);
  const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([100, 500, 1000, 2000, 5000]);
  const [apuestaActual, setApuestaActual] = useState<number>(0);

  const [historial, setHistorial] = useState<HistorialPartida[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    totalPartidas: 0, gananciaTotal: 0, gastoTotal: 0, balance: 0, partidasGanadas: 0, blackjacksObtenidos: 0,
  });
  const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({
    totalPartidasAcum: 0, gananciaTotalAcum: 0, gastoTotalAcum: 0, partidasGanadasAcum: 0, blackjacksObtenidosAcum: 0,
  });

  const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    if (!usuario) {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      const u = localStorage.getItem("usuario");
      if (u) try { setUsuario(JSON.parse(u)); } catch {}
    }
  }, [navigate, usuario]);

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const res = await axios.get(`${API_URL}/juegos/blackjack/juegos/blackjack/apuestas-permitidas`);
        setApuestasPermitidas(res.data.apuestas_permitidas);
        setApuestaSeleccionada(res.data.apuestas_permitidas[1] || 500);
      } catch {}
    };
    cargarConfiguracion();
  }, []);

  useEffect(() => {
    const h = localStorage.getItem("historial_blackjack");
    if (h) setHistorial(JSON.parse(h));
    const s = localStorage.getItem("estadisticas_acumulativas_blackjack");
    if (s) {
      const p = JSON.parse(s);
      setEstadisticasAcumulativas(p);
      setEstadisticas({
        totalPartidas: p.totalPartidasAcum, gananciaTotal: p.gananciaTotalAcum, gastoTotal: p.gastoTotalAcum,
        balance: p.gananciaTotalAcum - p.gastoTotalAcum, partidasGanadas: p.partidasGanadasAcum, blackjacksObtenidos: p.blackjacksObtenidosAcum,
      });
    }
  }, []);

  useEffect(() => {
    if (historial.length > 0) localStorage.setItem("historial_blackjack", JSON.stringify(historial.slice(0, 10)));
  }, [historial]);

  useEffect(() => {
    if (estadisticasAcumulativas.totalPartidasAcum > 0)
      localStorage.setItem("estadisticas_acumulativas_blackjack", JSON.stringify(estadisticasAcumulativas));
  }, [estadisticasAcumulativas]);

  const actualizarEstadisticas = (nuevaPartida: HistorialPartida) => {
    const esVictoria = nuevaPartida.resultado.includes("Ganaste") || nuevaPartida.resultado.includes("Blackjack");
    const esBlackjack = nuevaPartida.resultado.includes("Blackjack");
    setEstadisticasAcumulativas(prev => ({
      totalPartidasAcum: prev.totalPartidasAcum + 1,
      gananciaTotalAcum: prev.gananciaTotalAcum + (nuevaPartida.ganancia || 0),
      gastoTotalAcum: prev.gastoTotalAcum + nuevaPartida.apuesta,
      partidasGanadasAcum: prev.partidasGanadasAcum + (esVictoria ? 1 : 0),
      blackjacksObtenidosAcum: prev.blackjacksObtenidosAcum + (esBlackjack ? 1 : 0),
    }));
    setEstadisticas(prev => {
      const gT = prev.gananciaTotal + (nuevaPartida.ganancia || 0);
      const gsT = prev.gastoTotal + nuevaPartida.apuesta;
      return {
        totalPartidas: prev.totalPartidas + 1, gananciaTotal: gT, gastoTotal: gsT, balance: gT - gsT,
        partidasGanadas: prev.partidasGanadas + (esVictoria ? 1 : 0),
        blackjacksObtenidos: prev.blackjacksObtenidos + (esBlackjack ? 1 : 0),
      };
    });
  };

  const agregarAlHistorial = (resultado: string, ganancia: number, apuesta: number, pj: number, pb: number) => {
    const nueva: HistorialPartida = {
      id: Date.now(), resultado, ganancia, apuesta, puntajeJugador: pj, puntajeBanca: pb,
      fecha: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const nuevo = [nueva, ...historial.slice(0, 9)];
    setHistorial(nuevo);
    actualizarEstadisticas(nueva);
  };

  const animarConfetti = (tipo: "victoria" | "blackjack") => {
    if (tipo === "blackjack") {
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ["#DAA520", "#FFD700", "#FFA500"] });
      setTimeout(() => {
        confetti({ particleCount: 150, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 150, angle: 120, spread: 55, origin: { x: 1 } });
      }, 300);
    } else {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#22C55E", "#16A34A", "#FFD700"] });
    }
  };

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotificacion({ text, type });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const iniciarJuego = async () => {
    if (!usuario) return showMsg("Debes iniciar sesión.", "error");
    if (usuario.saldo < apuestaSeleccionada) return showMsg(`Saldo insuficiente. Necesitas $${apuestaSeleccionada}.`, "error");
    setCargando(true); setMensaje(""); setManoJugador([]); setManoBanca([]);
    setPuntajeJugador(0); setPuntajeBanca(0); setGanancia(0); setMostrarCartaBancaOculta(false); setApuestaActual(apuestaSeleccionada);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/blackjack/juegos/blackjack/iniciar?apuesta=${apuestaSeleccionada}`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      setManoJugador(res.data.mano_jugador); setManoBanca(res.data.mano_banca);
      setPuntajeJugador(res.data.puntaje_jugador); setPuntajeBanca(res.data.puntaje_banca_visible);
      setSessionId(res.data.session_id); setEstado("jugando");
      setUsuario(prev => prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev);
      if (res.data.jugador_blackjack) await finalizarJuego();
    } catch (e: any) {
      setMensaje(e.response?.data?.detail || "Error al iniciar.");
      setEstado("esperando");
    } finally { setCargando(false); }
  };

  const pedirCarta = async () => {
    if (!sessionId || estado !== "jugando") return;
    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/blackjack/juegos/blackjack/${sessionId}/pedir-carta`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      setManoJugador(res.data.mano_jugador); setPuntajeJugador(res.data.puntaje_jugador);
      if (res.data.jugador_se_paso) {
        setEstado("terminado"); setMensaje(res.data.resultado); setGanancia(res.data.ganancia);
        setMostrarCartaBancaOculta(true); setPuntajeBanca(res.data.puntaje_banca_final); setManoBanca(res.data.mano_banca_final);
        setUsuario(prev => prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev);
        agregarAlHistorial(res.data.resultado, res.data.ganancia, apuestaActual, res.data.puntaje_jugador, res.data.puntaje_banca_final);
      }
    } catch (e: any) { setMensaje(e.response?.data?.detail || "Error al pedir carta."); }
    finally { setCargando(false); }
  };

  const plantarse = async () => {
    if (!sessionId || estado !== "jugando") return;
    await finalizarJuego();
  };

  const finalizarJuego = async () => {
    if (!sessionId) return;
    setCargando(true); setEstado("turno_banca"); setMostrarCartaBancaOculta(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/blackjack/juegos/blackjack/${sessionId}/plantarse`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      setManoBanca(res.data.mano_banca_inicial); setPuntajeBanca(res.data.puntaje_banca_inicial);
      setTimeout(() => {
        setManoBanca(res.data.mano_banca_final); setPuntajeBanca(res.data.puntaje_banca_final);
        setMensaje(res.data.resultado); setGanancia(res.data.ganancia); setEstado("terminado");
        setUsuario(prev => prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev);
        if (res.data.resultado.includes("Blackjack")) animarConfetti("blackjack");
        else if (res.data.resultado.includes("Ganaste")) animarConfetti("victoria");
        agregarAlHistorial(res.data.resultado, res.data.ganancia, apuestaActual, res.data.puntaje_jugador, res.data.puntaje_banca_final);
      }, 1500);
    } catch (e: any) {
      setMensaje(e.response?.data?.detail || "Error al finalizar.");
      setEstado("esperando");
    } finally { setCargando(false); }
  };

  const reiniciarJuego = () => {
    setEstado("esperando"); setSessionId(null); setManoJugador([]); setManoBanca([]);
    setPuntajeJugador(0); setPuntajeBanca(0); setMensaje(""); setGanancia(0);
    setMostrarCartaBancaOculta(false); setApuestaActual(0);
  };

  const limpiarHistorial = () => {
    setHistorial([]); localStorage.removeItem("historial_blackjack");
    setEstadisticas({
      totalPartidas: estadisticasAcumulativas.totalPartidasAcum,
      gananciaTotal: estadisticasAcumulativas.gananciaTotalAcum,
      gastoTotal: estadisticasAcumulativas.gastoTotalAcum,
      balance: estadisticasAcumulativas.gananciaTotalAcum - estadisticasAcumulativas.gastoTotalAcum,
      partidasGanadas: estadisticasAcumulativas.partidasGanadasAcum,
      blackjacksObtenidos: estadisticasAcumulativas.blackjacksObtenidosAcum,
    });
    showMsg("Historial limpiado", "info");
  };

  const limpiarTodasEstadisticas = () => {
    setHistorial([]); localStorage.removeItem("historial_blackjack"); localStorage.removeItem("estadisticas_acumulativas_blackjack");
    const zero = { totalPartidas: 0, gananciaTotal: 0, gastoTotal: 0, balance: 0, partidasGanadas: 0, blackjacksObtenidos: 0 };
    setEstadisticas(zero);
    setEstadisticasAcumulativas({ totalPartidasAcum: 0, gananciaTotalAcum: 0, gastoTotalAcum: 0, partidasGanadasAcum: 0, blackjacksObtenidosAcum: 0 });
    showMsg("Estadísticas reiniciadas", "info");
  };

  const renderCarta = (carta: Carta, oculta = false, idx = 0, esJugador = false) => {
    if (oculta) {
      return (
        <div key={idx} style={{
          width: 68, height: 96, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(135deg, #1e3a8a, #1d4ed8, #1e3a8a)",
          border: "2px solid rgba(96,165,250,0.5)",
          boxShadow: "0 8px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `rotate(${idx % 2 === 0 ? -2 : 2}deg)`,
        }}>
          <div style={{
            width: 52, height: 78, borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 8px)"
          }}>
            <span style={{ fontSize: 24, opacity: 0.5, color: "#93C5FD" }}>?</span>
          </div>
        </div>
      );
    }

    const isRed = carta.palo === "♥️" || carta.palo === "♦️" || carta.palo === "♥" || carta.palo === "♦";
    const suitColor = isRed ? "#DC2626" : "#111827";
    const glowColor = esJugador
      ? puntajeJugador === 21 ? "rgba(234,179,8,0.3)" : puntajeJugador > 21 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.15)"
      : "rgba(218,165,32,0.1)";

    return (
      <div
        key={idx}
        style={{
          width: 68, height: 96, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(135deg, #ffffff, #f0f4f8)",
          border: esJugador
            ? puntajeJugador === 21 ? "2px solid rgba(234,179,8,0.6)" : puntajeJugador > 21 ? "2px solid rgba(239,68,68,0.5)" : "2px solid rgba(34,197,94,0.4)"
            : "2px solid rgba(218,165,32,0.4)",
          boxShadow: `0 10px 24px rgba(0,0,0,0.5), 0 0 12px ${glowColor}`,
          display: "flex", flexDirection: "column", padding: "5px 6px",
          transform: `rotate(${idx % 2 === 0 ? -1.5 : 1.5}deg)`,
          transition: "transform 0.2s, box-shadow 0.2s",
          cursor: "default",
          animation: `cardDeal 0.4s cubic-bezier(0.34,1.56,0.64,1) ${idx * 0.1}s both`,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = "rotate(0deg) translateY(-8px) scale(1.1)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 40px rgba(0,0,0,0.7), 0 0 24px ${glowColor}`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = `rotate(${idx % 2 === 0 ? -1.5 : 1.5}deg)`;
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 10px 24px rgba(0,0,0,0.5), 0 0 12px ${glowColor}`;
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 900, color: suitColor, lineHeight: 1 }}>{carta.nombre}</div>
        <div style={{ fontSize: 12, color: suitColor, lineHeight: 1 }}>{carta.palo}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 26, color: suitColor }}>{carta.palo}</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 900, color: suitColor, lineHeight: 1, alignSelf: "flex-end", transform: "rotate(180deg)" }}>{carta.nombre}</div>
      </div>
    );
  };

  const ScoreBadge = ({ score, label, isPlayer }: { score: number; label: string; isPlayer?: boolean }) => {
    const is21 = score === 21;
    const isBust = score > 21;
    const color = is21 ? "#EAB308" : isBust ? "#EF4444" : isPlayer ? "#4ADE80" : "#F87171";
    const bg = is21 ? "rgba(234,179,8,0.15)" : isBust ? "rgba(239,68,68,0.15)" : isPlayer ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
    const border = is21 ? "rgba(234,179,8,0.5)" : isBust ? "rgba(239,68,68,0.5)" : isPlayer ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.3)";
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, background: bg, border: `1px solid ${border}`, boxShadow: is21 ? "0 0 20px rgba(234,179,8,0.3)" : "none" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1, textShadow: is21 ? "0 0 12px rgba(234,179,8,0.6)" : "none" }}>
          {score > 0 ? score : "—"}
        </span>
        {is21 && <span style={{ fontSize: 14 }}>⭐</span>}
        {isBust && <span style={{ fontSize: 14 }}>💥</span>}
      </div>
    );
  };

  const isWin = mensaje.includes("Ganaste") || mensaje.includes("Blackjack");
  const isDraw = mensaje.includes("Empate");

  if (!usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at center, #001a0a 0%, #07100a 100%)" }}>
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ boxShadow: "0 0 30px #DAA520" }} />
          <p className="font-bold tracking-widest" style={{ color: "#DAA520" }}>CARGANDO BLACKJACK...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #001a0a 0%, #070f07 50%, #0a0a05 100%)" }}>
      <style>{`
        @keyframes shimmerGold {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes shimmerGreen {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes floatUp {
          0% { opacity:0; transform:translateY(20px); }
          100% { opacity:1; transform:translateY(0); }
        }
        @keyframes cardDeal {
          0% { opacity:0; transform:translateY(-50px) scale(0.7) rotate(-5deg); }
          100% { opacity:1; }
        }
        @keyframes resultReveal {
          0% { opacity:0; transform:scale(0.7); }
          60% { transform:scale(1.05); }
          100% { opacity:1; transform:scale(1); }
        }
        @keyframes pulseGreen {
          0%, 100% { box-shadow: 0 0 15px rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 40px rgba(34,197,94,0.8), 0 0 60px rgba(218,165,32,0.2); }
        }
        @keyframes pulseBlue {
          0%, 100% { box-shadow: 0 0 15px rgba(59,130,246,0.4); }
          50% { box-shadow: 0 0 40px rgba(59,130,246,0.8); }
        }
        @keyframes pulseRed {
          0%, 100% { box-shadow: 0 0 15px rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 35px rgba(239,68,68,0.7); }
        }
        @keyframes bancaThink {
          0%, 100% { opacity:0.6; transform:scale(1); }
          50% { opacity:1; transform:scale(1.05); }
        }
        .gold-text {
          background: linear-gradient(90deg, #DAA520, #FFD700, #FFA500, #FFD700, #DAA520);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerGold 3s linear infinite;
        }
        .green-text {
          background: linear-gradient(90deg, #16A34A, #22C55E, #4ADE80, #22C55E, #16A34A);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerGreen 3s linear infinite;
        }
        .casino-card {
          background: linear-gradient(135deg, rgba(0,20,5,0.97), rgba(5,15,5,0.99));
          border: 1px solid rgba(34,197,94,0.15);
          backdrop-filter: blur(10px);
        }
        .felt-table {
          background: radial-gradient(ellipse at center, #0d5c2e 0%, #074020 55%, #042a14 100%);
          border: 3px solid #DAA520;
          box-shadow: inset 0 0 80px rgba(0,0,0,0.5), 0 0 40px rgba(218,165,32,0.1);
        }
        .float-up { animation: floatUp 0.4s ease-out forwards; }
        .result-reveal { animation: resultReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .action-btn {
          transition: all 0.15s ease; cursor: pointer; font-weight: 900;
          letter-spacing: 0.05em; border: none; color: white; border-radius: 14px;
          font-size: 15px; text-transform: uppercase;
        }
        .action-btn:hover:not(:disabled) { transform: translateY(-3px) scale(1.03); filter: brightness(1.15); }
        .action-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
        .action-btn:disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(0.5); }
        .scrollbar-bj::-webkit-scrollbar { width: 4px; }
        .scrollbar-bj::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .scrollbar-bj::-webkit-scrollbar-thumb { background: #DAA520; border-radius: 2px; }
        .chip-btn {
          transition: all 0.15s; cursor: pointer; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 12px; border: 3px solid;
          width: 64px; height: 64px; flex-shrink: 0;
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.1), 0 6px 16px rgba(0,0,0,0.4);
        }
        .chip-btn:hover:not(:disabled) { transform: translateY(-4px) scale(1.08); filter: brightness(1.2); }
        .chip-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>

      {/* Notificación */}
      {notificacion && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center gap-3 shadow-2xl float-up`}
          style={{
            background: notificacion.type === "success" ? "linear-gradient(135deg,#14532d,#166534)" : notificacion.type === "error" ? "linear-gradient(135deg,#7f1d1d,#991b1b)" : "linear-gradient(135deg,#14532d,#065f46)",
            border: `1px solid ${notificacion.type === "success" ? "rgba(34,197,94,0.5)" : notificacion.type === "error" ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.4)"}`,
            color: notificacion.type === "success" ? "#86efac" : notificacion.type === "error" ? "#fca5a5" : "#6ee7b7",
          }}>
          <span style={{ fontSize: 20 }}>{notificacion.type === "success" ? "✅" : notificacion.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{notificacion.text}</span>
        </div>
      )}

      <Header usuario={usuario} cerrarSesion={() => { localStorage.clear(); navigate("/login"); }} setUsuario={setUsuario} />

      {/* Hero Banner */}
      <div className="relative overflow-hidden py-7 px-4" style={{ borderBottom: "1px solid rgba(34,197,94,0.15)", background: "radial-gradient(ellipse at center, rgba(34,197,94,0.05) 0%, transparent 70%)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span style={{ fontSize: 36 }}>♠️</span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight green-text">BLACKJACK VIP</h1>
              <span style={{ fontSize: 36 }}>♣️</span>
            </div>
            <p style={{ color: "#6B7280" }}>
              Gana <span style={{ color: "#FFD700", fontWeight: 700 }}>2.5x</span> con Blackjack natural · Apuesta desde{" "}
              <span style={{ color: "#4ADE80", fontWeight: 700 }}>${apuestasPermitidas[0]?.toLocaleString() ?? 100}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <div className="casino-card rounded-2xl px-5 py-4 text-center" style={{ boxShadow: "0 0 20px rgba(34,197,94,0.1)" }}>
              <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Saldo</div>
              <div className="text-2xl font-black gold-text">${usuario?.saldo?.toLocaleString() ?? 0}</div>
            </div>
            {apuestaActual > 0 && (
              <div className="casino-card rounded-2xl px-5 py-4 text-center" style={{ boxShadow: "0 0 20px rgba(34,197,94,0.1)" }}>
                <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Apuesta</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#4ADE80" }}>${apuestaActual.toLocaleString()}</div>
              </div>
            )}
            <div className="casino-card rounded-2xl px-5 py-4 text-center">
              <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>BJ</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#FFD700" }}>{estadisticas.blackjacksObtenidos}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* === MESA PRINCIPAL === */}
          <div className="xl:col-span-2 space-y-5">

            {/* Selector de apuesta */}
            {estado === "esperando" && (
              <div className="casino-card rounded-3xl p-6" style={{ boxShadow: "0 0 30px rgba(34,197,94,0.08)" }}>
                <h2 className="text-xl font-black green-text uppercase tracking-widest mb-6 text-center">♠️ Configura tu Apuesta</h2>

                {/* Fichas de casino */}
                <div className="flex flex-wrap gap-4 justify-center mb-6">
                  {apuestasPermitidas.map((apuesta, i) => {
                    const chips = [
                      { bg: "#7f1d1d", border: "#DC2626", text: "#FCA5A5" },
                      { bg: "#0c4a6e", border: "#0284C7", text: "#7DD3FC" },
                      { bg: "#14532d", border: "#16A34A", text: "#86EFAC" },
                      { bg: "#1e1b4b", border: "#6D28D9", text: "#C4B5FD" },
                      { bg: "#78350f", border: "#D97706", text: "#FDE68a" },
                    ];
                    const chip = chips[i % chips.length];
                    const sel = apuestaSeleccionada === apuesta;
                    const disabled = usuario.saldo < apuesta;
                    return (
                      <div key={apuesta} className="flex flex-col items-center gap-2">
                        <button
                          onClick={() => setApuestaSeleccionada(apuesta)}
                          disabled={disabled}
                          className="chip-btn"
                          style={{
                            background: sel ? chip.border : chip.bg,
                            borderColor: chip.border,
                            color: sel ? "white" : chip.text,
                            boxShadow: sel ? `inset 0 2px 4px rgba(255,255,255,0.2), 0 6px 20px rgba(0,0,0,0.5), 0 0 20px ${chip.border}60` : `inset 0 2px 4px rgba(255,255,255,0.06), 0 6px 14px rgba(0,0,0,0.4)`,
                            transform: sel ? "translateY(-6px) scale(1.12)" : "scale(1)",
                          }}
                        >
                          ${apuesta >= 1000 ? `${apuesta / 1000}K` : apuesta}
                        </button>
                        {sel && <div style={{ width: 6, height: 6, borderRadius: "50%", background: chip.border, boxShadow: `0 0 8px ${chip.border}` }} />}
                      </div>
                    );
                  })}
                </div>

                {/* Resumen */}
                <div style={{ padding: "14px 24px", borderRadius: 14, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(34,197,94,0.15)", textAlign: "center", marginBottom: 20 }}>
                  <span style={{ color: "#6B7280", fontSize: 12 }}>Apuesta seleccionada: </span>
                  <span style={{ color: "#4ADE80", fontWeight: 900, fontSize: 20 }}>${apuestaSeleccionada.toLocaleString()}</span>
                  <span style={{ color: "#374151", fontSize: 12, marginLeft: 12 }}>· Blackjack paga </span>
                  <span style={{ color: "#FFD700", fontWeight: 700, fontSize: 13 }}>×2.5</span>
                </div>

                <button
                  onClick={iniciarJuego}
                  disabled={cargando || usuario.saldo < apuestaSeleccionada}
                  className="action-btn w-full"
                  style={{
                    padding: "20px", fontSize: 20,
                    background: cargando || usuario.saldo < apuestaSeleccionada
                      ? "rgba(30,50,30,0.4)"
                      : "linear-gradient(135deg, #14532d, #16A34A, #15803d)",
                    border: "3px solid #DAA520",
                    boxShadow: cargando || usuario.saldo < apuestaSeleccionada ? "none" : "0 0 40px rgba(34,197,94,0.3), 0 0 60px rgba(218,165,32,0.1)",
                    color: cargando || usuario.saldo < apuestaSeleccionada ? "#4B5563" : "white",
                    animation: cargando || usuario.saldo < apuestaSeleccionada ? "none" : "pulseGreen 2s ease-in-out infinite",
                  }}
                >
                  {cargando ? "Repartiendo..." : `♠️ NUEVO JUEGO · $${apuestaSeleccionada.toLocaleString()}`}
                </button>
              </div>
            )}

            {/* Mesa de juego */}
            {estado !== "esperando" && (
              <div className="felt-table rounded-3xl p-6 md:p-8">

                {/* Mano de la Banca */}
                <div style={{ marginBottom: 24 }}>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span style={{ fontSize: 16 }}>🎩</span>
                    <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.8)", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>Banca</span>
                    <ScoreBadge score={mostrarCartaBancaOculta ? puntajeBanca : 0} label="" />
                  </div>
                  <div className="flex gap-3 justify-center flex-wrap min-h-[100px] items-center">
                    {manoBanca.length > 0
                      ? manoBanca.map((carta, i) =>
                          renderCarta(carta, !mostrarCartaBancaOculta && i === 1 && estado !== "terminado", i, false)
                        )
                      : <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, letterSpacing: "0.12em" }}>Esperando ronda...</div>
                    }
                  </div>
                </div>

                {/* VS Separador */}
                <div className="flex items-center gap-3 mb-6">
                  <div style={{ flex: 1, height: 1, background: "rgba(218,165,32,0.2)" }} />
                  {estado === "turno_banca" ? (
                    <div style={{
                      padding: "6px 18px", borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em",
                      background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.4)", color: "#FDE68A",
                      animation: "bancaThink 1s ease-in-out infinite",
                    }}>
                      🎲 BANCA JUGANDO...
                    </div>
                  ) : (
                    <div style={{ color: "rgba(218,165,32,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em" }}>VS</div>
                  )}
                  <div style={{ flex: 1, height: 1, background: "rgba(218,165,32,0.2)" }} />
                </div>

                {/* Mano del Jugador */}
                <div>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span style={{ fontSize: 16 }}>🎯</span>
                    <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.8)", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>Tu mano</span>
                    <ScoreBadge score={puntajeJugador} label="" isPlayer />
                  </div>
                  <div className="flex gap-3 justify-center flex-wrap min-h-[100px] items-center">
                    {manoJugador.length > 0
                      ? manoJugador.map((carta, i) => renderCarta(carta, false, i, true))
                      : <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, letterSpacing: "0.12em" }}>Las cartas aparecerán aquí</div>
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Resultado */}
            {estado === "terminado" && mensaje && (
              <div className="result-reveal casino-card rounded-3xl p-8"
                style={{
                  border: isWin ? "2px solid rgba(34,197,94,0.5)" : isDraw ? "2px solid rgba(234,179,8,0.4)" : "2px solid rgba(239,68,68,0.4)",
                  boxShadow: isWin ? "0 0 60px rgba(34,197,94,0.15)" : isDraw ? "0 0 40px rgba(234,179,8,0.1)" : "0 0 40px rgba(239,68,68,0.1)",
                  textAlign: "center",
                }}>
                <div style={{ fontSize: 44, marginBottom: 8 }}>
                  {isWin ? (mensaje.includes("Blackjack") ? "🃏" : "🏆") : isDraw ? "🤝" : "💸"}
                </div>
                <div style={{
                  fontWeight: 900, fontSize: 24, marginBottom: 6,
                  color: isWin ? "#4ADE80" : isDraw ? "#FDE68A" : "#F87171",
                  textShadow: isWin ? "0 0 20px rgba(34,197,94,0.5)" : isDraw ? "0 0 15px rgba(234,179,8,0.4)" : "0 0 15px rgba(239,68,68,0.3)",
                }}>
                  {isWin ? (ganancia > 0 ? `+$${ganancia.toLocaleString()}` : "¡Ganaste!") : isDraw ? "Empate" : "Perdiste"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, marginBottom: 6 }}>{mensaje}</div>
                {isWin && ganancia > 0 && (
                  <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 20 }}>
                    Neto: <span style={{ color: "#4ADE80", fontWeight: 700 }}>+${(ganancia - apuestaActual).toLocaleString()}</span>
                  </div>
                )}
                <button
                  onClick={reiniciarJuego}
                  className="action-btn"
                  style={{
                    padding: "16px 40px", fontSize: 17,
                    background: "linear-gradient(135deg, #14532d, #16A34A)",
                    border: "2px solid #DAA520",
                    boxShadow: "0 0 30px rgba(34,197,94,0.3)",
                  }}
                >
                  ♠️ Jugar de Nuevo
                </button>
              </div>
            )}

            {/* Botones de acción */}
            {(estado === "jugando" || estado === "turno_banca") && (
              <div className="casino-card rounded-3xl p-5" style={{ boxShadow: "0 0 20px rgba(34,197,94,0.06)" }}>
                <div style={{ textAlign: "center", fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14, fontWeight: 700 }}>
                  TU TURNO
                </div>
                {estado === "jugando" ? (
                  <div className="flex gap-4 justify-center">
                    {puntajeJugador < 21 && (
                      <button
                        onClick={pedirCarta}
                        disabled={cargando}
                        className="action-btn flex flex-col items-center"
                        style={{
                          padding: "16px 32px", flex: 1,
                          background: "linear-gradient(135deg, #1d4ed8, #2563EB)",
                          border: "2px solid rgba(96,165,250,0.5)",
                          animation: cargando ? "none" : "pulseBlue 2s ease-in-out infinite",
                        }}
                      >
                        <span style={{ fontSize: 22, marginBottom: 2 }}>🃏</span>
                        <span>PEDIR CARTA</span>
                        <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Hit</span>
                      </button>
                    )}
                    <button
                      onClick={plantarse}
                      disabled={cargando}
                      className="action-btn flex flex-col items-center"
                      style={{
                        padding: "16px 32px", flex: 1,
                        background: "linear-gradient(135deg, #7f1d1d, #991B1B)",
                        border: "2px solid rgba(239,68,68,0.5)",
                        animation: cargando ? "none" : "pulseRed 2s ease-in-out infinite",
                      }}
                    >
                      <span style={{ fontSize: 22, marginBottom: 2 }}>✋</span>
                      <span>PLANTARSE</span>
                      <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Stand</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "16px", borderRadius: 14, background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#FDE68A", animation: "bancaThink 1s ease-in-out infinite" }}>🎲 La banca está jugando...</div>
                    <div style={{ fontSize: 11, color: "#92400E", marginTop: 4 }}>La banca pide cartas hasta 17</div>
                  </div>
                )}

                {/* Score info */}
                {estado === "jugando" && (
                  <div className="flex justify-center gap-4 mt-4">
                    <div style={{ fontSize: 11, color: "#6B7280" }}>
                      Tu puntuación: <span style={{ color: puntajeJugador >= 21 ? "#EF4444" : "#4ADE80", fontWeight: 700 }}>{puntajeJugador}</span>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                    <div style={{ fontSize: 11, color: "#6B7280" }}>
                      Apostado: <span style={{ color: "#FFD700", fontWeight: 700 }}>${apuestaActual.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* === PANEL LATERAL === */}
          <div className="space-y-5">

            {/* Estadísticas */}
            <div className="casino-card rounded-2xl p-5" style={{ boxShadow: "0 0 20px rgba(34,197,94,0.06)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black green-text uppercase tracking-widest">📊 Estadísticas</h3>
                <button onClick={limpiarTodasEstadisticas} style={{ fontSize: 10, color: "#F87171", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Reiniciar</button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { label: "Partidas", val: estadisticas.totalPartidas, color: "#60A5FA" },
                  { label: "Ganadas", val: estadisticas.partidasGanadas, color: "#4ADE80" },
                  { label: "Blackjacks ⭐", val: estadisticas.blackjacksObtenidos, color: "#FFD700" },
                  {
                    label: "Balance", color: estadisticas.balance >= 0 ? "#4ADE80" : "#F87171",
                    val: `${estadisticas.balance >= 0 ? "+" : ""}$${estadisticas.balance}`
                  },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ padding: "12px 8px", borderRadius: 12, textAlign: "center", background: "rgba(0,0,0,0.4)", border: `1px solid ${color}20` }}>
                    <div style={{ fontSize: 9, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 19, fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px", borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: 11, color: "#374151" }}>Win Rate</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#60A5FA" }}>
                    {estadisticas.totalPartidas > 0 ? `${((estadisticas.partidasGanadas / estadisticas.totalPartidas) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 11, color: "#374151" }}>Gasto Total</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#F87171" }}>${estadisticas.gastoTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Historial */}
            <div className="casino-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black green-text uppercase tracking-widest">📜 Historial</h3>
                {historial.length > 0 && (
                  <button onClick={limpiarHistorial} style={{ fontSize: 11, color: "#F87171", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Limpiar</button>
                )}
              </div>
              {historial.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0" }}>
                  <div style={{ fontSize: 36, opacity: 0.15 }}>🃏</div>
                  <div style={{ color: "#374151", fontSize: 13, marginTop: 8 }}>Sin partidas aún</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-bj pr-1">
                  {historial.map((p, i) => {
                    const win = p.resultado.includes("Ganaste") || p.resultado.includes("Blackjack");
                    const draw = p.resultado.includes("Empate");
                    const bj = p.resultado.includes("Blackjack");
                    return (
                      <div key={p.id} style={{
                        padding: "10px 12px", borderRadius: 10,
                        background: win ? "rgba(34,197,94,0.07)" : draw ? "rgba(234,179,8,0.06)" : "rgba(239,68,68,0.06)",
                        border: `1px solid ${win ? "rgba(34,197,94,0.2)" : draw ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.15)"}`,
                        opacity: i === 0 ? 1 : 0.82,
                      }}>
                        <div className="flex justify-between items-center">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: win ? "#4ADE80" : draw ? "#FDE68A" : "#D1D5DB", display: "flex", alignItems: "center", gap: 4 }}>
                              {bj && <span>⭐</span>}
                              {p.resultado.length > 22 ? p.resultado.substring(0, 22) + "…" : p.resultado}
                            </div>
                            <div style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>
                              {p.fecha} · ${p.apuesta} · {p.puntajeJugador}/{p.puntajeBanca}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", marginLeft: 8, flexShrink: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: win ? "#4ADE80" : draw ? "#FDE68A" : "#F87171" }}>
                              {win ? `+$${p.ganancia}` : draw ? "±$0" : `-$${p.apuesta}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reglas */}
            <div className="casino-card rounded-2xl p-5" style={{ border: "1px solid rgba(34,197,94,0.15)" }}>
              <h4 className="text-sm font-black green-text uppercase tracking-widest mb-4">📖 Reglas</h4>
              <div className="space-y-2">
                {[
                  { r: "Llega a 21 o cerca sin pasarte", i: "🎯" },
                  { r: "A = 1 u 11 · J/Q/K = 10", i: "🃏" },
                  { r: "Blackjack natural paga ×2.5", i: "⭐" },
                  { r: "Banca pide carta hasta ≥17", i: "🎩" },
                  { r: "Supera a la banca sin pasarte", i: "🏆" },
                  { r: "Mismo puntaje = empate", i: "🤝" },
                ].map(({ r, i }) => (
                  <div key={r} className="flex items-start gap-2" style={{ fontSize: 12, color: "#6B7280" }}>
                    <span style={{ flexShrink: 0 }}>{i}</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Consejos */}
            <div className="casino-card rounded-2xl p-5">
              <h4 className="text-sm font-black green-text uppercase tracking-widest mb-4">💡 Estrategia</h4>
              <div className="space-y-2">
                {[
                  "Con 17+, plántate casi siempre",
                  "Con 11 o menos, siempre pide carta",
                  "Con 12-16, pide si la banca muestra ≥7",
                  "Plántate en 18+ si la banca muestra poco",
                ].map((c, i) => (
                  <div key={i} className="flex items-start gap-2" style={{ fontSize: 12, color: "#6B7280" }}>
                    <span style={{ color: "#16A34A", fontWeight: 900, flexShrink: 0 }}>→</span>
                    <span>{c}</span>
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
