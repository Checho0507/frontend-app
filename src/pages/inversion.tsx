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

export default function Inversion() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [montoDeposito, setMontoDeposito] = useState<number>(50000);
    const [estado, setEstado] = useState<EstadoInversion | null>(null);
    const [historial, setHistorial] = useState<HistorialInversion[]>([]);
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
    const [mostrarHistorial, setMostrarHistorial] = useState(false);

    // Configurar intervalo para actualizar en tiempo real
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate('/login');
            return;
        }

        // Obtener datos del usuario
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

        // Cargar estado inicial
        cargarEstado();
        cargarHistorial();

        // Configurar intervalo para actualización en tiempo real (cada segundo)
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

    const realizarDeposito = async () => {
        if (!usuario) {
            showMsg("Debes iniciar sesión para invertir", "error");
            return;
        }

        if (montoDeposito < 50000 || montoDeposito > 1000000) {
            showMsg("El monto debe estar entre $50,000 y $1,000,000", "error");
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

    // Calcular ganancia diaria estimada
    const calcularGananciaDiaria = (monto: number) => {
        return (monto * 300) / (365 * 100); // 300% anual dividido en días
    };

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

            {/* Header Component */}
            <Header
                usuario={usuario}
                cerrarSesion={cerrarSesion}
                setUsuario={setUsuario}
            />

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-r from-green-600/20 via-teal-600/20 to-blue-600/20 animate-gradient-x">
                <div className="absolute inset-0">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-green-500 to-teal-500 rounded-full blur-3xl opacity-20"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl opacity-20"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-teal-500 to-green-500 rounded-full blur-3xl opacity-10"></div>
                </div>

                <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-green-600/20 to-teal-600/20 border border-teal-500/30 rounded-full text-sm font-bold text-teal-400 animate-pulse">
                                💰 CRECIMIENTO EXPONENCIAL
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-teal-400 via-green-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                                INVIERTE Y GANA
                            </span>
                            <br />
                            <span className="text-white">¡300% de Interés Anual!</span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            La forma más inteligente de hacer crecer tu dinero.
                            <span className="text-teal-400 font-bold"> Interés compuesto en tiempo real.</span>
                        </p>

                        {/* Estadísticas en vivo */}
                        {estado && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-12">
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
                                    <div className="text-sm text-gray-400">🎯 Intereses Disponibles</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
                                    <div className="text-2xl font-bold text-white">300%</div>
                                    <div className="text-sm text-gray-400">🚀 Tasa Anual</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Calculadora y Depósito */}
            <section className="container mx-auto px-4 py-16">
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

                                        <div className="mb-6">
                                            <label className="block text-gray-300 mb-3">
                                                Monto a invertir (entre $50,000 y $5,000,000)
                                            </label>
                                            <div className="flex items-center space-x-4">
                                                <input
                                                    type="number"
                                                    min="50000"
                                                    max="1000000"
                                                    step="1000"
                                                    value={montoDeposito}
                                                    onChange={(e) => setMontoDeposito(Number(e.target.value))}
                                                    className="flex-1 bg-gray-800 border border-teal-500/50 rounded-xl px-6 py-4 text-white text-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                />
                                                <button
                                                    onClick={() => setMontoDeposito(1000000)}
                                                    className="px-4 py-2 bg-gradient-to-r from-teal-600 to-blue-600 rounded-xl text-white font-bold hover:opacity-90 transition-opacity"
                                                >
                                                    MAX
                                                </button>
                                            </div>
                                        </div>

                                        {/* Valores sugeridos */}
                                        <div className="grid grid-cols-4 gap-2 mb-6">
                                            {[50000, 100000, 500000, 1000000].map((monto) => (
                                                <button
                                                    key={monto}
                                                    onClick={() => setMontoDeposito(monto)}
                                                    className={`py-2 rounded-lg text-center transition-all ${
                                                        montoDeposito === monto
                                                            ? 'bg-gradient-to-r from-teal-600 to-green-600 text-white'
                                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                    }`}
                                                >
                                                    ${(monto/1000).toFixed(0)}K
                                                </button>
                                            ))}
                                        </div>

                                        {/* Calculadora de ganancias */}
                                        <div className="bg-gradient-to-r from-teal-900/20 to-green-900/20 border border-teal-500/30 rounded-xl p-4 mb-6">
                                            <h4 className="text-lg font-bold text-white mb-3">📊 Proyección de ganancias</h4>
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
                                                    <span>Ganancia anual (300%):</span>
                                                    <span className="text-yellow-400 font-bold">
                                                        ${(montoDeposito * 3).toLocaleString()}
                                                    </span>
                                                </div>
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
                                                `INVERTIR $${montoDeposito.toLocaleString()}`
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
                                            <span><strong>300% de interés anual</strong> - La mejor tasa del mercado</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2 text-teal-400 text-xl">✓</span>
                                            <span><strong>Interés en tiempo real</strong> - Tu dinero crece cada segundo</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2 text-teal-400 text-xl">✓</span>
                                            <span><strong>Retiro de intereses cada 30 días</strong> - Disfruta tus ganancias mensuales</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2 text-teal-400 text-xl">✓</span>
                                            <span><strong>Retiro del capital a los 6 meses</strong> - Tu inversión está segura</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2 text-teal-400 text-xl">✓</span>
                                            <span><strong>Depósitos ilimitados</strong> - Invierte cuando quieras</span>
                                        </li>
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

            {/* Inversiones Activas */}
            <section className="container mx-auto px-4 py-16">
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
                            // Inversiones activas
                            estado && estado.inversiones.length > 0 ? (
                                <div className="space-y-4">
                                    {estado.inversiones.map((inversion) => (
                                        <div
                                            key={inversion.id}
                                            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 hover:border-teal-500/50 transition-all duration-300"
                                        >
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
                                        Comienza invirtiendo para hacer crecer tu dinero con nuestro 300% anual
                                    </p>
                                </div>
                            )
                        ) : (
                            // Historial completo
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
                                                                    <div
                                                                        key={idx}
                                                                        className="bg-gray-800/50 rounded-lg p-3"
                                                                    >
                                                                        <div className="flex justify-between items-center">
                                                                            <span className={`font-bold ${
                                                                                retiro.tipo === 'intereses'
                                                                                    ? 'text-green-400'
                                                                                    : 'text-blue-400'
                                                                            }`}>
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
                                                            <span className="text-gray-500 italic">Sin retiros</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-500 italic">
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

            {/* Información detallada */}
            <section className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-sm border-y border-gray-700/50">
                <div className="container mx-auto px-4 py-16">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold text-white text-center mb-12">
                            📚 ¿Cómo funciona Crecimiento Exponencial?
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-teal-600 to-green-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">
                                    1️⃣
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Deposita</h3>
                                <p className="text-gray-400">
                                    Invierte entre $50,000 y $5,000,000. No hay límite de depósitos.
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">
                                    2️⃣
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Observa el Crecimiento</h3>
                                <p className="text-gray-400">
                                    Tu dinero crece al 300% anual. Ve los intereses acumularse en tiempo real.
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">
                                    3️⃣
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Retira</h3>
                                <p className="text-gray-400">
                                    Retira intereses cada 30 días y el capital completo después de 6 meses.
                                </p>
                            </div>
                        </div>

                        <div className="mt-16 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-teal-500/30 rounded-2xl p-8">
                            <h3 className="text-2xl font-bold text-white mb-6 text-center">
                                🧮 Ejemplo de Crecimiento
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-teal-900/50 to-green-900/50">
                                            <th className="p-4 text-left text-gray-300 font-bold">Monto Inicial</th>
                                            <th className="p-4 text-left text-gray-300 font-bold">1 Mes</th>
                                            <th className="p-4 text-left text-gray-300 font-bold">3 Meses</th>
                                            <th className="p-4 text-left text-gray-300 font-bold">6 Meses</th>
                                            <th className="p-4 text-left text-gray-300 font-bold">1 Año</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { monto: 50000, color: 'text-teal-400' },
                                            { monto: 100000, color: 'text-green-400' },
                                            { monto: 500000, color: 'text-blue-400' },
                                            { monto: 1000000, color: 'text-purple-400' }
                                        ].map((item) => {
                                            const mensual = (item.monto * 300) / (12 * 100);
                                            const trimestral = mensual * 3;
                                            const semestral = mensual * 6;
                                            const anual = item.monto * 3;
                                            
                                            return (
                                                <tr key={item.monto} className="border-b border-gray-700/50">
                                                    <td className="p-4">
                                                        <span className={`text-xl font-bold ${item.color}`}>
                                                            ${item.monto.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-white font-bold">
                                                            ${(item.monto + mensual).toLocaleString()}
                                                        </span>
                                                        <p className="text-sm text-gray-400">+${mensual.toFixed(0)}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-white font-bold">
                                                            ${(item.monto + trimestral).toLocaleString()}
                                                        </span>
                                                        <p className="text-sm text-gray-400">+${trimestral.toFixed(0)}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-white font-bold">
                                                            ${(item.monto + semestral).toLocaleString()}
                                                        </span>
                                                        <p className="text-sm text-gray-400">+${semestral.toFixed(0)}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-white font-bold">
                                                            ${(item.monto + anual).toLocaleString()}
                                                        </span>
                                                        <p className="text-sm text-gray-400">+${anual.toLocaleString()}</p>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Component */}
            <Footer />

            {/* Estilos para animaciones */}
            <style>{`
                @keyframes gradient-x {
                    0%, 100% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 15s ease infinite;
                }
                
                @keyframes pulse-glow {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.7;
                    }
                }
                .animate-pulse-glow {
                    animation: pulse-glow 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}