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
interface LineaGanadora {
  linea: number; simbolos: string[]; simbolo_ganador: string; cantidad: number; multiplicador: number; ganancia: number;
}
interface DetalleLinea {
  linea: number; simbolos: string[]; ganancia_linea: number;
}
interface ResultadoJuego {
  reels: string[][]; ganancia_total: number; nuevo_saldo: number; mensaje: string;
  apuesta_por_linea: number; apuesta_total: number; lineas_activas: number;
  lineas_ganadoras: LineaGanadora[]; total_lineas_ganadoras: number;
  detalles_lineas: DetalleLinea[]; configuracion: string;
}
interface HistorialGiro {
  id: number; reels: string[][]; ganancia_total: number; fecha: string;
  apuesta_por_linea: number; apuesta_total: number; lineas_activas: number; lineas_ganadoras: number;
}

const TABLA_PAGOS: Record<string, { 3: number; 4: number; 5: number }> = {
  "👑": { 3: 200, 4: 500, 5: 1000 }, "💎": { 3: 100, 4: 200, 5: 500 },
  "7️⃣": { 3: 50, 4: 100, 5: 200 }, "🍇": { 3: 30, 4: 60, 5: 120 },
  "🔔": { 3: 20, 4: 40, 5: 80 }, "⭐": { 3: 10, 4: 20, 5: 40 },
  "🍉": { 3: 5, 4: 10, 5: 20 }, "🍊": { 3: 3, 4: 6, 5: 12 },
  "🍋": { 3: 2, 4: 4, 5: 8 }, "🍒": { 3: 1, 4: 2, 5: 4 },
};
const SYMBOL_COLOR: Record<string, string> = {
  "👑": "#FFD700", "💎": "#60A5FA", "7️⃣": "#EF4444", "🍇": "#A855F7",
  "🔔": "#EAB308", "⭐": "#F59E0B", "🍉": "#22C55E", "🍊": "#F97316",
  "🍋": "#FDE047", "🍒": "#F43F5E", "❔": "#374151",
};

export default function Tragamonedas2() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [reels, setReels] = useState<string[][]>([
    ["❔","❔","❔","❔","❔"],
    ["❔","❔","❔","❔","❔"],
    ["❔","❔","❔","❔","❔"],
  ]);
  const [girando, setGirando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [gananciaMostrar, setGananciaMostrar] = useState<number>(0);
  const [lineasGanadorasMostrar, setLineasGanadorasMostrar] = useState<LineaGanadora[]>([]);
  const [lineaResaltada, setLineaResaltada] = useState<number | null>(null);
  const [historial, setHistorial] = useState<HistorialGiro[]>([]);
  const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(250);
  const [lineasActivas, setLineasActivas] = useState<number>(10);
  const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([100, 250, 500, 1000, 2500, 5000]);
  const [totalLineas, setTotalLineas] = useState<number>(10);
  const [estadisticas, setEstadisticas] = useState({ totalTiradas: 0, gananciaTotal: 0, gastoTotal: 0, balance: 0, premiosObtenidos: 0, lineasGanadorasTotal: 0 });
  const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({ totalTiradasAcum: 0, gananciaTotalAcum: 0, gastoTotalAcum: 0, premiosObtenidosAcum: 0, lineasGanadorasAcum: 0 });
  const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[][]>([[], [], []]);

  const LINEAS_VISUALES = [
    [[0,0],[1,0],[2,0],[3,0],[4,0]], [[0,1],[1,1],[2,1],[3,1],[4,1]], [[0,2],[1,2],[2,2],[3,2],[4,2]],
    [[0,0],[1,1],[2,2],[3,1],[4,0]], [[0,2],[1,1],[2,0],[3,1],[4,2]],
    [[0,0],[1,0],[2,1],[3,2],[4,2]], [[0,2],[1,2],[2,1],[3,0],[4,0]],
    [[0,1],[1,0],[2,1],[3,0],[4,1]], [[0,1],[1,2],[2,1],[3,2],[4,1]],
    [[0,1],[1,0],[2,2],[3,0],[4,1]],
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    const u = localStorage.getItem("usuario");
    if (u) try { setUsuario(JSON.parse(u)); } catch {}
  }, [navigate]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(`${API_URL}/juegos/tragamonedas2/juegos/tragamonedas2/apuestas-permitidas`);
        setApuestasPermitidas(res.data.apuestas_permitidas);
        setTotalLineas(res.data.lineas_de_pago);
        setLineasActivas(res.data.lineas_de_pago);
      } catch {}
    };
    cargar();
  }, []);

  useEffect(() => {
    const h = localStorage.getItem("historial_tragamonedas2");
    if (h) setHistorial(JSON.parse(h).slice(0, 10));
    const s = localStorage.getItem("estadisticas_acumulativas_tragamonedas2");
    if (s) {
      const p = JSON.parse(s);
      setEstadisticasAcumulativas(p);
      setEstadisticas({ totalTiradas: p.totalTiradasAcum, gananciaTotal: p.gananciaTotalAcum, gastoTotal: p.gastoTotalAcum, balance: p.gananciaTotalAcum - p.gastoTotalAcum, premiosObtenidos: p.premiosObtenidosAcum, lineasGanadorasTotal: p.lineasGanadorasAcum });
    }
  }, []);

  useEffect(() => { if (historial.length > 0) localStorage.setItem("historial_tragamonedas2", JSON.stringify(historial.slice(0, 10))); }, [historial]);
  useEffect(() => { if (estadisticasAcumulativas.totalTiradasAcum > 0) localStorage.setItem("estadisticas_acumulativas_tragamonedas2", JSON.stringify(estadisticasAcumulativas)); }, [estadisticasAcumulativas]);

  const actualizarEstadisticas = (g: HistorialGiro) => {
    const ep = g.ganancia_total > 0;
    setEstadisticasAcumulativas(prev => ({ totalTiradasAcum: prev.totalTiradasAcum + 1, gananciaTotalAcum: prev.gananciaTotalAcum + g.ganancia_total, gastoTotalAcum: prev.gastoTotalAcum + g.apuesta_total, premiosObtenidosAcum: prev.premiosObtenidosAcum + (ep ? 1 : 0), lineasGanadorasAcum: prev.lineasGanadorasAcum + g.lineas_ganadoras }));
    setEstadisticas(prev => ({ totalTiradas: prev.totalTiradas + 1, gananciaTotal: prev.gananciaTotal + g.ganancia_total, gastoTotal: prev.gastoTotal + g.apuesta_total, balance: prev.balance + (g.ganancia_total - g.apuesta_total), premiosObtenidos: prev.premiosObtenidos + (ep ? 1 : 0), lineasGanadorasTotal: prev.lineasGanadorasTotal + g.lineas_ganadoras }));
  };

  const animarReel = (row: number, col: number, duracion: number) => {
    return new Promise<void>((resolve) => {
      const reel = reelRefs.current[row]?.[col];
      if (!reel) return resolve();
      let contador = 0;
      const maxGiros = Math.floor(duracion / 80);
      const simbolos = Object.keys(TABLA_PAGOS);
      const interval = setInterval(() => {
        const s = simbolos[Math.floor(Math.random() * simbolos.length)];
        setReels(prev => { const n = prev.map(r => [...r]); n[row][col] = s; return n; });
        contador++;
        if (contador >= maxGiros) { clearInterval(interval); resolve(); }
      }, 80);
    });
  };

  const animarTodosReels = async () => {
    const promesas: Promise<void>[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const delay = col * 80 + row * 40;
        promesas.push(new Promise(r => setTimeout(r, delay)).then(() => animarReel(row, col, 1400 + col * 120)));
      }
    }
    await Promise.all(promesas);
  };

  const animarConfetti = (cantidad: number = 180) => {
    confetti({ particleCount: cantidad, spread: 100, origin: { y: 0.5 }, colors: ["#DAA520", "#FFD700", "#A855F7", "#22C55E"] });
    if (cantidad > 200) {
      setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } }), 300);
      setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } }), 500);
    }
  };

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotificacion({ text, type }); setTimeout(() => setNotificacion(null), 5000);
  };

  const girarTragamonedas = async () => {
    if (!usuario) return showMsg("Debes iniciar sesión.", "error");
    if (girando) return;
    const apuestaTotal = apuestaSeleccionada * lineasActivas;
    if (usuario.saldo < apuestaTotal) return showMsg(`Saldo insuficiente. Necesitas $${apuestaTotal.toLocaleString()}`, "error");
    setMensaje(null); setGananciaMostrar(0); setLineasGanadorasMostrar([]); setLineaResaltada(null); setGirando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/juegos/tragamonedas2/juegos/tragamonedas2?apuesta=${apuestaSeleccionada}&lineas_activas=${lineasActivas}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const resultado: ResultadoJuego = res.data;
      await animarTodosReels();
      setReels(resultado.reels); setGananciaMostrar(resultado.ganancia_total);
      setMensaje(resultado.mensaje); setLineasGanadorasMostrar(resultado.lineas_ganadoras);
      setUsuario(prev => prev ? { ...prev, saldo: resultado.nuevo_saldo } : prev);
      if (resultado.ganancia_total > 0) {
        animarConfetti(Math.min(400, 120 + resultado.ganancia_total / 50));
        resultado.lineas_ganadoras.forEach((linea, idx) => setTimeout(() => setLineaResaltada(linea.linea), idx * 900));
        setTimeout(() => setLineaResaltada(null), resultado.lineas_ganadoras.length * 900 + 500);
      }
      const nuevoGiro: HistorialGiro = { id: Date.now(), reels: resultado.reels, ganancia_total: resultado.ganancia_total, fecha: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), apuesta_por_linea: resultado.apuesta_por_linea, apuesta_total: resultado.apuesta_total, lineas_activas: resultado.lineas_activas, lineas_ganadoras: resultado.total_lineas_ganadoras };
      setHistorial(prev => [nuevoGiro, ...prev.slice(0, 9)]);
      actualizarEstadisticas(nuevoGiro);
    } catch (err: any) { showMsg(err.response?.data?.detail || "Error al girar.", "error"); }
    finally { setGirando(false); }
  };

  const limpiarHistorial = () => { setHistorial([]); localStorage.removeItem("historial_tragamonedas2"); showMsg("Historial limpiado", "info"); };
  const limpiarTodasEstadisticas = () => {
    setHistorial([]); localStorage.removeItem("historial_tragamonedas2"); localStorage.removeItem("estadisticas_acumulativas_tragamonedas2");
    setEstadisticas({ totalTiradas: 0, gananciaTotal: 0, gastoTotal: 0, balance: 0, premiosObtenidos: 0, lineasGanadorasTotal: 0 });
    setEstadisticasAcumulativas({ totalTiradasAcum: 0, gananciaTotalAcum: 0, gastoTotalAcum: 0, premiosObtenidosAcum: 0, lineasGanadorasAcum: 0 });
    showMsg("Estadísticas reiniciadas", "info");
  };

  // Check which cells are on the winning line
  const isCeldaGanadora = (row: number, col: number): boolean => {
    if (lineaResaltada === null) return false;
    const linea = LINEAS_VISUALES[lineaResaltada - 1];
    if (!linea) return false;
    return linea.some(([c, r]) => c === col && r === row);
  };

  if (!usuario) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at center, #0a0018 0%, #05000f 100%)" }}>
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ boxShadow: "0 0 30px #DAA520" }} />
        <p className="font-bold tracking-widest" style={{ color: "#DAA520" }}>CARGANDO TRAGAMONEDAS 2.0...</p>
      </div>
    </div>
  );

  const apuestaTotal = apuestaSeleccionada * lineasActivas;

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #100008 0%, #070005 55%, #050010 100%)" }}>
      <style>{`
        @keyframes shimmerGold {
          0% { background-position: -200% center; } 100% { background-position: 200% center; }
        }
        @keyframes shimmerCrimson {
          0% { background-position: -200% center; } 100% { background-position: 200% center; }
        }
        @keyframes floatUp {
          0% { opacity:0; transform:translateY(20px); } 100% { opacity:1; transform:translateY(0); }
        }
        @keyframes winReveal {
          0% { opacity:0; transform:scale(0.5) rotate(-3deg); }
          60% { transform:scale(1.12) rotate(1deg); }
          100% { opacity:1; transform:scale(1) rotate(0deg); }
        }
        @keyframes cellWin {
          0%, 100% { box-shadow: 0 0 20px rgba(218,165,32,0.4), inset 0 0 15px rgba(218,165,32,0.1); }
          50% { box-shadow: 0 0 50px rgba(218,165,32,0.9), inset 0 0 30px rgba(218,165,32,0.3); transform: scale(1.06); }
        }
        @keyframes spinCell {
          0% { filter: blur(0); } 50% { filter: blur(4px); } 100% { filter: blur(0); }
        }
        @keyframes pulseRed {
          0%, 100% { box-shadow: 0 0 20px rgba(220,38,38,0.4), 0 0 40px rgba(218,165,32,0.1); }
          50% { box-shadow: 0 0 50px rgba(220,38,38,0.8), 0 0 80px rgba(218,165,32,0.2); }
        }
        @keyframes lightBlink {
          0%, 100% { opacity: 1; } 50% { opacity: 0.2; }
        }
        @keyframes marquee {
          0% { transform: translateX(100%); } 100% { transform: translateX(-100%); }
        }
        .gold-text {
          background: linear-gradient(90deg,#DAA520,#FFD700,#FFA500,#FFD700,#DAA520);
          background-size: 200% auto; -webkit-background-clip: text;
          -webkit-text-fill-color: transparent; background-clip: text;
          animation: shimmerGold 3s linear infinite;
        }
        .crimson-text {
          background: linear-gradient(90deg,#B91C1C,#EF4444,#F87171,#EF4444,#B91C1C);
          background-size: 200% auto; -webkit-background-clip: text;
          -webkit-text-fill-color: transparent; background-clip: text;
          animation: shimmerCrimson 3s linear infinite;
        }
        .slot-card { background: linear-gradient(135deg,rgba(16,0,8,0.97),rgba(8,0,5,0.99)); border: 1px solid rgba(220,38,38,0.1); }
        .win-reveal { animation: winReveal 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .float-up { animation: floatUp 0.4s ease-out forwards; }
        .cell-win-anim { animation: cellWin 0.7s ease-in-out infinite; }
        .cell-spin { animation: spinCell 0.12s ease-in-out infinite; }
        .spin-btn { transition: all 0.15s; border: none; cursor: pointer; font-weight: 900; letter-spacing: 0.06em; border-radius: 16px; color: white; text-transform: uppercase; }
        .spin-btn:hover:not(:disabled) { transform: translateY(-3px) scale(1.03); filter: brightness(1.2); }
        .spin-btn:active:not(:disabled) { transform: scale(0.97); }
        .spin-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .scrollbar-slot::-webkit-scrollbar { width: 3px; }
        .scrollbar-slot::-webkit-scrollbar-thumb { background: #DC2626; border-radius: 2px; }
        .cab-light { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        input[type=range] { -webkit-appearance: none; height: 6px; border-radius: 3px; background: rgba(220,38,38,0.2); outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #DC2626; cursor: pointer; box-shadow: 0 0 8px #DC262660; }
      `}</style>

      {notificacion && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center gap-3 shadow-2xl float-up`}
          style={{ background: notificacion.type === "error" ? "linear-gradient(135deg,#7f1d1d,#991b1b)" : notificacion.type === "success" ? "linear-gradient(135deg,#14532d,#166534)" : "linear-gradient(135deg,#1a0010,#350010)", border: `1px solid ${notificacion.type === "error" ? "rgba(239,68,68,0.5)" : notificacion.type === "success" ? "rgba(34,197,94,0.5)" : "rgba(220,38,38,0.4)"}`, color: notificacion.type === "error" ? "#fca5a5" : notificacion.type === "success" ? "#86efac" : "#fca5a5" }}>
          <span style={{ fontSize: 20 }}>{notificacion.type === "success" ? "✅" : notificacion.type === "error" ? "❌" : "🎰"}</span>
          <span>{notificacion.text}</span>
        </div>
      )}

      <Header usuario={usuario} cerrarSesion={() => { localStorage.clear(); navigate("/login"); }} setUsuario={setUsuario} />

      {/* Banner */}
      <div className="relative overflow-hidden py-6 px-4" style={{ borderBottom: "1px solid rgba(220,38,38,0.15)", background: "radial-gradient(ellipse at center, rgba(220,38,38,0.05) 0%, transparent 70%)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span style={{ fontSize: 32 }}>🎰</span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight gold-text">TRAGAMONEDAS 2.0</h1>
              <span style={{ fontSize: 13, padding: "3px 10px", borderRadius: 999, background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.4)", color: "#F87171", fontWeight: 700 }}>DELUXE</span>
            </div>
            <p style={{ color: "#6B7280" }}>
              5×3 Reels · <span style={{ color: "#EF4444", fontWeight: 700 }}>{lineasActivas}</span> líneas activas ·
              Jackpot <span style={{ color: "#FFD700", fontWeight: 700 }}>👑 1000×</span>
            </p>
          </div>
          <div className="flex gap-4">
            <div className="slot-card rounded-2xl px-5 py-4 text-center" style={{ border: "1px solid rgba(218,165,32,0.2)" }}>
              <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Saldo</div>
              <div className="text-2xl font-black gold-text">${usuario?.saldo?.toLocaleString() ?? 0}</div>
            </div>
            <div className="slot-card rounded-2xl px-5 py-4 text-center">
              <div style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>Apuesta Total</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#EF4444" }}>${apuestaTotal.toLocaleString()}</div>
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

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* MÁQUINA */}
          <div className="xl:col-span-2 space-y-5">

            {/* Configuración */}
            {!girando && (
              <div className="slot-card rounded-3xl p-6" style={{ border: "1px solid rgba(218,165,32,0.15)" }}>
                <h2 className="text-sm font-black gold-text uppercase tracking-widest mb-5 text-center">⚙️ Configuración de Apuesta</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Apuesta por línea */}
                  <div>
                    <div style={{ fontSize: 11, color: "#374151", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 700 }}>Apuesta por línea</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {apuestasPermitidas.map((ap, i) => {
                        const cols = ["#7f1d1d:#DC2626","#78350f:#D97706","#1e1b4b:#7C3AED","#14532d:#16A34A","#0c4a6e:#0284C7","#3b0764:#9333EA"].map(c => c.split(":"));
                        const [bg, border] = cols[i % cols.length];
                        const sel = apuestaSeleccionada === ap;
                        const dis = usuario.saldo < ap * lineasActivas;
                        return (
                          <button key={ap} onClick={() => setApuestaSeleccionada(ap)} disabled={dis}
                            style={{ padding: "8px 14px", borderRadius: 10, fontWeight: 900, fontSize: 12, background: sel ? border : bg, border: `2px solid ${border}`, color: sel ? "white" : "rgba(255,255,255,0.45)", boxShadow: sel ? `0 0 16px ${border}55` : "none", transform: sel ? "scale(1.06)" : "scale(1)", transition: "all 0.15s", cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.3 : 1 }}>
                            ${ap >= 1000 ? `${ap / 1000}K` : ap}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Líneas activas */}
                  <div>
                    <div style={{ fontSize: 11, color: "#374151", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 700 }}>
                      Líneas activas: <span style={{ color: "#EF4444" }}>{lineasActivas}</span> / {totalLineas}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button onClick={() => setLineasActivas(l => Math.max(1, l - 1))} disabled={lineasActivas <= 1}
                        style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.3)", color: "#EF4444", fontWeight: 900, fontSize: 18, cursor: lineasActivas <= 1 ? "not-allowed" : "pointer", opacity: lineasActivas <= 1 ? 0.3 : 1 }}>−</button>
                      <input type="range" min={1} max={totalLineas} value={lineasActivas} onChange={e => setLineasActivas(+e.target.value)} style={{ flex: 1 }} />
                      <button onClick={() => setLineasActivas(l => Math.min(totalLineas, l + 1))} disabled={lineasActivas >= totalLineas}
                        style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.3)", color: "#EF4444", fontWeight: 900, fontSize: 18, cursor: lineasActivas >= totalLineas ? "not-allowed" : "pointer", opacity: lineasActivas >= totalLineas ? 0.3 : 1 }}>+</button>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280", textAlign: "center" }}>
                      ${apuestaSeleccionada.toLocaleString()} × {lineasActivas} = <span style={{ color: "#EF4444", fontWeight: 900 }}>${apuestaTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cabinet 5×3 */}
            <div className="slot-card rounded-3xl overflow-hidden" style={{ border: "2px solid rgba(218,165,32,0.35)", boxShadow: "0 0 60px rgba(220,38,38,0.08), 0 0 30px rgba(218,165,32,0.06)" }}>

              {/* Top bar */}
              <div style={{ background: "linear-gradient(135deg,#1a0005,#0d0003)", padding: "10px 24px", borderBottom: "1px solid rgba(218,165,32,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#EF4444","#EAB308","#22C55E","#3B82F6","#A855F7"].map((c, i) => (
                    <div key={i} className="cab-light" style={{ background: c, boxShadow: `0 0 6px ${c}`, animation: `lightBlink ${0.8 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <div style={{ flex: 1, overflow: "hidden", margin: "0 16px" }}>
                  <div className="gold-text font-black" style={{ fontSize: 11, letterSpacing: "0.15em", whiteSpace: "nowrap", animation: "marquee 12s linear infinite", display: "inline-block" }}>
                    ★ JACKPOT 👑👑👑 = 1000× · 💎💎💎 = 500× · HASTA 10 LÍNEAS DE PAGO ★
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["#A855F7","#3B82F6","#22C55E","#EAB308","#EF4444"].map((c, i) => (
                    <div key={i} className="cab-light" style={{ background: c, boxShadow: `0 0 6px ${c}`, animation: `lightBlink ${1 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>

              {/* Reel grid */}
              <div style={{ padding: "24px 20px 16px" }}>
                {/* Line numbers left */}
                <div style={{ display: "flex", gap: 12 }}>
                  {/* Left line indicators */}
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", paddingTop: 4, paddingBottom: 4 }}>
                    {[0, 1, 2].map(row => (
                      <div key={row} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {Array.from({ length: Math.ceil(lineasActivas / 3) }).map((_, i) => {
                          const lineIdx = i * 3 + row;
                          return lineIdx < lineasActivas ? (
                            <div key={lineIdx} style={{ width: 18, height: 18, borderRadius: 4, background: lineaResaltada === lineIdx + 1 ? "#EF4444" : "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.3)", fontSize: 8, fontWeight: 700, color: lineaResaltada === lineIdx + 1 ? "white" : "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                              {lineIdx + 1}
                            </div>
                          ) : null;
                        })}
                      </div>
                    ))}
                  </div>

                  {/* The 5×3 grid */}
                  <div style={{ flex: 1, background: "linear-gradient(135deg,#060003,#0a0006)", borderRadius: 16, border: "3px solid rgba(218,165,32,0.5)", padding: "12px", boxShadow: "inset 0 4px 20px rgba(0,0,0,0.8), 0 0 30px rgba(218,165,32,0.08)" }}>
                    {reels.map((fila, rowIndex) => (
                      <div key={rowIndex} style={{ display: "flex", gap: 8, marginBottom: rowIndex < 2 ? 8 : 0, justifyContent: "center" }}>
                        {fila.map((simbolo, colIndex) => {
                          const ganadora = isCeldaGanadora(rowIndex, colIndex);
                          const color = SYMBOL_COLOR[simbolo] || "#374151";
                          return (
                            <div
                              key={`${rowIndex}-${colIndex}`}
                              ref={el => { if (!reelRefs.current[rowIndex]) reelRefs.current[rowIndex] = []; reelRefs.current[rowIndex][colIndex] = el; }}
                              className={girando ? "cell-spin" : ganadora ? "cell-win-anim" : ""}
                              style={{
                                flex: 1, minWidth: 0, aspectRatio: "1 / 1", maxWidth: 80, height: 72,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 36, borderRadius: 10,
                                background: ganadora ? `rgba(${color === "#FFD700" ? "218,165,32" : "218,165,32"},0.08)` : "rgba(0,0,0,0.5)",
                                border: `2px solid ${ganadora ? color : "rgba(218,165,32,0.15)"}`,
                                transition: "border-color 0.3s, background 0.3s",
                                cursor: "default",
                              }}
                            >
                              {simbolo}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Right line indicators */}
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", paddingTop: 4, paddingBottom: 4 }}>
                    {[0, 1, 2].map(row => (
                      <div key={row} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {Array.from({ length: Math.ceil(lineasActivas / 3) }).map((_, i) => {
                          const lineIdx = i * 3 + row;
                          return lineIdx < lineasActivas ? (
                            <div key={lineIdx} style={{ width: 18, height: 18, borderRadius: 4, background: lineaResaltada === lineIdx + 1 ? "#EF4444" : "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.3)", fontSize: 8, fontWeight: 700, color: lineaResaltada === lineIdx + 1 ? "white" : "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                              {lineIdx + 1}
                            </div>
                          ) : null;
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* WIN display */}
                {!girando && gananciaMostrar > 0 && (
                  <div className="win-reveal" style={{ marginTop: 16, padding: "16px 24px", borderRadius: 16, background: "rgba(218,165,32,0.08)", border: "2px solid rgba(218,165,32,0.4)", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#DAA520", fontWeight: 700, letterSpacing: "0.2em", marginBottom: 4 }}>🏆 PREMIO TOTAL</div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: "#FFD700", lineHeight: 1, textShadow: "0 0 30px rgba(218,165,32,0.6)" }}>+${gananciaMostrar.toLocaleString()}</div>
                    {lineasGanadorasMostrar.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                        {lineasGanadorasMostrar.map((l, idx) => (
                          <div key={idx} style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(218,165,32,0.3)", fontSize: 11 }}>
                            <span style={{ color: "#EF4444", fontWeight: 700 }}>L{l.linea}</span>
                            <span style={{ color: "#6B7280", margin: "0 4px" }}>·</span>
                            <span style={{ fontSize: 13 }}>{l.simbolo_ganador}</span>×{l.cantidad}
                            <span style={{ color: "#4ADE80", fontWeight: 700, marginLeft: 4 }}>+${l.ganancia}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* No win */}
                {!girando && gananciaMostrar === 0 && mensaje && (
                  <div style={{ marginTop: 12, padding: "10px", borderRadius: 12, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", textAlign: "center" }}>
                    <span style={{ fontSize: 13, color: "rgba(220,38,38,0.6)" }}>{mensaje}</span>
                  </div>
                )}

                {/* SPIN button */}
                <button
                  onClick={girarTragamonedas}
                  disabled={girando || usuario.saldo < apuestaTotal}
                  className="spin-btn"
                  style={{
                    marginTop: 16, width: "100%", padding: "20px", fontSize: 20,
                    background: girando || usuario.saldo < apuestaTotal
                      ? "rgba(30,0,10,0.5)"
                      : "linear-gradient(135deg,#7f1d1d,#DC2626,#B91C1C)",
                    border: "3px solid rgba(218,165,32,0.5)",
                    boxShadow: girando || usuario.saldo < apuestaTotal ? "none" : "0 0 40px rgba(220,38,38,0.35), 0 0 60px rgba(218,165,32,0.1)",
                    animation: girando || usuario.saldo < apuestaTotal ? "none" : "pulseRed 2s ease-in-out infinite",
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
                  ) : `🎰 GIRAR · $${apuestaTotal.toLocaleString()}`}
                </button>
              </div>
            </div>
          </div>

          {/* PANEL LATERAL */}
          <div className="space-y-5">

            {/* Stats */}
            <div className="slot-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black gold-text uppercase tracking-widest">📊 Estadísticas</h3>
                <button onClick={limpiarTodasEstadisticas} style={{ fontSize: 11, color: "#F87171", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Reiniciar</button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { label: "Tiradas", val: estadisticas.totalTiradas, color: "#60A5FA" },
                  { label: "Premios 🏆", val: estadisticas.premiosObtenidos, color: "#FFD700" },
                  { label: "L. Ganadoras", val: estadisticas.lineasGanadorasTotal, color: "#A855F7" },
                  { label: "Balance", val: `${estadisticas.balance >= 0 ? "+" : ""}$${estadisticas.balance}`, color: estadisticas.balance >= 0 ? "#4ADE80" : "#F87171" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ padding: "12px 8px", borderRadius: 12, textAlign: "center", background: "rgba(0,0,0,0.4)", border: `1px solid ${color}18` }}>
                    <div style={{ fontSize: 9, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px", borderRadius: 10, background: "rgba(0,0,0,0.3)" }}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: 11, color: "#374151" }}>Hit Rate</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#EF4444" }}>
                    {estadisticas.totalTiradas > 0 ? `${((estadisticas.premiosObtenidos / estadisticas.totalTiradas) * 100).toFixed(1)}%` : "0%"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 11, color: "#374151" }}>Gasto Total</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#F87171" }}>${estadisticas.gastoTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Paytable */}
            <div className="slot-card rounded-2xl p-5">
              <h3 className="text-sm font-black gold-text uppercase tracking-widest mb-4">💎 Tabla de Pagos</h3>
              <div style={{ fontSize: 10, color: "#374151", marginBottom: 8, textAlign: "center" }}>× apuesta por línea ${apuestaSeleccionada}</div>
              <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-slot pr-1">
                {Object.entries(TABLA_PAGOS).map(([sym, vals]) => {
                  const col = SYMBOL_COLOR[sym] || "#DAA520";
                  return (
                    <div key={sym} style={{ padding: "7px 10px", borderRadius: 9, background: "rgba(0,0,0,0.4)", border: `1px solid ${col}18`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: 2, fontSize: 16 }}>
                        <span>{sym}</span><span>{sym}</span><span>{sym}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, fontSize: 11 }}>
                        {([3, 4, 5] as const).map(n => (
                          <div key={n} style={{ textAlign: "center" }}>
                            <div style={{ color: col, fontWeight: 900, fontSize: 12 }}>{vals[n]}×</div>
                            <div style={{ color: "#374151" }}>{n}x</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
                    <div key={g.id} style={{ padding: "9px 12px", borderRadius: 10, background: g.ganancia_total > 0 ? "rgba(218,165,32,0.07)" : "rgba(0,0,0,0.4)", border: `1px solid ${g.ganancia_total > 0 ? "rgba(218,165,32,0.25)" : "rgba(255,255,255,0.04)"}`, opacity: i === 0 ? 1 : 0.8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 9, color: "#374151" }}>{g.fecha}</div>
                          <div style={{ fontSize: 10, color: "#4B5563", marginTop: 1 }}>{g.lineas_activas}L × ${g.apuesta_por_linea} = ${g.apuesta_total}</div>
                          <div style={{ fontSize: 10, color: "#EF4444" }}>{g.lineas_ganadoras} línea(s) ✓</div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: g.ganancia_total > 0 ? "#FFD700" : "#374151" }}>
                          {g.ganancia_total > 0 ? `+$${g.ganancia_total}` : "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How to play */}
            <div className="slot-card rounded-2xl p-5" style={{ border: "1px solid rgba(220,38,38,0.1)" }}>
              <h4 className="text-sm font-black gold-text uppercase tracking-widest mb-3">🎮 Cómo Jugar</h4>
              {[
                "3+ símbolos iguales desde la izquierda",
                "Más líneas = más oportunidades",
                "Líneas resaltadas = premios activos",
                "👑×1000 es el premio máximo",
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                  <span style={{ color: "#EF4444", fontWeight: 900 }}>→</span><span>{t}</span>
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
