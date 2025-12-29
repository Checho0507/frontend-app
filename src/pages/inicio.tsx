import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/header';
import Footer from '../components/footer';

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    nivel?: string;
    verificado_pendiente?: boolean;
}

const Inicio: React.FC = () => {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
    const [stats] = useState({
        usuariosActivos: 12847,
        dineroMovido: 25600000,
        premiosEntregados: 156,
        satisfaccion: 98.7,
        retirosDiarios: 425,
        comisionesPagadas: 1250000
    });

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setMensaje({ text, type });
        setTimeout(() => setMensaje(null), 5000);
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            axios.get("http://localhost:8000/me", {
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
    }, []);

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
    };

    const testimonios = [
        {
            nombre: "Carlos M.",
            mensaje: "Gané $500.000 en mi primer mes. ¡Increíble!",
            ganancia: "$500.000",
            nivel: "PLATINO",
            tiempo: "Miembro desde hace 6 meses"
        },
        {
            nombre: "Ana R.",
            mensaje: "El sistema de referidos me ha dado $200.000 extra",
            ganancia: "$200.000",
            nivel: "ORO",
            tiempo: "Miembro desde hace 3 meses"
        },
        {
            nombre: "Miguel S.",
            mensaje: "Plataforma confiable, ya retiré más de $1.000.000",
            ganancia: "$1.000.000",
            nivel: "DIAMANTE",
            tiempo: "Miembro desde hace 1 año"
        }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando plataforma...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {/* Notificación */}
            {mensaje && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center space-x-3 shadow-2xl animate-slideIn ${mensaje.type === "success"
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

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-green-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-yellow-500 to-green-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-red-500 rounded-full blur-3xl opacity-20"></div>

                <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-full text-sm font-bold text-yellow-400">
                                🚀 PLATAFORMA #1 EN COLOMBIA
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400 bg-clip-text text-transparent animate-gradient">
                                Multiplica Tu Dinero
                            </span>
                            <br />
                            <span className="text-white">Con Apuestas Inteligentes</span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            La plataforma más segura y rentable de Colombia.
                            <span className="text-yellow-400 font-bold"> Gana hasta 500% más </span>
                            con nuestro sistema de referidos y bonos exclusivos.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                            {!usuario ? (
                                <>
                                    <Link
                                        to="/register"
                                        className="group bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/25 flex items-center space-x-3"
                                    >
                                        <span>🎯</span>
                                        <span>¡REGISTRARME GRATIS!</span>
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
                                    className="group bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/25 flex items-center space-x-3"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle cx="12" cy="12" r="12" fill="#22C55E" />
                                        <path
                                            d="M7 12.5L10.5 16L17 9"
                                            stroke="white"
                                            stroke-width="2.5"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>

                                    <span>¡VERIFICAR CUENTA Y GANAR $10.000!</span>
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
                                <Link
                                    to="/sorteovip"
                                    className="group bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/25 flex items-center space-x-3"
                                >
                                    <span>🎰</span>
                                    <span>¡PARTICIPAR EN SORTEO VIP!</span>
                                    <span className="group-hover:translate-x-2 transition-transform">→</span>
                                </Link>
                            )}
                        </div>

                        {/* Stats Mini */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                                <div className="text-2xl font-bold text-white">{stats.usuariosActivos.toLocaleString()}</div>
                                <div className="text-sm text-gray-400">Usuarios Activos</div>
                            </div>
                            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                                <div className="text-2xl font-bold text-white">${(stats.dineroMovido / 1000000).toFixed(1)}M</div>
                                <div className="text-sm text-gray-400">Dinero Movido</div>
                            </div>
                            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                                <div className="text-2xl font-bold text-white">{stats.premiosEntregados}+</div>
                                <div className="text-sm text-gray-400">Premios Entregados</div>
                            </div>
                            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                                <div className="text-2xl font-bold text-white">{stats.satisfaccion}%</div>
                                <div className="text-sm text-gray-400">Satisfacción</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Estadísticas Detalladas */}
            <section className="container mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">🏆 Números Que Hablan Por Nosotros</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">Somos la plataforma de apuestas y referidos con el crecimiento más rápido en Colombia</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                                <span className="text-xl">👥</span>
                            </div>
                            <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm font-bold">+15% Hoy</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{stats.usuariosActivos.toLocaleString()}</h3>
                        <p className="text-gray-400">Usuarios Activos en la Plataforma</p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <span className="text-xl">💰</span>
                            </div>
                            <span className="px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full text-sm font-bold">RÉCORD</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">${(stats.dineroMovido / 1000000).toFixed(1)}M</h3>
                        <p className="text-gray-400">Dinero Movido en la Plataforma</p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                                <span className="text-xl">🎁</span>
                            </div>
                            <span className="px-3 py-1 bg-red-900/30 text-red-400 rounded-full text-sm font-bold">HOY: 12</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{stats.premiosEntregados}+</h3>
                        <p className="text-gray-400">Premios Entregados a Usuarios</p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center">
                                <span className="text-xl">⭐</span>
                            </div>
                            <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-sm font-bold">TOP 1%</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{stats.satisfaccion}%</h3>
                        <p className="text-gray-400">Índice de Satisfacción de Usuarios</p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
                                <span className="text-xl">💸</span>
                            </div>
                            <span className="px-3 py-1 bg-emerald-900/30 text-emerald-400 rounded-full text-sm font-bold">ACTIVO</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{stats.retirosDiarios}+</h3>
                        <p className="text-gray-400">Retiros Diarios Procesados</p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                                <span className="text-xl">🏆</span>
                            </div>
                            <span className="px-3 py-1 bg-purple-900/30 text-purple-400 rounded-full text-sm font-bold">CRECIENDO</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">${(stats.comisionesPagadas / 1000).toFixed(0)}K</h3>
                        <p className="text-gray-400">En Comisiones a Referidos</p>
                    </div>
                </div>
            </section>

            {/* Testimonios */}
            <section className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-sm border-y border-gray-700/50">
                <div className="container mx-auto px-4 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">💬 Lo Que Dicen Nuestros Usuarios</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">Historias reales de usuarios que multiplicaron su dinero con nosotros</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {testimonios.map((t, i) => (
                            <div
                                key={i}
                                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300 group"
                            >
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full flex items-center justify-center text-2xl">
                                        👤
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-white">{t.nombre}</h4>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.nivel === 'DIAMANTE' ? 'bg-gradient-to-r from-blue-300 to-purple-400 text-black' :
                                                    t.nivel === 'PLATINO' ? 'bg-gradient-to-r from-gray-100 to-gray-300 text-black' :
                                                        t.nivel === 'ORO' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black' :
                                                            'bg-gradient-to-r from-gray-300 to-gray-400 text-black'
                                                }`}>
                                                {t.nivel}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-gray-300 italic mb-6">"{t.mensaje}"</p>

                                <div className="pt-6 border-t border-gray-700/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-400">Ganó</p>
                                            <p className="text-2xl font-bold text-yellow-400">{t.ganancia}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">{t.tiempo}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA Section */}
                    <div className="mt-16 bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-2xl p-8 text-center">
                        <h3 className="text-2xl font-bold text-white mb-4">¿Listo Para Empezar a Ganar?</h3>
                        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                            Únete a miles de usuarios que ya están multiplicando su dinero con nuestra plataforma.
                            <span className="text-yellow-400 font-bold"> ¡El primer depósito tiene un bono del 100%!</span>
                        </p>

                        {!usuario ? (
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    to="/register"
                                    className="bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
                                >
                                    🎯 Comenzar Gratis
                                </Link>
                                <Link
                                    to="/login"
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
                                >
                                    🔑 Ya Tengo Cuenta
                                </Link>
                            </div>
                        ) : usuario.verificado ? (
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    to="/referidos"
                                    className="bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
                                >
                                    👥 Invitar Amigos
                                </Link>
                                <Link
                                    to="/juegos"
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105"
                                >
                                    🎮 Jugar Ahora
                                </Link>
                            </div>
                        ) : (
                            <Link
                                to="/verificate"
                                className="bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-3"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <circle cx="12" cy="12" r="12" fill="#22C55E" />
                                    <path
                                        d="M7 12.5L10.5 16L17 9"
                                        stroke="white"
                                        stroke-width="2.5"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                                <span>Verificar Mi Cuenta</span>
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer Component */}
            <Footer />
        </div>
    );
};

export default Inicio;