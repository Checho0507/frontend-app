import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "../components/header";
import Footer from "../components/footer";
import { API_URL } from "../api/auth";


interface Ganador {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    premio?: number;
    saldo_anterior?: number;
}

interface ResultadoSorteo {
    id: number;
    fecha: string;
    numero_ganador: number;
    ganadores: Ganador[];
}

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    nivel?: string;
    verificado_pendiente?: boolean;
}

export default function SorteoVIP() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [mensaje, setMensaje] = useState('');
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
    const [montoInversion, setMontoInversion] = useState(10000);
    const [resultados, setResultados] = useState<ResultadoSorteo[]>([]);
    const [cargandoResultados, setCargandoResultados] = useState(false);
    const [errorResultados, setErrorResultados] = useState<string>("");
    const [tiempoRestante, setTiempoRestante] = useState("");

    const calcularFichas = (monto: number): number => {
        if (monto === 10000) return 1;
        if (monto === 20000) return 3;
        if (monto === 50000) return 10;
        if (monto === 100000) return 25;
        return Math.floor(monto / 10000);
    };

    const obtenerResultados = async () => {
        setCargandoResultados(true);
        setErrorResultados("");

        try {
            const response = await axios.get(`${API_URL}/vip/vip/results`);
            console.log("Resultados obtenidos:", response.data);
            setResultados(response.data);
        } catch (error: any) {
            console.error("Error al obtener resultados:", error);
            setErrorResultados("Error al cargar los resultados del sorteo");
        } finally {
            setCargandoResultados(false);
        }
    };

    useEffect(() => {
        obtenerResultados();
        const intervalo = setInterval(obtenerResultados, 30000);
        return () => clearInterval(intervalo);
    }, []);

    useEffect(() => {
        console.log('Usuario en Referidos:', usuario);
        console.log('Token en localStorage:', localStorage.getItem('token'));

        if (!usuario) {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate('/login');
                return;
            }
            if (token) {
                axios.get(`${API_URL}/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                    .then((res) => {
                        const userData = res.data;
                        setUsuario({
                            id: userData.id,
                            username: userData.username,
                            saldo: userData.saldo,
                            verificado: userData.verificado,
                            nivel: userData.nivel,
                            verificado_pendiente: userData.verificado_pendiente
                        });
                        localStorage.setItem("usuario", JSON.stringify(userData));
                    })
                    .catch(() => {
                        setUsuario(null);
                    });
            }
        }
    }, [navigate, usuario, setUsuario]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        axios.get(`${API_URL}/vip/vip/next_draw`)
            .then(res => {
                const fechaSorteo = new Date(res.data.next_draw);

                intervalId = setInterval(() => {
                    const ahora = new Date().getTime();
                    const diferencia = fechaSorteo.getTime() - ahora;

                    if (diferencia <= 0) {
                        setTiempoRestante("En curso...");
                        clearInterval(intervalId);
                        obtenerResultados();
                        return;
                    }

                    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
                    const horas = Math.floor((diferencia / (1000 * 60 * 60)) % 24);
                    const minutos = Math.floor((diferencia / (1000 * 60)) % 60);
                    const segundos = Math.floor((diferencia / 1000) % 60);

                    setTiempoRestante(`${dias}d ${horas}h ${minutos}m ${segundos}s`);
                }, 1000);
            })
            .catch(() => {
                setTiempoRestante("Error");
            });

        return () => clearInterval(intervalId);
    }, []);

    const calcularProbabilidad = (inversion: number) => {
        let basePersonal = 0;
        if (inversion === 10000) basePersonal = 1;
        if (inversion === 20000) basePersonal = 3;
        if (inversion === 50000) basePersonal = 10;
        if (inversion === 100000) basePersonal = 25;

        const probabilidadTotal = 50 + basePersonal;
        const chance = `${probabilidadTotal} / ${(probabilidadTotal - 50).toLocaleString()}`;
        const porcentaje = (((probabilidadTotal - 50) / (probabilidadTotal)) * 100).toFixed(1);
        return { chance, porcentaje, basePersonal };
    };

    const participar = async (costo: number) => {
        if (!usuario) {
            setMensaje("Debes iniciar sesión para participar.");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/vip/vip/participar`,
                { costo },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMensaje(res.data.mensaje);
            setUsuario(prev => prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev);

        } catch (err: any) {
            setMensaje(err.response?.data?.detail || "Error al inscribirse al VIP");
        }
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const cerrarSesion = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        localStorage.removeItem("comprobante_enviado");
        localStorage.removeItem("intentos_envio_comprobante");
        localStorage.removeItem("ultimo_intento_envio_comprobante");
        localStorage.removeItem("comprobante_verificado");
        localStorage.removeItem("verificacion_pendiente");
        localStorage.removeItem("monto_deposito_inicial");
        localStorage.removeItem("bono_deposito_inicial");
        localStorage.removeItem("deposito_inicial_realizado");
        localStorage.removeItem("fecha_deposito_inicial");
        localStorage.removeItem("ultimo_retiro");
        localStorage.removeItem("retiro_pendiente");
        localStorage.removeItem("ultimo_bono_referidos");
        localStorage.removeItem('paso_verificacion');
        localStorage.removeItem('ultimo_usuario_id');
        localStorage.removeItem("fecha_envio_comprobante");

        setUsuario(null);
        showMsg("Sesión cerrada correctamente", "success");
        setTimeout(() => navigate('/login'), 1500);
    };

    const formatearGanadores = (ganadores: Ganador[]) => {
        if (!ganadores || ganadores.length === 0) {
            return "Sin ganadores";
        }

        return ganadores.map(g =>
            `${g.username} (Premio: $${g.premio?.toLocaleString() || 0})`
        ).join(", ");
    };

    const fichas = calcularFichas(montoInversion);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {/* Notificación */}
            {notificacion && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center space-x-3 shadow-2xl animate-slideIn ${notificacion.type === "success"
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
            <section className="relative overflow-hidden bg-gradient-to-r from-red-600/20 via-yellow-600/20 to-purple-600/20 animate-gradient-x">
                <div className="absolute inset-0">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur-3xl opacity-20"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full blur-3xl opacity-20"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-3xl opacity-10"></div>
                </div>

                <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-red-600/20 to-yellow-600/20 border border-yellow-500/30 rounded-full text-sm font-bold text-yellow-400 animate-pulse">
                                🎰 SORTEO VIP DIARIO
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-yellow-400 via-red-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                                MEGA SORTEO VIP
                            </span>
                            <br />
                            <span className="text-white">¡Gana Hasta $500,000 Diarios!</span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            El juego más emocionante con premios REALES.
                            <span className="text-yellow-400 font-bold"> Invita más amigos = Más probabilidades de ganar</span>
                        </p>

                        {/* Estadísticas en vivo */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-12">
                            <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 backdrop-blur-sm rounded-xl p-4 border border-red-500/30">
                                <div className="text-2xl font-bold text-white">5,247</div>
                                <div className="text-sm text-gray-400">👥 Usuarios</div>
                            </div>
                            <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30">
                                <div className="text-2xl font-bold text-white">892</div>
                                <div className="text-sm text-gray-400">🎯 Participantes</div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
                                <div className="text-2xl font-bold text-white">
                                    {tiempoRestante || "Cargando..."}
                                </div>
                                <div className="text-sm text-gray-400">⏰ Próximo Sorteo</div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
                                <div className="text-2xl font-bold text-white">$500,000</div>
                                <div className="text-sm text-gray-400">💰 Premio Diario</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Calculadora de probabilidades */}
            <section className="container mx-auto px-4 py-16">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30">
                        <h2 className="text-3xl font-bold text-white mb-6 text-center">
                            🎯 Calcula tus Probabilidades
                        </h2>

                        <div className="mb-8">
                            <p className="text-gray-300 text-center mb-6 text-lg">
                                Selecciona tu inversión y descubre tus probabilidades de ganar el premio de <span className="text-yellow-400 font-bold">$500,000</span>
                            </p>

                            {/* Opciones de inversión */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                {[10000, 20000, 50000, 100000].map(monto => {
                                    const { chance, porcentaje } = calcularProbabilidad(monto);
                                    const fichasMonto = calcularFichas(monto);

                                    return (
                                        <div
                                            key={monto}
                                            onClick={() => setMontoInversion(monto)}
                                            className={`p-6 rounded-xl border transition-all duration-300 cursor-pointer ${monto === montoInversion
                                                ? 'bg-gradient-to-br from-yellow-600/30 to-green-600/30 border-yellow-500 shadow-lg'
                                                : 'bg-gray-800/50 border-gray-700 hover:border-yellow-500/50'
                                                }`}
                                        >
                                            <div className="text-center">
                                                <h3 className="text-2xl font-bold text-white mb-2">${monto.toLocaleString()}</h3>
                                                <div className="flex items-center justify-center mb-3">
                                                    <div className="flex items-center space-x-1">
                                                        {Array.from({
                                                            length:
                                                                fichasMonto >= 25
                                                                    ? 5
                                                                    : fichasMonto >= 10
                                                                        ? 4
                                                                        : fichasMonto
                                                        }).map((_, i) => (
                                                            <span key={i} className="text-yellow-400">
                                                                🎫
                                                            </span>
                                                        ))}

                                                        {fichasMonto >= 10 && (
                                                            <span className="text-yellow-400 font-bold ml-1">+</span>
                                                        )}
                                                    </div>

                                                    <span className="ml-2 text-gray-300">
                                                        {fichasMonto} {fichasMonto === 1 ? "ficha" : "fichas"}
                                                    </span>
                                                </div>

                                                <div className="text-sm">
                                                    <p className="text-gray-400">Probabilidad:</p>
                                                    <p className="font-bold text-white">{chance}</p>
                                                    <p className="text-yellow-400 mt-1">({porcentaje}%)</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Explicación del sistema */}
                            <div className="bg-gradient-to-r from-yellow-600/10 to-green-600/10 border border-yellow-500/30 rounded-xl p-6">
                                <h4 className="text-xl font-bold text-white mb-4 flex items-center">
                                    <span className="mr-2">💡</span> ¿Cómo funciona el sistema?
                                </h4>
                                <ul className="space-y-3 text-gray-300">
                                    <li className="flex items-start">
                                        <span className="mr-2 text-green-400">✓</span>
                                        <span><strong>Sorteo automático cada 24 horas</strong> con número ganador de 8 dígitos</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2 text-green-400">✓</span>
                                        <span><strong>Inversión base:</strong> $10.000 = Factor base de 10.000</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2 text-green-400">✓</span>
                                        <span><strong>Mejor probabilidad:</strong> ${montoInversion.toLocaleString()} = {fichas} {fichas === 1 ? 'ficha' : 'fichas'}</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2 text-green-400">✓</span>
                                        <span><strong>Los ganadores son determinados</strong> comparando los últimos 8 dígitos del ID de usuario con el número ganador</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Botón de participar */}
                        {usuario && (
                            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700 text-center">
                                <div className="mb-6">
                                    <p className="text-gray-400 mb-2">Participante actual</p>
                                    <p className="text-xl font-bold text-white">
                                        {usuario.username} • Saldo disponible: <span className="text-yellow-400">${usuario.saldo.toLocaleString()}</span>
                                    </p>
                                </div>

                                <button
                                    onClick={() => participar(montoInversion)}
                                    disabled={usuario.saldo < montoInversion}
                                    className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${usuario.saldo >= montoInversion
                                        ? 'bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 hover:scale-105 shadow-2xl shadow-yellow-500/25'
                                        : 'bg-gray-600 cursor-not-allowed'
                                        }`}
                                >
                                    <span className="flex items-center justify-center space-x-3">
                                        <span className="text-2xl">🚀</span>
                                        <span>
                                            {usuario.saldo >= montoInversion
                                                ? `PARTICIPAR POR $${montoInversion.toLocaleString()}`
                                                : 'SALDO INSUFICIENTE'
                                            }
                                        </span>
                                        <span className="text-2xl">🚀</span>
                                    </span>
                                </button>

                                {usuario.saldo < montoInversion && (
                                    <p className="text-red-400 mt-4 font-bold">
                                        ⚠️ Necesitas ${(montoInversion - usuario.saldo).toLocaleString()} más para participar
                                    </p>
                                )}

                                {mensaje && (
                                    <div className={`mt-4 p-4 rounded-xl ${mensaje.includes("Error")
                                        ? 'bg-red-900/30 border border-red-500/50 text-red-400'
                                        : 'bg-green-900/30 border border-green-500/50 text-green-400'
                                        }`}>
                                        {mensaje}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Últimos ganadores y testimonios */}
            <section className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-sm border-y border-gray-700/50">
                <div className="container mx-auto px-4 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">🏆 Últimos Ganadores</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Historias reales de usuarios que ganaron grandes premios
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300">
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full flex items-center justify-center text-2xl">
                                    👤
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-white">Checho0507 🎉</h4>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className="px-2 py-1 bg-gradient-to-r from-yellow-600/50 to-green-600/50 rounded-full text-xs font-bold">
                                            DIAMANTE
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-300 italic mb-6">"¡Increíble! Gané $500,000 con solo $10,000 de inversión"</p>
                            <div className="pt-6 border-t border-gray-700/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-400">Ganó</p>
                                        <p className="text-2xl font-bold text-yellow-400">$500,000</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-400">Inversión</p>
                                        <p className="text-lg font-bold text-green-400">$10,000</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300">
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full flex items-center justify-center text-2xl">
                                    👤
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-white">CarlosR 💰</h4>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className="px-2 py-1 bg-gradient-to-r from-yellow-600/50 to-green-600/50 rounded-full text-xs font-bold">
                                            PLATINO
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-300 italic mb-6">"Mi segunda semana jugando y ya gané el premio mayor"</p>
                            <div className="pt-6 border-t border-gray-700/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-400">Ganó</p>
                                        <p className="text-2xl font-bold text-yellow-400">$500,000</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-400">Inversión</p>
                                        <p className="text-lg font-bold text-green-400">$50,000</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300">
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full flex items-center justify-center text-2xl">
                                    👤
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-white">AnaM06 🚀</h4>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className="px-2 py-1 bg-gradient-to-r from-yellow-600/50 to-green-600/50 rounded-full text-xs font-bold">
                                            ORO
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-300 italic mb-6">"Invité a 5 amigos y multipliqué mis probabilidades"</p>
                            <div className="pt-6 border-t border-gray-700/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-400">Ganó</p>
                                        <p className="text-2xl font-bold text-yellow-400">$500,000</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-400">Inversión</p>
                                        <p className="text-lg font-bold text-green-400">$20,000</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resultados del Sorteo VIP */}
                    <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30">
                        <h2 className="text-3xl font-bold text-white mb-6 text-center">
                            📊 Historial de Sorteos VIP
                        </h2>

                        {cargandoResultados && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-300">Cargando resultados...</p>
                            </div>
                        )}

                        {errorResultados && (
                            <div className="bg-gradient-to-r from-red-900/30 to-red-800/30 border border-red-500/50 text-red-400 p-4 rounded-xl text-center mb-6">
                                {errorResultados}
                            </div>
                        )}

                        {!cargandoResultados && !errorResultados && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-gray-900 to-gray-800">
                                            <th className="p-4 text-left text-gray-300 font-bold">Fecha del Sorteo</th>
                                            <th className="p-4 text-center text-gray-300 font-bold">Número Ganador (8 dígitos)</th>
                                            <th className="p-4 text-left text-gray-300 font-bold">Ganadores y Premios</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resultados.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-gray-500 italic">
                                                    No hay resultados disponibles
                                                </td>
                                            </tr>
                                        ) : (
                                            resultados.slice(0, 5).map((resultado, index) => (
                                                <tr
                                                    key={resultado.id}
                                                    className={`border-b border-gray-700/50 ${index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-900/30'
                                                        } hover:bg-gray-700/30 transition-colors`}
                                                >
                                                    <td className="p-4 text-gray-300">
                                                        {new Date(resultado.fecha).toLocaleDateString('es-ES', {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="font-bold text-2xl text-yellow-400 font-mono tracking-wider">
                                                            {resultado.numero_ganador.toString().padStart(8, '0')}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-gray-300">
                                                        {formatearGanadores(resultado.ganadores)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
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
            `}</style>
        </div>
    );
}