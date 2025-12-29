// src/pages/ruleta.tsx
import React, { useRef, useState, useEffect } from "react";
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

interface HistorialGiro {
    id: number;
    resultado: string;
    ganancia: number;
    fecha: string;
    apostado: number;
}

type Sector = {
    key: string;
    label: string;
    desc: string;
    color: string;
    multiplier: number;
};

const SECTORES: Sector[] = [
    { key: "Mega Premio", label: "10x", desc: "Mega Premio", color: "#FFD700", multiplier: 10 },
    { key: "Sin Premio", label: "—", desc: "Sin premio", color: "#E5E7EB", multiplier: 0 },
    { key: "Premio Doble", label: "2x", desc: "Premio doble", color: "#60A5FA", multiplier: 2 },
    { key: "Sin Premio", label: "—", desc: "Sin premio", color: "#E5E7EB", multiplier: 0 },
    { key: "Gran Premio", label: "5x", desc: "Gran premio", color: "#F97316", multiplier: 5 },
    { key: "Sin Premio", label: "—", desc: "Sin premio", color: "#E5E7EB", multiplier: 0 },
    { key: "Premio Doble", label: "2x", desc: "Premio doble", color: "#3B82F6", multiplier: 2 },
    { key: "Sin Premio", label: "—", desc: "Sin premio", color: "#E5E7EB", multiplier: 0 },
    { key: "Giro Gratis", label: "🎁", desc: "Giro gratis", color: "#10B981", multiplier: -1 },
    { key: "Sin Premio", label: "—", desc: "Sin premio", color: "#E5E7EB", multiplier: 0 },
    { key: "Premio Doble", label: "2x", desc: "Premio doble", color: "#3B82F6", multiplier: 2 },
    { key: "Sin Premio", label: "—", desc: "Sin premio", color: "#E5E7EB", multiplier: 0 },
    { key: "Gran Premio", label: "5x", desc: "Gran premio", color: "#F97316", multiplier: 5 },
    { key: "Sin Premio", label: "—", desc: "Sin premio", color: "#E5E7EB", multiplier: 0 },
    { key: "Premio Doble", label: "2x", desc: "Premio doble", color: "#2563EB", multiplier: 2 },
    { key: "Sin Premio", label: "—", desc: "Sin premio", color: "#E5E7EB", multiplier: 0 },
];

const COSTO = 500;

export default function Ruleta() {
    const navigate = useNavigate();
    const wheelRef = useRef<HTMLDivElement | null>(null);
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [girando, setGirando] = useState(false);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [resultadoText, setResultadoText] = useState<string | null>(null);
    const [gananciaMostrar, setGananciaMostrar] = useState<number | null>(null);
    const [historial, setHistorial] = useState<HistorialGiro[]>([]);
    const [estadisticas, setEstadisticas] = useState({
        totalGiros: 0,
        gananciaTotal: 0,
        gastoTotal: 0,
        balance: 0
    });
    const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({
        totalGirosAcum: 0,
        gananciaTotalAcum: 0,
        gastoTotalAcum: 0,
    });
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

    // Obtener usuario al cargar (igual que en la página de juegos)
    useEffect(() => {
        console.log('Usuario en Referidos:', usuario);
        axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
            .then((res) => {
                const userData = res.data;
                setUsuario({
                    id: userData.id,
                    username: userData.username,
                    saldo: userData.saldo,
                    verificado: userData.verificado,
                    nivel: userData.nivel,
                    verificado_pendiente: userData.verificado_pendiente
                });
                localStorage.setItem("usuario", JSON.stringify(userData));
            })
            .catch(() => {
                setUsuario(null);
            });

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

    // Cargar historial y estadísticas desde localStorage al iniciar
    useEffect(() => {
        // Cargar historial de últimos 10 giros
        const historialGuardado = localStorage.getItem("historial_ruleta");
        if (historialGuardado) {
            const historialParsed = JSON.parse(historialGuardado);
            setHistorial(historialParsed);
        }

        // Cargar estadísticas acumulativas
        const statsAcum = localStorage.getItem("estadisticas_acumulativas");
        if (statsAcum) {
            const parsedStats = JSON.parse(statsAcum);
            setEstadisticasAcumulativas(parsedStats);

            // Calcular estadísticas iniciales basadas en las acumulativas
            const balance = parsedStats.gananciaTotalAcum - parsedStats.gastoTotalAcum;
            setEstadisticas({
                totalGiros: parsedStats.totalGirosAcum,
                gananciaTotal: parsedStats.gananciaTotalAcum,
                gastoTotal: parsedStats.gastoTotalAcum,
                balance: balance
            });
        }
    }, []);

    // Guardar historial en localStorage
    useEffect(() => {
        if (historial.length > 0) {
            localStorage.setItem("historial_ruleta", JSON.stringify(historial.slice(0, 10)));
        }
    }, [historial]);

    // Guardar estadísticas acumulativas en localStorage
    useEffect(() => {
        if (estadisticasAcumulativas.totalGirosAcum > 0) {
            localStorage.setItem("estadisticas_acumulativas", JSON.stringify(estadisticasAcumulativas));
        }
    }, [estadisticasAcumulativas]);

    const actualizarEstadisticas = (nuevoGiro: HistorialGiro) => {
        const esGiroGratis = nuevoGiro.resultado === "Free";

        console.log("Actualizando estadísticas. Giro gratis:", esGiroGratis);
        console.log("Nuevo giro:", nuevoGiro);

        // 🔴 CORRECCIÓN: Si es giro gratis, NO sumar al gasto
        if (esGiroGratis) {
            // Actualizar estadísticas acumulativas
            setEstadisticasAcumulativas(prev => {
                const nuevoTotalGiros = prev.totalGirosAcum + 1;
                // Ganancia es 0 para giros gratis
                const nuevaGananciaTotal = prev.gananciaTotalAcum + 0; // Giro gratis no da ganancia
                // 🔴 IMPORTANTE: No sumar al gasto cuando es giro gratis
                const nuevoGastoTotal = prev.gastoTotalAcum + 0; // Giro gratis no cuesta

                console.log("Giro gratis - Acumulativas actualizadas:", {
                    nuevoTotalGiros,
                    nuevaGananciaTotal,
                    nuevoGastoTotal
                });

                return {
                    totalGirosAcum: nuevoTotalGiros,
                    gananciaTotalAcum: nuevaGananciaTotal,
                    gastoTotalAcum: nuevoGastoTotal
                };
            });

            // Actualizar estadísticas visibles
            setEstadisticas(prev => {
                const nuevoTotalGiros = prev.totalGiros + 1;
                const nuevaGananciaTotal = prev.gananciaTotal + 0; // Giro gratis no da ganancia
                // 🔴 IMPORTANTE: No sumar al gasto cuando es giro gratis
                const nuevoGastoTotal = prev.gastoTotal + 0; // Giro gratis no cuesta
                const nuevoBalance = nuevaGananciaTotal - nuevoGastoTotal;

                console.log("Giro gratis - Estadísticas visibles actualizadas:", {
                    nuevoTotalGiros,
                    nuevaGananciaTotal,
                    nuevoGastoTotal,
                    nuevoBalance
                });

                return {
                    totalGiros: nuevoTotalGiros,
                    gananciaTotal: nuevaGananciaTotal,
                    gastoTotal: nuevoGastoTotal,
                    balance: nuevoBalance
                };
            });
        } else {
            // Para giros normales (NO gratuitos)
            // Actualizar estadísticas acumulativas
            setEstadisticasAcumulativas(prev => {
                const nuevoTotalGiros = prev.totalGirosAcum + 1;
                const nuevaGananciaTotal = prev.gananciaTotalAcum + (nuevoGiro.ganancia || 0);
                const nuevoGastoTotal = prev.gastoTotalAcum + nuevoGiro.apostado; // Sumar el costo del giro

                console.log("Giro normal - Acumulativas actualizadas:", {
                    nuevoTotalGiros,
                    nuevaGananciaTotal,
                    nuevoGastoTotal
                });

                return {
                    totalGirosAcum: nuevoTotalGiros,
                    gananciaTotalAcum: nuevaGananciaTotal,
                    gastoTotalAcum: nuevoGastoTotal
                };
            });

            // Actualizar estadísticas visibles
            setEstadisticas(prev => {
                const nuevoTotalGiros = prev.totalGiros + 1;
                const nuevaGananciaTotal = prev.gananciaTotal + (nuevoGiro.ganancia || 0);
                const nuevoGastoTotal = prev.gastoTotal + nuevoGiro.apostado; // Sumar el costo del giro
                const nuevoBalance = nuevaGananciaTotal - nuevoGastoTotal;

                console.log("Giro normal - Estadísticas visibles actualizadas:", {
                    nuevoTotalGiros,
                    nuevaGananciaTotal,
                    nuevoGastoTotal,
                    nuevoBalance
                });

                return {
                    totalGiros: nuevoTotalGiros,
                    gananciaTotal: nuevaGananciaTotal,
                    gastoTotal: nuevoGastoTotal,
                    balance: nuevoBalance
                };
            });
        }
    };

    const agregarAlHistorial = (resultado: string, ganancia: number, apostado: number) => {
        const esGiroGratis = resultado === "Giro Gratis";

        const nuevoGiro: HistorialGiro = {
            id: Date.now(),
            resultado,
            ganancia: esGiroGratis ? 0 : ganancia,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            apostado: esGiroGratis ? 0 : apostado // 🔴 Apostado es 0 para giros gratis
        };

        // Agregar al historial (máximo 10 registros)
        const nuevoHistorial = [nuevoGiro, ...historial.slice(0, 9)];
        setHistorial(nuevoHistorial);

        // Actualizar estadísticas
        actualizarEstadisticas(nuevoGiro);
    };

    const calcularAnguloCentro = (index: number) => {
        const sectorSize = 360 / SECTORES.length;
        return index * sectorSize + sectorSize / 2;
    };

    const animarConfetti = (tipo: string) => {
        if (tipo === "Mega Premio") {
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 }
            });
        } else if (tipo === "Gran Premio") {
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
        } else if (tipo === "Premio Doble") {
            confetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    };

    const girarRuleta = async () => {
        if (!usuario) {
            setMensaje("Debes iniciar sesión para girar la ruleta.");
            return;
        }
        if (girando) return;

        // 🔴 CORRECCIÓN: Verificar saldo solo para giros normales
        // (El backend debería manejar los giros gratis sin descontar)
        if (usuario.saldo < COSTO) {
            setMensaje("Saldo insuficiente para girar la ruleta.");
            return;
        }

        setMensaje(null);
        setResultadoText(null);
        setGananciaMostrar(null);
        setGirando(true);

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/ruleta/juegos/ruleta`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const resultado = res.data?.resultado ?? "Sin Premio";
            console.log("Resultado del servidor:", resultado);
            const msgServidor = res.data?.mensaje ?? "";
            const ganancia = typeof res.data?.ganancia === "number" ? res.data.ganancia : 0;
            const nuevo_saldo = typeof res.data?.nuevo_saldo === "number" ? res.data.nuevo_saldo : usuario.saldo - COSTO;

            // 🔴 CORRECCIÓN IMPORTANTE: Si es giro gratis, NO restar al saldo
            const saldoFinal = resultado === "Giro Gratis" ? usuario.saldo : nuevo_saldo;

            // Buscamos índice del sector
            const posiblesIndices = SECTORES
                .map((s, i) => ({ s, i }))
                .filter(({ s }) => s.key === resultado)
                .map(({ i }) => i);

            const targetIndex =
                posiblesIndices.length > 0
                    ? posiblesIndices[Math.floor(Math.random() * posiblesIndices.length)]
                    : SECTORES.findIndex((s) => s.key === "Sin Premio");

            const finalIndex = targetIndex >= 0 ? targetIndex : 0;

            // Calcular rotación
            const vueltasAleatorias = Math.floor(Math.random() * 3) + 6;
            const anguloDestino = vueltasAleatorias * 360 + (360 - calcularAnguloCentro(finalIndex));

            if (wheelRef.current) {
                wheelRef.current.style.transition = "none";
                wheelRef.current.style.transform = `rotate(0deg)`;
                requestAnimationFrame(() => {
                    if (!wheelRef.current) return;
                    wheelRef.current.style.transition = `transform 8000ms cubic-bezier(.17,.67,.14,1)`;
                    wheelRef.current.style.transform = `rotate(${anguloDestino}deg)`;
                });
            }

            setTimeout(() => {
                // Determinar si es giro gratis
                const esGiroGratis = resultado === "Giro Gratis";

                // Animación de confetti para premios grandes (excepto giros gratis)
                if (resultado !== "Sin Premio" && !esGiroGratis) {
                    animarConfetti(resultado);
                }

                setResultadoText(msgServidor || resultado);

                // Mostrar ganancia (0 para giros gratis)
                if (esGiroGratis) {
                    setGananciaMostrar(0);
                } else {
                    setGananciaMostrar(ganancia);
                }

                // 🔴 CORRECCIÓN: Actualizar saldo solo si no es giro gratis
                if (!esGiroGratis) {
                    setUsuario((prev) => (prev ? { ...prev, saldo: saldoFinal } : prev));
                }

                // Mensaje según el resultado
                if (esGiroGratis) {
                    setMensaje("¡Giro gratis obtenido! 🎁");
                } else {
                    setMensaje(msgServidor || "¡Giro completado!");
                }

                setGirando(false);

                // Agregar al historial
                agregarAlHistorial(
                    resultado,
                    ganancia,
                    esGiroGratis ? 0 : COSTO // 🔴 Apostado es 0 para giros gratis
                );
            }, 8200);

        } catch (err: any) {
            console.error("Error al girar la ruleta:", err);
            setMensaje(err.response?.data?.detail || "Error al girar la ruleta");
            setGirando(false);
        }
    };

    const renderWheelSvg = () => {
        const radius = 160;
        const cx = 180;
        const cy = 180;
        const sectorAngle = (2 * Math.PI) / SECTORES.length;
        return (
            <svg width={360} height={360} viewBox="0 0 360 360" className="block mx-auto">
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <g transform={`translate(${cx}, ${cy})`}>
                    {SECTORES.map((s, i) => {
                        const startAngle = i * sectorAngle - Math.PI / 2;
                        const endAngle = startAngle + sectorAngle;
                        const x1 = Math.cos(startAngle) * radius;
                        const y1 = Math.sin(startAngle) * radius;
                        const x2 = Math.cos(endAngle) * radius;
                        const y2 = Math.sin(endAngle) * radius;
                        const largeArcFlag = sectorAngle > Math.PI ? 1 : 0;
                        const path = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                        const textAngle = (startAngle + endAngle) / 2;
                        const tx = Math.cos(textAngle) * (radius * 0.62);
                        const ty = Math.sin(textAngle) * (radius * 0.62);
                        const rotateDeg = (textAngle * 180) / Math.PI;
                        return (
                            <g key={i}>
                                <path d={path} fill={s.color} stroke="#ffffff33" strokeWidth={1} />
                                <text
                                    x={tx}
                                    y={ty}
                                    transform={`rotate(${rotateDeg} ${tx} ${ty})`}
                                    fill={s.multiplier === 0 ? "#666" : "#000"}
                                    fontSize={16}
                                    fontWeight={700}
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                >
                                    {s.label}
                                </text>
                            </g>
                        );
                    })}

                    {/* Círculo central */}
                    <circle r={20} fill="#1F2937" stroke="#FFFFFF" strokeWidth={2} />
                </g>
            </svg>
        );
    };

    const limpiarHistorial = () => {
        setHistorial([]);
        localStorage.removeItem("historial_ruleta");
        // No limpiamos las estadísticas acumulativas
        // Solo reseteamos las estadísticas visibles a las acumulativas
        setEstadisticas({
            totalGiros: estadisticasAcumulativas.totalGirosAcum,
            gananciaTotal: estadisticasAcumulativas.gananciaTotalAcum,
            gastoTotal: estadisticasAcumulativas.gastoTotalAcum,
            balance: estadisticasAcumulativas.gananciaTotalAcum - estadisticasAcumulativas.gastoTotalAcum
        });
    };

    const limpiarTodasEstadisticas = () => {
        setHistorial([]);
        setEstadisticas({
            totalGiros: 0,
            gananciaTotal: 0,
            gastoTotal: 0,
            balance: 0
        });
        setEstadisticasAcumulativas({
            totalGirosAcum: 0,
            gananciaTotalAcum: 0,
            gastoTotalAcum: 0
        });
        localStorage.removeItem("historial_ruleta");
        localStorage.removeItem("estadisticas_acumulativas");
        showMsg("Estadísticas reiniciadas completamente", "info");
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const cerrarSesion = () => {
        setUsuario(null);
    };

    if (!usuario) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando ruleta...</p>
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
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-green-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-yellow-500 to-green-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-red-500 rounded-full blur-3xl opacity-20"></div>

                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-full text-sm font-bold text-yellow-400">
                                🎯 RUELETA DE PREMIOS
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400 bg-clip-text text-transparent">
                                Gira y Gana
                            </span>
                            <br />
                            <span className="text-white">¡Hasta 10x tu inversión!</span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Cada giro cuesta <span className="text-yellow-400 font-bold">${COSTO}</span>.
                            <span className="text-green-400 font-bold"> ¡Posibilidad de ganar hasta ${COSTO * 10}!</span>
                            <br />
                            <span className="text-blue-400">🎁 Los giros gratis NO cuestan saldo ni afectan estadísticas</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* Contenido Principal */}
            <section className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Ruleta y Controles */}
                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="relative w-full max-w-md mx-auto">
                                <div className="relative">
                                    <div
                                        ref={wheelRef}
                                        className="w-full aspect-square rounded-full overflow-hidden border-8 border-gray-800 shadow-2xl"
                                    >
                                        {renderWheelSvg()}
                                    </div>

                                    {/* Indicador superior */}
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-gray-900 z-20" />

                                    {/* Centro decorativo */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full border-4 border-gray-900 shadow-lg z-10 flex items-center justify-center">
                                        <span className="text-white font-bold text-xl">$</span>
                                    </div>
                                </div>

                                <div className="mt-8 text-center">
                                    <div className="mb-6">
                                        <div className="text-2xl font-bold text-white mb-2">
                                            Saldo: <span className="text-yellow-400">${usuario?.saldo?.toLocaleString() ?? 0}</span>
                                        </div>
                                        {mensaje && (
                                            <div className={`px-4 py-3 rounded-xl font-bold mb-4 ${mensaje.includes("Error")
                                                ? "bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200"
                                                : mensaje.includes("insuficiente")
                                                    ? "bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200"
                                                    : mensaje.includes("Giro gratis")
                                                        ? "bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-500/50 text-blue-200"
                                                        : "bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50 text-green-200"
                                                }`}>
                                                {mensaje}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={girarRuleta}
                                        disabled={girando || !usuario || (usuario && usuario.saldo < COSTO)}
                                        className={`w-full max-w-xs py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${girando
                                            ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                            : 'bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-500 hover:to-green-500 hover:scale-105 active:scale-95'
                                            } ${(!usuario || (usuario && usuario.saldo < COSTO)) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                            `🎯 Girar por $${COSTO}`
                                        )}
                                    </button>

                                    {resultadoText && (
                                        <div className="mt-6 p-6 bg-gradient-to-r from-gray-800/70 to-gray-900/70 border border-yellow-500/30 rounded-2xl">
                                            <div className="text-2xl font-bold text-white mb-2">{resultadoText}</div>
                                            <div className="text-xl text-gray-300">
                                                {gananciaMostrar !== null && gananciaMostrar > 0 ? (
                                                    <span className="text-green-400 font-bold">¡Ganaste ${gananciaMostrar}!</span>
                                                ) : gananciaMostrar === 0 ? (
                                                    resultadoText === "Giro Gratis" ? (
                                                        <span className="text-blue-400 font-bold">¡Giro gratis obtenido! (No afecta tu saldo)</span>
                                                    ) : (
                                                        <span className="text-yellow-400">Sin ganancias esta vez</span>
                                                    )
                                                ) : null}
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
                                    <div className="text-sm text-gray-400">Total Giros</div>
                                    <div className="text-2xl font-bold text-blue-400">{estadisticas.totalGiros}</div>
                                    <div className="text-xs text-gray-500 mt-1">Todos los giros</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Ganancia Total</div>
                                    <div className="text-2xl font-bold text-green-400">${estadisticas.gananciaTotal}</div>
                                    <div className="text-xs text-gray-500 mt-1">Sin giros gratis</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Gasto Total</div>
                                    <div className="text-2xl font-bold text-red-400">${estadisticas.gastoTotal}</div>
                                    <div className="text-xs text-gray-500 mt-1">Sin giros gratis</div>
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
                                <div className="text-sm text-gray-400 text-center">
                                    <span className="text-blue-400">💡</span> Los giros gratis NO afectan el gasto ni las ganancias
                                </div>
                            </div>
                        </div>

                        {/* Premios */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">🎰 Premios Disponibles</h3>
                            <div className="space-y-3">
                                {Object.entries(
                                    SECTORES.reduce((acc: Record<string, { desc: string; color: string; count: number; multiplier: number }>, s) => {
                                        if (!acc[s.key]) {
                                            acc[s.key] = {
                                                desc: s.desc,
                                                color: s.color,
                                                count: 0,
                                                multiplier: s.multiplier,
                                            };
                                        }
                                        acc[s.key].count++;
                                        return acc;
                                    }, {})
                                ).map(([k, v]) => (
                                    <div key={k} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: v.color }} />
                                            <span className="text-white font-medium">{k}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-400">{v.count} sector{v.count > 1 ? 'es' : ''}</div>
                                            <div className="text-white font-bold">
                                                {v.multiplier > 0 ? `${v.multiplier}x ($${COSTO * v.multiplier})` :
                                                    v.multiplier === -1 ? '🎁 Giro Gratis' : 'Sin Premio'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                                    <div className="text-4xl mb-3">🎯</div>
                                    <p className="text-gray-400">No hay giros registrados</p>
                                    <p className="text-sm text-gray-500 mt-1">Gira la ruleta para comenzar</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                    {historial.map((giro) => (
                                        <div key={giro.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="text-white font-medium">{giro.resultado}</div>
                                                    <div className="text-sm text-gray-400">{giro.fecha}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {giro.apostado > 0 ? `Apostado: $${giro.apostado}` : "🎁 Giro gratis"}
                                                    </div>
                                                </div>
                                                <div className={`text-right ${giro.ganancia > 0 ? 'text-green-400' :
                                                    giro.resultado === "Giro Gratis" ? 'text-blue-400' :
                                                        'text-yellow-400'
                                                    }`}>
                                                    <div className="font-bold">
                                                        {giro.resultado === "Giro Gratis" ? '🎁 Gratis' :
                                                            giro.ganancia > 0 ? `+$${giro.ganancia}` :
                                                                '$0'}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {giro.resultado === "Giro Gratis" ? 'Sin costo' :
                                                            giro.ganancia > 0 ? `Neto: $${giro.ganancia - giro.apostado}` :
                                                                `Pérdida: $${giro.apostado}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Información */}
                        <div className="bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-2xl p-6">
                            <h4 className="text-lg font-bold text-white mb-3">💡 Consejos</h4>
                            <ul className="space-y-2 text-gray-300">
                                <li className="flex items-start space-x-2">
                                    <span className="text-yellow-400">•</span>
                                    <span>Un giro cuesta ${COSTO} de tu saldo</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-yellow-400">•</span>
                                    <span>El premio mayor (10x) es único ¡Buena suerte!</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-yellow-400">•</span>
                                    <span><span className="text-blue-400">Los giros gratis NO descuentan saldo</span> ni afectan estadísticas</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-yellow-400">•</span>
                                    <span>Juega responsablemente</span>
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