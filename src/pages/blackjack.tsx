// src/pages/blackjack.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import Header from '../components/header'; // Añadir esta línea
import Footer from '../components/footer'; // Añadir esta línea
import { API_URL } from "../api/auth";

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    nivel?: string;
    verificado_pendiente?: boolean;
}

interface Carta {
    valor: number;
    nombre: string;
    palo: string;
}

interface HistorialPartida {
    id: number;
    resultado: string;
    ganancia: number;
    fecha: string;
    apuesta: number;
    puntajeJugador: number;
    puntajeBanca: number;
}

type EstadoJuego = 'esperando' | 'jugando' | 'turno_banca' | 'terminado';

export default function Blackjack() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [manoJugador, setManoJugador] = useState<Carta[]>([]);
    const [manoBanca, setManoBanca] = useState<Carta[]>([]);
    const [puntajeJugador, setPuntajeJugador] = useState<number>(0);
    const [puntajeBanca, setPuntajeBanca] = useState<number>(0);
    const [mensaje, setMensaje] = useState<string>("");
    const [estado, setEstado] = useState<EstadoJuego>('esperando');
    const [cargando, setCargando] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [ganancia, setGanancia] = useState<number>(0);
    const [mostrarCartaBancaOculta, setMostrarCartaBancaOculta] = useState(false);
    
    // Estados para apuestas variables
    const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(500);
    const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([100, 500, 1000, 2000, 5000]);
    const [apuestaActual, setApuestaActual] = useState<number>(0);

    // Estados para estadísticas e historial
    const [historial, setHistorial] = useState<HistorialPartida[]>([]);
    const [estadisticas, setEstadisticas] = useState({
        totalPartidas: 0,
        gananciaTotal: 0,
        gastoTotal: 0,
        balance: 0,
        partidasGanadas: 0,
        blackjacksObtenidos: 0
    });

    const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({
        totalPartidasAcum: 0,
        gananciaTotalAcum: 0,
        gastoTotalAcum: 0,
        partidasGanadasAcum: 0,
        blackjacksObtenidosAcum: 0
    });

    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

    // Obtener usuario al cargar
    useEffect(() => {
            console.log('Usuario en Referidos:', usuario);
            
    
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
            }
        }, [navigate, usuario, setUsuario]);

    // Cargar configuración del juego
    useEffect(() => {
        const cargarConfiguracion = async () => {
            try {
                const res = await axios.get(`${API_URL}/juegos/blackjack/juegos/blackjack/apuestas-permitidas`);
                setApuestasPermitidas(res.data.apuestas_permitidas);
                setApuestaSeleccionada(res.data.apuestas_permitidas[1] || 500);
            } catch (error) {
                console.error("Error al cargar configuración:", error);
            }
        };
        
        cargarConfiguracion();
    }, []);

    // Cargar historial y estadísticas del localStorage
    useEffect(() => {
        // Cargar historial de últimas 10 partidas
        const historialGuardado = localStorage.getItem('historial_blackjack');
        if (historialGuardado) {
            const historialParsed = JSON.parse(historialGuardado);
            setHistorial(historialParsed);
        }

        // Cargar estadísticas acumulativas
        const statsAcum = localStorage.getItem("estadisticas_acumulativas_blackjack");
        if (statsAcum) {
            const parsedStats = JSON.parse(statsAcum);
            setEstadisticasAcumulativas(parsedStats);
            
            // Calcular estadísticas iniciales basadas en las acumulativas
            const balance = parsedStats.gananciaTotalAcum - parsedStats.gastoTotalAcum;
            setEstadisticas({
                totalPartidas: parsedStats.totalPartidasAcum,
                gananciaTotal: parsedStats.gananciaTotalAcum,
                gastoTotal: parsedStats.gastoTotalAcum,
                balance: balance,
                partidasGanadas: parsedStats.partidasGanadasAcum,
                blackjacksObtenidos: parsedStats.blackjacksObtenidosAcum
            });
        }
    }, []);

    // Guardar historial en localStorage
    useEffect(() => {
        if (historial.length > 0) {
            localStorage.setItem('historial_blackjack', JSON.stringify(historial.slice(0, 10)));
        }
    }, [historial]);

    // Guardar estadísticas acumulativas en localStorage
    useEffect(() => {
        if (estadisticasAcumulativas.totalPartidasAcum > 0) {
            localStorage.setItem("estadisticas_acumulativas_blackjack", JSON.stringify(estadisticasAcumulativas));
        }
    }, [estadisticasAcumulativas]);

    const actualizarEstadisticas = (nuevaPartida: HistorialPartida) => {
        const esVictoria = nuevaPartida.resultado.includes("Ganaste") || nuevaPartida.resultado.includes("Blackjack");
        const esBlackjack = nuevaPartida.resultado.includes("Blackjack");
        
        // Actualizar estadísticas acumulativas
        setEstadisticasAcumulativas(prev => {
            const nuevasPartidasGanadas = prev.partidasGanadasAcum + (esVictoria ? 1 : 0);
            const nuevosBlackjacks = prev.blackjacksObtenidosAcum + (esBlackjack ? 1 : 0);
            
            return {
                totalPartidasAcum: prev.totalPartidasAcum + 1,
                gananciaTotalAcum: prev.gananciaTotalAcum + (nuevaPartida.ganancia || 0),
                gastoTotalAcum: prev.gastoTotalAcum + nuevaPartida.apuesta,
                partidasGanadasAcum: nuevasPartidasGanadas,
                blackjacksObtenidosAcum: nuevosBlackjacks
            };
        });
        
        // Actualizar estadísticas visibles
        setEstadisticas(prev => {
            const nuevasPartidasGanadas = prev.partidasGanadas + (esVictoria ? 1 : 0);
            const nuevosBlackjacks = prev.blackjacksObtenidos + (esBlackjack ? 1 : 0);
            const nuevaGananciaTotal = prev.gananciaTotal + (nuevaPartida.ganancia || 0);
            const nuevoGastoTotal = prev.gastoTotal + nuevaPartida.apuesta;
            const nuevoBalance = nuevaGananciaTotal - nuevoGastoTotal;
            
            return {
                totalPartidas: prev.totalPartidas + 1,
                gananciaTotal: nuevaGananciaTotal,
                gastoTotal: nuevoGastoTotal,
                balance: nuevoBalance,
                partidasGanadas: nuevasPartidasGanadas,
                blackjacksObtenidos: nuevosBlackjacks
            };
        });
    };

    const agregarAlHistorial = (resultado: string, ganancia: number, apuesta: number, puntajeJugador: number, puntajeBanca: number) => {
        const nuevaPartida: HistorialPartida = {
            id: Date.now(),
            resultado,
            ganancia,
            apuesta,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            puntajeJugador,
            puntajeBanca
        };
        
        // Agregar al historial (máximo 10 registros)
        const nuevoHistorial = [nuevaPartida, ...historial.slice(0, 9)];
        setHistorial(nuevoHistorial);
        
        // Actualizar estadísticas
        actualizarEstadisticas(nuevaPartida);
    };

    const animarConfetti = (tipo: "victoria" | "blackjack") => {
        if (tipo === "victoria") {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        } else if (tipo === "blackjack") {
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 }
            });
            confetti({
                particleCount: 100,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
            confetti({
                particleCount: 100,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });
        }
    };

    const iniciarJuego = async () => {
        if (!usuario) {
            setMensaje("Debes iniciar sesión para jugar.");
            return;
        }

        if (usuario.saldo < apuestaSeleccionada) {
            setMensaje(`Saldo insuficiente. Necesitas $${apuestaSeleccionada} para jugar.`);
            return;
        }

        setCargando(true);
        setMensaje("");
        setManoJugador([]);
        setManoBanca([]);
        setPuntajeJugador(0);
        setPuntajeBanca(0);
        setGanancia(0);
        setMostrarCartaBancaOculta(false);
        setApuestaActual(apuestaSeleccionada);

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/blackjack/juegos/blackjack/iniciar?apuesta=${apuestaSeleccionada}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setManoJugador(res.data.mano_jugador);
            setManoBanca(res.data.mano_banca);
            setPuntajeJugador(res.data.puntaje_jugador);
            setPuntajeBanca(res.data.puntaje_banca_visible);
            setSessionId(res.data.session_id);
            setEstado('jugando');

            // Actualizar saldo usuario
            setUsuario((prev) =>
                prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev
            );

            // Verificar si el jugador tiene blackjack automático
            if (res.data.jugador_blackjack) {
                await finalizarJuego();
            }
        } catch (error: any) {
            setMensaje(
                error.response?.data?.detail || "Error al iniciar el juego."
            );
            setEstado('esperando');
        } finally {
            setCargando(false);
        }
    };

    const pedirCarta = async () => {
        if (!sessionId || estado !== 'jugando') return;

        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/blackjack/juegos/blackjack/${sessionId}/pedir-carta`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setManoJugador(res.data.mano_jugador);
            setPuntajeJugador(res.data.puntaje_jugador);

            if (res.data.jugador_se_paso) {
                setEstado('terminado');
                setMensaje(res.data.resultado);
                setGanancia(res.data.ganancia);
                setMostrarCartaBancaOculta(true);
                setPuntajeBanca(res.data.puntaje_banca_final);
                setManoBanca(res.data.mano_banca_final);

                // Actualizar saldo
                setUsuario((prev) =>
                    prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev
                );

                // Agregar al historial
                agregarAlHistorial(
                    res.data.resultado,
                    res.data.ganancia,
                    apuestaActual,
                    res.data.puntaje_jugador,
                    res.data.puntaje_banca_final
                );
            }
        } catch (error: any) {
            setMensaje(
                error.response?.data?.detail || "Error al pedir carta."
            );
        } finally {
            setCargando(false);
        }
    };

    const plantarse = async () => {
        if (!sessionId || estado !== 'jugando') return;
        await finalizarJuego();
    };

    const finalizarJuego = async () => {
        if (!sessionId) return;

        setCargando(true);
        setEstado('turno_banca');
        setMostrarCartaBancaOculta(true);

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/blackjack/juegos/blackjack/${sessionId}/plantarse`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            // Mostrar cartas iniciales de la banca
            setManoBanca(res.data.mano_banca_inicial);
            setPuntajeBanca(res.data.puntaje_banca_inicial);

            // Esperar antes de mostrar el resultado final
            setTimeout(() => {
                setManoBanca(res.data.mano_banca_final);
                setPuntajeBanca(res.data.puntaje_banca_final);
                setMensaje(res.data.resultado);
                setGanancia(res.data.ganancia);
                setEstado('terminado');

                // Actualizar saldo
                setUsuario((prev) =>
                    prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev
                );

                // Animación de confetti para victorias
                if (res.data.resultado.includes("Blackjack")) {
                    animarConfetti("blackjack");
                } else if (res.data.resultado.includes("Ganaste")) {
                    animarConfetti("victoria");
                }

                // Agregar al historial
                agregarAlHistorial(
                    res.data.resultado,
                    res.data.ganancia,
                    apuestaActual,
                    res.data.puntaje_jugador,
                    res.data.puntaje_banca_final
                );
            }, 1500);

        } catch (error: any) {
            setMensaje(
                error.response?.data?.detail || "Error al finalizar el juego."
            );
            setEstado('esperando');
        } finally {
            setCargando(false);
        }
    };

    const reiniciarJuego = () => {
        setEstado('esperando');
        setSessionId(null);
        setManoJugador([]);
        setManoBanca([]);
        setPuntajeJugador(0);
        setPuntajeBanca(0);
        setMensaje("");
        setGanancia(0);
        setMostrarCartaBancaOculta(false);
        setApuestaActual(0);
    };

    const renderCarta = (carta: Carta, oculta: boolean = false) => {
        if (oculta) {
            return (
                <div className="w-16 h-24 bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg flex items-center justify-center border-2 border-blue-600 shadow-lg">
                    <span className="text-white text-2xl">?</span>
                </div>
            );
        }

        const color = carta.palo === "♠️" || carta.palo === "♣️" ? "text-gray-900" : "text-red-600";

        return (
            <div className={`w-16 h-24 bg-gradient-to-br from-white to-gray-50 rounded-lg flex flex-col items-center justify-center border-2 border-gray-300 shadow-lg ${color}`}>
                <div className="text-sm font-bold">{carta.nombre}</div>
                <div className="text-2xl">{carta.palo}</div>
            </div>
        );
    };

    const limpiarHistorial = () => {
        setHistorial([]);
        localStorage.removeItem('historial_blackjack');
        // No limpiamos las estadísticas acumulativas
        // Solo reseteamos las estadísticas visibles a las acumulativas
        setEstadisticas({
            totalPartidas: estadisticasAcumulativas.totalPartidasAcum,
            gananciaTotal: estadisticasAcumulativas.gananciaTotalAcum,
            gastoTotal: estadisticasAcumulativas.gastoTotalAcum,
            balance: estadisticasAcumulativas.gananciaTotalAcum - estadisticasAcumulativas.gastoTotalAcum,
            partidasGanadas: estadisticasAcumulativas.partidasGanadasAcum,
            blackjacksObtenidos: estadisticasAcumulativas.blackjacksObtenidosAcum
        });
    };

    const limpiarTodasEstadisticas = () => {
        setHistorial([]);
        setEstadisticas({
            totalPartidas: 0,
            gananciaTotal: 0,
            gastoTotal: 0,
            balance: 0,
            partidasGanadas: 0,
            blackjacksObtenidos: 0
        });
        setEstadisticasAcumulativas({
            totalPartidasAcum: 0,
            gananciaTotalAcum: 0,
            gastoTotalAcum: 0,
            partidasGanadasAcum: 0,
            blackjacksObtenidosAcum: 0
        });
        localStorage.removeItem('historial_blackjack');
        localStorage.removeItem("estadisticas_acumulativas_blackjack");
        showMsg("Estadísticas reiniciadas completamente", "info");
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const cerrarSesion = () => {
        // Limpiar localStorage
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
        localStorage.removeItem("historial_blackjack");
        localStorage.removeItem("estadisticas_acumulativas_blackjack");
        
        setUsuario(null);
        showMsg("Sesión cerrada correctamente", "success");
        setTimeout(() => navigate('/login'), 1500);
    };

    if (!usuario) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando blackjack...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
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

            {/* Header - Usando el componente */}
            <Header 
                usuario={usuario}
                cerrarSesion={cerrarSesion}
                setUsuario={setUsuario}
            />

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-3xl opacity-20"></div>
                
                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-full text-sm font-bold text-green-400">
                                ♠️ BLACKJACK VIP ♣️
                            </span>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-clip-text text-transparent">
                                ¡Blackjack!
                            </span>
                            <br />
                            <span className="text-white">Gana 2.5x con Blackjack</span>
                        </h1>
                        
                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Apuesta desde <span className="text-green-400 font-bold">${apuestasPermitidas[0]}</span> hasta <span className="text-green-400 font-bold">${apuestasPermitidas[apuestasPermitidas.length - 1]}</span>.
                            <span className="text-yellow-400 font-bold"> ¡Blackjack paga 2.5x tu apuesta!</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* Contenido Principal */}
            <section className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Área de juego */}
                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            {/* Selector de apuesta */}
                            {estado === 'esperando' && (
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-white mb-4 text-center">💰 Selecciona tu apuesta</h3>
                                    <div className="flex gap-3 justify-center flex-wrap mb-4">
                                        {apuestasPermitidas.map((apuesta) => (
                                            <button
                                                key={apuesta}
                                                onClick={() => setApuestaSeleccionada(apuesta)}
                                                disabled={usuario.saldo < apuesta}
                                                className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 ${
                                                    apuestaSeleccionada === apuesta
                                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
                                                        : usuario.saldo < apuesta
                                                        ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700'
                                                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white border border-gray-700'
                                                }`}
                                            >
                                                ${apuesta.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-center text-gray-400">
                                        Apuesta seleccionada: <span className="text-green-400 font-bold">${apuestaSeleccionada.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {/* Cartas */}
                            <div className="mb-8">
                                {/* Banca */}
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-white mb-4 text-center">
                                        🎩 Banca: <span className={mostrarCartaBancaOculta ? "text-red-400" : "text-gray-400"}>
                                            {mostrarCartaBancaOculta ? puntajeBanca : "?"}
                                        </span>
                                    </h3>
                                    <div className="flex gap-4 justify-center flex-wrap">
                                        {manoBanca.map((carta, i) => (
                                            <div key={i}>
                                                {renderCarta(
                                                    carta,
                                                    !mostrarCartaBancaOculta && i === 1 && estado !== 'terminado'
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Separador */}
                                <div className="flex items-center justify-center my-6">
                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                                    <div className="px-4 text-gray-500">VS</div>
                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                                </div>

                                {/* Jugador */}
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4 text-center">
                                        🎯 Jugador: <span className={
                                            puntajeJugador === 21 ? "text-yellow-400" :
                                            puntajeJugador > 21 ? "text-red-400" :
                                            "text-green-400"
                                        }>
                                            {puntajeJugador}
                                        </span>
                                    </h3>
                                    <div className="flex gap-4 justify-center flex-wrap">
                                        {manoJugador.map((carta, i) => (
                                            <div key={i}>
                                                {renderCarta(carta)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Controles */}
                            <div className="text-center">
                                <div className="mb-4">
                                    <div className="text-2xl font-bold text-white mb-2">
                                        Saldo: <span className="text-yellow-400">${usuario?.saldo?.toLocaleString() ?? 0}</span>
                                    </div>
                                    {estado === 'jugando' && apuestaActual > 0 && (
                                        <div className="text-lg text-green-400 font-bold">
                                            Apostado: ${apuestaActual.toLocaleString()}
                                        </div>
                                    )}
                                    {mensaje && (
                                        <div className={`px-4 py-3 rounded-xl font-bold mb-4 ${
                                            mensaje.includes("Error") || mensaje.includes("insuficiente")
                                                ? "bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200" 
                                                : mensaje.includes("Ganaste") || mensaje.includes("Blackjack")
                                                ? "bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50 text-green-200"
                                                : mensaje.includes("Empate")
                                                ? "bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 border border-yellow-500/50 text-yellow-200"
                                                : "bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-gray-500/50 text-gray-200"
                                        }`}>
                                            {mensaje}
                                            {ganancia > 0 && ganancia !== apuestaActual && (
                                                <div className="text-lg text-green-400 mt-2">
                                                    💰 Ganancia: +${ganancia.toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {estado === 'esperando' && (
                                    <button
                                        onClick={iniciarJuego}
                                        disabled={cargando || !usuario || (usuario && usuario.saldo < apuestaSeleccionada)}
                                        className={`w-full max-w-xs py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${
                                            cargando 
                                                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 hover:scale-105 active:scale-95'
                                        } ${(!usuario || (usuario && usuario.saldo < apuestaSeleccionada)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {cargando ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Iniciando...
                                            </span>
                                        ) : (
                                            `♠️ Nuevo Juego ($${apuestaSeleccionada.toLocaleString()})`
                                        )}
                                    </button>
                                )}

                                <div className="flex gap-4 justify-center">
                                    {estado === 'jugando' && (
                                        <>
                                            {puntajeJugador < 21 && (
                                                <button
                                                    onClick={pedirCarta}
                                                    disabled={cargando}
                                                    className={`py-3 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                                                        cargando 
                                                            ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 hover:scale-105 active:scale-95'
                                                    }`}
                                                >
                                                    {cargando ? "..." : "🃏 Pedir Carta"}
                                                </button>
                                            )}

                                            <button
                                                onClick={plantarse}
                                                disabled={cargando}
                                                className={`py-3 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                                                    cargando 
                                                        ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 hover:scale-105 active:scale-95'
                                                }`}
                                            >
                                                {cargando ? "..." : "✋ Plantarse"}
                                            </button>
                                        </>
                                    )}
                                </div>

                                {estado === 'turno_banca' && (
                                    <div className="py-4 px-6 bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 border border-yellow-500/30 rounded-xl">
                                        <div className="text-xl font-bold text-yellow-400">🎲 La banca está jugando...</div>
                                        <div className="text-sm text-yellow-300 mt-2">La banca debe pedir cartas hasta llegar a 17</div>
                                    </div>
                                )}

                                {estado === 'terminado' && (
                                    <button
                                        onClick={reiniciarJuego}
                                        className="w-full max-w-xs py-4 px-8 rounded-xl font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 hover:scale-105 active:scale-95 transition-all duration-300"
                                    >
                                        🃏 Jugar de Nuevo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Panel Lateral */}
                    <div className="space-y-6">
                        {/* Estadísticas */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">📊 Tus Estadísticas</h3>
                                <button
                                    onClick={limpiarTodasEstadisticas}
                                    className="px-3 py-1 text-sm bg-red-900/30 text-red-300 hover:bg-red-800/40 rounded-lg transition-colors"
                                    title="Reiniciar todas las estadísticas"
                                >
                                    Reiniciar
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Total Partidas</div>
                                    <div className="text-2xl font-bold text-blue-400">{estadisticas.totalPartidas}</div>
                                    <div className="text-xs text-gray-500 mt-1">Acumulativo</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Partidas Ganadas</div>
                                    <div className="text-2xl font-bold text-green-400">{estadisticas.partidasGanadas}</div>
                                    <div className="text-xs text-gray-500 mt-1">Victorias</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Blackjacks</div>
                                    <div className="text-2xl font-bold text-yellow-400">{estadisticas.blackjacksObtenidos}</div>
                                    <div className="text-xs text-gray-500 mt-1">21 natural</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Balance</div>
                                    <div className={`text-2xl font-bold ${estadisticas.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${estadisticas.balance}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {estadisticas.balance >= 0 ? 'Ganancia neta' : 'Pérdida neta'}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-700/30">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-sm text-gray-400">Gasto Total</div>
                                        <div className="text-xl font-bold text-red-400">${estadisticas.gastoTotal}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-gray-400">Ratio Victorias</div>
                                        <div className="text-xl font-bold text-blue-400">
                                            {estadisticas.totalPartidas > 0 
                                                ? `${((estadisticas.partidasGanadas / estadisticas.totalPartidas) * 100).toFixed(1)}%` 
                                                : '0%'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Reglas del juego */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📖 Reglas del Blackjack</h3>
                            <div className="space-y-3 text-gray-300">
                                <div className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span><strong>Objetivo:</strong> Llegar a 21 puntos o lo más cerca posible sin pasarse</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span><strong>Valores:</strong> A=1/11, J/Q/K=10, resto=valor nominal</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span><strong>Blackjack:</strong> 21 con las dos primeras cartas (paga 2.5x)</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span><strong>Banca:</strong> Debe pedir carta hasta llegar a 17 o más</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span><strong>Ganar:</strong> Mayor puntaje que la banca sin pasarse de 21</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span><strong>Empate:</strong> Si ambos tienen el mismo puntaje ≤21</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Historial */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">📝 Historial de Partidas</h3>
                                {historial.length > 0 && (
                                    <button
                                        onClick={limpiarHistorial}
                                        className="px-3 py-1 text-sm bg-red-900/30 text-red-300 hover:bg-red-800/40 rounded-lg transition-colors"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                            
                            {historial.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-3">🃏</div>
                                    <p className="text-gray-400">No hay partidas registradas</p>
                                    <p className="text-sm text-gray-500 mt-1">Juega para comenzar</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                    {historial.map((partida) => (
                                        <div key={partida.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className={`font-medium ${partida.ganancia > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                        {partida.resultado}
                                                    </div>
                                                    <div className="text-sm text-gray-400">{partida.fecha}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Apuesta: ${partida.apuesta} • {partida.puntajeJugador}-{partida.puntajeBanca}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-bold ${partida.ganancia > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                        {partida.ganancia > 0 ? `+$${partida.ganancia}` : '$0'}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {partida.ganancia > 0 
                                                            ? `Neto: $${partida.ganancia - partida.apuesta}` 
                                                            : `Pérdida: $${partida.apuesta}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Información */}
                        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-6">
                            <h4 className="text-lg font-bold text-white mb-3">💡 Consejos</h4>
                            <ul className="space-y-2 text-gray-300">
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>Si tienes 17 o más, plantarse generalmente es lo mejor</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>Con 11 o menos, siempre pide carta</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>La banca se planta en 17 o más</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>Ajusta tu apuesta según tu saldo disponible</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>Juega responsablemente</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer - Usando el componente */}
            <Footer />
        </div>
    );
}