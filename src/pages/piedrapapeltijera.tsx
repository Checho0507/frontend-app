import React, { useState, useEffect } from "react";
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

interface HistorialJuego {
    id: number;
    eleccion_usuario: string;
    eleccion_maquina: string;
    resultado: string;
    ganancia: number;
    fecha: string;
    apostado: number;
}

interface Opcion {
    tipo: string;
    nombre: string;
    emoji: string;
}

interface Probabilidades {
    gana_usuario: number;
    gana_maquina: number;
    empate: number;
    reglas: {
        piedra: string;
        papel: string;
        tijera: string;
    };
}

const APUESTA_MINIMA = 50;

const OPCIONES: Record<string, Opcion> = {
    piedra: {
        tipo: "piedra",
        nombre: "Piedra",
        emoji: "🪨"
    },
    papel: {
        tipo: "papel",
        nombre: "Papel",
        emoji: "📄"
    },
    tijera: {
        tipo: "tijera",
        nombre: "Tijera",
        emoji: "✂️"
    }
};

export default function PiedraPapelTijera() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [apuesta, setApuesta] = useState<number>(APUESTA_MINIMA);
    const [eleccion, setEleccion] = useState<string | null>(null);
    const [jugando, setJugando] = useState(false);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [resultado, setResultado] = useState<{
        resultado: string;
        eleccion_usuario: Opcion;
        eleccion_maquina: Opcion;
        ganancia: number;
        mensaje: string;
    } | null>(null);
    const [historial, setHistorial] = useState<HistorialJuego[]>([]);
    const [probabilidades, setProbabilidades] = useState<Probabilidades | null>(null);
    const [estadisticas, setEstadisticas] = useState({
        totalJuegos: 0,
        ganadas: 0,
        perdidas: 0,
        empates: 0,
        gananciaTotal: 0,
        gastoTotal: 0,
        balance: 0
    });
    const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({
        totalJuegosAcum: 0,
        ganadasAcum: 0,
        perdidasAcum: 0,
        empatesAcum: 0,
        gananciaTotalAcum: 0,
        gastoTotalAcum: 0,
    });
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
    }, [navigate, usuario]);

    // Cargar probabilidades al iniciar
    useEffect(() => {
        const cargarProbabilidades = async () => {
            try {
                const res = await axios.get(`${API_URL}/juegos/piedrapapeltijera/probabilidades`);
                setProbabilidades(res.data.probabilidades);
            } catch (error) {
                console.error("Error al cargar probabilidades:", error);
            }
        };
        cargarProbabilidades();
    }, []);

    // Cargar historial y estadísticas desde localStorage al iniciar
    useEffect(() => {
        const historialGuardado = localStorage.getItem("historial_ppt");
        if (historialGuardado) {
            const historialParsed = JSON.parse(historialGuardado);
            setHistorial(historialParsed);
        }

        const statsAcum = localStorage.getItem("estadisticas_acumulativas_ppt");
        if (statsAcum) {
            const parsedStats = JSON.parse(statsAcum);
            setEstadisticasAcumulativas(parsedStats);

            const balance = parsedStats.gananciaTotalAcum - parsedStats.gastoTotalAcum;
            setEstadisticas({
                totalJuegos: parsedStats.totalJuegosAcum,
                ganadas: parsedStats.ganadasAcum,
                perdidas: parsedStats.perdidasAcum,
                empates: parsedStats.empatesAcum,
                gananciaTotal: parsedStats.gananciaTotalAcum,
                gastoTotal: parsedStats.gastoTotalAcum,
                balance: balance
            });
        }
    }, []);

    // Guardar historial en localStorage
    useEffect(() => {
        if (historial.length > 0) {
            localStorage.setItem("historial_ppt", JSON.stringify(historial.slice(0, 15)));
        }
    }, [historial]);

    // Guardar estadísticas acumulativas en localStorage
    useEffect(() => {
        if (estadisticasAcumulativas.totalJuegosAcum > 0) {
            localStorage.setItem("estadisticas_acumulativas_ppt", JSON.stringify(estadisticasAcumulativas));
        }
    }, [estadisticasAcumulativas]);

    const actualizarEstadisticas = (nuevoJuego: HistorialJuego) => {
        const resultado = nuevoJuego.resultado;
        
        // Actualizar estadísticas acumulativas
        setEstadisticasAcumulativas(prev => {
            const nuevoTotal = prev.totalJuegosAcum + 1;
            const nuevasGanadas = prev.ganadasAcum + (resultado === "gana_usuario" ? 1 : 0);
            const nuevasPerdidas = prev.perdidasAcum + (resultado === "gana_maquina" ? 1 : 0);
            const nuevosEmpates = prev.empatesAcum + (resultado === "empate" ? 1 : 0);
            const nuevaGananciaTotal = prev.gananciaTotalAcum + nuevoJuego.ganancia;
            const nuevoGastoTotal = prev.gastoTotalAcum + nuevoJuego.apostado;

            return {
                totalJuegosAcum: nuevoTotal,
                ganadasAcum: nuevasGanadas,
                perdidasAcum: nuevasPerdidas,
                empatesAcum: nuevosEmpates,
                gananciaTotalAcum: nuevaGananciaTotal,
                gastoTotalAcum: nuevoGastoTotal
            };
        });

        // Actualizar estadísticas visibles
        setEstadisticas(prev => {
            const nuevoTotal = prev.totalJuegos + 1;
            const nuevasGanadas = prev.ganadas + (resultado === "gana_usuario" ? 1 : 0);
            const nuevasPerdidas = prev.perdidas + (resultado === "gana_maquina" ? 1 : 0);
            const nuevosEmpates = prev.empates + (resultado === "empate" ? 1 : 0);
            const nuevaGananciaTotal = prev.gananciaTotal + nuevoJuego.ganancia;
            const nuevoGastoTotal = prev.gastoTotal + nuevoJuego.apostado;
            const nuevoBalance = nuevaGananciaTotal - nuevoGastoTotal;

            return {
                totalJuegos: nuevoTotal,
                ganadas: nuevasGanadas,
                perdidas: nuevasPerdidas,
                empates: nuevosEmpates,
                gananciaTotal: nuevaGananciaTotal,
                gastoTotal: nuevoGastoTotal,
                balance: nuevoBalance
            };
        });
    };

    const agregarAlHistorial = (
        eleccion_usuario: Opcion,
        eleccion_maquina: Opcion,
        resultado: string,
        ganancia: number,
        apostado: number
    ) => {
        const nuevoJuego: HistorialJuego = {
            id: Date.now(),
            eleccion_usuario: eleccion_usuario.emoji,
            eleccion_maquina: eleccion_maquina.emoji,
            resultado,
            ganancia,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            apostado
        };

        const nuevoHistorial = [nuevoJuego, ...historial.slice(0, 14)];
        setHistorial(nuevoHistorial);
        actualizarEstadisticas(nuevoJuego);
    };

    const animarConfetti = () => {
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 }
        });
        setTimeout(() => {
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
        }, 250);
    };

    const realizarJugada = async () => {
        if (!usuario) {
            setMensaje("Debes iniciar sesión para jugar.");
            return;
        }
        
        if (!eleccion) {
            setMensaje("Debes elegir Piedra, Papel o Tijera.");
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

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/piedrapapeltijera`,
                { 
                    apuesta: apuesta,
                    eleccion: eleccion
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = res.data;
            
            // Actualizar saldo del usuario
            setUsuario(prev => prev ? { ...prev, saldo: data.nuevo_saldo } : null);
            
            // Mostrar resultado
            setResultado({
                resultado: data.resultado,
                eleccion_usuario: data.eleccion_usuario,
                eleccion_maquina: data.eleccion_maquina,
                ganancia: data.ganancia,
                mensaje: data.mensaje
            });
            
            // Animación de confetti si ganó
            if (data.resultado === "gana_usuario") {
                animarConfetti();
            }
            
            // Agregar al historial
            agregarAlHistorial(
                data.eleccion_usuario,
                data.eleccion_maquina,
                data.resultado,
                data.ganancia,
                apuesta
            );
            
            setMensaje(data.mensaje);
            
        } catch (err: any) {
            console.error("Error al realizar apuesta:", err);
            setMensaje(err.response?.data?.detail || "Error al procesar la apuesta");
        } finally {
            setJugando(false);
        }
    };

    const limpiarHistorial = () => {
        setHistorial([]);
        localStorage.removeItem("historial_ppt");
        showMsg("Historial limpiado", "info");
    };

    const limpiarTodasEstadisticas = () => {
        setHistorial([]);
        setEstadisticas({
            totalJuegos: 0,
            ganadas: 0,
            perdidas: 0,
            empates: 0,
            gananciaTotal: 0,
            gastoTotal: 0,
            balance: 0
        });
        setEstadisticasAcumulativas({
            totalJuegosAcum: 0,
            ganadasAcum: 0,
            perdidasAcum: 0,
            empatesAcum: 0,
            gananciaTotalAcum: 0,
            gastoTotalAcum: 0,
        });
        localStorage.removeItem("historial_ppt");
        localStorage.removeItem("estadisticas_acumulativas_ppt");
        showMsg("Estadísticas reiniciadas completamente", "info");
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const cerrarSesion = () => {
        setUsuario(null);
    };

    const valoresApuesta = [50, 100, 200, 500, 1000, 2000, 5000];

    const renderOpcion = (opcion: Opcion, esSeleccionada: boolean, onClick: () => void) => {
        const colores = {
            piedra: 'from-gray-600 to-gray-800 border-gray-500 hover:border-gray-400',
            papel: 'from-blue-600 to-blue-800 border-blue-500 hover:border-blue-400',
            tijera: 'from-red-600 to-red-800 border-red-500 hover:border-red-400'
        };

        return (
            <button
                onClick={onClick}
                className={`flex flex-col items-center justify-center p-8 rounded-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${esSeleccionada
                    ? `${colores[opcion.tipo as keyof typeof colores]} border-4 scale-110 shadow-2xl`
                    : `bg-gradient-to-br ${colores[opcion.tipo as keyof typeof colores]} border-2 opacity-90 hover:opacity-100`
                    }`}
            >
                <div className="text-8xl mb-6">{opcion.emoji}</div>
                <div className="text-3xl font-bold text-white">{opcion.nombre}</div>
                {esSeleccionada && (
                    <div className="mt-4 px-4 py-2 bg-white/20 rounded-full text-sm font-bold text-white">
                        SELECCIONADO
                    </div>
                )}
            </button>
        );
    };

    const renderResultado = () => {
        if (!resultado) return null;

        const getColorResultado = () => {
            switch (resultado.resultado) {
                case "gana_usuario": return "from-green-600 to-green-800";
                case "gana_maquina": return "from-red-600 to-red-800";
                case "empate": return "from-yellow-600 to-yellow-800";
                default: return "from-gray-600 to-gray-800";
            }
        };

        const getTextoResultado = () => {
            switch (resultado.resultado) {
                case "gana_usuario": return "🎉 ¡GANASTE! 🎉";
                case "gana_maquina": return "😢 ¡PERDISTE! 😢";
                case "empate": return "🤝 ¡EMPATE! 🤝";
                default: return "";
            }
        };

        const getRelacion = (usuario: Opcion, maquina: Opcion) => {
            if (usuario.tipo === maquina.tipo) return "vs";
            
            const reglas = {
                piedra: { vence_a: ["tijera"], es_vencido_por: ["papel"] },
                papel: { vence_a: ["piedra"], es_vencido_por: ["tijera"] },
                tijera: { vence_a: ["papel"], es_vencido_por: ["piedra"] }
            };

            if (reglas[usuario.tipo as keyof typeof reglas].vence_a.includes(maquina.tipo)) {
                return "vence a";
            } else {
                return "es vencido por";
            }
        };

        return (
            <div className="mt-12">
                <div className={`p-8 rounded-3xl bg-gradient-to-r ${getColorResultado()} border-4 border-white/20`}>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-white mb-6">{getTextoResultado()}</div>
                        
                        <div className="flex flex-col md:flex-row items-center justify-center space-y-8 md:space-y-0 md:space-x-12">
                            <div className="text-center">
                                <div className="text-xl text-gray-300 mb-3">Tu elección</div>
                                <div className="text-9xl">{resultado.eleccion_usuario.emoji}</div>
                                <div className="text-2xl font-bold text-white mt-3">{resultado.eleccion_usuario.nombre}</div>
                            </div>
                            
                            <div className="text-center">
                                <div className="text-5xl text-white font-bold mb-2">{getRelacion(resultado.eleccion_usuario, resultado.eleccion_maquina)}</div>
                                <div className="text-2xl text-gray-300">VS</div>
                            </div>
                            
                            <div className="text-center">
                                <div className="text-xl text-gray-300 mb-3">Máquina</div>
                                <div className="text-9xl">{resultado.eleccion_maquina.emoji}</div>
                                <div className="text-2xl font-bold text-white mt-3">{resultado.eleccion_maquina.nombre}</div>
                            </div>
                        </div>
                        
                        <div className="mt-8 text-3xl">
                            {resultado.resultado === "gana_usuario" && (
                                <span className="text-green-300 font-bold">
                                    +${resultado.ganancia} (${apuesta} × 2)
                                </span>
                            )}
                            {resultado.resultado === "gana_maquina" && (
                                <span className="text-red-300 font-bold">
                                    -${apuesta}
                                </span>
                            )}
                            {resultado.resultado === "empate" && (
                                <span className="text-yellow-300 font-bold">
                                    Se devuelven ${apuesta}
                                </span>
                            )}
                        </div>
                        
                        <div className="mt-6 text-xl text-gray-200">{resultado.mensaje}</div>
                    </div>
                </div>
            </div>
        );
    };

    const renderReglas = () => {
        if (!probabilidades) return null;

        return (
            <div className="mt-8 bg-gray-800/30 rounded-xl p-6">
                <h4 className="text-lg font-bold text-white mb-4 text-center">📜 Reglas del Juego</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <div className="text-3xl mb-2">🪨</div>
                        <div className="text-lg font-bold text-white mb-1">Piedra</div>
                        <div className="text-gray-400 text-sm">Vence a Tijera</div>
                        <div className="text-gray-500 text-xs mt-2">Es vencida por Papel</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <div className="text-3xl mb-2">📄</div>
                        <div className="text-lg font-bold text-white mb-1">Papel</div>
                        <div className="text-gray-400 text-sm">Vence a Piedra</div>
                        <div className="text-gray-500 text-xs mt-2">Es vencido por Tijera</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <div className="text-3xl mb-2">✂️</div>
                        <div className="text-lg font-bold text-white mb-1">Tijera</div>
                        <div className="text-gray-400 text-sm">Vence a Papel</div>
                        <div className="text-gray-500 text-xs mt-2">Es vencida por Piedra</div>
                    </div>
                </div>
                <div className="mt-4 text-center text-sm text-gray-400">
                    El ciclo es: Piedra → Tijera → Papel → Piedra
                </div>
            </div>
        );
    };

    if (!usuario) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando juego...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
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
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-purple-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-green-500 to-purple-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-500 to-red-500 rounded-full blur-3xl opacity-20"></div>

                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-green-600/20 to-purple-600/20 border border-green-500/30 rounded-full text-sm font-bold text-green-400">
                                🪨📄✂️ PIEDRA, PAPEL O TIJERA
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-green-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
                                Clásico Atemporal
                            </span>
                            <br />
                            <span className="text-white">¡Desafía a la máquina!</span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Apuesta desde <span className="text-yellow-400 font-bold">${APUESTA_MINIMA}</span>.
                            <span className="text-green-400 font-bold"> ¡Gana el doble si vences a la máquina!</span>
                            <br />
                            <span className="text-blue-400">⚖️ Empate: se devuelve tu apuesta</span>
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
                            <div className="max-w-4xl mx-auto">
                                {/* Saldo */}
                                <div className="text-center mb-8">
                                    <div className="text-3xl font-bold text-white mb-2">
                                        Saldo: <span className="text-yellow-400">${usuario?.saldo?.toLocaleString() ?? 0}</span>
                                    </div>
                                    {mensaje && (
                                        <div className={`px-6 py-4 rounded-xl font-bold mb-4 ${mensaje.includes("¡Ganaste") || mensaje.includes("Ganaste")
                                            ? "bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50 text-green-200"
                                            : mensaje.includes("Error") || mensaje.includes("insuficiente") || mensaje.includes("Debes") || mensaje.includes("Perdiste")
                                                ? "bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200"
                                                : mensaje.includes("Empate")
                                                    ? "bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 border border-yellow-500/50 text-yellow-200"
                                                    : "bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-500/50 text-blue-200"
                                            }`}>
                                            {mensaje}
                                        </div>
                                    )}
                                </div>

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
                                            className="w-full h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-green-500 [&::-webkit-slider-thumb]:to-purple-500"
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
                                                        ? 'bg-gradient-to-r from-green-600 to-purple-600 text-white scale-105'
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

                                {/* Selección de opciones */}
                                <div className="mb-10">
                                    <label className="block text-white text-xl font-bold mb-8 text-center">
                                        ✋ Elige tu jugada
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {Object.values(OPCIONES).map((opcion) => (
                                            <div key={opcion.tipo}>
                                                {renderOpcion(
                                                    opcion,
                                                    eleccion === opcion.tipo,
                                                    () => setEleccion(opcion.tipo)
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Botón de jugar */}
                                <button
                                    onClick={realizarJugada}
                                    disabled={jugando || !eleccion || apuesta < APUESTA_MINIMA || apuesta > usuario.saldo}
                                    className={`w-full py-5 px-8 rounded-xl font-bold text-xl transition-all duration-300 ${jugando || !eleccion || apuesta < APUESTA_MINIMA || apuesta > usuario.saldo
                                        ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                        : 'bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-500 hover:to-purple-500 hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20'
                                        }`}
                                >
                                    {jugando ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Jugando...
                                        </span>
                                    ) : (
                                        `🎮 Jugar por $${apuesta}`
                                    )}
                                </button>

                                {/* Resultado */}
                                {renderResultado()}

                                {/* Reglas */}
                                {renderReglas()}
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
                                    <div className="text-sm text-gray-400">Total Juegos</div>
                                    <div className="text-2xl font-bold text-blue-400">{estadisticas.totalJuegos}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Ganadas</div>
                                    <div className="text-2xl font-bold text-green-400">{estadisticas.ganadas}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {estadisticas.totalJuegos > 0 
                                            ? `${((estadisticas.ganadas / estadisticas.totalJuegos) * 100).toFixed(1)}%`
                                            : '0%'}
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Perdidas</div>
                                    <div className="text-2xl font-bold text-red-400">{estadisticas.perdidas}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {estadisticas.totalJuegos > 0 
                                            ? `${((estadisticas.perdidas / estadisticas.totalJuegos) * 100).toFixed(1)}%`
                                            : '0%'}
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Empates</div>
                                    <div className="text-2xl font-bold text-yellow-400">{estadisticas.empates}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {estadisticas.totalJuegos > 0 
                                            ? `${((estadisticas.empates / estadisticas.totalJuegos) * 100).toFixed(1)}%`
                                            : '0%'}
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
                            <div className="mt-4 p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                <div className="text-center">
                                    <div className="text-sm text-gray-400">Balance</div>
                                    <div className={`text-3xl font-bold ${estadisticas.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${estadisticas.balance}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {estadisticas.balance >= 0 ? 'Ganancia neta' : 'Pérdida neta'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Probabilidades */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📈 Probabilidades Teóricas</h3>
                            <div className="space-y-4">
                                {probabilidades ? (
                                    <>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-green-400">Ganas</span>
                                                <span className="text-gray-400">{probabilidades.gana_usuario}%</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-3">
                                                <div 
                                                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" 
                                                    style={{ width: `${probabilidades.gana_usuario}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-red-400">Pierdes</span>
                                                <span className="text-gray-400">{probabilidades.gana_maquina}%</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-3">
                                                <div 
                                                    className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full" 
                                                    style={{ width: `${probabilidades.gana_maquina}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-yellow-400">Empate</span>
                                                <span className="text-gray-400">{probabilidades.empate}%</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-3">
                                                <div 
                                                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-3 rounded-full" 
                                                    style={{ width: `${probabilidades.empate}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                        <p className="text-gray-400">Cargando probabilidades...</p>
                                    </div>
                                )}
                                <div className="pt-4 border-t border-gray-700/30">
                                    <div className="text-center text-gray-400">
                                        <span className="text-green-400">🎯 Multiplicador: 2x</span>
                                        <div className="text-sm mt-1">Si ganas, recibes el doble de tu apuesta</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Historial */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">📝 Historial de Juegos</h3>
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
                                    <div className="text-4xl mb-3">🪨📄✂️</div>
                                    <p className="text-gray-400">No hay juegos registrados</p>
                                    <p className="text-sm text-gray-500 mt-1">Realiza tu primera jugada</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                    {historial.map((juego) => (
                                        <div key={juego.id} className={`p-4 rounded-xl border ${juego.resultado === "gana_usuario"
                                            ? 'bg-gradient-to-r from-green-900/20 to-green-800/10 border-green-500/30'
                                            : juego.resultado === "gana_maquina"
                                                ? 'bg-gradient-to-r from-red-900/20 to-red-800/10 border-red-500/30'
                                                : 'bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 border-yellow-500/30'
                                            }`}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center space-x-3">
                                                        <div className="text-2xl">{juego.eleccion_usuario}</div>
                                                        <div className="text-gray-400">vs</div>
                                                        <div className="text-2xl">{juego.eleccion_maquina}</div>
                                                    </div>
                                                    <div className="text-sm text-gray-400 mt-1">{juego.fecha}</div>
                                                    <div className="text-xs text-gray-500">Apostado: ${juego.apostado}</div>
                                                </div>
                                                <div className={`text-right ${juego.resultado === "gana_usuario" ? 'text-green-400' :
                                                    juego.resultado === "gana_maquina" ? 'text-red-400' : 'text-yellow-400'
                                                    }`}>
                                                    <div className="text-2xl font-bold">
                                                        {juego.resultado === "gana_usuario" ? `+$${juego.ganancia}` :
                                                            juego.resultado === "gana_maquina" ? `-$${juego.apostado}` :
                                                                `±$${juego.apostado}`}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {juego.resultado === "gana_usuario" ? `Ganancia: $${juego.ganancia - juego.apostado}` :
                                                            juego.resultado === "gana_maquina" ? 'Pérdida total' :
                                                                'Empate'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Información */}
                        <div className="bg-gradient-to-r from-green-600/20 to-purple-600/20 border border-green-500/30 rounded-2xl p-6">
                            <h4 className="text-lg font-bold text-white mb-3">💡 Cómo jugar</h4>
                            <ul className="space-y-3 text-gray-300">
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>Elige la cantidad a apostar (mínimo ${APUESTA_MINIMA})</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>Selecciona <span className="text-gray-300">🪨 Piedra</span>, <span className="text-blue-300">📄 Papel</span> o <span className="text-red-300">✂️ Tijera</span></span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>La máquina elegirá aleatoriamente</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span><span className="text-green-400">Ganas</span> si vences a la máquina (x2)</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span><span className="text-red-400">Pierdes</span> si la máquina te vence</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span><span className="text-yellow-400">Empate</span>: se devuelve tu apuesta</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
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