/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import Header from '../components/header'; // Añadir esta línea
import Footer from '../components/footer'; // Añadir esta línea
import { API_URL } from "../api/auth";

// Configurar interceptor de axios para manejar errores
axios.interceptors.response.use(
    response => {
        console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}: ${response.status}`);
        return response;
    },
    error => {
        console.error(`❌ Error ${error.response?.status || 'NO_RESPONSE'}:`, {
            url: error.config?.url,
            method: error.config?.method,
            data: error.response?.data
        });

        if (error.response && error.response.status === 401) {
            console.log("🔐 Interceptor: Token expirado o inválido");
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

            if (window.location.pathname.includes("/minas")) {
                setTimeout(() => window.location.href = "/login", 1000);
            }
        }

        if (!error.response) {
            console.error("🌐 Error de red - Verifica tu conexión a internet");
        }

        return Promise.reject(error);
    }
);

// Interceptor para request
axios.interceptors.request.use(
    config => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    nivel?: string;
    verificado_pendiente?: boolean;
}

interface Casilla {
    x: number;
    y: number;
    es_mine: boolean;
    abierta: boolean;
    marcada: boolean;
    minas_cercanas: number;
}

interface JuegoMinas {
    session_id: string;
    tamano: number;
    minas_totales: number;
    apuesta: number;
    dificultad: string;
    multiplicador_base: number;
    nuevo_saldo: number;
    mensaje?: string;
    success?: boolean;
}

interface HistorialPartida {
    id: number;
    resultado: string;
    ganancia: number;
    fecha: string;
    apuesta: number;
    casillas_abiertas: number;
    dificultad: string;
    multiplicador_final: number;
}

type EstadoJuego = 'seleccionando' | 'jugando' | 'game_over' | 'ganado';

export default function Minas() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [estado, setEstado] = useState<EstadoJuego>('seleccionando');
    const [cargando, setCargando] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [ganancia, setGanancia] = useState<number>(0);
    const [mensaje, setMensaje] = useState<string>("");

    // Configuración del juego
    const [tablero, setTablero] = useState<Casilla[][]>([]);
    const [casillasAbiertas, setCasillasAbiertas] = useState<Array<{ x: number, y: number, minas_cercanas: number }>>([]);
    const [casillasMarcadas, setCasillasMarcadas] = useState<[number, number][]>([]);
    const [minasRestantes, setMinasRestantes] = useState<number>(5);
    const [tamanoTablero, setTamanoTablero] = useState<number>(5);
    const [minasTotales, setMinasTotales] = useState<number>(5);

    // Estados para apuestas y dificultad
    const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(500);
    const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([100, 500, 1000, 2000, 5000, 10000]);
    const [dificultadSeleccionada, setDificultadSeleccionada] = useState<string>("facil");

    // Estadísticas
    const [multiplicadorActual, setMultiplicadorActual] = useState<number>(1.0);
    const [gananciaPotencial, setGananciaPotencial] = useState<number>(0);

    // Estados para estadísticas e historial
    const [historial, setHistorial] = useState<HistorialPartida[]>([]);
    const [estadisticas, setEstadisticas] = useState({
        totalPartidas: 0,
        gananciaTotal: 0,
        gastoTotal: 0,
        balance: 0,
        partidasGanadas: 0,
        partidasPerdidas: 0,
        mayorGanancia: 0
    });

    const [estadisticasAcumulativas, setEstadisticasAcumulativas] = useState({
        totalPartidasAcum: 0,
        gananciaTotalAcum: 0,
        gastoTotalAcum: 0,
        partidasGanadasAcum: 0,
        partidasPerdidasAcum: 0,
        mayorGananciaAcum: 0
    });

    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);

    // Configuración de minas
    const MINAS_CONFIG = {
        "facil": { multiplicador_base: 1.05, tamano: 5, minas: 5 },
        "medio": { multiplicador_base: 1.10, tamano: 6, minas: 10 },
        "dificil": { multiplicador_base: 1.15, tamano: 7, minas: 20 }
    };

    // Obtener usuario al cargar
    useEffect(() => {
        const verificarAutenticacion = async () => {
            const token = localStorage.getItem("token");
            axios.get(`${API_URL}/me`, {
                headers: { Authorization: `Bearer ${token}` }
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

            if (!token) {
                console.log("⚠️ No hay token, redirigiendo a login...");
                return;
            }

            try {
                const respuesta = await axios.get(`${API_URL}/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });

                if (respuesta.data && respuesta.data.id) {
                    const usuarioData = respuesta.data;
                    setUsuario({
                        id: usuarioData.id,
                        username: usuarioData.username,
                        saldo: typeof usuarioData.saldo === "number" ? usuarioData.saldo : parseFloat(usuarioData.saldo || "0"),
                        verificado: !!usuarioData.verificado,
                        nivel: usuarioData.nivel || "BRONCE",
                        verificado_pendiente: usuarioData.verificado_pendiente || false
                    });

                    localStorage.setItem("usuario", JSON.stringify(usuarioData));
                    console.log("✅ Usuario autenticado y cargado correctamente");
                } else {
                    throw new Error("Respuesta inválida del servidor");
                }

            } catch (error: any) {
                console.error("❌ Error al verificar autenticación:", error);

                if (error.response?.status === 401) {
                    console.log("🔓 Token inválido o expirado");
                    localStorage.removeItem("token");
                    localStorage.removeItem("usuario");
                } else {
                    const usuarioGuardado = localStorage.getItem("usuario");
                    if (usuarioGuardado) {
                        try {
                            const usuarioData = JSON.parse(usuarioGuardado);
                            setUsuario({
                                id: usuarioData.id,
                                username: usuarioData.username,
                                saldo: usuarioData.saldo,
                                verificado: usuarioData.verificado,
                                nivel: usuarioData.nivel,
                                verificado_pendiente: usuarioData.verificado_pendiente
                            });
                        } catch (e) {
                            console.error("❌ Error al parsear datos locales:", e);
                        }
                    }
                }
            }
        };

        verificarAutenticacion();
    }, [navigate]);

    // Cargar configuración del juego
    useEffect(() => {
        const cargarConfiguracion = async () => {
            try {
                const res = await axios.get(`${API_URL}/juegos/minas/config`);
                console.log("Configuración de minas:", res.data);
                if (res.data.success) {
                    setApuestasPermitidas(res.data.apuestas_permitidas);
                    setApuestaSeleccionada(res.data.apuestas_permitidas[1] || 500);
                }
            } catch (error) {
                console.error("Error al cargar configuración:", error);
            }
        };

        cargarConfiguracion();
    }, []);

    // Cargar historial y estadísticas del localStorage
    useEffect(() => {
        const historialGuardado = localStorage.getItem('historial_minas');
        if (historialGuardado) {
            try {
                const historialParsed = JSON.parse(historialGuardado);
                setHistorial(historialParsed);
            } catch (error) {
                console.error("Error al parsear historial:", error);
            }
        }

        const statsAcum = localStorage.getItem("estadisticas_acumulativas_minas");
        if (statsAcum) {
            try {
                const parsedStats = JSON.parse(statsAcum);
                setEstadisticasAcumulativas(parsedStats);

                const balance = parsedStats.gananciaTotalAcum - parsedStats.gastoTotalAcum;
                setEstadisticas({
                    totalPartidas: parsedStats.totalPartidasAcum,
                    gananciaTotal: parsedStats.gananciaTotalAcum,
                    gastoTotal: parsedStats.gastoTotalAcum,
                    balance: balance,
                    partidasGanadas: parsedStats.partidasGanadasAcum,
                    partidasPerdidas: parsedStats.partidasPerdidasAcum,
                    mayorGanancia: parsedStats.mayorGananciaAcum
                });
            } catch (error) {
                console.error("Error al parsear estadísticas:", error);
            }
        }
    }, []);

    // Guardar historial en localStorage
    useEffect(() => {
        if (historial.length > 0) {
            localStorage.setItem('historial_minas', JSON.stringify(historial.slice(0, 10)));
        }
    }, [historial]);

    // Guardar estadísticas acumulativas en localStorage
    useEffect(() => {
        if (estadisticasAcumulativas.totalPartidasAcum > 0) {
            localStorage.setItem("estadisticas_acumulativas_minas", JSON.stringify(estadisticasAcumulativas));
        }
    }, [estadisticasAcumulativas]);

    const actualizarEstadisticas = (nuevaPartida: HistorialPartida) => {
        // Una victoria incluye: ganar el juego O retirarse con ganancias
        const esVictoria = nuevaPartida.resultado.includes("Retiro") ||
            nuevaPartida.resultado.includes("ganancia") ||
            nuevaPartida.resultado.includes("retiraste") ||
            (nuevaPartida.ganancia > 0 && nuevaPartida.resultado.includes("Victoria"));

        const esDerrota = nuevaPartida.resultado.includes("Mina") ||
            nuevaPartida.resultado.includes("Boom") ||
            (nuevaPartida.ganancia === 0 && !nuevaPartida.resultado.includes("Retiro"));

        // Actualizar estadísticas acumulativas
        setEstadisticasAcumulativas(prev => {
            const nuevasPartidasGanadas = prev.partidasGanadasAcum + (esVictoria ? 1 : 0);
            const nuevasPartidasPerdidas = prev.partidasPerdidasAcum + (esDerrota ? 1 : 0);
            const nuevaMayorGanancia = Math.max(prev.mayorGananciaAcum, nuevaPartida.ganancia || 0);

            return {
                totalPartidasAcum: prev.totalPartidasAcum + 1,
                gananciaTotalAcum: prev.gananciaTotalAcum + (nuevaPartida.ganancia || 0),
                gastoTotalAcum: prev.gastoTotalAcum + nuevaPartida.apuesta,
                partidasGanadasAcum: nuevasPartidasGanadas,
                partidasPerdidasAcum: nuevasPartidasPerdidas,
                mayorGananciaAcum: nuevaMayorGanancia
            };
        });

        // Actualizar estadísticas visibles
        setEstadisticas(prev => {
            const nuevasPartidasGanadas = prev.partidasGanadas + (esVictoria ? 1 : 0);
            const nuevasPartidasPerdidas = prev.partidasPerdidas + (esDerrota ? 1 : 0);
            const nuevaGananciaTotal = prev.gananciaTotal + (nuevaPartida.ganancia || 0);
            const nuevoGastoTotal = prev.gastoTotal + nuevaPartida.apuesta;
            const nuevoBalance = nuevaGananciaTotal - nuevoGastoTotal;
            const nuevaMayorGanancia = Math.max(prev.mayorGanancia, nuevaPartida.ganancia || 0);

            return {
                totalPartidas: prev.totalPartidas + 1,
                gananciaTotal: nuevaGananciaTotal,
                gastoTotal: nuevoGastoTotal,
                balance: nuevoBalance,
                partidasGanadas: nuevasPartidasGanadas,
                partidasPerdidas: nuevasPartidasPerdidas,
                mayorGanancia: nuevaMayorGanancia
            };
        });
    };

    const agregarAlHistorial = (resultado: string, ganancia: number, apuesta: number, casillasAbiertas: number, dificultad: string, multiplicador_final: number) => {
        const nuevaPartida: HistorialPartida = {
            id: Date.now(),
            resultado,
            ganancia,
            apuesta,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            casillas_abiertas: casillasAbiertas,
            dificultad,
            multiplicador_final
        };

        const nuevoHistorial = [nuevaPartida, ...historial.slice(0, 9)];
        setHistorial(nuevoHistorial);

        actualizarEstadisticas(nuevaPartida);
    };

    const animarConfetti = (tipo: "victoria" | "explosion") => {
        if (tipo === "victoria") {
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 }
            });
        } else if (tipo === "explosion") {
            confetti({
                particleCount: 50,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
            confetti({
                particleCount: 50,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });
        }
    };

    const iniciarJuego = async () => {
        if (!usuario) {
            setMensaje("Debes iniciar sesión para jugar.");
            return;
        }

        if (usuario.saldo < apuestaSeleccionada) {
            setMensaje(`Saldo insuficiente. Tienes $${usuario.saldo}, necesitas $${apuestaSeleccionada} para jugar.`);
            return;
        }

        setCargando(true);
        setMensaje("");

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setMensaje("Error: No se encontró token de autenticación");
                setCargando(false);
                return;
            }

            console.log("🚀 Iniciando juego...", {
                apuesta: apuestaSeleccionada,
                dificultad: dificultadSeleccionada
            });

            const res = await axios.post(
                `${API_URL}/juegos/minas/iniciar?apuesta=${apuestaSeleccionada}&dificultad=${dificultadSeleccionada}`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log("✅ Respuesta del servidor:", res.data);

            if (res.data.success) {
                const juego: JuegoMinas = res.data;
                setSessionId(juego.session_id);
                setTamanoTablero(juego.tamano);
                setMinasTotales(juego.minas_totales);
                setMinasRestantes(juego.minas_totales);
                setEstado('jugando');

                // Inicializar tablero vacío
                const nuevoTablero = Array(juego.tamano).fill(null).map((_, i) =>
                    Array(juego.tamano).fill(null).map((_, j) => ({
                        x: i,
                        y: j,
                        es_mine: false,
                        abierta: false,
                        marcada: false,
                        minas_cercanas: 0
                    }))
                );
                setTablero(nuevoTablero);
                setCasillasAbiertas([]);
                setCasillasMarcadas([]);
                setMultiplicadorActual(juego.multiplicador_base || 1.0);
                setGananciaPotencial(apuestaSeleccionada * (juego.multiplicador_base || 1.0));

                // Actualizar saldo usuario
                setUsuario((prev) =>
                    prev ? { ...prev, saldo: juego.nuevo_saldo } : prev
                );

                setMensaje(juego.mensaje || `¡Juego iniciado! Encuentra ${juego.minas_totales} minas.`);
                showMsg("Juego iniciado con éxito", "success");
            } else {
                const errorMsg = res.data.detail || "Error al iniciar el juego.";
                setMensaje(errorMsg);
                showMsg(errorMsg, "error");
            }
        } catch (error: any) {
            console.error("❌ Error al iniciar juego:", error);

            let errorMessage = "Error al conectar con el servidor";

            if (error.response) {
                console.error("📊 Datos del error:", error.response.data);
                errorMessage = error.response.data.detail ||
                    error.response.data.message ||
                    `Error ${error.response.status}: ${error.response.statusText}`;

                if (error.response.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("usuario");
                    setUsuario(null);
                    showMsg("Sesión expirada. Por favor, inicia sesión nuevamente.", "error");
                    setTimeout(() => navigate("/login"), 2000);
                    return;
                }

                if (error.response.status === 422) {
                    const errors = error.response.data.detail || error.response.data.errors;
                    if (Array.isArray(errors)) {
                        errorMessage = errors.map(e => e.msg || e.message).join(', ');
                    }
                }
            } else if (error.request) {
                errorMessage = "No se recibió respuesta del servidor. Verifica tu conexión.";
            } else {
                errorMessage = error.message || "Error desconocido";
            }

            setMensaje(errorMessage);
            showMsg(errorMessage, "error");
        } finally {
            setCargando(false);
        }
    };

    const abrirCasilla = async (x: number, y: number) => {
        if (!sessionId || estado !== 'jugando') return;
        if (tablero[x][y].abierta || tablero[x][y].marcada) return;

        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/minas/${sessionId}/abrir?x=${x}&y=${y}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (res.data.success) {
                if (res.data.es_mine) {
                    // Mina encontrada
                    setEstado('game_over');
                    setGanancia(0);
                    setMensaje(res.data.mensaje);

                    // Mostrar tablero completo con minas
                    if (res.data.tablero_completo) {
                        setTablero(res.data.tablero_completo);
                    }

                    // Actualizar saldo
                    setUsuario((prev) =>
                        prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev
                    );

                    // Agregar al historial
                    agregarAlHistorial(
                        "¡Boom! Mina encontrada",
                        0,
                        apuestaSeleccionada,
                        casillasAbiertas.length,
                        dificultadSeleccionada,
                        multiplicadorActual
                    );
                } else if (res.data.ganado) {
                    // Ganó el juego
                    setEstado('ganado');
                    setGanancia(res.data.ganancia);
                    setMensaje(res.data.mensaje);

                    if (res.data.tablero_completo) {
                        setTablero(res.data.tablero_completo);
                    }

                    // Actualizar saldo
                    setUsuario((prev) =>
                        prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev
                    );

                    // Animación de confetti
                    animarConfetti("victoria");

                    // Agregar al historial
                    agregarAlHistorial(
                        "¡Victoria! Minas encontradas",
                        res.data.ganancia,
                        apuestaSeleccionada,
                        res.data.casillas_abiertas?.length || 0,
                        dificultadSeleccionada,
                        res.data.multiplicador_actual || multiplicadorActual
                    );
                } else {
                    // Juego continúa
                    if (res.data.casillas_abiertas) {
                        setCasillasAbiertas(res.data.casillas_abiertas || []);

                        // Actualizar tablero visualmente
                        const nuevoTablero = [...tablero];
                        res.data.casillas_abiertas.forEach((casilla: { x: number, y: number, minas_cercanas: number }) => {
                            if (nuevoTablero[casilla.x] && nuevoTablero[casilla.x][casilla.y]) {
                                nuevoTablero[casilla.x][casilla.y].abierta = true;
                                nuevoTablero[casilla.x][casilla.y].minas_cercanas = casilla.minas_cercanas;
                            }
                        });
                        setTablero(nuevoTablero);
                    }

                    setCasillasMarcadas(res.data.casillas_marcadas || []);
                    setMinasRestantes(res.data.minas_restantes);
                    setMultiplicadorActual(res.data.multiplicador_actual);
                    setGananciaPotencial(res.data.ganancia_potencial);
                    setMensaje(res.data.mensaje || `Multiplicador: ${res.data.multiplicador_actual?.toFixed(2)}x`);

                    // Actualizar saldo si cambió
                    if (res.data.nuevo_saldo !== undefined && usuario) {
                        setUsuario({ ...usuario, saldo: res.data.nuevo_saldo });
                    }
                }
            } else {
                setMensaje(res.data.detail || "Error en la operación.");
            }
        } catch (error: any) {
            console.error("Error al abrir casilla:", error);
            setMensaje(
                error.response?.data?.detail || "Error al abrir casilla."
            );
        } finally {
            setCargando(false);
        }
    };

    const marcarCasilla = async (x: number, y: number) => {
        if (!sessionId || estado !== 'jugando') return;
        if (tablero[x][y].abierta) return;

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/minas/${sessionId}/marcar?x=${x}&y=${y}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (res.data.success) {
                // Actualizar estado local
                const nuevoTablero = [...tablero];
                nuevoTablero[x][y].marcada = res.data.marcada;
                setTablero(nuevoTablero);

                setCasillasMarcadas(res.data.casillas_marcadas || []);
                setMinasRestantes(res.data.minas_restantes);
            }

        } catch (error: any) {
            console.error("Error al marcar casilla:", error);
        }
    };

    const retirarse = async () => {
        if (!sessionId || estado !== 'jugando') return;

        setCargando(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${API_URL}/juegos/minas/${sessionId}/retirarse`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (res.data.success) {
                setEstado('game_over');
                setGanancia(res.data.ganancia);
                setMensaje(res.data.mensaje);

                // Actualizar saldo
                setUsuario((prev) =>
                    prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev
                );

                // Agregar al historial - Cambiamos el mensaje para que incluya "Retiro"
                agregarAlHistorial(
                    `Retiro exitoso: +$${res.data.ganancia}`,
                    res.data.ganancia,
                    apuestaSeleccionada,
                    res.data.casillas_abiertas,
                    dificultadSeleccionada,
                    res.data.multiplicador_final
                );

                // Animación de confetti si hay ganancia
                if (res.data.ganancia > apuestaSeleccionada) {
                    animarConfetti("victoria");
                }
            } else {
                setMensaje(res.data.detail || "Error al retirarse.");
            }

        } catch (error: any) {
            console.error("Error al retirarse:", error);
            setMensaje(
                error.response?.data?.detail || "Error al retirarse."
            );
        } finally {
            setCargando(false);
        }
    };

    const cancelarJuego = async () => {
        if (!sessionId) return;

        try {
            const token = localStorage.getItem("token");
            const res = await axios.delete(
                `${API_URL}/juegos/minas/${sessionId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (res.data.success) {
                setEstado('seleccionando');
                setSessionId(null);
                setTablero([]);
                setMensaje("Juego cancelado");
                showMsg("Juego cancelado. La apuesta no se devuelve.", "info");
            }
        } catch (error: any) {
            console.error("Error al cancelar juego:", error);
        }
    };

    const reiniciarJuego = () => {
        setEstado('seleccionando');
        setSessionId(null);
        setTablero([]);
        setCasillasAbiertas([]);
        setCasillasMarcadas([]);
        setGanancia(0);
        setGananciaPotencial(0);
        setMultiplicadorActual(1.0);
        setMensaje("");
    };

    const renderCasilla = (casilla: Casilla) => {
        const baseClasses = "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center font-bold text-sm md:text-base rounded-lg transition-all duration-200 border-2 cursor-pointer";

        if (casilla.marcada) {
            return (
                <button
                    onClick={() => marcarCasilla(casilla.x, casilla.y)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        marcarCasilla(casilla.x, casilla.y);
                    }}
                    className={`${baseClasses} bg-gradient-to-br from-red-500 to-red-600 border-red-700 text-white shadow-lg`}
                    disabled={cargando || estado !== 'jugando'}
                >
                    🚩
                </button>
            );
        }

        if (!casilla.abierta) {
            return (
                <button
                    onClick={() => abrirCasilla(casilla.x, casilla.y)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        marcarCasilla(casilla.x, casilla.y);
                    }}
                    className={`${baseClasses} bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600 hover:from-gray-600 hover:to-gray-700 hover:scale-105 active:scale-95`}
                    disabled={cargando || estado !== 'jugando'}
                >
                    {(estado === 'game_over' && casilla.es_mine) ? "💣" : ""}
                </button>
            );
        }

        // Casilla abierta
        let bgColor = "bg-gradient-to-br from-gray-300 to-gray-400 border-gray-500";
        let textColor = "text-gray-900";

        if (casilla.es_mine) {
            bgColor = "bg-gradient-to-br from-red-500 to-red-600 border-red-700";
            textColor = "text-white";
        } else if (casilla.minas_cercanas > 0) {
            const colors = [
                "text-blue-600",
                "text-green-600",
                "text-red-600",
                "text-purple-600",
                "text-yellow-700",
                "text-pink-600",
                "text-gray-800",
                "text-black"
            ];
            textColor = colors[casilla.minas_cercanas - 1] || "text-gray-900";
        }

        return (
            <div className={`${baseClasses} ${bgColor} ${textColor} cursor-default`}>
                {casilla.es_mine ? "💣" :
                    casilla.minas_cercanas > 0 ? casilla.minas_cercanas : ""}
            </div>
        );
    };

    const getDificultadInfo = (dificultad: string) => {
        switch (dificultad) {
            case "facil":
                return { nombre: "Fácil", minas: 5, tamano: 5, color: "from-green-500 to-green-600" };
            case "medio":
                return { nombre: "Medio", minas: 10, tamano: 6, color: "from-yellow-500 to-yellow-600" };
            case "dificil":
                return { nombre: "Difícil", minas: 20, tamano: 7, color: "from-red-500 to-red-600" };
            default:
                return { nombre: "Fácil", minas: 5, tamano: 5, color: "from-green-500 to-green-600" };
        }
    };

    const limpiarHistorial = () => {
        setHistorial([]);
        localStorage.removeItem('historial_minas');
        showMsg("Historial limpiado", "info");
    };

    const limpiarTodasEstadisticas = () => {
        setHistorial([]);
        setEstadisticas({
            totalPartidas: 0,
            gananciaTotal: 0,
            gastoTotal: 0,
            balance: 0,
            partidasGanadas: 0,
            partidasPerdidas: 0,
            mayorGanancia: 0
        });
        setEstadisticasAcumulativas({
            totalPartidasAcum: 0,
            gananciaTotalAcum: 0,
            gastoTotalAcum: 0,
            partidasGanadasAcum: 0,
            partidasPerdidasAcum: 0,
            mayorGananciaAcum: 0
        });
        localStorage.removeItem('historial_minas');
        localStorage.removeItem("estadisticas_acumulativas_minas");
        showMsg("Estadísticas reiniciadas completamente", "info");
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
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
        localStorage.removeItem("historial_minas");
        localStorage.removeItem("estadisticas_acumulativas_minas");

        setUsuario(null);
        showMsg("Sesión cerrada correctamente", "success");
        setTimeout(() => navigate('/login'), 1500);
    };

    // Función de prueba de conexión
    useEffect(() => {
        const testConnection = async () => {
            try {
                const token = localStorage.getItem("token");
                console.log("🔑 Token:", token ? "Presente" : "Ausente");

                // Probar conexión simple
                const test = await axios.get(`${API_URL}/juegos/minas/config`);
                console.log("✅ Configuración obtenida:", test.data);

                // Probar autenticación
                if (token) {
                    const me = await axios.get(`${API_URL}/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    console.log("✅ Usuario autenticado:", me.data);
                }
            } catch (error) {
                console.error("❌ Error de conexión:", error);
            }
        };

        if (process.env.NODE_ENV === 'development') {
            testConnection();
        }
    }, []);

    // Si el usuario no está cargado, mostrar loading
    if (!usuario) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando Minas...</p>
                </div>
            </div>
        );
    }

    const dificultadInfo = getDificultadInfo(dificultadSeleccionada);

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

            {/* Header - Usando el componente */}
            <Header
                usuario={usuario}
                cerrarSesion={cerrarSesion}
                setUsuario={setUsuario}
            />

            {/* Contenido Principal */}
            <section className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Área de juego */}
                    <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            {/* Información del juego */}
                            <div className="mb-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                        <div className="text-sm text-gray-400">Minas Restantes</div>
                                        <div className="text-2xl font-bold text-red-400">{minasRestantes}</div>
                                    </div>
                                    <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                        <div className="text-sm text-gray-400">Multiplicador</div>
                                        <div className="text-2xl font-bold text-yellow-400">{multiplicadorActual.toFixed(2)}x</div>
                                    </div>
                                    <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                        <div className="text-sm text-gray-400">Ganancia Actual</div>
                                        <div className="text-2xl font-bold text-green-400">${gananciaPotencial.toLocaleString()}</div>
                                    </div>
                                    <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                                        <div className="text-sm text-gray-400">Dificultad</div>
                                        <div className="text-xl font-bold text-white">{dificultadInfo.nombre}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Selector de apuesta y dificultad */}
                            {estado === 'seleccionando' && (
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-white mb-4 text-center">💰 Configura tu juego</h3>

                                    {/* Dificultad */}
                                    <div className="mb-6">
                                        <h4 className="text-lg font-bold text-gray-300 mb-3">Selecciona dificultad:</h4>
                                        <div className="flex gap-3 justify-center flex-wrap mb-4">
                                            {["facil", "medio", "dificil"].map((dificultad) => {
                                                const info = getDificultadInfo(dificultad);
                                                return (
                                                    <button
                                                        key={dificultad}
                                                        onClick={() => setDificultadSeleccionada(dificultad)}
                                                        className={`px-4 py-3 rounded-xl font-bold transition-all duration-300 ${dificultadSeleccionada === dificultad
                                                            ? `bg-gradient-to-r ${info.color} text-white shadow-lg scale-105`
                                                            : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white border border-gray-700'
                                                            }`}
                                                    >
                                                        {info.nombre}<br />
                                                        <span className="text-sm font-normal">
                                                            {info.tamano}x{info.tamano} - {info.minas} minas
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Apuesta */}
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-300 mb-3">Selecciona apuesta:</h4>
                                        <div className="flex gap-3 justify-center flex-wrap mb-4">
                                            {apuestasPermitidas.map((apuesta) => (
                                                <button
                                                    key={apuesta}
                                                    onClick={() => setApuestaSeleccionada(apuesta)}
                                                    disabled={usuario.saldo < apuesta}
                                                    className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 ${apuestaSeleccionada === apuesta
                                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
                                                        : usuario.saldo < apuesta
                                                            ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700'
                                                            : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white border border-gray-700'
                                                        }`}
                                                >
                                                    ${apuesta.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tablero de juego */}
                            {estado !== 'seleccionando' && tablero.length > 0 && (
                                <div className="mb-8">
                                    <div className="flex justify-center">
                                        <div className="inline-grid gap-1 md:gap-2 p-3 md:p-4 bg-gray-900/50 rounded-2xl border border-gray-700/50">
                                            {tablero.map((fila, i) => (
                                                <div key={i} className="flex gap-1 md:gap-2">
                                                    {fila.map((casilla) => (
                                                        <div key={`${casilla.x}-${casilla.y}`}>
                                                            {renderCasilla(casilla)}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Controles */}
                            <div className="text-center">
                                <div className="mb-4">
                                    <div className="text-2xl font-bold text-white mb-2">
                                        Saldo: <span className="text-yellow-400">${usuario?.saldo?.toLocaleString() ?? 0}</span>
                                    </div>
                                    {estado === 'jugando' && apuestaSeleccionada > 0 && (
                                        <div className="text-lg text-green-400 font-bold">
                                            Apostado: ${apuestaSeleccionada.toLocaleString()}
                                        </div>
                                    )}
                                    {mensaje && (
                                        <div className={`px-4 py-3 rounded-xl font-bold mb-4 ${mensaje.includes("Error") || mensaje.includes("insuficiente") || mensaje.includes("Boom")
                                            ? "bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200"
                                            : mensaje.includes("Ganaste") || mensaje.includes("retiraste")
                                                ? "bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50 text-green-200"
                                                : "bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-gray-500/50 text-gray-200"
                                            }`}>
                                            {mensaje}
                                            {ganancia > 0 && (
                                                <div className="text-lg text-green-400 mt-2">
                                                    💰 Ganancia: +${ganancia.toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 justify-center flex-wrap">
                                    {estado === 'seleccionando' && (
                                        <button
                                            onClick={iniciarJuego}
                                            disabled={cargando || !usuario || (usuario && usuario.saldo < apuestaSeleccionada)}
                                            className={`py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${cargando
                                                ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                                : 'bg-gradient-to-r from-red-600 to-yellow-600 hover:from-red-500 hover:to-yellow-500 hover:scale-105 active:scale-95'
                                                } ${(!usuario || (usuario && usuario.saldo < apuestaSeleccionada)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {cargando ? (
                                                <span className="flex items-center justify-center">
                                                    <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Iniciando...
                                                </span>
                                            ) : (
                                                `💣 Iniciar Juego ($${apuestaSeleccionada.toLocaleString()})`
                                            )}
                                        </button>
                                    )}

                                    {estado === 'jugando' && (
                                        <>
                                            <button
                                                onClick={retirarse}
                                                disabled={cargando}
                                                className={`py-3 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${cargando
                                                    ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 hover:scale-105 active:scale-95'
                                                    }`}
                                            >
                                                {cargando ? "..." : "💰 Retirarse"}
                                            </button>

                                            <button
                                                onClick={cancelarJuego}
                                                disabled={cargando}
                                                className={`py-3 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${cargando
                                                    ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 hover:scale-105 active:scale-95'
                                                    }`}
                                            >
                                                {cargando ? "..." : "❌ Cancelar"}
                                            </button>
                                        </>
                                    )}

                                    {(estado === 'game_over' || estado === 'ganado') && (
                                        <button
                                            onClick={reiniciarJuego}
                                            className="py-4 px-8 rounded-xl font-bold text-lg bg-gradient-to-r from-red-600 to-yellow-600 hover:from-red-500 hover:to-yellow-500 hover:scale-105 active:scale-95 transition-all duration-300"
                                        >
                                            💣 Jugar de Nuevo
                                        </button>
                                    )}
                                </div>

                                {/* Instrucciones */}
                                <div className="mt-6 text-gray-400 text-sm">
                                    <p>💡 <strong>Instrucciones:</strong> Haz clic para abrir casillas. Click derecho para marcar/desmarcar minas. ¡No hagas clic en las minas!</p>
                                    <p className="mt-1">📱 <strong>En móvil:</strong> Mantén presionado para marcar con bandera.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Panel Lateral */}
                    <div className="space-y-6">
                        {/* Estadísticas */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📊 Estadísticas</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-900/40 p-3 rounded-lg">
                                    <div className="text-sm text-gray-400">Partidas Totales</div>
                                    <div className="text-xl font-bold text-white">{estadisticas.totalPartidas}</div>
                                </div>
                                <div className="bg-gray-900/40 p-3 rounded-lg">
                                    <div className="text-sm text-gray-400">Ganancia Total</div>
                                    <div className={`text-xl font-bold ${estadisticas.gananciaTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${estadisticas.gananciaTotal.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-gray-900/40 p-3 rounded-lg">
                                    <div className="text-sm text-gray-400">Balance</div>
                                    <div className={`text-xl font-bold ${estadisticas.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ${estadisticas.balance.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-gray-900/40 p-3 rounded-lg">
                                    <div className="text-sm text-gray-400">Victorias</div>
                                    <div className="text-xl font-bold text-green-400">{estadisticas.partidasGanadas}</div>
                                </div>
                                <div className="col-span-2 bg-gray-900/40 p-3 rounded-lg">
                                    <div className="text-sm text-gray-400">Mayor Ganancia</div>
                                    <div className="text-xl font-bold text-yellow-400">${estadisticas.mayorGanancia.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={limpiarHistorial}
                                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Limpiar Historial
                                </button>
                                <button
                                    onClick={limpiarTodasEstadisticas}
                                    className="flex-1 py-2 bg-red-900/50 hover:bg-red-800/60 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Reiniciar Stats
                                </button>
                            </div>
                        </div>

                        {/* Reglas del juego */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📖 Reglas del Juego</h3>
                            <ul className="space-y-3 text-gray-300">
                                <li className="flex items-start">
                                    <span className="text-yellow-400 mr-2">•</span>
                                    <span>Abre casillas para aumentar tu multiplicador</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-red-400 mr-2">•</span>
                                    <span>Evita las minas o perderás tu apuesta</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-400 mr-2">•</span>
                                    <span>Retírate en cualquier momento para llevarte tu ganancia (¡Cuenta como victoria!)</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-blue-400 mr-2">•</span>
                                    <span>Usa click derecho para marcar minas sospechosas</span>
                                </li>
                            </ul>
                        </div>

                        {/* Historial */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-white">📜 Historial</h3>
                                <button
                                    onClick={limpiarHistorial}
                                    className="text-sm text-gray-400 hover:text-white"
                                >
                                    Limpiar
                                </button>
                            </div>
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {historial.length > 0 ? (
                                    historial.map((partida) => (
                                        <div
                                            key={partida.id}
                                            className="bg-gray-900/40 p-3 rounded-lg border border-gray-700/50"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-medium text-white">{partida.resultado}</div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {partida.fecha} • {partida.dificultad.toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className={`text-lg font-bold ${partida.ganancia > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {partida.ganancia > 0 ? '+' : ''}${partida.ganancia.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-400 mt-2">
                                                <span>Apuesta: ${partida.apuesta.toLocaleString()}</span>
                                                <span>{partida.multiplicador_final.toFixed(2)}x</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        No hay partidas recientes
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Información de multiplicadores */}
                        <div className="bg-gradient-to-r from-red-600/20 to-yellow-600/20 border border-red-500/30 rounded-2xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">⚡ Multiplicadores</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Fácil (5x5)</span>
                                    <span className="text-green-400 font-bold">1.05x base</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Medio (6x6)</span>
                                    <span className="text-yellow-400 font-bold">1.10x base</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Difícil (7x7)</span>
                                    <span className="text-red-400 font-bold">1.15x base</span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-red-500/30">
                                    <p className="text-sm text-gray-300">
                                        <span className="text-yellow-400 font-bold">¡Cada casilla segura aumenta tu multiplicador!</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer - Usando el componente */}
            <Footer />
        </div>
    );
}