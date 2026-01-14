import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/header';
import Footer from '../components/footer';
import { API_URL } from '../api/auth';

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    nivel?: string;
    verificado_pendiente?: boolean;
}

interface EstadisticasInversion {
    total_invertido_global: number;
    intereses_generados: number;
    usuarios_invirtiendo: number;
    rendimiento_promedio: number;
}

const Inicio: React.FC = () => {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
    const [estadisticas, setEstadisticas] = useState<EstadisticasInversion>({
        total_invertido_global: 1250000000,
        intereses_generados: 375000000,
        usuarios_invirtiendo: 8472,
        rendimiento_promedio: 312
    });
    const [inversionesRecientes, setInversionesRecientes] = useState([
        { usuario: "Carlos M.", monto: 1000000, ganancia: 82000, tiempo: "hace 5 minutos" },
        { usuario: "Ana R.", monto: 500000, ganancia: 41000, tiempo: "hace 12 minutos" },
        { usuario: "Miguel S.", monto: 2500000, ganancia: 205000, tiempo: "hace 25 minutos" },
        { usuario: "Laura P.", monto: 750000, ganancia: 61500, tiempo: "hace 38 minutos" }
    ]);

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setMensaje({ text, type });
        setTimeout(() => setMensaje(null), 5000);
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
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
                    setLoading(false);
                })
                .catch(() => {
                    setUsuario(null);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }

        // Actualizar inversiones recientes cada 10 segundos (simulado)
        const intervalo = setInterval(() => {
            setInversionesRecientes(prev => {
                const nuevas = [...prev];
                const nuevaInversion = {
                    usuario: ["Juan C.", "Sofía M.", "Andrés L.", "María G."][Math.floor(Math.random() * 4)],
                    monto: [100000, 500000, 1000000, 2000000][Math.floor(Math.random() * 4)],
                    ganancia: Math.floor(Math.random() * 100000) + 10000,
                    tiempo: "hace 2 minutos"
                };
                return [nuevaInversion, ...nuevas.slice(0, 3)];
            });
        }, 10000);

        return () => clearInterval(intervalo);
    }, []);

    const cerrarSesion = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setUsuario(null);
        showMsg("Sesión cerrada correctamente", "success");
    };

    const testimoniosInversion = [
        {
            nombre: "Carlos M.",
            mensaje: "¡Increíble! En 3 meses mis $1,000,000 ya generaron $750,000 en intereses.",
            ganancia: "$750,000",
            tiempo: "Inversión activa: 3 meses",
            tipo: "🚀 Inversor Platino"
        },
        {
            nombre: "Ana R.",
            mensaje: "Retiro mis intereses cada mes sin problemas. ¡La mejor inversión que hice!",
            ganancia: "$410,000",
            tiempo: "Inversión activa: 6 meses",
            tipo: "💎 Inversor Diamante"
        },
        {
            nombre: "Miguel S.",
            mensaje: "Ya retiré $2,000,000 en ganancias. ¡300% anual es real!",
            ganancia: "$2,000,000",
            tiempo: "Inversión activa: 1 año",
            tipo: "👑 Inversor VIP"
        }
    ];

    const calcularGananciaDiaria = (monto: number) => {
        return (monto * 300) / (365 * 100);
    };

    const calcularGananciaMensual = (monto: number) => {
        return calcularGananciaDiaria(monto) * 30;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando plataforma...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
            {/* Notificación */}
            {mensaje && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center space-x-3 shadow-2xl animate-slideIn ${
                    mensaje.type === "success"
                        ? "bg-gradient-to-r from-green-900/90 to-green-800/90 border border-green-500/50 text-green-200"
                        : mensaje.type === "error"
                        ? "bg-gradient-to-r from-red-900/90 to-red-800/90 border border-red-500/50 text-red-200"
                        : "bg-gradient-to-r from-blue-900/90 to-blue-800/90 border border-blue-500/50 text-blue-200"
                }`}>
                    <span className="text-xl">
                        {mensaje.type === "success" ? "✅" : mensaje.type === "error" ? "❌" : "ℹ️"}
                    </span>
                    <span>{mensaje.text}</span>
                </div>
            )}

            {/* Header Component */}
            <Header
                usuario={usuario}
                cerrarSesion={cerrarSesion}
                setUsuario={setUsuario}
            />

            {/* Hero Section - ENFOCADO EN INVERSIONES */}
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
                                🚀 INVERSIÓN AL 300% ANUAL
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-teal-400 via-green-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                                MULTIPLICA TU DINERO
                            </span>
                            <br />
                            <span className="text-white">Con la Mejor Tasa del Mercado</span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Tu dinero crece al <span className="text-teal-400 font-bold">300% anual</span> con intereses compuestos en tiempo real.
                            <span className="text-yellow-400 font-bold"> Retira intereses cada 30 días.</span>
                        </p>

                        {/* Calculadora rápida */}
                        <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-teal-500/30 max-w-2xl mx-auto mb-8">
                            <h3 className="text-xl font-bold text-white mb-4">💡 Calcula tu ganancia potencial</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {[50000, 100000, 500000, 1000000].map((monto) => (
                                    <div key={monto} className="text-center p-4 bg-gradient-to-br from-teal-900/20 to-green-900/20 rounded-xl border border-teal-500/20">
                                        <div className="text-lg font-bold text-white">${(monto/1000).toFixed(0)}K</div>
                                        <div className="text-sm text-gray-400 mt-2">Ganancia mensual:</div>
                                        <div className="text-lg font-bold text-green-400">${calcularGananciaMensual(monto).toFixed(0)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                            {!usuario ? (
                                <>
                                    <Link
                                        to="/register"
                                        className="group bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-teal-500/25 flex items-center space-x-3"
                                    >
                                        <span>💰</span>
                                        <span>¡EMPEZAR A INVERTIR!</span>
                                        <span className="group-hover:translate-x-2 transition-transform">→</span>
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 flex items-center space-x-3"
                                    >
                                        <span>🔑</span>
                                        <span>INICIAR SESIÓN</span>
                                        <span className="group-hover:translate-x-2 transition-transform">→</span>
                                    </Link>
                                </>
                            ) : !usuario.verificado && !usuario.verificado_pendiente ? (
                                <Link
                                    to="/verificate"
                                    className="group bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-teal-500/25 flex items-center space-x-3"
                                >
                                    <span>✅</span>
                                    <span>VERIFICAR CUENTA</span>
                                    <span className="group-hover:translate-x-2 transition-transform">→</span>
                                </Link>
                            ) : usuario.verificado_pendiente ? (
                                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 px-8 py-4 rounded-2xl">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-blue-400 font-bold">⏳ Verificación en proceso...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Link
                                        to="/inversion"
                                        className="group bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-teal-500/25 flex items-center space-x-3"
                                    >
                                        <span>💰</span>
                                        <span>INVERTIR AHORA</span>
                                        <span className="group-hover:translate-x-2 transition-transform">→</span>
                                    </Link>
                                    <Link
                                        to="/sorteovip"
                                        className="group bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/25 flex items-center space-x-3"
                                    >
                                        <span>🎰</span>
                                        <span>SORTEO VIP</span>
                                        <span className="group-hover:translate-x-2 transition-transform">→</span>
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Estadísticas en vivo */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                            <div className="bg-gradient-to-br from-green-900/30 to-teal-900/30 backdrop-blur-sm rounded-xl p-4 border border-teal-500/30">
                                <div className="text-2xl font-bold text-white">
                                    ${(estadisticas.total_invertido_global/1000000).toFixed(1)}M
                                </div>
                                <div className="text-sm text-gray-400">💰 Total Invertido</div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
                                <div className="text-2xl font-bold text-white">
                                    ${(estadisticas.intereses_generados/1000000).toFixed(1)}M
                                </div>
                                <div className="text-sm text-gray-400">📈 Intereses Pagados</div>
                            </div>
                            <div className="bg-gradient-to-br from-teal-900/30 to-green-900/30 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
                                <div className="text-2xl font-bold text-white">
                                    {estadisticas.usuarios_invirtiendo.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-400">👥 Inversionistas</div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
                                <div className="text-2xl font-bold text-white">{estadisticas.rendimiento_promedio}%</div>
                                <div className="text-sm text-gray-400">🚀 Rendimiento Promedio</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sección: Por qué invertir con nosotros */}
            <section className="container mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">🎯 ¿Por qué Elegir Nuestra Plataforma?</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">La inversión más segura y rentable del mercado</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gradient-to-br from-teal-900/30 to-green-900/30 backdrop-blur-sm rounded-2xl p-6 border border-teal-500/30 hover:border-teal-400/50 transition-all duration-300 group">
                        <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-green-500 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto">
                            📈
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4 text-center">300% Anual Garantizado</h3>
                        <p className="text-gray-400 text-center">
                            La tasa de interés más alta del mercado. Tu dinero crece exponencialmente cada día.
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 group">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto">
                            🔒
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4 text-center">Capital 100% Seguro</h3>
                        <p className="text-gray-400 text-center">
                            Tu inversión está protegida. Retira tu capital completo después de 6 meses.
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300 group">
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto">
                            💸
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4 text-center">Retiros Instantáneos</h3>
                        <p className="text-gray-400 text-center">
                            Retira tus intereses cada 30 días y disfruta de tus ganancias mensuales.
                        </p>
                    </div>
                </div>
            </section>

            {/* Inversiones en tiempo real */}
            <section className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-sm border-y border-gray-700/50">
                <div className="container mx-auto px-4 py-16">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-teal-500/30">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                <div>
                                    <h2 className="text-3xl font-bold text-white">📊 Inversiones en Tiempo Real</h2>
                                    <p className="text-gray-400">Últimas inversiones realizadas por nuestros usuarios</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-green-400 font-bold">EN VIVO</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {inversionesRecientes.map((inversion, index) => (
                                    <div
                                        key={index}
                                        className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-teal-500/50 transition-all duration-300"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center">
                                                    👤
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{inversion.usuario}</p>
                                                    <p className="text-sm text-gray-400">Inversión: ${inversion.monto.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-green-400">+${inversion.ganancia.toLocaleString()}</p>
                                                <p className="text-sm text-gray-400">{inversion.tiempo}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 text-center">
                                <Link
                                    to="/inversion"
                                    className="inline-block bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105"
                                >
                                    VER TODAS LAS OPCIONES DE INVERSIÓN
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sección: Testimonios de Inversionistas */}
            <section className="container mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">💬 Testimonios de Nuestros Inversionistas</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">Historias reales de personas que multiplicaron su dinero con nosotros</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimoniosInversion.map((testimonio, index) => (
                        <div
                            key={index}
                            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-teal-500/30 transition-all duration-300 group"
                        >
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center text-2xl">
                                    👤
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-white">{testimonio.nombre}</h4>
                                    <span className="px-3 py-1 bg-gradient-to-r from-teal-900/30 to-green-900/30 text-teal-400 rounded-full text-sm font-bold mt-2 inline-block">
                                        {testimonio.tipo}
                                    </span>
                                </div>
                            </div>

                            <p className="text-gray-300 italic mb-6">"{testimonio.mensaje}"</p>

                            <div className="pt-6 border-t border-gray-700/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-400">Ganancias Totales</p>
                                        <p className="text-2xl font-bold text-yellow-400">{testimonio.ganancia}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-400">{testimonio.tiempo}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Sección: Otras Funcionalidades */}
            <section className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">🎮 Más Formas de Ganar</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">Además de nuestras inversiones, disfruta de estas funcionalidades exclusivas</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Juegos */}
                        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto">
                            🎰
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4 text-center">Juegos de Azar</h3>
                            <p className="text-gray-400 text-center mb-6">
                                Diversión con premios reales. Ruleta, Blackjack, Tragamonedas y más.
                            </p>
                            <Link
                                to="/juegos"
                                className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-bold text-center transition-all duration-300 hover:scale-105"
                            >
                                VER JUEGOS
                            </Link>
                        </div>

                        {/* Referidos */}
                        <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto">
                                👥
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4 text-center">Programa de Referidos</h3>
                            <p className="text-gray-400 text-center mb-6">
                                Gana el 10% de las inversiones de tus referidos. Sin límite de ganancias.
                            </p>
                            <Link
                                to="/referidos"
                                className="block w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-3 rounded-xl font-bold text-center transition-all duration-300 hover:scale-105"
                            >
                                INVITAR AMIGOS
                            </Link>
                        </div>

                        {/* Sorteo VIP */}
                        <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto">
                                🏆
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4 text-center">Sorteo VIP</h3>
                            <p className="text-gray-400 text-center mb-6">
                                Participa en sorteos exclusivos con premios de hasta $5,000,000.
                            </p>
                            <Link
                                to="/sorteovip"
                                className="block w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white py-3 rounded-xl font-bold text-center transition-all duration-300 hover:scale-105"
                            >
                                PARTICIPAR
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="container mx-auto px-4 py-16">
                <div className="bg-gradient-to-r from-teal-600/20 to-green-600/20 border border-teal-500/30 rounded-2xl p-8 text-center">
                    <h3 className="text-3xl font-bold text-white mb-4">¿Listo Para Empezar a Invertir?</h3>
                    <p className="text-gray-300 mb-6 max-w-2xl mx-auto text-lg">
                        Únete a {estadisticas.usuarios_invirtiendo.toLocaleString()} inversionistas que ya están multiplicando su dinero al 300% anual.
                        <span className="text-teal-400 font-bold"> ¡Tu primera inversión comienza desde $50,000!</span>
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {!usuario ? (
                            <>
                                <Link
                                    to="/register"
                                    className="bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
                                >
                                    💰 Crear Cuenta Gratis
                                </Link>
                                <Link
                                    to="/login"
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
                                >
                                    🔑 Iniciar Sesión
                                </Link>
                            </>
                        ) : usuario.verificado ? (
                            <Link
                                to="/inversion"
                                className="bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-3 mx-auto"
                            >
                                <span>🚀</span>
                                <span>COMENZAR A INVERTIR</span>
                            </Link>
                        ) : (
                            <Link
                                to="/verificate"
                                className="bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-3 mx-auto"
                            >
                                <span>✅</span>
                                <span>VERIFICAR CUENTA</span>
                            </Link>
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
                
                @keyframes gradient {
                    0%, 100% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                }
                .animate-gradient {
                    background-size: 200% auto;
                    animation: gradient 3s ease infinite;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slideIn {
                    animation: slideIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default Inicio;