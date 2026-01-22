// src/pages/cascadas.tsx
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
}

interface Configuracion {
    filas: number;
    columnas: number;
    apuesta_minima: number;
    apuesta_maxima: number;
    multiplicador_base: number;
}

interface SimboloInfo {
    peso: number;
    color: string;
    grupo: number;
}

interface Cascada {
    nivel: number;
    combinaciones_encontradas: number;
    simbolos_eliminados: number;
    puntaje: number;
    ganancia: number;
    bonus: number;
    detalles: any[];
    movimientos: any[];
    matriz_despues: string[][];
}

interface HistorialGiro {
    id: number;
    configuracion: string;
    apuesta: number;
    ganancia_total: number;
    niveles_cascada: number;
    fecha: string;
}

export default function Cascadas() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [matriz, setMatriz] = useState<string[][]>([]);
    const [cascadas, setCascadas] = useState<Cascada[]>([]);
    const [cascadaActual, setCascadaActual] = useState<number>(0);
    const [jugando, setJugando] = useState<boolean>(false);
    const [mostrandoAnimacion, setMostrandoAnimacion] = useState<boolean>(false);
    const [mensaje, setMensaje] = useState<string>("");
    const [gananciaTotal, setGananciaTotal] = useState<number>(0);
    
    // Configuración
    const [configSeleccionada, setConfigSeleccionada] = useState<string>("5x5");
    const [apuesta, setApuesta] = useState<number>(100);
    const [configuraciones, setConfiguraciones] = useState<Record<string, Configuracion>>({});
    const [simbolosInfo, setSimbolosInfo] = useState<Record<string, SimboloInfo>>({});
    
    // Estadísticas
    const [historial, setHistorial] = useState<HistorialGiro[]>([]);
    const [estadisticas, setEstadisticas] = useState({
        totalJuegos: 0,
        gananciaTotal: 0,
        cascadasTotales: 0,
        maxCascada: 0
    });
    
    // Referencias
    const matrizRef = useRef<HTMLDivElement>(null);
    const celdaRefs = useRef<(HTMLDivElement | null)[][]>([]);
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

    // Colores para los símbolos
    const COLORES: Record<string, string> = {
        "🔴": "bg-red-500",
        "🔵": "bg-blue-500",
        "🟢": "bg-green-500",
        "🟡": "bg-yellow-500",
        "🟣": "bg-purple-500",
        "🟠": "bg-orange-500",
        "💎": "bg-cyan-500",
        "⭐": "bg-yellow-300",
        "👑": "bg-pink-500"
    };

    // Multiplicadores
    const MULTIPLICADORES_COMBO: Record<number, number> = {
        3: 1, 4: 2, 5: 5, 6: 10, 7: 25, 8: 50, 9: 100, 10: 200
    };

    // Bonus por cascada
    const BONUS_CASCADA: Record<number, number> = {
        1: 1.0, 2: 1.2, 3: 1.5, 4: 2.0, 5: 3.0, 6: 5.0
    };

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

    // Cargar configuración del juego
    useEffect(() => {
        const cargarConfiguracion = async () => {
            try {
                const res = await axios.get(`${API_URL}/juegos/cascadas/configuraciones`);
                setConfiguraciones(res.data.configuraciones);
                setSimbolosInfo(res.data.simbolos);
                
                // Configurar apuesta inicial basada en la configuración seleccionada
                if (res.data.configuraciones["5x5"]) {
                    setApuesta(res.data.configuraciones["5x5"].apuesta_minima);
                }
                if (res.data.configuraciones["10x10"]) {
                    setApuesta(res.data.configuraciones["10x10"].apuesta_minima);
                }
            } catch (error) {
                console.error("Error al cargar configuración:", error);
            }
        };
        
        cargarConfiguracion();
    }, []);

    // Cargar historial
    useEffect(() => {
        const historialGuardado = localStorage.getItem('historial_cascadas');
        if (historialGuardado) {
            setHistorial(JSON.parse(historialGuardado).slice(0, 10));
        }
        
        const stats = localStorage.getItem("estadisticas_cascadas");
        if (stats) {
            setEstadisticas(JSON.parse(stats));
        }
    }, []);

    // Guardar historial
    useEffect(() => {
        if (historial.length > 0) {
            localStorage.setItem('historial_cascadas', JSON.stringify(historial.slice(0, 10)));
        }
    }, [historial]);

    // Guardar estadísticas
    useEffect(() => {
        localStorage.setItem("estadisticas_cascadas", JSON.stringify(estadisticas));
    }, [estadisticas]);

    // Inicializar matriz vacía
    useEffect(() => {
        if (configuraciones[configSeleccionada]) {
            const config = configuraciones[configSeleccionada];
            const nuevaMatriz = Array(config.filas)
                .fill(null)
                .map(() => Array(config.columnas).fill(""));
            setMatriz(nuevaMatriz);
            
            // Reinicializar referencias
            celdaRefs.current = nuevaMatriz.map(() => []);
        }
    }, [configSeleccionada, configuraciones]);

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const animarCaida = async (movimientos: any[]) => {
        return new Promise<void>(resolve => {
            let completados = 0;
            const total = movimientos.length;
            
            if (total === 0) {
                resolve();
                return;
            }
            
            movimientos.forEach(mov => {
                const { desde, hacia, simbolo, nuevo } = mov;
                
                if (nuevo) {
                    // Animación de aparición desde arriba
                    const celda = celdaRefs.current[hacia[0]][hacia[1]];
                    if (celda) {
                        celda.style.transform = "translateY(-100px)";
                        celda.style.opacity = "0";
                        
                        setTimeout(() => {
                            celda.style.transition = "all 0.3s ease";
                            celda.style.transform = "translateY(0)";
                            celda.style.opacity = "1";
                            
                            completados++;
                            if (completados === total) resolve();
                        }, 100);
                    } else {
                        completados++;
                        if (completados === total) resolve();
                    }
                } else if (desde) {
                    // Animación de caída
                    const celdaOrigen = celdaRefs.current[desde[0]][desde[1]];
                    const celdaDestino = celdaRefs.current[hacia[0]][hacia[1]];
                    
                    if (celdaOrigen && celdaDestino) {
                        // Crear elemento flotante para la animación
                        const floating = document.createElement("div");
                        floating.className = `absolute ${COLORES[simbolo] || 'bg-gray-500'} w-10 h-10 rounded-lg flex items-center justify-center text-xl`;
                        floating.textContent = simbolo;
                        floating.style.left = `${celdaOrigen.offsetLeft}px`;
                        floating.style.top = `${celdaOrigen.offsetTop}px`;
                        floating.style.transition = "all 0.5s ease";
                        floating.style.zIndex = "100";
                        
                        matrizRef.current?.appendChild(floating);
                        
                        // Animar
                        setTimeout(() => {
                            floating.style.left = `${celdaDestino.offsetLeft}px`;
                            floating.style.top = `${celdaDestino.offsetTop}px`;
                            
                            setTimeout(() => {
                                matrizRef.current?.removeChild(floating);
                                completados++;
                                if (completados === total) resolve();
                            }, 500);
                        }, 100);
                    } else {
                        completados++;
                        if (completados === total) resolve();
                    }
                }
            });
        });
    };

    const animarExplosion = async (posiciones: [number, number][]) => {
        return new Promise<void>(resolve => {
            if (posiciones.length === 0) {
                resolve();
                return;
            }
            
            posiciones.forEach(([fila, col]) => {
                const celda = celdaRefs.current[fila][col];
                if (celda) {
                    // Efecto de explosión
                    celda.style.transition = "all 0.3s ease";
                    celda.style.transform = "scale(1.5)";
                    celda.style.opacity = "0.5";
                    
                    setTimeout(() => {
                        celda.style.transform = "scale(0)";
                        celda.style.opacity = "0";
                    }, 150);
                }
            });
            
            setTimeout(() => {
                // Restaurar tamaño
                posiciones.forEach(([fila, col]) => {
                    const celda = celdaRefs.current[fila][col];
                    if (celda) {
                        celda.style.transition = "";
                        celda.style.transform = "";
                        celda.style.opacity = "";
                    }
                });
                resolve();
            }, 300);
        });
    };

    const mostrarCascada = async (cascada: Cascada, index: number) => {
        setCascadaActual(index);
        setMostrandoAnimacion(true);
        
        // Obtener todas las posiciones a explotar
        const posicionesExplotar: [number, number][] = [];
        cascada.detalles.forEach(detalle => {
            detalle.posiciones.forEach((pos: [number, number]) => {
                posicionesExplotar.push(pos);
            });
        });
        
        // Animar explosión
        await animarExplosion(posicionesExplotar);
        
        // Actualizar matriz visualmente
        setMatriz(cascada.matriz_despues);
        
        // Animar caída si hay movimientos
        if (cascada.movimientos && cascada.movimientos.length > 0) {
            await animarCaida(cascada.movimientos);
        }
        
        setMostrandoAnimacion(false);
        
        // Mostrar confetti para ganancias importantes
        if (cascada.ganancia > apuesta * 5) {
            confetti({
                particleCount: Math.min(200, cascada.ganancia / 100),
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    };

    const jugar = async () => {
        if (!usuario) {
            showMsg("Debes iniciar sesión para jugar.", "error");
            return;
        }
        
        if (jugando || mostrandoAnimacion) {
            return;
        }
        
        const config = configuraciones[configSeleccionada];
        if (!config) {
            showMsg("Configuración no válida.", "error");
            return;
        }
        
        if (apuesta < config.apuesta_minima || apuesta > config.apuesta_maxima) {
            showMsg(`Apuesta fuera de rango. Para ${configSeleccionada}: $${config.apuesta_minima} - $${config.apuesta_maxima}`, "error");
            return;
        }
        
        if (usuario.saldo < apuesta) {
            showMsg("Saldo insuficiente.", "error");
            return;
        }
        
        setJugando(true);
        setCascadas([]);
        setCascadaActual(0);
        setMensaje("");
        setGananciaTotal(0);
        
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/cascadas?configuracion=${configSeleccionada}&apuesta=${apuesta}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const resultado = res.data;
            setCascadas(resultado.cascadas);
            setGananciaTotal(resultado.ganancia_total);
            setMensaje(resultado.mensaje);
            setUsuario(prev => prev ? { ...prev, saldo: resultado.nuevo_saldo } : prev);
            
            // Mostrar animación de cascadas secuencialmente
            if (resultado.cascadas.length > 0) {
                for (let i = 0; i < resultado.cascadas.length; i++) {
                    await mostrarCascada(resultado.cascadas[i], i);
                    if (i < resultado.cascadas.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa entre cascadas
                    }
                }
                
                // Gran confetti al final si hay buena ganancia
                if (resultado.ganancia_total > apuesta * 10) {
                    confetti({
                        particleCount: 500,
                        spread: 100,
                        origin: { y: 0.6 }
                    });
                }
            } else {
                // Mostrar matriz inicial si no hay cascadas
                setMatriz(resultado.matriz_inicial);
            }
            
            // Actualizar estadísticas
            const nuevoHistorial: HistorialGiro = {
                id: Date.now(),
                configuracion: configSeleccionada,
                apuesta: apuesta,
                ganancia_total: resultado.ganancia_total,
                niveles_cascada: resultado.niveles_cascada,
                fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            
            setHistorial(prev => [nuevoHistorial, ...prev.slice(0, 9)]);
            
            // Actualizar estadísticas
            setEstadisticas(prev => ({
                totalJuegos: prev.totalJuegos + 1,
                gananciaTotal: prev.gananciaTotal + resultado.ganancia_total,
                cascadasTotales: prev.cascadasTotales + resultado.niveles_cascada,
                maxCascada: Math.max(prev.maxCascada, resultado.niveles_cascada)
            }));
            
        } catch (err: any) {
            console.error("Error al jugar:", err);
            showMsg(err.response?.data?.detail || "Error al jugar", "error");
        } finally {
            setJugando(false);
        }
    };

    const simular = async () => {
        try {
            const res = await axios.get(
                `${API_URL}/juegos/cascadas/simular?configuracion=${configSeleccionada}&pasos=3`
            );
            
            setMatriz(res.data.matriz_inicial);
            showMsg("Simulación cargada. ¡Ahora puedes jugar con esta matriz!", "info");
        } catch (error) {
            console.error("Error al simular:", error);
        }
    };

    const renderizarTablaMultiplicadores = () => {
        return Object.entries(MULTIPLICADORES_COMBO).map(([cantidad, mult]) => (
            <div key={cantidad} className="flex justify-between items-center p-2 bg-gray-800/40 rounded">
                <span className="text-gray-300">{cantidad} símbolos</span>
                <span className="text-yellow-400 font-bold">{mult}x</span>
            </div>
        ));
    };

    const renderizarTablaBonus = () => {
        return Object.entries(BONUS_CASCADA).map(([nivel, bonus]) => (
            <div key={nivel} className="flex justify-between items-center p-2 bg-gray-800/40 rounded">
                <span className="text-gray-300">Nivel {nivel}</span>
                <span className="text-green-400 font-bold">{bonus}x</span>
            </div>
        ));
    };

    const config = configuraciones[configSeleccionada] || { filas: 5, columnas: 5 };

    if (!usuario) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando Cascadas...</p>
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
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-20"></div>
                
                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-full text-sm font-bold text-cyan-400">
                                🎮 CASCADAS TETRIS
                            </span>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                ¡Combina y Explota!
                            </span>
                            <br />
                            <span className="text-white">Hasta 6 niveles de cascada</span>
                        </h1>
                        
                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Los símbolos caen como en Tetris. Forma combinaciones de 3+ para hacerlos explotar
                            y crear reacciones en cadena con multiplicadores crecientes.
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
                            {/* Controles */}
                            <div className="mb-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* Selector de configuración */}
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-3">🎯 Tamaño de Matriz</h3>
                                        <div className="flex gap-3">
                                            {Object.keys(configuraciones).map(config => (
                                                <button
                                                    key={config}
                                                    onClick={() => {
                                                        setConfigSeleccionada(config);
                                                        const cfg = configuraciones[config];
                                                        setApuesta(cfg.apuesta_minima);
                                                    }}
                                                    className={`px-4 py-3 rounded-xl font-bold transition-all duration-300 ${
                                                        configSeleccionada === config
                                                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                                                            : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70'
                                                    }`}
                                                >
                                                    {config}
                                                    <div className="text-xs font-normal">
                                                        {configuraciones[config]?.multiplicador_base}x base
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Selector de apuesta */}
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-3">💰 Apuesta</h3>
                                        <div className="mb-3">
                                            <input
                                                type="range"
                                                min={config.apuesta_minima || 100}
                                                max={config.apuesta_maxima || 5000}
                                                step={100}
                                                value={apuesta}
                                                onChange={(e) => setApuesta(parseInt(e.target.value))}
                                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <div className="flex justify-between text-sm text-gray-400 mt-1">
                                                <span>${config.apuesta_minima || 100}</span>
                                                <span className="text-yellow-400 font-bold">${apuesta}</span>
                                                <span>${config.apuesta_maxima || 5000}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {[config.apuesta_minima || 100, 500, 1000, 2000, config.apuesta_maxima || 5000]
                                                .filter(v => v >= (config.apuesta_minima || 100) && v <= (config.apuesta_maxima || 5000))
                                                .map(valor => (
                                                    <button
                                                        key={valor}
                                                        onClick={() => setApuesta(valor)}
                                                        className={`px-3 py-1 rounded-lg text-sm ${
                                                            apuesta === valor
                                                                ? 'bg-cyan-700 text-white'
                                                                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70'
                                                        }`}
                                                    >
                                                        ${valor}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Información de apuesta */}
                                <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-sm text-gray-400">Configuración</div>
                                            <div className="text-lg font-bold text-cyan-400">{configSeleccionada}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm text-gray-400">Apuesta</div>
                                            <div className="text-lg font-bold text-yellow-400">${apuesta}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm text-gray-400">Multiplicador Base</div>
                                            <div className="text-lg font-bold text-green-400">{config.multiplicador_base || 1}x</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm text-gray-400">Saldo</div>
                                            <div className="text-lg font-bold text-white">${usuario?.saldo?.toLocaleString() || 0}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Matriz del juego */}
                            <div className="mb-8">
                                <div ref={matrizRef} className="relative bg-gradient-to-b from-gray-900 to-black border-4 border-cyan-500 rounded-2xl p-4 md:p-6">
                                    {matriz.map((fila, filaIndex) => (
                                        <div key={filaIndex} className="flex justify-center gap-1 md:gap-2 mb-1 md:mb-2 last:mb-0">
                                            {fila.map((simbolo, colIndex) => (
                                                <div
                                                    key={`${filaIndex}-${colIndex}`}
                                                    ref={el => {
                                                        if (!celdaRefs.current[filaIndex]) {
                                                            celdaRefs.current[filaIndex] = [];
                                                        }
                                                        celdaRefs.current[filaIndex][colIndex] = el;
                                                    }}
                                                    className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg border-2 border-gray-700/50 transition-all duration-300 ${
                                                        COLORES[simbolo] || 'bg-gray-800'
                                                    } ${
                                                        mostrandoAnimacion ? 'animate-pulse' : ''
                                                    }`}
                                                    style={{
                                                        boxShadow: simbolo ? '0 4px 6px rgba(0, 0, 0, 0.3)' : 'none'
                                                    }}
                                                >
                                                    <span className="text-xl md:text-2xl">{simbolo || ""}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    
                                    {/* Grid overlay */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {Array.from({ length: config.filas }).map((_, i) => (
                                            <div key={`row-${i}`} className="absolute left-0 right-0 h-px bg-gray-700/30" 
                                                style={{ top: `${(i + 1) * (100 / config.filas)}%` }} />
                                        ))}
                                        {Array.from({ length: config.columnas }).map((_, i) => (
                                            <div key={`col-${i}`} className="absolute top-0 bottom-0 w-px bg-gray-700/30" 
                                                style={{ left: `${(i + 1) * (100 / config.columnas)}%` }} />
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Indicador de cascada actual */}
                                {cascadas.length > 0 && (
                                    <div className="mt-4 text-center">
                                        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-900/30 rounded-full">
                                            <span className="text-cyan-400">Cascada {cascadaActual + 1} de {cascadas.length}</span>
                                            <div className="flex space-x-1">
                                                {cascadas.map((_, idx) => (
                                                    <div key={idx} className={`w-2 h-2 rounded-full ${
                                                        idx === cascadaActual ? 'bg-cyan-400' : 'bg-gray-600'
                                                    }`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Botones y mensajes */}
                            <div className="text-center">
                                {mensaje && (
                                    <div className={`mb-6 p-4 rounded-xl font-bold ${
                                        gananciaTotal > 0
                                            ? "bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50 text-green-200"
                                            : "bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 border border-yellow-500/50 text-yellow-200"
                                    }`}>
                                        {mensaje}
                                    </div>
                                )}
                                
                                <div className="flex gap-4 justify-center">
                                    <button
                                        onClick={simular}
                                        disabled={jugando || mostrandoAnimacion}
                                        className="px-6 py-3 bg-gray-800/50 hover:bg-gray-700/70 rounded-xl font-bold text-white transition-colors disabled:opacity-50"
                                    >
                                        🔄 Simular
                                    </button>
                                    
                                    <button
                                        onClick={jugar}
                                        disabled={jugando || mostrandoAnimacion || !usuario || usuario.saldo < apuesta}
                                        className={`px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
                                            jugando || mostrandoAnimacion
                                                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 hover:scale-105 active:scale-95'
                                        } ${(!usuario || usuario.saldo < apuesta) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {jugando ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Jugando...
                                            </span>
                                        ) : (
                                            `🎮 Jugar por $${apuesta}`
                                        )}
                                    </button>
                                </div>
                                
                                {gananciaTotal > 0 && (
                                    <div className="mt-6 p-6 bg-gradient-to-r from-gray-800/70 to-gray-900/70 border border-green-500/30 rounded-2xl">
                                        <div className="text-2xl font-bold text-white mb-2">🏆 Resumen del Juego</div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="text-center">
                                                <div className="text-sm text-gray-400">Ganancia Total</div>
                                                <div className="text-2xl text-green-400 font-bold">${gananciaTotal.toFixed(2)}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm text-gray-400">Niveles Cascada</div>
                                                <div className="text-2xl text-cyan-400 font-bold">{cascadas.length}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm text-gray-400">Ganancia Neta</div>
                                                <div className={`text-xl font-bold ${gananciaTotal - apuesta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    ${(gananciaTotal - apuesta).toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm text-gray-400">ROI</div>
                                                <div className={`text-xl font-bold ${gananciaTotal - apuesta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {(((gananciaTotal - apuesta) / apuesta) * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Panel Lateral */}
                    <div className="space-y-6">
                        {/* Estadísticas */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📊 Estadísticas</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Total Juegos</div>
                                    <div className="text-2xl font-bold text-blue-400">{estadisticas.totalJuegos}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Ganancia Total</div>
                                    <div className="text-2xl font-bold text-green-400">${estadisticas.gananciaTotal.toFixed(2)}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Cascadas Totales</div>
                                    <div className="text-2xl font-bold text-cyan-400">{estadisticas.cascadasTotales}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Máx. Cascada</div>
                                    <div className="text-2xl font-bold text-purple-400">{estadisticas.maxCascada}</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Símbolos */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">🎯 Símbolos</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {Object.entries(simbolosInfo).map(([simbolo, info]) => (
                                    <div key={simbolo} className="text-center p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                                        <div className="text-3xl mb-1">{simbolo}</div>
                                        <div className="text-sm text-gray-400">Grupo {info.grupo}</div>
                                        <div className="text-xs text-gray-500">Peso: {info.peso}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Multiplicadores */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📈 Multiplicadores</h3>
                            <div className="mb-4">
                                <h4 className="text-lg font-semibold text-gray-300 mb-2">Por cantidad de símbolos</h4>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {renderizarTablaMultiplicadores()}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-gray-300 mb-2">Bonus por cascada</h4>
                                <div className="space-y-1">
                                    {renderizarTablaBonus()}
                                </div>
                            </div>
                        </div>
                        
                        {/* Historial */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📝 Historial</h3>
                            {historial.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-3">🎮</div>
                                    <p className="text-gray-400">No hay juegos registrados</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                    {historial.map((juego) => (
                                        <div key={juego.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="text-white font-medium">{juego.configuracion}</div>
                                                    <div className="text-sm text-gray-400">{juego.fecha}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Niveles: {juego.niveles_cascada}
                                                    </div>
                                                </div>
                                                <div className={`text-right ${juego.ganancia_total > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                    <div className="font-bold">
                                                        {juego.ganancia_total > 0 ? `+$${juego.ganancia_total.toFixed(2)}` : '$0'}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        Apuesta: ${juego.apuesta}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Instrucciones */}
                        <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-2xl p-6">
                            <h4 className="text-lg font-bold text-white mb-3">📖 Cómo Jugar</h4>
                            <ul className="space-y-2 text-gray-300 text-sm">
                                <li className="flex items-start space-x-2">
                                    <span className="text-cyan-400">1.</span>
                                    <span>Elige el tamaño de matriz (5x5 o 10x10)</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-cyan-400">2.</span>
                                    <span>Selecciona tu apuesta</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-cyan-400">3.</span>
                                    <span>Haz clic en Jugar para generar la matriz</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-cyan-400">4.</span>
                                    <span>Los símbolos iguales adyacentes (3+) explotan</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-cyan-400">5.</span>
                                    <span>Los de arriba caen y pueden crear más explosiones</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-cyan-400">6.</span>
                                    <span>Cada nivel de cascada aumenta el multiplicador</span>
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