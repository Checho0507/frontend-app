import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import Header from '../components/header';
import Footer from '../components/footer';
import { API_URL } from "../api/auth";

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    nivel?: string;
    verificado_pendiente?: boolean;
}

interface HistorialApuesta {
    id: number;
    eleccion: string;
    resultado: string;
    ganancia: number;
    fecha: string;
    apostado: number;
    gano: boolean;
}

const APUESTA_MINIMA = 100;

export default function CaraSello() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [apuesta, setApuesta] = useState<number>(APUESTA_MINIMA);
    const [eleccion, setEleccion] = useState<"cara" | "sello" | null>(null);
    const [jugando, setJugando] = useState(false);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [resultado, setResultado] = useState<{ gano: boolean; resultado: string; ganancia: number; mensaje: string } | null>(null);
    const [historial, setHistorial] = useState<HistorialApuesta[]>([]);
    const [estadisticas, setEstadisticas] = useState({
        totalApuestas: 0,
        ganadas: 0,
        perdidas: 0,
        gananciaTotal: 0,
        gastoTotal: 0,
        balance: 0
    });
    const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({
        totalApuestasAcum: 0,
        ganadasAcum: 0,
        perdidasAcum: 0,
        gananciaTotalAcum: 0,
        gastoTotalAcum: 0,
    });
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
    
    // Nuevos estados para animación
    const [animandoMoneda, setAnimandoMoneda] = useState(false);
    const [resultadoAnimacion, setResultadoAnimacion] = useState<string | null>(null);
    const [mostrarResultadoFinal, setMostrarResultadoFinal] = useState(false);
    const animacionRef = useRef<number | null>(null);

    // Obtener usuario al cargar
    useEffect(() => {
        if (!usuario) {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate('/login');
                return;
            }
            const usuarioGuardado = localStorage.getItem('usuario');
            if (usuarioGuardado) {
                try {
                    const usuarioParsed = JSON.parse(usuarioGuardado);
                    setUsuario(usuarioParsed);
                } catch (error) {
                    console.error('Error al parsear usuario:', error);
                }
            }
        }
    }, [navigate, usuario]);

    // Cargar historial y estadísticas desde localStorage al iniciar
    useEffect(() => {
        const historialGuardado = localStorage.getItem("historial_caraosello");
        if (historialGuardado) {
            const historialParsed = JSON.parse(historialGuardado);
            setHistorial(historialParsed);
        }

        const statsAcum = localStorage.getItem("estadisticas_acumulativas_caraosello");
        if (statsAcum) {
            const parsedStats = JSON.parse(statsAcum);
            setEstadisticasAcumulativas(parsedStats);

            const balance = parsedStats.gananciaTotalAcum - parsedStats.gastoTotalAcum;
            setEstadisticas({
                totalApuestas: parsedStats.totalApuestasAcum,
                ganadas: parsedStats.ganadasAcum,
                perdidas: parsedStats.perdidasAcum,
                gananciaTotal: parsedStats.gananciaTotalAcum,
                gastoTotal: parsedStats.gastoTotalAcum,
                balance: balance
            });
        }
    }, []);

    // Limpiar animación al desmontar
    useEffect(() => {
        return () => {
            if (animacionRef.current) {
                clearInterval(animacionRef.current);
            }
        };
    }, []);

    // Guardar historial en localStorage
    useEffect(() => {
        if (historial.length > 0) {
            localStorage.setItem("historial_caraosello", JSON.stringify(historial.slice(0, 15)));
        }
    }, [historial]);

    // Guardar estadísticas acumulativas en localStorage
    useEffect(() => {
        if (estadisticasAcumulativas.totalApuestasAcum > 0) {
            localStorage.setItem("estadisticas_acumulativas_caraosello", JSON.stringify(estadisticasAcumulativas));
        }
    }, [estadisticasAcumulativas]);

    const actualizarEstadisticas = (nuevaApuesta: HistorialApuesta) => {
        const gano = nuevaApuesta.gano;

        // Actualizar estadísticas acumulativas
        setEstadisticasAcumulativas(prev => {
            const nuevoTotal = prev.totalApuestasAcum + 1;
            const nuevasGanadas = prev.ganadasAcum + (gano ? 1 : 0);
            const nuevasPerdidas = prev.perdidasAcum + (gano ? 0 : 1);
            const nuevaGananciaTotal = prev.gananciaTotalAcum + nuevaApuesta.ganancia;
            const nuevoGastoTotal = prev.gastoTotalAcum + nuevaApuesta.apostado;

            return {
                totalApuestasAcum: nuevoTotal,
                ganadasAcum: nuevasGanadas,
                perdidasAcum: nuevasPerdidas,
                gananciaTotalAcum: nuevaGananciaTotal,
                gastoTotalAcum: nuevoGastoTotal
            };
        });

        // Actualizar estadísticas visibles
        setEstadisticas(prev => {
            const nuevoTotal = prev.totalApuestas + 1;
            const nuevasGanadas = prev.ganadas + (gano ? 1 : 0);
            const nuevasPerdidas = prev.perdidas + (gano ? 0 : 1);
            const nuevaGananciaTotal = prev.gananciaTotal + nuevaApuesta.ganancia;
            const nuevoGastoTotal = prev.gastoTotal + nuevaApuesta.apostado;
            const nuevoBalance = nuevaGananciaTotal - nuevoGastoTotal;

            return {
                totalApuestas: nuevoTotal,
                ganadas: nuevasGanadas,
                perdidas: nuevasPerdidas,
                gananciaTotal: nuevaGananciaTotal,
                gastoTotal: nuevoGastoTotal,
                balance: nuevoBalance
            };
        });
    };

    const agregarAlHistorial = (eleccion: string, resultado: string, ganancia: number, apostado: number, gano: boolean) => {
        const nuevaApuesta: HistorialApuesta = {
            id: Date.now(),
            eleccion,
            resultado,
            ganancia,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            apostado,
            gano
        };

        const nuevoHistorial = [nuevaApuesta, ...historial.slice(0, 14)];
        setHistorial(nuevoHistorial);
        actualizarEstadisticas(nuevaApuesta);
    };

    const animarConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        setTimeout(() => {
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });
        }, 250);
    };

    // Animación de moneda girando
    const animarMoneda = (resultadoFinal: string) => {
        setAnimandoMoneda(true);
        setMostrarResultadoFinal(false);
        setResultadoAnimacion(null);
        
        let frame = 0;
        const totalFrames = 20; // 2 segundos a 10 frames por segundo
        const interval = 100; // 100ms por frame
        
        animacionRef.current = window.setInterval(() => {
            frame++;
            
            // Alternar entre cara y sello durante la animación
            if (frame % 2 === 0) {
                setResultadoAnimacion('cara');
            } else {
                setResultadoAnimacion('sello');
            }
            
            if (frame >= totalFrames) {
                if (animacionRef.current) {
                    clearInterval(animacionRef.current);
                }
                
                // Mostrar el resultado final
                setResultadoAnimacion(resultadoFinal);
                setMostrarResultadoFinal(true);
                setAnimandoMoneda(false);
                
                // Animación de confetti si ganó
                if (resultado?.gano) {
                    animarConfetti();
                }
            }
        }, interval);
    };

    const realizarApuesta = async () => {
        if (!usuario) {
            setMensaje("Debes iniciar sesión para jugar.");
            return;
        }

        if (!eleccion) {
            setMensaje("Debes elegir Cara o Sello.");
            return;
        }

        if (apuesta < APUESTA_MINIMA) {
            setMensaje(`La apuesta mínima es $${APUESTA_MINIMA}.`);
            return;
        }

        if (apuesta > usuario.saldo) {
            setMensaje("Saldo insuficiente para realizar esta apuesta.");
            return;
        }

        setJugando(true);
        setMensaje(null);
        setResultado(null);
        setMostrarResultadoFinal(false);
        setAnimandoMoneda(false);
        if (animacionRef.current) {
            clearInterval(animacionRef.current);
        }

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/caraosello?apuesta=${apuesta}&eleccion=${eleccion}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = res.data;

            // Actualizar saldo del usuario
            setUsuario(prev => prev ? { ...prev, saldo: data.nuevo_saldo } : null);

            // Guardar resultado para mostrarlo después de la animación
            setResultado({
                gano: data.gano,
                resultado: data.resultado,
                ganancia: data.ganancia,
                mensaje: data.mensaje
            });

            // Iniciar animación de la moneda
            animarMoneda(data.resultado);

            // Agregar al historial después de la animación
            setTimeout(() => {
                agregarAlHistorial(
                    eleccion,
                    data.resultado,
                    data.ganancia,
                    apuesta,
                    data.gano
                );
                setMensaje(data.mensaje);
            }, 2000);

        } catch (err: any) {
            console.error("Error al realizar apuesta:", err);
            setMensaje(err.response?.data?.detail || "Error al procesar la apuesta");
            setJugando(false);
        }
    };

    const limpiarHistorial = () => {
        setHistorial([]);
        localStorage.removeItem("historial_caraosello");
        showMsg("Historial limpiado", "info");
    };

    const limpiarTodasEstadisticas = () => {
        setHistorial([]);
        setEstadisticas({
            totalApuestas: 0,
            ganadas: 0,
            perdidas: 0,
            gananciaTotal: 0,
            gastoTotal: 0,
            balance: 0
        });
        setEstadisticasAcumulativas({
            totalApuestasAcum: 0,
            ganadasAcum: 0,
            perdidasAcum: 0,
            gananciaTotalAcum: 0,
            gastoTotalAcum: 0,
        });
        localStorage.removeItem("historial_caraosello");
        localStorage.removeItem("estadisticas_acumulativas_caraosello");
        showMsg("Estadísticas reiniciadas completamente", "info");
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const cerrarSesion = () => {
        setUsuario(null);
    };

    const valoresApuesta = [100, 200, 500, 1000, 2000, 5000, 10000];

    // Componente de Moneda Animada con tus SVGs originales
    const MonedaAnimada = () => {
        const lado = resultadoAnimacion || 'cara';
        const esGirando = animandoMoneda;
        
        return (
            <div className="relative flex flex-col items-center justify-center">
                {/* Moneda girando */}
                <div className={`relative w-48 h-48 ${esGirando ? 'animate-spin-fast' : ''}`}>
                    {/* Cara SVG */}
                    <div className={`absolute inset-0 transition-all duration-200 ${lado === 'cara' ? 'opacity-100' : 'opacity-0'}`}>
                        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                            <circle cx="100" cy="100" r="95" fill="#FFD700" stroke="#C9A000" strokeWidth="8" />
                            <circle cx="100" cy="100" r="75" fill="#FFECB3" />
                            <circle cx="80" cy="90" r="8" fill="#5A3E1B" />
                            <circle cx="120" cy="90" r="8" fill="#5A3E1B" />
                            <path d="M75 120 Q100 140 125 120" stroke="#5A3E1B" strokeWidth="6" fill="none" />
                        </svg>
                    </div>
                    
                    {/* Sello SVG */}
                    <div className={`absolute inset-0 transition-all duration-200 ${lado === 'sello' ? 'opacity-100' : 'opacity-0'}`}>
                        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                            <circle cx="100" cy="100" r="95" fill="#FFD700" stroke="#C9A000" strokeWidth="8" />
                            <circle cx="100" cy="100" r="75" fill="#FFECB3" />
                            <polygon points="100,65 115,95 150,95 122,115 135,150 100,130 65,150 78,115 50,95 85,95" fill="#5A3E1B" />
                        </svg>
                    </div>
                    
                    {/* Efecto de brillo */}
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br from-white/20 to-transparent ${esGirando ? 'animate-pulse' : ''}`}></div>
                    </div>
                </div>
                
                {/* Texto de animación */}
                {esGirando && (
                    <div className="mt-6 text-center">
                        <div className="text-2xl font-bold text-yellow-300 animate-pulse">
                            ¡La moneda está girando!
                        </div>
                        <div className="text-gray-400 mt-2">
                            Aguarda el resultado...
                        </div>
                    </div>
                )}
                
                {/* Resultado final */}
                {mostrarResultadoFinal && resultado && (
                    <div className="mt-6 text-center">
                        <div className={`text-4xl font-bold mb-2 ${resultado.gano ? 'text-green-400' : 'text-red-400'}`}>
                            {resultado.gano ? '🎉 ¡GANASTE! 🎉' : '😢 ¡PERDISTE! 😢'}
                        </div>
                        <div className="text-xl text-gray-300">
                            Resultado: <span className={`font-bold ${resultado.resultado === 'cara' ? 'text-yellow-400' : 'text-red-400'}`}>
                                {resultado.resultado.toUpperCase()}
                            </span>
                        </div>
                        <div className="text-2xl mt-2">
                            {resultado.gano ? (
                                <span className="text-green-400 font-bold">
                                    +${resultado.ganancia} (${apuesta} × 2)
                                </span>
                            ) : (
                                <span className="text-red-400 font-bold">
                                    -${apuesta}
                                </span>
                            )}
                        </div>
                        <div className="text-gray-400 mt-2">{resultado.mensaje}</div>
                        {/* Botón para apostar de nuevo */}
                        <button
                            onClick={() => {
                                setMostrarResultadoFinal(false);
                                setResultado(null);
                                setEleccion(null);
                                setJugando(false);
                            }}
                            className="mt-6 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold text-white transition-all duration-300"
                        >
                            🎯 Apostar de Nuevo
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (!usuario) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando juego...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {/* Estilos para animaciones */}
            <style>{`
                @keyframes spin-fast {
                    0% { transform: rotateY(0deg); }
                    100% { transform: rotateY(360deg); }
                }
                .animate-spin-fast {
                    animation: spin-fast 0.2s linear infinite;
                    transform-style: preserve-3d;
                }
                @keyframes pulse-glow {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .animate-pulse-glow {
                    animation: pulse-glow 1s ease-in-out infinite;
                }
            `}</style>

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

            {/* Header */}
            <Header
                usuario={usuario}
                cerrarSesion={cerrarSesion}
                setUsuario={setUsuario}
            />

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-red-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-yellow-500 to-red-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-3xl opacity-20"></div>

                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-red-600/20 border border-yellow-500/30 rounded-full text-sm font-bold text-yellow-400">
                                🪙 CARA O SELLO
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-yellow-400 via-red-400 to-yellow-400 bg-clip-text text-transparent">
                                Doble o Nada
                            </span>
                            <br />
                            <span className="text-white">¡50% de probabilidades de ganar!</span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Apuesta desde <span className="text-yellow-400 font-bold">${APUESTA_MINIMA}</span>.
                            <span className="text-green-400 font-bold"> ¡Si aciertas, ganas el doble!</span>
                            <br />
                            <span className="text-blue-400">⚖️ Probabilidad: 50% Cara - 50% Sello</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* Contenido Principal */}
            <section className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Juego y Controles */}
                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="max-w-2xl mx-auto">
                                {/* Saldo */}
                                <div className="text-center mb-8">
                                    <div className="text-3xl font-bold text-white mb-2">
                                        Saldo: <span className="text-yellow-400">${usuario?.saldo?.toLocaleString() ?? 0}</span>
                                    </div>
                                    {mensaje && !mostrarResultadoFinal && (
                                        <div className={`px-6 py-4 rounded-xl font-bold mb-4 ${mensaje.includes("Ganaste") || mensaje.includes("¡Ganaste")
                                            ? "bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50 text-green-200"
                                            : mensaje.includes("Error") || mensaje.includes("insuficiente") || mensaje.includes("Debes") || mensaje.includes("Perdiste")
                                                ? "bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200"
                                                : "bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-500/50 text-blue-200"
                                            }`}>
                                            {mensaje}
                                        </div>
                                    )}
                                </div>

                                {/* Mostrar moneda animada o controles de apuesta */}
                                {animandoMoneda || mostrarResultadoFinal ? (
                                    <div className="mb-10 flex flex-col items-center justify-center min-h-[500px]">
                                        <MonedaAnimada />
                                    </div>
                                ) : (
                                    <>
                                        {/* Selector de apuesta */}
                                        <div className="mb-10">
                                            <label className="block text-white text-xl font-bold mb-6 text-center">
                                                💰 ¿Cuánto quieres apostar?
                                            </label>
                                            <div className="flex flex-col items-center space-y-6">
                                                <input
                                                    type="range"
                                                    min={APUESTA_MINIMA}
                                                    max={Math.min(usuario?.saldo || APUESTA_MINIMA, 10000)}
                                                    step={50}
                                                    value={apuesta}
                                                    onChange={(e) => setApuesta(parseInt(e.target.value))}
                                                    className="w-full h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-yellow-500 [&::-webkit-slider-thumb]:to-red-500"
                                                />
                                                <div className="flex justify-between w-full text-gray-400 text-sm">
                                                    <span>${APUESTA_MINIMA}</span>
                                                    <span className="text-xl font-bold text-yellow-400">${apuesta}</span>
                                                    <span>${Math.min(usuario?.saldo || APUESTA_MINIMA, 10000)}</span>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-5xl font-bold text-yellow-400 mb-2">${apuesta}</div>
                                                    <div className="text-gray-400">Apuesta actual</div>
                                                </div>
                                                <div className="flex flex-wrap justify-center gap-3">
                                                    {valoresApuesta.map((valor) => (
                                                        <button
                                                            key={valor}
                                                            onClick={() => setApuesta(valor)}
                                                            disabled={valor > (usuario?.saldo || 0)}
                                                            className={`px-4 py-3 rounded-lg font-bold transition-all duration-200 ${apuesta === valor
                                                                ? 'bg-gradient-to-r from-yellow-600 to-red-600 text-white scale-105'
                                                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                                } ${valor > (usuario?.saldo || 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            ${valor}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="text-sm text-gray-500 text-center">
                                                    Ganancia potencial: <span className="text-green-400 font-bold">${apuesta * 2}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Selección Cara o Sello */}
                                        <div className="mb-10">
                                            <label className="block text-white text-xl font-bold mb-6 text-center">
                                                🪙 Elige Cara o Sello
                                            </label>
                                            <div className="flex flex-col md:flex-row justify-center items-center space-y-6 md:space-y-0 md:space-x-12">
                                                <button
                                                    onClick={() => setEleccion("cara")}
                                                    className={`flex flex-col items-center p-8 rounded-3xl transition-all duration-300 ${eleccion === "cara"
                                                        ? 'bg-gradient-to-br from-yellow-600/40 to-yellow-800/40 border-4 border-yellow-500 scale-105 shadow-2xl shadow-yellow-500/30'
                                                        : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 border-4 border-gray-700 hover:border-yellow-500/50 hover:scale-105'
                                                        }`}
                                                >
                                                    <div className="text-8xl mb-4">
                                                        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                                                            <circle cx="100" cy="100" r="95" fill="#FFD700" stroke="#C9A000" strokeWidth="8" />
                                                            <circle cx="100" cy="100" r="75" fill="#FFECB3" />
                                                            <circle cx="80" cy="90" r="8" fill="#5A3E1B" />
                                                            <circle cx="120" cy="90" r="8" fill="#5A3E1B" />
                                                            <path d="M75 120 Q100 140 125 120" stroke="#5A3E1B" strokeWidth="6" fill="none" />
                                                        </svg>
                                                    </div>
                                                    <div className="text-3xl font-bold text-white mb-2">CARA</div>
                                                    <div className="text-gray-400">(Cara)</div>
                                                    {eleccion === "cara" && (
                                                        <div className="mt-4 px-4 py-1 bg-yellow-600 rounded-full text-sm font-bold">
                                                            SELECCIONADO
                                                        </div>
                                                    )}
                                                </button>

                                                <div className="text-4xl text-gray-500 font-bold">VS</div>

                                                <button
                                                    onClick={() => setEleccion("sello")}
                                                    className={`flex flex-col items-center p-8 rounded-3xl transition-all duration-300 ${eleccion === "sello"
                                                        ? 'bg-gradient-to-br from-red-600/40 to-red-800/40 border-4 border-red-500 scale-105 shadow-2xl shadow-red-500/30'
                                                        : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 border-4 border-gray-700 hover:border-red-500/50 hover:scale-105'
                                                        }`}
                                                >
                                                    <div className="text-8xl mb-4">
                                                        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                                                            <circle cx="100" cy="100" r="95" fill="#FFD700" stroke="#C9A000" strokeWidth="8" />
                                                            <circle cx="100" cy="100" r="75" fill="#FFECB3" />
                                                            <polygon points="100,65 115,95 150,95 122,115 135,150 100,130 65,150 78,115 50,95 85,95" fill="#5A3E1B" />
                                                        </svg>
                                                    </div>
                                                    <div className="text-3xl font-bold text-white mb-2">SELLO</div>
                                                    <div className="text-gray-400">(Cruz)</div>
                                                    {eleccion === "sello" && (
                                                        <div className="mt-4 px-4 py-1 bg-red-600 rounded-full text-sm font-bold">
                                                            SELECCIONADO
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Botón de jugar */}
                                        <button
                                            onClick={realizarApuesta}
                                            disabled={jugando || !eleccion || apuesta < APUESTA_MINIMA || apuesta > usuario.saldo}
                                            className={`w-full py-5 px-8 rounded-xl font-bold text-xl transition-all duration-300 ${jugando || !eleccion || apuesta < APUESTA_MINIMA || apuesta > usuario.saldo
                                                ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                                : 'bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-500 hover:to-red-500 hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/20'
                                                }`}
                                        >
                                            {jugando ? (
                                                <span className="flex items-center justify-center">
                                                    <svg className="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Procesando apuesta...
                                                </span>
                                            ) : (
                                                `🎯 Apostar $${apuesta}`
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Panel Lateral - Resto del código se mantiene igual */}
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
                                    <div className="text-sm text-gray-400">Total Apuestas</div>
                                    <div className="text-2xl font-bold text-blue-400">{estadisticas.totalApuestas}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Ganadas</div>
                                    <div className="text-2xl font-bold text-green-400">{estadisticas.ganadas}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {estadisticas.totalApuestas > 0
                                            ? `${((estadisticas.ganadas / estadisticas.totalApuestas) * 100).toFixed(1)}%`
                                            : '0%'}
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Perdidas</div>
                                    <div className="text-2xl font-bold text-red-400">{estadisticas.perdidas}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {estadisticas.totalApuestas > 0
                                            ? `${((estadisticas.perdidas / estadisticas.totalApuestas) * 100).toFixed(1)}%`
                                            : '0%'}
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Balance</div>
                                    <div className={`text-2xl font-bold ${estadisticas.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${estadisticas.balance}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Ganancia Total</div>
                                    <div className="text-xl font-bold text-green-400">${estadisticas.gananciaTotal}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Gasto Total</div>
                                    <div className="text-xl font-bold text-red-400">${estadisticas.gastoTotal}</div>
                                </div>
                            </div>
                        </div>

                        {/* Probabilidades */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📈 Probabilidades</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-yellow-400">Cara</span>
                                        <span className="text-gray-400">50%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-3">
                                        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-3 rounded-full w-1/2"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-red-400">Sello</span>
                                        <span className="text-gray-400">50%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-3">
                                        <div className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full w-1/2"></div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-700/30">
                                    <div className="text-center text-gray-400">
                                        <span className="text-green-400">🎯 Multiplicador: 2x</span>
                                        <div className="text-sm mt-1">Si aciertas, ganas el doble de tu apuesta</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Historial */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">📝 Historial de Apuestas</h3>
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
                                    <div className="text-4xl mb-3">🪙</div>
                                    <p className="text-gray-400">No hay apuestas registradas</p>
                                    <p className="text-sm text-gray-500 mt-1">Realiza tu primera apuesta</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                    {historial.map((apuesta) => (
                                        <div key={apuesta.id} className={`p-4 rounded-xl border ${apuesta.gano
                                            ? 'bg-gradient-to-r from-green-900/20 to-green-800/10 border-green-500/30'
                                            : 'bg-gradient-to-r from-red-900/20 to-red-800/10 border-red-500/30'
                                            }`}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-3 h-3 rounded-full ${apuesta.eleccion === 'cara' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                                        <div className="text-white font-medium">
                                                            {apuesta.eleccion.toUpperCase()} vs {apuesta.resultado.toUpperCase()}
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-gray-400 mt-1">{apuesta.fecha}</div>
                                                    <div className="text-xs text-gray-500">Apostado: ${apuesta.apostado}</div>
                                                </div>
                                                <div className={`text-right ${apuesta.gano ? 'text-green-400' : 'text-red-400'}`}>
                                                    <div className="text-2xl font-bold">
                                                        {apuesta.gano ? `+$${apuesta.ganancia}` : `-$${apuesta.apostado}`}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {apuesta.gano ? `Ganancia neta: $${apuesta.ganancia - apuesta.apostado}` : 'Pérdida total'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Información */}
                        <div className="bg-gradient-to-r from-yellow-600/20 to-red-600/20 border border-yellow-500/30 rounded-2xl p-6">
                            <h4 className="text-lg font-bold text-white mb-3">💡 Cómo jugar</h4>
                            <ul className="space-y-3 text-gray-300">
                                <li className="flex items-start space-x-2">
                                    <span className="text-yellow-400">•</span>
                                    <span>Elige la cantidad a apostar (mínimo ${APUESTA_MINIMA})</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-yellow-400">•</span>
                                    <span>Selecciona <span className="text-yellow-300">Cara</span> o <span className="text-red-300">Sello</span></span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-yellow-400">•</span>
                                    <span>La moneda se lanza al azar (50/50)</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-yellow-400">•</span>
                                    <span>Si aciertas, <span className="text-green-400">ganas el doble</span> (apuesta × 2)</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-yellow-400">•</span>
                                    <span>Si fallas, <span className="text-red-400">pierdes la apuesta</span></span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-yellow-400">•</span>
                                    <span>¡Juega con responsabilidad!</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

            </section>

            {/* Footer */}
            <Footer />
        </div>
    );
}