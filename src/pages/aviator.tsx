import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import Header from '../components/header';
import Footer from '../components/footer';
import { API_URL } from "../api/auth";

// ... (interfaces permanecen iguales hasta Estadisticas)

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
    const [autoRetiroActivo, setAutoRetiroActivo] = useState<boolean>(false);
    
    // Historial y estadísticas
    const [historial, setHistorial] = useState<Vuelo[]>([]);
    const [historialPublico, setHistorialPublico] = useState<HistorialPublico[]>([]);
    const [estadisticas, setEstadisticas] = useState<Estadisticas>(() => {
        const estadisticasGuardadas = localStorage.getItem('estadisticas_aviator');
        if (estadisticasGuardadas) {
            try {
                return JSON.parse(estadisticasGuardadas);
            } catch (error) {
                console.error('Error al parsear estadísticas guardadas:', error);
            }
        }
        return {
            total_vuelos: 0,
            vuelos_ganados: 0,
            vuelos_perdidos: 0,
            ganancia_total: 0,
            perdida_total: 0,
            balance: 0,
            mayor_ganancia: 0,
            multiplicador_record: 0,
        };
    });
    
    // Gráfico y animación
    const [puntosGrafico, setPuntosGrafico] = useState<Array<{x: number, y: number}>>([]);
    const [tiempoTranscurrido, setTiempoTranscurrido] = useState<number>(0);
    const [duracionTotal, setDuracionTotal] = useState<number>(0);
    
    // Refs para animación
    const animacionRef = useRef<number | null>(null);
    const tiempoInicioRef = useRef<number>(0);
    const tiempoUltimoFrameRef = useRef<number>(0);
    const multiplicadorCrashRef = useRef<number>(2.0);
    const duracionTotalRef = useRef<number>(0);
    
    // Notificación
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

    // Cargar estadísticas desde localStorage al iniciar
    useEffect(() => {
        const cargarEstadisticasGuardadas = () => {
            const estadisticasGuardadas = localStorage.getItem('estadisticas_aviator');
            if (estadisticasGuardadas) {
                try {
                    const parsed = JSON.parse(estadisticasGuardadas);
                    setEstadisticas(parsed);
                } catch (error) {
                    console.error('Error al cargar estadísticas:', error);
                }
            }
        };
        
        cargarEstadisticasGuardadas();
    }, []);

    // Guardar estadísticas en localStorage cuando cambien
    useEffect(() => {
        localStorage.setItem('estadisticas_aviator', JSON.stringify(estadisticas));
    }, [estadisticas]);

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
            try {
                const historialParsed = JSON.parse(historialGuardado);
                setHistorial(historialParsed);
            } catch (error) {
                console.error('Error al parsear historial:', error);
            }
        }
    };

    // Animación del vuelo
    useEffect(() => {
        if (estado === 'vuelo') {
            iniciarAnimacion();
        } else {
            detenerAnimacion();
        }
        
        return () => {
            detenerAnimacion();
        };
    }, [estado]);

    const iniciarAnimacion = () => {
        if (!duracionTotalRef.current || duracionTotalRef.current <= 0) {
            console.error("Duración total no válida");
            return;
        }

        detenerAnimacion();
        tiempoInicioRef.current = performance.now();
        tiempoUltimoFrameRef.current = tiempoInicioRef.current;
        setPuntosGrafico([]);
        setTiempoTranscurrido(0);
        
        const animar = (currentTime: number) => {
            if (!tiempoInicioRef.current) return;
            
            const tiempoTrans = (currentTime - tiempoInicioRef.current) / 1000;
            setTiempoTranscurrido(tiempoTrans);
            
            const progreso = Math.min(tiempoTrans / duracionTotalRef.current, 1.0);
            const progresoEased = 1 - Math.pow(1 - progreso, 3);
            
            const rango = multiplicadorCrashRef.current - 1.0;
            const multiplicadorCalculado = 1.0 + rango * progresoEased;
            const multiplicadorRedondeado = Math.round(multiplicadorCalculado * 100) / 100;
            
            setMultiplicadorActual(multiplicadorRedondeado);
            
            setPuntosGrafico(prev => {
                const nuevoPunto = { x: tiempoTrans, y: multiplicadorRedondeado };
                const nuevosPuntos = [...prev, nuevoPunto];
                return nuevosPuntos.length > 100 ? nuevosPuntos.slice(-100) : nuevosPuntos;
            });
            
            if (progreso >= 1.0) {
                setEstado('explosion');
                setMultiplicadorCrash(multiplicadorCrashRef.current);
                setMensaje(`¡CRASH! El avión explotó en ${multiplicadorCrashRef.current.toFixed(2)}x`);
                agregarAlHistorial('explosion', multiplicadorCrashRef.current, null, 0, apuestaActual);
                showMsg("¡CRASH! Perdiste tu apuesta", "error");
                detenerAnimacion();
                return;
            }
            
            if (autoRetiroActivo && multiplicadorRedondeado >= multiplicadorAuto && multiplicadorAuto > 1.0) {
                hacerCashout(multiplicadorAuto);
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
        tiempoInicioRef.current = 0;
        tiempoUltimoFrameRef.current = 0;
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

            if (!res.data || typeof res.data.duracion_total !== 'number' || 
                typeof res.data.multiplicador_crash !== 'number') {
                throw new Error("Datos inválidos recibidos del servidor");
            }

            const crashMultiplier = Math.max(1.0, Math.min(res.data.multiplicador_crash || 2.0, 500.0));
            const duracion = Math.max(0.5, Math.min(res.data.duracion_total || 5.0, 30.0));
            
            multiplicadorCrashRef.current = crashMultiplier;
            duracionTotalRef.current = duracion;
            
            setSessionId(res.data.session_id);
            setDuracionTotal(duracion);
            
            if (usuario && res.data.nuevo_saldo) {
                setUsuario(prev => prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev);
            }

            setEstado('vuelo');
            setMensaje("¡El avión despegó! Retira antes de que explote.");

        } catch (error: any) {
            console.error("Error al iniciar vuelo:", error);
            setMensaje(
                error.response?.data?.detail || 
                error.message || 
                "Error al iniciar el vuelo. Por favor, intenta nuevamente."
            );
            setEstado('esperando');
        } finally {
            setCargando(false);
        }
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
                
                if (usuario && res.data.nuevo_saldo) {
                    setUsuario(prev => prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev);
                }

                if (res.data.ganancia > apuestaActual) {
                    animarConfetti();
                }

                agregarAlHistorial('cashout', res.data.multiplicador_crash, res.data.multiplicador_retiro, res.data.ganancia, apuestaActual);
                showMsg(`¡Retiro exitoso! Ganaste $${res.data.ganancia.toFixed(2)}`, "success");
            } else {
                setEstado('explosion');
                setMultiplicadorCrash(res.data.multiplicador_crash);
                setMensaje(res.data.resultado);
                agregarAlHistorial('explosion', res.data.multiplicador_crash, null, 0, apuestaActual);
                showMsg("¡CRASH! Perdiste tu apuesta", "error");
            }

        } catch (error: any) {
            console.error("Error al retirar:", error);
            setMensaje(
                error.response?.data?.detail || "Error al retirar. Por favor, intenta nuevamente."
            );
        } finally {
            setCargando(false);
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
        
        actualizarEstadisticasConVuelo(nuevoVuelo);
    };

    const actualizarEstadisticasConVuelo = (vuelo: Vuelo) => {
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

    const actualizarEstadisticasDesdeHistorial = () => {
        if (historial.length === 0) {
            showMsg("No hay historial para actualizar", "info");
            return;
        }

        const ultimaPartida = historial[0];
        
        const esVictoria = ultimaPartida.resultado === 'cashout';
        const nuevaGanancia = esVictoria ? ultimaPartida.ganancia : 0;
        const nuevaPerdida = esVictoria ? 0 : ultimaPartida.apuesta;
        const nuevoBalance = nuevaGanancia - nuevaPerdida;
        
        const nuevasEstadisticas = {
            total_vuelos: 1,
            vuelos_ganados: esVictoria ? 1 : 0,
            vuelos_perdidos: esVictoria ? 0 : 1,
            ganancia_total: nuevaGanancia,
            perdida_total: nuevaPerdida,
            balance: nuevoBalance,
            mayor_ganancia: nuevaGanancia,
            multiplicador_record: ultimaPartida.multiplicador_retiro || 0
        };
        
        setEstadisticas(nuevasEstadisticas);
        showMsg("Estadísticas actualizadas con la última partida", "success");
    };

    const restablecerEstadisticas = () => {
        if (window.confirm("¿Estás seguro de que quieres restablecer todas las estadísticas a cero?")) {
            const estadisticasIniciales = {
                total_vuelos: 0,
                vuelos_ganados: 0,
                vuelos_perdidos: 0,
                ganancia_total: 0,
                perdida_total: 0,
                balance: 0,
                mayor_ganancia: 0,
                multiplicador_record: 0,
            };
            
            setEstadisticas(estadisticasIniciales);
            showMsg("Estadísticas restablecidas a cero", "info");
        }
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
        setDuracionTotal(0);
        setApuestaActual(0);
        setAutoRetiroActivo(false);
        multiplicadorCrashRef.current = 2.0;
        duracionTotalRef.current = 0;
        tiempoInicioRef.current = 0;
        tiempoUltimoFrameRef.current = 0;
    };

    const configurarAutoretiro = async () => {
        if (!sessionId || estado !== 'vuelo') {
            setAutoRetiroActivo(!autoRetiroActivo);
            showMsg(`Retiro automático ${!autoRetiroActivo ? 'activado' : 'desactivado'} en ${multiplicadorAuto}x`, "info");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/aviator/${sessionId}/configurar-autoretiro?multiplicador_auto=${multiplicadorAuto}&activar=${!autoRetiroActivo}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setAutoRetiroActivo(!autoRetiroActivo);
            showMsg(res.data.mensaje, "success");
        } catch (error) {
            console.error("Error al configurar autoretiro:", error);
        }
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const limpiarHistorial = () => {
        if (window.confirm("¿Estás seguro de que quieres limpiar el historial?")) {
            setHistorial([]);
            localStorage.removeItem('historial_aviator');
            showMsg("Historial limpiado", "info");
        }
    };

    const cerrarSesion = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        localStorage.removeItem("historial_aviator");
        localStorage.removeItem("estadisticas_aviator");
        setUsuario(null);
        showMsg("Sesión cerrada correctamente", "success");
        setTimeout(() => navigate('/login'), 1500);
    };

    const formatearTiempo = (segundos: number) => {
        if (segundos < 0) return "0.0s";
        return `${Math.max(0, segundos).toFixed(1)}s`;
    };

    // Componente de avión 3D
    const Avion3D = ({ posicionX = 10, estaVolando = false }) => {
        return (
            <div 
                className="absolute bottom-4 transform transition-all duration-300"
                style={{ 
                    left: `${posicionX}%`,
                    transform: `translateX(-50%) perspective(1000px) rotateX(${estaVolando ? '20deg' : '0deg'}) rotateY(${estaVolando ? '-5deg' : '0deg'})`,
                    transition: 'all 0.3s ease-out'
                }}
            >
                <div className="relative">
                    {/* Cuerpo principal del avión */}
                    <div className="w-16 h-6 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg shadow-lg relative z-10">
                        {/* Alas */}
                        <div className="absolute -top-3 -left-2 w-20 h-4 bg-gradient-to-r from-blue-700 to-blue-800 rounded-lg"></div>
                        <div className="absolute -bottom-3 -left-2 w-20 h-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg"></div>
                        
                        {/* Cabina */}
                        <div className="absolute top-0 left-6 w-6 h-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-t-lg"></div>
                        
                        {/* Motor */}
                        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-8 bg-gradient-to-r from-red-600 to-orange-500 rounded-lg"></div>
                        
                        {/* Hélices */}
                        <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 w-6 h-6">
                            <div className="absolute inset-0 rounded-full bg-yellow-500 animate-spin" style={{ animationDuration: '0.3s' }}>
                                <div className="absolute inset-1 rounded-full bg-yellow-600"></div>
                            </div>
                            <div className="absolute top-1/2 left-1/2 w-8 h-1 bg-yellow-700 transform -translate-x-1/2 -translate-y-1/2 rotate-0"></div>
                            <div className="absolute top-1/2 left-1/2 w-8 h-1 bg-yellow-700 transform -translate-x-1/2 -translate-y-1/2 rotate-90"></div>
                        </div>
                        
                        {/* Ventanas */}
                        <div className="absolute top-1 left-2 w-2 h-2 bg-cyan-300 rounded-full"></div>
                        <div className="absolute top-1 left-4 w-2 h-2 bg-cyan-300 rounded-full"></div>
                        
                        {/* Estela de humo durante el vuelo */}
                        {estaVolando && (
                            <div className="absolute -right-8 top-1/2 transform -translate-y-1/2">
                                <div className="flex space-x-1">
                                    <div className="w-4 h-2 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                                    <div className="w-6 h-3 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-8 h-4 bg-white/10 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Sombra del avión */}
                    <div 
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-3 bg-black/20 blur-sm rounded-full"
                        style={{ transform: `translateX(-50%) scale(${1 - (posicionX - 10) / 100})` }}
                    ></div>
                </div>
            </div>
        );
    };

    const renderAvion = () => {
        const progreso = duracionTotal > 0 ? Math.min(tiempoTranscurrido / duracionTotal, 1) : 0;
        const posicionX = 10 + (progreso * 90);
        const estaVolando = estado === 'vuelo';
        
        return (
            <div className="relative w-full h-64 bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl overflow-hidden">
                {/* Fondo con perspectiva 3D */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-purple-900/20 to-transparent">
                    {/* Horizonte */}
                    <div className="absolute bottom-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    
                    {/* Montañas en el fondo */}
                    <div className="absolute bottom-0 left-0 right-0 h-32">
                        <div className="absolute bottom-0 left-0 w-64 h-24 bg-gradient-to-r from-blue-900/40 to-purple-900/40 clip-path-polygon"></div>
                        <div className="absolute bottom-0 right-0 w-48 h-20 bg-gradient-to-l from-indigo-900/40 to-purple-900/40 clip-path-polygon-reverse"></div>
                    </div>
                    
                    {/* Nubes en 3D */}
                    <div className="absolute top-8 left-8 w-16 h-8 bg-white/10 rounded-full blur-sm transform rotate-12"></div>
                    <div className="absolute top-12 right-12 w-20 h-10 bg-white/15 rounded-full blur-sm transform -rotate-6"></div>
                    <div className="absolute top-20 left-1/3 w-24 h-12 bg-white/20 rounded-full blur-sm transform rotate-3"></div>
                </div>
                
                {/* Pista de despegue con perspectiva */}
                <div className="absolute bottom-0 left-0 right-0 h-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-900/40 via-yellow-800/50 to-yellow-900/40 transform perspective(500px) rotateX(60deg) origin-bottom"></div>
                    {/* Líneas de la pista */}
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
                    <div className="absolute top-1/2 left-1/4 w-8 h-1 bg-yellow-400/70"></div>
                    <div className="absolute top-1/2 left-2/4 w-8 h-1 bg-yellow-400/70"></div>
                    <div className="absolute top-1/2 left-3/4 w-8 h-1 bg-yellow-400/70"></div>
                </div>
                
                {/* Avión 3D */}
                <Avion3D posicionX={posicionX} estaVolando={estaVolando} />
                
                {/* Indicador de multiplicador flotante */}
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-blue-500/30 transform perspective(500px) rotateY(-5deg)">
                    <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">MULTIPLICADOR</div>
                        <div className={`text-3xl font-bold ${
                            multiplicadorActual >= 100 ? 'text-green-400 animate-pulse' :
                            multiplicadorActual >= 50 ? 'text-yellow-400' :
                            multiplicadorActual >= 10 ? 'text-blue-400' :
                            'text-white'
                        }`}>
                            {multiplicadorActual.toFixed(2)}<span className="text-lg">x</span>
                        </div>
                    </div>
                </div>
                
                {/* Indicadores de tiempo */}
                <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1 text-xs text-gray-300 transform perspective(500px) rotateY(5deg)">
                    Tiempo: {formatearTiempo(tiempoTranscurrido)}
                </div>
                
                {duracionTotal > 0 && estado === 'vuelo' && (
                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1 text-xs text-gray-300">
                        Duración: {formatearTiempo(duracionTotal)}
                    </div>
                )}
            </div>
        );
    };

    const renderGrafico = () => {
        if (estado === 'esperando') {
            return (
                <div className="w-full h-64 bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl flex items-center justify-center perspective(1000px)">
                    <div className="text-center transform rotateY(5deg)">
                        <div className="relative mb-4">
                            <Avion3D posicionX={50} estaVolando={false} />
                        </div>
                        <p className="text-gray-400 text-lg">Esperando despegue...</p>
                        <p className="text-gray-500 text-sm mt-2">Selecciona tu apuesta y presiona "Iniciar Vuelo"</p>
                    </div>
                </div>
            );
        }

        if (puntosGrafico.length === 0) {
            return renderAvion();
        }

        const maxX = Math.max(Math.min(Math.max(...puntosGrafico.map(p => p.x), duracionTotal || 10), 30), 1);
        const maxY = Math.max(Math.min(Math.max(...puntosGrafico.map(p => p.y), multiplicadorCrashRef.current || 5), 500), 2);
        
        const escalaX = (x: number) => (Math.min(x, maxX) / maxX) * 100;
        const escalaY = (y: number) => 100 - ((Math.min(y, maxY) - 1) / (maxY - 1)) * 85;

        const puntosSVG = puntosGrafico.map((p, i) => {
            const x = escalaX(p.x);
            const y = escalaY(p.y);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        return (
            <div className="w-full h-64 bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl relative overflow-hidden perspective(1000px)">
                {/* Fondo con profundidad */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-purple-900/10 to-transparent transform rotateX(15deg) origin-bottom"></div>
                
                <div className="absolute inset-0">
                    {[1, 2, 5, 10, 20, 50, 100, 200, 500].filter(y => y <= maxY).map(y => (
                        <div 
                            key={y} 
                            className="absolute left-0 right-0 border-t border-gray-700/30 transform perspective(500px) rotateX(15deg)" 
                            style={{ bottom: `${escalaY(y)}%` }}
                        >
                            <span className="absolute left-2 -top-3 text-xs text-gray-500 transform rotateY(-15deg)">{y}x</span>
                        </div>
                    ))}
                </div>
                
                {autoRetiroActivo && multiplicadorAuto > 1.0 && multiplicadorAuto <= maxY && (
                    <div 
                        className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-500/70 transform perspective(500px) rotateX(15deg)" 
                        style={{ bottom: `${escalaY(multiplicadorAuto)}%` }}
                    >
                        <div className="absolute right-2 -top-6 bg-yellow-900/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-yellow-300 font-bold transform rotateY(-10deg)">
                            AUTO: {multiplicadorAuto.toFixed(1)}x
                        </div>
                    </div>
                )}
                
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    <path 
                        d={puntosSVG} 
                        fill="none" 
                        stroke="url(#lineGradient)" 
                        strokeWidth="3"
                        filter="url(#glow)"
                    />
                </svg>
                
                {/* Avión 3D sobre el gráfico */}
                {puntosGrafico.length > 0 && (
                    <div 
                        className="absolute transform -translate-x-1/2 translate-y-1/2"
                        style={{ 
                            left: `${escalaX(puntosGrafico[puntosGrafico.length-1].x)}%`,
                            bottom: `${escalaY(puntosGrafico[puntosGrafico.length-1].y)}%`,
                            transform: 'translate(-50%, 50%) perspective(1000px) rotateX(20deg) rotateY(-10deg)'
                        }}
                    >
                        <div className="relative">
                            <div className="w-8 h-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg transform rotate-45"></div>
                            <div className="absolute -top-1 -left-1 w-10 h-2 bg-blue-500/50 rounded-lg transform rotate-12"></div>
                        </div>
                    </div>
                )}
                
                <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1 text-xs text-gray-300 transform perspective(500px) rotateY(5deg)">
                    {formatearTiempo(tiempoTranscurrido)} / {formatearTiempo(duracionTotal)}
                </div>
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

            <Header 
                usuario={usuario}
                cerrarSesion={cerrarSesion}
                setUsuario={setUsuario}
            />

            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
                
                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6 animate-bounce perspective(1000px)">
                            <span className="px-6 py-3 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 border border-blue-500/30 rounded-full text-lg font-bold text-blue-400 backdrop-blur-sm transform rotateY(10deg)">
                                ✈️ AVIATOR 3D ELITE 🚀
                            </span>
                        </div>
                        
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 transform perspective(1000px) rotateX(5deg)">
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                ¡Aviator 3D Pro!
                            </span>
                            <br />
                            <span className="text-white text-3xl">Experiencia de vuelo inmersiva</span>
                        </h1>
                        
                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto transform perspective(1000px) rotateY(-5deg)">
                            Multiplicadores de hasta <span className="text-yellow-400 font-bold">500x</span> 
                            <span className="text-pink-400"> • </span>
                            Gráficos 3D realistas 
                            <span className="text-pink-400"> • </span>
                            Retiro automático inteligente
                        </p>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-2xl transform perspective(1000px) rotateY(-1deg)">
                            <div className="mb-6">
                                {estado === 'vuelo' ? renderGrafico() : renderAvion()}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: "Multiplicador", value: `${multiplicadorActual.toFixed(2)}x`, color: multiplicadorActual >= 100 ? 'text-green-400' : multiplicadorActual >= 50 ? 'text-yellow-400' : multiplicadorActual >= 10 ? 'text-blue-400' : 'text-white' },
                                    { label: "Tiempo", value: formatearTiempo(tiempoTranscurrido), color: "text-white" },
                                    { label: "Apuesta", value: `$${apuestaActual > 0 ? apuestaActual.toLocaleString() : '0'}`, color: "text-yellow-400" },
                                    { label: "Ganancia", value: `$${ganancia > 0 ? ganancia.toFixed(2) : '0.00'}`, color: ganancia > 0 ? 'text-green-400' : 'text-gray-400' }
                                ].map((item, index) => (
                                    <div key={index} className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50 transform perspective(500px) rotateY(5deg)">
                                        <div className="text-sm text-gray-400">{item.label}</div>
                                        <div className={`text-3xl font-bold ${item.color}`}>
                                            {item.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {estado === 'esperando' ? (
                                <div className="mb-8 transform perspective(1000px) rotateY(2deg)">
                                    <h3 className="text-xl font-bold text-white mb-4 text-center">💰 Selecciona tu apuesta</h3>
                                    <div className="flex gap-3 justify-center flex-wrap mb-6">
                                        {apuestasPermitidas.map((apuesta) => (
                                            <button
                                                key={apuesta}
                                                onClick={() => setApuestaSeleccionada(apuesta)}
                                                disabled={usuario.saldo < apuesta}
                                                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                                                    apuestaSeleccionada === apuesta
                                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                                                        : usuario.saldo < apuesta
                                                        ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                                                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70'
                                                }`}
                                            >
                                                ${apuesta.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="bg-gray-800/30 rounded-xl p-4 mb-4 border border-gray-700/50 transform perspective(500px) rotateY(-3deg)">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-yellow-400">⚡</span>
                                                <span className="text-white font-bold">Retiro Automático</span>
                                            </div>
                                            <button
                                                onClick={() => setAutoRetiroActivo(!autoRetiroActivo)}
                                                className={`px-4 py-1 rounded-full text-sm font-bold transform transition-all duration-300 ${
                                                    autoRetiroActivo
                                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                            >
                                                {autoRetiroActivo ? 'ACTIVADO' : 'DESACTIVADO'}
                                            </button>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-gray-400 mb-2 text-sm">
                                                Multiplicador: <span className="text-yellow-400">{multiplicadorAuto.toFixed(1)}x</span>
                                            </label>
                                            <div className="flex items-center space-x-4">
                                                <input
                                                    type="range"
                                                    min="1.1"
                                                    max="100"
                                                    step="0.1"
                                                    value={multiplicadorAuto}
                                                    onChange={(e) => setMultiplicadorAuto(parseFloat(e.target.value))}
                                                    className="flex-1 h-2 bg-gray-700 rounded-lg accent-yellow-500 transform perspective(500px) rotateY(2deg)"
                                                />
                                                <span className="text-white font-bold w-16 text-center bg-gray-800/50 px-3 py-1 rounded-lg transform perspective(500px) rotateY(-5deg)">
                                                    {multiplicadorAuto.toFixed(1)}x
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6 text-center">
                                    <div className="text-xl text-white transform perspective(500px) rotateY(3deg)">
                                        Saldo: <span className="text-yellow-400 font-bold">${usuario?.saldo?.toFixed(2) ?? '0.00'}</span>
                                    </div>
                                </div>
                            )}

                            {mensaje && (
                                <div className={`px-6 py-4 rounded-xl font-bold mb-6 text-center transform perspective(500px) rotateY(2deg) ${
                                    mensaje.includes("CRASH")
                                        ? "bg-red-900/60 text-red-200" 
                                        : mensaje.includes("Ganaste")
                                        ? "bg-green-900/60 text-green-200"
                                        : "bg-gray-900/60 text-gray-200"
                                }`}>
                                    {mensaje}
                                </div>
                            )}

                            <div className="text-center">
                                {estado === 'esperando' && (
                                    <button
                                        onClick={iniciarVuelo}
                                        disabled={cargando || !usuario || usuario.saldo < apuestaSeleccionada}
                                        className={`w-full py-5 px-8 rounded-xl font-bold text-xl transform transition-all duration-300 hover:scale-105 perspective(1000px) rotateY(2deg) ${
                                            cargando || !usuario || usuario.saldo < apuestaSeleccionada
                                                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-xl'
                                        }`}
                                    >
                                        {cargando ? 'Preparando...' : `✈️ INICIAR VUELO ($${apuestaSeleccionada.toLocaleString()})`}
                                    </button>
                                )}

                                {estado === 'vuelo' && (
                                    <div className="flex gap-4 transform perspective(1000px) rotateY(-2deg)">
                                        <button
                                            onClick={() => hacerCashout(multiplicadorActual)}
                                            disabled={cargando}
                                            className="flex-1 py-4 px-6 rounded-xl font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105 transition-all duration-300"
                                        >
                                            💰 RETIRAR ({multiplicadorActual.toFixed(2)}x)
                                        </button>

                                        <button
                                            onClick={configurarAutoretiro}
                                            disabled={cargando}
                                            className={`py-4 px-6 rounded-xl font-bold transition-all duration-300 ${
                                                autoRetiroActivo
                                                    ? 'bg-yellow-600 hover:bg-yellow-700'
                                                    : 'bg-gray-700 hover:bg-gray-600'
                                            }`}
                                        >
                                            ⚡ {multiplicadorAuto.toFixed(1)}x
                                        </button>
                                    </div>
                                )}

                                {(estado === 'cashout' || estado === 'explosion') && (
                                    <div className="space-y-4 transform perspective(1000px) rotateY(3deg)">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-800/40 rounded-xl transform perspective(500px) rotateY(5deg)">
                                                <div className="text-sm text-gray-400">Crash</div>
                                                <div className="text-2xl font-bold text-red-400">
                                                    {multiplicadorCrash?.toFixed(2)}x
                                                </div>
                                            </div>
                                            <div className="p-4 bg-gray-800/40 rounded-xl transform perspective(500px) rotateY(-5deg)">
                                                <div className="text-sm text-gray-400">Tu Retiro</div>
                                                <div className="text-2xl font-bold text-green-400">
                                                    {multiplicadorRetiro ? `${multiplicadorRetiro.toFixed(2)}x` : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={reiniciarJuego}
                                            className="w-full py-5 rounded-xl font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105 transition-all duration-300"
                                        >
                                            ✈️ NUEVO VUELO
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 transform perspective(1000px) rotateY(2deg)">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white">📊 Estadísticas</h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={actualizarEstadisticasDesdeHistorial}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold transition-all duration-300 transform hover:scale-105"
                                    >
                                        🔄 Actualizar
                                    </button>
                                    <button
                                        onClick={restablecerEstadisticas}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-all duration-300 transform hover:scale-105"
                                    >
                                        🗑️ Restablecer
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "Vuelos", value: estadisticas.total_vuelos, color: "text-blue-400" },
                                    { label: "Ganados", value: estadisticas.vuelos_ganados, color: "text-green-400" },
                                    { label: "Balance", value: `$${estadisticas.balance.toFixed(2)}`, color: estadisticas.balance >= 0 ? 'text-green-400' : 'text-red-400' },
                                    { label: "Record", value: `${estadisticas.multiplicador_record.toFixed(2)}x`, color: "text-yellow-400" }
                                ].map((stat, index) => (
                                    <div key={index} className="text-center p-4 bg-gray-800/40 rounded-xl transform perspective(500px) rotateY(index % 2 ? 5 : -5)">
                                        <div className="text-sm text-gray-400">{stat.label}</div>
                                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                                    </div>
                                ))}
                                
                                <div className="col-span-2 grid grid-cols-2 gap-4 mt-2">
                                    <div className="text-center p-3 bg-gray-800/40 rounded-xl transform perspective(500px) rotateY(3deg)">
                                        <div className="text-sm text-gray-400">Ganancia Total</div>
                                        <div className="text-lg font-bold text-green-400">
                                            ${estadisticas.ganancia_total.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-800/40 rounded-xl transform perspective(500px) rotateY(-3deg)">
                                        <div className="text-sm text-gray-400">Pérdida Total</div>
                                        <div className="text-lg font-bold text-red-400">
                                            ${estadisticas.perdida_total.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="col-span-2 text-center mt-2">
                                    <div className="text-xs text-gray-500">
                                        {estadisticas.total_vuelos > 0 ? 
                                            `Última actualización: ${new Date().toLocaleTimeString()}` : 
                                            "Sin datos guardados"
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 transform perspective(1000px) rotateY(-2deg)">
                            <div className="flex justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">📝 Historial</h3>
                                {historial.length > 0 && (
                                    <button
                                        onClick={limpiarHistorial}
                                        className="text-sm text-red-400 hover:text-red-300 transition-colors duration-300"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                            
                            {historial.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="relative mb-3">
                                        <Avion3D posicionX={50} estaVolando={false} />
                                    </div>
                                    <p className="text-gray-400">Sin vuelos</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {historial.map((vuelo) => (
                                        <div key={vuelo.id} className="p-3 bg-gray-800/40 rounded-lg transform perspective(500px) rotateY(2deg) transition-transform duration-300 hover:rotateY(0)">
                                            <div className="flex justify-between">
                                                <div>
                                                    <span className={vuelo.ganancia > 0 ? 'text-green-400' : 'text-red-400'}>
                                                        {vuelo.resultado === 'cashout' ? '💰' : '💥'} {vuelo.resultado === 'cashout' ? 'Ganado' : 'Perdido'}
                                                    </span>
                                                    <div className="text-xs text-gray-400">{vuelo.fecha}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-bold ${vuelo.ganancia > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {vuelo.ganancia > 0 ? `+$${vuelo.ganancia.toFixed(2)}` : `-$${vuelo.apuesta}`}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {vuelo.multiplicador_retiro ? `${vuelo.multiplicador_retiro.toFixed(2)}x` : `Crash: ${vuelo.multiplicador_crash.toFixed(2)}x`}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
            
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotateX(20deg) rotateY(-5deg); }
                    50% { transform: translateY(-5px) rotateX(25deg) rotateY(-3deg); }
                }
                
                @keyframes propeller {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .animate-slideIn { animation: slideIn 0.3s ease-out; }
                .animate-float { animation: float 2s ease-in-out infinite; }
                .animate-propeller { animation: propeller 0.3s linear infinite; }
                
                .clip-path-polygon {
                    clip-path: polygon(0% 100%, 100% 100%, 80% 0%, 20% 0%);
                }
                
                .clip-path-polygon-reverse {
                    clip-path: polygon(0% 100%, 100% 100%, 100% 0%, 20% 0%);
                }
                
                /* Estilos 3D mejorados */
                .perspective-1000 {
                    perspective: 1000px;
                }
                
                .transform-3d {
                    transform-style: preserve-3d;
                }
                
                /* Sombra 3D para los botones */
                .shadow-3d {
                    box-shadow: 
                        0 10px 20px rgba(0, 0, 0, 0.3),
                        0 6px 6px rgba(0, 0, 0, 0.2),
                        inset 0 -2px 5px rgba(255, 255, 255, 0.1),
                        inset 0 2px 5px rgba(0, 0, 0, 0.2);
                }
                
                /* Efecto de brillo para elementos importantes */
                .glow {
                    filter: drop-shadow(0 0 8px currentColor);
                }
                
                /* Gradiente animado para el avión */
                @keyframes jetGlow {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; }
                }
                
                .jet-glow {
                    animation: jetGlow 1s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}