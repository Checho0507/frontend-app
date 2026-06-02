import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import Header from "../components/header";
import Footer from "../components/footer";
import { API_URL } from "../api/auth";

interface Usuario { id: number; username: string; saldo: number; verificado: boolean; nivel?: string; }
interface Carta { valor: string; palo: string; valor_numerico: number; }
interface HistorialPartida {
  id: number; resultado: string; ganancia: number; fecha: string;
  buyIn: number; manoJugador: string; manoBanca: string; bote: number;
}

type Ronda = "esperando" | "pre_flop" | "flop" | "turn" | "river" | "showdown" | "terminada";

const RONDA_LABEL: Record<string, string> = {
  esperando: "Esperando", pre_flop: "Pre-Flop", flop: "Flop",
  turn: "Turn", river: "River", showdown: "Showdown", terminada: "Fin",
};
const RONDA_COLOR: Record<string, string> = {
  pre_flop: "#EF4444", flop: "#F59E0B", turn: "#10B981", river: "#3B82F6", showdown: "#A855F7",
};

export default function Poker() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(false);

  // Estado de partida
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cartasJ, setCartasJ] = useState<Carta[]>([]);
  const [cartasB, setCartasB] = useState<Carta[]>([]);
  const [comun, setComun] = useState<Carta[]>([]);
  const [fichasJ, setFichasJ] = useState(0);
  const [fichasB, setFichasB] = useState(0);
  const [bote, setBote] = useState(0);
  const [toCall, setToCall] = useState(0);
  const [ronda, setRonda] = useState<Ronda>("esperando");
  const [mensajeB, setMensajeB] = useState("");
  const [smallBlind, setSmallBlind] = useState(25);
  const [bigBlind, setBigBlind] = useState(50);

  // Resultado
  const [resultado, setResultado] = useState("");
  const [ganancia, setGanancia] = useState(0);
  const [manoJ, setManoJ] = useState("");
  const [manoB, setManoB] = useState("");
  const [mostrarB, setMostrarB] = useState(false);

  // Config
  const [apuesta, setApuesta] = useState(1000);
  const [blind, setBlind] = useState(25);
  const [montoSubir, setMontoSubir] = useState(0);
  const [apuestasOk, setApuestasOk] = useState([500, 1000, 2500, 5000, 10000]);
  const [blindsOk, setBlindsOk] = useState([25, 50, 100, 200]);

  // Historial y stats
  const [historial, setHistorial] = useState<HistorialPartida[]>([]);
  const [stats, setStats] = useState({ partidas: 0, ganadas: 0, balance: 0 });
  const [notif, setNotif] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const prevRonda = useRef<Ronda>("esperando");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    const u = localStorage.getItem("usuario");
    if (u) try { setUsuario(JSON.parse(u)); } catch {}

    const cargar = async () => {
      try {
        const [ra, rb] = await Promise.all([
          axios.get(`${API_URL}/juegos/poker/apuestas-permitidas`),
          axios.get(`${API_URL}/juegos/poker/blinds`),
        ]);
        setApuestasOk(ra.data.apuestas_permitidas);
        setBlindsOk(rb.data.blinds_disponibles);
        setApuesta(ra.data.apuestas_permitidas[1] ?? 1000);
        setBlind(rb.data.blinds_disponibles[0] ?? 25);
      } catch {}
    };
    cargar();

    const h = localStorage.getItem("historial_poker");
    if (h) { try { const p = JSON.parse(h); setHistorial(p); recalcStats(p); } catch {} }
  }, [navigate]);

  const recalcStats = (h: HistorialPartida[]) => {
    const ganadas = h.filter(x => x.ganancia > 0).length;
    const balance = h.reduce((acc, x) => acc + x.ganancia, 0);
    setStats({ partidas: h.length, ganadas, balance });
  };

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotif({ text, type }); setTimeout(() => setNotif(null), 5000);
  };

  const agregarHistorial = (r: string, g: number, bIn: number, mj: string, mb: string, b: number) => {
    const nuevo: HistorialPartida = {
      id: Date.now(), resultado: r, ganancia: g, buyIn: bIn,
      manoJugador: mj, manoBanca: mb, bote: b,
      fecha: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const lista = [nuevo, ...historial.slice(0, 9)];
    setHistorial(lista);
    localStorage.setItem("historial_poker", JSON.stringify(lista));
    recalcStats(lista);
  };

  const lanzarConfetti = () => {
    confetti({ particleCount: 220, spread: 100, origin: { y: 0.55 }, colors: ["#DAA520","#FFD700","#FFA500","#22C55E"] });
    setTimeout(() => { confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } }); }, 250);
    setTimeout(() => { confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } }); }, 450);
  };

  const resetEstado = () => {
    setSessionId(null); setCartasJ([]); setCartasB([]); setComun([]);
    setFichasJ(0); setFichasB(0); setBote(0); setToCall(0);
    setRonda("esperando"); setMensajeB(""); setResultado(""); setGanancia(0);
    setManoJ(""); setManoB(""); setMostrarB(false); setMontoSubir(0);
  };

  const aplicarRespuesta = (data: any, esInicio = false) => {
    if (data.fichas_jugador !== undefined) setFichasJ(data.fichas_jugador);
    if (data.fichas_banca   !== undefined) setFichasB(data.fichas_banca);
    if (data.bote           !== undefined) setBote(data.bote);
    if (data.cartas_comunitarias)          setComun(data.cartas_comunitarias);
    if (data.accion_banca)                 setMensajeB(data.accion_banca);

    const nuevoBB = data.big_blind ?? bigBlind;
    if (data.big_blind)   setBigBlind(nuevoBB);
    if (data.small_blind) setSmallBlind(data.small_blind);

    if (data.apuesta_minima !== undefined) {
      const tc = data.apuesta_minima as number;
      setToCall(tc);
      // Resetear montoSubir al mínimo válido para esta ronda
      setMontoSubir(tc + nuevoBB);
    }

    const nuevaRonda = (data.ronda_actual || data.estado) as Ronda;
    if (nuevaRonda && nuevaRonda !== "terminada") {
      prevRonda.current = ronda;
      setRonda(nuevaRonda);
    }

    if (data.estado === "terminada" || data.resultado) {
      setRonda("terminada");
      setResultado(data.resultado || "Partida terminada");
      setGanancia(data.ganancia ?? 0);
      if (data.mano_jugador) setManoJ(data.mano_jugador);
      if (data.mano_banca)   setManoB(data.mano_banca);
      if (data.cartas_banca) { setCartasB(data.cartas_banca); setMostrarB(true); }
      if (data.nuevo_saldo !== undefined)
        setUsuario(prev => prev ? { ...prev, saldo: data.nuevo_saldo } : prev);
      if ((data.ganancia ?? 0) > 0) lanzarConfetti();
      agregarHistorial(
        data.resultado || "", data.ganancia ?? 0, apuesta,
        data.mano_jugador || "", data.mano_banca || "", data.bote_final ?? bote
      );
      setSessionId(null);
    }

    if (esInicio && data.nuevo_saldo !== undefined)
      setUsuario(prev => prev ? { ...prev, saldo: data.nuevo_saldo } : prev);
  };

  const iniciar = async () => {
    if (!usuario) return showMsg("Debes iniciar sesión.", "error");
    if (usuario.saldo < apuesta) return showMsg(`Necesitas $${apuesta.toLocaleString()} para jugar.`, "error");
    resetEstado(); setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/poker/iniciar?apuesta=${apuesta}&blind=${blind}`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      setSessionId(res.data.session_id);
      setCartasJ(res.data.cartas_jugador);
      aplicarRespuesta(res.data, true);
      setMontoSubir(res.data.big_blind * 2 || bigBlind * 2);
      showMsg("¡Partida iniciada! Elige tu acción.", "success");
    } catch (e: any) { showMsg(e.response?.data?.detail || "Error al iniciar.", "error"); }
    finally { setCargando(false); }
  };

  const accion = async (a: string) => {
    if (!sessionId || ronda === "terminada") return;
    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const cantidad = a === "subir" ? montoSubir : 0;
      const res = await axios.post(
        `${API_URL}/juegos/poker/${sessionId}/accion?accion=${a}&cantidad=${cantidad}`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      aplicarRespuesta(res.data);
    } catch (e: any) { showMsg(e.response?.data?.detail || "Error.", "error"); }
    finally { setCargando(false); }
  };

  const rendirse = async () => {
    if (!sessionId) return;
    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/poker/${sessionId}/rendirse`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      setResultado(res.data.resultado);
      setGanancia(res.data.ganancia ?? -apuesta);
      if (res.data.nuevo_saldo !== undefined)
        setUsuario(prev => prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev);
      setRonda("terminada");
      setSessionId(null);
      agregarHistorial(res.data.resultado, res.data.ganancia ?? -apuesta, apuesta, "Rendición", "", 0);
    } catch (e: any) { showMsg(e.response?.data?.detail || "Error.", "error"); }
    finally { setCargando(false); }
  };

  // ── Render de carta ──────────────────────────────────────────────
  const Carta = ({ c, oculta, comun: esCom, delay = 0 }: { c?: Carta; oculta?: boolean; comun?: boolean; delay?: number }) => {
    if (oculta) return (
      <div style={{
        width: 64, height: 90, borderRadius: 10, flexShrink: 0,
        background: "linear-gradient(135deg,#7c0a02,#c41e3a,#7c0a02)",
        border: "2px solid rgba(218,165,32,0.6)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: `cardDeal 0.4s ${delay}ms ease both`,
      }}>
        <div style={{ width: 46, height: 72, borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", background: "repeating-linear-gradient(45deg,rgba(255,255,255,0.03) 0,rgba(255,255,255,0.03) 2px,transparent 2px,transparent 8px)" }}>
          <span style={{ fontSize: 22, opacity: 0.5 }}>♠</span>
        </div>
      </div>
    );
    if (!c) return (
      <div style={{ width: 64, height: 90, borderRadius: 10, border: "2px dashed rgba(218,165,32,0.15)", background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "rgba(218,165,32,0.2)", fontSize: 22 }}>?</span>
      </div>
    );
    const isRed = c.palo === "♥️" || c.palo === "♦️";
    const color = isRed ? "#DC2626" : "#111827";
    const bg = esCom ? "linear-gradient(135deg,#ecfdf5,#d1fae5)" : "linear-gradient(135deg,#ffffff,#f5f5f5)";
    return (
      <div style={{
        width: 64, height: 90, borderRadius: 10, background: bg, flexShrink: 0,
        border: esCom ? "2px solid rgba(34,197,94,0.6)" : "2px solid rgba(218,165,32,0.5)",
        boxShadow: esCom ? "0 8px 24px rgba(0,0,0,0.5),0 0 14px rgba(34,197,94,0.2)" : "0 8px 20px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column", padding: "4px 6px",
        animation: `cardDeal 0.4s ${delay}ms cubic-bezier(0.34,1.56,0.64,1) both`,
        cursor: "default", transition: "transform 0.2s, box-shadow 0.2s",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-8px) scale(1.08)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, color, lineHeight: 1 }}>{c.valor}</div>
        <div style={{ fontSize: 12, color, lineHeight: 1 }}>{c.palo}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 26, color }}>{c.palo}</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 900, color, lineHeight: 1, alignSelf: "flex-end", transform: "rotate(180deg)" }}>{c.valor}</div>
      </div>
    );
  };

  const minSubir = toCall + bigBlind;

  if (!usuario) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at center,#1a0005 0%,#050005 100%)" }}>
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ boxShadow: "0 0 30px #DAA520" }} />
        <p className="font-bold tracking-widest" style={{ color: "#DAA520" }}>CARGANDO PÓKER...</p>
      </div>
    </div>
  );

  const enPartida = ronda !== "esperando" && ronda !== "terminada";

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top,#1a0005 0%,#07000a 50%,#050005 100%)" }}>
      <style>{`
        @keyframes shimmerGold {
          0%{background-position:-200% center} 100%{background-position:200% center}
        }
        @keyframes cardDeal {
          0%{opacity:0;transform:translateY(-30px) scale(0.8)}
          100%{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes floatUp {
          0%{opacity:0;transform:translateY(16px)} 100%{opacity:1;transform:translateY(0)}
        }
        @keyframes resultReveal {
          0%{opacity:0;transform:scale(0.6) rotate(-3deg)}
          60%{transform:scale(1.1) rotate(1deg)}
          100%{opacity:1;transform:scale(1) rotate(0)}
        }
        @keyframes pulseGold {
          0%,100%{box-shadow:0 0 20px rgba(218,165,32,0.4),0 0 40px rgba(196,30,58,0.1)}
          50%{box-shadow:0 0 50px rgba(218,165,32,0.8),0 0 80px rgba(196,30,58,0.3)}
        }
        @keyframes feltShimmer {
          0%,100%{box-shadow:inset 0 0 60px rgba(0,0,0,0.5),0 0 30px rgba(218,165,32,0.1)}
          50%{box-shadow:inset 0 0 80px rgba(0,0,0,0.6),0 0 50px rgba(218,165,32,0.2)}
        }
        .gold-text {
          background:linear-gradient(90deg,#DAA520,#FFD700,#FFA500,#FFD700,#DAA520);
          background-size:200% auto; -webkit-background-clip:text;
          -webkit-text-fill-color:transparent; background-clip:text;
          animation:shimmerGold 3s linear infinite;
        }
        .casino-card {
          background:linear-gradient(135deg,rgba(20,3,8,0.97),rgba(8,0,5,0.99));
          border:1px solid rgba(218,165,32,0.2);
        }
        .felt-table {
          background:radial-gradient(ellipse at center,#0d5c2e 0%,#074020 50%,#032612 100%);
          border:3px solid #DAA520;
          animation:feltShimmer 4s ease-in-out infinite;
        }
        .result-reveal{animation:resultReveal 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards}
        .float-up{animation:floatUp 0.4s ease-out forwards}
        .btn-accion {
          transition:all 0.15s; border:none; cursor:pointer; font-weight:900;
          letter-spacing:0.06em; border-radius:14px; padding:14px 20px;
          font-size:14px; text-transform:uppercase; color:white; flex:1;
        }
        .btn-accion:hover:not(:disabled){transform:translateY(-3px) scale(1.04);filter:brightness(1.2)}
        .btn-accion:active:not(:disabled){transform:scale(0.97)}
        .btn-accion:disabled{opacity:0.3;cursor:not-allowed}
        .scrollbar-poker::-webkit-scrollbar{width:3px}
        .scrollbar-poker::-webkit-scrollbar-thumb{background:#DAA520;border-radius:2px}
        .ronda-step {
          display:flex; flex-direction:column; align-items:center; gap:4px; flex:1;
        }
        .ronda-dot { width:10px; height:10px; border-radius:50%; }
      `}</style>

      {/* Notificación */}
      {notif && (
        <div className="fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center gap-3 shadow-2xl float-up"
          style={{
            background: notif.type === "success" ? "linear-gradient(135deg,#14532d,#166534)" : notif.type === "error" ? "linear-gradient(135deg,#7f1d1d,#991b1b)" : "linear-gradient(135deg,#78350f,#92400e)",
            border: `1px solid ${notif.type === "success" ? "rgba(34,197,94,0.5)" : notif.type === "error" ? "rgba(239,68,68,0.5)" : "rgba(218,165,32,0.5)"}`,
            color: notif.type === "success" ? "#86efac" : notif.type === "error" ? "#fca5a5" : "#fde68a",
          }}>
          <span style={{ fontSize: 20 }}>{notif.type === "success" ? "✅" : notif.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{notif.text}</span>
        </div>
      )}

      <Header usuario={usuario} cerrarSesion={() => { localStorage.clear(); navigate("/login"); }} setUsuario={setUsuario} />

      {/* Banner */}
      <div className="relative overflow-hidden py-6 px-4" style={{ borderBottom: "1px solid rgba(218,165,32,0.2)", background: "radial-gradient(ellipse at center,rgba(196,30,58,0.07) 0%,transparent 70%)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span style={{ fontSize: 32 }}>♠️</span>
              <h1 className="text-4xl md:text-5xl font-black gold-text">TEXAS HOLD'EM</h1>
              <span style={{ fontSize: 32 }}>♦️</span>
            </div>
            <p style={{ color: "#6B7280", fontSize: 14 }}>
              Póker vs Banca · Par, Doble Par, Trío, Escalera, Color, Full, Póker, Esc. Real
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <div className="casino-card rounded-2xl px-5 py-4 text-center">
              <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Saldo</div>
              <div className="text-2xl font-black gold-text">${usuario.saldo?.toLocaleString() ?? 0}</div>
            </div>
            {enPartida && (
              <>
                <div className="casino-card rounded-2xl px-5 py-4 text-center">
                  <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Bote</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#FFD700" }}>${bote.toLocaleString()}</div>
                </div>
                <div className="casino-card rounded-2xl px-5 py-4 text-center" style={{ border: `1px solid ${RONDA_COLOR[ronda] || "#374151"}40` }}>
                  <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Ronda</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: RONDA_COLOR[ronda] || "#EF4444" }}>{RONDA_LABEL[ronda]}</div>
                </div>
              </>
            )}
            <div className="casino-card rounded-2xl px-5 py-4 text-center">
              <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Partidas</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#60A5FA" }}>{stats.partidas}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* ══ MESA ══ */}
          <div className="xl:col-span-2 space-y-5">

            {/* Config (solo esperando) */}
            {ronda === "esperando" && (
              <div className="casino-card rounded-3xl p-6" style={{ boxShadow: "0 0 30px rgba(218,165,32,0.08)" }}>
                <h2 className="text-lg font-black gold-text uppercase tracking-widest mb-6">⚙️ Configura tu Mesa</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div style={{ fontSize: 11, color: "#374151", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>Buy-In</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {apuestasOk.map(a => {
                        const sel = apuesta === a;
                        const suf = usuario.saldo < a;
                        return (
                          <button key={a} onClick={() => setApuesta(a)} disabled={suf}
                            style={{
                              padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, transition: "all 0.15s",
                              background: sel ? "linear-gradient(135deg,#DAA520,#FFA500)" : "rgba(255,255,255,0.04)",
                              border: sel ? "2px solid #FFD700" : "2px solid rgba(218,165,32,0.15)",
                              color: sel ? "#0a0500" : suf ? "#374151" : "#D1D5DB",
                              boxShadow: sel ? "0 0 20px rgba(218,165,32,0.4)" : "none",
                              cursor: suf ? "not-allowed" : "pointer", opacity: suf ? 0.4 : 1,
                            }}>
                            ${a.toLocaleString()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#374151", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>Small Blind</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {blindsOk.map(b => {
                        const sel = blind === b;
                        return (
                          <button key={b} onClick={() => setBlind(b)}
                            style={{
                              padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, transition: "all 0.15s",
                              background: sel ? "linear-gradient(135deg,#7C3AED,#A855F7)" : "rgba(255,255,255,0.04)",
                              border: sel ? "2px solid #A855F7" : "2px solid rgba(168,85,247,0.15)",
                              color: sel ? "white" : "#D1D5DB",
                              boxShadow: sel ? "0 0 20px rgba(168,85,247,0.4)" : "none",
                              cursor: "pointer",
                            }}>
                            ${b} / ${b * 2}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button onClick={iniciar} disabled={cargando || usuario.saldo < apuesta}
                  style={{
                    width: "100%", padding: "18px", borderRadius: 16, fontWeight: 900,
                    fontSize: 18, textTransform: "uppercase", letterSpacing: "0.08em",
                    background: "linear-gradient(135deg,#7c0a02,#c41e3a,#7c0a02)",
                    border: "3px solid rgba(218,165,32,0.6)",
                    color: "white", cursor: cargando || usuario.saldo < apuesta ? "not-allowed" : "pointer",
                    opacity: cargando || usuario.saldo < apuesta ? 0.5 : 1,
                    boxShadow: "0 0 40px rgba(196,30,58,0.3), 0 0 60px rgba(218,165,32,0.1)",
                    animation: "pulseGold 2.5s ease-in-out infinite", transition: "all 0.15s",
                  }}>
                  {cargando ? "Repartiendo..." : `♠ Iniciar Partida · Buy-In $${apuesta.toLocaleString()} ♠`}
                </button>
              </div>
            )}

            {/* Mesa de juego */}
            {(enPartida || ronda === "terminada") && (
              <div>
                {/* Progress de ronda */}
                <div className="casino-card rounded-2xl px-6 py-4 mb-4">
                  <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    {["pre_flop","flop","turn","river","showdown"].map((r, i, arr) => {
                      const steps = ["pre_flop","flop","turn","river","showdown"];
                      const curIdx = steps.indexOf(ronda);
                      const thisIdx = steps.indexOf(r);
                      const past = thisIdx < curIdx;
                      const cur  = thisIdx === curIdx;
                      const col  = RONDA_COLOR[r] || "#374151";
                      return (
                        <React.Fragment key={r}>
                          <div className="ronda-step">
                            <div className="ronda-dot" style={{ background: cur ? col : past ? "#4ADE80" : "rgba(255,255,255,0.1)", boxShadow: cur ? `0 0 10px ${col}` : "none", transition: "all 0.4s" }} />
                            <div style={{ fontSize: 10, fontWeight: 700, color: cur ? col : past ? "#4ADE80" : "#374151", letterSpacing: "0.06em" }}>
                              {RONDA_LABEL[r]}
                            </div>
                          </div>
                          {i < arr.length - 1 && (
                            <div style={{ flex: 0.5, height: 2, background: past ? "#4ADE80" : "rgba(255,255,255,0.08)", transition: "background 0.4s", marginBottom: 16 }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Felt table */}
                <div className="felt-table rounded-3xl p-6 space-y-6">

                  {/* Banca */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(218,165,32,0.7)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        🏦 Banca
                      </div>
                      <div style={{ fontSize: 13, color: "#4ADE80", fontWeight: 700 }}>Fichas: ${fichasB.toLocaleString()}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {mostrarB
                        ? cartasB.map((c, i) => <Carta key={i} c={c} delay={i * 120} />)
                        : [0, 1].map(i => <Carta key={i} oculta delay={i * 100} />)
                      }
                      {mostrarB && manoB && (
                        <div style={{ display: "flex", alignItems: "center", marginLeft: 10 }}>
                          <div style={{ padding: "6px 14px", borderRadius: 20, background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.4)", color: "#C4B5FD", fontSize: 13, fontWeight: 700 }}>
                            {manoB}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mensaje banca */}
                  {mensajeB && ronda !== "terminada" && (
                    <div style={{ textAlign: "center", padding: "8px 16px", borderRadius: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(218,165,32,0.2)" }}>
                      <span style={{ fontSize: 13, color: "rgba(218,165,32,0.8)", fontStyle: "italic" }}>💬 {mensajeB}</span>
                    </div>
                  )}

                  {/* Cartas comunitarias */}
                  <div>
                    <div style={{ textAlign: "center", marginBottom: 10, fontSize: 12, fontWeight: 700, color: "rgba(218,165,32,0.6)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      — Cartas Comunitarias —
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                      {[0,1,2,3,4].map(i => comun[i]
                        ? <Carta key={i} c={comun[i]} comun delay={i * 100} />
                        : <Carta key={i} />
                      )}
                    </div>
                  </div>

                  {/* Bote */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div style={{ padding: "10px 28px", borderRadius: 20, background: "rgba(218,165,32,0.15)", border: "2px solid rgba(218,165,32,0.4)", textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "rgba(218,165,32,0.6)", letterSpacing: "0.1em" }}>BOTE</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: "#FFD700", textShadow: "0 0 20px rgba(218,165,32,0.5)" }}>${bote.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Jugador */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(218,165,32,0.7)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        👤 Tu Mano
                      </div>
                      <div style={{ fontSize: 13, color: "#FCD34D", fontWeight: 700 }}>Fichas: ${fichasJ.toLocaleString()}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {cartasJ.map((c, i) => <Carta key={i} c={c} delay={i * 100} />)}
                      {manoJ && ronda === "terminada" && (
                        <div style={{ display: "flex", alignItems: "center", marginLeft: 10 }}>
                          <div style={{ padding: "6px 14px", borderRadius: 20, background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", color: "#86EFAC", fontSize: 13, fontWeight: 700 }}>
                            {manoJ}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resultado */}
                {ronda === "terminada" && resultado && (
                  <div className="result-reveal casino-card rounded-3xl p-6 mt-4 text-center" style={{
                    border: `2px solid ${ganancia > 0 ? "rgba(34,197,94,0.5)" : ganancia < 0 ? "rgba(239,68,68,0.4)" : "rgba(218,165,32,0.4)"}`,
                    boxShadow: `0 0 40px ${ganancia > 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.1)"}`,
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: ganancia > 0 ? "#4ADE80" : ganancia < 0 ? "#F87171" : "#FFD700", marginBottom: 8 }}>
                      {resultado}
                    </div>
                    {ganancia !== 0 && (
                      <div style={{ fontSize: 32, fontWeight: 900, color: ganancia > 0 ? "#4ADE80" : "#F87171" }}>
                        {ganancia > 0 ? `+$${ganancia.toLocaleString()}` : `-$${Math.abs(ganancia).toLocaleString()}`}
                      </div>
                    )}
                    <button onClick={resetEstado} style={{
                      marginTop: 16, padding: "14px 32px", borderRadius: 14, fontWeight: 900, fontSize: 15,
                      background: "linear-gradient(135deg,#DAA520,#FFA500)", color: "#0a0500",
                      border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em",
                      boxShadow: "0 0 20px rgba(218,165,32,0.4)", transition: "all 0.15s",
                    }}>
                      ♠ Nueva Partida
                    </button>
                  </div>
                )}

                {/* Controles */}
                {enPartida && (
                  <div className="casino-card rounded-3xl p-5 mt-4">
                    {/* Info para actuar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, fontSize: 13 }}>
                      <div>
                        {toCall > 0
                          ? <span style={{ color: "#FCD34D", fontWeight: 700 }}>Debes igualar: <span style={{ color: "#FFD700", fontSize: 16 }}>${toCall.toLocaleString()}</span></span>
                          : <span style={{ color: "#4ADE80", fontWeight: 700 }}>✓ Puedes pasar (Check)</span>
                        }
                      </div>
                      <span style={{ color: "#374151", fontSize: 11 }}>SB ${smallBlind} / BB ${bigBlind}</span>
                    </div>

                    {/* Botones de acción */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      <button className="btn-accion" onClick={() => accion("pasar")}
                        disabled={cargando || toCall > 0}
                        style={{ background: "linear-gradient(135deg,#14532d,#166534)", boxShadow: toCall === 0 ? "0 0 16px rgba(34,197,94,0.3)" : "none" }}>
                        ✓ Pasar
                      </button>
                      <button className="btn-accion" onClick={() => accion("igualar")}
                        disabled={cargando || toCall === 0 || fichasJ < toCall}
                        style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", boxShadow: toCall > 0 ? "0 0 16px rgba(37,99,235,0.4)" : "none" }}>
                        ↔ Igualar {toCall > 0 ? `$${toCall.toLocaleString()}` : ""}
                      </button>
                      <button className="btn-accion" onClick={() => accion("retirarse")}
                        disabled={cargando}
                        style={{ background: "linear-gradient(135deg,#7f1d1d,#991b1b)", flex: "0 0 auto" }}>
                        ✗ Retirarse
                      </button>
                    </div>

                    {/* Subida */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ flex: 1, background: "rgba(0,0,0,0.4)", borderRadius: 12, border: "1px solid rgba(218,165,32,0.2)", padding: "4px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "rgba(218,165,32,0.5)", fontSize: 13 }}>$</span>
                        <input
                          type="number" min={minSubir} step={bigBlind}
                          value={montoSubir}
                          onChange={e => setMontoSubir(Math.max(minSubir, +e.target.value))}
                          style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#FFD700", fontWeight: 700, fontSize: 16 }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[1, 2, 3].map(m => (
                          <button key={m} onClick={() => setMontoSubir(Math.min(fichasJ, minSubir * m))}
                            style={{ padding: "8px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(218,165,32,0.1)", border: "1px solid rgba(218,165,32,0.2)", color: "#FCD34D", cursor: "pointer" }}>
                            {m}×
                          </button>
                        ))}
                        <button onClick={() => setMontoSubir(fichasJ)}
                          style={{ padding: "8px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", color: "#F87171", cursor: "pointer" }}>
                          All-In
                        </button>
                      </div>
                      <button className="btn-accion" onClick={() => accion("subir")}
                        disabled={cargando || montoSubir < minSubir || fichasJ < montoSubir}
                        style={{ background: "linear-gradient(135deg,#78350f,#d97706)", flex: "0 0 auto", padding: "12px 16px" }}>
                        ↑ Subir ${montoSubir.toLocaleString()}
                      </button>
                    </div>

                    {/* Rendirse */}
                    <div style={{ marginTop: 10, textAlign: "right" }}>
                      <button onClick={rendirse} disabled={cargando}
                        style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "none", border: "1px solid rgba(239,68,68,0.25)", color: "rgba(239,68,68,0.5)", cursor: cargando ? "not-allowed" : "pointer" }}>
                        🏳 Rendirse (recuperar 50% buy-in)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ══ PANEL LATERAL ══ */}
          <div className="space-y-5">

            {/* Stats */}
            <div className="casino-card rounded-2xl p-5">
              <h3 className="text-sm font-black gold-text uppercase tracking-widest mb-4">📊 Estadísticas</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: "Partidas", val: stats.partidas, color: "#60A5FA" },
                  { label: "Ganadas", val: stats.ganadas, color: "#4ADE80" },
                  { label: "W-Rate", val: stats.partidas > 0 ? `${((stats.ganadas / stats.partidas) * 100).toFixed(0)}%` : "0%", color: "#FFD700" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ padding: "10px 6px", borderRadius: 10, textAlign: "center", background: "rgba(0,0,0,0.4)", border: `1px solid ${color}15` }}>
                    <div style={{ fontSize: 9, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#374151" }}>Balance total</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: stats.balance >= 0 ? "#4ADE80" : "#F87171" }}>
                  {stats.balance >= 0 ? "+" : ""}${stats.balance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Jugadas */}
            <div className="casino-card rounded-2xl p-5">
              <h3 className="text-sm font-black gold-text uppercase tracking-widest mb-4">🃏 Jugadas (mejor → peor)</h3>
              <div className="space-y-1">
                {[
                  ["Escalera Real", "A K Q J 10 del mismo palo", "#FFD700", "10"],
                  ["Escalera de Color", "5 del mismo palo seguidas", "#60A5FA", "9"],
                  ["Póker", "4 cartas iguales", "#EF4444", "8"],
                  ["Full House", "Trío + Par", "#F97316", "7"],
                  ["Color", "5 del mismo palo", "#A855F7", "6"],
                  ["Escalera", "5 cartas seguidas", "#10B981", "5"],
                  ["Trío", "3 cartas iguales", "#F59E0B", "4"],
                  ["Doble Par", "2 pares diferentes", "#6366F1", "3"],
                  ["Par", "2 cartas iguales", "#64748B", "2"],
                  ["Carta Alta", "La carta más alta", "#374151", "1"],
                ].map(([nombre, desc, color, rank]) => (
                  <div key={nombre} style={{ padding: "7px 10px", borderRadius: 9, background: "rgba(0,0,0,0.35)", border: `1px solid ${color}18`, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: `${color}22`, border: `1px solid ${color}40`, fontSize: 10, fontWeight: 900, color, display: "flex", alignItems: "center", justifyContent: "center" }}>{rank}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color }}>{nombre}</div>
                      <div style={{ fontSize: 10, color: "#4B5563" }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historial */}
            <div className="casino-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black gold-text uppercase tracking-widest">📜 Historial</h3>
                {historial.length > 0 && (
                  <button onClick={() => { setHistorial([]); localStorage.removeItem("historial_poker"); recalcStats([]); }}
                    style={{ fontSize: 11, color: "#F87171", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                    Limpiar
                  </button>
                )}
              </div>
              {historial.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 36, opacity: 0.1 }}>♠️</div>
                  <div style={{ color: "#374151", fontSize: 12, marginTop: 8 }}>Sin partidas aún</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-poker pr-1">
                  {historial.map((h, i) => (
                    <div key={h.id} style={{
                      padding: "9px 12px", borderRadius: 10, opacity: i === 0 ? 1 : 0.75,
                      background: h.ganancia > 0 ? "rgba(34,197,94,0.07)" : h.ganancia < 0 ? "rgba(239,68,68,0.07)" : "rgba(218,165,32,0.07)",
                      border: `1px solid ${h.ganancia > 0 ? "rgba(34,197,94,0.2)" : h.ganancia < 0 ? "rgba(239,68,68,0.15)" : "rgba(218,165,32,0.2)"}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#4B5563" }}>{h.fecha} · Buy-in ${h.buyIn.toLocaleString()}</div>
                          {h.manoJugador && <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Tú: <span style={{ color: "#D1D5DB" }}>{h.manoJugador}</span>{h.manoBanca ? ` vs ${h.manoBanca}` : ""}</div>}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: h.ganancia > 0 ? "#4ADE80" : h.ganancia < 0 ? "#F87171" : "#FFD700", flexShrink: 0 }}>
                          {h.ganancia > 0 ? `+$${h.ganancia.toLocaleString()}` : h.ganancia < 0 ? `-$${Math.abs(h.ganancia).toLocaleString()}` : "Empate"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
