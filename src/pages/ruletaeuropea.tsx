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

const TIPOS_APUESTA = [
    { id: "numero_pleno", nombre: "Pleno", multiplicador: 35, icon: "🎯", color: "#9333EA" },
    { id: "docena", nombre: "Docena", multiplicador: 2, icon: "3️⃣", color: "#4F46E5" },
    { id: "columna", nombre: "Columna", multiplicador: 2, icon: "📊", color: "#0D9488" },
    { id: "rojo_negro", nombre: "Rojo/Negro", multiplicador: 2, icon: "🔴", color: "#DC2626" },
    { id: "par_impar", nombre: "Par/Impar", multiplicador: 2, icon: "♾️", color: "#D97706" },
    { id: "bajo_alto", nombre: "Bajo/Alto", multiplicador: 2, icon: "📈", color: "#0891B2" }
];

const FICHAS = [
    { valor: 10, color: "#3B82F6", borde: "#93C5FD", label: "10" },
    { valor: 25, color: "#10B981", borde: "#6EE7B7", label: "25" },
    { valor: 50, color: "#EF4444", borde: "#FCA5A5", label: "50" },
    { valor: 100, color: "#8B5CF6", borde: "#C4B5FD", label: "100" },
    { valor: 200, color: "#F59E0B", borde: "#FCD34D", label: "200" },
    { valor: 500, color: "#EC4899", borde: "#F9A8D4", label: "500" },
    { valor: 1000, color: "#14B8A6", borde: "#5EEAD4", label: "1K" },
    { valor: 5000, color: "#F97316", borde: "#FDBA74", label: "5K" },
];

export default function RuletaEuropea() {
    const navigate = useNavigate();
    const wheelRef = useRef<SVGGElement | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [apuestas, setApuestas] = useState<Apuesta[]>([]);
    const [tipoApuestaSeleccionado, setTipoApuestaSeleccionado] = useState<string>("numero_pleno");
    const [montoApuesta, setMontoApuesta] = useState<number>(APUESTA_MINIMA);
    const [valorApuesta, setValorApuesta] = useState<any>(null);
    const [girando, setGirando] = useState(false);
    const [wheelAngle, setWheelAngle] = useState(0);
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
    const [activeTab, setActiveTab] = useState<"historial" | "estadisticas" | "probabilidades">("historial");

    useEffect(() => {
        if (!usuario) {
            const token = localStorage.getItem("token");
            if (!token) { navigate('/login'); return; }
            const usuarioGuardado = localStorage.getItem('usuario');
            if (usuarioGuardado) {
                try { setUsuario(JSON.parse(usuarioGuardado)); } catch (e) { console.error(e); }
            }
        }
    }, [navigate, usuario]);

    useEffect(() => {
        const cargarProbabilidades = async () => {
            try {
                const res = await axios.get(`${API_URL}/juegos/ruletaeuropea/probabilidades`);
                setProbabilidades(res.data.probabilidades);
            } catch (e) { console.error(e); }
        };
        cargarProbabilidades();
    }, []);

    useEffect(() => {
        const h = localStorage.getItem("historial_ruletaeuropea");
        if (h) setHistorial(JSON.parse(h));
        const s = localStorage.getItem("estadisticas_acumulativas_ruletaeuropea");
        if (s) {
            const ps = JSON.parse(s);
            setEstadisticasAcumulativas(ps);
            setEstadisticas(prev => ({
                ...prev,
                totalJuegos: ps.totalJuegosAcum,
                gananciaTotal: ps.gananciaTotalAcum,
                gastoTotal: ps.gastoTotalAcum,
                balance: ps.gananciaTotalAcum - ps.gastoTotalAcum
            }));
        }
        const nf = localStorage.getItem("numeros_frecuentes_ruletaeuropea");
        if (nf) setEstadisticas(prev => ({ ...prev, numerosMasFrecuentes: JSON.parse(nf) }));
    }, []);

    useEffect(() => {
        if (historial.length > 0) localStorage.setItem("historial_ruletaeuropea", JSON.stringify(historial.slice(0, 20)));
    }, [historial]);

    useEffect(() => {
        if (estadisticasAcumulativas.totalJuegosAcum > 0)
            localStorage.setItem("estadisticas_acumulativas_ruletaeuropea", JSON.stringify(estadisticasAcumulativas));
    }, [estadisticasAcumulativas]);

    useEffect(() => {
        if (estadisticas.numerosMasFrecuentes.length > 0)
            localStorage.setItem("numeros_frecuentes_ruletaeuropea", JSON.stringify(estadisticas.numerosMasFrecuentes));
    }, [estadisticas.numerosMasFrecuentes]);

    // Animación de la rueda
    useEffect(() => {
        if (girando) {
            let speed = 8;
            const spin = () => {
                setWheelAngle(a => (a + speed) % 360);
                speed = Math.min(speed + 0.3, 18);
                animFrameRef.current = requestAnimationFrame(spin);
            };
            animFrameRef.current = requestAnimationFrame(spin);
        } else {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        }
        return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
    }, [girando]);

    const actualizarEstadisticas = (nuevoJuego: HistorialJuego) => {
        setEstadisticasAcumulativas(prev => ({
            totalJuegosAcum: prev.totalJuegosAcum + 1,
            gananciaTotalAcum: prev.gananciaTotalAcum + nuevoJuego.ganancia_total,
            gastoTotalAcum: prev.gastoTotalAcum + nuevoJuego.total_apostado
        }));
        setEstadisticas(prev => {
            const numerosActualizados = [...prev.numerosMasFrecuentes];
            const idx = numerosActualizados.findIndex(n => n.numero === nuevoJuego.numero_ganador);
            if (idx !== -1) numerosActualizados[idx].frecuencia += 1;
            else numerosActualizados.push({ numero: nuevoJuego.numero_ganador, frecuencia: 1 });
            numerosActualizados.sort((a, b) => b.frecuencia - a.frecuencia);
            return {
                totalJuegos: prev.totalJuegos + 1,
                gananciaTotal: prev.gananciaTotal + nuevoJuego.ganancia_total,
                gastoTotal: prev.gastoTotal + nuevoJuego.total_apostado,
                balance: prev.balance + nuevoJuego.ganancia_total - nuevoJuego.total_apostado,
                numerosMasFrecuentes: numerosActualizados.slice(0, 10)
            };
        });
    };

    const agregarAlHistorial = (numero_ganador: number, color_ganador: string, ganancia_total: number, total_apostado: number) => {
        const nuevoJuego: HistorialJuego = {
            id: Date.now(), numero_ganador, color_ganador, ganancia_total,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            total_apostado
        };
        const nuevoHistorial = [nuevoJuego, ...historial.slice(0, 19)];
        setHistorial(nuevoHistorial);
        actualizarEstadisticas(nuevoJuego);
    };

    const animarConfetti = () => {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#FFD700', '#FFA500', '#FF4500', '#00FF00'] });
        setTimeout(() => {
            confetti({ particleCount: 150, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#FFD700', '#FF0000'] });
            confetti({ particleCount: 150, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#FFD700', '#FF0000'] });
        }, 250);
    };

    const agregarApuesta = () => {
        if (!valorApuesta) { setMensaje("Selecciona un valor para apostar."); return; }
        if (montoApuesta < APUESTA_MINIMA) { setMensaje(`Mínimo $${APUESTA_MINIMA}.`); return; }
        if (usuario && montoApuesta > usuario.saldo) { setMensaje("Saldo insuficiente."); return; }
        setApuestas(prev => [...prev, { tipo: tipoApuestaSeleccionado, valor: valorApuesta, monto: montoApuesta }]);
        setValorApuesta(null);
        setMontoApuesta(APUESTA_MINIMA);
        setMensaje(null);
    };

    const eliminarApuesta = (index: number) => setApuestas(prev => prev.filter((_, i) => i !== index));
    const limpiarApuestas = () => { setApuestas([]); setMensaje(null); };
    const calcularTotalApostado = () => apuestas.reduce((t, a) => t + a.monto, 0);

    const realizarJugada = async () => {
        if (!usuario) { setMensaje("Inicia sesión para jugar."); return; }
        if (apuestas.length === 0) { setMensaje("Agrega al menos una apuesta."); return; }
        if (calcularTotalApostado() > usuario.saldo) { setMensaje("Saldo insuficiente."); return; }
        setGirando(true); setMensaje(null); setResultado(null);
        try {
            const token = localStorage.getItem("token");
            const apuestasArray = apuestas.map(a => ({ tipo: a.tipo, valor: a.valor, monto: a.monto }));
            const res = await axios.post(
                `${API_URL}/juegos/ruletaeuropea?apuestas=${JSON.stringify(apuestasArray)}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = res.data;
            await new Promise(r => setTimeout(r, 2500));
            setUsuario(prev => prev ? { ...prev, saldo: data.nuevo_saldo } : null);
            setResultado(data);
            if (data.ganancia_total > 0) animarConfetti();
            agregarAlHistorial(data.numero_ganador, data.color_ganador, data.ganancia_total, data.total_apostado);
            setMensaje(data.mensaje);
            setApuestas([]);
        } catch (err: any) {
            setMensaje(err.response?.data?.detail || "Error al procesar las apuestas");
        } finally {
            setGirando(false);
        }
    };

    const limpiarHistorial = () => {
        setHistorial([]); localStorage.removeItem("historial_ruletaeuropea");
        showMsg("Historial limpiado", "info");
    };
    const limpiarTodasEstadisticas = () => {
        setHistorial([]);
        setEstadisticas({ totalJuegos: 0, gananciaTotal: 0, gastoTotal: 0, balance: 0, numerosMasFrecuentes: [] });
        setEstadisticasAcumulativas({ totalJuegosAcum: 0, gananciaTotalAcum: 0, gastoTotalAcum: 0 });
        localStorage.removeItem("historial_ruletaeuropea");
        localStorage.removeItem("estadisticas_acumulativas_ruletaeuropea");
        localStorage.removeItem("numeros_frecuentes_ruletaeuropea");
        showMsg("Estadísticas reiniciadas", "info");
    };
    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type }); setTimeout(() => setNotificacion(null), 5000);
    };
    const cerrarSesion = () => setUsuario(null);

    const renderRuedaRuleta = () => {
        const radius = 195;
        const innerRadius = 40;
        const cx = 220, cy = 220;
        const sectorAngle = (2 * Math.PI) / NUMEROS_RULETA.length;
        return (
            <svg width={440} height={440} viewBox="0 0 440 440" className="block mx-auto drop-shadow-2xl">
                <defs>
                    <radialGradient id="wheelCenter" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#2D1B00" />
                        <stop offset="100%" stopColor="#0A0A0A" />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="goldGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFD700" />
                        <stop offset="50%" stopColor="#FFA500" />
                        <stop offset="100%" stopColor="#FFD700" />
                    </linearGradient>
                </defs>

                {/* Anillo exterior dorado decorativo */}
                <circle cx={cx} cy={cy} r={218} fill="url(#goldRing)" />
                <circle cx={cx} cy={cy} r={212} fill="#1A0A00" />
                <circle cx={cx} cy={cy} r={206} fill="url(#goldRing)" opacity="0.6" />
                <circle cx={cx} cy={cy} r={200} fill="#0A0A0A" />

                <g ref={wheelRef} transform={`translate(${cx}, ${cy}) rotate(${wheelAngle})`}>
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
                        const tx = Math.cos(textAngle) * (radius * 0.72);
                        const ty = Math.sin(textAngle) * (radius * 0.72);
                        const rotateDeg = (textAngle * 180) / Math.PI;
                        const color = COLORES[numero];
                        const fillColor = color === "rojo" ? "#C41E3A" : color === "negro" ? "#1A1A1A" : "#006400";
                        const borderColor = color === "rojo" ? "#FF4444" : color === "negro" ? "#444" : "#00AA00";
                        return (
                            <g key={i}>
                                <path d={path} fill={fillColor} stroke="#DAA520" strokeWidth={1.5} />
                                <path d={`M ${Math.cos(startAngle) * (radius - 20)} ${Math.sin(startAngle) * (radius - 20)} L ${x1} ${y1}`} stroke="#DAA520" strokeWidth={0.8} opacity="0.5" />
                                <text
                                    x={tx} y={ty}
                                    transform={`rotate(${rotateDeg + 90} ${tx} ${ty})`}
                                    fill="#FFFFFF"
                                    fontSize={11}
                                    fontWeight="900"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    style={{ textShadow: `0 0 4px ${borderColor}` }}
                                >
                                    {numero}
                                </text>
                            </g>
                        );
                    })}

                    {/* Anillo decorativo interior */}
                    <circle r={innerRadius + 25} fill="none" stroke="#DAA520" strokeWidth={2} opacity="0.6" />
                    <circle r={innerRadius + 15} fill="none" stroke="#DAA520" strokeWidth={1} opacity="0.3" />

                    {/* Centro */}
                    <circle r={innerRadius} fill="url(#wheelCenter)" stroke="#DAA520" strokeWidth={3} />
                    <circle r={innerRadius - 5} fill="none" stroke="#DAA520" strokeWidth={1} opacity="0.5" />
                    <text fill="#DAA520" fontSize={13} fontWeight="900" textAnchor="middle" dominantBaseline="middle" filter="url(#goldGlow)">★</text>
                </g>

                {/* Bolita indicadora */}
                <g transform={`translate(${cx}, ${cy})`}>
                    <circle cx={0} cy={-(radius - 10)} r={6} fill="white" stroke="#DAA520" strokeWidth={2} filter="url(#glow)" />
                </g>

                {/* Triángulo puntero */}
                <polygon
                    points={`${cx},${cy - radius - 14} ${cx - 10},${cy - radius + 4} ${cx + 10},${cy - radius + 4}`}
                    fill="#DAA520"
                    filter="url(#goldGlow)"
                />
            </svg>
        );
    };

    const renderSelectorApuesta = () => {
        const btnBase = "transition-all duration-200 font-bold rounded-lg border-2 focus:outline-none";
        switch (tipoApuestaSeleccionado) {
            case "numero_pleno":
                return (
                    <div className="grid grid-cols-7 md:grid-cols-13 gap-1.5">
                        {[0, ...Array.from({ length: 36 }, (_, i) => i + 1)].map(numero => {
                            const col = COLORES[numero];
                            const isSelected = valorApuesta === numero;
                            return (
                                <button
                                    key={numero}
                                    onClick={() => setValorApuesta(numero)}
                                    className={`${btnBase} py-2 text-sm ${isSelected
                                        ? col === "rojo" ? "bg-red-500 border-yellow-400 text-white scale-110 shadow-lg shadow-red-500/50"
                                            : col === "negro" ? "bg-gray-300 border-yellow-400 text-black scale-110"
                                                : "bg-green-500 border-yellow-400 text-white scale-110 shadow-lg shadow-green-500/50"
                                        : col === "rojo" ? "bg-red-900/70 border-red-700 text-red-200 hover:bg-red-700 hover:border-red-400"
                                            : col === "negro" ? "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-600"
                                                : "bg-green-900/70 border-green-700 text-green-200 hover:bg-green-700"
                                        }`}
                                >
                                    {numero}
                                </button>
                            );
                        })}
                    </div>
                );
            case "rojo_negro":
                return (
                    <div className="flex gap-4">
                        {[
                            { val: "rojo", label: "🔴 ROJO", bg: "from-red-700 to-red-900", border: "border-red-500", glow: "shadow-red-500/50" },
                            { val: "negro", label: "⚫ NEGRO", bg: "from-gray-700 to-gray-900", border: "border-gray-500", glow: "shadow-gray-500/50" }
                        ].map(({ val, label, bg, border, glow }) => (
                            <button
                                key={val}
                                onClick={() => setValorApuesta(val)}
                                className={`flex-1 py-5 rounded-xl font-bold text-xl border-2 transition-all duration-200 bg-gradient-to-br ${bg} ${border} text-white
                                    ${valorApuesta === val ? `scale-105 shadow-xl ${glow}` : "opacity-70 hover:opacity-100"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                );
            case "par_impar":
                return (
                    <div className="flex gap-4">
                        {[
                            { val: "par", label: "♻️ PAR", bg: "from-blue-700 to-blue-900", border: "border-blue-500", glow: "shadow-blue-500/50" },
                            { val: "impar", label: "⚡ IMPAR", bg: "from-yellow-700 to-yellow-900", border: "border-yellow-500", glow: "shadow-yellow-500/50" }
                        ].map(({ val, label, bg, border, glow }) => (
                            <button
                                key={val}
                                onClick={() => setValorApuesta(val)}
                                className={`flex-1 py-5 rounded-xl font-bold text-xl border-2 transition-all duration-200 bg-gradient-to-br ${bg} ${border} text-white
                                    ${valorApuesta === val ? `scale-105 shadow-xl ${glow}` : "opacity-70 hover:opacity-100"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                );
            case "bajo_alto":
                return (
                    <div className="flex gap-4">
                        {[
                            { val: "bajo", label: "⬇️ 1-18 BAJO", bg: "from-teal-700 to-teal-900", border: "border-teal-500", glow: "shadow-teal-500/50" },
                            { val: "alto", label: "⬆️ 19-36 ALTO", bg: "from-purple-700 to-purple-900", border: "border-purple-500", glow: "shadow-purple-500/50" }
                        ].map(({ val, label, bg, border, glow }) => (
                            <button
                                key={val}
                                onClick={() => setValorApuesta(val)}
                                className={`flex-1 py-5 rounded-xl font-bold text-xl border-2 transition-all duration-200 bg-gradient-to-br ${bg} ${border} text-white
                                    ${valorApuesta === val ? `scale-105 shadow-xl ${glow}` : "opacity-70 hover:opacity-100"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                );
            case "docena":
                return (
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { val: 1, label: "1ª Docena\n1-12" },
                            { val: 2, label: "2ª Docena\n13-24" },
                            { val: 3, label: "3ª Docena\n25-36" }
                        ].map(({ val, label }) => (
                            <button
                                key={val}
                                onClick={() => setValorApuesta(val)}
                                className={`py-5 rounded-xl font-bold text-center border-2 transition-all duration-200 bg-gradient-to-br
                                    ${valorApuesta === val
                                        ? "from-indigo-500 to-indigo-700 border-yellow-400 text-white scale-105 shadow-xl shadow-indigo-500/50"
                                        : "from-indigo-900/70 to-indigo-900/50 border-indigo-600 text-indigo-200 hover:border-indigo-400"
                                    }`}
                            >
                                {label.split('\n').map((l, i) => <div key={i} className={i === 0 ? "text-base" : "text-xs opacity-80"}>{l}</div>)}
                            </button>
                        ))}
                    </div>
                );
            case "columna":
                return (
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { val: 1, label: "Columna 1\n1,4,7..." },
                            { val: 2, label: "Columna 2\n2,5,8..." },
                            { val: 3, label: "Columna 3\n3,6,9..." }
                        ].map(({ val, label }) => (
                            <button
                                key={val}
                                onClick={() => setValorApuesta(val)}
                                className={`py-5 rounded-xl font-bold text-center border-2 transition-all duration-200 bg-gradient-to-br
                                    ${valorApuesta === val
                                        ? "from-teal-500 to-teal-700 border-yellow-400 text-white scale-105 shadow-xl shadow-teal-500/50"
                                        : "from-teal-900/70 to-teal-900/50 border-teal-600 text-teal-200 hover:border-teal-400"
                                    }`}
                            >
                                {label.split('\n').map((l, i) => <div key={i} className={i === 0 ? "text-base" : "text-xs opacity-80"}>{l}</div>)}
                            </button>
                        ))}
                    </div>
                );
            default:
                return <div className="text-center text-gray-400 py-6">Selecciona un tipo de apuesta</div>;
        }
    };

    const getColorNumero = (numero: number) => {
        const c = COLORES[numero];
        if (c === "rojo") return "bg-red-600";
        if (c === "negro") return "bg-gray-900 border border-gray-600";
        return "bg-green-600";
    };

    if (!usuario) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at center, #1a0a00 0%, #0a0500 100%)" }}>
                <div className="text-center">
                    <div className="w-20 h-20 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ boxShadow: "0 0 30px #DAA520" }} />
                    <p className="text-yellow-400 text-xl font-bold tracking-widest">CARGANDO RULETA...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at top, #1a0a00 0%, #070707 50%, #0a0500 100%)" }}>
            <style>{`
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes pulseGold {
                    0%, 100% { box-shadow: 0 0 15px #DAA520, 0 0 30px #DAA52040; }
                    50% { box-shadow: 0 0 25px #DAA520, 0 0 60px #DAA52060, 0 0 80px #DAA52020; }
                }
                @keyframes floatUp {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes resultReveal {
                    0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
                    60% { transform: scale(1.1) rotate(2deg); }
                    100% { opacity: 1; transform: scale(1) rotate(0); }
                }
                .gold-text {
                    background: linear-gradient(90deg, #DAA520, #FFD700, #FFA500, #FFD700, #DAA520);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: shimmer 3s linear infinite;
                }
                .casino-border {
                    border: 2px solid transparent;
                    background: linear-gradient(#0d0d0d, #0d0d0d) padding-box,
                                linear-gradient(135deg, #DAA520, #8B6914, #DAA520) border-box;
                }
                .casino-card {
                    background: linear-gradient(135deg, rgba(30,15,0,0.9), rgba(10,5,0,0.95));
                    border: 1px solid rgba(218,165,32,0.3);
                    backdrop-filter: blur(10px);
                }
                .pulse-gold { animation: pulseGold 2s ease-in-out infinite; }
                .float-up { animation: floatUp 0.5s ease-out forwards; }
                .result-reveal { animation: resultReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                .table-felt {
                    background: radial-gradient(ellipse at center, #0d5c2e 0%, #074020 60%, #052e18 100%);
                    border: 3px solid #DAA520;
                    box-shadow: inset 0 0 60px rgba(0,0,0,0.5), 0 0 30px rgba(218,165,32,0.2);
                }
                .chip-button {
                    transition: all 0.15s ease;
                    transform-origin: center;
                }
                .chip-button:hover { transform: translateY(-4px) scale(1.05); }
                .chip-button:active { transform: translateY(0) scale(0.95); }
                .neon-red { text-shadow: 0 0 10px #ff0000, 0 0 20px #ff000080; }
                .neon-green { text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff0080; }
                .scrollbar-casino::-webkit-scrollbar { width: 4px; }
                .scrollbar-casino::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 2px; }
                .scrollbar-casino::-webkit-scrollbar-thumb { background: #DAA520; border-radius: 2px; }
            `}</style>

            {/* Notificación */}
            {notificacion && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center gap-3 shadow-2xl float-up
                    ${notificacion.type === "success" ? "bg-gradient-to-r from-green-900 to-green-800 border border-green-400/50 text-green-200"
                        : notificacion.type === "error" ? "bg-gradient-to-r from-red-900 to-red-800 border border-red-400/50 text-red-200"
                            : "bg-gradient-to-r from-yellow-900 to-yellow-800 border border-yellow-400/50 text-yellow-200"}`}
                    style={{ boxShadow: notificacion.type === "success" ? "0 0 30px rgba(34,197,94,0.3)" : notificacion.type === "error" ? "0 0 30px rgba(239,68,68,0.3)" : "0 0 30px rgba(234,179,8,0.3)" }}>
                    <span className="text-2xl">{notificacion.type === "success" ? "✅" : notificacion.type === "error" ? "❌" : "ℹ️"}</span>
                    <span>{notificacion.text}</span>
                </div>
            )}

            <Header usuario={usuario} cerrarSesion={cerrarSesion} setUsuario={setUsuario} />

            {/* Hero Banner */}
            <div className="relative overflow-hidden py-8 px-4" style={{ borderBottom: "1px solid rgba(218,165,32,0.3)" }}>
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(218,165,32,0.08) 0%, transparent 70%)" }} />
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-4xl">🎡</span>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight gold-text">RULETA EUROPEA</h1>
                        </div>
                        <p className="text-gray-400 text-lg">Un solo cero · Ventaja de la casa: <span className="text-yellow-500 font-bold">2.70%</span> · Hasta <span className="text-green-400 font-bold">35x</span> tu apuesta</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="casino-card rounded-2xl px-6 py-4 text-center" style={{ boxShadow: "0 0 20px rgba(218,165,32,0.2)" }}>
                            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Saldo Disponible</div>
                            <div className="text-3xl font-black gold-text">${usuario?.saldo?.toLocaleString() ?? 0}</div>
                        </div>
                        <div className="casino-card rounded-2xl px-6 py-4 text-center">
                            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Juegos</div>
                            <div className="text-3xl font-black text-blue-400">{estadisticas.totalJuegos}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* === COLUMNA IZQUIERDA: RUEDA + TABLERO === */}
                    <div className="xl:col-span-2 space-y-8">

                        {/* Rueda de la Ruleta */}
                        <div className="casino-card rounded-3xl p-6" style={{ boxShadow: "0 0 40px rgba(218,165,32,0.15)" }}>
                            <div className="relative">
                                {/* Efecto de luz ambiental */}
                                <div className="absolute inset-0 rounded-full" style={{
                                    background: girando
                                        ? "radial-gradient(circle, rgba(218,165,32,0.15) 0%, transparent 70%)"
                                        : "radial-gradient(circle, rgba(218,165,32,0.08) 0%, transparent 70%)",
                                    transition: "all 0.5s"
                                }} />
                                <div className={`relative z-10 ${girando ? "pulse-gold" : ""}`} style={{ borderRadius: "50%", maxWidth: 440, margin: "0 auto" }}>
                                    {renderRuedaRuleta()}
                                </div>

                                {/* Estado de giro */}
                                {girando && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-bold text-sm tracking-widest float-up"
                                        style={{ background: "rgba(218,165,32,0.2)", border: "1px solid rgba(218,165,32,0.5)", color: "#DAA520" }}>
                                        ● GIRANDO...
                                    </div>
                                )}
                            </div>

                            {/* Historial rápido de últimos números */}
                            {historial.length > 0 && (
                                <div className="mt-6">
                                    <div className="text-xs text-gray-500 text-center mb-3 uppercase tracking-widest">Últimas tiradas</div>
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                        {historial.slice(0, 12).map((j, i) => (
                                            <div key={j.id}
                                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white border-2
                                                    ${getColorNumero(j.numero_ganador)} 
                                                    ${i === 0 ? "border-yellow-400 scale-125" : "border-transparent opacity-70"}`}
                                                style={i === 0 ? { boxShadow: "0 0 12px rgba(218,165,32,0.6)" } : {}}>
                                                {j.numero_ganador}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tablero de Apuestas */}
                        <div className="casino-card rounded-3xl p-6" style={{ boxShadow: "0 0 30px rgba(218,165,32,0.1)" }}>
                            <h2 className="text-xl font-black gold-text mb-5 uppercase tracking-widest">🎰 Mesa de Apuestas</h2>

                            {/* Tipo de apuesta */}
                            <div className="mb-6">
                                <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Tipo de Apuesta</div>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                    {TIPOS_APUESTA.map(tipo => (
                                        <button
                                            key={tipo.id}
                                            onClick={() => { setTipoApuestaSeleccionado(tipo.id); setValorApuesta(null); }}
                                            className="py-3 px-2 rounded-xl font-bold text-center text-xs transition-all duration-200 border-2"
                                            style={tipoApuestaSeleccionado === tipo.id
                                                ? { background: tipo.color, borderColor: "#DAA520", color: "white", transform: "scale(1.05)", boxShadow: `0 0 20px ${tipo.color}80` }
                                                : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(218,165,32,0.2)", color: "#9CA3AF" }}
                                        >
                                            <div className="text-lg mb-1">{tipo.icon}</div>
                                            <div>{tipo.nombre}</div>
                                            <div className="text-yellow-400/80 text-xs mt-0.5">×{tipo.multiplicador}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Selector de valor */}
                            <div className="mb-6">
                                <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                                    Selección: <span className="text-yellow-400">{tipoApuestaSeleccionado.replace(/_/g, ' ').toUpperCase()}</span>
                                    {valorApuesta !== null && <span className="ml-2 text-green-400">✓ {JSON.stringify(valorApuesta)}</span>}
                                </div>
                                <div className="p-4 rounded-2xl" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(218,165,32,0.15)" }}>
                                    {renderSelectorApuesta()}
                                </div>
                            </div>

                            {/* Fichas de apuesta */}
                            <div className="mb-6">
                                <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                                    Monto de Ficha: <span className="text-yellow-400 font-bold text-base">${montoApuesta}</span>
                                </div>
                                <div className="flex flex-wrap gap-3 justify-center">
                                    {FICHAS.map(ficha => {
                                        const disabled = ficha.valor > (usuario?.saldo || 0);
                                        return (
                                            <button
                                                key={ficha.valor}
                                                onClick={() => !disabled && setMontoApuesta(ficha.valor)}
                                                disabled={disabled}
                                                className="chip-button relative w-14 h-14 rounded-full flex items-center justify-center font-black text-sm text-white"
                                                style={{
                                                    background: disabled ? "#374151" : ficha.color,
                                                    border: `3px solid ${disabled ? "#4B5563" : ficha.borde}`,
                                                    boxShadow: montoApuesta === ficha.valor && !disabled
                                                        ? `0 0 20px ${ficha.color}, 0 4px 15px rgba(0,0,0,0.5)`
                                                        : disabled ? "none" : `0 4px 10px rgba(0,0,0,0.4)`,
                                                    opacity: disabled ? 0.4 : 1,
                                                    outline: montoApuesta === ficha.valor ? `3px solid #DAA520` : "none",
                                                    outlineOffset: "2px"
                                                }}
                                            >
                                                <span className="drop-shadow">{ficha.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Botón agregar apuesta */}
                            <button
                                onClick={agregarApuesta}
                                disabled={!valorApuesta || montoApuesta < APUESTA_MINIMA || montoApuesta > usuario.saldo}
                                className="w-full py-4 rounded-xl font-black text-lg tracking-widest uppercase transition-all duration-200 mb-4"
                                style={!valorApuesta || montoApuesta < APUESTA_MINIMA || montoApuesta > usuario.saldo
                                    ? { background: "rgba(55,65,81,0.5)", color: "#6B7280", cursor: "not-allowed", border: "2px solid rgba(75,85,99,0.3)" }
                                    : { background: "linear-gradient(135deg, #DAA520, #FFA500)", color: "#0a0500", border: "2px solid #FFD700", boxShadow: "0 0 25px rgba(218,165,32,0.4)", cursor: "pointer" }
                                }
                            >
                                ➕ Agregar Apuesta ${montoApuesta}
                            </button>

                            {/* Mensaje */}
                            {mensaje && (
                                <div className={`p-4 rounded-xl text-center font-bold mb-4 float-up ${
                                    mensaje.includes("Ganaste") || mensaje.includes("ganaste")
                                        ? "bg-green-900/40 border border-green-500/50 text-green-300"
                                        : mensaje.includes("Error") || mensaje.includes("insuficiente") || mensaje.includes("Debes") || mensaje.includes("Selecciona")
                                            ? "bg-red-900/40 border border-red-500/50 text-red-300"
                                            : "bg-yellow-900/40 border border-yellow-500/50 text-yellow-300"
                                }`}>
                                    {mensaje}
                                </div>
                            )}

                            {/* Apuestas activas */}
                            {apuestas.length > 0 && (
                                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(218,165,32,0.3)" }}>
                                    <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(218,165,32,0.1)", borderBottom: "1px solid rgba(218,165,32,0.2)" }}>
                                        <span className="text-yellow-400 font-bold text-sm uppercase tracking-widest">📋 Mis Apuestas ({apuestas.length})</span>
                                        <button onClick={limpiarApuestas} className="text-red-400 text-xs hover:text-red-300 font-bold uppercase">Limpiar</button>
                                    </div>
                                    <div className="divide-y divide-gray-800/50">
                                        {apuestas.map((apuesta, i) => (
                                            <div key={i} className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(0,0,0,0.3)" }}>
                                                <div>
                                                    <div className="text-white font-bold text-sm">{apuesta.tipo.replace(/_/g, ' ').toUpperCase()}</div>
                                                    <div className="text-gray-500 text-xs">{JSON.stringify(apuesta.valor)}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className="text-yellow-400 font-black">${apuesta.monto}</div>
                                                        <div className="text-gray-500 text-xs">→ ${apuesta.monto * (TIPOS_APUESTA.find(t => t.id === apuesta.tipo)?.multiplicador || 1)}</div>
                                                    </div>
                                                    <button onClick={() => eliminarApuesta(i)}
                                                        className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-900/40 transition-colors text-sm font-bold">✕</button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center px-4 py-3" style={{ background: "rgba(218,165,32,0.08)" }}>
                                            <span className="text-gray-300 font-bold uppercase text-sm">Total</span>
                                            <span className="text-2xl font-black gold-text">${calcularTotalApostado()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Botón GIRAR */}
                            <button
                                onClick={realizarJugada}
                                disabled={girando || apuestas.length === 0 || calcularTotalApostado() > usuario.saldo}
                                className="w-full mt-4 py-5 rounded-2xl font-black text-2xl tracking-widest uppercase transition-all duration-300"
                                style={girando || apuestas.length === 0 || calcularTotalApostado() > usuario.saldo
                                    ? { background: "rgba(55,65,81,0.5)", color: "#6B7280", cursor: "not-allowed", border: "2px solid rgba(75,85,99,0.3)" }
                                    : { background: "linear-gradient(135deg, #7c0a02, #C41E3A, #7c0a02)", color: "white", border: "3px solid #DAA520", boxShadow: "0 0 40px rgba(196,30,58,0.5), 0 0 80px rgba(218,165,32,0.2)", cursor: "pointer" }
                                }
                            >
                                {girando ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <span className="inline-block w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
                                        GIRANDO...
                                    </span>
                                ) : (
                                    `🎡 GIRAR RULETA · $${calcularTotalApostado() || 0}`
                                )}
                            </button>
                        </div>

                        {/* Resultado */}
                        {resultado && (
                            <div className="casino-card rounded-3xl p-8 result-reveal" style={{
                                border: resultado.ganancia_total > 0 ? "2px solid rgba(34,197,94,0.5)" : "2px solid rgba(239,68,68,0.3)",
                                boxShadow: resultado.ganancia_total > 0 ? "0 0 60px rgba(34,197,94,0.2)" : "0 0 30px rgba(239,68,68,0.1)"
                            }}>
                                <div className="text-center mb-8">
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Resultado de la Tirada</div>
                                    <div className="flex items-center justify-center gap-6">
                                        <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center font-black border-4 ${getColorNumero(resultado.numero_ganador)}`}
                                            style={{ borderColor: "#DAA520", boxShadow: "0 0 40px rgba(218,165,32,0.5)" }}>
                                            <span className="text-5xl text-white">{resultado.numero_ganador}</span>
                                            <span className="text-xs text-gray-300 uppercase">{resultado.color_ganador}</span>
                                        </div>
                                        <div className="text-left space-y-1.5">
                                            {[
                                                { label: "Par", val: resultado.es_par },
                                                { label: "Impar", val: resultado.es_impar },
                                                { label: "Bajo (1-18)", val: resultado.es_bajo },
                                                { label: "Alto (19-36)", val: resultado.es_alto },
                                            ].map(({ label, val }) => (
                                                <div key={label} className="flex items-center gap-2 text-sm">
                                                    <span className={val ? "text-green-400" : "text-gray-600"}>{val ? "✓" : "✗"}</span>
                                                    <span className={val ? "text-gray-200" : "text-gray-600"}>{label}</span>
                                                </div>
                                            ))}
                                            <div className="text-sm text-gray-400">Docena {resultado.docena} · Col. {resultado.columna}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(218,165,32,0.2)" }}>
                                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Apostado</div>
                                        <div className="text-3xl font-black text-yellow-400">${resultado.total_apostado}</div>
                                    </div>
                                    <div className="rounded-2xl p-4 text-center" style={{
                                        background: resultado.ganancia_total > 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                        border: `1px solid ${resultado.ganancia_total > 0 ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`
                                    }}>
                                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                                            {resultado.ganancia_total > 0 ? "🎉 Ganancia" : "Pérdida"}
                                        </div>
                                        <div className={`text-3xl font-black ${resultado.ganancia_total > 0 ? "text-green-400 neon-green" : "text-red-400 neon-red"}`}>
                                            {resultado.ganancia_total > 0 ? `+$${resultado.ganancia_total}` : `-$${resultado.total_apostado}`}
                                        </div>
                                    </div>
                                </div>

                                {resultado.apuestas_ganadoras?.length > 0 && (
                                    <div>
                                        <div className="text-sm text-green-400 font-bold uppercase tracking-widest mb-3">🏆 Apuestas Ganadoras</div>
                                        <div className="space-y-2">
                                            {resultado.apuestas_ganadoras.map((a: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center px-4 py-3 rounded-xl"
                                                    style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                                                    <div>
                                                        <div className="text-white font-bold text-sm">{a.tipo.replace(/_/g, ' ').toUpperCase()}</div>
                                                        <div className="text-gray-500 text-xs">{JSON.stringify(a.valor)} · ${a.monto}</div>
                                                    </div>
                                                    <div className="text-green-400 font-black text-xl">+${a.ganancia}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* === COLUMNA DERECHA: PANEL LATERAL === */}
                    <div className="space-y-6">

                        {/* Tabs */}
                        <div className="casino-card rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 20px rgba(218,165,32,0.1)" }}>
                            <div className="flex" style={{ borderBottom: "1px solid rgba(218,165,32,0.2)" }}>
                                {([
                                    { id: "historial", label: "📜 Historial" },
                                    { id: "estadisticas", label: "📊 Stats" },
                                    { id: "probabilidades", label: "📈 Odds" }
                                ] as const).map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className="flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200"
                                        style={activeTab === tab.id
                                            ? { background: "rgba(218,165,32,0.15)", color: "#DAA520", borderBottom: "2px solid #DAA520" }
                                            : { color: "#6B7280" }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-4">
                                {/* HISTORIAL */}
                                {activeTab === "historial" && (
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-xs text-gray-500 uppercase tracking-widest">Últimas {historial.length} tiradas</span>
                                            {historial.length > 0 && (
                                                <button onClick={limpiarHistorial} className="text-red-400 text-xs hover:text-red-300">Limpiar</button>
                                            )}
                                        </div>
                                        {historial.length === 0 ? (
                                            <div className="text-center py-10">
                                                <div className="text-5xl mb-3 opacity-30">🎡</div>
                                                <p className="text-gray-600 text-sm">Aún no hay tiradas</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-casino pr-1">
                                                {historial.map((j, i) => (
                                                    <div key={j.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                                                        style={{
                                                            background: j.ganancia_total > 0 ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)",
                                                            border: `1px solid ${j.ganancia_total > 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)"}`,
                                                            opacity: i === 0 ? 1 : 0.8
                                                        }}>
                                                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white text-sm ${getColorNumero(j.numero_ganador)}`}
                                                            style={i === 0 ? { border: "2px solid #DAA520", boxShadow: "0 0 10px rgba(218,165,32,0.4)" } : {}}>
                                                            {j.numero_ganador}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-white text-sm font-bold capitalize">{j.color_ganador}</div>
                                                            <div className="text-gray-500 text-xs">{j.fecha} · ${j.total_apostado}</div>
                                                        </div>
                                                        <div className={`text-right font-black ${j.ganancia_total > 0 ? "text-green-400" : "text-red-400"}`}>
                                                            {j.ganancia_total > 0 ? `+$${j.ganancia_total}` : `-$${j.total_apostado}`}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ESTADÍSTICAS */}
                                {activeTab === "estadisticas" && (
                                    <div>
                                        <div className="flex justify-end mb-4">
                                            <button onClick={limpiarTodasEstadisticas} className="text-red-400 text-xs hover:text-red-300 font-bold uppercase">Reiniciar</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            {[
                                                { label: "Partidas", val: estadisticas.totalJuegos, color: "#60A5FA" },
                                                { label: "Ganancias", val: `$${estadisticas.gananciaTotal}`, color: "#34D399" },
                                                { label: "Gastado", val: `$${estadisticas.gastoTotal}`, color: "#F87171" },
                                                { label: "Balance", val: `$${estadisticas.balance}`, color: estadisticas.balance >= 0 ? "#34D399" : "#F87171" },
                                            ].map(({ label, val, color }) => (
                                                <div key={label} className="rounded-xl p-4 text-center" style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${color}30` }}>
                                                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</div>
                                                    <div className="text-xl font-black" style={{ color }}>{val}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">🎯 Números más frecuentes</div>
                                        {estadisticas.numerosMasFrecuentes.length > 0 ? (
                                            <div className="space-y-2">
                                                {estadisticas.numerosMasFrecuentes.slice(0, 8).map(({ numero, frecuencia }) => (
                                                    <div key={numero} className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-white text-xs font-black ${getColorNumero(numero)}`}>{numero}</div>
                                                        <div className="flex-1">
                                                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                                                                <div className="h-full rounded-full" style={{
                                                                    width: `${estadisticas.totalJuegos > 0 ? (frecuencia / estadisticas.totalJuegos) * 100 : 0}%`,
                                                                    background: "linear-gradient(90deg, #DAA520, #FFA500)"
                                                                }} />
                                                            </div>
                                                        </div>
                                                        <div className="text-gray-400 text-xs w-10 text-right">{frecuencia}×</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-gray-600 text-sm">Juega para ver estadísticas</div>
                                        )}
                                    </div>
                                )}

                                {/* PROBABILIDADES */}
                                {activeTab === "probabilidades" && (
                                    <div>
                                        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-casino pr-1">
                                            {Object.entries(probabilidades).map(([tipo, datos]) => (
                                                <div key={tipo} className="p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(218,165,32,0.15)" }}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="text-white font-bold text-xs uppercase">{tipo.replace(/_/g, ' ')}</div>
                                                        <div className="text-yellow-400 font-black text-sm">×{datos.multiplicador}</div>
                                                    </div>
                                                    <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "rgba(255,255,255,0.1)" }}>
                                                        <div className="h-full rounded-full" style={{
                                                            width: `${datos.probabilidad}%`,
                                                            background: "linear-gradient(90deg, #3B82F6, #60A5FA)"
                                                        }} />
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500 text-xs">{datos.descripcion}</span>
                                                        <span className="text-blue-400 text-xs font-bold">{datos.probabilidad}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 pt-3 text-center text-xs text-red-400/70" style={{ borderTop: "1px solid rgba(218,165,32,0.1)" }}>
                                            ⚠️ Ventaja de la casa: 2.70%
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info rápida */}
                        <div className="casino-card rounded-2xl p-5" style={{ border: "1px solid rgba(218,165,32,0.2)" }}>
                            <h4 className="text-sm font-black gold-text uppercase tracking-widest mb-4">💡 Cómo Jugar</h4>
                            <div className="space-y-3 text-xs text-gray-400">
                                {[
                                    { icon: "1️⃣", text: "Elige el tipo de apuesta y tu selección" },
                                    { icon: "2️⃣", text: "Selecciona una ficha (monto)" },
                                    { icon: "3️⃣", text: "Haz clic en \"Agregar Apuesta\"" },
                                    { icon: "4️⃣", text: "Añade más apuestas si quieres" },
                                    { icon: "5️⃣", text: "Pulsa GIRAR RULETA para jugar" },
                                ].map(({ icon, text }) => (
                                    <div key={icon} className="flex items-start gap-2">
                                        <span className="flex-shrink-0">{icon}</span>
                                        <span>{text}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-3 grid grid-cols-2 gap-2 text-xs" style={{ borderTop: "1px solid rgba(218,165,32,0.1)" }}>
                                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(218,165,32,0.08)" }}>
                                    <div className="text-yellow-400 font-black">35×</div>
                                    <div className="text-gray-500">Número Pleno</div>
                                </div>
                                <div className="text-center p-2 rounded-lg" style={{ background: "rgba(218,165,32,0.08)" }}>
                                    <div className="text-yellow-400 font-black">2×</div>
                                    <div className="text-gray-500">Color / Docena</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
