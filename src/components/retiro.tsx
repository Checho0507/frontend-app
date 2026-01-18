import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from './header';
import Footer from './footer';
import { API_URL } from "../api/auth";

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    verificado_pendiente?: boolean;
    nivel?: string;
}

interface RetiroBackend {
    id: number;
    monto: number;
    metodo_retiro: string;
    cuenta_destino: string;
    referencia: string;
    estado: "PENDIENTE" | "APROBADO" | "RECHAZADO";
    fecha_solicitud: string;
    fecha_procesamiento: string | null;
}

interface RetiroProps {
    usuario: Usuario | null;
    setUsuario: React.Dispatch<React.SetStateAction<Usuario | null>>;
    cerrarSesion: () => void;
}

const Retiro: React.FC<RetiroProps> = ({ usuario, setUsuario, cerrarSesion }) => {
    const navigate = useNavigate();
    const [monto, setMonto] = useState<number>(50000);
    const [metodoRetiro, setMetodoRetiro] = useState<string>("");
    const [cuentaDestino, setCuentaDestino] = useState<string>("");
    const [cargando, setCargando] = useState<boolean>(false);
    const [cargandoInicial, setCargandoInicial] = useState<boolean>(true); // ✅ NUEVO
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
    const [historialRetiros, setHistorialRetiros] = useState<RetiroBackend[]>([]);
    const [mostrarHistorial, setMostrarHistorial] = useState<boolean>(false);
    const [formularioValido, setFormularioValido] = useState<boolean>(false);

    const metodosRetiro = [
        { id: "nequi", nombre: "Nequi", icon: "📱", ejemplo: "3123456789" },
        { id: "daviplata", nombre: "Daviplata", icon: "💳", ejemplo: "3123456789" }
    ];

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    // ✅ CORREGIDO: Verificar autenticación y cargar usuario
    useEffect(() => {
        const inicializarComponente = async () => {
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
            console.log("🔑 Token encontrado:", token ? "Sí" : "No");

            // Si no hay token, redirigir inmediatamente
            if (!token) {
                console.log("❌ No hay token, redirigiendo a login");
                setCargandoInicial(false);
                navigate('/login');
                return;
            }

            // Si ya tenemos usuario en props, solo cargar historial
            if (usuario) {
                console.log("✅ Usuario ya cargado:", usuario.username);
                await cargarHistorialRetiros(token);
                setCargandoInicial(false);
                return;
            }

            // Intentar cargar usuario desde localStorage
            const usuarioGuardado = localStorage.getItem('usuario');
            if (usuarioGuardado) {
                try {
                    const usuarioParsed = JSON.parse(usuarioGuardado);
                    console.log("📦 Usuario cargado desde localStorage:", usuarioParsed.username);
                    setUsuario(usuarioParsed);
                    await cargarHistorialRetiros(token);
                    setCargandoInicial(false);
                    return;
                } catch (error) {
                    console.error('❌ Error al parsear usuario de localStorage:', error);
                }
            }

            // Si no hay usuario en localStorage, obtenerlo del backend
            try {
                console.log("🌐 Obteniendo usuario desde backend...");
                const response = await axios.get(`${API_URL}/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache'
                    }
                });

                console.log("✅ Usuario obtenido del backend:", response.data.username);
                const usuarioData = response.data;
                setUsuario(usuarioData);
                localStorage.setItem('usuario', JSON.stringify(usuarioData));
                await cargarHistorialRetiros(token);
                setCargandoInicial(false);

            } catch (error: any) {
                console.error('❌ Error al cargar usuario del backend:', error);

                if (error.response?.status === 401) {
                    showMsg("Sesión expirada. Por favor, vuelve a iniciar sesión.", "error");
                    setTimeout(() => {
                        cerrarSesion();
                        navigate('/login');
                    }, 2000);
                } else {
                    showMsg("Error al cargar datos del usuario", "error");
                    setTimeout(() => {
                        navigate('/login');
                    }, 2000);
                }
                setCargandoInicial(false);
            }
        };

        inicializarComponente();
    }, []); // ✅ CRÍTICO: Array vacío para evitar loops

    // ✅ NUEVO: Función para cargar historial con token explícito
    const cargarHistorialRetiros = async (token?: string) => {
        try {
            const authToken = token || localStorage.getItem("token");

            if (!authToken) {
                console.log("⚠️ No hay token para cargar historial");
                return;
            }

            console.log("📊 Cargando historial de retiros...");

            const response = await axios.get(
                `${API_URL}/transacciones/mis-retiros`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            console.log("✅ Historial cargado:", response.data.length, "retiros");
            setHistorialRetiros(response.data);
            localStorage.setItem('historial_retiros', JSON.stringify(response.data));

        } catch (error: any) {
            console.error("❌ Error al cargar historial:", error);

            // Intentar cache si hay error
            const cache = localStorage.getItem('historial_retiros');
            if (cache) {
                try {
                    const historialCache = JSON.parse(cache);
                    console.log("📦 Usando historial desde cache:", historialCache.length, "retiros");
                    setHistorialRetiros(historialCache);
                } catch (e) {
                    console.error("❌ Error al parsear cache:", e);
                }
            }

            // Manejar error de autenticación
            if (error.response?.status === 401) {
                showMsg("Sesión expirada. Redirigiendo...", "error");
                setTimeout(() => {
                    cerrarSesion();
                    navigate('/login');
                }, 2000);
            }
        }
    };

    // Validar formulario
    const validarFormulario = useCallback(() => {
        if (!usuario) return false;

        const montoMinimo = 50000;
        const montoMaximo = usuario.verificado ? 1000000 : 1000000;
        const montoValido = monto >= montoMinimo && monto <= montoMaximo;

        const saldoSuficiente = monto <= usuario.saldo;
        const metodoValido = metodoRetiro !== "";
        const cuentaValida = cuentaDestino.trim().length >= 8;

        return montoValido && saldoSuficiente && metodoValido && cuentaValida;
    }, [monto, metodoRetiro, cuentaDestino, usuario]);

    useEffect(() => {
        setFormularioValido(validarFormulario());
    }, [validarFormulario]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formularioValido) {
            showMsg("Completa todos los campos requeridos correctamente", "error");
            return;
        }

        if (!usuario) {
            showMsg("Debes iniciar sesión", "error");
            navigate('/login');
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            showMsg("No se encontró token de autenticación", "error");
            navigate('/login');
            return;
        }

        setCargando(true);

        try {
            console.log("💸 Enviando solicitud de retiro...");
            const response = await axios.post(
                `${API_URL}/transacciones/retiro`,
                {
                    monto: monto,
                    metodo_retiro: metodoRetiro,
                    cuenta_destino: cuentaDestino.trim(),
                    comision: monto * 0.02, // Ejemplo: 2% de comisión
                    total: monto * 1.02   // Monto + comisión
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = response.data;
            console.log("✅ Retiro exitoso:", data);

            showMsg(`✅ Retiro solicitado por $${monto.toLocaleString()} COP. Referencia: ${data.referencia}`, "success");

            // Actualizar saldo del usuario
            if (data.nuevo_saldo !== undefined) {
                const usuarioActualizado = {
                    ...usuario,
                    saldo: data.nuevo_saldo
                };
                setUsuario(usuarioActualizado);
                localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
            }

            // Recargar historial
            await cargarHistorialRetiros(token);

            // Resetear formulario a valores mínimos
            setMonto(50000);
            setMetodoRetiro("");
            setCuentaDestino("");

        } catch (err: any) {
            console.error("❌ Error en retiro:", err);

            let mensajeError = "Error al procesar la solicitud";

            if (err.response) {
                if (err.response.status === 401) {
                    mensajeError = "Sesión expirada. Por favor, vuelve a iniciar sesión.";
                    setTimeout(() => {
                        cerrarSesion();
                        navigate('/login');
                    }, 2000);
                } else if (err.response.data?.detail) {
                    mensajeError = err.response.data.detail;
                }
            }

            showMsg(mensajeError, "error");
        } finally {
            setCargando(false);
        }
    };

    const formatearFecha = (fechaString: string) => {
        try {
            const fecha = new Date(fechaString);
            if (isNaN(fecha.getTime())) {
                return fechaString;
            }
            return fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return fechaString;
        }
    };

    const getMetodoNombre = (metodoId: string) => {
        const metodo = metodosRetiro.find(m => m.id === metodoId);
        return metodo ? metodo.nombre : metodoId;
    };

    const getLimiteMaximo = () => {
        return usuario?.verificado ? 1000000 : 1000000;
    };

    const getEjemploCuenta = () => {
        const metodo = metodosRetiro.find(m => m.id === metodoRetiro);
        return metodo ? `${metodo.ejemplo}` : "Número de cuenta o teléfono";
    };

    const getMensajeValidacionMonto = () => {
        if (monto <= 0) return "❌ Ingresa un monto";
        if (monto < 50000) return '❌ Monto mínimo: $50,000 COP';
        if (monto > getLimiteMaximo()) return `❌ Monto máximo: $${getLimiteMaximo().toLocaleString()} COP`;
        if (usuario && monto > usuario.saldo) return `❌ Saldo insuficiente. Disponible: $${usuario.saldo.toLocaleString()} COP`;
        return '✅ Monto válido';
    };

    // ✅ CORREGIDO: Mostrar loading inicial
    if (cargandoInicial) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando datos...</p>
                    <p className="text-gray-400 text-sm mt-2">Verificando sesión y cargando historial</p>
                </div>
            </div>
        );
    }

    // Si después de cargar no hay usuario, mostrar error
    if (!usuario) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <p className="text-gray-300 text-xl font-bold mb-4">Error al cargar usuario</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition"
                    >
                        Volver al Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
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

            {/* ... resto del código JSX permanece igual ... */}
            {/* (Copia todo el código JSX que ya tienes desde Hero Section hasta Footer) */}
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-green-500 to-cyan-500 rounded-full blur-3xl opacity-20"></div>

                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-full text-sm font-bold text-purple-400">
                                💸 RETIRO RÁPIDO
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                ¡Retira tus ganancias!
                            </span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Retira desde <span className="text-green-400 font-bold">$50,000</span> hasta{' '}
                            <span className="text-green-400 font-bold">
                                ${getLimiteMaximo().toLocaleString()} COP
                            </span>
                            {!usuario.verificado && (
                                <span className="text-yellow-400 font-bold block mt-2">
                                    ¡Verifícate para límites más altos!
                                </span>
                            )}
                        </p>
                        {/* Solo 5% de cobro por tus retiros */}
                        <div className="inline-block px-5 py-3 bg-gradient-to-r from-green-600/20 to-cyan-600/20 border border-green-500/30 rounded-full text-sm font-bold text-green-400">
                            🚀 Solo 5% de comisión por retiro
                        </div>
                    </div>
                </div>
            </section>

            {/* Contenido Principal */}
            <section className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Formulario de retiro */}
                        <div className="lg:col-span-2">
                            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
                                <form onSubmit={handleSubmit}>
                                    {/* Monto */}
                                    <div className="mb-6">
                                        <label className="block text-gray-300 mb-3 font-medium">
                                            Monto a retirar (COP)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                value={monto}
                                                onChange={(e) => setMonto(Number(e.target.value) || 0)}
                                                className="w-full pl-10 pr-4 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white text-lg focus:outline-none focus:border-purple-500 transition"
                                                placeholder="Ej: 100000"
                                                min="50000"
                                                max={getLimiteMaximo()}
                                                step="1000"
                                                required
                                            />
                                        </div>
                                        <div className="mt-2">
                                            <p className={`text-sm ${monto >= 50000 &&
                                                    monto <= getLimiteMaximo() &&
                                                    usuario &&
                                                    monto <= usuario.saldo ?
                                                    'text-green-400' : 'text-red-400'
                                                }`}>
                                                {getMensajeValidacionMonto()}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {[50000, 100000, 200000, 500000, 1000000].map((valor) => (
                                                <button
                                                    key={valor}
                                                    type="button"
                                                    onClick={() => setMonto(valor)}
                                                    className={`px-3 py-2 rounded-lg text-sm transition ${monto === valor
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                        }`}
                                                >
                                                    ${valor.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Método de retiro */}
                                    <div className="mb-6">
                                        <label className="block text-gray-300 mb-3 font-medium">
                                            Método de retiro
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {metodosRetiro.map((metodo) => (
                                                <button
                                                    key={metodo.id}
                                                    type="button"
                                                    onClick={() => setMetodoRetiro(metodo.id)}
                                                    className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center ${metodoRetiro === metodo.id
                                                        ? 'border-purple-500 bg-purple-500/10'
                                                        : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                                                        }`}
                                                >
                                                    <span className="text-2xl mb-2">{metodo.icon}</span>
                                                    <span className="text-sm font-medium">{metodo.nombre}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-2">
                                            <p className={`text-sm ${metodoRetiro ? 'text-green-400' : 'text-red-400'}`}>
                                                {metodoRetiro ? '✅ Método seleccionado' : '❌ Selecciona un método de retiro'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Cuenta destino */}
                                    <div className="mb-6">
                                        <label className="block text-gray-300 mb-3 font-medium">
                                            Cuenta de destino
                                        </label>
                                        <input
                                            type="text"
                                            value={cuentaDestino}
                                            onChange={(e) => setCuentaDestino(e.target.value)}
                                            className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white text-lg focus:outline-none focus:border-purple-500 transition"
                                            placeholder={getEjemploCuenta()}
                                            required
                                        />
                                        <div className="mt-2">
                                            <p className={`text-sm ${cuentaDestino.trim().length >= 8 ? 'text-green-400' : 'text-red-400'}`}>
                                                {cuentaDestino.trim().length >= 8 ? '✅ Formato válido' : '❌ Mínimo 8 caracteres'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Botón de envío */}
                                    <button
                                        type="submit"
                                        disabled={!formularioValido || cargando}
                                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${(!formularioValido || cargando)
                                            ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                                            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 hover:scale-[1.02] text-white'
                                            }`}
                                    >
                                        {cargando ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Procesando...
                                            </span>
                                        ) : (
                                            `Solicitar retiro de $${monto.toLocaleString()} COP`
                                        )}
    
                                    </button>
                                    {/*Total a recibir*/}
                                    <p className="text-center text-gray-400 text-sm mt-3">
                                        Total a recibir: <span className="font-bold text-green-400">
                                            ${ (monto * 0.95).toLocaleString() } COP
                                        </span> (después de comisión del 5%)
                                    </p>

                                    {!formularioValido && !cargando && (
                                        <p className="text-center text-yellow-400 text-sm mt-3">
                                            ⚠️ Completa todos los campos requeridos para solicitar el retiro
                                        </p>
                                    )}
                                </form>
                            </div>
                        </div>

                        {/* Panel lateral */}
                        <div className="space-y-6">
                            {/* Información del usuario */}
                            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
                                <h3 className="font-bold text-lg mb-4">Tu información</h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-gray-400 text-sm">Saldo disponible</p>
                                        <p className="text-2xl font-bold text-green-400">
                                            ${usuario.saldo.toLocaleString()} COP
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Estado de verificación</p>
                                        <p className={`font-medium ${usuario.verificado
                                            ? 'text-green-400'
                                            : usuario.verificado_pendiente
                                                ? 'text-blue-400'
                                                : 'text-yellow-400'
                                            }`}>
                                            {usuario.verificado
                                                ? '✅ Verificado'
                                                : usuario.verificado_pendiente
                                                    ? '⏳ En verificación'
                                                    : '❌ No verificado'}
                                        </p>
                                        {usuario.verificado ? (
                                            <p className="text-xs text-green-400 mt-1">
                                                Límite máximo: $1,000,000 COP
                                            </p>
                                        ) : (
                                            <p className="text-xs text-yellow-400 mt-1">
                                                Límite máximo: $1,000,000 COP
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Historial de retiros */}
                            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Historial de retiros</h3>
                                    <button
                                        onClick={() => setMostrarHistorial(!mostrarHistorial)}
                                        className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                                    >
                                        {mostrarHistorial ? 'Mostrar menos' : 'Ver todo'}
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {historialRetiros.length > 0 ? (
                                        (mostrarHistorial ? historialRetiros : historialRetiros.slice(0, 3)).map((retiro) => (
                                            <div
                                                key={retiro.id}
                                                className="p-4 bg-gray-900/50 rounded-lg hover:bg-gray-800/50 transition"
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <div>
                                                        <p className="font-bold text-lg text-green-400">
                                                            ${retiro.monto.toLocaleString()} COP
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {formatearFecha(retiro.fecha_solicitud)}
                                                        </p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${retiro.estado === "APROBADO"
                                                        ? 'bg-green-900/50 text-green-400'
                                                        : retiro.estado === "RECHAZADO"
                                                            ? 'bg-red-900/50 text-red-400'
                                                            : 'bg-yellow-900/50 text-yellow-400'
                                                        }`}>
                                                        {retiro.estado}
                                                    </span>
                                                </div>
                                                <div className="text-sm">
                                                    <div className="mb-1">
                                                        <span className="text-gray-400">Método: </span>
                                                        <span className="text-white">{getMetodoNombre(retiro.metodo_retiro)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400">Ref: </span>
                                                        <span className="text-white font-mono">{retiro.referencia}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6">
                                            <div className="text-4xl mb-3">📊</div>
                                            <p className="text-gray-400">No hay retiros registrados</p>
                                            <p className="text-sm text-gray-500 mt-1">Solicita tu primer retiro</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Botón de volver */}
                            <div className="text-center">
                                <button
                                    onClick={() => navigate('/inicio')}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl font-bold transition-all duration-300 border border-gray-600"
                                >
                                    ← Volver al Inicio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default Retiro;