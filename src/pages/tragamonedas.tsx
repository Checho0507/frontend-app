// src/pages/tragamonedas2.tsx
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

interface LineaGanadora {
    linea: number;
    simbolos: string[];
    simbolo_ganador: string;
    cantidad: number;
    multiplicador: number;
    ganancia: number;
}

interface DetalleLinea {
    linea: number;
    simbolos: string[];
    ganancia_linea: number;
}

interface ResultadoJuego {
    reels: string[][];
    ganancia_total: number;
    nuevo_saldo: number;
    mensaje: string;
    apuesta_por_linea: number;
    apuesta_total: number;
    lineas_activas: number;
    lineas_ganadoras: LineaGanadora[];
    total_lineas_ganadoras: number;
    detalles_lineas: DetalleLinea[];
    configuracion: string;
}

interface HistorialGiro {
    id: number;
    reels: string[][];
    ganancia_total: number;
    fecha: string;
    apuesta_por_linea: number;
    apuesta_total: number;
    lineas_activas: number;
    lineas_ganadoras: number;
}

export default function Tragamonedas2() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [reels, setReels] = useState<string[][]>([
        ["❔", "❔", "❔", "❔", "❔"],
        ["❔", "❔", "❔", "❔", "❔"],
        ["❔", "❔", "❔", "❔", "❔"]
    ]);
    const [girando, setGirando] = useState(false);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [gananciaMostrar, setGananciaMostrar] = useState<number>(0);
    const [lineasGanadorasMostrar, setLineasGanadorasMostrar] = useState<LineaGanadora[]>([]);
    const [lineaResaltada, setLineaResaltada] = useState<number | null>(null);
    const [historial, setHistorial] = useState<HistorialGiro[]>([]);
    
    // Configuración del juego
    const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(250);
    const [lineasActivas, setLineasActivas] = useState<number>(10);
    const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([100, 250, 500, 1000, 2500, 5000]);
    const [totalLineas, setTotalLineas] = useState<number>(10);
    
    // Estadísticas
    const [estadisticas, setEstadisticas] = useState({
        totalTiradas: 0,
        gananciaTotal: 0,
        gastoTotal: 0,
        balance: 0,
        premiosObtenidos: 0,
        lineasGanadorasTotal: 0
    });
    
    const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({
        totalTiradasAcum: 0,
        gananciaTotalAcum: 0,
        gastoTotalAcum: 0,
        premiosObtenidosAcum: 0,
        lineasGanadorasAcum: 0
    });
    
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
    const reelRefs = useRef<(HTMLDivElement | null)[][]>([[], [], []]);

    // Tabla de pagos para mostrar
    const TABLA_PAGOS = {
        "👑": {3: 200, 4: 500, 5: 1000},
        "💎": {3: 100, 4: 200, 5: 500},
        "7️⃣": {3: 50, 4: 100, 5: 200},
        "🍇": {3: 30, 4: 60, 5: 120},
        "🔔": {3: 20, 4: 40, 5: 80},
        "⭐": {3: 10, 4: 20, 5: 40},
        "🍉": {3: 5, 4: 10, 5: 20},
        "🍊": {3: 3, 4: 6, 5: 12},
        "🍋": {3: 2, 4: 4, 5: 8},
        "🍒": {3: 1, 4: 2, 5: 4}
    };

    // Definición de líneas de pago para visualización
    const LINEAS_VISUALES = [
        // Línea 1 - Fila superior
        [[0,0], [1,0], [2,0], [3,0], [4,0]],
        // Línea 2 - Fila central
        [[0,1], [1,1], [2,1], [3,1], [4,1]],
        // Línea 3 - Fila inferior
        [[0,2], [1,2], [2,2], [3,2], [4,2]],
        // Línea 4 - V descendente
        [[0,0], [1,1], [2,2], [3,1], [4,0]],
        // Línea 5 - V ascendente
        [[0,2], [1,1], [2,0], [3,1], [4,2]],
        // Línea 6
        [[0,0], [1,0], [2,1], [3,2], [4,2]],
        // Línea 7
        [[0,2], [1,2], [2,1], [3,0], [4,0]],
        // Línea 8
        [[0,1], [1,0], [2,1], [3,0], [4,1]],
        // Línea 9
        [[0,1], [1,2], [2,1], [3,2], [4,1]],
        // Línea 10
        [[0,1], [1,0], [2,2], [3,0], [4,1]]
    ];

    // Obtener usuario al cargar
    useEffect(() => {
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
    }, [navigate]);

    // Cargar configuración
    useEffect(() => {
        const cargarConfiguracion = async () => {
            try {
                const res = await axios.get(`${API_URL}/juegos/tragamonedas2/juegos/tragamonedas2/apuestas-permitidas`);
                setApuestasPermitidas(res.data.apuestas_permitidas);
                setTotalLineas(res.data.lineas_de_pago);
                setLineasActivas(res.data.lineas_de_pago); // Activar todas por defecto
            } catch (error) {
                console.error("Error al cargar configuración:", error);
            }
        };
        
        cargarConfiguracion();
    }, []);

    // Cargar historial y estadísticas
    useEffect(() => {
        const historialGuardado = localStorage.getItem('historial_tragamonedas2');
        if (historialGuardado) {
            setHistorial(JSON.parse(historialGuardado).slice(0, 10));
        }

        const statsAcum = localStorage.getItem("estadisticas_acumulativas_tragamonedas2");
        if (statsAcum) {
            const parsedStats = JSON.parse(statsAcum);
            setEstadisticasAcumulativas(parsedStats);
            
            setEstadisticas({
                totalTiradas: parsedStats.totalTiradasAcum,
                gananciaTotal: parsedStats.gananciaTotalAcum,
                gastoTotal: parsedStats.gastoTotalAcum,
                balance: parsedStats.gananciaTotalAcum - parsedStats.gastoTotalAcum,
                premiosObtenidos: parsedStats.premiosObtenidosAcum,
                lineasGanadorasTotal: parsedStats.lineasGanadorasAcum
            });
        }
    }, []);

    // Guardar historial
    useEffect(() => {
        if (historial.length > 0) {
            localStorage.setItem('historial_tragamonedas2', JSON.stringify(historial.slice(0, 10)));
        }
    }, [historial]);

    // Guardar estadísticas
    useEffect(() => {
        if (estadisticasAcumulativas.totalTiradasAcum > 0) {
            localStorage.setItem("estadisticas_acumulativas_tragamonedas2", 
                JSON.stringify(estadisticasAcumulativas));
        }
    }, [estadisticasAcumulativas]);

    const actualizarEstadisticas = (nuevoGiro: HistorialGiro) => {
        const esPremio = nuevoGiro.ganancia_total > 0;
        
        setEstadisticasAcumulativas(prev => ({
            totalTiradasAcum: prev.totalTiradasAcum + 1,
            gananciaTotalAcum: prev.gananciaTotalAcum + nuevoGiro.ganancia_total,
            gastoTotalAcum: prev.gastoTotalAcum + nuevoGiro.apuesta_total,
            premiosObtenidosAcum: prev.premiosObtenidosAcum + (esPremio ? 1 : 0),
            lineasGanadorasAcum: prev.lineasGanadorasAcum + nuevoGiro.lineas_ganadoras
        }));
        
        setEstadisticas(prev => ({
            totalTiradas: prev.totalTiradas + 1,
            gananciaTotal: prev.gananciaTotal + nuevoGiro.ganancia_total,
            gastoTotal: prev.gastoTotal + nuevoGiro.apuesta_total,
            balance: prev.balance + (nuevoGiro.ganancia_total - nuevoGiro.apuesta_total),
            premiosObtenidos: prev.premiosObtenidos + (esPremio ? 1 : 0),
            lineasGanadorasTotal: prev.lineasGanadorasTotal + nuevoGiro.lineas_ganadoras
        }));
    };

    const animarReel = (row: number, col: number, duracion: number) => {
        return new Promise<void>((resolve) => {
            const reel = reelRefs.current[row][col];
            if (!reel) return resolve();

            let contador = 0;
            const maxGiros = Math.floor(duracion / 100);
            const simbolos = ["🍒", "🍋", "🍊", "🍉", "⭐", "🔔", "🍇", "7️⃣", "💎", "👑"];

            const interval = setInterval(() => {
                const simboloAleatorio = simbolos[Math.floor(Math.random() * simbolos.length)];
                setReels(prev => {
                    const nuevos = [...prev];
                    nuevos[row][col] = simboloAleatorio;
                    return nuevos;
                });

                reel.style.transform = `rotateY(${contador * 180}deg)`;
                contador++;

                if (contador >= maxGiros) {
                    clearInterval(interval);
                    reel.style.transform = 'rotateY(0deg)';
                    resolve();
                }
            }, 100);
        });
    };

    const animarTodosReels = async () => {
        const promesas = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                // Animación escalonada
                const delay = col * 100 + row * 50;
                promesas.push(
                    new Promise(resolve => setTimeout(resolve, delay))
                    .then(() => animarReel(row, col, 1500))
                );
            }
        }
        await Promise.all(promesas);
    };

    const animarConfetti = (cantidad: number = 150) => {
        confetti({
            particleCount: cantidad,
            spread: 100,
            origin: { y: 0.6 }
        });
    };

    const girarTragamonedas = async () => {
        if (!usuario) {
            showMsg("Debes iniciar sesión para jugar.", "error");
            return;
        }
        if (girando) return;

        const apuestaTotal = apuestaSeleccionada * lineasActivas;
        if (usuario.saldo < apuestaTotal) {
            showMsg(`Saldo insuficiente. Necesitas $${apuestaTotal.toLocaleString()}`, "error");
            return;
        }

        setMensaje(null);
        setGananciaMostrar(0);
        setLineasGanadorasMostrar([]);
        setLineaResaltada(null);
        setGirando(true);

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/tragamonedas2/juegos/tragamonedas2?apuesta=${apuestaSeleccionada}&lineas_activas=${lineasActivas}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const resultado: ResultadoJuego = res.data;
            
            // Animación
            await animarTodosReels();
            
            // Mostrar resultado
            setReels(resultado.reels);
            setGananciaMostrar(resultado.ganancia_total);
            setMensaje(resultado.mensaje);
            setLineasGanadorasMostrar(resultado.lineas_ganadoras);
            setUsuario(prev => prev ? { ...prev, saldo: resultado.nuevo_saldo } : prev);
            
            // Efectos para ganancias
            if (resultado.ganancia_total > 0) {
                const cantidadConfetti = Math.min(500, 100 + resultado.ganancia_total / 100);
                animarConfetti(cantidadConfetti);
                
                // Resaltar líneas ganadoras secuencialmente
                resultado.lineas_ganadoras.forEach((linea, index) => {
                    setTimeout(() => {
                        setLineaResaltada(linea.linea);
                    }, index * 1000);
                });
            }
            
            // Guardar en historial
            const nuevoGiro: HistorialGiro = {
                id: Date.now(),
                reels: resultado.reels,
                ganancia_total: resultado.ganancia_total,
                fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                apuesta_por_linea: resultado.apuesta_por_linea,
                apuesta_total: resultado.apuesta_total,
                lineas_activas: resultado.lineas_activas,
                lineas_ganadoras: resultado.total_lineas_ganadoras
            };
            
            setHistorial(prev => [nuevoGiro, ...prev.slice(0, 9)]);
            actualizarEstadisticas(nuevoGiro);
            
            setGirando(false);
        } catch (err: any) {
            console.error("Error al girar las tragamonedas:", err);
            showMsg(err.response?.data?.detail || "Error al girar las tragamonedas", "error");
            setGirando(false);
        }
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const limpiarHistorial = () => {
        setHistorial([]);
        localStorage.removeItem('historial_tragamonedas2');
        showMsg("Historial limpiado", "info");
    };

    const limpiarTodasEstadisticas = () => {
        setHistorial([]);
        setEstadisticas({
            totalTiradas: 0,
            gananciaTotal: 0,
            gastoTotal: 0,
            balance: 0,
            premiosObtenidos: 0,
            lineasGanadorasTotal: 0
        });
        setEstadisticasAcumulativas({
            totalTiradasAcum: 0,
            gananciaTotalAcum: 0,
            gastoTotalAcum: 0,
            premiosObtenidosAcum: 0,
            lineasGanadorasAcum: 0
        });
        localStorage.removeItem('historial_tragamonedas2');
        localStorage.removeItem("estadisticas_acumulativas_tragamonedas2");
        showMsg("Estadísticas reiniciadas completamente", "info");
    };

    const renderizarTablaPagos = () => {
        return Object.entries(TABLA_PAGOS).map(([symbol, valores]) => (
            <div key={symbol} className="mb-3 p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="text-2xl">{symbol}</span>
                        <span className="text-gray-400">-</span>
                        <div className="text-white">
                            {Object.entries(valores).map(([cant, mult]) => (
                                <span key={cant} className="mx-1">
                                    {cant}x: {mult}x
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-400">Premio por línea</div>
                        <div className="text-white font-bold">
                            ${(valores[3] * apuestaSeleccionada).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        ));
    };

    if (!usuario) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando tragamonedas 2.0...</p>
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
                cerrarSesion={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("usuario");
                    setUsuario(null);
                    navigate('/login');
                }}
                setUsuario={setUsuario}
            />

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-green-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500 to-green-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-20"></div>
                
                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-green-600/20 border border-blue-500/30 rounded-full text-sm font-bold text-blue-400">
                                🎰 TRAGAMONEDAS 2.0 DELUXE
                            </span>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-blue-400 via-green-400 to-blue-400 bg-clip-text text-transparent">
                                5x3 Reels • 10 Líneas
                            </span>
                            <br />
                            <span className="text-white">¡Hasta 1000x tu apuesta!</span>
                        </h1>
                        
                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Matriz <span className="text-blue-400 font-bold">5 columnas × 3 filas</span> • 
                            <span className="text-green-400 font-bold"> {lineasActivas} líneas activas</span> • 
                            Apuesta total: <span className="text-yellow-400 font-bold">${(apuestaSeleccionada * lineasActivas).toLocaleString()}</span>
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
                            <div className="relative w-full max-w-3xl mx-auto">
                                {/* Controles de apuesta */}
                                {!girando && (
                                    <div className="mb-8">
                                        <h3 className="text-xl font-bold text-white mb-4 text-center">💰 Configuración</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Selector de apuesta */}
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-300 mb-3">Apuesta por línea</h4>
                                                <div className="flex gap-2 flex-wrap mb-4">
                                                    {apuestasPermitidas.map((apuesta) => (
                                                        <button
                                                            key={apuesta}
                                                            onClick={() => setApuestaSeleccionada(apuesta)}
                                                            disabled={usuario.saldo < apuesta * lineasActivas}
                                                            className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                                                                apuestaSeleccionada === apuesta
                                                                    ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg'
                                                                    : usuario.saldo < apuesta * lineasActivas
                                                                    ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                                                                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70'
                                                            }`}
                                                        >
                                                            ${apuesta}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Selector de líneas */}
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-300 mb-3">Líneas activas: {lineasActivas}</h4>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => setLineasActivas(Math.max(1, lineasActivas - 1))}
                                                        disabled={lineasActivas <= 1}
                                                        className="px-4 py-2 bg-gray-800/50 rounded-lg disabled:opacity-50"
                                                    >
                                                        -
                                                    </button>
                                                    <div className="flex-1">
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max={totalLineas}
                                                            value={lineasActivas}
                                                            onChange={(e) => setLineasActivas(parseInt(e.target.value))}
                                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => setLineasActivas(Math.min(totalLineas, lineasActivas + 1))}
                                                        disabled={lineasActivas >= totalLineas}
                                                        className="px-4 py-2 bg-gray-800/50 rounded-lg disabled:opacity-50"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 text-center">
                                            <div className="text-gray-400">
                                                Apuesta por línea: <span className="text-blue-400 font-bold">${apuestaSeleccionada.toLocaleString()}</span> × 
                                                Líneas activas: <span className="text-green-400 font-bold">{lineasActivas}</span> = 
                                                Total: <span className="text-yellow-400 font-bold">${(apuestaSeleccionada * lineasActivas).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Máquina de tragamonedas 5x3 */}
                                <div className="mb-8 relative">
                                    {/* Líneas de pago visuales */}
                                    {LINEAS_VISUALES.slice(0, lineasActivas).map((linea, index) => (
                                        <div 
                                            key={index}
                                            className={`absolute inset-0 transition-all duration-500 ${
                                                lineaResaltada === index + 1 
                                                    ? 'opacity-100' 
                                                    : 'opacity-0'
                                            }`}
                                            style={{
                                                pointerEvents: 'none',
                                                zIndex: 10
                                            }}
                                        >
                                            <svg className="w-full h-full">
                                                <path
                                                    d={linea.map(([col, row], idx) => {
                                                        const x = 50 + col * 100; // Ajustar según tu grid
                                                        const y = 50 + row * 100;
                                                        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                                                    }).join(' ')}
                                                    stroke="rgba(59, 130, 246, 0.7)"
                                                    strokeWidth="3"
                                                    fill="none"
                                                    strokeDasharray="5,5"
                                                />
                                            </svg>
                                        </div>
                                    ))}
                                    
                                    {/* Grid de símbolos */}
                                    <div className="relative bg-gradient-to-b from-gray-900 to-black border-4 border-yellow-500 rounded-2xl p-6">
                                        {reels.map((fila, rowIndex) => (
                                            <div key={rowIndex} className="flex justify-center gap-4 mb-4 last:mb-0">
                                                {fila.map((simbolo, colIndex) => (
                                                    <div
                                                        key={`${rowIndex}-${colIndex}`}
                                                        ref={el => {
                                                            if (!reelRefs.current[rowIndex]) {
                                                                reelRefs.current[rowIndex] = [];
                                                            }
                                                            reelRefs.current[rowIndex][colIndex] = el;
                                                        }}
                                                        className={`flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/50 rounded-xl text-5xl transition-all duration-300 ${
                                                            girando ? 'animate-pulse' : ''
                                                        }`}
                                                    >
                                                        {simbolo}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Botón de girar */}
                                <div className="text-center">
                                    <div className="mb-6">
                                        <div className="text-2xl font-bold text-white mb-2">
                                            Saldo: <span className="text-yellow-400">${usuario?.saldo?.toLocaleString() ?? 0}</span>
                                        </div>
                                        {mensaje && (
                                            <div className={`px-4 py-3 rounded-xl font-bold mb-4 ${
                                                gananciaMostrar > 0
                                                    ? "bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50 text-green-200"
                                                    : "bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 border border-yellow-500/50 text-yellow-200"
                                            }`}>
                                                {mensaje}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button
                                        onClick={girarTragamonedas}
                                        disabled={girando || !usuario || (usuario && usuario.saldo < apuestaSeleccionada * lineasActivas)}
                                        className={`w-full py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${
                                            girando 
                                                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 hover:scale-105 active:scale-95'
                                        } ${(!usuario || (usuario && usuario.saldo < apuestaSeleccionada * lineasActivas)) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                            `🎰 Girar $${(apuestaSeleccionada * lineasActivas).toLocaleString()}`
                                        )}
                                    </button>
                                    
                                    {gananciaMostrar > 0 && (
                                        <div className="mt-6 p-6 bg-gradient-to-r from-gray-800/70 to-gray-900/70 border border-green-500/30 rounded-2xl">
                                            <div className="text-2xl font-bold text-white mb-2">¡Premio Ganado!</div>
                                            <div className="text-3xl text-green-400 font-bold">
                                                +${gananciaMostrar.toLocaleString()}
                                            </div>
                                            <div className="text-lg text-gray-300 mt-2">
                                                {lineasGanadorasMostrar.length} línea(s) ganadora(s)
                                            </div>
                                            {lineasGanadorasMostrar.map((linea, index) => (
                                                <div key={index} className="mt-3 p-3 bg-gray-900/50 rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className="text-blue-400">Línea {linea.linea}: </span>
                                                            <span className="text-xl">{linea.simbolos.join(' ')}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-green-400 font-bold">
                                                                +${linea.ganancia.toLocaleString()}
                                                            </div>
                                                            <div className="text-sm text-gray-400">
                                                                {linea.cantidad}x {linea.simbolo_ganador} × {linea.multiplicador}x
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
                    </div>
                    
                    {/* Panel Lateral */}
                    <div className="space-y-6">
                        {/* Estadísticas */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">📊 Estadísticas</h3>
                                <button
                                    onClick={limpiarTodasEstadisticas}
                                    className="px-3 py-1 text-sm bg-red-900/30 text-red-300 hover:bg-red-800/40 rounded-lg transition-colors"
                                >
                                    Reiniciar
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Tiradas</div>
                                    <div className="text-2xl font-bold text-blue-400">{estadisticas.totalTiradas}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Premios</div>
                                    <div className="text-2xl font-bold text-green-400">{estadisticas.premiosObtenidos}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Ganancias</div>
                                    <div className="text-2xl font-bold text-green-400">${estadisticas.gananciaTotal}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Balance</div>
                                    <div className={`text-2xl font-bold ${estadisticas.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${estadisticas.balance}
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 col-span-2">
                                    <div className="text-sm text-gray-400">Líneas Ganadoras</div>
                                    <div className="text-2xl font-bold text-purple-400">{estadisticas.lineasGanadorasTotal}</div>
                                    <div className="text-xs text-gray-500 mt-1">Total en todas las tiradas</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Tabla de Pagos */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">💎 Tabla de Pagos</h3>
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                {renderizarTablaPagos()}
                            </div>
                            <div className="mt-4 text-sm text-gray-400 text-center">
                                Pago por combinación de al menos 3 símbolos consecutivos desde la izquierda
                            </div>
                        </div>
                        
                        {/* Historial */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">📝 Historial</h3>
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
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                    {historial.map((giro) => (
                                        <div key={giro.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="text-sm text-gray-400">{giro.fecha}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {giro.lineas_activas} líneas × ${giro.apuesta_por_linea}
                                                    </div>
                                                </div>
                                                <div className={`text-right ${giro.ganancia_total > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                    <div className="font-bold">
                                                        {giro.ganancia_total > 0 ? `+$${giro.ganancia_total}` : '$0'}
                                                    </div>
                                                    <div className="text-xs">
                                                        {giro.lineas_ganadoras} línea(s)
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Información */}
                        <div className="bg-gradient-to-r from-blue-600/20 to-green-600/20 border border-blue-500/30 rounded-2xl p-6">
                            <h4 className="text-lg font-bold text-white mb-3">🎮 Cómo Jugar</h4>
                            <ul className="space-y-2 text-gray-300 text-sm">
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>Selecciona apuesta por línea y número de líneas</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>Gana con 3+ símbolos iguales consecutivos desde la izquierda</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>10 líneas de pago disponibles</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>Más líneas = más oportunidades pero mayor apuesta</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>¡Tres coronas (👑) pagan 1000x!</span>
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