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

interface Apuesta {
    tipo: string;
    valor: any;
    monto: number;
}

interface HistorialJuego {
    id: number;
    numero_ganador: number;
    color_ganador: string;
    ganancia_total: number;
    fecha: string;
    total_apostado: number;
}

interface Probabilidad {
    probabilidad: number;
    multiplicador: number;
    descripcion: string;
}

const APUESTA_MINIMA = 10;

// Configuración de la ruleta europea
const NUMEROS_RULETA = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const COLORES: { [key: number]: string } = {
    0: "verde",
    32: "rojo", 15: "negro", 19: "rojo", 4: "negro", 21: "rojo", 2: "negro",
    25: "rojo", 17: "negro", 34: "rojo", 6: "negro", 27: "rojo", 13: "negro",
    36: "rojo", 11: "negro", 30: "rojo", 8: "negro", 23: "rojo", 10: "negro",
    5: "rojo", 24: "negro", 16: "rojo", 33: "negro", 1: "rojo", 20: "negro",
    14: "rojo", 31: "negro", 9: "rojo", 22: "negro", 18: "rojo", 29: "negro",
    7: "rojo", 28: "negro", 12: "rojo", 35: "negro", 3: "rojo", 26: "negro"
};

// Tipos de apuestas
const TIPOS_APUESTA = [
    { id: "numero_pleno", nombre: "Número Pleno", multiplicador: 35, color: "bg-purple-600" },
    { id: "docena", nombre: "Docena", multiplicador: 2, color: "bg-indigo-600" },
    { id: "columna", nombre: "Columna", multiplicador: 2, color: "bg-teal-600" },
    { id: "rojo_negro", nombre: "Rojo/Negro", multiplicador: 2, color: "bg-red-600" },
    { id: "par_impar", nombre: "Par/Impar", multiplicador: 2, color: "bg-orange-600" },
    { id: "bajo_alto", nombre: "Bajo/Alto", multiplicador: 2, color: "bg-cyan-600" }
];

export default function RuletaEuropea() {
    const navigate = useNavigate();
    const wheelRef = useRef<HTMLDivElement | null>(null);
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [apuestas, setApuestas] = useState<Apuesta[]>([]);
    const [tipoApuestaSeleccionado, setTipoApuestaSeleccionado] = useState<string>("numero_pleno");
    const [montoApuesta, setMontoApuesta] = useState<number>(APUESTA_MINIMA);
    const [valorApuesta, setValorApuesta] = useState<any>(null);
    const [girando, setGirando] = useState(false);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [resultado, setResultado] = useState<any>(null);
    const [historial, setHistorial] = useState<HistorialJuego[]>([]);
    const [probabilidades, setProbabilidades] = useState<{ [key: string]: Probabilidad }>({});
    const [estadisticas, setEstadisticas] = useState({
        totalJuegos: 0,
        gananciaTotal: 0,
        gastoTotal: 0,
        balance: 0,
        numerosMasFrecuentes: [] as Array<{ numero: number, frecuencia: number }>
    });
    const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({
        totalJuegosAcum: 0,
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
                const res = await axios.get(`${API_URL}/juegos/ruletaeuropea/probabilidades`);
                setProbabilidades(res.data.probabilidades);
            } catch (error) {
                console.error("Error al cargar probabilidades:", error);
            }
        };
        cargarProbabilidades();
    }, []);

    // Cargar historial y estadísticas desde localStorage al iniciar
    useEffect(() => {
        const historialGuardado = localStorage.getItem("historial_ruletaeuropea");
        if (historialGuardado) {
            const historialParsed = JSON.parse(historialGuardado);
            setHistorial(historialParsed);
        }

        const statsAcum = localStorage.getItem("estadisticas_acumulativas_ruletaeuropea");
        if (statsAcum) {
            const parsedStats = JSON.parse(statsAcum);
            setEstadisticasAcumulativas(parsedStats);

            const balance = parsedStats.gananciaTotalAcum - parsedStats.gastoTotalAcum;
            setEstadisticas(prev => ({
                ...prev,
                totalJuegos: parsedStats.totalJuegosAcum,
                gananciaTotal: parsedStats.gananciaTotalAcum,
                gastoTotal: parsedStats.gastoTotalAcum,
                balance: balance
            }));
        }

        // Cargar números más frecuentes
        const numerosFrecuentes = localStorage.getItem("numeros_frecuentes_ruletaeuropea");
        if (numerosFrecuentes) {
            setEstadisticas(prev => ({
                ...prev,
                numerosMasFrecuentes: JSON.parse(numerosFrecuentes)
            }));
        }
    }, []);

    // Guardar historial en localStorage
    useEffect(() => {
        if (historial.length > 0) {
            localStorage.setItem("historial_ruletaeuropea", JSON.stringify(historial.slice(0, 20)));
        }
    }, [historial]);

    // Guardar estadísticas acumulativas en localStorage
    useEffect(() => {
        if (estadisticasAcumulativas.totalJuegosAcum > 0) {
            localStorage.setItem("estadisticas_acumulativas_ruletaeuropea", JSON.stringify(estadisticasAcumulativas));
        }
    }, [estadisticasAcumulativas]);

    // Guardar números más frecuentes
    useEffect(() => {
        if (estadisticas.numerosMasFrecuentes.length > 0) {
            localStorage.setItem("numeros_frecuentes_ruletaeuropea", JSON.stringify(estadisticas.numerosMasFrecuentes));
        }
    }, [estadisticas.numerosMasFrecuentes]);

    const actualizarEstadisticas = (nuevoJuego: HistorialJuego) => {
        // Actualizar estadísticas acumulativas
        setEstadisticasAcumulativas(prev => {
            const nuevoTotal = prev.totalJuegosAcum + 1;
            const nuevaGananciaTotal = prev.gananciaTotalAcum + nuevoJuego.ganancia_total;
            const nuevoGastoTotal = prev.gastoTotalAcum + nuevoJuego.total_apostado;

            return {
                totalJuegosAcum: nuevoTotal,
                gananciaTotalAcum: nuevaGananciaTotal,
                gastoTotalAcum: nuevoGastoTotal
            };
        });

        // Actualizar estadísticas visibles
        setEstadisticas(prev => {
            const nuevoTotal = prev.totalJuegos + 1;
            const nuevaGananciaTotal = prev.gananciaTotal + nuevoJuego.ganancia_total;
            const nuevoGastoTotal = prev.gastoTotal + nuevoJuego.total_apostado;
            const nuevoBalance = nuevaGananciaTotal - nuevoGastoTotal;

            // Actualizar números más frecuentes
            const nuevoNumero = nuevoJuego.numero_ganador;
            const numerosActualizados = [...prev.numerosMasFrecuentes];
            const index = numerosActualizados.findIndex(n => n.numero === nuevoNumero);

            if (index !== -1) {
                numerosActualizados[index].frecuencia += 1;
            } else {
                numerosActualizados.push({ numero: nuevoNumero, frecuencia: 1 });
            }

            // Ordenar por frecuencia
            numerosActualizados.sort((a, b) => b.frecuencia - a.frecuencia);

            return {
                totalJuegos: nuevoTotal,
                gananciaTotal: nuevaGananciaTotal,
                gastoTotal: nuevoGastoTotal,
                balance: nuevoBalance,
                numerosMasFrecuentes: numerosActualizados.slice(0, 10) // Solo los 10 más frecuentes
            };
        });
    };

    const agregarAlHistorial = (
        numero_ganador: number,
        color_ganador: string,
        ganancia_total: number,
        total_apostado: number
    ) => {
        const nuevoJuego: HistorialJuego = {
            id: Date.now(),
            numero_ganador,
            color_ganador,
            ganancia_total,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            total_apostado
        };

        const nuevoHistorial = [nuevoJuego, ...historial.slice(0, 19)];
        setHistorial(nuevoHistorial);
        actualizarEstadisticas(nuevoJuego);
    };

    const animarConfetti = () => {
        confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.6 }
        });
        setTimeout(() => {
            confetti({
                particleCount: 150,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
            confetti({
                particleCount: 150,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });
        }, 250);
    };

    const agregarApuesta = () => {
        if (!valorApuesta) {
            setMensaje("Debes seleccionar un valor para la apuesta.");
            return;
        }

        if (montoApuesta < APUESTA_MINIMA) {
            setMensaje(`El monto mínimo por apuesta es $${APUESTA_MINIMA}.`);
            return;
        }

        if (usuario && montoApuesta > usuario.saldo) {
            setMensaje("Saldo insuficiente para agregar esta apuesta.");
            return;
        }

        const nuevaApuesta: Apuesta = {
            tipo: tipoApuestaSeleccionado,
            valor: valorApuesta,
            monto: montoApuesta
        };

        setApuestas(prev => [...prev, nuevaApuesta]);
        setValorApuesta(null);
        setMontoApuesta(APUESTA_MINIMA);
        setMensaje(`Apuesta agregada: ${tipoApuestaSeleccionado} - $${montoApuesta}`);
    };

    const eliminarApuesta = (index: number) => {
        setApuestas(prev => prev.filter((_, i) => i !== index));
    };

    const limpiarApuestas = () => {
        setApuestas([]);
        setMensaje("Todas las apuestas han sido eliminadas.");
    };

    const calcularTotalApostado = () => {
        return apuestas.reduce((total, apuesta) => total + apuesta.monto, 0);
    };

    const realizarJugada = async () => {
        if (!usuario) {
            setMensaje("Debes iniciar sesión para jugar.");
            return;
        }

        if (apuestas.length === 0) {
            setMensaje("Debes agregar al menos una apuesta.");
            return;
        }

        const totalApostado = calcularTotalApostado();
        if (totalApostado > usuario.saldo) {
            setMensaje("Saldo insuficiente para realizar estas apuestas.");
            return;
        }

        setGirando(true);
        setMensaje(null);
        setResultado(null);

        try {
            const token = localStorage.getItem("token");

            // Preparar apuestas para enviar al backend
            const apuestasArray = apuestas.map(apuesta => ({
                tipo: apuesta.tipo,
                valor: apuesta.valor,
                monto: apuesta.monto
            }));

            console.log("Enviando apuestas:", apuestasArray); // Para depuración

            const res = await axios.post(
                `${API_URL}/juegos/ruletaeuropea?apuestas=${apuestasArray}`,
                {},  // ENVIAR EN EL BODY, no en query string
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = res.data;

            // Actualizar saldo del usuario
            setUsuario(prev => prev ? { ...prev, saldo: data.nuevo_saldo } : null);

            // Mostrar resultado
            setResultado(data);

            // Animación de confetti si hay ganancias
            if (data.ganancia_total > 0) {
                animarConfetti();
            }

            // Agregar al historial
            agregarAlHistorial(
                data.numero_ganador,
                data.color_ganador,
                data.ganancia_total,
                data.total_apostado
            );

            setMensaje(data.mensaje);

            // Limpiar apuestas después del juego
            setApuestas([]);

        } catch (err: any) {
            console.error("Error al realizar apuesta:", err);
            console.error("Respuesta del servidor:", err.response?.data);
            setMensaje(err.response?.data?.detail || err.response?.data?.message || "Error al procesar las apuestas");
        } finally {
            setGirando(false);
        }
    };

    const limpiarHistorial = () => {
        setHistorial([]);
        localStorage.removeItem("historial_ruletaeuropea");
        showMsg("Historial limpiado", "info");
    };

    const limpiarTodasEstadisticas = () => {
        setHistorial([]);
        setEstadisticas({
            totalJuegos: 0,
            gananciaTotal: 0,
            gastoTotal: 0,
            balance: 0,
            numerosMasFrecuentes: []
        });
        setEstadisticasAcumulativas({
            totalJuegosAcum: 0,
            gananciaTotalAcum: 0,
            gastoTotalAcum: 0,
        });
        localStorage.removeItem("historial_ruletaeuropea");
        localStorage.removeItem("estadisticas_acumulativas_ruletaeuropea");
        localStorage.removeItem("numeros_frecuentes_ruletaeuropea");
        showMsg("Estadísticas reiniciadas completamente", "info");
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const cerrarSesion = () => {
        setUsuario(null);
    };

    const valoresApuesta = [10, 25, 50, 100, 200, 500, 1000, 5000];

    const renderSelectorApuesta = () => {
        switch (tipoApuestaSeleccionado) {
            case "numero_pleno":
                return (
                    <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                        {NUMEROS_RULETA.map(numero => (
                            <button
                                key={numero}
                                onClick={() => setValorApuesta(numero)}
                                className={`p-3 rounded-lg font-bold transition-all ${valorApuesta === numero
                                    ? COLORES[numero] === "rojo"
                                        ? 'bg-red-600 text-white scale-110'
                                        : COLORES[numero] === "negro"
                                            ? 'bg-gray-900 text-white scale-110'
                                            : 'bg-green-600 text-white scale-110'
                                    : COLORES[numero] === "rojo"
                                        ? 'bg-red-900/50 text-red-200 hover:bg-red-800'
                                        : COLORES[numero] === "negro"
                                            ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                                            : 'bg-green-900/50 text-green-200 hover:bg-green-800'
                                    }`}
                            >
                                {numero}
                            </button>
                        ))}
                    </div>
                );

            case "rojo_negro":
                return (
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setValorApuesta("rojo")}
                            className={`px-8 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === "rojo"
                                ? 'bg-red-600 text-white scale-110'
                                : 'bg-red-900/50 text-red-200 hover:bg-red-800'
                                }`}
                        >
                            ROJO
                        </button>
                        <button
                            onClick={() => setValorApuesta("negro")}
                            className={`px-8 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === "negro"
                                ? 'bg-gray-900 text-white scale-110'
                                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                                }`}
                        >
                            NEGRO
                        </button>
                    </div>
                );

            case "par_impar":
                return (
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setValorApuesta("par")}
                            className={`px-8 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === "par"
                                ? 'bg-blue-600 text-white scale-110'
                                : 'bg-blue-900/50 text-blue-200 hover:bg-blue-800'
                                }`}
                        >
                            PAR
                        </button>
                        <button
                            onClick={() => setValorApuesta("impar")}
                            className={`px-8 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === "impar"
                                ? 'bg-yellow-600 text-white scale-110'
                                : 'bg-yellow-900/50 text-yellow-200 hover:bg-yellow-800'
                                }`}
                        >
                            IMPAR
                        </button>
                    </div>
                );

            case "bajo_alto":
                return (
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setValorApuesta("bajo")}
                            className={`px-8 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === "bajo"
                                ? 'bg-green-600 text-white scale-110'
                                : 'bg-green-900/50 text-green-200 hover:bg-green-800'
                                }`}
                        >
                            1-18 (BAJO)
                        </button>
                        <button
                            onClick={() => setValorApuesta("alto")}
                            className={`px-8 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === "alto"
                                ? 'bg-purple-600 text-white scale-110'
                                : 'bg-purple-900/50 text-purple-200 hover:bg-purple-800'
                                }`}
                        >
                            19-36 (ALTO)
                        </button>
                    </div>
                );

            case "docena":
                return (
                    <div className="grid grid-cols-3 gap-4">
                        <button
                            onClick={() => setValorApuesta(1)}
                            className={`px-6 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === 1
                                ? 'bg-indigo-600 text-white scale-110'
                                : 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-800'
                                }`}
                        >
                            1-12
                        </button>
                        <button
                            onClick={() => setValorApuesta(2)}
                            className={`px-6 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === 2
                                ? 'bg-indigo-600 text-white scale-110'
                                : 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-800'
                                }`}
                        >
                            13-24
                        </button>
                        <button
                            onClick={() => setValorApuesta(3)}
                            className={`px-6 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === 3
                                ? 'bg-indigo-600 text-white scale-110'
                                : 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-800'
                                }`}
                        >
                            25-36
                        </button>
                    </div>
                );

            case "columna":
                return (
                    <div className="grid grid-cols-3 gap-4">
                        <button
                            onClick={() => setValorApuesta(1)}
                            className={`px-6 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === 1
                                ? 'bg-teal-600 text-white scale-110'
                                : 'bg-teal-900/50 text-teal-200 hover:bg-teal-800'
                                }`}
                        >
                            Columna 1
                        </button>
                        <button
                            onClick={() => setValorApuesta(2)}
                            className={`px-6 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === 2
                                ? 'bg-teal-600 text-white scale-110'
                                : 'bg-teal-900/50 text-teal-200 hover:bg-teal-800'
                                }`}
                        >
                            Columna 2
                        </button>
                        <button
                            onClick={() => setValorApuesta(3)}
                            className={`px-6 py-4 rounded-xl font-bold text-xl transition-all ${valorApuesta === 3
                                ? 'bg-teal-600 text-white scale-110'
                                : 'bg-teal-900/50 text-teal-200 hover:bg-teal-800'
                                }`}
                        >
                            Columna 3
                        </button>
                    </div>
                );

            default:
                return (
                    <div className="text-center text-gray-400">
                        Selecciona un tipo de apuesta para ver las opciones
                    </div>
                );
        }
    };

    const renderRuedaRuleta = () => {
        const radius = 200;
        const cx = 220;
        const cy = 220;
        const sectorAngle = (2 * Math.PI) / NUMEROS_RULETA.length;

        return (
            <svg width={440} height={440} viewBox="0 0 440 440" className="block mx-auto">
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
                    {NUMEROS_RULETA.map((numero, i) => {
                        const startAngle = i * sectorAngle - Math.PI / 2;
                        const endAngle = startAngle + sectorAngle;
                        const x1 = Math.cos(startAngle) * radius;
                        const y1 = Math.sin(startAngle) * radius;
                        const x2 = Math.cos(endAngle) * radius;
                        const y2 = Math.sin(endAngle) * radius;
                        const largeArcFlag = sectorAngle > Math.PI ? 1 : 0;
                        const path = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                        const textAngle = (startAngle + endAngle) / 2;
                        const tx = Math.cos(textAngle) * (radius * 0.7);
                        const ty = Math.sin(textAngle) * (radius * 0.7);
                        const rotateDeg = (textAngle * 180) / Math.PI;

                        const color = COLORES[numero];
                        let fillColor;
                        let textColor;

                        if (color === "rojo") {
                            fillColor = "#DC2626"; // Rojo
                            textColor = "#FFFFFF";
                        } else if (color === "negro") {
                            fillColor = "#1F2937"; // Negro
                            textColor = "#FFFFFF";
                        } else {
                            fillColor = "#10B981"; // Verde
                            textColor = "#FFFFFF";
                        }

                        return (
                            <g key={i}>
                                <path d={path} fill={fillColor} stroke="#FFFFFF33" strokeWidth={1} />
                                <text
                                    x={tx}
                                    y={ty}
                                    transform={`rotate(${rotateDeg} ${tx} ${ty})`}
                                    fill={textColor}
                                    fontSize={14}
                                    fontWeight={700}
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                >
                                    {numero}
                                </text>
                            </g>
                        );
                    })}

                    {/* Círculo central */}
                    <circle r={25} fill="#1F2937" stroke="#FFFFFF" strokeWidth={3} />
                    <circle r={20} fill="#FFFFFF" />
                    <text fill="#1F2937" fontSize={16} fontWeight={900} textAnchor="middle" alignmentBaseline="middle">
                        0
                    </text>
                </g>
            </svg>
        );
    };

    const renderTableroRuleta = () => {
        // Organizar números en el orden del tablero real
        const numerosTablero = [
            [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
            [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
            [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
        ];

        return (
            <div className="bg-green-800 p-6 rounded-2xl border-4 border-yellow-600">
                <div className="flex">
                    {/* Columna del 0 */}
                    <div className="w-16 flex flex-col">
                        <div className="h-24 flex items-center justify-center bg-green-600 border-2 border-white rounded-lg mb-1">
                            <span className="text-2xl font-bold text-white">0</span>
                        </div>
                        <div className="flex-1"></div>
                    </div>

                    {/* Números principales */}
                    <div className="flex-1">
                        {numerosTablero.map((columna, colIndex) => (
                            <div key={colIndex} className="flex flex-col">
                                {columna.map((numero, rowIndex) => (
                                    <button
                                        key={`${colIndex}-${rowIndex}`}
                                        onClick={() => {
                                            setTipoApuestaSeleccionado("numero_pleno");
                                            setValorApuesta(numero);
                                        }}
                                        className={`h-12 flex-1 flex items-center justify-center border border-white ${rowIndex === columna.length - 1 ? '' : 'mb-1'} ${COLORES[numero] === "rojo"
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-gray-900 hover:bg-gray-800'
                                            } transition-colors`}
                                    >
                                        <span className="text-lg font-bold text-white">{numero}</span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Apuestas externas */}
                    <div className="w-32 ml-4 flex flex-col space-y-2">
                        <button
                            onClick={() => {
                                setTipoApuestaSeleccionado("docena");
                                setValorApuesta(1);
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center border-2 border-white"
                        >
                            <span className="text-white font-bold text-sm">1st 12</span>
                        </button>
                        <button
                            onClick={() => {
                                setTipoApuestaSeleccionado("docena");
                                setValorApuesta(2);
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center border-2 border-white"
                        >
                            <span className="text-white font-bold text-sm">2nd 12</span>
                        </button>
                        <button
                            onClick={() => {
                                setTipoApuestaSeleccionado("docena");
                                setValorApuesta(3);
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center border-2 border-white"
                        >
                            <span className="text-white font-bold text-sm">3rd 12</span>
                        </button>
                    </div>
                </div>

                {/* Apuestas inferiores */}
                <div className="mt-4 grid grid-cols-6 gap-2">
                    <button
                        onClick={() => {
                            setTipoApuestaSeleccionado("bajo_alto");
                            setValorApuesta("bajo");
                        }}
                        className="py-3 bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center border-2 border-white"
                    >
                        <span className="text-white font-bold">1-18</span>
                    </button>
                    <button
                        onClick={() => {
                            setTipoApuestaSeleccionado("par_impar");
                            setValorApuesta("par");
                        }}
                        className="py-3 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center border-2 border-white"
                    >
                        <span className="text-white font-bold">PAR</span>
                    </button>
                    <button
                        onClick={() => {
                            setTipoApuestaSeleccionado("rojo_negro");
                            setValorApuesta("rojo");
                        }}
                        className="py-3 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center border-2 border-white"
                    >
                        <span className="text-white font-bold">ROJO</span>
                    </button>
                    <button
                        onClick={() => {
                            setTipoApuestaSeleccionado("rojo_negro");
                            setValorApuesta("negro");
                        }}
                        className="py-3 bg-gray-900 hover:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-white"
                    >
                        <span className="text-white font-bold">NEGRO</span>
                    </button>
                    <button
                        onClick={() => {
                            setTipoApuestaSeleccionado("par_impar");
                            setValorApuesta("impar");
                        }}
                        className="py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg flex items-center justify-center border-2 border-white"
                    >
                        <span className="text-white font-bold">IMPAR</span>
                    </button>
                    <button
                        onClick={() => {
                            setTipoApuestaSeleccionado("bajo_alto");
                            setValorApuesta("alto");
                        }}
                        className="py-3 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center border-2 border-white"
                    >
                        <span className="text-white font-bold">19-36</span>
                    </button>
                </div>
            </div>
        );
    };

    if (!usuario) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando ruleta...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
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
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-yellow-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-green-500 to-yellow-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-red-500 to-blue-500 rounded-full blur-3xl opacity-20"></div>

                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-green-600/20 to-yellow-600/20 border border-green-500/30 rounded-full text-sm font-bold text-green-400">
                                🎡 RULETA EUROPEA
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-green-400 via-yellow-400 to-green-400 bg-clip-text text-transparent">
                                Casino Clásico
                            </span>
                            <br />
                            <span className="text-white">Un solo cero - Mayor probabilidad de ganar</span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Apuesta desde <span className="text-yellow-400 font-bold">${APUESTA_MINIMA}</span>.
                            <span className="text-green-400 font-bold"> ¡Hasta 35x tu apuesta en número pleno!</span>
                            <br />
                            <span className="text-blue-400">🏆 Ventaja de la casa: Solo 2.70%</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* Contenido Principal */}
            <section className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Ruleta y Tablero */}
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
                                            : mensaje.includes("Error") || mensaje.includes("insuficiente") || mensaje.includes("Debes")
                                                ? "bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200"
                                                : "bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-500/50 text-blue-200"
                                            }`}>
                                            {mensaje}
                                        </div>
                                    )}
                                </div>

                                {/* Rueda de la Ruleta */}
                                <div className="mb-10">
                                    <div className="relative">
                                        <div
                                            ref={wheelRef}
                                            className="w-full max-w-md mx-auto aspect-square rounded-full overflow-hidden border-8 border-gray-800 shadow-2xl"
                                        >
                                            {renderRuedaRuleta()}
                                        </div>

                                        {/* Indicador superior */}
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-gray-900 z-20" />
                                    </div>
                                </div>

                                {/* Selector de apuestas */}
                                <div className="mb-10">
                                    <h3 className="text-2xl font-bold text-white mb-6 text-center">💰 Configurar Apuesta</h3>

                                    {/* Tipo de apuesta */}
                                    <div className="mb-8">
                                        <label className="block text-white text-lg font-bold mb-4">Tipo de Apuesta</label>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            {TIPOS_APUESTA.map(tipo => (
                                                <button
                                                    key={tipo.id}
                                                    onClick={() => {
                                                        setTipoApuestaSeleccionado(tipo.id);
                                                        setValorApuesta(null);
                                                    }}
                                                    className={`px-4 py-3 rounded-lg font-bold transition-all ${tipoApuestaSeleccionado === tipo.id
                                                        ? `${tipo.color} text-white scale-105`
                                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {tipo.nombre}
                                                    <div className="text-xs opacity-80">x{tipo.multiplicador}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Valor de la apuesta */}
                                    <div className="mb-8">
                                        <label className="block text-white text-lg font-bold mb-4">
                                            Valor: {tipoApuestaSeleccionado.replace('_', ' ').toUpperCase()}
                                        </label>
                                        {renderSelectorApuesta()}
                                    </div>

                                    {/* Monto de la apuesta */}
                                    <div className="mb-8">
                                        <label className="block text-white text-lg font-bold mb-4">Monto de la Apuesta</label>
                                        <div className="flex flex-col items-center space-y-6">
                                            <input
                                                type="range"
                                                min={APUESTA_MINIMA}
                                                max={Math.min(usuario?.saldo || APUESTA_MINIMA, 10000)}
                                                step={10}
                                                value={montoApuesta}
                                                onChange={(e) => setMontoApuesta(parseInt(e.target.value))}
                                                className="w-full h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-green-500 [&::-webkit-slider-thumb]:to-yellow-500"
                                            />
                                            <div className="flex justify-between w-full text-gray-400 text-sm">
                                                <span>${APUESTA_MINIMA}</span>
                                                <span className="text-xl font-bold text-yellow-400">${montoApuesta}</span>
                                                <span>${Math.min(usuario?.saldo || APUESTA_MINIMA, 10000)}</span>
                                            </div>
                                            <div className="flex flex-wrap justify-center gap-3">
                                                {valoresApuesta.map((valor) => (
                                                    <button
                                                        key={valor}
                                                        onClick={() => setMontoApuesta(valor)}
                                                        disabled={valor > (usuario?.saldo || 0)}
                                                        className={`px-4 py-3 rounded-lg font-bold transition-all duration-200 ${montoApuesta === valor
                                                            ? 'bg-gradient-to-r from-green-600 to-yellow-600 text-white scale-105'
                                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                            } ${valor > (usuario?.saldo || 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        ${valor}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botón para agregar apuesta */}
                                    <button
                                        onClick={agregarApuesta}
                                        disabled={!valorApuesta || montoApuesta < APUESTA_MINIMA || montoApuesta > usuario.saldo}
                                        className={`w-full py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${!valorApuesta || montoApuesta < APUESTA_MINIMA || montoApuesta > usuario.saldo
                                            ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                            : 'bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-500 hover:to-yellow-500 hover:scale-105 active:scale-95'
                                            }`}
                                    >
                                        ➕ Agregar Apuesta (${montoApuesta})
                                    </button>
                                </div>

                                {/* Apuestas actuales */}
                                <div className="mb-10">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-2xl font-bold text-white">📋 Apuestas Actuales</h3>
                                        {apuestas.length > 0 && (
                                            <button
                                                onClick={limpiarApuestas}
                                                className="px-4 py-2 bg-red-900/50 text-red-300 hover:bg-red-800/70 rounded-lg transition-colors"
                                            >
                                                Limpiar Todas
                                            </button>
                                        )}
                                    </div>

                                    {apuestas.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-800/30 rounded-2xl border border-gray-700/50">
                                            <div className="text-4xl mb-3">🎯</div>
                                            <p className="text-gray-400">No hay apuestas agregadas</p>
                                            <p className="text-sm text-gray-500 mt-1">Configura y agrega apuestas para comenzar</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {apuestas.map((apuesta, index) => (
                                                <div key={index} className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <div className="text-white font-bold text-lg">
                                                                {apuesta.tipo.replace('_', ' ').toUpperCase()}
                                                            </div>
                                                            <div className="text-gray-400">
                                                                Valor: {JSON.stringify(apuesta.valor)}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-4">
                                                            <div className="text-right">
                                                                <div className="text-xl font-bold text-yellow-400">${apuesta.monto}</div>
                                                                <div className="text-sm text-gray-400">
                                                                    Posible ganancia: ${apuesta.monto *
                                                                        (TIPOS_APUESTA.find(t => t.id === apuesta.tipo)?.multiplicador || 1)}
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => eliminarApuesta(index)}
                                                                className="px-3 py-1 bg-red-900/30 text-red-300 hover:bg-red-800/40 rounded-lg transition-colors"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-yellow-500/30">
                                                <div className="flex justify-between items-center">
                                                    <div className="text-white font-bold text-lg">TOTAL APOSTADO</div>
                                                    <div className="text-2xl font-bold text-yellow-400">${calcularTotalApostado()}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Botón de jugar */}
                                <button
                                    onClick={realizarJugada}
                                    disabled={girando || apuestas.length === 0 || calcularTotalApostado() > usuario.saldo}
                                    className={`w-full py-5 px-8 rounded-xl font-bold text-xl transition-all duration-300 ${girando || apuestas.length === 0 || calcularTotalApostado() > usuario.saldo
                                        ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                        : 'bg-gradient-to-r from-green-600 to-yellow-600 hover:from-green-500 hover:to-yellow-500 hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20'
                                        }`}
                                >
                                    {girando ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin h-6 w-6 mr-3 text-white" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Girando ruleta...
                                        </span>
                                    ) : (
                                        `🎡 Girar Ruleta ($${calcularTotalApostado()})`
                                    )}
                                </button>

                                {/* Resultado */}
                                {resultado && (
                                    <div className="mt-10 p-8 bg-gradient-to-r from-gray-800/70 to-gray-900/70 border-4 border-yellow-500/30 rounded-3xl">
                                        <div className="text-center">
                                            <div className="text-4xl font-bold text-white mb-6">
                                                ¡NÚMERO GANADOR!
                                            </div>

                                            <div className="flex items-center justify-center space-x-8 mb-8">
                                                <div className={`text-center p-6 rounded-2xl ${COLORES[resultado.numero_ganador] === "rojo"
                                                    ? 'bg-red-600'
                                                    : COLORES[resultado.numero_ganador] === "negro"
                                                        ? 'bg-gray-900'
                                                        : 'bg-green-600'
                                                    }`}>
                                                    <div className="text-6xl font-bold text-white">{resultado.numero_ganador}</div>
                                                    <div className="text-xl text-gray-200 mt-2">
                                                        {COLORES[resultado.numero_ganador].toUpperCase()}
                                                    </div>
                                                </div>

                                                <div className="text-left">
                                                    <div className="text-gray-300">
                                                        <div>Par: {resultado.es_par ? '✅' : '❌'}</div>
                                                        <div>Impar: {resultado.es_impar ? '✅' : '❌'}</div>
                                                        <div>Bajo (1-18): {resultado.es_bajo ? '✅' : '❌'}</div>
                                                        <div>Alto (19-36): {resultado.es_alto ? '✅' : '❌'}</div>
                                                        <div>Docena: {resultado.docena}</div>
                                                        <div>Columna: {resultado.columna}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6 mb-8">
                                                <div className="bg-gray-800/50 p-6 rounded-xl">
                                                    <div className="text-sm text-gray-400">Total Apostado</div>
                                                    <div className="text-3xl font-bold text-yellow-400">${resultado.total_apostado}</div>
                                                </div>
                                                <div className="bg-gray-800/50 p-6 rounded-xl">
                                                    <div className="text-sm text-gray-400">Ganancia Total</div>
                                                    <div className={`text-3xl font-bold ${resultado.ganancia_total > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        ${resultado.ganancia_total}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-xl text-gray-400">{resultado.mensaje}</div>

                                            {/* Apuestas ganadoras */}
                                            {resultado.apuestas_ganadoras && resultado.apuestas_ganadoras.length > 0 && (
                                                <div className="mt-8">
                                                    <div className="text-2xl font-bold text-green-400 mb-4">🎉 Apuestas Ganadoras</div>
                                                    <div className="space-y-3">
                                                        {resultado.apuestas_ganadoras.map((apuesta: any, index: number) => (
                                                            <div key={index} className="p-4 bg-green-900/20 rounded-xl border border-green-500/30">
                                                                <div className="flex justify-between items-center">
                                                                    <div>
                                                                        <div className="text-white font-bold">
                                                                            {apuesta.tipo.replace('_', ' ').toUpperCase()}
                                                                        </div>
                                                                        <div className="text-gray-300">Valor: {JSON.stringify(apuesta.valor)}</div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-2xl font-bold text-green-400">
                                                                            +${apuesta.ganancia}
                                                                        </div>
                                                                        <div className="text-sm text-gray-300">
                                                                            Apuesta: ${apuesta.monto}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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
                                    <div className="text-sm text-gray-400">Total Juegos</div>
                                    <div className="text-2xl font-bold text-blue-400">{estadisticas.totalJuegos}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Ganancia Total</div>
                                    <div className="text-2xl font-bold text-green-400">${estadisticas.gananciaTotal}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Gasto Total</div>
                                    <div className="text-2xl font-bold text-red-400">${estadisticas.gastoTotal}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                    <div className="text-sm text-gray-400">Balance</div>
                                    <div className={`text-2xl font-bold ${estadisticas.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${estadisticas.balance}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6">
                                <h4 className="text-lg font-bold text-white mb-3">🎯 Números Más Frecuentes</h4>
                                <div className="space-y-2">
                                    {estadisticas.numerosMasFrecuentes.length > 0 ? (
                                        estadisticas.numerosMasFrecuentes.map(({ numero, frecuencia }) => (
                                            <div key={numero} className="flex items-center justify-between p-3 bg-gray-800/40 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-3 h-3 rounded-full ${COLORES[numero] === "rojo" ? 'bg-red-500' : COLORES[numero] === "negro" ? 'bg-gray-500' : 'bg-green-500'}`} />
                                                    <span className="text-white font-medium">Número {numero}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-white font-bold">{frecuencia} veces</div>
                                                    <div className="text-xs text-gray-400">
                                                        {estadisticas.totalJuegos > 0
                                                            ? `${((frecuencia / estadisticas.totalJuegos) * 100).toFixed(1)}%`
                                                            : '0%'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-gray-400">
                                            No hay datos suficientes
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Probabilidades */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📈 Probabilidades</h3>
                            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                {Object.entries(probabilidades).map(([tipo, datos]) => (
                                    <div key={tipo} className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="text-white font-bold">
                                                {tipo.replace('_', ' ').toUpperCase()}
                                            </div>
                                            <div className="text-yellow-400 font-bold">x{datos.multiplicador}</div>
                                        </div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-gray-400 text-sm">Probabilidad</span>
                                            <span className="text-blue-400">{datos.probabilidad}%</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                                                style={{ width: `${datos.probabilidad}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2">{datos.descripcion}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-700/30">
                                <div className="text-center text-gray-400">
                                    <span className="text-red-400">⚠️ Ventaja de la casa: 2.70%</span>
                                </div>
                            </div>
                        </div>

                        {/* Historial */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">📝 Historial de Tiradas</h3>
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
                                    <div className="text-4xl mb-3">🎡</div>
                                    <p className="text-gray-400">No hay tiradas registradas</p>
                                    <p className="text-sm text-gray-500 mt-1">Gira la ruleta para comenzar</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                    {historial.map((juego) => (
                                        <div key={juego.id} className={`p-4 rounded-xl border ${juego.ganancia_total > 0
                                            ? 'bg-gradient-to-r from-green-900/20 to-green-800/10 border-green-500/30'
                                            : 'bg-gradient-to-r from-red-900/20 to-red-800/10 border-red-500/30'
                                            }`}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${COLORES[juego.numero_ganador] === "rojo"
                                                            ? 'bg-red-600'
                                                            : COLORES[juego.numero_ganador] === "negro"
                                                                ? 'bg-gray-900'
                                                                : 'bg-green-600'
                                                            }`}>
                                                            <span className="text-white font-bold">{juego.numero_ganador}</span>
                                                        </div>
                                                        <div className="text-white font-medium">{juego.color_ganador}</div>
                                                    </div>
                                                    <div className="text-sm text-gray-400 mt-1">{juego.fecha}</div>
                                                    <div className="text-xs text-gray-500">Apostado: ${juego.total_apostado}</div>
                                                </div>
                                                <div className={`text-right ${juego.ganancia_total > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    <div className="text-2xl font-bold">
                                                        {juego.ganancia_total > 0 ? `+$${juego.ganancia_total}` : `-$${juego.total_apostado}`}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {juego.ganancia_total > 0
                                                            ? `Neto: $${juego.ganancia_total - juego.total_apostado}`
                                                            : 'Pérdida total'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Información */}
                        <div className="bg-gradient-to-r from-green-600/20 to-yellow-600/20 border border-green-500/30 rounded-2xl p-6">
                            <h4 className="text-lg font-bold text-white mb-3">💡 Cómo jugar</h4>
                            <ul className="space-y-3 text-gray-300">
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>Selecciona un tipo de apuesta</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>Elige el valor de la apuesta</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>Configura el monto (mínimo ${APUESTA_MINIMA})</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>Agrega múltiples apuestas antes de girar</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>La ruleta gira y determina el número ganador</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>Ganas según los multiplicadores de cada apuesta</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="text-green-400">•</span>
                                    <span>¡Juega con responsabilidad!</span>
                                </li>
                            </ul>
                        </div>

                        {/* Tipos de apuestas */}
                        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6">
                            <h4 className="text-lg font-bold text-white mb-3">🎯 Tipos de Apuestas</h4>
                            <div className="space-y-3">
                                {TIPOS_APUESTA.slice(0, 5).map(tipo => (
                                    <div key={tipo.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                        <span className="text-white">{tipo.nombre}</span>
                                        <span className="text-yellow-400 font-bold">x{tipo.multiplicador}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <Footer />
        </div>
    );
}