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

const VIP_COLORES: Record<string, string> = {
    PLATA: "from-gray-400 to-gray-300",
    ORO: "from-yellow-500 to-yellow-300",
    DIAMANTE: "from-cyan-400 to-blue-400",
};

const VIP_BORDER: Record<string, string> = {
    PLATA: "border-gray-400/50",
    ORO: "border-yellow-400/50",
    DIAMANTE: "border-cyan-400/50",
};

const VIP_TEXT: Record<string, string> = {
    PLATA: "text-gray-300",
    ORO: "text-yellow-400",
    DIAMANTE: "text-cyan-400",
};

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
    const [mostrarHistorial, setMostrarHistorial] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate('/login');
            return;
        }

        axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then((res) => {
            setUsuario({
                id: res.data.id,
                username: res.data.username,
                saldo: res.data.saldo,
                verificado: res.data.verificado
            });
        })
        .catch(() => {
            navigate('/login');
        });

        cargarEstado();
        cargarHistorial();
        cargarInfoVIP();

        const intervalo = setInterval(cargarEstado, 1000);
        return () => clearInterval(intervalo);
    }, [navigate]);

    const cargarEstado = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${API_URL}/inversiones/inversion/estado`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEstado(response.data);
        } catch (error) {
            console.error("Error al cargar estado:", error);
        }
    };

    const cargarHistorial = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${API_URL}/inversiones/inversion/historial`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistorial(response.data.historial || []);
        } catch (error) {
            console.error("Error al cargar historial:", error);
        }
    };

    const cargarInfoVIP = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${API_URL}/inversiones/vip/info`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInfoVIP(response.data);
        } catch (error) {
            console.error("Error al cargar info VIP:", error);
        }
    };

    const comprarPaseVIP = async () => {
        if (!infoVIP?.nivel_siguiente) return;
        setCargandoVIP(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                `${API_URL}/inversiones/vip/comprar`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showMsg(response.data.message, "success");
            setUsuario(prev => prev ? { ...prev, saldo: response.data.nuevo_saldo } : prev);
            await cargarInfoVIP();
            await cargarEstado();
        } catch (error: any) {
            showMsg(error.response?.data?.detail || "Error al comprar pase VIP", "error");
        } finally {
            setCargandoVIP(false);
        }
    };

    const realizarDeposito = async () => {
        if (!usuario) {
            showMsg("Debes iniciar sesión para invertir", "error");
            return;
        }

        if (montoDeposito < 50000 || montoDeposito > 5000000) {
            showMsg("El monto debe estar entre $50,000 y $5,000,000", "error");
            return;
        }

        if (usuario.saldo < montoDeposito) {
            showMsg("Saldo insuficiente para realizar la inversión", "error");
            return;
        }

        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                `${API_URL}/inversiones/inversion/depositar`,
                { monto: montoDeposito },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            showMsg(response.data.message, "success");
            setUsuario(prev => prev ? { ...prev, saldo: response.data.nuevo_saldo } : prev);
            setMontoDeposito(50000);
            await cargarEstado();
            await cargarHistorial();
        } catch (error: any) {
            showMsg(error.response?.data?.detail || "Error al realizar depósito", "error");
        } finally {
            setCargando(false);
        }
    };

    const retirarIntereses = async (inversionId: number) => {
        if (!usuario) return;
        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                `${API_URL}/inversiones/inversion/retirar/intereses`,
                { inversion_id: inversionId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showMsg(response.data.message, "success");
            setUsuario(prev => prev ? { ...prev, saldo: response.data.nuevo_saldo } : prev);
            await cargarEstado();
            await cargarHistorial();
        } catch (error: any) {
            showMsg(error.response?.data?.detail || "Error al retirar intereses", "error");
        } finally {
            setCargando(false);
        }
    };

    const retirarCapital = async (inversionId: number) => {
        if (!usuario) return;
        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(
                `${API_URL}/inversiones/inversion/retirar/capital`,
                { inversion_id: inversionId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showMsg(response.data.message, "success");
            setUsuario(prev => prev ? { ...prev, saldo: response.data.nuevo_saldo } : prev);
            await cargarEstado();
            await cargarHistorial();
        } catch (error: any) {
            showMsg(error.response?.data?.detail || "Error al retirar capital", "error");
        } finally {
            setCargando(false);
        }
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const formatearFecha = (fechaStr: string) => {
        return new Date(fechaStr).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const cerrarSesion = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setUsuario(null);
        showMsg("Sesión cerrada correctamente", "success");
        setTimeout(() => navigate('/login'), 1500);
    };

    const tasaActual = infoVIP?.nivel_actual?.tasa ?? 50;

    const calcularGananciaDiaria = (monto: number, tasa: number = tasaActual) => {
        return (monto * tasa) / (365 * 100);
    };

    const vipNivel = infoVIP?.pase_vip ?? null;
    const vipColor = vipNivel ? VIP_COLORES[vipNivel] : "from-gray-600 to-gray-500";
    const vipBorder = vipNivel ? VIP_BORDER[vipNivel] : "border-gray-600/50";
    const vipText = vipNivel ? VIP_TEXT[vipNivel] : "text-gray-400";

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
            {/* Notificación */}
            {notificacion && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center space-x-3 shadow-2xl animate-slideIn ${
                    notificacion.type === "success"
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

            <Header usuario={usuario} cerrarSesion={cerrarSesion} setUsuario={setUsuario} />

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-r from-green-600/20 via-teal-600/20 to-blue-600/20">
                <div className="absolute inset-0">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-green-500 to-teal-500 rounded-full blur-3xl opacity-20"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl opacity-20"></div>
                </div>

                <div className="container mx-auto px-4 py-16 md:py-20 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-4">
                            <span className="px-4 py-2 bg-gradient-to-r from-green-600/20 to-teal-600/20 border border-teal-500/30 rounded-full text-sm font-bold text-teal-400 animate-pulse">
                                💰 CRECIMIENTO EXPONENCIAL
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-teal-400 via-green-400 to-blue-400 bg-clip-text text-transparent">
                                INVIERTE Y GANA
                            </span>
                            <br />
                            <span className="text-white">
                                ¡{tasaActual}% de Interés Anual!
                            </span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
                            La forma más inteligente de hacer crecer tu dinero.
                            <span className="text-teal-400 font-bold"> Interés en tiempo real.</span>
                        </p>

                        {estado && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                                <div className="bg-gradient-to-br from-green-900/30 to-teal-900/30 backdrop-blur-sm rounded-xl p-4 border border-teal-500/30">
                                    <div className="text-2xl font-bold text-white">
                                        ${estado.total_invertido.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-400">💰 Total Invertido</div>
                                </div>
                                <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
                                    <div className="text-2xl font-bold text-white">
                                        ${estado.total_intereses.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-400">📈 Intereses Acumulados</div>
                                </div>
                                <div className="bg-gradient-to-br from-teal-900/30 to-green-900/30 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
                                    <div className="text-2xl font-bold text-white">
                                        ${estado.total_intereses_disponibles.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-400">🎯 Disponibles</div>
                                </div>
                                <div className={`bg-gradient-to-br from-gray-900/30 to-gray-800/30 backdrop-blur-sm rounded-xl p-4 border ${vipBorder}`}>
                                    <div className={`text-2xl font-bold ${vipText}`}>{tasaActual}%</div>
                                    <div className="text-sm text-gray-400">🚀 Tasa Anual</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ===== SECCIÓN VIP ===== */}
            <section className="container mx-auto px-4 py-10">
                <div className="max-w-6xl mx-auto">

                    {/* Tarjeta de pase VIP actual */}
                    {infoVIP && (
                        <div className={`mb-8 rounded-2xl p-6 border ${vipBorder} bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm`}>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                {/* Info nivel actual */}
                                <div className="flex items-center gap-4">
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${vipColor} flex items-center justify-center text-3xl shadow-lg`}>
                                        {infoVIP.nivel_actual.emoji}
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm font-medium">Tu Pase VIP Actual</p>
                                        <h3 className={`text-2xl font-bold ${vipText}`}>
                                            {infoVIP.nivel_actual.nombre}
                                        </h3>
                                        <p className="text-gray-300">
                                            Ganancia: <span className={`font-bold ${vipText}`}>{infoVIP.nivel_actual.tasa}% anual</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Flecha y siguiente nivel */}
                                {infoVIP.nivel_siguiente ? (
                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1 justify-center">
                                        <div className="hidden md:block text-gray-600 text-3xl">→</div>
                                        <div className={`rounded-xl p-4 border ${VIP_BORDER[infoVIP.nivel_siguiente.nivel] || "border-gray-500/50"} bg-gray-800/50 min-w-[200px]`}>
                                            <p className="text-gray-400 text-xs mb-1">Siguiente nivel</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{infoVIP.nivel_siguiente.emoji}</span>
                                                <span className={`font-bold ${VIP_TEXT[infoVIP.nivel_siguiente.nivel] || "text-gray-300"}`}>
                                                    {infoVIP.nivel_siguiente.nombre}
                                                </span>
                                            </div>
                                            <p className={`text-sm font-bold ${VIP_TEXT[infoVIP.nivel_siguiente.nivel] || "text-gray-300"} mt-1`}>
                                                {infoVIP.nivel_siguiente.tasa}% anual
                                            </p>
                                            <p className="text-gray-400 text-xs mt-1">
                                                Costo: <span className="text-white font-bold">${infoVIP.nivel_siguiente.costo.toLocaleString()}</span>
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl px-6 py-3 border border-cyan-500/30">
                                        <span className="text-2xl">👑</span>
                                        <span className="text-cyan-400 font-bold">¡Nivel máximo alcanzado!</span>
                                    </div>
                                )}

                                {/* Botón de compra */}
                                {infoVIP.nivel_siguiente && (
                                    <button
                                        onClick={comprarPaseVIP}
                                        disabled={cargandoVIP || !infoVIP.puede_subir}
                                        className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
                                            infoVIP.puede_subir
                                                ? `bg-gradient-to-r ${VIP_COLORES[infoVIP.nivel_siguiente.nivel] || "from-gray-500 to-gray-400"} text-gray-900 hover:scale-105 hover:shadow-xl`
                                                : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                        }`}
                                    >
                                        {cargandoVIP ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                                                Procesando...
                                            </div>
                                        ) : infoVIP.puede_subir ? (
                                            <>
                                                {infoVIP.nivel_siguiente.emoji} Subir a {infoVIP.nivel_siguiente.nombre}
                                                <br />
                                                <span className="text-xs font-normal">${infoVIP.nivel_siguiente.costo.toLocaleString()}</span>
                                            </>
                                        ) : (
                                            <>
                                                Necesitas ${(infoVIP.nivel_siguiente.costo - infoVIP.saldo_usuario).toLocaleString()} más
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tabla comparativa de niveles VIP */}
                    <div className="mb-10 bg-gradient-to-r from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                        <h3 className="text-xl font-bold text-white mb-4 text-center">🏆 Niveles de Pase VIP</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Sin pase */}
                            <div className={`rounded-xl p-4 border ${!vipNivel ? "border-gray-400 ring-2 ring-gray-400/50" : "border-gray-700"} bg-gray-800/50 text-center`}>
                                <div className="text-2xl mb-1">⬜</div>
                                <div className="font-bold text-gray-300 text-sm">Sin Pase</div>
                                <div className="text-2xl font-bold text-gray-400 mt-1">50%</div>
                                <div className="text-xs text-gray-500">anual</div>
                                {!vipNivel && <div className="mt-2 text-xs text-gray-400 font-bold">← Tu nivel</div>}
                            </div>
                            {/* Plata */}
                            <div className={`rounded-xl p-4 border ${vipNivel === "PLATA" ? "border-gray-400 ring-2 ring-gray-400/50" : "border-gray-700"} bg-gray-800/50 text-center`}>
                                <div className="text-2xl mb-1">🥈</div>
                                <div className="font-bold text-gray-300 text-sm">VIP Plata</div>
                                <div className="text-2xl font-bold text-gray-300 mt-1">100%</div>
                                <div className="text-xs text-gray-500">anual</div>
                                <div className="text-xs text-gray-500 mt-1">Costo: $50,000</div>
                                {vipNivel === "PLATA" && <div className="mt-2 text-xs text-gray-300 font-bold">← Tu nivel</div>}
                            </div>
                            {/* Oro */}
                            <div className={`rounded-xl p-4 border ${vipNivel === "ORO" ? "border-yellow-400 ring-2 ring-yellow-400/50" : "border-gray-700"} bg-gray-800/50 text-center`}>
                                <div className="text-2xl mb-1">🥇</div>
                                <div className="font-bold text-yellow-400 text-sm">VIP Oro</div>
                                <div className="text-2xl font-bold text-yellow-400 mt-1">200%</div>
                                <div className="text-xs text-gray-500">anual</div>
                                <div className="text-xs text-gray-500 mt-1">Costo: $100,000</div>
                                {vipNivel === "ORO" && <div className="mt-2 text-xs text-yellow-400 font-bold">← Tu nivel</div>}
                            </div>
                            {/* Diamante */}
                            <div className={`rounded-xl p-4 border ${vipNivel === "DIAMANTE" ? "border-cyan-400 ring-2 ring-cyan-400/50" : "border-gray-700"} bg-gray-800/50 text-center`}>
                                <div className="text-2xl mb-1">💎</div>
                                <div className="font-bold text-cyan-400 text-sm">VIP Diamante</div>
                                <div className="text-2xl font-bold text-cyan-400 mt-1">300%</div>
                                <div className="text-xs text-gray-500">anual</div>
                                <div className="text-xs text-gray-500 mt-1">Costo: $200,000</div>
                                {vipNivel === "DIAMANTE" && <div className="mt-2 text-xs text-cyan-400 font-bold">← Tu nivel</div>}
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* ===== CALCULADORA Y DEPÓSITO ===== */}
            <section className="container mx-auto px-4 pb-16">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-teal-500/30">
                        <h2 className="text-3xl font-bold text-white mb-6 text-center">
                            🚀 Realiza tu Inversión
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Panel de depósito */}
                            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700">
                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                                    <span className="mr-3">💵</span> Nueva Inversión
                                </h3>

                                {usuario && (
                                    <>
                                        <div className="mb-6">
                                            <p className="text-gray-300 mb-2">Saldo disponible</p>
                                            <p className="text-3xl font-bold text-teal-400">
                                                ${usuario.saldo.toLocaleString()}
                                            </p>
                                        </div>

                                        {/* Aviso de tasa actual */}
                                        <div className={`mb-4 flex items-center gap-3 rounded-xl px-4 py-3 border ${vipBorder} bg-gray-800/60`}>
                                            <span className="text-xl">{infoVIP?.nivel_actual.emoji ?? "⬜"}</span>
                                            <div>
                                                <p className="text-xs text-gray-400">Tu tasa de inversión ({infoVIP?.nivel_actual.nombre ?? "Sin Pase"})</p>
                                                <p className={`text-lg font-bold ${vipText}`}>{tasaActual}% anual</p>
                                            </div>
                                            {infoVIP?.nivel_siguiente && (
                                                <div className="ml-auto text-right">
                                                    <p className="text-xs text-gray-500">Con {infoVIP.nivel_siguiente.emoji}</p>
                                                    <p className="text-sm font-bold text-green-400">+{infoVIP.nivel_siguiente.tasa - tasaActual}% más</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mb-6">
                                            <label className="block text-gray-300 mb-3">
                                                Monto a invertir (entre $50,000 y $5,000,000)
                                            </label>
                                            <div className="flex items-center space-x-4">
                                                <input
                                                    type="number"
                                                    min="50000"
                                                    max="5000000"
                                                    step="1000"
                                                    value={montoDeposito}
                                                    onChange={(e) => setMontoDeposito(Number(e.target.value))}
                                                    className="flex-1 bg-gray-800 border border-teal-500/50 rounded-xl px-6 py-4 text-white text-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                />
                                                <button
                                                    onClick={() => setMontoDeposito(5000000)}
                                                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-blue-600 rounded-xl text-white font-bold hover:opacity-90 transition-opacity"
                                                >
                                                    MAX
                                                </button>
                                            </div>
                                        </div>

                                        {/* Valores sugeridos */}
                                        <div className="grid grid-cols-4 gap-2 mb-6">
                                            {[50000, 100000, 500000, 1000000, 5000000].map((monto) => (
                                                <button
                                                    key={monto}
                                                    onClick={() => setMontoDeposito(monto)}
                                                    className={`py-2 rounded-lg text-center transition-all ${
                                                        montoDeposito === monto
                                                            ? 'bg-gradient-to-r from-teal-600 to-green-600 text-white'
                                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                    }`}
                                                >
                                                    ${(monto / 1000).toFixed(0)}K
                                                </button>
                                            ))}
                                        </div>

                                        {/* Calculadora de ganancias */}
                                        <div className="bg-gradient-to-r from-teal-900/20 to-green-900/20 border border-teal-500/30 rounded-xl p-4 mb-6">
                                            <h4 className="text-lg font-bold text-white mb-3">📊 Proyección de ganancias ({tasaActual}% anual)</h4>
                                            <div className="space-y-2 text-gray-300">
                                                <div className="flex justify-between">
                                                    <span>Ganancia diaria:</span>
                                                    <span className="text-teal-400 font-bold">
                                                        ${calcularGananciaDiaria(montoDeposito).toFixed(0)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Ganancia mensual (30 días):</span>
                                                    <span className="text-green-400 font-bold">
                                                        ${(calcularGananciaDiaria(montoDeposito) * 30).toFixed(0)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Ganancia anual ({tasaActual}%):</span>
                                                    <span className="text-yellow-400 font-bold">
                                                        ${(montoDeposito * tasaActual / 100).toLocaleString()}
                                                    </span>
                                                </div>
                                                {infoVIP?.nivel_siguiente && (
                                                    <div className="mt-2 pt-2 border-t border-gray-700">
                                                        <p className="text-xs text-gray-500 mb-1">Con {infoVIP.nivel_siguiente.emoji} {infoVIP.nivel_siguiente.nombre} ganarías:</p>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-400">Anual adicional:</span>
                                                            <span className="text-green-400 font-bold">
                                                                +${((montoDeposito * infoVIP.nivel_siguiente.tasa / 100) - (montoDeposito * tasaActual / 100)).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={realizarDeposito}
                                            disabled={cargando || usuario.saldo < montoDeposito}
                                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                                                usuario.saldo >= montoDeposito
                                                    ? 'bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 hover:scale-[1.02] shadow-2xl shadow-teal-500/25'
                                                    : 'bg-gray-600 cursor-not-allowed'
                                            }`}
                                        >
                                            {cargando ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                                                    Procesando...
                                                </div>
                                            ) : usuario.saldo >= montoDeposito ? (
                                                `INVERTIR $${montoDeposito.toLocaleString()} al ${tasaActual}%`
                                            ) : (
                                                'SALDO INSUFICIENTE'
                                            )}
                                        </button>

                                        {usuario.saldo < montoDeposito && (
                                            <p className="text-red-400 mt-4 text-center font-bold">
                                                ⚠️ Necesitas ${(montoDeposito - usuario.saldo).toLocaleString()} más
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Información de la inversión */}
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-teal-900/30 to-green-900/30 border border-teal-500/30 rounded-2xl p-6">
                                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                                        <span className="mr-3">🏆</span> Beneficios
                                    </h3>
                                    <ul className="space-y-3 text-gray-300">
                                        <li className="flex items-start">
                                            <span className="mr-2 text-teal-400 text-xl">✓</span>
                                            <span><strong>{tasaActual}% de interés anual</strong> — según tu pase VIP</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2 text-teal-400 text-xl">✓</span>
                                            <span><strong>Interés en tiempo real</strong> — tu dinero crece cada segundo</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2 text-teal-400 text-xl">✓</span>
                                            <span><strong>Retiro de intereses cada 30 días</strong></span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2 text-teal-400 text-xl">✓</span>
                                            <span><strong>Retiro del capital a los 6 meses</strong></span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2 text-teal-400 text-xl">✓</span>
                                            <span><strong>Depósitos ilimitados</strong> — invierte cuando quieras</span>
                                        </li>
                                        {infoVIP?.nivel_siguiente && (
                                            <li className="flex items-start mt-2 pt-2 border-t border-teal-500/20">
                                                <span className="mr-2 text-yellow-400 text-xl">⬆️</span>
                                                <span>
                                                    <strong className="text-yellow-400">Sube a {infoVIP.nivel_siguiente.nombre}</strong> por solo $
                                                    {infoVIP.nivel_siguiente.costo.toLocaleString()} y gana <strong className="text-yellow-400">{infoVIP.nivel_siguiente.tasa}% anual</strong>
                                                </span>
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-6">
                                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                                        <span className="mr-3">📈</span> Tiempos de Retiro
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-4 bg-gradient-to-br from-teal-900/20 to-green-900/20 rounded-xl">
                                            <div className="text-3xl font-bold text-teal-400 mb-2">30</div>
                                            <div className="text-gray-300">Días para retirar intereses</div>
                                        </div>
                                        <div className="text-center p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl">
                                            <div className="text-3xl font-bold text-blue-400 mb-2">180</div>
                                            <div className="text-gray-300">Días para retirar capital</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== INVERSIONES ACTIVAS ===== */}
            <section className="container mx-auto px-4 pb-16">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/30">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold text-white">
                                📊 Tus Inversiones Activas
                            </h2>
                            <button
                                onClick={() => setMostrarHistorial(!mostrarHistorial)}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-bold hover:opacity-90 transition-opacity"
                            >
                                {mostrarHistorial ? "Ver Inversiones Activas" : "Ver Historial Completo"}
                            </button>
                        </div>

                        {!mostrarHistorial ? (
                            estado && estado.inversiones.length > 0 ? (
                                <div className="space-y-4">
                                    {estado.inversiones.map((inversion) => (
                                        <div
                                            key={inversion.id}
                                            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 hover:border-teal-500/50 transition-all duration-300"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-sm text-gray-400">Inversión #{inversion.id}</span>
                                                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                                    inversion.tasa_interes >= 300 ? "bg-cyan-900/40 text-cyan-400" :
                                                    inversion.tasa_interes >= 200 ? "bg-yellow-900/40 text-yellow-400" :
                                                    inversion.tasa_interes >= 100 ? "bg-gray-700/40 text-gray-300" :
                                                    "bg-gray-800/40 text-gray-400"
                                                }`}>
                                                    {inversion.tasa_interes >= 300 ? "💎" : inversion.tasa_interes >= 200 ? "🥇" : inversion.tasa_interes >= 100 ? "🥈" : "⬜"} {inversion.tasa_interes}% anual
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                <div>
                                                    <p className="text-gray-400 mb-1">Monto Invertido</p>
                                                    <p className="text-2xl font-bold text-white">
                                                        ${inversion.monto.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 mb-1">Interés Acumulado</p>
                                                    <p className="text-2xl font-bold text-teal-400">
                                                        ${inversion.interes_acumulado.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 mb-1">Ganancia Diaria</p>
                                                    <p className="text-2xl font-bold text-green-400">
                                                        ${inversion.interes_diario.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                <div className="bg-gradient-to-r from-teal-900/20 to-green-900/20 border border-teal-500/30 rounded-xl p-4">
                                                    <p className="text-gray-400 mb-1">Próximo retiro de intereses</p>
                                                    <p className="text-lg font-bold text-white">
                                                        {inversion.puede_retirar_intereses ? (
                                                            <span className="text-green-400">¡DISPONIBLE AHORA!</span>
                                                        ) : (
                                                            `En ${inversion.dias_faltantes_intereses} días`
                                                        )}
                                                    </p>
                                                    <p className="text-sm text-gray-400">
                                                        {formatearFecha(inversion.fecha_proximo_retiro_intereses)}
                                                    </p>
                                                </div>
                                                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4">
                                                    <p className="text-gray-400 mb-1">Próximo retiro de capital</p>
                                                    <p className="text-lg font-bold text-white">
                                                        {inversion.puede_retirar_capital ? (
                                                            <span className="text-green-400">¡DISPONIBLE AHORA!</span>
                                                        ) : (
                                                            `En ${inversion.dias_faltantes_capital} días`
                                                        )}
                                                    </p>
                                                    <p className="text-sm text-gray-400">
                                                        {formatearFecha(inversion.fecha_proximo_retiro_capital)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex space-x-4">
                                                <button
                                                    onClick={() => retirarIntereses(inversion.id)}
                                                    disabled={!inversion.puede_retirar_intereses || cargando}
                                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                                        inversion.puede_retirar_intereses
                                                            ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700'
                                                            : 'bg-gray-700 cursor-not-allowed'
                                                    }`}
                                                >
                                                    RETIRAR INTERESES (${inversion.interes_acumulado.toLocaleString()})
                                                </button>
                                                <button
                                                    onClick={() => retirarCapital(inversion.id)}
                                                    disabled={!inversion.puede_retirar_capital || cargando}
                                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                                        inversion.puede_retirar_capital
                                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                                                            : 'bg-gray-700 cursor-not-allowed'
                                                    }`}
                                                >
                                                    RETIRAR CAPITAL
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">💸</div>
                                    <h3 className="text-2xl font-bold text-white mb-4">
                                        Aún no tienes inversiones
                                    </h3>
                                    <p className="text-gray-400 mb-8">
                                        Comienza invirtiendo para hacer crecer tu dinero con tu tasa VIP actual de {tasaActual}% anual
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-gray-900 to-gray-800">
                                            <th className="p-4 text-left text-gray-300 font-bold">Fecha</th>
                                            <th className="p-4 text-left text-gray-300 font-bold">Monto</th>
                                            <th className="p-4 text-left text-gray-300 font-bold">Estado</th>
                                            <th className="p-4 text-left text-gray-300 font-bold">Retiros</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historial.length > 0 ? (
                                            historial.map((inv) => (
                                                <tr
                                                    key={inv.id}
                                                    className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors"
                                                >
                                                    <td className="p-4 text-gray-300">
                                                        {formatearFecha(inv.fecha_deposito)}
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="text-xl font-bold text-white">
                                                            ${inv.monto.toLocaleString()}
                                                        </p>
                                                        <p className="text-sm text-gray-400">
                                                            {inv.tasa_interes}% anual
                                                        </p>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                            inv.activa
                                                                ? 'bg-gradient-to-r from-green-600/30 to-teal-600/30 text-green-400'
                                                                : 'bg-gradient-to-r from-gray-600/30 to-gray-700/30 text-gray-400'
                                                        }`}>
                                                            {inv.activa ? 'Activa' : 'Finalizada'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        {inv.retiros.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {inv.retiros.map((retiro, idx) => (
                                                                    <div key={idx} className="bg-gray-800/50 rounded-lg p-3">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className={`font-bold ${retiro.tipo === 'intereses' ? 'text-green-400' : 'text-blue-400'}`}>
                                                                                {retiro.tipo.toUpperCase()}
                                                                            </span>
                                                                            <span className="text-white font-bold">
                                                                                ${retiro.monto.toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-sm text-gray-400">
                                                                            {formatearFecha(retiro.fecha)}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-500">Sin retiros</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-400">
                                                    No hay historial de inversiones
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
