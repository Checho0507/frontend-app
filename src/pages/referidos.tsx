import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';
import Footer from '../components/footer';
import { API_URL } from '../api/auth';

interface SubReferido {
    username: string;
    verificado: boolean;
}

interface Referido {
    username: string;
    verificado: boolean;
    referidos: SubReferido[];
}

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    nivel?: string;
    verificado_pendiente?: boolean;
}

interface ReferidosProps {
    usuario: Usuario | null;
    setUsuario: React.Dispatch<React.SetStateAction<Usuario | null>>;
    cerrarSesion: () => void;
}

const Referidos: React.FC<ReferidosProps> = ({ usuario, setUsuario, cerrarSesion }) => {
    const navigate = useNavigate();
    const [referidos, setReferidos] = useState<Referido[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiado, setCopiado] = useState(false);
    const [mensaje, setMensaje] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

    useEffect(() => {
        console.log('Usuario en Referidos:', usuario);
        console.log('Token en localStorage:', localStorage.getItem('token'));

        if (!usuario) {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate('/login');
                return;
            }
            // Si hay token pero usuario es null, intenta cargarlo desde localStorage
            const usuarioGuardado = localStorage.getItem('usuario');
            if (usuarioGuardado) {
                try {
                    const usuarioParsed = JSON.parse(usuarioGuardado);
                    setUsuario(usuarioParsed);
                    console.log('Usuario cargado desde localStorage:', usuarioParsed);
                } catch (error) {
                    console.error('Error al parsear usuario:', error);
                }
            }
        } else {
            // Cargar referidos solo si tenemos usuario
            cargarReferidos();
        }
    }, [navigate, usuario, setUsuario]);

    const cargarReferidos = async () => {
        if (!usuario) return;

        try {
            const token = localStorage.getItem("token");

            const response = await axios.get(
                `${API_URL}/referidos?nocache=${Date.now()}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setReferidos(response.data);

            // También actualizar localStorage para cache
            localStorage.setItem('referidos_cache', JSON.stringify(response.data));

        } catch (error: any) {
            console.error("Error al cargar referidos:", error);

            // Intentar cargar desde cache si falla la conexión
            const cache = localStorage.getItem('referidos_cache');
            if (cache) {
                try {
                    setReferidos(JSON.parse(cache));
                } catch (e) {
                    console.error("Error al parsear cache:", e);
                }
            }

            if (error.response?.status === 401) {
                showMsg("Sesión expirada", "error");
                setTimeout(() => {
                    cerrarSesion();
                    navigate('/login');
                }, 2000);
            }
        } finally {
            setLoading(false);
        }
    };

    const calcularGanancia = (ref: Referido): number => {
        const gananciaDirecta = ref.verificado ? 2000 : 100;
        let gananciaSubreferidos = 0;
        if (Array.isArray(ref.referidos)) {
            for (const sub of ref.referidos) {
                gananciaSubreferidos += sub.verificado ? 2000 : 100;
            }
        }
        const gananciaExtra = gananciaSubreferidos * 0.1;
        return gananciaDirecta + gananciaExtra;
    };

    const calcularGananciaTotal = (): number => {
        return referidos.reduce((total, ref) => total + calcularGanancia(ref), 0);
    };

    const contarVerificados = (): number => {
        return referidos.filter(ref => ref.verificado).length;
    };

    const contarSubreferidos = (): number => {
        return referidos.reduce((total, ref) => {
            return total + (Array.isArray(ref.referidos) ? ref.referidos.length : 0);
        }, 0);
    };

    const copiarCodigo = () => {
        if (usuario && usuario.id !== undefined) {
            navigator.clipboard.writeText(`https://betref.up.railway.app/register?ref=${usuario.id}`);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
            showMsg("¡Código copiado al portapapeles!", "success");
        }
    };

    const compartirWhatsApp = () => {
        if (!usuario) {
            showMsg("Usuario no disponible", "error");
            return;
        }

        const mensaje = `🚀 ¡Únete a BETREF y gana dinero real! 💰\n\n✅ Bono de bienvenida: $10.000\n🎯 Sorteos diarios de $500.000\n⚡ Retiros instantáneos\n\nRegistrate con mi código y ambos ganamos $2.000 extra:\n\nhttps://betref.up.railway.app/register?ref=${usuario.id}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setMensaje({ text, type });
        setTimeout(() => setMensaje(null), 5000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando referidos...</p>
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
                                🚀 PROGRAMA DE REFERIDOS VIP
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400 bg-clip-text text-transparent animate-gradient">
                                Invita Amigos y Gana
                            </span>
                            <br />
                            <span className="text-white">Hasta $2,000 por Cada Uno</span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            El sistema de referidos más generoso de Colombia.
                            <span className="text-yellow-400 font-bold"> Gana $2,000 por amigo verificado </span>
                            y 10% extra por cada sub-referido.
                        </p>

                        {/* Stats Mini */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-12">
                            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                                <div className="text-2xl font-bold text-white">{referidos.length}</div>
                                <div className="text-sm text-gray-400">Total Referidos</div>
                            </div>
                            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                                <div className="text-2xl font-bold text-white">{contarVerificados()}</div>
                                <div className="text-sm text-gray-400">Verificados</div>
                            </div>
                            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                                <div className="text-2xl font-bold text-white">{contarSubreferidos()}</div>
                                <div className="text-sm text-gray-400">Sub-Referidos</div>
                            </div>
                            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                                <div className="text-2xl font-bold text-white">${calcularGananciaTotal().toLocaleString()}</div>
                                <div className="text-sm text-gray-400">Ganancias Totales</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sección de compartir */}
            <section className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30">
                        <h2 className="text-3xl font-bold text-white mb-6 text-center">
                            🚀 Comparte y Gana Dinero
                        </h2>

                        <p className="text-gray-300 text-center mb-8 text-lg">
                            Tu código de referido único. Compártelo y gana <span className="text-yellow-400 font-bold">$2,000</span> por cada amigo que se registre y verifique.
                        </p>

                        <div className="bg-gray-900/50 rounded-2xl p-6 mb-8 border border-gray-700">
                            {/* Enlace de referido */}
                            <div className="mb-6">
                                <label className="block text-gray-400 mb-3 font-medium">
                                    🔗 Tu enlace de referido:
                                </label>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 bg-gray-800 px-4 py-3 rounded-xl border border-gray-700">
                                        <div className="text-gray-300 font-mono text-sm truncate">
                                            https://betref.up.railway.app/register?ref={usuario?.id}
                                        </div>
                                    </div>
                                    <button
                                        onClick={copiarCodigo}
                                        className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${copiado
                                            ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                                            : 'bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700'
                                            }`}
                                    >
                                        {copiado ? '✅ ¡Copiado!' : '📋 Copiar Enlace'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Botones de compartir */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={compartirWhatsApp}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3"
                            >
                                <span className="text-2xl"><svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="35" height="35" viewBox="0 0 48 48">
                                    <path fill="#fff" d="M4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98c-0.001,0,0,0,0,0h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303z"></path><path fill="#fff" d="M4.868,43.803c-0.132,0-0.26-0.052-0.355-0.148c-0.125-0.127-0.174-0.312-0.127-0.483l2.639-9.636c-1.636-2.906-2.499-6.206-2.497-9.556C4.532,13.238,13.273,4.5,24.014,4.5c5.21,0.002,10.105,2.031,13.784,5.713c3.679,3.683,5.704,8.577,5.702,13.781c-0.004,10.741-8.746,19.48-19.486,19.48c-3.189-0.001-6.344-0.788-9.144-2.277l-9.875,2.589C4.953,43.798,4.911,43.803,4.868,43.803z"></path><path fill="#cfd8dc" d="M24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,4C24.014,4,24.014,4,24.014,4C12.998,4,4.032,12.962,4.027,23.979c-0.001,3.367,0.849,6.685,2.461,9.622l-2.585,9.439c-0.094,0.345,0.002,0.713,0.254,0.967c0.19,0.192,0.447,0.297,0.711,0.297c0.085,0,0.17-0.011,0.254-0.033l9.687-2.54c2.828,1.468,5.998,2.243,9.197,2.244c11.024,0,19.99-8.963,19.995-19.98c0.002-5.339-2.075-10.359-5.848-14.135C34.378,6.083,29.357,4.002,24.014,4L24.014,4z"></path><path fill="#40c351" d="M35.176,12.832c-2.98-2.982-6.941-4.625-11.157-4.626c-8.704,0-15.783,7.076-15.787,15.774c-0.001,2.981,0.833,5.883,2.413,8.396l0.376,0.597l-1.595,5.821l5.973-1.566l0.577,0.342c2.422,1.438,5.2,2.198,8.032,2.199h0.006c8.698,0,15.777-7.077,15.78-15.776C39.795,19.778,38.156,15.814,35.176,12.832z"></path><path fill="#fff" fillRule="evenodd" d="M19.268,16.045c-0.355-0.79-0.729-0.806-1.068-0.82c-0.277-0.012-0.593-0.011-0.909-0.011c-0.316,0-0.83,0.119-1.265,0.594c-0.435,0.475-1.661,1.622-1.661,3.956c0,2.334,1.7,4.59,1.937,4.906c0.237,0.316,3.282,5.259,8.104,7.161c4.007,1.58,4.823,1.266,5.693,1.187c0.87-0.079,2.807-1.147,3.202-2.255c0.395-1.108,0.395-2.057,0.277-2.255c-0.119-0.198-0.435-0.316-0.909-0.554s-2.807-1.385-3.242-1.543c-0.435-0.158-0.751-0.237-1.068,0.238c-0.316,0.474-1.225,1.543-1.502,1.859c-0.277,0.317-0.554,0.357-1.028,0.119c-0.474-0.238-2.002-0.738-3.815-2.354c-1.41-1.257-2.362-2.81-2.639-3.285c-0.277-0.474-0.03-0.731,0.208-0.968c0.213-0.213,0.474-0.554,0.712-0.831c0.237-0.277,0.316-0.475,0.474-0.791c0.158-0.317,0.079-0.594-0.04-0.831C20.612,19.329,19.69,16.983,19.268,16.045z" clipRule="evenodd"></path>
                                </svg></span>
                                <span>Compartir en WhatsApp</span>
                            </button>

                            <button
                                onClick={() => {
                                    const texto = `🚀 ¡Únete a BETREF y gana dinero real! Usa mi código: ${usuario?.id} y ambos ganamos $2,000. Link: https://betref.up.railway.app/register?ref=${usuario?.id}`;
                                    navigator.clipboard.writeText(texto);
                                    showMsg("¡Mensaje copiado! Pégalo en cualquier red social.", "success");
                                }}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3"
                            >
                                <span className="text-2xl">🌐</span>
                                <span>Copiar para Redes</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Lista de referidos */}
            <section className="container mx-auto px-4 py-16">
                <h2 className="text-3xl font-bold text-white mb-8 text-center">
                    📋 Tus Referidos Directos
                </h2>

                {referidos.length === 0 ? (
                    <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-12 text-center border border-gray-700">
                        <div className="text-6xl mb-6">👥</div>
                        <h3 className="text-2xl font-bold text-white mb-4">¡Comienza a Invitar Amigos!</h3>
                        <p className="text-gray-300 text-lg mb-8">
                            Aún no tienes referidos. Comparte tu código y comienza a ganar dinero por cada amigo que invites.
                        </p>
                        <button
                            onClick={compartirWhatsApp}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3 mx-auto"
                        >
                            <span className="text-2xl"><svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="35" height="35" viewBox="0 0 48 48">
                                <path fill="#fff" d="M4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98c-0.001,0,0,0,0,0h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303z"></path><path fill="#fff" d="M4.868,43.803c-0.132,0-0.26-0.052-0.355-0.148c-0.125-0.127-0.174-0.312-0.127-0.483l2.639-9.636c-1.636-2.906-2.499-6.206-2.497-9.556C4.532,13.238,13.273,4.5,24.014,4.5c5.21,0.002,10.105,2.031,13.784,5.713c3.679,3.683,5.704,8.577,5.702,13.781c-0.004,10.741-8.746,19.48-19.486,19.48c-3.189-0.001-6.344-0.788-9.144-2.277l-9.875,2.589C4.953,43.798,4.911,43.803,4.868,43.803z"></path><path fill="#cfd8dc" d="M24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,4C24.014,4,24.014,4,24.014,4C12.998,4,4.032,12.962,4.027,23.979c-0.001,3.367,0.849,6.685,2.461,9.622l-2.585,9.439c-0.094,0.345,0.002,0.713,0.254,0.967c0.19,0.192,0.447,0.297,0.711,0.297c0.085,0,0.17-0.011,0.254-0.033l9.687-2.54c2.828,1.468,5.998,2.243,9.197,2.244c11.024,0,19.99-8.963,19.995-19.98c0.002-5.339-2.075-10.359-5.848-14.135C34.378,6.083,29.357,4.002,24.014,4L24.014,4z"></path><path fill="#40c351" d="M35.176,12.832c-2.98-2.982-6.941-4.625-11.157-4.626c-8.704,0-15.783,7.076-15.787,15.774c-0.001,2.981,0.833,5.883,2.413,8.396l0.376,0.597l-1.595,5.821l5.973-1.566l0.577,0.342c2.422,1.438,5.2,2.198,8.032,2.199h0.006c8.698,0,15.777-7.077,15.78-15.776C39.795,19.778,38.156,15.814,35.176,12.832z"></path><path fill="#fff" fillRule="evenodd" d="M19.268,16.045c-0.355-0.79-0.729-0.806-1.068-0.82c-0.277-0.012-0.593-0.011-0.909-0.011c-0.316,0-0.83,0.119-1.265,0.594c-0.435,0.475-1.661,1.622-1.661,3.956c0,2.334,1.7,4.59,1.937,4.906c0.237,0.316,3.282,5.259,8.104,7.161c4.007,1.58,4.823,1.266,5.693,1.187c0.87-0.079,2.807-1.147,3.202-2.255c0.395-1.108,0.395-2.057,0.277-2.255c-0.119-0.198-0.435-0.316-0.909-0.554s-2.807-1.385-3.242-1.543c-0.435-0.158-0.751-0.237-1.068,0.238c-0.316,0.474-1.225,1.543-1.502,1.859c-0.277,0.317-0.554,0.357-1.028,0.119c-0.474-0.238-2.002-0.738-3.815-2.354c-1.41-1.257-2.362-2.81-2.639-3.285c-0.277-0.474-0.03-0.731,0.208-0.968c0.213-0.213,0.474-0.554,0.712-0.831c0.237-0.277,0.316-0.475,0.474-0.791c0.158-0.317,0.079-0.594-0.04-0.831C20.612,19.329,19.69,16.983,19.268,16.045z" clipRule="evenodd"></path>
                            </svg></span>
                            <span>Compartir en WhatsApp</span>
                        </button>
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
                        {/* Header de la tabla */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
                            <div className="font-bold text-gray-300">👤 Usuario</div>
                            <div className="font-bold text-gray-300 text-center">💵 Ganancia</div>
                            <div className="font-bold text-gray-300 text-center">✅ Estado</div>
                            <div className="font-bold text-gray-300 text-center">🔗 Sub-Referidos</div>
                        </div>

                        {/* Filas de referidos */}
                        {referidos.map((ref, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-green-500/20 rounded-full flex items-center justify-center">
                                        <span className="text-lg">👤</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{ref.username}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center">
                                    <div className="text-2xl font-bold text-yellow-400">
                                        ${calcularGanancia(ref).toLocaleString()}
                                    </div>
                                </div>

                                <div className="flex items-center justify-center">
                                    {ref.verificado ? (
                                        <span className="px-4 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/50 text-green-400 rounded-full font-bold">
                                            ✔️ Verificado
                                        </span>
                                    ) : (
                                        <span className="px-4 py-2 bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/50 text-red-400 rounded-full font-bold">
                                            ⏳ Pendiente
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-center">
                                    <div className="text-2xl font-bold text-white">
                                        {Array.isArray(ref.referidos) ? ref.referidos.length : 0}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Información de comisiones */}
            <section className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-sm border-y border-gray-700/50">
                <div className="container mx-auto px-4 py-16">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">🌟 Maximiza Tus Ganancias</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            No solo ganas por tus referidos directos. También obtienes comisiones por los referidos de tus referidos.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-green-500/30 transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6 mx-auto">
                                <span className="text-2xl">💰</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4 text-center">Ganancia Directa</h3>
                            <p className="text-gray-300 text-center">
                                <span className="text-2xl font-bold text-yellow-400">$2,000</span><br />
                                por cada referido verificado
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 mx-auto">
                                <span className="text-2xl">🔗</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4 text-center">Bonificación Extra</h3>
                            <p className="text-gray-300 text-center">
                                <span className="text-2xl font-bold text-yellow-400">10%</span><br />
                                de las ganancias de tus sub-referidos
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center mb-6 mx-auto">
                                <span className="text-2xl">🚀</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4 text-center">Sin Límites</h3>
                            <p className="text-gray-300 text-center">
                                Invita a <span className="text-yellow-400 font-bold">todos</span> tus amigos<br />
                                y construye tu red de ingresos
                            </p>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="mt-16 bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-2xl p-8 text-center">
                        <h3 className="text-2xl font-bold text-white mb-4">¿Listo Para Empezar a Ganar?</h3>
                        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                            Comparte tu código ahora y comienza a construir tu red de ingresos pasivos.
                            <span className="text-yellow-400 font-bold"> ¡Los primeros 10 referidos te dan un bono extra de $5,000!</span>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={compartirWhatsApp}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3 mx-auto"
                            >
                                <span className="text-2xl"><svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="35" height="35" viewBox="0 0 48 48">
                                    <path fill="#fff" d="M4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98c-0.001,0,0,0,0,0h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303z"></path><path fill="#fff" d="M4.868,43.803c-0.132,0-0.26-0.052-0.355-0.148c-0.125-0.127-0.174-0.312-0.127-0.483l2.639-9.636c-1.636-2.906-2.499-6.206-2.497-9.556C4.532,13.238,13.273,4.5,24.014,4.5c5.21,0.002,10.105,2.031,13.784,5.713c3.679,3.683,5.704,8.577,5.702,13.781c-0.004,10.741-8.746,19.48-19.486,19.48c-3.189-0.001-6.344-0.788-9.144-2.277l-9.875,2.589C4.953,43.798,4.911,43.803,4.868,43.803z"></path><path fill="#cfd8dc" d="M24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,4C24.014,4,24.014,4,24.014,4C12.998,4,4.032,12.962,4.027,23.979c-0.001,3.367,0.849,6.685,2.461,9.622l-2.585,9.439c-0.094,0.345,0.002,0.713,0.254,0.967c0.19,0.192,0.447,0.297,0.711,0.297c0.085,0,0.17-0.011,0.254-0.033l9.687-2.54c2.828,1.468,5.998,2.243,9.197,2.244c11.024,0,19.99-8.963,19.995-19.98c0.002-5.339-2.075-10.359-5.848-14.135C34.378,6.083,29.357,4.002,24.014,4L24.014,4z"></path><path fill="#40c351" d="M35.176,12.832c-2.98-2.982-6.941-4.625-11.157-4.626c-8.704,0-15.783,7.076-15.787,15.774c-0.001,2.981,0.833,5.883,2.413,8.396l0.376,0.597l-1.595,5.821l5.973-1.566l0.577,0.342c2.422,1.438,5.2,2.198,8.032,2.199h0.006c8.698,0,15.777-7.077,15.78-15.776C39.795,19.778,38.156,15.814,35.176,12.832z"></path><path fill="#fff" fillRule="evenodd" d="M19.268,16.045c-0.355-0.79-0.729-0.806-1.068-0.82c-0.277-0.012-0.593-0.011-0.909-0.011c-0.316,0-0.83,0.119-1.265,0.594c-0.435,0.475-1.661,1.622-1.661,3.956c0,2.334,1.7,4.59,1.937,4.906c0.237,0.316,3.282,5.259,8.104,7.161c4.007,1.58,4.823,1.266,5.693,1.187c0.87-0.079,2.807-1.147,3.202-2.255c0.395-1.108,0.395-2.057,0.277-2.255c-0.119-0.198-0.435-0.316-0.909-0.554s-2.807-1.385-3.242-1.543c-0.435-0.158-0.751-0.237-1.068,0.238c-0.316,0.474-1.225,1.543-1.502,1.859c-0.277,0.317-0.554,0.357-1.028,0.119c-0.474-0.238-2.002-0.738-3.815-2.354c-1.41-1.257-2.362-2.81-2.639-3.285c-0.277-0.474-0.03-0.731,0.208-0.968c0.213-0.213,0.474-0.554,0.712-0.831c0.237-0.277,0.316-0.475,0.474-0.791c0.158-0.317,0.079-0.594-0.04-0.831C20.612,19.329,19.69,16.983,19.268,16.045z" clipRule="evenodd"></path>
                                </svg></span>
                                <span>Compartir Ahora</span>
                            </button>
                            <button
                                onClick={() => navigate('/inicio')}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 mx-auto"
                            >
                                🏠 Volver al Inicio
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer Component */}
            <Footer />
        </div>
    );
};

export default Referidos;
