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

interface HistorialApuesta {
    id: number;
    carta_usuario: string;
    carta_casa: string;
    resultado: string;
    ganancia: number;
    fecha: string;
    apostado: number;
}

interface Carta {
    valor: number;
    nombre: string;
    simbolo: string;
    palo: string;
}

interface Probabilidades {
    gana_usuario: number;
    gana_casa: number;
    empate: number;
}

const APUESTA_MINIMA = 50;
const PALOS = ["♠️", "♥️", "♦️", "♣️"];
const VALORES_CARTAS: { [key: number]: [string, string] } = {
    1: ["As", "A"],
    2: ["2", "2"],
    3: ["3", "3"],
    4: ["4", "4"],
    5: ["5", "5"],
    6: ["6", "6"],
    7: ["7", "7"],
    8: ["8", "8"],
    9: ["9", "9"],
    10: ["10", "10"],
    11: ["Jota", "J"],
    12: ["Reina", "Q"],
    13: ["Rey", "K"]
};

const obtenerColorPalo = (palo: string): string => {
    if (palo === "♥️" || palo === "♦️") return "text-red-500";
    return "text-black dark:text-white";
};

export default function CartaMayor() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [apuesta, setApuesta] = useState<number>(APUESTA_MINIMA);
    const [jugando, setJugando] = useState(false);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [resultado, setResultado] = useState<{
        resultado: string;
        carta_usuario: Carta;
        carta_casa: Carta;
        ganancia: number;
        mensaje: string;
    } | null>(null);
    const [historial, setHistorial] = useState<HistorialApuesta[]>([]);
    const [probabilidades, setProbabilidades] = useState<Probabilidades | null>(null);
    const [estadisticas, setEstadisticas] = useState({
        totalApuestas: 0,
        ganadas: 0,
        perdidas: 0,
        empates: 0,
        gananciaTotal: 0,
        gastoTotal: 0,
        balance: 0
    });
    const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({
        totalApuestasAcum: 0,
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
                const res = await axios.get(`${API_URL}/juegos/cartamayor/probabilidades`);
                setProbabilidades(res.data.probabilidades);
            } catch (error) {
                console.error("Error al cargar probabilidades:", error);
            }
        };
        cargarProbabilidades();
    }, []);

    // Cargar historial y estadísticas desde localStorage al iniciar
    useEffect(() => {
        const historialGuardado = localStorage.getItem("historial_cartamayor");
        if (historialGuardado) {
            const historialParsed = JSON.parse(historialGuardado);
            setHistorial(historialParsed);
        }

        const statsAcum = localStorage.getItem("estadisticas_acumulativas_cartamayor");
        if (statsAcum) {
            const parsedStats = JSON.parse(statsAcum);
            setEstadisticasAcumulativas(parsedStats);

            const balance = parsedStats.gananciaTotalAcum - parsedStats.gastoTotalAcum;
            setEstadisticas({
                totalApuestas: parsedStats.totalApuestasAcum,
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
            localStorage.setItem("historial_cartamayor", JSON.stringify(historial.slice(0, 15)));
        }
    }, [historial]);

    // Guardar estadísticas acumulativas en localStorage
    useEffect(() => {
        if (estadisticasAcumulativas.totalApuestasAcum > 0) {
            localStorage.setItem("estadisticas_acumulativas_cartamayor", JSON.stringify(estadisticasAcumulativas));
        }
    }, [estadisticasAcumulativas]);

    const actualizarEstadisticas = (nuevaApuesta: HistorialApuesta) => {
        const resultado = nuevaApuesta.resultado;
        
        // Actualizar estadísticas acumulativas
        setEstadisticasAcumulativas(prev => {
            const nuevoTotal = prev.totalApuestasAcum + 1;
            const nuevasGanadas = prev.ganadasAcum + (resultado === "gana_usuario" ? 1 : 0);
            const nuevasPerdidas = prev.perdidasAcum + (resultado === "gana_casa" ? 1 : 0);
            const nuevosEmpates = prev.empatesAcum + (resultado === "empate" ? 1 : 0);
            const nuevaGananciaTotal = prev.gananciaTotalAcum + nuevaApuesta.ganancia;
            const nuevoGastoTotal = prev.gastoTotalAcum + nuevaApuesta.apostado;

            return {
                totalApuestasAcum: nuevoTotal,
                ganadasAcum: nuevasGanadas,
                perdidasAcum: nuevasPerdidas,
                empatesAcum: nuevosEmpates,
                gananciaTotalAcum: nuevaGananciaTotal,
                gastoTotalAcum: nuevoGastoTotal
            };
        });

        // Actualizar estadísticas visibles
        setEstadisticas(prev => {
            const nuevoTotal = prev.totalApuestas + 1;
            const nuevasGanadas = prev.ganadas + (resultado === "gana_usuario" ? 1 : 0);
            const nuevasPerdidas = prev.perdidas + (resultado === "gana_casa" ? 1 : 0);
            const nuevosEmpates = prev.empates + (resultado === "empate" ? 1 : 0);
            const nuevaGananciaTotal = prev.gananciaTotal + nuevaApuesta.ganancia;
            const nuevoGastoTotal = prev.gastoTotal + nuevaApuesta.apostado;
            const nuevoBalance = nuevaGananciaTotal - nuevoGastoTotal;

            return {
                totalApuestas: nuevoTotal,
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
        carta_usuario: Carta,
        carta_casa: Carta,
        resultado: string,
        ganancia: number,
        apostado: number
    ) => {
        const nuevaApuesta: HistorialApuesta = {
            id: Date.now(),
            carta_usuario: `${carta_usuario.simbolo}${carta_usuario.palo}`,
            carta_casa: `${carta_casa.simbolo}${carta_casa.palo}`,
            resultado,
            ganancia,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            apostado
        };

        const nuevoHistorial = [nuevaApuesta, ...historial.slice(0, 14)];
        setHistorial(nuevoHistorial);
        actualizarEstadisticas(nuevaApuesta);
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
                `${API_URL}/juegos/cartamayor`,
                { 
                    apuesta: apuesta
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = res.data;
            
            // Actualizar saldo del usuario
            setUsuario(prev => prev ? { ...prev, saldo: data.nuevo_saldo } : null);
            
            // Mostrar resultado
            setResultado({
                resultado: data.resultado,
                carta_usuario: data.carta_usuario,
                carta_casa: data.carta_casa,
                ganancia: data.ganancia,
                mensaje: data.mensaje
            });
            
            // Animación de confetti si ganó
            if (data.resultado === "gana_usuario") {
                animarConfetti();
            }
            
            // Agregar al historial
            agregarAlHistorial(
                data.carta_usuario,
                data.carta_casa,
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
        localStorage.removeItem("historial_cartamayor");
        showMsg("Historial limpiado", "info");
    };

    const limpiarTodasEstadisticas = () => {
        setHistorial([]);
        setEstadisticas({
            totalApuestas: 0,
            ganadas: 0,
            perdidas: 0,
            empates: 0,
            gananciaTotal: 0,
            gastoTotal: 0,
            balance: 0
        });
        setEstadisticasAcumulativas({
            totalApuestasAcum: 0,
            ganadasAcum: 0,
            perdidasAcum: 0,
            empatesAcum: 0,
            gananciaTotalAcum: 0,
            gastoTotalAcum: 0,
        });
        localStorage.removeItem("historial_cartamayor");
        localStorage.removeItem("estadisticas_acumulativas_cartamayor");
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

    const renderCarta = (carta: Carta, titulo: string, esGanadora: boolean = false) => {
        const colorPalo = obtenerColorPalo(carta.palo);
        
        return (
            <div className={`relative ${esGanadora ? 'scale-110 z-10' : ''}`}>
                <div className="text-center mb-4">
                    <div className="text-lg font-bold text-gray-300 mb-1">{titulo}</div>
                    <div className="text-sm text-gray-500">{carta.nombre}</div>
                </div>
                <div className={`w-40 h-56 mx-auto rounded-2xl ${resultado && esGanadora
                    ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-4 border-yellow-500 shadow-2xl shadow-yellow-500/30'
                    : 'bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 border-4 border-gray-300 dark:border-gray-700 shadow-xl'
                    } flex flex-col justify-between p-4 relative overflow-hidden`}>
                    
                    {/* Esquina superior izquierda */}
                    <div className="absolute top-3 left-3 flex flex-col items-center">
                        <div className={`text-2xl font-bold ${colorPalo}`}>{carta.simbolo}</div>
                        <div className={`text-lg ${colorPalo}`}>{carta.palo}</div>
                    </div>
                    
                    {/* Esquina inferior derecha */}
                    <div className="absolute bottom-3 right-3 flex flex-col items-center rotate-180">
                        <div className={`text-2xl font-bold ${colorPalo}`}>{carta.simbolo}</div>
                        <div className={`text-lg ${colorPalo}`}>{carta.palo}</div>
                    </div>
                    
                    {/* Centro de la carta */}
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className={`text-7xl font-bold ${colorPalo} mb-2`}>{carta.palo}</div>
                            <div className="text-4xl font-bold text-gray-800 dark:text-gray-200">{carta.simbolo}</div>
                            <div className="text-lg text-gray-600 dark:text-gray-400 mt-2">{carta.nombre}</div>
                        </div>
                    </div>
                    
                    {/* Valor en las esquinas adicionales */}
                    <div className="absolute top-3 right-3 opacity-20">
                        <div className={`text-xl ${colorPalo}`}>{carta.palo}</div>
                    </div>
                    <div className="absolute bottom-3 left-3 opacity-20 rotate-180">
                        <div className={`text-xl ${colorPalo}`}>{carta.palo}</div>
                    </div>
                </div>
            </div>
        );
    };

    const renderResultadoComparacion = () => {
        if (!resultado) return null;
        
        const usuarioMayor = resultado.carta_usuario.valor > resultado.carta_casa.valor;
        const casaMayor = resultado.carta_usuario.valor < resultado.carta_casa.valor;
        const empate = resultado.carta_usuario.valor === resultado.carta_casa.valor;
        
        return (
            <div className="mt-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">Comparación:</div>
                    <div className="flex items-center space-x-8">
                        <div className={`px-6 py-3 rounded-xl ${usuarioMayor ? 'bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50' : 'bg-gray-800/50'}`}>
                            <div className="text-xl font-bold text-white">Tu carta</div>
                            <div className="text-3xl font-bold text-green-400">{resultado.carta_usuario.valor}</div>
                        </div>
                        
                        <div className="text-4xl text-yellow-400 font-bold">VS</div>
                        
                        <div className={`px-6 py-3 rounded-xl ${casaMayor ? 'bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50' : 'bg-gray-800/50'}`}>
                            <div className="text-xl font-bold text-white">Casa</div>
                            <div className="text-3xl font-bold text-red-400">{resultado.carta_casa.valor}</div>
                        </div>
                    </div>
                    <div className="mt-4 text-xl">
                        {usuarioMayor && <span className="text-green-400 font-bold">Tu carta es MAYOR</span>}
                        {casaMayor && <span className="text-red-400 font-bold">La carta de la casa es MAYOR</span>}
                        {empate && <span className="text-yellow-400 font-bold">¡EMPATE! Las cartas son iguales</span>}
                    </div>
                </div>
            </div>
        );
    };

    const renderTablaCartas = () => {
        return (
            <div className="mt-8 bg-gray-800/30 rounded-xl p-6">
                <h4 className="text-lg font-bold text-white mb-4 text-center">📊 Valores de las Cartas</h4>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                    {Object.entries(VALORES_CARTAS).map(([valorStr, datos]) => {
                        const valor = parseInt(valorStr);
                        const [nombre, simbolo] = datos;
                        const palo = "♠️"; // Solo para mostrar ejemplo
                        const colorPalo = obtenerColorPalo(palo);
                        
                        return (
                            <div key={valor} className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                <div className={`text-2xl font-bold ${colorPalo}`}>{simbolo}</div>
                                <div className="text-xs text-gray-400">{nombre}</div>
                                <div className="text-sm font-bold text-yellow-400 mt-1">Valor: {valor}</div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 text-center text-gray-400 text-sm">
                    Las cartas van del As (valor 1) al Rey (valor 13)
                </div>
            </div>
        );
    };

    if (!usuario) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-red-500 to-yellow-500 rounded-full blur-3xl opacity-20"></div>

                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-full text-sm font-bold text-blue-400">
                                🃏 CARTA MAYOR
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                Desafía a la Casa
                            </span>
                            <br />
                            <span className="text-white">¡Tu carta vs la carta de la casa!</span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Apuesta desde <span className="text-yellow-400 font-bold">${APUESTA_MINIMA}</span>.
                            <span className="text-green-400 font-bold"> ¡Gana el doble si tu carta es mayor!</span>
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
                                            className="w-full h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-500"
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
                                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-105'
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

                                {/* Cartas */}
                                <div className="mb-10">
                                    <div className="flex flex-col md:flex-row justify-center items-center space-y-10 md:space-y-0 md:space-x-16">
                                        {resultado ? (
                                            <>
                                                {renderCarta(
                                                    resultado.carta_usuario,
                                                    "Tu Carta",
                                                    resultado.resultado === "gana_usuario"
                                                )}
                                                
                                                <div className="flex flex-col items-center">
                                                    <div className="text-5xl text-yellow-400 font-bold mb-4">VS</div>
                                                    <div className="text-center">
                                                        <div className="text-lg text-gray-400">Apuesta:</div>
                                                        <div className="text-2xl font-bold text-yellow-400">${apuesta}</div>
                                                    </div>
                                                </div>
                                                
                                                {renderCarta(
                                                    resultado.carta_casa,
                                                    "Casa",
                                                    resultado.resultado === "gana_casa"
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-center">
                                                    <div className="text-lg font-bold text-gray-300 mb-4">Tu Carta</div>
                                                    <div className="w-40 h-56 mx-auto rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border-4 border-gray-700 shadow-xl flex items-center justify-center">
                                                        <div className="text-center">
                                                            <div className="text-5xl mb-4">🃏</div>
                                                            <div className="text-gray-400">?</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col items-center">
                                                    <div className="text-5xl text-gray-500 font-bold mb-4">VS</div>
                                                    <div className="text-center">
                                                        <div className="text-lg text-gray-400">Apuesta:</div>
                                                        <div className="text-2xl font-bold text-yellow-400">${apuesta}</div>
                                                    </div>
                                                </div>
                                                
                                                <div className="text-center">
                                                    <div className="text-lg font-bold text-gray-300 mb-4">Casa</div>
                                                    <div className="w-40 h-56 mx-auto rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border-4 border-gray-700 shadow-xl flex items-center justify-center">
                                                        <div className="text-center">
                                                            <div className="text-5xl mb-4">🏠</div>
                                                            <div className="text-gray-400">?</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    
                                    {/* Comparación de valores */}
                                    {resultado && renderResultadoComparacion()}
                                    
                                    {/* Tabla de valores de cartas */}
                                    {renderTablaCartas()}
                                </div>

                                {/* Botón de jugar */}
                                <button
                                    onClick={realizarJugada}
                                    disabled={jugando || apuesta < APUESTA_MINIMA || apuesta > usuario.saldo}
                                    className={`w-full py-5 px-8 rounded-xl font-bold text-xl transition-all duration-300 ${jugando || apuesta < APUESTA_MINIMA || apuesta > usuario.saldo
                                        ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20'
                                        }`}
                                >
                                    {jugando ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Repartiendo cartas...
                                        </span>
                                    ) : (
                                        `🎯 Apostar $${apuesta}`
                                    )}
                                </button>

                                {/* Resultado detallado */}
                                {resultado && (
                                    <div className="mt-10 p-8 bg-gradient-to-r from-gray-800/70 to-gray-900/70 border-2 border-blue-500/30 rounded-3xl">
                                        <div className="text-center">
                                            <div className="text-4xl font-bold text-white mb-4">
                                                {resultado.resultado === "gana_usuario" && "🎉 ¡GANASTE! 🎉"}
                                                {resultado.resultado === "gana_casa" && "😢 ¡PERDISTE! 😢"}
                                                {resultado.resultado === "empate" && "🤝 ¡EMPATE! 🤝"}
                                            </div>
                                            
                                            <div className="text-3xl mb-6">
                                                {resultado.resultado === "gana_usuario" && (
                                                    <span className="text-green-400 font-bold">
                                                        +${resultado.ganancia} (${apuesta} × 2)
                                                    </span>
                                                )}
                                                {resultado.resultado === "gana_casa" && (
                                                    <span className="text-red-400 font-bold">
                                                        -${apuesta}
                                                    </span>
                                                )}
                                                {resultado.resultado === "empate" && (
                                                    <span className="text-yellow-400 font-bold">
                                                        Se devuelven ${apuesta}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="text-xl text-gray-400">{resultado.mensaje}</div>
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
                                    <div className="text-sm text-gray-400">Empates</div>
                                    <div className="text-2xl font-bold text-yellow-400">{estadisticas.empates}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {estadisticas.totalApuestas > 0 
                                            ? `${((estadisticas.empates / estadisticas.totalApuestas) * 100).toFixed(1)}%`
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
                                                <span className="text-gray-400">{probabilidades.gana_casa}%</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-3">
                                                <div 
                                                    className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full" 
                                                    style={{ width: `${probabilidades.gana_casa}%` }}
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
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
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
                                    <div className="text-4xl mb-3">🃏</div>
                                    <p className="text-gray-400">No hay juegos registrados</p>
                                    <p className="text-sm text-gray-500 mt-1">Realiza tu primera apuesta</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                    {historial.map((juego) => (
                                        <div key={juego.id} className={`p-4 rounded-xl border ${juego.resultado === "gana_usuario"
                                            ? 'bg-gradient-to-r from-green-900/20 to-green-800/10 border-green-500/30'
                                            : juego.resultado === "gana_casa"
                                                ? 'bg-gradient-to-r from-red-900/20 to-red-800/10 border-red-500/30'
                                                : 'bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 border-yellow-500/30'
                                            }`}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center space-x-3">
                                                        <div className="text-lg">{juego.carta_usuario}</div>
                                                        <div className="text-gray-400">vs</div>
                                                        <div className="text-lg">{juego.carta_casa}</div>
                                                    </div>
                                                    <div className="text-sm text-gray-400 mt-1">{juego.fecha}</div>
                                                    <div className="text-xs text-gray-500">Apostado: ${juego.apostado}</div>
                                                </div>
                                                <div className={`text-right ${juego.resultado === "gana_usuario" ? 'text-green-400' :
                                                    juego.resultado === "gana_casa" ? 'text-red-400' : 'text-yellow-400'
                                                    }`}>
                                                    <div className="text-2xl font-bold">
                                                        {juego.resultado === "gana_usuario" ? `+$${juego.ganancia}` :
                                                            juego.resultado === "gana_casa" ? `-$${juego.apostado}` :
                                                                `±$${juego.apostado}`}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {juego.resultado === "gana_usuario" ? `Ganancia: $${juego.ganancia - juego.apostado}` :
                                                            juego.resultado === "gana_casa" ? 'Pérdida total' :
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
                        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6">
                            <h4 className="text-lg font-bold text-white mb-3">💡 Cómo jugar</h4>
                            <ul className="space-y-3 text-gray-300">
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>Elige la cantidad a apostar (mínimo ${APUESTA_MINIMA})</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>Se reparte una carta al <span className="text-green-300">usuario</span> y otra a la <span className="text-red-300">casa</span></span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span>Cartas del As (1) al Rey (13)</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><span className="text-green-400">Ganas</span> si tu carta es MAYOR que la de la casa (x2)</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><span className="text-red-400">Pierdes</span> si tu carta es MENOR que la de la casa</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
                                    <span><span className="text-yellow-400">Empate</span>: se devuelve tu apuesta</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-blue-400">•</span>
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