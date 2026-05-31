import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import Header from "../components/header";
import Footer from "../components/footer";
import { API_URL } from "../api/auth";

interface Usuario {
  id: number; username: string; saldo: number; verificado: boolean; nivel?: string; verificado_pendiente?: boolean;
}
interface HistorialGiro {
  id: number; resultado: string[]; ganancia: number; fecha: string; apuesta: number;
}

export default function Tragamonedas() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [reels, setReels] = useState<string[]>(["❔", "❔", "❔"]);
  const [girando, setGirando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [gananciaMostrar, setGananciaMostrar] = useState<number>(0);
  const [efectoGanancia, setEfectoGanancia] = useState(false);
  const [historial, setHistorial] = useState<HistorialGiro[]>([]);
  const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(500);
  const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([100, 500, 1000, 2000, 5000]);
  const [estadisticas, setEstadisticas] = useState({ totalTiradas: 0, gananciaTotal: 0, gastoTotal: 0, balance: 0, premiosObtenidos: 0 });
  const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({ totalTiradasAcum: 0, gananciaTotalAcum: 0, gastoTotalAcum: 0, premiosObtenidosAcum: 0 });
  const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
  const reelRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);

  const SYMBOLS = ["🍒", "🍋", "🍊", "🍉", "⭐", "🔔", "🍇", "7️⃣"];
  const TABLA_PAGOS: Record<string, number> = { "7️⃣": 100, "🍇": 50, "🔔": 25, "⭐": 5, "🍉": 4, "🍊": 3, "🍋": 2, "🍒": 1 };
  const SYMBOL_COLORS: Record<string, string> = { "7️⃣": "#EF4444", "🍇": "#A855F7", "🔔": "#EAB308", "⭐": "#F59E0B", "🍉": "#22C55E", "🍊": "#F97316", "🍋": "#FDE047", "🍒": "#F43F5E", "❔": "#6B7280" };

  useEffect(() => {
    if (!usuario) {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      const u = localStorage.getItem("usuario");
      if (u) try { setUsuario(JSON.parse(u)); } catch {}
    }
  }, [navigate, usuario]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(`${API_URL}/juegos/tragamonedas/juegos/tragamonedas/apuestas-permitidas`);
        setApuestasPermitidas(res.data.apuestas_permitidas);
        setApuestaSeleccionada(res.data.apuestas_permitidas[1] || 500);
      } catch {}
    };
    cargar();
  }, []);

  useEffect(() => {
    const h = localStorage.getItem("historial_tragamonedas");
    if (h) setHistorial(JSON.parse(h));
    const s = localStorage.getItem("estadisticas_acumulativas_tragamonedas");
    if (s) {
      const p = JSON.parse(s);
      setEstadisticasAcumulativas(p);
      setEstadisticas({ totalTiradas: p.totalTiradasAcum, gananciaTotal: p.gananciaTotalAcum, gastoTotal: p.gastoTotalAcum, balance: p.gananciaTotalAcum - p.gastoTotalAcum, premiosObtenidos: p.premiosObtenidosAcum });
    }
  }, []);

  useEffect(() => { if (historial.length > 0) localStorage.setItem("historial_tragamonedas", JSON.stringify(historial.slice(0, 10))); }, [historial]);
  useEffect(() => { if (estadisticasAcumulativas.totalTiradasAcum > 0) localStorage.setItem("estadisticas_acumulativas_tragamonedas", JSON.stringify(estadisticasAcumulativas)); }, [estadisticasAcumulativas]);

  const actualizarEstadisticas = (g: HistorialGiro) => {
    const ep = g.ganancia > 0;
    setEstadisticasAcumulativas(prev => ({ totalTiradasAcum: prev.totalTiradasAcum + 1, gananciaTotalAcum: prev.gananciaTotalAcum + (g.ganancia || 0), gastoTotalAcum: prev.gastoTotalAcum + g.apuesta, premiosObtenidosAcum: prev.premiosObtenidosAcum + (ep ? 1 : 0) }));
    setEstadisticas(prev => { const gT = prev.gananciaTotal + (g.ganancia || 0); const gsT = prev.gastoTotal + g.apuesta; return { totalTiradas: prev.totalTiradas + 1, gananciaTotal: gT, gastoTotal: gsT, balance: gT - gsT, premiosObtenidos: prev.premiosObtenidos + (ep ? 1 : 0) }; });
  };

  const agregarAlHistorial = (resultado: string[], ganancia: number, apuesta: number) => {
    const nuevo: HistorialGiro = { id: Date.now(), resultado, ganancia, apuesta, fecha: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const nuevos = [nuevo, ...historial.slice(0, 9)];
    setHistorial(nuevos);
    actualizarEstadisticas(nuevo);
  };

  const animarRodillo = (index: number, duracion: number) => {
    return new Promise<void>((resolve) => {
      const rodillo = reelRefs.current[index];
      if (!rodillo) return resolve();
      let contador = 0;
      const maxGiros = Math.floor(duracion / 80);
      const interval = setInterval(() => {
        const s = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        setReels(prev => { const n = [...prev]; n[index] = s; return n; });
        contador++;
        if (contador >= maxGiros) { clearInterval(interval); resolve(); }
      }, 80);
    });
  };

  const animarConfetti = () => {
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ["#DAA520", "#FFD700", "#FFA500", "#F59E0B"] });
    setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 60, origin: { x: 0 }, colors: ["#EF4444", "#EC4899"] }), 200);
    setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 60, origin: { x: 1 }, colors: ["#22C55E", "#10B981"] }), 400);
  };

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotificacion({ text, type });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const girarTragamonedas = async () => {
    if (!usuario) return showMsg("Debes iniciar sesión.", "error");
    if (girando) return;
    if (usuario.saldo < apuestaSeleccionada) return showMsg("Saldo insuficiente.", "error");
    setMensaje(null); setGananciaMostrar(0); setGirando(true); setEfectoGanancia(false);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/juegos/tragamonedas/juegos/tragamonedas?apuesta=${apuestaSeleccionada}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const resultado: string[] = res.data?.resultado ?? SYMBOLS.slice(0, 3);
      const ganancia = res.data?.ganancia ?? 0;
      const mensajeServidor = res.data?.mensaje ?? "Resultado procesado";
      await Promise.all([animarRodillo(0, 1800), animarRodillo(1, 2000), animarRodillo(2, 2200)]);
      setReels(resultado); setGananciaMostrar(ganancia); setMensaje(mensajeServidor);
      setUsuario(prev => prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev);
      if (ganancia > 0) { setEfectoGanancia(true); animarConfetti(); }
      agregarAlHistorial(resultado, ganancia, apuestaSeleccionada);
    } catch (err: any) { showMsg(err.response?.data?.detail || "Error al girar.", "error"); }
    finally { setGirando(false); }
  };

  const limpiarHistorial = () => {
    setHistorial([]); localStorage.removeItem("historial_tragamonedas");
    setEstadisticas({ totalTiradas: estadisticasAcumulativas.totalTiradasAcum, gananciaTotal: estadisticasAcumulativas.gananciaTotalAcum, gastoTotal: estadisticasAcumulativas.gastoTotalAcum, balance: estadisticasAcumulativas.gananciaTotalAcum - estadisticasAcumulativas.gastoTotalAcum, premiosObtenidos: estadisticasAcumulativas.premiosObtenidosAcum });
  };

  const limpiarTodasEstadisticas = () => {
    setHistorial([]); localStorage.removeItem("historial_tragamonedas"); localStorage.removeItem("estadisticas_acumulativas_tragamonedas");
    setEstadisticas({ totalTiradas: 0, gananciaTotal: 0, gastoTotal: 0, balance: 0, premiosObtenidos: 0 });
    setEstadisticasAcumulativas({ totalTiradasAcum: 0, gananciaTotalAcum: 0, gastoTotalAcum: 0, premiosObtenidosAcum: 0 });
    showMsg("Estadísticas reiniciadas", "info");
  };

  const calcularPago = (simbolo: string) => (TABLA_PAGOS[simbolo] || 0) * apuestaSeleccionada;

  if (!usuario) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at center, #0a0018 0%, #05000f 100%)" }}>
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ boxShadow: "0 0 30px #DAA520" }} />
        <p className="font-bold tracking-widest" style={{ color: "#DAA520" }}>CARGANDO TRAGAMONEDAS...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #0a0018 0%, #050010 55%, #08000a 100%)" }}>
      <style>{`
        @keyframes shimmerGold {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes shimmerPurple {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spinReel {
          0% { filter: blur(0px); transform: scaleY(1); }
          50% { filter: blur(3px); transform: scaleY(1.04); }
          100% { filter: blur(0px); transform: scaleY(1); }
        }
        @keyframes floatUp {
          0% { opacity:0; transform:translateY(20px); }
          100% { opacity:1; transform:translateY(0); }
        }
        @keyframes jackpotPulse {
          0%, 100% { text-shadow: 0 0 20px #DAA520, 0 0 40px #DAA520; transform: scale(1); }
          50% { text-shadow: 0 0 40px #FFD700, 0 0 80px #FFD700, 0 0 120px #FFA500; transform: scale(1.04); }
        }
        @keyframes winReveal {
          0% { opacity:0; transform: scale(0.5) rotate(-5deg); }
          60% { transform: scale(1.15) rotate(2deg); }
          100% { opacity:1; transform: scale(1) rotate(0deg); }
        }
        @keyframes reelGlow {
          0%, 100% { box-shadow: inset 0 0 20px rgba(218,165,32,0.15), 0 0 20px rgba(218,165,32,0.1); }
          50% { box-shadow: inset 0 0 40px rgba(218,165,32,0.3), 0 0 50px rgba(218,165,32,0.25); }
        }
        @keyframes pulseGold {
          0%, 100% { box-shadow: 0 0 20px rgba(218,165,32,0.4), 0 0 40px rgba(168,85,247,0.2); }
          50% { box-shadow: 0 0 50px rgba(218,165,32,0.8), 0 0 80px rgba(168,85,247,0.4); }
        }
        @keyframes lightBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .gold-text {
          background: linear-gradient(90deg, #DAA520, #FFD700, #FFA500, #FFD700, #DAA520);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; animation: shimmerGold 3s linear infinite;
        }
        .purple-text {
          background: linear-gradient(90deg, #7C3AED, #A855F7, #C084FC, #A855F7, #7C3AED);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; animation: shimmerPurple 3s linear infinite;
        }
        .slot-card {
          background: linear-gradient(135deg, rgba(10,0,24,0.97), rgba(5,0,18,0.99));
          border: 1px solid rgba(168,85,247,0.12);
        }
        .spin-anim { animation: spinReel 0.15s ease-in-out infinite; }
        .win-reveal { animation: winReveal 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .float-up { animation: floatUp 0.4s ease-out forwards; }
        .jackpot-text { animation: jackpotPulse 2s ease-in-out infinite; }
        .reel-win { animation: reelGlow 0.8s ease-in-out infinite; }
        .spin-btn {
          transition: all 0.15s; border: none; cursor: pointer; font-weight: 900;
          letter-spacing: 0.06em; border-radius: 16px; font-size: 18px;
          text-transform: uppercase; color: white;
        }
        .spin-btn:hover:not(:disabled) { transform: translateY(-3px) scale(1.03); filter: brightness(1.2); }
        .spin-btn:active:not(:disabled) { transform: scale(0.97); }
        .spin-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .scrollbar-slot::-webkit-scrollbar { width: 3px; }
        .scrollbar-slot::-webkit-scrollbar-thumb { background: #7C3AED; border-radius: 2px; }
        .cab-light { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
      `}</style>

      {notificacion && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center gap-3 shadow-2xl float-up`}
          style={{ background: notificacion.type === "success" ? "linear-gradient(135deg,#14532d,#166534)" : notificacion.type === "error" ? "linear-gradient(135deg,#7f1d1d,#991b1b)" : "linear-gradient(135deg,#1e1b4b,#3730a3)", border: `1px solid ${notificacion.type === "success" ? "rgba(34,197,94,0.5)" : notificacion.type === "error" ? "rgba(239,68,68,0.5)" : "rgba(168,85,247,0.5)"}`, color: notificacion.type === "success" ? "#86efac" : notificacion.type === "error" ? "#fca5a5" : "#C4B5FD" }}>
          <span style={{ fontSize: 20 }}>{notificacion.type === "success" ? "✅" : notificacion.type === "error" ? "❌" : "🎰"}</span>
          <span>{notificacion.text}</span>
        </div>
      )}

      <Header usuario={usuario} cerrarSesion={() => { localStorage.clear(); navigate("/login"); }} setUsuario={setUsuario} />

      {/* Banner */}
      <div className="relative overflow-hidden py-6 px-4" style={{ borderBottom: "1px solid rgba(168,85,247,0.15)", background: "radial-gradient(ellipse at center, rgba(168,85,247,0.06) 0%, transparent 70%)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span style={{ fontSize: 32 }}>🎰</span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight gold-text">TRAGAMONEDAS CLÁSICO</h1>
            </div>
            <p style={{ color: "#6B7280" }}>
              3 rodillos · Jackpot <span style={{ color: "#EF4444", fontWeight: 700 }}>7️⃣7️⃣7️⃣</span> paga{" "}
              <span style={{ color: "#FFD700", fontWeight: 700 }}>100×</span> tu apuesta
            </p>
          </div>
          <div className="flex gap-4">
            <div className="slot-card rounded-2xl px-5 py-4 text-center" style={{ border: "1px solid rgba(218,165,32,0.2)" }}>
              <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Saldo</div>
              <div className="text-2xl font-black gold-text">${usuario?.saldo?.toLocaleString() ?? 0}</div>
            </div>
            <div className="slot-card rounded-2xl px-5 py-4 text-center">
              <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Premios</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#A855F7" }}>{estadisticas.premiosObtenidos}</div>
            </div>
            <div className="slot-card rounded-2xl px-5 py-4 text-center">
              <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Balance</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: estadisticas.balance >= 0 ? "#4ADE80" : "#F87171" }}>
                {estadisticas.balance >= 0 ? "+" : ""}${estadisticas.balance}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* MÁQUINA */}
          <div className="xl:col-span-2 space-y-5">

            {/* Selector apuesta */}
            <div className="slot-card rounded-3xl p-6" style={{ border: "1px solid rgba(218,165,32,0.15)" }}>
              <h2 className="text-sm font-black gold-text uppercase tracking-widest mb-5 text-center">💰 Apuesta por Giro</h2>
              <div className="flex flex-wrap gap-3 justify-center mb-5">
                {apuestasPermitidas.map((ap, i) => {
                  const cols = ["#7f1d1d:#DC2626", "#1e1b4b:#7C3AED", "#14532d:#16A34A", "#78350f:#D97706", "#0c4a6e:#0284C7"].map(c => c.split(":"));
                  const [bg, border] = cols[i % cols.length];
                  const sel = apuestaSeleccionada === ap;
                  const dis = usuario.saldo < ap;
                  return (
                    <button key={ap} onClick={() => setApuestaSeleccionada(ap)} disabled={dis}
                      style={{
                        padding: "10px 20px", borderRadius: 12, fontWeight: 900, fontSize: 14,
                        background: sel ? border : bg, border: `2px solid ${border}`,
                        color: sel ? "white" : "rgba(255,255,255,0.5)",
                        boxShadow: sel ? `0 0 20px ${border}60, 0 6px 16px rgba(0,0,0,0.4)` : "0 4px 10px rgba(0,0,0,0.3)",
                        transform: sel ? "translateY(-3px) scale(1.05)" : "scale(1)",
                        transition: "all 0.15s", cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.3 : 1,
                      }}>
                      ${ap >= 1000 ? `${ap / 1000}K` : ap}
                    </button>
                  );
                })}
              </div>
              <div style={{ textAlign: "center", fontSize: 13, color: "#6B7280" }}>
                Apuesta: <span style={{ color: "#FFD700", fontWeight: 900, fontSize: 18 }}>${apuestaSeleccionada.toLocaleString()}</span>
                <span style={{ margin: "0 8px", color: "#374151" }}>·</span>
                Premio máx: <span style={{ color: "#EF4444", fontWeight: 700 }}>${(apuestaSeleccionada * 100).toLocaleString()}</span>
              </div>
            </div>

            {/* Slot Machine Cabinet */}
            <div className="slot-card rounded-3xl overflow-hidden" style={{ border: "2px solid rgba(218,165,32,0.4)", boxShadow: "0 0 60px rgba(168,85,247,0.1), 0 0 30px rgba(218,165,32,0.08)" }}>

              {/* Cabinet top lights */}
              <div style={{ background: "linear-gradient(135deg, #1a0030, #0d0020)", padding: "12px 24px", borderBottom: "1px solid rgba(218,165,32,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {["#EF4444", "#EAB308", "#22C55E"].map((c, i) => (
                    <div key={i} className="cab-light" style={{ background: c, boxShadow: `0 0 8px ${c}`, animation: `lightBlink ${1 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <div className="gold-text font-black tracking-widest" style={{ fontSize: 13, overflow: "hidden", flex: 1, margin: "0 16px" }}>
                  <span style={{ display: "inline-block", animation: "marquee 10s linear infinite", whiteSpace: "nowrap" }}>
                    ★ JACKPOT 7️⃣7️⃣7️⃣ PAGA 100× ★ GIRA Y GANA ★ TRAGAMONEDAS DELUXE ★
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {["#22C55E", "#EAB308", "#EF4444"].map((c, i) => (
                    <div key={i} className="cab-light" style={{ background: c, boxShadow: `0 0 8px ${c}`, animation: `lightBlink ${1.2 + i * 0.25}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>

              {/* Reel window */}
              <div style={{ padding: "32px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  display: "flex", gap: 16, justifyContent: "center", alignItems: "center",
                  padding: "20px 24px", borderRadius: 20,
                  background: "linear-gradient(135deg, #060010, #0a0018)",
                  border: "3px solid rgba(218,165,32,0.6)",
                  boxShadow: "inset 0 4px 20px rgba(0,0,0,0.8), 0 0 40px rgba(218,165,32,0.15)",
                  marginBottom: 24,
                }}>
                  {reels.map((simbolo, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div
                        ref={el => { reelRefs.current[i] = el; }}
                        className={girando ? "spin-anim" : ""}
                        style={{
                          width: 100, height: 100, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 56, background: "linear-gradient(135deg, #0e0020, #160028)",
                          border: `3px solid ${efectoGanancia && !girando && simbolo !== "❔" ? (SYMBOL_COLORS[simbolo] || "#DAA520") : "rgba(218,165,32,0.35)"}`,
                          boxShadow: efectoGanancia && !girando && simbolo !== "❔"
                            ? `0 0 30px ${SYMBOL_COLORS[simbolo] || "#DAA520"}60, inset 0 0 20px rgba(218,165,32,0.1)`
                            : "inset 0 4px 12px rgba(0,0,0,0.6)",
                          transition: "border-color 0.3s, box-shadow 0.3s",
                        }}
                      >
                        {simbolo}
                      </div>
                      {i < 2 && (
                        <div style={{ position: "absolute", right: -8, width: 4, height: 80, background: "rgba(218,165,32,0.2)", borderRadius: 2 }} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Payline indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 2, background: "linear-gradient(to right, transparent, rgba(218,165,32,0.6), transparent)" }} />
                  <span style={{ fontSize: 10, color: "rgba(218,165,32,0.5)", fontWeight: 700, letterSpacing: "0.15em" }}>LÍNEA DE PAGO</span>
                  <div style={{ flex: 1, height: 2, background: "linear-gradient(to left, transparent, rgba(218,165,32,0.6), transparent)" }} />
                </div>

                {/* WIN Result */}
                {!girando && gananciaMostrar > 0 && mensaje && (
                  <div className="win-reveal" style={{ marginBottom: 20, textAlign: "center", padding: "20px 32px", borderRadius: 20, background: "rgba(218,165,32,0.1)", border: "2px solid rgba(218,165,32,0.5)", boxShadow: "0 0 40px rgba(218,165,32,0.2)" }}>
                    <div style={{ fontSize: 12, color: "#DAA520", fontWeight: 700, letterSpacing: "0.2em", marginBottom: 4 }}>🏆 PREMIO</div>
                    <div className="jackpot-text" style={{ fontSize: 40, fontWeight: 900, color: "#FFD700", lineHeight: 1 }}>+${gananciaMostrar.toLocaleString()}</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                      {reels[0]} {reels[1]} {reels[2]}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{mensaje}</div>
                  </div>
                )}

                {/* No win message */}
                {!girando && gananciaMostrar === 0 && mensaje && !mensaje.includes("Error") && (
                  <div style={{ marginBottom: 16, textAlign: "center", padding: "10px 24px", borderRadius: 12, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                    <span style={{ fontSize: 13, color: "rgba(168,85,247,0.7)" }}>{mensaje}</span>
                  </div>
                )}

                {/* Spin Button */}
                <button
                  onClick={girarTragamonedas}
                  disabled={girando || usuario.saldo < apuestaSeleccionada}
                  className="spin-btn"
                  style={{
                    padding: "20px 56px", width: "100%", maxWidth: 380, fontSize: 20,
                    background: girando || usuario.saldo < apuestaSeleccionada
                      ? "rgba(30,10,50,0.5)"
                      : "linear-gradient(135deg, #5B21B6, #7C3AED, #6D28D9)",
                    border: "3px solid rgba(218,165,32,0.6)",
                    boxShadow: girando || usuario.saldo < apuestaSeleccionada ? "none" : "0 0 40px rgba(124,58,237,0.4), 0 0 60px rgba(218,165,32,0.1)",
                    animation: girando || usuario.saldo < apuestaSeleccionada ? "none" : "pulseGold 2s ease-in-out infinite",
                  }}
                >
                  {girando ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <svg className="animate-spin" style={{ width: 22, height: 22 }} viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      GIRANDO...
                    </span>
                  ) : `🎰 GIRAR · $${apuestaSeleccionada.toLocaleString()}`}
                </button>
              </div>
            </div>
          </div>

          {/* PANEL LATERAL */}
          <div className="space-y-5">

            {/* Stats */}
            <div className="slot-card rounded-2xl p-5" style={{ border: "1px solid rgba(168,85,247,0.15)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black gold-text uppercase tracking-widest">📊 Estadísticas</h3>
                <button onClick={limpiarTodasEstadisticas} style={{ fontSize: 11, color: "#F87171", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Reiniciar</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Tiradas", val: estadisticas.totalTiradas, color: "#60A5FA" },
                  { label: "Premios 🏆", val: estadisticas.premiosObtenidos, color: "#FFD700" },
                  { label: "Ganancias", val: `$${estadisticas.gananciaTotal.toLocaleString()}`, color: "#4ADE80" },
                  { label: "Balance", val: `${estadisticas.balance >= 0 ? "+" : ""}$${estadisticas.balance}`, color: estadisticas.balance >= 0 ? "#4ADE80" : "#F87171" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ padding: "12px 8px", borderRadius: 12, textAlign: "center", background: "rgba(0,0,0,0.4)", border: `1px solid ${color}18` }}>
                    <div style={{ fontSize: 9, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: "10px", borderRadius: 10, background: "rgba(0,0,0,0.3)" }}>
                <div className="flex justify-between">
                  <span style={{ fontSize: 11, color: "#374151" }}>Hit Rate</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#A855F7" }}>
                    {estadisticas.totalTiradas > 0 ? `${((estadisticas.premiosObtenidos / estadisticas.totalTiradas) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
              </div>
            </div>

            {/* Paytable */}
            <div className="slot-card rounded-2xl p-5">
              <h3 className="text-sm font-black gold-text uppercase tracking-widest mb-4">💎 Tabla de Pagos</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-slot pr-1">
                {Object.entries(TABLA_PAGOS).map(([sym, mult]) => (
                  <div key={sym} style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(0,0,0,0.4)", border: `1px solid ${SYMBOL_COLORS[sym] || "#374151"}22`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 18 }}>{sym}</span>
                      <span style={{ fontSize: 18 }}>{sym}</span>
                      <span style={{ fontSize: 18 }}>{sym}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: SYMBOL_COLORS[sym] || "#DAA520" }}>{mult}×</div>
                      <div style={{ fontSize: 10, color: "#374151" }}>${calcularPago(sym).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historial */}
            <div className="slot-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black gold-text uppercase tracking-widest">📜 Historial</h3>
                {historial.length > 0 && <button onClick={limpiarHistorial} style={{ fontSize: 11, color: "#F87171", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Limpiar</button>}
              </div>
              {historial.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 36, opacity: 0.1 }}>🎰</div>
                  <div style={{ color: "#374151", fontSize: 12, marginTop: 8 }}>Sin giros aún</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-slot pr-1">
                  {historial.map((g, i) => (
                    <div key={g.id} style={{ padding: "8px 12px", borderRadius: 10, background: g.ganancia > 0 ? "rgba(218,165,32,0.07)" : "rgba(0,0,0,0.4)", border: `1px solid ${g.ganancia > 0 ? "rgba(218,165,32,0.25)" : "rgba(255,255,255,0.04)"}`, opacity: i === 0 ? 1 : 0.8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 16 }}>{g.resultado[0]} {g.resultado[1]} {g.resultado[2]}</div>
                          <div style={{ fontSize: 10, color: "#374151" }}>{g.fecha} · ${g.apuesta}</div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: g.ganancia > 0 ? "#FFD700" : "#374151" }}>
                          {g.ganancia > 0 ? `+$${g.ganancia}` : "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="slot-card rounded-2xl p-5" style={{ border: "1px solid rgba(218,165,32,0.1)" }}>
              <h4 className="text-sm font-black gold-text uppercase tracking-widest mb-3">💡 Tips</h4>
              {[
                "3 símbolos iguales = premio",
                "7️⃣7️⃣7️⃣ = jackpot 100×",
                "Símbolos raros pagan más",
                "Gestiona tu saldo con paciencia",
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                  <span style={{ color: "#A855F7", fontWeight: 900 }}>→</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
