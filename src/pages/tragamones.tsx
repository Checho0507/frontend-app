// src/pages/tragamonedas.tsx
import React, { useState, useEffect, useRef } from "react";
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

interface HistorialGiro {
    id: number;
    resultado: string[];
    ganancia: number;
    fecha: string;
    apuesta: number;
}

export default function Tragamonedas() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [reels, setReels] = useState<string[]>(["❔", "❔", "❔"]);
    const [girando, setGirando] = useState(false);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [gananciaMostrar, setGananciaMostrar] = useState<number>(0);
    const [efectoGanancia, setEfectoGanancia] = useState(false);
    const [historial, setHistorial] = useState<HistorialGiro[]>([]);
    
    // Nuevos estados para apuestas variables
    const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(500);
    const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([100, 500, 1000, 2000, 5000]);
    
    // Estados para estadísticas
    const [estadisticas, setEstadisticas] = useState({
        totalTiradas: 0,
        gananciaTotal: 0,
        gastoTotal: 0,
        balance: 0,
        premiosObtenidos: 0
    });
    
    const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({
        totalTiradasAcum: 0,
        gananciaTotalAcum: 0,
        gastoTotalAcum: 0,
        premiosObtenidosAcum: 0
    });
    
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
    
    const reelRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);

    const SYMBOLS = ["🍒", "🍋", "🍊", "🍉", "⭐", "🔔", "🍇", "7️⃣"];
    const TABLA_PAGOS = {
        "7️⃣": 100,
        "🍇": 50,
        "🔔": 25,
        "⭐": 5,
        "🍉": 4,
        "🍊": 3,
        "🍋": 2,
        "🍒": 1,
    };

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
                const res = await axios.get(`${API_URL}/juegos/tragamonedas/juegos/tragamonedas/apuestas-permitidas`);
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
        // Cargar historial de últimos 10 giros
        const historialGuardado = localStorage.getItem('historial_tragamonedas');
        if (historialGuardado) {
            const historialParsed = JSON.parse(historialGuardado);
            setHistorial(historialParsed);
        }

        // Cargar estadísticas acumulativas
        const statsAcum = localStorage.getItem("estadisticas_acumulativas_tragamonedas");
        if (statsAcum) {
            const parsedStats = JSON.parse(statsAcum);
            setEstadisticasAcumulativas(parsedStats);
            
            // Calcular estadísticas iniciales basadas en las acumulativas
            const balance = parsedStats.gananciaTotalAcum - parsedStats.gastoTotalAcum;
            setEstadisticas({
                totalTiradas: parsedStats.totalTiradasAcum,
                gananciaTotal: parsedStats.gananciaTotalAcum,
                gastoTotal: parsedStats.gastoTotalAcum,
                balance: balance,
                premiosObtenidos: parsedStats.premiosObtenidosAcum
            });
        }
    }, []);

    // Guardar historial en localStorage
    useEffect(() => {
        if (historial.length > 0) {
            localStorage.setItem('historial_tragamonedas', JSON.stringify(historial.slice(0, 10)));
        }
    }, [historial]);

    // Guardar estadísticas acumulativas en localStorage
    useEffect(() => {
        if (estadisticasAcumulativas.totalTiradasAcum > 0) {
            localStorage.setItem("estadisticas_acumulativas_tragamonedas", JSON.stringify(estadisticasAcumulativas));
        }
    }, [estadisticasAcumulativas]);

    const actualizarEstadisticas = (nuevoGiro: HistorialGiro) => {
        const esPremio = nuevoGiro.ganancia > 0;
        
        // Actualizar estadísticas acumulativas
        setEstadisticasAcumulativas(prev => {
            const nuevoTotalTiradas = prev.totalTiradasAcum + 1;
            const nuevaGananciaTotal = prev.gananciaTotalAcum + (nuevoGiro.ganancia || 0);
            const nuevoGastoTotal = prev.gastoTotalAcum + nuevoGiro.apuesta;
            const nuevosPremiosObtenidos = prev.premiosObtenidosAcum + (esPremio ? 1 : 0);
            
            return {
                totalTiradasAcum: nuevoTotalTiradas,
                gananciaTotalAcum: nuevaGananciaTotal,
                gastoTotalAcum: nuevoGastoTotal,
                premiosObtenidosAcum: nuevosPremiosObtenidos
            };
        });
        
        // Actualizar estadísticas visibles
        setEstadisticas(prev => {
            const nuevoTotalTiradas = prev.totalTiradas + 1;
            const nuevaGananciaTotal = prev.gananciaTotal + (nuevoGiro.ganancia || 0);
            const nuevoGastoTotal = prev.gastoTotal + nuevoGiro.apuesta;
            const nuevosPremiosObtenidos = prev.premiosObtenidos + (esPremio ? 1 : 0);
            const nuevoBalance = nuevaGananciaTotal - nuevoGastoTotal;
            
            return {
                totalTiradas: nuevoTotalTiradas,
                gananciaTotal: nuevaGananciaTotal,
                gastoTotal: nuevoGastoTotal,
                balance: nuevoBalance,
                premiosObtenidos: nuevosPremiosObtenidos
            };
        });
    };

    const agregarAlHistorial = (resultado: string[], ganancia: number, apuesta: number) => {
        const nuevoGiro: HistorialGiro = {
            id: Date.now(),
            resultado,
            ganancia,
            apuesta,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        // Agregar al historial (máximo 10 registros)
        const nuevoHistorial = [nuevoGiro, ...historial.slice(0, 9)];
        setHistorial(nuevoHistorial);
        
        // Actualizar estadísticas
        actualizarEstadisticas(nuevoGiro);
    };

    const animarRodillo = (index: number, duracion: number) => {
        return new Promise<void>((resolve) => {
            const rodillo = reelRefs.current[index];
            if (!rodillo) return resolve();

            let contador = 0;
            const maxGiros = Math.floor(duracion / 100);

            const interval = setInterval(() => {
                const simboloAleatorio = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                setReels(prev => {
                    const nuevos = [...prev];
                    nuevos[index] = simboloAleatorio;
                    return nuevos;
                });

                rodillo.style.transform = `rotateY(${contador * 180}deg)`;

                contador++;
                if (contador >= maxGiros) {
                    clearInterval(interval);
                    rodillo.style.transform = 'rotateY(0deg)';
                    resolve();
                }
            }, 100);
        });
    };

    const animarConfetti = () => {
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 }
        });
    };

    const girarTragamonedas = async () => {
        if (!usuario) {
            setMensaje("Debes iniciar sesión para jugar.");
            return;
        }
        if (girando) return;
        if (usuario.saldo < apuestaSeleccionada) {
            setMensaje("Saldo insuficiente para apostar.");
            return;
        }

        setMensaje(null);
        setGananciaMostrar(0);
        setGirando(true);
        setEfectoGanancia(false);

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/tragamonedas/juegos/tragamonedas?apuesta=${apuestaSeleccionada}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const resultado: string[] = res.data?.resultado ?? [SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]];
            const ganancia = res.data?.ganancia ?? 0;
            const mensajeServidor = res.data?.mensaje ?? "Resultado procesado";

            // Animación de los rodillos
            const promesasAnimacion = [
                animarRodillo(0, 2000),
                animarRodillo(1, 2000),
                animarRodillo(2, 2000)
            ];

            await Promise.all(promesasAnimacion);
            
            // Mostrar resultado final
            setReels(resultado);
            setGananciaMostrar(ganancia);
            setMensaje(mensajeServidor);
            setUsuario((prev) =>
                prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev
            );
            
            // Animación de confetti para premios
            if (ganancia > 0) {
                setEfectoGanancia(true);
                animarConfetti();
            }
            
            // Guardar en historial
            agregarAlHistorial(resultado, ganancia, apuestaSeleccionada);
            
            setGirando(false);
        } catch (err: any) {
            console.error("Error al girar las tragamonedas:", err);
            setMensaje(err.response?.data?.detail || "Error al girar las tragamonedas");
            setGirando(false);
        }
    };

    const limpiarHistorial = () => {
        setHistorial([]);
        localStorage.removeItem('historial_tragamonedas');
        // No limpiamos las estadísticas acumulativas
        // Solo reseteamos las estadísticas visibles a las acumulativas
        setEstadisticas({
            totalTiradas: estadisticasAcumulativas.totalTiradasAcum,
            gananciaTotal: estadisticasAcumulativas.gananciaTotalAcum,
            gastoTotal: estadisticasAcumulativas.gastoTotalAcum,
            balance: estadisticasAcumulativas.gananciaTotalAcum - estadisticasAcumulativas.gastoTotalAcum,
            premiosObtenidos: estadisticasAcumulativas.premiosObtenidosAcum
        });
    };

    const limpiarTodasEstadisticas = () => {
        setHistorial([]);
        setEstadisticas({
            totalTiradas: 0,
            gananciaTotal: 0,
            gastoTotal: 0,
            balance: 0,
            premiosObtenidos: 0
        });
        setEstadisticasAcumulativas({
            totalTiradasAcum: 0,
            gananciaTotalAcum: 0,
            gastoTotalAcum: 0,
            premiosObtenidosAcum: 0
        });
        localStorage.removeItem('historial_tragamonedas');
        localStorage.removeItem("estadisticas_acumulativas_tragamonedas");
        showMsg("Estadísticas reiniciadas completamente", "info");
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    // Función para calcular el pago potencial según la apuesta
    const calcularPagoPotencial = (simbolo: string) => {
        const multiplicador = TABLA_PAGOS[simbolo as keyof typeof TABLA_PAGOS] || 0;
        return multiplicador * apuestaSeleccionada;
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
        localStorage.removeItem("historial_tragamonedas");
        localStorage.removeItem("estadisticas_acumulativas_tragamonedas");
        
        setUsuario(null);
        showMsg("Sesión cerrada correctamente", "success");
        setTimeout(() => navigate('/login'), 1500);
    };

    if (!usuario) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando tragamonedas...</p>
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
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-20"></div>
                
                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-full text-sm font-bold text-red-400">
                                🎰 TRAGAMONEDAS DELUXE
                            </span>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-red-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                                Gira y Gana
                            </span>
                            <br />
                            <span className="text-white">¡Hasta 100x tu apuesta!</span>
                        </h1>
                        
                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Apuesta desde <span className="text-red-400 font-bold">${apuestasPermitidas[0]}</span> hasta <span className="text-red-400 font-bold">${apuestasPermitidas[apuestasPermitidas.length - 1]}</span>.
                            <span className="text-green-400 font-bold"> ¡Tres 7️⃣ pagan 100x tu apuesta!</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* Contenido Principal */}
            <section className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Máquina de Tragamonedas */}
                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="relative w-full max-w-md mx-auto">
                                {/* Selector de apuesta */}
                                {!girando && (
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
                                                            ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg scale-105'
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
                                            Apuesta seleccionada: <span className="text-red-400 font-bold">${apuestaSeleccionada.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Tragamonedas */}
                                <div className="mb-8">
                                    <div className="flex justify-center gap-8 mb-8">
                                        {reels.map((r, i) => (
                                            <div
                                                key={i}
                                                ref={el => { reelRefs.current[i] = el }}
                                                className={`flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-900 to-black border-4 border-yellow-500 rounded-xl text-6xl transition-all duration-300 ${
                                                    efectoGanancia && gananciaMostrar > 0 ? 'animate-pulse shadow-lg shadow-yellow-500/50' : ''
                                                } ${girando ? 'animate-bounce' : ''}`}
                                                style={{
                                                    animationDelay: i * 100 + 'ms'
                                                }}
                                            >
                                                {r}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Botón de girar */}
                                <div className="text-center">
                                    <div className="mb-4">
                                        <div className="text-2xl font-bold text-white mb-2">
                                            Saldo: <span className="text-yellow-400">${usuario?.saldo?.toLocaleString() ?? 0}</span>
                                        </div>
                                        {mensaje && (
                                            <div className={`px-4 py-3 rounded-xl font-bold mb-4 ${
                                                mensaje.includes("Error") || mensaje.includes("insuficiente")
                                                    ? "bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200" 
                                                    : gananciaMostrar > 0
                                                    ? "bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50 text-green-200"
                                                    : "bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 border border-yellow-500/50 text-yellow-200"
                                            }`}>
                                                {mensaje}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button
                                        onClick={girarTragamonedas}
                                        disabled={girando || !usuario || (usuario && usuario.saldo < apuestaSeleccionada)}
                                        className={`w-full max-w-xs py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${
                                            girando 
                                                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 hover:scale-105 active:scale-95'
                                        } ${(!usuario || (usuario && usuario.saldo < apuestaSeleccionada)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {girando ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Girando...
                                            </span>
                                        ) : (
                                            `🎰 Girar por $${apuestaSeleccionada.toLocaleString()}`
                                        )}
                                    </button>
                                    
                                    {gananciaMostrar > 0 && (
                                        <div className="mt-6 p-6 bg-gradient-to-r from-gray-800/70 to-gray-900/70 border border-green-500/30 rounded-2xl">
                                            <div className="text-2xl font-bold text-white mb-2">¡Premio Ganado!</div>
                                            <div className="text-3xl text-green-400 font-bold">
                                                +${gananciaMostrar.toLocaleString()}
                                            </div>
                                            <div className="text-lg text-gray-300 mt-2">
                                                {reels[0]} {reels[1]} {reels[2]}
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                                    <div className="text-sm text-gray-400">Total Tiradas</div>
                                    <div className="text-2xl font-bold text-blue-400">{estadisticas.totalTiradas}</div>
                                    <div className="text-xs text-gray-500 mt-1">Acumulativo</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Premios Obtenidos</div>
                                    <div className="text-2xl font-bold text-green-400">{estadisticas.premiosObtenidos}</div>
                                    <div className="text-xs text-gray-500 mt-1">Giros con ganancia</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Ganancia Total</div>
                                    <div className="text-2xl font-bold text-green-400">${estadisticas.gananciaTotal}</div>
                                    <div className="text-xs text-gray-500 mt-1">Ganancias brutas</div>
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
                                        <div className="text-sm text-gray-400">Ratio de Premios</div>
                                        <div className="text-xl font-bold text-blue-400">
                                            {estadisticas.totalTiradas > 0 
                                                ? `${((estadisticas.premiosObtenidos / estadisticas.totalTiradas) * 100).toFixed(1)}%` 
                                                : '0%'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Tabla de Pagos */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">💎 Tabla de Pagos</h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                {Object.entries(TABLA_PAGOS).map(([symbol, multiplicador]) => (
                                    <div key={symbol} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center space-x-3">
                                                <div className="text-2xl">{symbol}</div>
                                                <div className="text-2xl">{symbol}</div>
                                                <div className="text-2xl">{symbol}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-400">{multiplicador}x apuesta</div>
                                                <div className="text-white font-bold">
                                                    ${calcularPagoPotencial(symbol).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-400">
                                            Paga {multiplicador}x = ${apuestaSeleccionada} × {multiplicador}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-sm text-gray-400">
                                <div className="text-center">
                                    Combinación ganadora: 3 símbolos iguales
                                </div>
                            </div>
                        </div>
                        
                        {/* Historial */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">📝 Historial de Giros</h3>
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
                                    <div className="text-4xl mb-3">🎰</div>
                                    <p className="text-gray-400">No hay giros registrados</p>
                                    <p className="text-sm text-gray-500 mt-1">Gira las tragamonedas para comenzar</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                    {historial.map((giro) => (
                                        <div key={giro.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="text-white font-medium flex items-center space-x-2">
                                                        <span className="text-xl">{giro.resultado[0]} {giro.resultado[1]} {giro.resultado[2]}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-400">{giro.fecha}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Apuesta: ${giro.apuesta.toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className={`text-right ${giro.ganancia > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                    <div className="font-bold">
                                                        {giro.ganancia > 0 ? `+$${giro.ganancia}` : '$0'}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {giro.ganancia > 0 
                                                            ? `Neto: $${giro.ganancia - giro.apuesta}` 
                                                            : `Pérdida: $${giro.apuesta}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Información */}
                        <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl p-6">
                            <h4 className="text-lg font-bold text-white mb-3">💡 Consejos</h4>
                            <ul className="space-y-2 text-gray-300">
                                <li className="flex items-start space-x-2">
                                    <span className="text-red-400">•</span>
                                    <span>Los premios se pagan por 3 símbolos iguales</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-red-400">•</span>
                                    <span>El premio mayor (7️⃣7️⃣7️⃣) paga 100x tu apuesta</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-red-400">•</span>
                                    <span>Los símbolos más comunes pagan menos</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-red-400">•</span>
                                    <span>Ajusta tu apuesta según tu saldo disponible</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-red-400">•</span>
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