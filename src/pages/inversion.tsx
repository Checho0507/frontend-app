import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "../components/header";
import Footer from "../components/footer";
import { API_URL } from "../api/auth";

interface Inversion {
    id: number;
    monto: number;
    fecha_deposito: string;
    interes_acumulado: number;
    interes_diario: number;
    tasa_interes: number;
    puede_retirar_intereses: boolean;
    puede_retirar_capital: boolean;
    fecha_proximo_retiro_intereses: string;
    fecha_proximo_retiro_capital: string;
    dias_transcurridos: number;
    dias_faltantes_intereses: number;
    dias_faltantes_capital: number;
}

interface EstadoInversion {
    total_invertido: number;
    total_intereses: number;
    total_intereses_disponibles: number;
    inversiones: Inversion[];
    timestamp: string;
}

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
}

interface Retiro {
    tipo: string;
    monto: number;
    fecha: string;
    detalles: any;
}

interface HistorialInversion {
    id: number;
    monto: number;
    fecha_deposito: string;
    activa: boolean;
    tasa_interes: number;
    retiros: Retiro[];
}

interface NivelVIP {
    nivel: string | null;
    nombre: string;
    tasa: number;
    emoji: string;
    color: string;
}

interface NivelSiguiente {
    nivel: string;
    nombre: string;
    tasa: number;
    costo: number;
    emoji: string;
}

interface InfoVIP {
    pase_vip: string | null;
    nivel_actual: NivelVIP;
    nivel_siguiente: NivelSiguiente | null;
    saldo_usuario: number;
    puede_subir: boolean;
}

const NIVELES = [
    { id: null,       label: "Sin Pase",     tasa: 50,  emoji: "⬜", costo: null,    costoLabel: "Gratis",    gradient: "from-gray-500 to-gray-400",   ring: "ring-gray-400",  text: "text-gray-300",   border: "border-gray-500/40" },
    { id: "PLATA",    label: "VIP Plata",    tasa: 100, emoji: "🥈", costo: 50000,   costoLabel: "$50.000",   gradient: "from-slate-400 to-gray-300",  ring: "ring-slate-300", text: "text-slate-300",  border: "border-slate-400/50" },
    { id: "ORO",      label: "VIP Oro",      tasa: 200, emoji: "🥇", costo: 100000,  costoLabel: "$100.000",  gradient: "from-yellow-500 to-amber-400", ring: "ring-yellow-400",text: "text-yellow-400", border: "border-yellow-500/50" },
    { id: "DIAMANTE", label: "VIP Diamante", tasa: 300, emoji: "💎", costo: 200000,  costoLabel: "$200.000",  gradient: "from-cyan-400 to-blue-400",   ring: "ring-cyan-400",  text: "text-cyan-400",   border: "border-cyan-400/50" },
];

function getNivelIndex(pase: string | null) {
    return NIVELES.findIndex(n => n.id === pase);
}

export default function Inversion() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [montoDeposito, setMontoDeposito] = useState<number>(50000);
    const [estado, setEstado] = useState<EstadoInversion | null>(null);
    const [historial, setHistorial] = useState<HistorialInversion[]>([]);
    const [infoVIP, setInfoVIP] = useState<InfoVIP | null>(null);
    const [cargando, setCargando] = useState(false);
    const [cargandoVIP, setCargandoVIP] = useState(false);
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
    const [tab, setTab] = useState<"activas" | "historial">("activas");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { navigate('/login'); return; }

        axios.get(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setUsuario({ id: res.data.id, username: res.data.username, saldo: res.data.saldo, verificado: res.data.verificado }))
            .catch(() => navigate('/login'));

        cargarEstado();
        cargarHistorial();
        cargarInfoVIP();

        const intervalo = setInterval(cargarEstado, 1000);
        return () => clearInterval(intervalo);
    }, [navigate]);

    const cargarEstado = async () => {
        try {
            const token = localStorage.getItem("token");
            const r = await axios.get(`${API_URL}/inversiones/inversion/estado`, { headers: { Authorization: `Bearer ${token}` } });
            setEstado(r.data);
        } catch {}
    };

    const cargarHistorial = async () => {
        try {
            const token = localStorage.getItem("token");
            const r = await axios.get(`${API_URL}/inversiones/inversion/historial`, { headers: { Authorization: `Bearer ${token}` } });
            setHistorial(r.data.historial || []);
        } catch {}
    };

    const cargarInfoVIP = async () => {
        try {
            const token = localStorage.getItem("token");
            const r = await axios.get(`${API_URL}/inversiones/vip/info`, { headers: { Authorization: `Bearer ${token}` } });
            setInfoVIP(r.data);
        } catch {}
    };

    const comprarPaseVIP = async () => {
        if (!infoVIP?.nivel_siguiente) return;
        setCargandoVIP(true);
        try {
            const token = localStorage.getItem("token");
            const r = await axios.post(`${API_URL}/inversiones/vip/comprar`, {}, { headers: { Authorization: `Bearer ${token}` } });
            showMsg(r.data.message, "success");
            setUsuario(prev => prev ? { ...prev, saldo: r.data.nuevo_saldo } : prev);
            await cargarInfoVIP();
            await cargarEstado();
        } catch (e: any) {
            showMsg(e.response?.data?.detail || "Error al comprar pase VIP", "error");
        } finally {
            setCargandoVIP(false);
        }
    };

    const realizarDeposito = async () => {
        if (!usuario) return;
        if (montoDeposito < 50000 || montoDeposito > 5000000) { showMsg("El monto debe estar entre $50,000 y $5,000,000", "error"); return; }
        if (usuario.saldo < montoDeposito) { showMsg("Saldo insuficiente", "error"); return; }
        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const r = await axios.post(`${API_URL}/inversiones/inversion/depositar`, { monto: montoDeposito }, { headers: { Authorization: `Bearer ${token}` } });
            showMsg(r.data.message, "success");
            setUsuario(prev => prev ? { ...prev, saldo: r.data.nuevo_saldo } : prev);
            setMontoDeposito(50000);
            await cargarEstado();
            await cargarHistorial();
        } catch (e: any) {
            showMsg(e.response?.data?.detail || "Error al depositar", "error");
        } finally {
            setCargando(false);
        }
    };

    const retirarIntereses = async (id: number) => {
        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const r = await axios.post(`${API_URL}/inversiones/inversion/retirar/intereses`, { inversion_id: id }, { headers: { Authorization: `Bearer ${token}` } });
            showMsg(r.data.message, "success");
            setUsuario(prev => prev ? { ...prev, saldo: r.data.nuevo_saldo } : prev);
            await cargarEstado(); await cargarHistorial();
        } catch (e: any) {
            showMsg(e.response?.data?.detail || "Error", "error");
        } finally { setCargando(false); }
    };

    const retirarCapital = async (id: number) => {
        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const r = await axios.post(`${API_URL}/inversiones/inversion/retirar/capital`, { inversion_id: id }, { headers: { Authorization: `Bearer ${token}` } });
            showMsg(r.data.message, "success");
            setUsuario(prev => prev ? { ...prev, saldo: r.data.nuevo_saldo } : prev);
            await cargarEstado(); await cargarHistorial();
        } catch (e: any) {
            showMsg(e.response?.data?.detail || "Error", "error");
        } finally { setCargando(false); }
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const fmt = (fechaStr: string) => new Date(fechaStr).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const cerrarSesion = () => { localStorage.removeItem("token"); localStorage.removeItem("usuario"); navigate('/login'); };

    const tasaActual = infoVIP?.nivel_actual?.tasa ?? 50;
    const nivelIdx = getNivelIndex(infoVIP?.pase_vip ?? null);
    const nivelInfo = NIVELES[nivelIdx] ?? NIVELES[0];
    const ganDiaria = (monto: number) => (monto * tasaActual) / (365 * 100);

    return (
        <div className="min-h-screen bg-[#0d1117]">
            {/* Toast */}
            {notificacion && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl font-semibold shadow-2xl border backdrop-blur-sm transition-all ${
                    notificacion.type === "success" ? "bg-green-950/95 border-green-500/40 text-green-200" :
                    notificacion.type === "error"   ? "bg-red-950/95 border-red-500/40 text-red-200" :
                    "bg-blue-950/95 border-blue-500/40 text-blue-200"
                }`}>
                    <span className="text-lg">{notificacion.type === "success" ? "✅" : notificacion.type === "error" ? "❌" : "ℹ️"}</span>
                    <span>{notificacion.text}</span>
                </div>
            )}

            <Header usuario={usuario} cerrarSesion={cerrarSesion} setUsuario={setUsuario} />

            {/* ── PAGE HEADER ── */}
            <div className="border-b border-white/5 bg-gradient-to-b from-gray-900/60 to-transparent">
                <div className="max-w-6xl mx-auto px-4 py-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <p className="text-xs font-semibold tracking-widest text-teal-400 uppercase mb-2">💰 Inversiones</p>
                            <h1 className="text-3xl md:text-4xl font-bold text-white">
                                Haz crecer tu dinero
                            </h1>
                            <p className="text-gray-400 mt-2 text-sm">
                                Interés acumulado en tiempo real · Retira cada 30 días
                            </p>
                        </div>

                        {/* Quick stats */}
                        {estado && (
                            <div className="flex gap-3 flex-wrap">
                                <div className="bg-gray-800/60 border border-white/8 rounded-xl px-4 py-3 min-w-[120px]">
                                    <div className="text-xs text-gray-500 mb-1">Invertido</div>
                                    <div className="text-lg font-bold text-white">${Number(estado.total_invertido).toLocaleString()}</div>
                                </div>
                                <div className="bg-gray-800/60 border border-white/8 rounded-xl px-4 py-3 min-w-[120px]">
                                    <div className="text-xs text-gray-500 mb-1">Intereses</div>
                                    <div className="text-lg font-bold text-teal-400">${Number(estado.total_intereses).toLocaleString()}</div>
                                </div>
                                <div className="bg-gray-800/60 border border-white/8 rounded-xl px-4 py-3 min-w-[120px]">
                                    <div className="text-xs text-gray-500 mb-1">Disponibles</div>
                                    <div className="text-lg font-bold text-green-400">${Number(estado.total_intereses_disponibles).toLocaleString()}</div>
                                </div>
                                <div className={`bg-gray-800/60 border ${nivelInfo.border} rounded-xl px-4 py-3 min-w-[100px]`}>
                                    <div className="text-xs text-gray-500 mb-1">Tu tasa</div>
                                    <div className={`text-lg font-bold ${nivelInfo.text}`}>{tasaActual}% / año</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

                {/* ── VIP PROGRESS TRACK ── */}
                {infoVIP && (
                    <div className="bg-gray-900/70 border border-white/8 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-white">Pase VIP</h2>
                                <p className="text-sm text-gray-500">Sube de nivel para aumentar tu tasa de interés</p>
                            </div>
                            {infoVIP.nivel_siguiente && (
                                <button
                                    onClick={comprarPaseVIP}
                                    disabled={cargandoVIP || !infoVIP.puede_subir}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                                        infoVIP.puede_subir
                                            ? `bg-gradient-to-r ${NIVELES.find(n => n.id === infoVIP.nivel_siguiente?.nivel)?.gradient ?? "from-gray-500 to-gray-400"} text-gray-900 hover:scale-105 hover:shadow-lg`
                                            : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                                    }`}
                                >
                                    {cargandoVIP ? (
                                        <><div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /> Procesando…</>
                                    ) : infoVIP.puede_subir ? (
                                        <>{infoVIP.nivel_siguiente.emoji} Subir a {infoVIP.nivel_siguiente.nombre} — ${infoVIP.nivel_siguiente.costo.toLocaleString()}</>
                                    ) : (
                                        <>🔒 Faltan ${(infoVIP.nivel_siguiente.costo - infoVIP.saldo_usuario).toLocaleString()}</>
                                    )}
                                </button>
                            )}
                            {!infoVIP.nivel_siguiente && (
                                <div className="flex items-center gap-2 bg-cyan-950/60 border border-cyan-500/30 px-4 py-2 rounded-xl">
                                    <span>👑</span><span className="text-cyan-400 font-bold text-sm">Nivel máximo</span>
                                </div>
                            )}
                        </div>

                        {/* Stepper */}
                        <div className="relative">
                            {/* Connecting line */}
                            <div className="absolute top-7 left-0 right-0 h-0.5 bg-gray-700/60 mx-8 hidden md:block" />
                            <div
                                className="absolute top-7 left-0 h-0.5 hidden md:block transition-all duration-700"
                                style={{
                                    background: "linear-gradient(to right, #14b8a6, #22c55e)",
                                    width: nivelIdx === 0 ? "0%" : nivelIdx === 1 ? "33%" : nivelIdx === 2 ? "66%" : "100%",
                                    marginLeft: "2rem",
                                    marginRight: "2rem",
                                }}
                            />

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                                {NIVELES.map((nivel, idx) => {
                                    const isCurrent = idx === nivelIdx;
                                    const isPast = idx < nivelIdx;
                                    const isNext = idx === nivelIdx + 1;
                                    const isLocked = idx > nivelIdx + 1;

                                    return (
                                        <div
                                            key={idx}
                                            className={`relative rounded-xl p-4 transition-all duration-300 ${
                                                isCurrent
                                                    ? `bg-gradient-to-br from-gray-800 to-gray-900 border-2 ${nivel.border} shadow-lg`
                                                    : isPast
                                                    ? "bg-gray-800/40 border border-green-500/20"
                                                    : isNext
                                                    ? "bg-gray-800/40 border border-dashed border-gray-600/60"
                                                    : "bg-gray-800/20 border border-gray-800/60 opacity-50"
                                            }`}
                                        >
                                            {/* Badge actual */}
                                            {isCurrent && (
                                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-teal-500 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                                                    TU NIVEL
                                                </div>
                                            )}
                                            {isPast && (
                                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    ✓
                                                </div>
                                            )}

                                            <div className="text-center">
                                                <div className={`text-3xl mb-2 ${isLocked ? "grayscale opacity-40" : ""}`}>{nivel.emoji}</div>
                                                <div className={`font-bold text-sm mb-1 ${isCurrent ? nivel.text : isPast ? "text-green-400" : "text-gray-400"}`}>
                                                    {nivel.label}
                                                </div>
                                                <div className={`text-2xl font-black ${isCurrent ? nivel.text : isPast ? "text-green-400" : "text-gray-500"}`}>
                                                    {nivel.tasa}%
                                                </div>
                                                <div className="text-[11px] text-gray-600 mt-0.5">anual</div>
                                                {nivel.costo && (
                                                    <div className={`mt-2 text-[11px] font-semibold ${isNext ? "text-yellow-400" : "text-gray-600"}`}>
                                                        {isNext ? `Costo: ${nivel.costoLabel}` : nivel.costoLabel}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Upgrade incentive */}
                        {infoVIP.nivel_siguiente && (
                            <div className="mt-4 bg-gradient-to-r from-yellow-950/40 to-amber-950/40 border border-yellow-500/20 rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{infoVIP.nivel_siguiente.emoji}</span>
                                    <div>
                                        <span className="text-yellow-300 font-bold text-sm">
                                            Con {infoVIP.nivel_siguiente.nombre} ganarías {infoVIP.nivel_siguiente.tasa - tasaActual}% más al año
                                        </span>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Por ejemplo, en $1.000.000 serían +${((1000000 * (infoVIP.nivel_siguiente.tasa - tasaActual)) / 100).toLocaleString()} anuales extra
                                        </p>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500">
                                    Saldo actual: <span className="text-white font-semibold">${infoVIP.saldo_usuario.toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── NUEVA INVERSIÓN + BENEFICIOS ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Formulario */}
                    <div className="lg:col-span-3 bg-gray-900/70 border border-white/8 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                            <span className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-400">💵</span>
                            Nueva Inversión
                        </h2>

                        {usuario && (
                            <>
                                {/* Saldo */}
                                <div className="flex items-center justify-between bg-gray-800/60 border border-white/5 rounded-xl px-4 py-3 mb-5">
                                    <div>
                                        <p className="text-xs text-gray-500">Saldo disponible</p>
                                        <p className="text-xl font-bold text-white">${Number(usuario.saldo).toLocaleString()}</p>
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700/60 border ${nivelInfo.border}`}>
                                        <span className="text-sm">{nivelInfo.emoji}</span>
                                        <span className={`text-sm font-bold ${nivelInfo.text}`}>{tasaActual}% / año</span>
                                    </div>
                                </div>

                                {/* Input monto */}
                                <label className="block text-sm text-gray-400 mb-2">Monto a invertir</label>
                                <div className="flex gap-2 mb-3">
                                    <div className="relative flex-1">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                        <input
                                            type="number" min="50000" max="5000000" step="1000"
                                            value={montoDeposito}
                                            onChange={e => setMontoDeposito(Number(e.target.value))}
                                            className="w-full bg-gray-800 border border-gray-700 focus:border-teal-500 rounded-xl pl-8 pr-4 py-3 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-colors"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setMontoDeposito(Math.min(5000000, Number(usuario.saldo)))}
                                        className="px-4 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-xl text-white text-sm font-bold transition-colors"
                                    >
                                        MAX
                                    </button>
                                </div>

                                {/* Quick amounts */}
                                <div className="grid grid-cols-5 gap-1.5 mb-5">
                                    {[50000, 100000, 500000, 1000000, 5000000].map(m => (
                                        <button key={m}
                                            onClick={() => setMontoDeposito(m)}
                                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${montoDeposito === m ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"}`}
                                        >
                                            ${m >= 1000000 ? `${m/1000000}M` : `${m/1000}K`}
                                        </button>
                                    ))}
                                </div>

                                {/* Proyección */}
                                <div className="bg-gray-800/50 border border-white/5 rounded-xl p-4 mb-5">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Proyección ({tasaActual}% anual)</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="text-center">
                                            <div className="text-sm font-bold text-teal-400">${ganDiaria(montoDeposito).toFixed(0)}</div>
                                            <div className="text-[11px] text-gray-600 mt-0.5">por día</div>
                                        </div>
                                        <div className="text-center border-x border-gray-700">
                                            <div className="text-sm font-bold text-green-400">${(ganDiaria(montoDeposito) * 30).toFixed(0)}</div>
                                            <div className="text-[11px] text-gray-600 mt-0.5">al mes</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-bold text-yellow-400">${(montoDeposito * tasaActual / 100).toLocaleString()}</div>
                                            <div className="text-[11px] text-gray-600 mt-0.5">al año</div>
                                        </div>
                                    </div>
                                    {infoVIP?.nivel_siguiente && (
                                        <div className="mt-3 pt-3 border-t border-gray-700/60 flex items-center justify-between">
                                            <span className="text-[11px] text-gray-500">Con {infoVIP.nivel_siguiente.emoji} {infoVIP.nivel_siguiente.nombre} ganarías anualmente:</span>
                                            <span className="text-xs font-bold text-green-400">+${((montoDeposito * (infoVIP.nivel_siguiente.tasa - tasaActual)) / 100).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>

                                {/* CTA */}
                                <button
                                    onClick={realizarDeposito}
                                    disabled={cargando || !usuario || usuario.saldo < montoDeposito}
                                    className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 ${
                                        usuario.saldo >= montoDeposito
                                            ? "bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-500 hover:to-green-500 text-white hover:scale-[1.01] shadow-lg shadow-teal-500/20"
                                            : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                                    }`}
                                >
                                    {cargando ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Procesando…
                                        </span>
                                    ) : usuario.saldo >= montoDeposito
                                        ? `Invertir $${montoDeposito.toLocaleString()} · ${tasaActual}% anual`
                                        : `Faltan $${(montoDeposito - usuario.saldo).toLocaleString()} en tu saldo`
                                    }
                                </button>
                            </>
                        )}
                    </div>

                    {/* Info / beneficios */}
                    <div className="lg:col-span-2 flex flex-col gap-4">

                        {/* Plazos */}
                        <div className="bg-gray-900/70 border border-white/8 rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <span className="text-teal-400">⏱</span> Plazos de retiro
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between bg-teal-950/40 border border-teal-500/20 rounded-xl px-4 py-3">
                                    <div>
                                        <div className="text-white font-bold">Intereses</div>
                                        <div className="text-xs text-gray-500">Retiro disponible cada</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-teal-400">30</div>
                                        <div className="text-xs text-gray-500">días</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between bg-blue-950/40 border border-blue-500/20 rounded-xl px-4 py-3">
                                    <div>
                                        <div className="text-white font-bold">Capital</div>
                                        <div className="text-xs text-gray-500">Disponible a los</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-blue-400">180</div>
                                        <div className="text-xs text-gray-500">días</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Beneficios */}
                        <div className="bg-gray-900/70 border border-white/8 rounded-2xl p-5 flex-1">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <span className="text-green-400">✓</span> Beneficios
                            </h3>
                            <ul className="space-y-2.5 text-sm text-gray-400">
                                {[
                                    ["💹", "Interés acumulado en tiempo real"],
                                    ["🔄", "Depósitos múltiples ilimitados"],
                                    ["📅", "Retiro de intereses mensual"],
                                    ["🔒", "Capital seguro a 6 meses"],
                                    ["⬆️", "Sube de nivel VIP para más rentabilidad"],
                                ].map(([icon, txt], i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <span className="text-base mt-0.5">{icon}</span>
                                        <span>{txt}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                    </div>
                </div>

                {/* ── INVERSIONES / HISTORIAL ── */}
                <div className="bg-gray-900/70 border border-white/8 rounded-2xl overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-white/5">
                        <button
                            onClick={() => setTab("activas")}
                            className={`flex-1 py-4 text-sm font-bold transition-colors ${tab === "activas" ? "text-teal-400 border-b-2 border-teal-400 bg-teal-500/5" : "text-gray-500 hover:text-gray-300"}`}
                        >
                            📊 Inversiones Activas
                            {estado && estado.inversiones.length > 0 && (
                                <span className="ml-2 bg-teal-500/20 text-teal-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                    {estado.inversiones.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setTab("historial")}
                            className={`flex-1 py-4 text-sm font-bold transition-colors ${tab === "historial" ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5" : "text-gray-500 hover:text-gray-300"}`}
                        >
                            📜 Historial
                        </button>
                    </div>

                    <div className="p-6">
                        {tab === "activas" ? (
                            estado && estado.inversiones.length > 0 ? (
                                <div className="space-y-4">
                                    {estado.inversiones.map(inv => {
                                        const nIdx = NIVELES.findIndex(n => n.tasa === inv.tasa_interes);
                                        const nInfo = NIVELES[nIdx] ?? NIVELES[0];
                                        const progresoCapital = Math.min(100, (inv.dias_transcurridos / 180) * 100);

                                        return (
                                            <div key={inv.id} className="bg-gray-800/50 border border-white/6 rounded-xl p-5 hover:border-teal-500/20 transition-colors">
                                                {/* Header de la inversión */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-gray-700/60 border border-white/5 rounded-xl w-10 h-10 flex items-center justify-center text-lg">
                                                            💰
                                                        </div>
                                                        <div>
                                                            <div className="text-white font-bold">${Number(inv.monto).toLocaleString()}</div>
                                                            <div className="text-xs text-gray-500">Inversión #{inv.id} · {inv.dias_transcurridos} días</div>
                                                        </div>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/60 border ${nInfo.border}`}>
                                                        <span className="text-sm">{nInfo.emoji}</span>
                                                        <span className={`text-sm font-bold ${nInfo.text}`}>{inv.tasa_interes}%</span>
                                                    </div>
                                                </div>

                                                {/* Métricas */}
                                                <div className="grid grid-cols-3 gap-3 mb-4">
                                                    <div className="bg-gray-900/60 rounded-xl p-3 text-center">
                                                        <div className="text-teal-400 font-bold text-sm">${Number(inv.interes_acumulado).toLocaleString()}</div>
                                                        <div className="text-[11px] text-gray-600 mt-0.5">Acumulado</div>
                                                    </div>
                                                    <div className="bg-gray-900/60 rounded-xl p-3 text-center">
                                                        <div className="text-green-400 font-bold text-sm">${Number(inv.interes_diario).toFixed(0)}</div>
                                                        <div className="text-[11px] text-gray-600 mt-0.5">Por día</div>
                                                    </div>
                                                    <div className="bg-gray-900/60 rounded-xl p-3 text-center">
                                                        <div className="text-yellow-400 font-bold text-sm">${(Number(inv.interes_diario) * 30).toFixed(0)}</div>
                                                        <div className="text-[11px] text-gray-600 mt-0.5">Por mes</div>
                                                    </div>
                                                </div>

                                                {/* Progreso capital */}
                                                <div className="mb-4">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                                                        <span>Progreso capital ({inv.dias_transcurridos}/180 días)</span>
                                                        <span>{progresoCapital.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${progresoCapital}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Botones de retiro */}
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => retirarIntereses(inv.id)}
                                                        disabled={!inv.puede_retirar_intereses || cargando}
                                                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                                            inv.puede_retirar_intereses
                                                                ? "bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white shadow-md shadow-green-900/30"
                                                                : "bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700"
                                                        }`}
                                                    >
                                                        {inv.puede_retirar_intereses
                                                            ? `✅ Retirar $${Number(inv.interes_acumulado).toLocaleString()}`
                                                            : `⏳ Intereses en ${inv.dias_faltantes_intereses}d`
                                                        }
                                                    </button>
                                                    <button
                                                        onClick={() => retirarCapital(inv.id)}
                                                        disabled={!inv.puede_retirar_capital || cargando}
                                                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                                            inv.puede_retirar_capital
                                                                ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-md shadow-blue-900/30"
                                                                : "bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700"
                                                        }`}
                                                    >
                                                        {inv.puede_retirar_capital
                                                            ? `💰 Retirar Capital`
                                                            : `🔒 Capital en ${inv.dias_faltantes_capital}d`
                                                        }
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="text-5xl mb-3">💸</div>
                                    <h3 className="text-lg font-bold text-white mb-2">Aún no tienes inversiones activas</h3>
                                    <p className="text-gray-500 text-sm">Realiza tu primera inversión arriba para empezar a ganar al {tasaActual}% anual</p>
                                </div>
                            )
                        ) : (
                            historial.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs text-gray-500 border-b border-white/5">
                                                <th className="pb-3 font-semibold">Fecha</th>
                                                <th className="pb-3 font-semibold">Monto</th>
                                                <th className="pb-3 font-semibold">Tasa</th>
                                                <th className="pb-3 font-semibold">Estado</th>
                                                <th className="pb-3 font-semibold">Retiros</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/4">
                                            {historial.map(inv => (
                                                <tr key={inv.id} className="hover:bg-white/2 transition-colors">
                                                    <td className="py-3 text-gray-400">{fmt(inv.fecha_deposito)}</td>
                                                    <td className="py-3 font-bold text-white">${Number(inv.monto).toLocaleString()}</td>
                                                    <td className="py-3">
                                                        <span className={`font-bold ${NIVELES.find(n => n.tasa === Number(inv.tasa_interes))?.text ?? "text-gray-400"}`}>
                                                            {inv.tasa_interes}%
                                                        </span>
                                                    </td>
                                                    <td className="py-3">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${inv.activa ? "bg-green-900/40 text-green-400 border border-green-500/20" : "bg-gray-800 text-gray-500 border border-gray-700"}`}>
                                                            {inv.activa ? "Activa" : "Finalizada"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3">
                                                        {inv.retiros.length > 0 ? (
                                                            <div className="flex flex-col gap-1">
                                                                {inv.retiros.map((r, i) => (
                                                                    <div key={i} className="flex items-center gap-2 text-xs">
                                                                        <span className={r.tipo === "intereses" ? "text-green-400" : "text-blue-400"}>{r.tipo}</span>
                                                                        <span className="text-white font-semibold">${Number(r.monto).toLocaleString()}</span>
                                                                        <span className="text-gray-600">{fmt(r.fecha)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-700">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-600">
                                    <div className="text-4xl mb-3">📜</div>
                                    <p>No hay historial de inversiones aún</p>
                                </div>
                            )
                        )}
                    </div>
                </div>

            </div>

            <Footer />
        </div>
    );
}
