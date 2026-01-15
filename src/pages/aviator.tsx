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
    const [estadisticas, setEstadisticas] = useState<Estadisticas>(() => {
        // Cargar estadísticas desde localStorage al iniciar
        const estadisticasGuardadas = localStorage.getItem('estadisticas_aviator');
        if (estadisticasGuardadas) {
            try {
                return JSON.parse(estadisticasGuardadas);
            } catch (error) {
                console.error('Error al parsear estadísticas guardadas:', error);
            }
        }
        // Valores por defecto
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
        
        // Actualizar estadísticas automáticamente
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

    // Función para actualizar estadísticas desde la última partida jugada (manual)
    const actualizarEstadisticasDesdeHistorial = () => {
        if (historial.length === 0) {
            showMsg("No hay historial para actualizar", "info");
            return;
        }

        // Tomar solo la última partida (la primera del array)
        const ultimaPartida = historial[0];
        
        // Calcular estadísticas basadas solo en la última partida
        const esVictoria = ultimaPartida.resultado === 'cashout';
        const nuevaGanancia = esVictoria ? ultimaPartida.ganancia : 0;
        const nuevaPerdida = esVictoria ? 0 : ultimaPartida.apuesta;
        const nuevoBalance = nuevaGanancia - nuevaPerdida;
        
        const nuevasEstadisticas = {
            total_vuelos: 1, // Solo contamos esta partida
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

    // Función para restablecer estadísticas a cero
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

    const renderAvion = () => {
        const progreso = duracionTotal > 0 ? Math.min(tiempoTranscurrido / duracionTotal, 1) : 0;
        const posicionX = progreso * 90;
        
        return (
            <div className="relative w-full h-64 bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-purple-900/10"></div>
                
                <div className="absolute top-4 left-8 w-16 h-8 bg-white/10 rounded-full blur-sm"></div>
                <div className="absolute top-10 right-12 w-20 h-10 bg-white/15 rounded-full blur-sm"></div>
                
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500/30 to-yellow-600/40"></div>
                
                <div 
                    className="absolute bottom-4 transform -translate-x-1/2 transition-all duration-300"
                    style={{ left: `${10 + posicionX}%` }}
                >
                    <div className="text-4xl">✈️</div>
                </div>
                
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
                    <div className="text-center">
                        <div className="text-xs text-gray-400">MULTIPLICADOR</div>
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
                
                <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1 text-xs text-gray-300">
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
                <div className="w-full h-64 bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4 animate-bounce"><svg width="900" height="400" viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">

  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6db9ef"/>
      <stop offset="100%" stop-color="#eaf6ff"/>
    </linearGradient>
  </defs>

  <rect width="900" height="400" fill="url(#sky)" />

  <g id="plane" transform="translate(-200,200)">

    <path d="
      M 40 0
      Q 160 -15 320 0
      Q 160 15 40 0
      Z"
      fill="#f2f2f2"
      stroke="#cfcfcf"
      stroke-width="2"/>

    <path d="
      M 320 0
      Q 355 0 360 0
      Q 330 -18 320 0
      Q 330 18 360 0"
      fill="#e6e6e6"/>

    <polygon points="40,0 0,-35 10,0 0,35" fill="#d0d0d0"/>

    <polygon points="70,-10 40,-45 90,-30" fill="#c7c7c7"/>

    <polygon points="170,0 110,55 200,55 240,0" fill="#d9d9d9"/>

    <ellipse cx="180" cy="45" rx="16" ry="10" fill="#9e9e9e"/>
    <ellipse cx="180" cy="45" rx="10" ry="6" fill="#555"/>

    <g fill="#4b8fd8">
      <circle cx="120" cy="-4" r="3"/>
      <circle cx="135" cy="-4" r="3"/>
      <circle cx="150" cy="-4" r="3"/>
      <circle cx="165" cy="-4" r="3"/>
      <circle cx="180" cy="-4" r="3"/>
    </g>
  </g>

  <animateTransform
    href="#plane"
    attributeName="transform"
    type="translate"
    dur="10s"
    repeatCount="indefinite"
    values="
      -200 250;
       200 200;
       450 120;
       700 200;
       1000 150"
  />
  <animateTransform
    href="#plane"
    attributeName="transform"
    type="translate"
    dur="3s"
    repeatCount="indefinite"
    additive="sum"
    values="
      0 0;
      0 -25;
      0 0;
      0 20;
      0 0"
  />

  <animateTransform
    href="#plane"
    attributeName="transform"
    type="rotate"
    dur="3s"
    repeatCount="indefinite"
    additive="sum"
    values="
      -4 180 200;
       3 180 200;
      -2 180 200"
  />

</svg>
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
            <div className="w-full h-64 bg-gradient-to-b from-gray-900/50 to-transparent rounded-xl relative overflow-hidden">
                <div className="absolute inset-0">
                    {[1, 2, 5, 10, 20, 50, 100, 200, 500].filter(y => y <= maxY).map(y => (
                        <div 
                            key={y} 
                            className="absolute left-0 right-0 border-t border-gray-700/30" 
                            style={{ bottom: `${escalaY(y)}%` }}
                        >
                            <span className="absolute left-2 -top-3 text-xs text-gray-500">{y}x</span>
                        </div>
                    ))}
                </div>
                
                {autoRetiroActivo && multiplicadorAuto > 1.0 && multiplicadorAuto <= maxY && (
                    <div 
                        className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-500/70" 
                        style={{ bottom: `${escalaY(multiplicadorAuto)}%` }}
                    >
                        <div className="absolute right-2 -top-6 bg-yellow-900/50 backdrop-blur-sm px-2 py-1 rounded text-xs text-yellow-300 font-bold">
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
                    </defs>
                    <path 
                        d={puntosSVG} 
                        fill="none" 
                        stroke="url(#lineGradient)" 
                        strokeWidth="2" 
                    />
                </svg>
                
                {puntosGrafico.length > 0 && (
                    <div 
                        className="absolute w-4 h-4 rounded-full bg-gradient-to-br from-green-400 to-blue-500 border-2 border-white"
                        style={{ 
                            left: `${escalaX(puntosGrafico[puntosGrafico.length-1].x)}%`,
                            bottom: `${escalaY(puntosGrafico[puntosGrafico.length-1].y)}%`,
                            transform: 'translate(-50%, 50%)'
                        }}
                    >
                        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30"></div>
                    </div>
                )}
                
                <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1 text-xs text-gray-300">
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
                        <div className="inline-block mb-6 animate-bounce">
                            <span className="px-6 py-3 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 border border-blue-500/30 rounded-full text-lg font-bold text-blue-400 backdrop-blur-sm">
                                ✈️ AVIATOR ELITE 🚀
                            </span>
                        </div>
                        
                        <h1 className="text-5xl md:text-6xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
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

            <section className="container mx-auto px-4 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-2xl">
                            <div className="mb-6">
                                {estado === 'vuelo' ? renderGrafico() : renderAvion()}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Multiplicador</div>
                                    <div className={`text-3xl font-bold ${
                                        multiplicadorActual >= 100 ? 'text-green-400' :
                                        multiplicadorActual >= 50 ? 'text-yellow-400' :
                                        multiplicadorActual >= 10 ? 'text-blue-400' :
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

                            {estado === 'esperando' ? (
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-white mb-4 text-center">💰 Selecciona tu apuesta</h3>
                                    <div className="flex gap-3 justify-center flex-wrap mb-6">
                                        {apuestasPermitidas.map((apuesta) => (
                                            <button
                                                key={apuesta}
                                                onClick={() => setApuestaSeleccionada(apuesta)}
                                                disabled={usuario.saldo < apuesta}
                                                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
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
                                    
                                    <div className="bg-gray-800/30 rounded-xl p-4 mb-4 border border-gray-700/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-yellow-400">⚡</span>
                                                <span className="text-white font-bold">Retiro Automático</span>
                                            </div>
                                            <button
                                                onClick={() => setAutoRetiroActivo(!autoRetiroActivo)}
                                                className={`px-4 py-1 rounded-full text-sm font-bold ${
                                                    autoRetiroActivo
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-700 text-gray-300'
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
                                                    className="flex-1 h-2 bg-gray-700 rounded-lg accent-yellow-500"
                                                />
                                                <span className="text-white font-bold w-16 text-center bg-gray-800/50 px-3 py-1 rounded-lg">
                                                    {multiplicadorAuto.toFixed(1)}x
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6 text-center">
                                    <div className="text-xl text-white">
                                        Saldo: <span className="text-yellow-400 font-bold">${usuario?.saldo?.toFixed(2) ?? '0.00'}</span>
                                    </div>
                                </div>
                            )}

                            {mensaje && (
                                <div className={`px-6 py-4 rounded-xl font-bold mb-6 text-center ${
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
                                        className={`w-full py-5 px-8 rounded-xl font-bold text-xl ${
                                            cargando || !usuario || usuario.saldo < apuestaSeleccionada
                                                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105'
                                        } transition-all duration-300`}
                                    >
                                        {cargando ? 'Preparando...' : `✈️ INICIAR VUELO ($${apuestaSeleccionada.toLocaleString()})`}
                                    </button>
                                )}

                                {estado === 'vuelo' && (
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => hacerCashout(multiplicadorActual)}
                                            disabled={cargando}
                                            className="flex-1 py-4 px-6 rounded-xl font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-105"
                                        >
                                            💰 RETIRAR ({multiplicadorActual.toFixed(2)}x)
                                        </button>

                                        <button
                                            onClick={configurarAutoretiro}
                                            disabled={cargando}
                                            className={`py-4 px-6 rounded-xl font-bold ${
                                                autoRetiroActivo
                                                    ? 'bg-yellow-600'
                                                    : 'bg-gray-700'
                                            }`}
                                        >
                                            ⚡ {multiplicadorAuto.toFixed(1)}x
                                        </button>
                                    </div>
                                )}

                                {(estado === 'cashout' || estado === 'explosion') && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-800/40 rounded-xl">
                                                <div className="text-sm text-gray-400">Crash</div>
                                                <div className="text-2xl font-bold text-red-400">
                                                    {multiplicadorCrash?.toFixed(2)}x
                                                </div>
                                            </div>
                                            <div className="p-4 bg-gray-800/40 rounded-xl">
                                                <div className="text-sm text-gray-400">Tu Retiro</div>
                                                <div className="text-2xl font-bold text-green-400">
                                                    {multiplicadorRetiro ? `${multiplicadorRetiro.toFixed(2)}x` : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={reiniciarJuego}
                                            className="w-full py-5 rounded-xl font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105"
                                        >
                                            ✈️ NUEVO VUELO
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white">📊 Estadísticas</h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={actualizarEstadisticasDesdeHistorial}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold"
                                    >
                                        🔄 Actualizar
                                    </button>
                                    <button
                                        onClick={restablecerEstadisticas}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold"
                                    >
                                        🗑️ Restablecer
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl">
                                    <div className="text-sm text-gray-400">Vuelos</div>
                                    <div className="text-2xl font-bold text-blue-400">{estadisticas.total_vuelos}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl">
                                    <div className="text-sm text-gray-400">Ganados</div>
                                    <div className="text-2xl font-bold text-green-400">{estadisticas.vuelos_ganados}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl">
                                    <div className="text-sm text-gray-400">Balance</div>
                                    <div className={`text-2xl font-bold ${estadisticas.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${estadisticas.balance.toFixed(2)}
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl">
                                    <div className="text-sm text-gray-400">Record</div>
                                    <div className="text-2xl font-bold text-yellow-400">{estadisticas.multiplicador_record.toFixed(2)}x</div>
                                </div>
                                
                                <div className="col-span-2 grid grid-cols-2 gap-4 mt-2">
                                    <div className="text-center p-3 bg-gray-800/40 rounded-xl">
                                        <div className="text-sm text-gray-400">Ganancia Total</div>
                                        <div className="text-lg font-bold text-green-400">
                                            ${estadisticas.ganancia_total.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-800/40 rounded-xl">
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
                        
                        
                        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">📝 Historial</h3>
                                {historial.length > 0 && (
                                    <button
                                        onClick={limpiarHistorial}
                                        className="text-sm text-red-400 hover:text-red-300"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                            
                            {historial.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-3">✈️</div>
                                    <p className="text-gray-400">Sin vuelos</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {historial.map((vuelo) => (
                                        <div key={vuelo.id} className="p-3 bg-gray-800/40 rounded-lg">
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
                .animate-slideIn { animation: slideIn 0.3s ease-out; }
            `}</style>
        </div>
    );
}