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
}

interface CartaPoker {
  valor: string;
  palo: string;
  valor_numerico: number;
}

interface HistorialPartida {
  id: number;
  resultado: string;
  ganancia: number;
  fecha: string;
  buyIn: number;
  boteFinal: number;
  manoJugador: string;
  manoBanca: string;
}

type EstadoJuego = "esperando" | "pre_flop" | "flop" | "turn" | "river" | "showdown" | "terminada";
type AccionJugador = "igualar" | "subir" | "pasar" | "retirarse";

const RONDA_LABELS: Record<EstadoJuego, string> = {
  esperando: "Esperando",
  pre_flop: "Pre-Flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
  terminada: "Fin",
};

export default function Poker() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cartasJugador, setCartasJugador] = useState<CartaPoker[]>([]);
  const [cartasBanca, setCartasBanca] = useState<CartaPoker[]>([]);
  const [cartasComunitarias, setCartasComunitarias] = useState<CartaPoker[]>([]);
  const [fichasJugador, setFichasJugador] = useState<number>(0);
  const [fichasBanca, setFichasBanca] = useState<number>(0);
  const [bote, setBote] = useState<number>(0);
  const [apuestaMinima, setApuestaMinima] = useState<number>(0);
  const [rondaActual, setRondaActual] = useState<EstadoJuego>("esperando");
  const [estado, setEstado] = useState<EstadoJuego>("esperando");
  const [mensaje, setMensaje] = useState<string>("");
  const [ganancia, setGanancia] = useState<number>(0);
  const [mostrarCartasBanca, setMostrarCartasBanca] = useState<boolean>(false);
  const [manoJugador, setManoJugador] = useState<string>("");
  const [manoBanca, setManoBanca] = useState<string>("");

  const [smallBlind, setSmallBlind] = useState<number>(25);
  const [bigBlind, setBigBlind] = useState<number>(50);

  const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(1000);
  const [blindSeleccionado, setBlindSeleccionado] = useState<number>(25);
  const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([200, 500, 1000, 2500, 5000, 10000]);
  const [blindsDisponibles, setBlindsDisponibles] = useState<number[]>([10, 25, 50, 100, 200, 500]);

  const [montoSubida, setMontoSubida] = useState<number>(0);

  const [historial, setHistorial] = useState<HistorialPartida[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    totalPartidas: 0,
    gananciaTotal: 0,
    buyInTotal: 0,
    balance: 0,
    partidasGanadas: 0,
  });

  const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    if (!usuario) {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      const u = localStorage.getItem("usuario");
      if (u) { try { setUsuario(JSON.parse(u)); } catch {} }
    }
  }, [navigate, usuario]);

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const [resA, resB] = await Promise.all([
          axios.get(`${API_URL}/juegos/poker/apuestas-permitidas`),
          axios.get(`${API_URL}/juegos/poker/blinds`),
        ]);
        setApuestasPermitidas(resA.data.apuestas_permitidas);
        setBlindsDisponibles(resB.data.blinds_disponibles);
        setApuestaSeleccionada(resA.data.apuestas_permitidas[2] || 1000);
        setBlindSeleccionado(resB.data.blinds_disponibles[1] || 25);
      } catch {}
    };
    cargarConfiguracion();
    const h = localStorage.getItem("historial_poker");
    if (h) setHistorial(JSON.parse(h).slice(0, 10));
  }, []);

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotificacion({ text, type });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const agregarAlHistorial = (resultado: string, ganancia: number, buyIn: number, boteFinal: number, manoJugador: string, manoBanca: string) => {
    const nueva: HistorialPartida = {
      id: Date.now(), resultado, ganancia, buyIn, boteFinal, manoJugador, manoBanca,
      fecha: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const nuevo = [nueva, ...historial.slice(0, 9)];
    setHistorial(nuevo);
    localStorage.setItem("historial_poker", JSON.stringify(nuevo));
    const esVictoria = ganancia > 0;
    setEstadisticas(p => ({
      totalPartidas: p.totalPartidas + 1,
      gananciaTotal: p.gananciaTotal + (ganancia > 0 ? ganancia : 0),
      buyInTotal: p.buyInTotal + buyIn,
      balance: p.balance + ganancia,
      partidasGanadas: p.partidasGanadas + (esVictoria ? 1 : 0),
    }));
  };

  const animarConfetti = () => {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#FFD700', '#FFA500', '#FF4500'] });
    setTimeout(() => {
      confetti({ particleCount: 150, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 150, angle: 120, spread: 55, origin: { x: 1 } });
    }, 300);
  };

  const reiniciarJuego = () => {
    setSessionId(null); setCartasJugador([]); setCartasBanca([]); setCartasComunitarias([]);
    setFichasJugador(0); setFichasBanca(0); setBote(0); setApuestaMinima(0);
    setRondaActual("esperando"); setEstado("esperando"); setMensaje(""); setGanancia(0);
    setMostrarCartasBanca(false); setManoJugador(""); setManoBanca(""); setMontoSubida(0);
  };

  const iniciarJuego = async () => {
    if (!usuario) return showMsg("Debes iniciar sesión.", "error");
    if (usuario.saldo < apuestaSeleccionada) return showMsg(`Necesitas $${apuestaSeleccionada} para jugar.`, "error");
    setCargando(true); setMensaje(""); setCartasJugador([]); setCartasBanca([]); setCartasComunitarias([]);
    setMostrarCartasBanca(false); setRondaActual("esperando"); setEstado("esperando"); setGanancia(0); setManoJugador(""); setManoBanca("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/poker/iniciar?apuesta=${apuestaSeleccionada}&blind=${blindSeleccionado}`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      setSessionId(res.data.session_id); setCartasJugador(res.data.cartas_jugador);
      setFichasJugador(res.data.fichas_jugador); setFichasBanca(res.data.fichas_banca);
      setBote(res.data.bote); setApuestaMinima(res.data.apuesta_minima);
      setRondaActual(res.data.ronda_actual as EstadoJuego); setEstado(res.data.estado as EstadoJuego);
      setSmallBlind(res.data.small_blind ?? blindSeleccionado);
      setBigBlind(res.data.big_blind ?? blindSeleccionado * 2);
      setUsuario(prev => prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev);
      showMsg("¡Partida iniciada! Elige tu acción.", "success");
    } catch (e: any) { showMsg(e.response?.data?.detail || "Error al iniciar.", "error"); }
    finally { setCargando(false); }
  };

  const realizarAccion = async (accion: AccionJugador, cantidad: number = 0) => {
    if (!sessionId || estado === "terminada") return;
    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/poker/${sessionId}/accion?accion=${accion}&cantidad=${cantidad}`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.fichas_jugador !== undefined) setFichasJugador(res.data.fichas_jugador);
      if (res.data.fichas_banca !== undefined) setFichasBanca(res.data.fichas_banca);
      if (res.data.bote !== undefined) setBote(res.data.bote);
      if (res.data.apuesta_minima !== undefined) setApuestaMinima(res.data.apuesta_minima);
      if (res.data.ronda_actual) setRondaActual(res.data.ronda_actual as EstadoJuego);
      if (res.data.cartas_comunitarias) setCartasComunitarias(res.data.cartas_comunitarias);
      if (res.data.estado) setEstado(res.data.estado as EstadoJuego);
      if (res.data.accion_banca) showMsg(`Banca: ${res.data.accion_banca}`, "info");
      if (res.data.estado === "terminada" || res.data.resultado) {
        setEstado("terminada"); setMensaje(res.data.resultado || "Juego terminado"); setGanancia(res.data.ganancia || 0);
        if (res.data.cartas_banca) { setCartasBanca(res.data.cartas_banca); setMostrarCartasBanca(true); }
        if (res.data.mano_jugador) setManoJugador(res.data.mano_jugador);
        if (res.data.mano_banca) setManoBanca(res.data.mano_banca);
        if (res.data.nuevo_saldo !== undefined) setUsuario(prev => prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev);
        agregarAlHistorial(res.data.resultado || "Partida terminada", res.data.ganancia || 0, apuestaSeleccionada, res.data.bote_final || 0, res.data.mano_jugador || "", res.data.mano_banca || "");
        if ((res.data.ganancia || 0) > 0) animarConfetti();
        setSessionId(null);
      }
    } catch (e: any) { showMsg(e.response?.data?.detail || "Error.", "error"); }
    finally { setCargando(false); }
  };

  const rendirse = async () => {
    if (!sessionId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/juegos/poker/${sessionId}/rendirse`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setEstado("terminada"); setMensaje(res.data.resultado); setGanancia(res.data.ganancia);
      setUsuario(prev => prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev); setSessionId(null);
      agregarAlHistorial(res.data.resultado, res.data.ganancia, apuestaSeleccionada, 0, "Rendición", "");
    } catch (e: any) { showMsg(e.response?.data?.detail || "Error al rendirse", "error"); }
  };

  const obtenerEstado = async () => {
    if (!sessionId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/juegos/poker/${sessionId}/estado`, { headers: { Authorization: `Bearer ${token}` } });
      setCartasJugador(res.data.cartas_jugador); setFichasJugador(res.data.fichas_jugador);
      setFichasBanca(res.data.fichas_banca); setBote(res.data.bote);
      setApuestaMinima(res.data.apuesta_minima); setRondaActual(res.data.ronda_actual as EstadoJuego);
      setEstado(res.data.estado as EstadoJuego); setCartasComunitarias(res.data.cartas_comunitarias || []);
    } catch {}
  };

  const limpiarHistorial = () => {
    setHistorial([]); localStorage.removeItem("historial_poker"); showMsg("Historial limpiado", "info");
  };

  const puedePasar = apuestaMinima === 0;
  const puedeIgualar = apuestaMinima > 0 && fichasJugador >= apuestaMinima;
  const minSubida = apuestaMinima > 0 ? apuestaMinima + bigBlind : bigBlind;
  const puedeSubir = fichasJugador >= minSubida;

  const renderCarta = (carta: CartaPoker, oculta: boolean = false, esComunitaria: boolean = false, idx: number = 0) => {
    if (oculta) {
      return (
        <div
          className="relative flex-shrink-0"
          style={{
            width: 64, height: 92,
            borderRadius: 10,
            background: "linear-gradient(135deg, #7c0a02, #c41e3a, #7c0a02)",
            border: "2px solid rgba(218,165,32,0.6)",
            boxShadow: "0 8px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `rotate(${(idx % 2 === 0 ? -2 : 2)}deg)`,
          }}
        >
          <div style={{
            width: 48, height: 76, borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 8px)"
          }}>
            <span style={{ fontSize: 22, opacity: 0.6 }}>♠</span>
          </div>
        </div>
      );
    }

    const isRed = carta.palo === "♥️" || carta.palo === "♦️" || carta.palo === "♥" || carta.palo === "♦";
    const suitColor = isRed ? "#DC2626" : "#1a1a1a";
    const bgGrad = esComunitaria
      ? "linear-gradient(135deg, #f0fdf4, #dcfce7)"
      : "linear-gradient(135deg, #ffffff, #f8f8f8)";

    return (
      <div
        className="relative flex-shrink-0"
        style={{
          width: 64, height: 92, borderRadius: 10,
          background: bgGrad,
          border: esComunitaria ? "2px solid rgba(34,197,94,0.5)" : "2px solid rgba(218,165,32,0.4)",
          boxShadow: esComunitaria
            ? "0 8px 24px rgba(0,0,0,0.5), 0 0 12px rgba(34,197,94,0.2)"
            : "0 8px 20px rgba(0,0,0,0.6), 0 0 8px rgba(218,165,32,0.1)",
          display: "flex", flexDirection: "column",
          padding: "4px 5px",
          transform: `rotate(${(idx % 2 === 0 ? -1 : 1)}deg)`,
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "rotate(0deg) translateY(-6px) scale(1.08)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 32px rgba(0,0,0,0.7), 0 0 20px rgba(218,165,32,0.3)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = `rotate(${idx % 2 === 0 ? -1 : 1}deg)`; (e.currentTarget as HTMLDivElement).style.boxShadow = esComunitaria ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 20px rgba(0,0,0,0.6)"; }}
      >
        <div style={{ fontSize: 11, fontWeight: 900, color: suitColor, lineHeight: 1 }}>{carta.valor}</div>
        <div style={{ fontSize: 12, color: suitColor, lineHeight: 1 }}>{carta.palo}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 24, color: suitColor }}>{carta.palo}</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 900, color: suitColor, lineHeight: 1, alignSelf: "flex-end", transform: "rotate(180deg)" }}>{carta.valor}</div>
      </div>
    );
  };

  const CartaVacia = () => (
    <div style={{
      width: 64, height: 92, borderRadius: 10,
      border: "2px dashed rgba(218,165,32,0.2)",
      background: "rgba(0,0,0,0.2)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ color: "rgba(218,165,32,0.3)", fontSize: 20 }}>?</span>
    </div>
  );

  const rondaSteps: EstadoJuego[] = ["pre_flop", "flop", "turn", "river", "showdown"];
  const rondaIdx = rondaSteps.indexOf(rondaActual);

  if (!usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at center, #1a0005 0%, #0a0005 100%)" }}>
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ boxShadow: "0 0 30px #DAA520" }} />
          <p className="font-bold tracking-widest" style={{ color: "#DAA520" }}>CARGANDO PÓKER...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #1a0005 0%, #070707 50%, #0a0005 100%)" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes floatUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardDeal {
          0% { opacity: 0; transform: translateY(-40px) scale(0.8); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes resultReveal {
          0% { opacity: 0; transform: scale(0.7); }
          60% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseRed {
          0%, 100% { box-shadow: 0 0 15px rgba(196,30,58,0.4); }
          50% { box-shadow: 0 0 35px rgba(196,30,58,0.8), 0 0 60px rgba(218,165,32,0.2); }
        }
        @keyframes chipFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .gold-text {
          background: linear-gradient(90deg, #DAA520, #FFD700, #FFA500, #FFD700, #DAA520);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .casino-card {
          background: linear-gradient(135deg, rgba(30,5,10,0.95), rgba(10,0,5,0.98));
          border: 1px solid rgba(218,165,32,0.25);
          backdrop-filter: blur(10px);
        }
        .felt-table {
          background: radial-gradient(ellipse at center, #0d5c2e 0%, #074020 55%, #042a14 100%);
          border: 3px solid #DAA520;
          box-shadow: inset 0 0 80px rgba(0,0,0,0.6), 0 0 40px rgba(218,165,32,0.15);
        }
        .card-deal { animation: cardDeal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .result-reveal { animation: resultReveal 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .float-up { animation: floatUp 0.4s ease-out forwards; }
        .action-btn {
          transition: all 0.15s ease;
          cursor: pointer;
          font-weight: 900;
          letter-spacing: 0.05em;
          border: none;
          color: white;
          border-radius: 12px;
          padding: 12px 20px;
          font-size: 14px;
          text-transform: uppercase;
        }
        .action-btn:hover:not(:disabled) { transform: translateY(-3px); filter: brightness(1.15); }
        .action-btn:active:not(:disabled) { transform: translateY(0); }
        .action-btn:disabled { opacity: 0.35; cursor: not-allowed; filter: grayscale(0.5); }
        .round-pill {
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .scrollbar-casino::-webkit-scrollbar { width: 4px; }
        .scrollbar-casino::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 2px; }
        .scrollbar-casino::-webkit-scrollbar-thumb { background: #DAA520; border-radius: 2px; }
        .neon-green { text-shadow: 0 0 10px #00ff00, 0 0 25px #00ff0060; }
        .neon-red { text-shadow: 0 0 10px #ff3333, 0 0 25px #ff333360; }
      `}</style>

      {/* Notificación */}
      {notificacion && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center gap-3 shadow-2xl float-up`}
          style={{
            background: notificacion.type === "success" ? "linear-gradient(135deg,#14532d,#166534)" : notificacion.type === "error" ? "linear-gradient(135deg,#7f1d1d,#991b1b)" : "linear-gradient(135deg,#78350f,#92400e)",
            border: `1px solid ${notificacion.type === "success" ? "rgba(34,197,94,0.5)" : notificacion.type === "error" ? "rgba(239,68,68,0.5)" : "rgba(218,165,32,0.5)"}`,
            color: notificacion.type === "success" ? "#86efac" : notificacion.type === "error" ? "#fca5a5" : "#fde68a",
            boxShadow: `0 0 30px ${notificacion.type === "success" ? "rgba(34,197,94,0.2)" : notificacion.type === "error" ? "rgba(239,68,68,0.2)" : "rgba(218,165,32,0.2)"}`,
          }}>
          <span style={{ fontSize: 22 }}>{notificacion.type === "success" ? "✅" : notificacion.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{notificacion.text}</span>
        </div>
      )}

      <Header usuario={usuario} cerrarSesion={() => { localStorage.clear(); navigate("/login"); }} setUsuario={setUsuario} />

      {/* Hero Banner */}
      <div className="relative overflow-hidden py-7 px-4" style={{ borderBottom: "1px solid rgba(218,165,32,0.25)", background: "radial-gradient(ellipse at center, rgba(196,30,58,0.08) 0%, transparent 70%)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-4xl">♠️</span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight gold-text">TEXAS HOLD'EM</h1>
              <span className="text-4xl">♦️</span>
            </div>
            <p className="text-gray-400">Poker VIP contra la banca · 1 acción por ronda · Buy-in desde <span className="text-yellow-400 font-bold">${apuestasPermitidas[0]}</span></p>
          </div>
          <div className="flex gap-4">
            <div className="casino-card rounded-2xl px-5 py-4 text-center" style={{ boxShadow: "0 0 20px rgba(218,165,32,0.15)" }}>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Saldo</div>
              <div className="text-2xl font-black gold-text">${usuario?.saldo?.toLocaleString() ?? 0}</div>
            </div>
            {estado !== "esperando" && (
              <div className="casino-card rounded-2xl px-5 py-4 text-center" style={{ boxShadow: "0 0 20px rgba(218,165,32,0.15)" }}>
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Ronda</div>
                <div className="text-lg font-black text-red-400">{RONDA_LABELS[rondaActual]}</div>
              </div>
            )}
            <div className="casino-card rounded-2xl px-5 py-4 text-center">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Partidas</div>
              <div className="text-2xl font-black text-blue-400">{estadisticas.totalPartidas}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* === MESA PRINCIPAL === */}
          <div className="xl:col-span-2 space-y-6">

            {/* Configuración (solo si esperando) */}
            {estado === "esperando" && (
              <div className="casino-card rounded-3xl p-6" style={{ boxShadow: "0 0 30px rgba(218,165,32,0.1)" }}>
                <h2 className="text-xl font-black gold-text uppercase tracking-widest mb-6">⚙️ Configura tu Mesa</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Buy-In</div>
                    <div className="flex flex-wrap gap-2">
                      {apuestasPermitidas.map(a => (
                        <button key={a}
                          onClick={() => setApuestaSeleccionada(a)}
                          disabled={usuario.saldo < a}
                          style={{
                            padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, transition: "all 0.15s",
                            background: apuestaSeleccionada === a ? "linear-gradient(135deg, #DAA520, #FFA500)" : "rgba(255,255,255,0.05)",
                            border: apuestaSeleccionada === a ? "2px solid #FFD700" : "2px solid rgba(218,165,32,0.2)",
                            color: apuestaSeleccionada === a ? "#0a0500" : usuario.saldo < a ? "#4B5563" : "#D1D5DB",
                            boxShadow: apuestaSeleccionada === a ? "0 0 20px rgba(218,165,32,0.4)" : "none",
                            cursor: usuario.saldo < a ? "not-allowed" : "pointer",
                            opacity: usuario.saldo < a ? 0.4 : 1,
                          }}
                        >
                          ${a.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Small Blind</div>
                    <div className="flex flex-wrap gap-2">
                      {blindsDisponibles.map(b => (
                        <button key={b}
                          onClick={() => setBlindSeleccionado(b)}
                          style={{
                            padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, transition: "all 0.15s",
                            background: blindSeleccionado === b ? "linear-gradient(135deg, #7C3AED, #4F46E5)" : "rgba(255,255,255,0.05)",
                            border: blindSeleccionado === b ? "2px solid rgba(139,92,246,0.8)" : "2px solid rgba(139,92,246,0.2)",
                            color: blindSeleccionado === b ? "white" : "#D1D5DB",
                            boxShadow: blindSeleccionado === b ? "0 0 20px rgba(124,58,237,0.4)" : "none",
                            cursor: "pointer",
                          }}
                        >
                          ${b}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-6 text-sm mb-6 p-4 rounded-2xl" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(218,165,32,0.15)" }}>
                  <div className="text-center">
                    <div className="text-gray-500 text-xs uppercase tracking-widest">Buy-In</div>
                    <div className="text-yellow-400 font-black text-lg">${apuestaSeleccionada.toLocaleString()}</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: "rgba(218,165,32,0.2)" }} />
                  <div className="text-center">
                    <div className="text-gray-500 text-xs uppercase tracking-widest">Small Blind</div>
                    <div className="text-purple-400 font-black text-lg">${blindSeleccionado}</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: "rgba(218,165,32,0.2)" }} />
                  <div className="text-center">
                    <div className="text-gray-500 text-xs uppercase tracking-widest">Big Blind</div>
                    <div className="text-blue-400 font-black text-lg">${blindSeleccionado * 2}</div>
                  </div>
                </div>
                <button
                  onClick={iniciarJuego}
                  disabled={cargando || usuario.saldo < apuestaSeleccionada}
                  className="action-btn w-full text-xl py-5"
                  style={{
                    background: cargando || usuario.saldo < apuestaSeleccionada
                      ? "rgba(55,65,81,0.5)"
                      : "linear-gradient(135deg, #7c0a02, #C41E3A, #7c0a02)",
                    border: "3px solid #DAA520",
                    boxShadow: cargando || usuario.saldo < apuestaSeleccionada ? "none" : "0 0 40px rgba(196,30,58,0.4), 0 0 60px rgba(218,165,32,0.15)",
                    color: cargando || usuario.saldo < apuestaSeleccionada ? "#6B7280" : "white",
                    animation: cargando || usuario.saldo < apuestaSeleccionada ? "none" : "pulseRed 2s ease-in-out infinite",
                  }}
                >
                  {cargando ? "Iniciando..." : `♠️ COMENZAR PARTIDA · $${apuestaSeleccionada.toLocaleString()}`}
                </button>
              </div>
            )}

            {/* Mesa de Juego */}
            {estado !== "esperando" && (
              <div className="felt-table rounded-3xl p-6 md:p-8">

                {/* Progress de rondas */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {rondaSteps.map((r, i) => (
                    <React.Fragment key={r}>
                      <div className="flex flex-col items-center">
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 900, fontSize: 11,
                          background: i < rondaIdx ? "#DAA520" : i === rondaIdx ? "rgba(218,165,32,0.9)" : "rgba(0,0,0,0.4)",
                          border: i === rondaIdx ? "2px solid #FFD700" : "2px solid rgba(218,165,32,0.3)",
                          color: i <= rondaIdx ? "#0a0500" : "rgba(218,165,32,0.5)",
                          boxShadow: i === rondaIdx ? "0 0 15px rgba(218,165,32,0.6)" : "none",
                        }}>
                          {i < rondaIdx ? "✓" : i + 1}
                        </div>
                        <div style={{ fontSize: 9, color: i === rondaIdx ? "#DAA520" : "rgba(255,255,255,0.3)", marginTop: 3, fontWeight: 700 }}>
                          {RONDA_LABELS[r]}
                        </div>
                      </div>
                      {i < rondaSteps.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: i < rondaIdx ? "#DAA520" : "rgba(218,165,32,0.2)", maxWidth: 40, borderRadius: 1 }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Bote */}
                <div className="flex justify-center mb-6">
                  <div style={{
                    padding: "10px 32px", borderRadius: 999,
                    background: "rgba(0,0,0,0.5)",
                    border: "2px solid rgba(218,165,32,0.5)",
                    boxShadow: "0 0 20px rgba(218,165,32,0.2)",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 10, color: "rgba(218,165,32,0.7)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>🪙 Bote</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#DAA520", lineHeight: 1.1 }}>${bote.toLocaleString()}</div>
                  </div>
                </div>

                {/* Cartas Comunitarias */}
                <div className="mb-6">
                  <div style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12, fontWeight: 700 }}>
                    Cartas Comunitarias
                  </div>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    {cartasComunitarias.map((carta, i) => (
                      <div key={i} className="card-deal" style={{ animationDelay: `${i * 0.1}s` }}>
                        {renderCarta(carta, false, true, i)}
                      </div>
                    ))}
                    {[...Array(5 - cartasComunitarias.length)].map((_, i) => (
                      <CartaVacia key={`empty-${i}`} />
                    ))}
                  </div>
                </div>

                {/* Separador */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(218,165,32,0.2)" }} />
                  <div style={{ color: "rgba(218,165,32,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em" }}>VS</div>
                  <div style={{ flex: 1, height: 1, background: "rgba(218,165,32,0.2)" }} />
                </div>

                {/* Jugadores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Jugador */}
                  <div style={{
                    background: "rgba(0,80,40,0.3)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    borderRadius: 16, padding: 20, textAlign: "center"
                  }}>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div style={{
                        padding: "4px 14px", borderRadius: 999,
                        background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)"
                      }}>
                        <span style={{ color: "#4ade80", fontWeight: 900, fontSize: 13 }}>🎯 TÚ · ${fichasJugador.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-center flex-wrap">
                      {cartasJugador.map((carta, i) => (
                        <div key={i} className="card-deal" style={{ animationDelay: `${i * 0.15}s` }}>
                          {renderCarta(carta, false, false, i)}
                        </div>
                      ))}
                      {cartasJugador.length === 0 && [0, 1].map(i => <CartaVacia key={i} />)}
                    </div>
                    {manoJugador && (
                      <div style={{
                        marginTop: 12, padding: "6px 14px", borderRadius: 8,
                        background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                        color: "#4ade80", fontWeight: 700, fontSize: 13
                      }}>
                        {manoJugador}
                      </div>
                    )}
                  </div>

                  {/* Banca */}
                  <div style={{
                    background: "rgba(80,0,20,0.3)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 16, padding: 20, textAlign: "center"
                  }}>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div style={{
                        padding: "4px 14px", borderRadius: 999,
                        background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)"
                      }}>
                        <span style={{ color: "#f87171", fontWeight: 900, fontSize: 13 }}>🏦 BANCA · ${fichasBanca.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-center flex-wrap">
                      {cartasBanca.length > 0
                        ? cartasBanca.map((carta, i) => (
                          <div key={i} className="card-deal" style={{ animationDelay: `${i * 0.15}s` }}>
                            {renderCarta(carta, !mostrarCartasBanca, false, i)}
                          </div>
                        ))
                        : [0, 1].map(i => renderCarta({ valor: "?", palo: "?", valor_numerico: 0 }, true, false, i))
                      }
                    </div>
                    {manoBanca && (
                      <div style={{
                        marginTop: 12, padding: "6px 14px", borderRadius: 8,
                        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                        color: "#f87171", fontWeight: 700, fontSize: 13
                      }}>
                        {manoBanca}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info de la ronda */}
                {estado !== "terminada" && apuestaMinima >= 0 && (
                  <div style={{
                    marginTop: 16, padding: "10px 20px", borderRadius: 12,
                    background: "rgba(0,0,0,0.4)", border: "1px solid rgba(218,165,32,0.2)",
                    textAlign: "center", display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap"
                  }}>
                    {[
                      { label: "Para Igualar", val: `$${apuestaMinima}`, color: "#fbbf24" },
                      { label: "SB", val: `$${smallBlind}`, color: "#818cf8" },
                      { label: "BB", val: `$${bigBlind}`, color: "#60a5fa" },
                      { label: "Tus Fichas", val: `$${fichasJugador.toLocaleString()}`, color: "#4ade80" },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
                        <div style={{ fontWeight: 900, fontSize: 16, color }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Resultado */}
            {estado === "terminada" && mensaje && (
              <div className="result-reveal casino-card rounded-3xl p-8"
                style={{
                  border: ganancia > 0 ? "2px solid rgba(34,197,94,0.5)" : "2px solid rgba(239,68,68,0.3)",
                  boxShadow: ganancia > 0 ? "0 0 60px rgba(34,197,94,0.2)" : "0 0 40px rgba(239,68,68,0.1)",
                  textAlign: "center"
                }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{ganancia > 0 ? "🏆" : "💸"}</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: ganancia > 0 ? "#4ade80" : "#f87171", marginBottom: 6 }}
                  className={ganancia > 0 ? "neon-green" : "neon-red"}>
                  {ganancia > 0 ? `+$${ganancia.toLocaleString()}` : `-$${Math.abs(ganancia).toLocaleString()}`}
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, marginBottom: 20 }}>{mensaje}</div>
                <div className="flex gap-4 justify-center flex-wrap">
                  <button
                    onClick={reiniciarJuego}
                    className="action-btn"
                    style={{
                      padding: "14px 32px", fontSize: 16,
                      background: "linear-gradient(135deg, #7c0a02, #C41E3A)",
                      border: "2px solid #DAA520",
                      boxShadow: "0 0 30px rgba(196,30,58,0.4)",
                    }}
                  >
                    ♠️ Nueva Partida
                  </button>
                  {!mostrarCartasBanca && cartasBanca.length === 0 && (
                    <button onClick={obtenerEstado} className="action-btn"
                      style={{ padding: "14px 24px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "2px solid rgba(96,165,250,0.5)" }}>
                      🔄 Actualizar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Acciones de juego */}
            {estado !== "esperando" && estado !== "terminada" && (
              <div className="casino-card rounded-3xl p-6" style={{ boxShadow: "0 0 20px rgba(218,165,32,0.1)" }}>
                <h3 className="text-sm font-black gold-text uppercase tracking-widest mb-5 text-center">Tu Turno — Elige una Acción</h3>

                {/* Botones principales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <button
                    onClick={() => realizarAccion("pasar")}
                    disabled={cargando || !puedePasar}
                    className="action-btn flex flex-col items-center py-4"
                    style={{ background: "linear-gradient(135deg,#374151,#4B5563)", border: "2px solid rgba(107,114,128,0.5)" }}
                  >
                    <span style={{ fontSize: 22 }}>🤚</span>
                    <span>Pasar</span>
                    <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Check</span>
                  </button>
                  <button
                    onClick={() => realizarAccion("igualar")}
                    disabled={cargando || !puedeIgualar}
                    className="action-btn flex flex-col items-center py-4"
                    style={{ background: "linear-gradient(135deg,#14532d,#166534)", border: "2px solid rgba(34,197,94,0.5)", boxShadow: !cargando && puedeIgualar ? "0 0 20px rgba(34,197,94,0.2)" : "none" }}
                  >
                    <span style={{ fontSize: 22 }}>💰</span>
                    <span>Igualar</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#86efac" }}>${apuestaMinima}</span>
                  </button>
                  <button
                    onClick={() => realizarAccion("subir", minSubida)}
                    disabled={cargando || !puedeSubir}
                    className="action-btn flex flex-col items-center py-4"
                    style={{ background: "linear-gradient(135deg,#78350f,#92400e)", border: "2px solid rgba(234,179,8,0.5)", boxShadow: !cargando && puedeSubir ? "0 0 20px rgba(234,179,8,0.2)" : "none" }}
                  >
                    <span style={{ fontSize: 22 }}>⬆️</span>
                    <span>Subir</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fde68a" }}>Mín ${minSubida}</span>
                  </button>
                  <button
                    onClick={() => realizarAccion("retirarse")}
                    disabled={cargando}
                    className="action-btn flex flex-col items-center py-4"
                    style={{ background: "linear-gradient(135deg,#7f1d1d,#991b1b)", border: "2px solid rgba(239,68,68,0.5)" }}
                  >
                    <span style={{ fontSize: 22 }}>🏳️</span>
                    <span>Retirarse</span>
                    <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>Fold</span>
                  </button>
                </div>

                {/* Subida personalizada */}
                <div style={{
                  padding: "16px 20px", borderRadius: 14,
                  background: "rgba(0,0,0,0.4)", border: "1px solid rgba(218,165,32,0.15)"
                }}>
                  <div style={{ fontSize: 11, color: "rgba(218,165,32,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>
                    Subida Personalizada (aporte total)
                  </div>
                  <div className="flex gap-3 items-center flex-wrap">
                    <input
                      type="number"
                      min={minSubida}
                      max={fichasJugador}
                      value={montoSubida || ""}
                      onChange={e => setMontoSubida(parseInt(e.target.value) || 0)}
                      placeholder={`Mín $${minSubida}`}
                      style={{
                        flex: 1, minWidth: 120, padding: "10px 14px",
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(218,165,32,0.3)",
                        borderRadius: 10, color: "white", fontSize: 15, fontWeight: 700,
                        outline: "none"
                      }}
                    />
                    <button
                      onClick={() => realizarAccion("subir", montoSubida)}
                      disabled={cargando || montoSubida < minSubida || montoSubida > fichasJugador}
                      className="action-btn"
                      style={{
                        padding: "10px 20px",
                        background: "linear-gradient(135deg,#5b21b6,#6d28d9)",
                        border: "2px solid rgba(139,92,246,0.5)",
                      }}
                    >
                      ↑ Subir ${montoSubida.toLocaleString()}
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
                    * "Subir" es tu aporte total en la acción (call + raise)
                  </div>
                </div>

                {/* Rendirse */}
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <button
                    onClick={rendirse}
                    style={{
                      padding: "8px 20px", borderRadius: 10, fontWeight: 700, fontSize: 12,
                      background: "rgba(55,65,81,0.4)", border: "1px solid rgba(107,114,128,0.3)",
                      color: "#9CA3AF", cursor: "pointer", transition: "all 0.2s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(127,29,29,0.4)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(55,65,81,0.4)")}
                  >
                    ⚠️ Rendirse · Recuperar 50% de lo apostado
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* === PANEL LATERAL === */}
          <div className="space-y-5">

            {/* Estadísticas */}
            <div className="casino-card rounded-2xl p-5" style={{ boxShadow: "0 0 20px rgba(218,165,32,0.08)" }}>
              <h3 className="text-sm font-black gold-text uppercase tracking-widest mb-4">📊 Tus Estadísticas</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Partidas", val: estadisticas.totalPartidas, color: "#60A5FA" },
                  { label: "Ganadas", val: estadisticas.partidasGanadas, color: "#4ade80" },
                  {
                    label: "Win Rate", color: "#fbbf24",
                    val: estadisticas.totalPartidas > 0
                      ? `${((estadisticas.partidasGanadas / estadisticas.totalPartidas) * 100).toFixed(1)}%`
                      : "0%"
                  },
                  {
                    label: "Balance", color: estadisticas.balance >= 0 ? "#4ade80" : "#f87171",
                    val: `${estadisticas.balance >= 0 ? "+" : ""}$${estadisticas.balance}`
                  },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{
                    padding: "12px", borderRadius: 12, textAlign: "center",
                    background: "rgba(0,0,0,0.4)", border: `1px solid ${color}25`
                  }}>
                    <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color }}>{val}</div>
                  </div>
                ))}
              </div>
              {estadisticas.totalPartidas > 0 && (
                <div style={{ padding: "10px", borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(218,165,32,0.1)" }}>
                  <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Resumen</div>
                  <div className="flex justify-between">
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>Buy-In Total</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171" }}>${estadisticas.buyInTotal.toLocaleString()}</div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>Ganado</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#4ade80" }}>${estadisticas.gananciaTotal.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Historial */}
            <div className="casino-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black gold-text uppercase tracking-widest">📜 Historial</h3>
                {historial.length > 0 && (
                  <button onClick={limpiarHistorial} style={{ color: "#f87171", fontSize: 11, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                    Limpiar
                  </button>
                )}
              </div>
              {historial.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0" }}>
                  <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 8 }}>♠️</div>
                  <div style={{ color: "#4B5563", fontSize: 13 }}>Sin partidas aún</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-casino pr-1">
                  {historial.map((p, i) => (
                    <div key={p.id} style={{
                      padding: "12px", borderRadius: 10,
                      background: p.ganancia > 0 ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.06)",
                      border: `1px solid ${p.ganancia > 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)"}`,
                      opacity: i === 0 ? 1 : 0.8
                    }}>
                      <div className="flex justify-between items-start">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: p.ganancia > 0 ? "#4ade80" : "#D1D5DB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.resultado.length > 26 ? p.resultado.substring(0, 26) + "…" : p.resultado}
                          </div>
                          <div style={{ fontSize: 10, color: "#6B7280" }}>{p.fecha} · Buy-In ${p.buyIn}</div>
                          {p.manoJugador && <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{p.manoJugador}</div>}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                          <div style={{ fontWeight: 900, fontSize: 15, color: p.ganancia > 0 ? "#4ade80" : "#f87171" }}>
                            {p.ganancia > 0 ? `+$${p.ganancia}` : `-$${Math.abs(p.ganancia)}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info manos */}
            <div className="casino-card rounded-2xl p-5" style={{ border: "1px solid rgba(218,165,32,0.2)" }}>
              <h4 className="text-sm font-black gold-text uppercase tracking-widest mb-4">🃏 Manos de Póker</h4>
              <div className="space-y-1.5">
                {[
                  { mano: "Royal Flush", mult: "∞", color: "#DAA520" },
                  { mano: "Straight Flush", mult: "Top", color: "#C084FC" },
                  { mano: "4 de un Tipo", mult: "High", color: "#F87171" },
                  { mano: "Full House", mult: "Med", color: "#FB923C" },
                  { mano: "Flush", mult: "Med", color: "#60A5FA" },
                  { mano: "Escalera", mult: "Med", color: "#34D399" },
                  { mano: "Trío", mult: "Low", color: "#A3E635" },
                  { mano: "Doble Par", mult: "Low", color: "#E879F9" },
                  { mano: "Par", mult: "Min", color: "#94A3B8" },
                ].map(({ mano, mult, color }) => (
                  <div key={mano} className="flex justify-between items-center" style={{ padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{mano}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color, padding: "2px 8px", borderRadius: 4, background: `${color}15` }}>{mult}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reglas rápidas */}
            <div className="casino-card rounded-2xl p-5">
              <h4 className="text-sm font-black gold-text uppercase tracking-widest mb-3">💡 Cómo Jugar</h4>
              <div className="space-y-2">
                {[
                  "Elige Buy-In y Small Blind",
                  "Recibes 2 cartas privadas",
                  "1 acción por ronda (Check/Call/Raise/Fold)",
                  "La banca responde automáticamente",
                  "Mejor mano de 5 entre las 7 gana",
                  "Rondas: Pre-Flop → Flop → Turn → River",
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-2" style={{ fontSize: 12, color: "#9CA3AF" }}>
                    <span style={{ color: "#DAA520", fontWeight: 900, flexShrink: 0 }}>{i + 1}.</span>
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
