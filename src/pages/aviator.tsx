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

interface Vuelo {
    id: number;
    multiplicador_crash: number;
    multiplicador_retiro: number | null;
    resultado: string;
    ganancia: number;
    fecha: string;
    apuesta: number;
    retiro_manual: boolean;
}

interface HistorialPublico {
    id: number;
    multiplicador: number;
    timestamp: string;
    color: string;
}

interface Estadisticas {
    total_vuelos: number;
    vuelos_ganados: number;
    vuelos_perdidos: number;
    ganancia_total: number;
    perdida_total: number;
    balance: number;
    mayor_ganancia: number;
    multiplicador_record: number;
}

type EstadoVuelo = 'esperando' | 'vuelo' | 'cashout' | 'explosion';

export default function Aviator() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [estado, setEstado] = useState<EstadoVuelo>('esperando');
    const [cargando, setCargando] = useState(false);
    const [mensaje, setMensaje] = useState<string>("");
    
    // Estados del juego
    const [multiplicadorActual, setMultiplicadorActual] = useState<number>(1.0);
    const [multiplicadorCrash, setMultiplicadorCrash] = useState<number | null>(null);
    const [multiplicadorRetiro, setMultiplicadorRetiro] = useState<number | null>(null);
    const [ganancia, setGanancia] = useState<number>(0);
    const [apuestaActual, setApuestaActual] = useState<number>(0);
    const [sessionId, setSessionId] = useState<string | null>(null);
    
    // Configuración
    const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(500);
    const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([100, 500, 1000, 2000, 5000]);
    const [multiplicadorAuto, setMultiplicadorAuto] = useState<number>(2.0);
    
    // Historial y estadísticas
    const [historial, setHistorial] = useState<Vuelo[]>([]);
    const [historialPublico, setHistorialPublico] = useState<HistorialPublico[]>([]);
    const [estadisticas, setEstadisticas] = useState<Estadisticas>({
        total_vuelos: 0,
        vuelos_ganados: 0,
        vuelos_perdidos: 0,
        ganancia_total: 0,
        perdida_total: 0,
        balance: 0,
        mayor_ganancia: 0,
        multiplicador_record: 0,
    });
    
    // Gráfico
    const [puntosGrafico, setPuntosGrafico] = useState<Array<{x: number, y: number}>>([]);
    const [tiempoTranscurrido, setTiempoTranscurrido] = useState<number>(0);
    const [tiempoInicio, setTiempoInicio] = useState<Date | null>(null);
    
    // Refs para animación
    const animacionRef = useRef<number | null>(null);
    const tiempoInicioRef = useRef<number>(0);
    const multiplicadorCrashRef = useRef<number | null>(null);
    
    // Notificación
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

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
    }, [navigate, usuario, setUsuario]);

    // Cargar configuración del juego
    useEffect(() => {
        const cargarConfiguracion = async () => {
            try {
                const res = await axios.get(`${API_URL}/juegos/aviator/apuestas-permitidas`);
                setApuestasPermitidas(res.data.apuestas_permitidas);
                setApuestaSeleccionada(res.data.apuestas_permitidas[1] || 500);
            } catch (error) {
                console.error("Error al cargar configuración:", error);
            }
        };
        
        cargarConfiguracion();
        cargarHistorialPublico();
        cargarHistorialPersonal();
    }, []);

    const cargarHistorialPublico = async () => {
        try {
            const res = await axios.get(`${API_URL}/juegos/aviator/historial?limite=20`);
            setHistorialPublico(res.data.historial);
        } catch (error) {
            console.error("Error al cargar historial público:", error);
        }
    };

    const cargarHistorialPersonal = () => {
        const historialGuardado = localStorage.getItem('historial_aviator');
        if (historialGuardado) {
            const historialParsed = JSON.parse(historialGuardado);
            setHistorial(historialParsed);
        }
    };

    // Animación del vuelo
    useEffect(() => {
        if (estado === 'vuelo' && tiempoInicio) {
            iniciarAnimacion();
        } else {
            detenerAnimacion();
        }
        
        return () => {
            detenerAnimacion();
        };
    }, [estado, tiempoInicio]);

    const iniciarAnimacion = () => {
        tiempoInicioRef.current = Date.now();
        
        const animar = () => {
            if (!tiempoInicioRef.current || !multiplicadorCrashRef.current) return;
            
            const ahora = Date.now();
            const tiempoTrans = (ahora - tiempoInicioRef.current) / 1000; // Segundos
            
            setTiempoTranscurrido(tiempoTrans);
            
            // Calcular multiplicador actual (curva exponencial)
            let multiplicadorCalculado = 1.0;
            const tiempoTotalEstimado = 2.0 + (multiplicadorCrashRef.current * 0.1);
            const t = Math.min(tiempoTrans / tiempoTotalEstimado, 1.0);
            
            if (t < 0.3) {
                const progreso = (t / 0.3) ** 1.5;
                multiplicadorCalculado = 1.0 + (multiplicadorCrashRef.current - 1.0) * progreso;
            } else {
                const base = 0.3 ** 1.5;
                const progreso = base + ((t - 0.3) / 0.7) * (1 - base);
                multiplicadorCalculado = 1.0 + (multiplicadorCrashRef.current - 1.0) * progreso;
            }
            
            multiplicadorCalculado = Math.round(multiplicadorCalculado * 100) / 100;
            setMultiplicadorActual(multiplicadorCalculado);
            
            // Actualizar gráfico
            setPuntosGrafico(prev => {
                const nuevoPunto = { x: tiempoTrans, y: multiplicadorCalculado };
                const nuevosPuntos = [...prev, nuevoPunto].slice(-100); // Mantener últimos 100 puntos
                return nuevosPuntos;
            });
            
            // Verificar si superó el multiplicador de auto-retiro
            if (multiplicadorCalculado >= multiplicadorAuto && multiplicadorAuto > 1.0) {
                hacerCashout(multiplicadorAuto);
            }
            
            // Verificar si explotó
            if (multiplicadorCalculado >= multiplicadorCrashRef.current) {
                setEstado('explosion');
                setMultiplicadorCrash(multiplicadorCrashRef.current);
                setMensaje(`¡CRASH! El avión explotó en ${multiplicadorCrashRef.current.toFixed(2)}x`);
                agregarAlHistorial('explosion', multiplicadorCrashRef.current, null, 0, apuestaActual);
                showMsg("¡CRASH! Perdiste tu apuesta", "error");
                
                // Efecto de explosión
                if (animacionRef.current) {
                    cancelAnimationFrame(animacionRef.current);
                }
                return;
            }
            
            animacionRef.current = requestAnimationFrame(animar);
        };
        
        animacionRef.current = requestAnimationFrame(animar);
    };

    const detenerAnimacion = () => {
        if (animacionRef.current) {
            cancelAnimationFrame(animacionRef.current);
            animacionRef.current = null;
        }
    };

    const iniciarVuelo = async () => {
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
        setMultiplicadorActual(1.0);
        setMultiplicadorCrash(null);
        setMultiplicadorRetiro(null);
        setGanancia(0);
        setPuntosGrafico([]);
        setTiempoTranscurrido(0);
        setApuestaActual(apuestaSeleccionada);

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/aviator/iniciar?apuesta=${apuestaSeleccionada}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            setSessionId(res.data.session_id);
            setEstado('vuelo');
            setTiempoInicio(new Date());
            
            // Guardar referencia del multiplicador crash (sin mostrarlo al usuario)
            multiplicadorCrashRef.current = res.data.multiplicador_crash || generarMultiplicadorAleatorio();

            // Actualizar saldo usuario
            setUsuario((prev) =>
                prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev
            );

            setMensaje("¡El avión despegó! Retira antes de que explote.");

        } catch (error: any) {
            setMensaje(
                error.response?.data?.detail || "Error al iniciar el vuelo."
            );
            setEstado('esperando');
        } finally {
            setCargando(false);
        }
    };

    const generarMultiplicadorAleatorio = (): number => {
        // Función cliente para generar multiplicador similar al backend
        const r = Math.random();
        if (r < 0.15) return Number((Math.random() * 0.5 + 1.0).toFixed(2));
        if (r < 0.85) return Number((Math.random() * 1.5 + 1.5).toFixed(2));
        if (r < 0.95) return Number((Math.random() * 7.0 + 3.0).toFixed(2));
        if (r < 0.99) return Number((Math.random() * 20.0 + 10.0).toFixed(2));
        return Number((Math.random() * 70.0 + 30.0).toFixed(2));
    };

    const hacerCashout = async (multiplicador: number) => {
        if (!sessionId || estado !== 'vuelo') return;

        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/aviator/${sessionId}/cashout?multiplicador_actual=${multiplicador}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            detenerAnimacion();
            
            if (res.data.estado === 'cashout') {
                setEstado('cashout');
                setMultiplicadorCrash(res.data.multiplicador_crash);
                setMultiplicadorRetiro(res.data.multiplicador_retiro);
                setGanancia(res.data.ganancia);
                setMensaje(res.data.resultado);
                
                // Actualizar saldo
                setUsuario((prev) =>
                    prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev
                );

                // Animación de confetti
                if (res.data.ganancia > apuestaActual) {
                    animarConfetti();
                }

                // Agregar al historial
                agregarAlHistorial('cashout', res.data.multiplicador_crash, res.data.multiplicador_retiro, res.data.ganancia, apuestaActual);
                showMsg(`¡Retiro exitoso! Ganaste $${res.data.ganancia.toFixed(2)}`, "success");
            } else {
                // Explotó antes del cashout
                setEstado('explosion');
                setMultiplicadorCrash(res.data.multiplicador_crash);
                setMensaje(res.data.resultado);
                agregarAlHistorial('explosion', res.data.multiplicador_crash, null, 0, apuestaActual);
                showMsg("¡CRASH! Perdiste tu apuesta", "error");
            }

        } catch (error: any) {
            setMensaje(
                error.response?.data?.detail || "Error al retirar."
            );
        } finally {
            setCargando(false);
        }
    };

    const verificarEstadoVuelo = async () => {
        if (!sessionId || estado !== 'vuelo') return;

        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(
                `${API_URL}/juegos/aviator/${sessionId}/estado`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (res.data.exploto && res.data.estado === 'explosion') {
                detenerAnimacion();
                setEstado('explosion');
                setMultiplicadorCrash(res.data.multiplicador_crash);
                setMensaje(`¡CRASH! El avión explotó en ${res.data.multiplicador_crash?.toFixed(2)}x`);
                agregarAlHistorial('explosion', res.data.multiplicador_crash, null, 0, apuestaActual);
                showMsg("¡CRASH! Perdiste tu apuesta", "error");
            }

        } catch (error) {
            console.error("Error al verificar estado:", error);
        }
    };

    const agregarAlHistorial = (resultado: string, crash: number, retiro: number | null, ganancia: number, apuesta: number) => {
        const nuevoVuelo: Vuelo = {
            id: Date.now(),
            multiplicador_crash: crash,
            multiplicador_retiro: retiro,
            resultado,
            ganancia,
            apuesta,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            retiro_manual: resultado === 'cashout'
        };
        
        const nuevoHistorial = [nuevoVuelo, ...historial.slice(0, 9)];
        setHistorial(nuevoHistorial);
        localStorage.setItem('historial_aviator', JSON.stringify(nuevoHistorial));
        
        // Actualizar estadísticas
        actualizarEstadisticas(nuevoVuelo);
    };

    const actualizarEstadisticas = (vuelo: Vuelo) => {
        setEstadisticas(prev => {
            const esVictoria = vuelo.resultado === 'cashout';
            const nuevaGanancia = esVictoria ? vuelo.ganancia : 0;
            const nuevaPerdida = esVictoria ? 0 : vuelo.apuesta;
            const nuevoBalance = prev.balance + (nuevaGanancia - nuevaPerdida);
            
            return {
                total_vuelos: prev.total_vuelos + 1,
                vuelos_ganados: prev.vuelos_ganados + (esVictoria ? 1 : 0),
                vuelos_perdidos: prev.vuelos_perdidos + (esVictoria ? 0 : 1),
                ganancia_total: prev.ganancia_total + nuevaGanancia,
                perdida_total: prev.perdida_total + nuevaPerdida,
                balance: nuevoBalance,
                mayor_ganancia: Math.max(prev.mayor_ganancia, nuevaGanancia),
                multiplicador_record: Math.max(prev.multiplicador_record, vuelo.multiplicador_retiro || 0)
            };
        });
    };

    const animarConfetti = () => {
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 }
        });
    };

    const reiniciarJuego = () => {
        detenerAnimacion();
        setEstado('esperando');
        setSessionId(null);
        setMultiplicadorActual(1.0);
        setMultiplicadorCrash(null);
        setMultiplicadorRetiro(null);
        setMensaje("");
        setGanancia(0);
        setPuntosGrafico([]);
        setTiempoTranscurrido(0);
        setTiempoInicio(null);
        setApuestaActual(0);
    };

    const configurarAutoretiro = async () => {
        if (!sessionId || estado !== 'vuelo') {
            setMultiplicadorAuto(multiplicadorAuto);
            showMsg(`Retiro automático configurado en ${multiplicadorAuto}x`, "info");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `${API_URL}/juegos/aviator/${sessionId}/configurar-autoretiro?multiplicador_auto=${multiplicadorAuto}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            showMsg(`Retiro automático configurado en ${multiplicadorAuto}x`, "success");
        } catch (error) {
            console.error("Error al configurar autoretiro:", error);
        }
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const limpiarHistorial = () => {
        setHistorial([]);
        localStorage.removeItem('historial_aviator');
        showMsg("Historial limpiado", "info");
    };

    const cerrarSesion = () => {
        // Limpiar localStorage
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        localStorage.removeItem("historial_aviator");
        
        setUsuario(null);
        showMsg("Sesión cerrada correctamente", "success");
        setTimeout(() => navigate('/login'), 1500);
    };

    // Formatear tiempo
    const formatearTiempo = (segundos: number) => {
        const mins = Math.floor(segundos / 60);
        const secs = Math.floor(segundos % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Renderizar gráfico
    const renderGrafico = () => {
        if (puntosGrafico.length === 0) {
            return (
                <div className="w-full h-64 bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-4xl mb-2">✈️</div>
                        <p className="text-gray-400">Esperando despegue...</p>
                    </div>
                </div>
            );
        }

        // Calcular máximos para escalado
        const maxX = Math.max(...puntosGrafico.map(p => p.x), 30);
        const maxY = Math.max(...puntosGrafico.map(p => p.y), 5);
        
        const escalaX = (x: number) => (x / maxX) * 100;
        const escalaY = (y: number) => 100 - (y / maxY) * 90; // 10% de margen inferior

        const puntosSVG = puntosGrafico.map((p, i) => {
            const x = escalaX(p.x);
            const y = escalaY(p.y);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        // Línea de retiro automático
        const yAutoRetiro = escalaY(multiplicadorAuto);

        return (
            <div className="w-full h-64 bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl relative overflow-hidden">
                {/* Ejes y grid */}
                <div className="absolute inset-0">
                    {/* Grid horizontal */}
                    {[1, 2, 3, 4, 5, 10, 20, 50].filter(y => y <= maxY).map(y => (
                        <div key={y} className="absolute left-0 right-0 border-t border-gray-700/30" 
                             style={{ bottom: `${escalaY(y)}%` }}>
                            <span className="absolute left-2 top-1 text-xs text-gray-500">{y}x</span>
                        </div>
                    ))}
                </div>
                
                {/* Línea de autoretiro */}
                {multiplicadorAuto > 1.0 && (
                    <div className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-500/50" 
                         style={{ bottom: `${yAutoRetiro}%` }}>
                        <span className="absolute right-2 -top-6 text-xs text-yellow-400">
                            Auto: {multiplicadorAuto.toFixed(1)}x
                        </span>
                    </div>
                )}
                
                {/* Línea del gráfico */}
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d={puntosSVG} fill="none" stroke="url(#gradiente)" strokeWidth="2" />
                    <defs>
                        <linearGradient id="gradiente" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10B981" stopOpacity="1" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
                        </linearGradient>
                    </defs>
                </svg>
                
                {/* Punto actual */}
                {puntosGrafico.length > 0 && (
                    <div className="absolute w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"
                         style={{ 
                             left: `${escalaX(puntosGrafico[puntosGrafico.length-1].x)}%`,
                             bottom: `${escalaY(puntosGrafico[puntosGrafico.length-1].y)}%`,
                             transform: 'translate(-50%, 50%)'
                         }}>
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
                    <p className="text-gray-300 text-xl font-bold">Cargando Aviator...</p>
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

            {/* Header */}
            <Header 
                usuario={usuario}
                cerrarSesion={cerrarSesion}
                setUsuario={setUsuario}
            />

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-20"></div>
                
                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-full text-sm font-bold text-blue-400">
                                ✈️ AVIATOR VIP 🚀
                            </span>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                ¡Aviator!
                            </span>
                            <br />
                            <span className="text-white">Retira antes de que explote</span>
                        </h1>
                        
                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Apuesta desde <span className="text-blue-400 font-bold">${apuestasPermitidas[0]}</span> hasta <span className="text-blue-400 font-bold">${apuestasPermitidas[apuestasPermitidas.length - 1]}</span>.
                            <span className="text-yellow-400 font-bold"> ¡Multiplicadores de hasta 100x!</span>
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
                            {/* Gráfico */}
                            <div className="mb-6">
                                {renderGrafico()}
                            </div>

                            {/* Multiplicador actual */}
                            <div className="text-center mb-8">
                                <div className={`text-6xl md:text-7xl font-bold mb-2 transition-all duration-300 ${
                                    multiplicadorActual >= 10 ? 'text-green-500' :
                                    multiplicadorActual >= 5 ? 'text-yellow-500' :
                                    multiplicadorActual >= 2 ? 'text-blue-400' :
                                    'text-gray-300'
                                }`}>
                                    {multiplicadorActual.toFixed(2)}<span className="text-3xl">x</span>
                                </div>
                                
                                <div className="text-gray-400">
                                    {estado === 'vuelo' && (
                                        <>
                                            <div className="text-lg">✈️ El avión está volando...</div>
                                            <div className="text-sm">Tiempo: {formatearTiempo(tiempoTranscurrido)}</div>
                                        </>
                                    )}
                                    {estado === 'cashout' && (
                                        <div className="text-lg text-green-400">💰 ¡Retiro exitoso!</div>
                                    )}
                                    {estado === 'explosion' && (
                                        <div className="text-lg text-red-400">💥 ¡CRASH! El avión explotó</div>
                                    )}
                                </div>
                            </div>

                            {/* Selector de apuesta y autoretiro */}
                            {estado === 'esperando' ? (
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-white mb-4 text-center">💰 Selecciona tu apuesta</h3>
                                    <div className="flex gap-3 justify-center flex-wrap mb-6">
                                        {apuestasPermitidas.map((apuesta) => (
                                            <button
                                                key={apuesta}
                                                onClick={() => setApuestaSeleccionada(apuesta)}
                                                disabled={usuario.saldo < apuesta}
                                                className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 ${
                                                    apuestaSeleccionada === apuesta
                                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                                                        : usuario.saldo < apuesta
                                                        ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700'
                                                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white border border-gray-700'
                                                }`}
                                            >
                                                ${apuesta.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    {/* Configuración de autoretiro */}
                                    <div className="mb-4">
                                        <label className="block text-gray-400 mb-2 text-center">
                                            🔧 Retiro automático en:
                                        </label>
                                        <div className="flex items-center justify-center space-x-4">
                                            <input
                                                type="range"
                                                min="1.1"
                                                max="20"
                                                step="0.1"
                                                value={multiplicadorAuto}
                                                onChange={(e) => setMultiplicadorAuto(parseFloat(e.target.value))}
                                                className="w-64 accent-blue-500"
                                            />
                                            <span className="text-white font-bold w-16 text-center">
                                                {multiplicadorAuto.toFixed(1)}x
                                            </span>
                                        </div>
                                        <div className="text-center text-sm text-gray-400 mt-2">
                                            El juego retirará automáticamente cuando llegue a este multiplicador
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-white mb-2">
                                            Saldo: <span className="text-yellow-400">${usuario?.saldo?.toLocaleString() ?? 0}</span>
                                        </div>
                                        {apuestaActual > 0 && (
                                            <div className="text-lg text-blue-400 font-bold">
                                                Apostado: ${apuestaActual.toLocaleString()}
                                            </div>
                                        )}
                                        {ganancia > 0 && (
                                            <div className="text-lg text-green-400 font-bold">
                                                Ganancia: +${ganancia.toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Mensajes */}
                            {mensaje && (
                                <div className={`px-4 py-3 rounded-xl font-bold mb-6 text-center ${
                                    mensaje.includes("CRASH") || mensaje.includes("Perdiste")
                                        ? "bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200" 
                                        : mensaje.includes("Ganaste") || mensaje.includes("éxito")
                                        ? "bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50 text-green-200"
                                        : "bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-gray-500/50 text-gray-200"
                                }`}>
                                    {mensaje}
                                </div>
                            )}

                            {/* Controles */}
                            <div className="text-center">
                                {estado === 'esperando' && (
                                    <button
                                        onClick={iniciarVuelo}
                                        disabled={cargando || !usuario || (usuario && usuario.saldo < apuestaSeleccionada)}
                                        className={`w-full max-w-xs py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${
                                            cargando 
                                                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105 active:scale-95'
                                        } ${(!usuario || (usuario && usuario.saldo < apuestaSeleccionada)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {cargando ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Preparando despegue...
                                            </span>
                                        ) : (
                                            `✈️ Iniciar Vuelo ($${apuestaSeleccionada.toLocaleString()})`
                                        )}
                                    </button>
                                )}

                                <div className="flex gap-4 justify-center">
                                    {estado === 'vuelo' && (
                                        <>
                                            <button
                                                onClick= {() => hacerCashout(multiplicadorActual)}
                                                disabled={cargando}
                                                className={`py-3 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                                                    cargando 
                                                        ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 hover:scale-105 active:scale-95'
                                                }`}
                                            >
                                                {cargando ? "..." : "💰 Retirar Ganancia"}
                                            </button>

                                            <button
                                                onClick={configurarAutoretiro}
                                                disabled={cargando}
                                                className={`py-3 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                                                    cargando 
                                                        ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                        : 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 hover:scale-105 active:scale-95'
                                                }`}
                                            >
                                                🔧 Auto: {multiplicadorAuto.toFixed(1)}x
                                            </button>
                                        </>
                                    )}
                                </div>

                                {(estado === 'cashout' || estado === 'explosion') && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                                <div className="text-sm text-gray-400">Multiplicador Crash</div>
                                                <div className="text-2xl font-bold text-red-400">
                                                    {multiplicadorCrash?.toFixed(2)}x
                                                </div>
                                            </div>
                                            <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                                <div className="text-sm text-gray-400">Tu Retiro</div>
                                                <div className="text-2xl font-bold text-green-400">
                                                    {multiplicadorRetiro ? `${multiplicadorRetiro.toFixed(2)}x` : 'No retirado'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={reiniciarJuego}
                                            className="w-full max-w-xs py-4 px-8 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105 active:scale-95 transition-all duration-300"
                                        >
                                            ✈️ Nuevo Vuelo
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Panel Lateral */}
                    <div className="space-y-6">
                        {/* Estadísticas */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📊 Tus Estadísticas</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Total Vuelos</div>
                                    <div className="text-2xl font-bold text-blue-400">{estadisticas.total_vuelos}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Vuelos Ganados</div>
                                    <div className="text-2xl font-bold text-green-400">{estadisticas.vuelos_ganados}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Balance</div>
                                    <div className={`text-2xl font-bold ${estadisticas.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${estadisticas.balance.toFixed(2)}
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Record</div>
                                    <div className="text-2xl font-bold text-yellow-400">{estadisticas.multiplicador_record.toFixed(2)}x</div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-700/30">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-sm text-gray-400">Mayor Ganancia</div>
                                        <div className="text-lg font-bold text-green-400">${estadisticas.mayor_ganancia.toFixed(2)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-gray-400">Ratio Victoria</div>
                                        <div className="text-lg font-bold text-blue-400">
                                            {estadisticas.total_vuelos > 0 
                                                ? `${((estadisticas.vuelos_ganados / estadisticas.total_vuelos) * 100).toFixed(1)}%` 
                                                : '0%'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Historial público */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📈 Historial de Crash</h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {historialPublico.map((item) => (
                                    <div key={item.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-3 h-3 rounded-full ${
                                                    item.color === 'green' ? 'bg-green-500' :
                                                    item.color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                                                }`}></div>
                                                <div>
                                                    <div className="font-medium text-white">
                                                        {item.multiplicador.toFixed(2)}x
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`font-bold ${
                                                item.multiplicador > 10 ? 'text-green-400' :
                                                item.multiplicador > 5 ? 'text-yellow-400' :
                                                'text-gray-400'
                                            }`}>
                                                {item.multiplicador > 3 ? '🔥' : item.multiplicador > 1.5 ? '⚡' : '💥'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Historial personal */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">📝 Tus Últimos Vuelos</h3>
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
                                    <div className="text-4xl mb-3">✈️</div>
                                    <p className="text-gray-400">No hay vuelos registrados</p>
                                    <p className="text-sm text-gray-500 mt-1">Inicia un vuelo para comenzar</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                    {historial.map((vuelo) => (
                                        <div key={vuelo.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className={`font-medium ${vuelo.ganancia > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {vuelo.resultado === 'cashout' ? '💰 Retirado' : '💥 Crash'}
                                                    </div>
                                                    <div className="text-sm text-gray-400">{vuelo.fecha}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Crash: {vuelo.multiplicador_crash.toFixed(2)}x
                                                        {vuelo.multiplicador_retiro && ` • Retiro: ${vuelo.multiplicador_retiro.toFixed(2)}x`}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-bold ${vuelo.ganancia > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {vuelo.ganancia > 0 ? `+$${vuelo.ganancia.toFixed(2)}` : `-$${vuelo.apuesta}`}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        Apuesta: ${vuelo.apuesta}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Reglas del juego */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📖 Cómo Jugar Aviator</h3>
                            <div className="space-y-3 text-gray-300">
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>Apuesta:</strong> Elige tu monto y haz clic en "Iniciar Vuelo"</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>Multiplicador:</strong> Comienza en 1.00x y aumenta continuamente</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>Retirar:</strong> Haz clic en "Retirar Ganancia" antes del crash</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>Ganancia:</strong> Apuesta × Multiplicador al momento del retiro</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>Crash:</strong> Si no retiras a tiempo, pierdes tu apuesta</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>Auto-retiro:</strong> Configura retiro automático en un multiplicador específico</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Consejos */}
                        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6">
                            <h4 className="text-lg font-bold text-white mb-3">💡 Estrategias</h4>
                            <ul className="space-y-2 text-gray-300">
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>Comienza con apuestas pequeñas hasta entender el juego</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>Usa el retiro automático para no perder oportunidades</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>Observa el historial de crashes para identificar patrones</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>No seas codicioso - retira con ganancias razonables</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>Administra tu bankroll y establece límites</span>
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