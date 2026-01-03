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
    const [autoRetiroActivo, setAutoRetiroActivo] = useState<boolean>(false);
    
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
    
    // Gráfico y animación
    const [puntosGrafico, setPuntosGrafico] = useState<Array<{x: number, y: number}>>([]);
    const [tiempoTranscurrido, setTiempoTranscurrido] = useState<number>(0);
    const [duracionTotal, setDuracionTotal] = useState<number>(0);
    const [animacionCompleta, setAnimacionCompleta] = useState<boolean>(false);
    
    // Refs para animación
    const animacionRef = useRef<number | null>(null);
    const tiempoInicioRef = useRef<number>(0);
    const multiplicadorCrashRef = useRef<number | null>(null);
    const duracionTotalRef = useRef<number>(0);
    
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
        if (estado === 'vuelo' && tiempoInicioRef.current) {
            iniciarAnimacion();
        } else {
            detenerAnimacion();
        }
        
        return () => {
            detenerAnimacion();
        };
    }, [estado]);

    const calcularDuracionAnimacion = (multiplier: number): number => {
        if (multiplier <= 1.0) return 0.5;
        if (multiplier <= 1.5) {
            return 0.5 + (multiplier - 1.0) * 1.0;
        }
        // Interpolación lineal desde 1.0s en 1.5x hasta 60s en 500x
        const base = 1.0;
        const slope = (60.0 - 1.0) / (500.0 - 1.5);
        return base + (multiplier - 1.5) * slope;
    };

    const iniciarAnimacion = () => {
        tiempoInicioRef.current = Date.now();
        setAnimacionCompleta(false);
        
        const animar = () => {
            if (!tiempoInicioRef.current || !multiplicadorCrashRef.current) return;
            
            const ahora = Date.now();
            const tiempoTrans = (ahora - tiempoInicioRef.current) / 1000; // Segundos
            
            setTiempoTranscurrido(tiempoTrans);
            
            // Calcular progreso basado en tiempo
            const t = duracionTotalRef.current > 0 ? Math.min(tiempoTrans / duracionTotalRef.current, 1.0) : 0;
            
            // Función de easing para curva natural
            let progreso = 0;
            if (t < 0.7) {
                // Crecimiento rápido al inicio
                progreso = 1 - Math.pow(1 - t, 2);
            } else {
                // Desaceleración al final
                const base = 1 - Math.pow(1 - 0.7, 2); // ~0.91
                progreso = base + ((t - 0.7) / 0.3) * (1 - base);
            }
            
            // Calcular multiplicador actual
            const multiplicadorCalculado = 1.0 + (multiplicadorCrashRef.current - 1.0) * progreso;
            const multiplicadorRedondeado = Math.round(multiplicadorCalculado * 100) / 100;
            
            setMultiplicadorActual(multiplicadorRedondeado);
            
            // Actualizar gráfico (más puntos para animación suave)
            setPuntosGrafico(prev => {
                const nuevoPunto = { x: tiempoTrans, y: multiplicadorRedondeado };
                const nuevosPuntos = [...prev, nuevoPunto];
                // Mantener puntos en función de la duración
                if (nuevosPuntos.length > 200) {
                    return nuevosPuntos.slice(-200);
                }
                return nuevosPuntos;
            });
            
            // Verificar si alcanzó el final
            if (t >= 1.0) {
                setAnimacionCompleta(true);
                setEstado('explosion');
                setMultiplicadorCrash(multiplicadorCrashRef.current);
                setMensaje(`¡CRASH! El avión explotó en ${multiplicadorCrashRef.current.toFixed(2)}x`);
                agregarAlHistorial('explosion', multiplicadorCrashRef.current, null, 0, apuestaActual);
                showMsg("¡CRASH! Perdiste tu apuesta", "error");
                
                if (animacionRef.current) {
                    cancelAnimationFrame(animacionRef.current);
                }
                return;
            }
            
            // Verificar retiro automático
            if (autoRetiroActivo && multiplicadorRedondeado >= multiplicadorAuto && multiplicadorAuto > 1.0) {
                hacerCashout(multiplicadorAuto);
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
        setAnimacionCompleta(false);
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
            setDuracionTotal(res.data.duracion_total || calcularDuracionAnimacion(2.0));
            
            // Guardar referencia del multiplicador crash
            multiplicadorCrashRef.current = res.data.multiplicador_crash || 2.0;
            duracionTotalRef.current = res.data.duracion_total || calcularDuracionAnimacion(multiplicadorCrashRef.current);

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

            if (res.data.estado !== 'vuelo') {
                detenerAnimacion();
                setEstado(res.data.estado);
                setMultiplicadorCrash(res.data.multiplicador_crash);
                setMultiplicadorRetiro(res.data.multiplicador_retiro);
                
                if (res.data.estado === 'explosion') {
                    setMensaje(`¡CRASH! El avión explotó en ${res.data.multiplicador_crash?.toFixed(2)}x`);
                    agregarAlHistorial('explosion', res.data.multiplicador_crash, null, 0, apuestaActual);
                    showMsg("¡CRASH! Perdiste tu apuesta", "error");
                } else if (res.data.estado === 'cashout') {
                    setGanancia(res.data.ganancia || 0);
                    setMensaje(res.data.resultado || "Retiro exitoso");
                    if (res.data.ganancia > apuestaActual) {
                        animarConfetti();
                    }
                    agregarAlHistorial('cashout', res.data.multiplicador_crash, res.data.multiplicador_retiro, res.data.ganancia || 0, apuestaActual);
                    showMsg(`¡Retiro ${res.data.auto_retiro ? 'automático' : 'manual'}! Ganaste $${(res.data.ganancia || 0).toFixed(2)}`, "success");
                    
                    // Actualizar saldo
                    if (res.data.nuevo_saldo && usuario) {
                        setUsuario({ ...usuario, saldo: res.data.nuevo_saldo });
                    }
                }
            } else {
                // Actualizar multiplicador actual desde el backend
                setMultiplicadorActual(res.data.multiplicador_actual || 1.0);
                setTiempoTranscurrido(res.data.tiempo_transcurrido || 0);
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
        setDuracionTotal(0);
        setAnimacionCompleta(false);
        setApuestaActual(0);
        setAutoRetiroActivo(false);
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
        setHistorial([]);
        localStorage.removeItem('historial_aviator');
        showMsg("Historial limpiado", "info");
    };

    const cerrarSesion = () => {
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

    // Renderizar avión animado
    const renderAvion = () => {
        const progreso = duracionTotal > 0 ? Math.min(tiempoTranscurrido / duracionTotal, 1) : 0;
        const posicionX = progreso * 100;
        
        return (
            <div className="relative w-full h-64 bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl overflow-hidden">
                {/* Fondo del cielo */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-purple-900/10"></div>
                
                {/* Nubes */}
                <div className="absolute top-4 left-8 w-16 h-8 bg-white/10 rounded-full blur-sm"></div>
                <div className="absolute top-10 right-12 w-20 h-10 bg-white/15 rounded-full blur-sm"></div>
                <div className="absolute bottom-16 left-1/4 w-24 h-12 bg-white/20 rounded-full blur-sm"></div>
                
                {/* Pista de despegue */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500/30 to-yellow-600/40"></div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                
                {/* Marcas en la pista */}
                {[0, 20, 40, 60, 80].map(pos => (
                    <div 
                        key={pos}
                        className="absolute bottom-1 w-4 h-0.5 bg-white/50"
                        style={{ left: `${pos}%` }}
                    ></div>
                ))}
                
                {/* Avión */}
                <div 
                    className="absolute bottom-2 transform -translate-x-1/2 transition-all duration-300"
                    style={{ left: `${posicionX}%` }}
                >
                    {/* Cuerpo del avión */}
                    <div className="relative">
                        {/* Fuselaje */}
                        <div className="w-16 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg"></div>
                        
                        {/* Ala principal */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-3 bg-gradient-to-r from-blue-600/80 to-blue-700/80 rounded-sm"></div>
                        
                        {/* Ala trasera */}
                        <div className="absolute top-1 left-4 w-8 h-2 bg-gradient-to-r from-blue-700 to-blue-800 rounded-sm"></div>
                        
                        {/* Motor */}
                        <div className="absolute top-1 left-12 w-6 h-4 bg-gradient-to-r from-gray-700 to-gray-800 rounded"></div>
                        
                        {/* Ventana */}
                        <div className="absolute top-1 left-4 w-2 h-2 bg-blue-300 rounded-full"></div>
                        
                        {/* Estela */}
                        <div className="absolute top-1/2 left-full transform -translate-y-1/2">
                            <div className="w-8 h-1 bg-gradient-to-r from-blue-400/50 to-transparent"></div>
                        </div>
                        
                        {/* Efecto de velocidad */}
                        {estado === 'vuelo' && (
                            <div className="absolute top-1/2 left-full transform -translate-y-1/2">
                                <div className="w-12 h-2 bg-gradient-to-r from-blue-300/30 via-blue-200/20 to-transparent blur-sm"></div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Indicador de altura (multiplicador) */}
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-lg p-2 border border-blue-500/30">
                    <div className="text-center">
                        <div className="text-xs text-gray-400">ALTITUD</div>
                        <div className={`text-2xl font-bold ${
                            multiplicadorActual >= 100 ? 'text-green-400 animate-pulse' :
                            multiplicadorActual >= 50 ? 'text-yellow-400' :
                            multiplicadorActual >= 10 ? 'text-blue-400' :
                            'text-white'
                        }`}>
                            {multiplicadorActual.toFixed(2)}<span className="text-sm">x</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            {estado === 'vuelo' ? 'ASCENDIENDO' : estado === 'cashout' ? 'ATERRIZAJE' : '¡EXPLOTÓ!'}
                        </div>
                    </div>
                </div>
                
                {/* Barra de progreso */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${posicionX}%` }}
                    ></div>
                </div>
                
                {/* Indicador de crash */}
                {multiplicadorCrashRef.current && (
                    <div 
                        className="absolute bottom-2 w-1 h-8 bg-red-500 animate-pulse"
                        style={{ left: `${100}%` }}
                    >
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-red-400 font-bold whitespace-nowrap">
                            CRASH: {multiplicadorCrashRef.current.toFixed(2)}x
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Renderizar gráfico mejorado
    const renderGrafico = () => {
        if (estado === 'esperando') {
            return (
                <div className="w-full h-64 bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
                    <div className="text-center relative z-10">
                        <div className="text-6xl mb-4 animate-bounce">✈️</div>
                        <p className="text-gray-400 text-lg">Esperando despegue...</p>
                        <p className="text-gray-500 text-sm mt-2">Selecciona tu apuesta y presiona "Iniciar Vuelo"</p>
                    </div>
                </div>
            );
        }

        if (puntosGrafico.length === 0) {
            return renderAvion();
        }

        // Calcular escalas
        const maxX = Math.max(...puntosGrafico.map(p => p.x), duracionTotal || 30);
        const maxY = Math.max(...puntosGrafico.map(p => p.y), multiplicadorCrashRef.current || 5, multiplicadorAuto);
        
        const escalaX = (x: number) => (x / maxX) * 100;
        const escalaY = (y: number) => 100 - (y / maxY) * 85; // 15% de margen inferior

        const puntosSVG = puntosGrafico.map((p, i) => {
            const x = escalaX(p.x);
            const y = escalaY(p.y);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        return (
            <div className="w-full h-64 bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl relative overflow-hidden">
                {/* Fondo de gradiente */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-transparent to-purple-900/10"></div>
                
                {/* Grid */}
                <div className="absolute inset-0">
                    {/* Líneas horizontales */}
                    {[1, 2, 5, 10, 20, 50, 100, 200, 500].filter(y => y <= maxY).map(y => (
                        <div 
                            key={y} 
                            className="absolute left-0 right-0 border-t border-gray-700/30" 
                            style={{ bottom: `${escalaY(y)}%` }}
                        >
                            <span className="absolute left-2 top-1 text-xs text-gray-500">{y}x</span>
                        </div>
                    ))}
                </div>
                
                {/* Línea de auto-retiro */}
                {autoRetiroActivo && multiplicadorAuto > 1.0 && (
                    <div 
                        className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-500/70" 
                        style={{ bottom: `${escalaY(multiplicadorAuto)}%` }}
                    >
                        <div className="absolute right-2 -top-6 bg-yellow-900/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-yellow-300 font-bold">
                            AUTO: {multiplicadorAuto.toFixed(1)}x
                        </div>
                    </div>
                )}
                
                {/* Línea del gráfico */}
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
                    <path 
                        d={puntosSVG} 
                        fill="none" 
                        stroke="rgba(59, 130, 246, 0.3)" 
                        strokeWidth="6" 
                        strokeLinecap="round"
                    />
                </svg>
                
                {/* Punto actual con efecto de luz */}
                {puntosGrafico.length > 0 && (
                    <div 
                        className="absolute w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-blue-500 border-2 border-white shadow-lg shadow-green-500/50"
                        style={{ 
                            left: `${escalaX(puntosGrafico[puntosGrafico.length-1].x)}%`,
                            bottom: `${escalaY(puntosGrafico[puntosGrafico.length-1].y)}%`,
                            transform: 'translate(-50%, 50%)'
                        }}
                    >
                        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30"></div>
                    </div>
                )}
                
                {/* Información de tiempo */}
                <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1 text-xs text-gray-300">
                    Tiempo: {formatearTiempo(tiempoTranscurrido)}
                </div>
                
                {/* Información de velocidad */}
                <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1 text-xs text-gray-300">
                    Velocidad: {(puntosGrafico.length > 1 ? (puntosGrafico[puntosGrafico.length-1].y - puntosGrafico[puntosGrafico.length-2].y) / 0.016 : 0).toFixed(2)}x/s
                </div>
                
                {/* Avión en el gráfico */}
                {renderAvion()}
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
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                
                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6 animate-bounce">
                            <span className="px-6 py-3 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 border border-blue-500/30 rounded-full text-lg font-bold text-blue-400 backdrop-blur-sm">
                                ✈️ AVIATOR ELITE 🚀
                            </span>
                        </div>
                        
                        <h1 className="text-5xl md:text-6xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
                                ¡Aviator Pro!
                            </span>
                            <br />
                            <span className="text-white text-3xl">Retira antes del crash</span>
                        </h1>
                        
                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Multiplicadores de hasta <span className="text-yellow-400 font-bold">500x</span> 
                            <span className="text-pink-400"> • </span>
                            Probabilidades realistas 
                            <span className="text-pink-400"> • </span>
                            Retiro automático inteligente
                        </p>
                    </div>
                </div>
            </section>

            {/* Contenido Principal */}
            <section className="container mx-auto px-4 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Área de juego */}
                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
                            {/* Gráfico/Avión */}
                            <div className="mb-6">
                                {renderGrafico()}
                            </div>

                            {/* Panel de información */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Multiplicador</div>
                                    <div className={`text-3xl font-bold ${
                                        multiplicadorActual >= 100 ? 'text-green-400 animate-pulse' :
                                        multiplicadorActual >= 50 ? 'text-yellow-400' :
                                        multiplicadorActual >= 10 ? 'text-blue-400' :
                                        multiplicadorActual >= 5 ? 'text-purple-400' :
                                        'text-white'
                                    }`}>
                                        {multiplicadorActual.toFixed(2)}<span className="text-lg">x</span>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Tiempo</div>
                                    <div className="text-3xl font-bold text-white">
                                        {formatearTiempo(tiempoTranscurrido)}
                                    </div>
                                </div>
                                
                                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Apuesta</div>
                                    <div className="text-3xl font-bold text-yellow-400">
                                        ${apuestaActual > 0 ? apuestaActual.toLocaleString() : '0'}
                                    </div>
                                </div>
                                
                                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Ganancia</div>
                                    <div className={`text-3xl font-bold ${ganancia > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                        ${ganancia > 0 ? ganancia.toFixed(2) : '0.00'}
                                    </div>
                                </div>
                            </div>

                            {/* Selector de apuesta y configuración */}
                            {estado === 'esperando' ? (
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-white mb-4 text-center">💰 Selecciona tu apuesta</h3>
                                    <div className="flex gap-3 justify-center flex-wrap mb-6">
                                        {apuestasPermitidas.map((apuesta) => (
                                            <button
                                                key={apuesta}
                                                onClick={() => setApuestaSeleccionada(apuesta)}
                                                disabled={usuario.saldo < apuesta}
                                                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                                                    apuestaSeleccionada === apuesta
                                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                                                        : usuario.saldo < apuesta
                                                        ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700'
                                                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white border border-gray-700 hover:border-blue-500/50'
                                                }`}
                                            >
                                                ${apuesta.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    {/* Configuración de auto-retiro */}
                                    <div className="bg-gray-800/30 rounded-xl p-4 mb-4 border border-gray-700/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-yellow-400">⚡</span>
                                                <span className="text-white font-bold">Retiro Automático</span>
                                            </div>
                                            <button
                                                onClick={() => setAutoRetiroActivo(!autoRetiroActivo)}
                                                className={`px-4 py-1 rounded-full text-sm font-bold transition-colors ${
                                                    autoRetiroActivo
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-700 text-gray-300'
                                                }`}
                                            >
                                                {autoRetiroActivo ? 'ACTIVADO' : 'DESACTIVADO'}
                                            </button>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <label className="block text-gray-400 mb-2 text-sm">
                                                Multiplicador objetivo: <span className="text-yellow-400">{multiplicadorAuto.toFixed(1)}x</span>
                                            </label>
                                            <div className="flex items-center space-x-4">
                                                <input
                                                    type="range"
                                                    min="1.1"
                                                    max="500"
                                                    step="0.1"
                                                    value={multiplicadorAuto}
                                                    onChange={(e) => setMultiplicadorAuto(parseFloat(e.target.value))}
                                                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                                />
                                                <span className="text-white font-bold w-20 text-center bg-gray-800/50 px-3 py-1 rounded-lg">
                                                    {multiplicadorAuto.toFixed(1)}x
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>1.1x</span>
                                                <span>250x</span>
                                                <span>500x</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-white mb-2">
                                            Saldo disponible: <span className="text-yellow-400">${usuario?.saldo?.toLocaleString() ?? 0}</span>
                                        </div>
                                        {apuestaActual > 0 && (
                                            <div className="text-lg text-blue-400 font-bold">
                                                Apostado: ${apuestaActual.toLocaleString()}
                                            </div>
                                        )}
                                        {ganancia > 0 && (
                                            <div className="text-lg text-green-400 font-bold animate-pulse">
                                                Ganancia: +${ganancia.toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Mensajes */}
                            {mensaje && (
                                <div className={`px-6 py-4 rounded-xl font-bold mb-6 text-center backdrop-blur-sm ${
                                    mensaje.includes("CRASH") || mensaje.includes("Perdiste")
                                        ? "bg-gradient-to-r from-red-900/60 to-red-800/60 border border-red-500/50 text-red-200 animate-pulse" 
                                        : mensaje.includes("Ganaste") || mensaje.includes("éxito")
                                        ? "bg-gradient-to-r from-green-900/60 to-emerald-800/60 border border-green-500/50 text-green-200"
                                        : "bg-gradient-to-r from-gray-900/60 to-gray-800/60 border border-gray-500/50 text-gray-200"
                                }`}>
                                    <div className="flex items-center justify-center space-x-3">
                                        <span className="text-2xl">
                                            {mensaje.includes("CRASH") ? "💥" : mensaje.includes("Ganaste") ? "💰" : "✈️"}
                                        </span>
                                        <span>{mensaje}</span>
                                    </div>
                                </div>
                            )}

                            {/* Controles principales */}
                            <div className="text-center">
                                {estado === 'esperando' && (
                                    <button
                                        onClick={iniciarVuelo}
                                        disabled={cargando || !usuario || (usuario && usuario.saldo < apuestaSeleccionada)}
                                        className={`w-full py-5 px-8 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 ${
                                            cargando 
                                                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 shadow-lg shadow-blue-500/30'
                                        } ${(!usuario || (usuario && usuario.saldo < apuestaSeleccionada)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {cargando ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Preparando despegue...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center">
                                                <span className="mr-3">✈️</span>
                                                INICIAR VUELO (${apuestaSeleccionada.toLocaleString()})
                                            </span>
                                        )}
                                    </button>
                                )}

                                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                                    {estado === 'vuelo' && (
                                        <>
                                            <button
                                                onClick={() => hacerCashout(multiplicadorActual)}
                                                disabled={cargando}
                                                className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                                    cargando 
                                                        ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/30'
                                                }`}
                                            >
                                                <span className="flex items-center justify-center">
                                                    <span className="mr-2">💰</span>
                                                    RETIRAR ({multiplicadorActual.toFixed(2)}x)
                                                </span>
                                            </button>

                                            <button
                                                onClick={configurarAutoretiro}
                                                disabled={cargando}
                                                className={`py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                                    cargando 
                                                        ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                        : autoRetiroActivo
                                                        ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500'
                                                        : 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700'
                                                }`}
                                            >
                                                <span className="flex items-center justify-center">
                                                    <span className="mr-2">{autoRetiroActivo ? '⚡' : '⚙️'}</span>
                                                    AUTO: {multiplicadorAuto.toFixed(1)}x
                                                </span>
                                            </button>
                                        </>
                                    )}
                                </div>

                                {(estado === 'cashout' || estado === 'explosion') && (
                                    <div className="space-y-6">
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
                                            className="w-full py-5 px-8 rounded-xl font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-blue-500/30"
                                        >
                                            <span className="flex items-center justify-center">
                                                <span className="mr-3">✈️</span>
                                                NUEVO VUELO
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Panel Lateral */}
                    <div className="space-y-6">
                        {/* Estadísticas */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                                <span className="mr-2">📊</span>
                                Tus Estadísticas
                            </h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Total Vuelos</div>
                                    <div className="text-2xl font-bold text-blue-400">{estadisticas.total_vuelos}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Ganados</div>
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
                            <div className="pt-4 border-t border-gray-700/30">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-400">Mayor Ganancia</div>
                                        <div className="text-lg font-bold text-green-400">${estadisticas.mayor_ganancia.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-400">Ratio</div>
                                        <div className="text-lg font-bold text-blue-400">
                                            {estadisticas.total_vuelos > 0 
                                                ? `${((estadisticas.vuelos_ganados / estadisticas.total_vuelos) * 100).toFixed(1)}%` 
                                                : '0%'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Historial personal */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <span className="mr-2">📝</span>
                                    Tus Últimos Vuelos
                                </h3>
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
                                    <div className="text-4xl mb-3 animate-bounce">✈️</div>
                                    <p className="text-gray-400">No hay vuelos registrados</p>
                                    <p className="text-sm text-gray-500 mt-1">Inicia un vuelo para comenzar</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                    {historial.map((vuelo) => (
                                        <div key={vuelo.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50 hover:bg-gray-800/60 transition-colors">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`text-lg ${
                                                            vuelo.resultado === 'cashout' ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                            {vuelo.resultado === 'cashout' ? '💰' : '💥'}
                                                        </span>
                                                        <span className={`font-medium ${vuelo.ganancia > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {vuelo.resultado === 'cashout' ? 'Retirado' : 'Crash'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-400">{vuelo.fecha}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Crash: {vuelo.multiplicador_crash.toFixed(2)}x
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
                                            {vuelo.multiplicador_retiro && (
                                                <div className="mt-2 text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded inline-block">
                                                    Retiro: {vuelo.multiplicador_retiro.toFixed(2)}x
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Reglas del juego */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                                <span className="mr-2">📖</span>
                                Cómo Jugar
                            </h3>
                            <div className="space-y-3 text-gray-300">
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>Apuesta:</strong> Elige tu monto y presiona "Iniciar Vuelo"</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>Multiplicador:</strong> Comienza en 1.00x y aumenta exponencialmente</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>Retirar:</strong> Presiona "Retirar" antes del crash para ganar</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>Auto-retiro:</strong> Configura retiro automático en cualquier multiplicador</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>Crash:</strong> Si no retiras a tiempo, pierdes tu apuesta</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Probabilidades */}
                        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-6 shadow-xl">
                            <h4 className="text-lg font-bold text-white mb-3 flex items-center">
                                <span className="mr-2">🎯</span>
                                Probabilidades
                            </h4>
                            <div className="space-y-2">
                                {[
                                    { range: '1x', prob: '30%', color: 'text-red-400' },
                                    { range: 'Hasta 1.5x', prob: '30%', color: 'text-orange-400' },
                                    { range: 'Hasta 10x', prob: '20%', color: 'text-yellow-400' },
                                    { range: 'Hasta 50x', prob: '10%', color: 'text-green-400' },
                                    { range: 'Hasta 100x', prob: '5%', color: 'text-blue-400' },
                                    { range: 'Hasta 200x', prob: '3%', color: 'text-purple-400' },
                                    { range: 'Hasta 250x', prob: '1%', color: 'text-pink-400' },
                                    { range: 'Hasta 300x', prob: '0.5%', color: 'text-indigo-400' },
                                    { range: 'Hasta 400x', prob: '0.4%', color: 'text-teal-400' },
                                    { range: 'Hasta 500x', prob: '0.1%', color: 'text-yellow-300' },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <span className="text-gray-300">{item.range}</span>
                                        <span className={`font-bold ${item.color}`}>{item.prob}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <Footer />
            
            {/* Estilos para animaciones */}
            <style>{`
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
                
                @keyframes gradient {
                    0%, 100% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                }
                
                .animate-slideIn {
                    animation: slideIn 0.3s ease-out;
                }
                
                .animate-gradient {
                    background-size: 200% auto;
                    animation: gradient 3s ease infinite;
                }
                
                /* Scrollbar personalizado */
                ::-webkit-scrollbar {
                    width: 6px;
                }
                
                ::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 3px;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #3B82F6, #8B5CF6);
                    border-radius: 3px;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #2563EB, #7C3AED);
                }
            `}</style>
        </div>
    );
}