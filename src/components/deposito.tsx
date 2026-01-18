import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from './header';
import Footer from './footer';
import { API_URL } from '../api/auth';

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    nivel?: string;
    verificado_pendiente?: boolean;
}

interface DepositoBackend {
    id: number;
    monto: number;
    metodo_pago: string;
    referencia: string;
    estado: "PENDIENTE" | "APROBADO" | "RECHAZADO";
    comprobante_url: string | null;
    fecha_solicitud: string;
    fecha_procesamiento: string | null;
}

interface DepositoProps {
    usuario: Usuario | null;
    setUsuario: React.Dispatch<React.SetStateAction<Usuario | null>>;
    cerrarSesion: () => void;
}

const Deposito: React.FC<DepositoProps> = ({ usuario, setUsuario, cerrarSesion }) => {
    const navigate = useNavigate();
    const [monto, setMonto] = useState<number>(0);
    const [metodoPago, setMetodoPago] = useState<string>("");
    const [comprobante, setComprobante] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [cargando, setCargando] = useState<boolean>(false);
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
    const [historialDepositos, setHistorialDepositos] = useState<DepositoBackend[]>([]);
    const [mostrarHistorial, setMostrarHistorial] = useState<boolean>(false);

    // Estado para controlar si el formulario es válido
    const [formularioValido, setFormularioValido] = useState<boolean>(false);

    const metodosPago = [
        {
            id: "nequi", nombre: "Nequi:", cuenta: "320-388-2720", icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 160">

  <rect x="18" y="48" width="18" height="18" rx="4" fill="url(#pinkGlow)"/>

  <g fill="#2B0A3D">
    <path d="M70 115 V38 h18 l45 55 V38 h18 v77 h-16 l-47-56 v56 Z"/>
    <path d="M185 115 V38 h65 v15 h-47 v14 h43 v14 h-43 v18 h49 v16 Z"/>
    <path d="M270 76 c0-23 16-40 40-40s40 17 40 40-16 40-40 40c-6 0-12-1-17-4l-11 12-12-10 12-13c-8-7-12-15-12-25z
             M294 76 c0 13 8 22 16 22s16-9 16-22-8-22-16-22-16 9-16 22z"/>
    <path d="M365 38 h18 v45 c0 11 6 18 16 18s16-7 16-18 V38 h18 v47 c0 21-14 34-34 34s-34-13-34-34 Z"/>
    <path d="M470 38 h18 v77 h-18 Z"/>
  </g>
</svg>

        },
        {
            id: "daviplata", nombre: "Daviplata", cuenta: "Próximamente", icon: <svg
                xmlns="http://www.w3.org/2000/svg"
                width="120"
                height="120"
                viewBox="0 0 120 120"
            >
                <rect
                    x="0"
                    y="0"
                    width="120"
                    height="120"
                    rx="24"
                    fill="#E10600"
                />

                <path
                    d="M42 30
       H64
       C78 30 88 40 88 60
       C88 80 78 90 64 90
       H42
       Z
       M54 42
       V78
       H63
       C71 78 76 72 76 60
       C76 48 71 42 63 42
       Z"
                    fill="#FFFFFF"
                />
            </svg>
        }
    ];

    // Validar formulario cada vez que cambien las dependencias
    useEffect(() => {
        const validarFormulario = () => {
            // Validar monto mínimo y máximo
            const montoValido = monto >= 10000 && monto <= 1000000;

            // Validar método de pago seleccionado
            const metodoValido = metodoPago !== "";

            // Validar comprobante según estado de verificación
            let comprobanteValido = true;
            if (usuario?.verificado) {
                comprobanteValido = comprobante !== null;
            }

            return montoValido && metodoValido && comprobanteValido;
        };

        setFormularioValido(validarFormulario());
    }, [monto, metodoPago, comprobante, usuario]);

    useEffect(() => {
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
        } else {
            // Cargar historial solo si tenemos usuario
            cargarHistorialDepositos();
        }
    }, [navigate, usuario, setUsuario]);

    const cargarHistorialDepositos = async () => {
        if (!usuario) return;

        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(
                `${API_URL}/transacciones/mis-depositos`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            setHistorialDepositos(response.data);

            // También actualizar localStorage para cache
            localStorage.setItem('historial_depositos', JSON.stringify(response.data));

        } catch (error: any) {
            console.error("Error al cargar historial:", error);

            // Intentar cargar desde cache si falla la conexión
            const cache = localStorage.getItem('historial_depositos');
            if (cache) {
                try {
                    setHistorialDepositos(JSON.parse(cache));
                } catch (e) {
                    console.error("Error al parsear cache:", e);
                }
            }

            if (error.response?.status === 401) {
                showMsg("Sesión expirada", "error");
                setTimeout(() => {
                    cerrarSesion();
                    navigate('/login');
                }, 2000);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB límite
                showMsg("La imagen no debe superar los 5MB", "error");
                return;
            }
            if (!file.type.startsWith('image/')) {
                showMsg("Solo se permiten imágenes", "error");
                return;
            }
            setComprobante(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formularioValido) {
            showMsg("Completa todos los campos requeridos", "error");
            return;
        }

        if (!usuario) {
            showMsg("Debes iniciar sesión", "error");
            return;
        }

        setCargando(true);
        setNotificacion(null);

        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append('monto', monto.toString());
            formData.append('metodo_pago', metodoPago);

            if (comprobante) {
                formData.append('comprobante', comprobante);
            }

            const response = await axios.post(
                `${API_URL}/transacciones/deposito`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            const data = response.data;

            // Mostrar mensaje de éxito
            showMsg(`✅ Depósito solicitado por $${monto.toLocaleString()} COP. Referencia: ${data.referencia}`, "success");

            // Recargar historial para mostrar el nuevo depósito
            await cargarHistorialDepositos();

            // Actualizar saldo del usuario localmente
            setUsuario(prev => prev ? {
                ...prev,
                saldo: data.nuevo_saldo || prev.saldo
            } : null);

            // Limpiar formulario
            setMonto(0);
            setMetodoPago("");
            setComprobante(null);
            setPreviewUrl("");

        } catch (err: any) {
            console.error("Error en depósito:", err);

            if (err.response?.status === 401) {
                showMsg("Tu sesión ha expirado", "error");
                setTimeout(() => {
                    localStorage.removeItem("token");
                    cerrarSesion();
                    navigate('/login');
                }, 2000);
            } else {
                showMsg(err.response?.data?.detail || "Error al procesar el depósito", "error");
            }
        } finally {
            setCargando(false);
        }
    };

    // Función para formatear la fecha
    const formatearFecha = (fechaString: string) => {
        try {
            const fecha = new Date(fechaString);
            return fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return fechaString;
        }
    };

    // Obtener nombre del método de pago
    const getMetodoNombre = (metodoId: string) => {
        const metodo = metodosPago.find(m => m.id === metodoId);
        return metodo ? metodo.nombre : metodoId;
    };

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

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"></div>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-green-500 to-blue-500 rounded-full blur-3xl opacity-20"></div>

                <div className="container mx-auto px-4 py-12 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-block mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-full text-sm font-bold text-yellow-400">
                                💰 DEPÓSITO SEGURO
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                                ¡Recarga tu cuenta!
                            </span>
                            <br />
                            <span className="text-white">Deposita fondos de forma rápida y segura</span>
                        </h1>

                        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                            Deposita desde <span className="text-yellow-400 font-bold">$10,000</span> hasta <span className="text-yellow-400 font-bold">$1,000,000</span>.
                            <span className="text-green-400 font-bold"> ¡Usuarios verificados no requieren comprobante!</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* Contenido Principal */}
            <section className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Formulario de depósito */}
                        <div className="lg:col-span-2">
                            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
                                <form onSubmit={handleSubmit}>
                                    {/* Monto */}
                                    <div className="mb-6">
                                        <label className="block text-gray-300 mb-3 font-medium">
                                            Monto a depositar (COP)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                value={monto || ""}
                                                onChange={(e) => setMonto(Number(e.target.value))}
                                                className="w-full pl-10 pr-4 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white text-lg focus:outline-none focus:border-yellow-500 transition"
                                                placeholder="Ej: 100000"
                                                min="10000"
                                                max="1000000"
                                                step="1000"
                                                required
                                            />
                                        </div>
                                        <div className="mt-2">
                                            <p className={`text-sm ${monto >= 10000 && monto <= 1000000 ? 'text-green-400' : 'text-red-400'}`}>
                                                {monto > 0 && (
                                                    <>
                                                        {monto < 10000 ? '❌ Monto mínimo: $10,000 COP' :
                                                            monto > 1000000 ? '❌ Monto máximo: $1,000,000 COP' :
                                                                '✅ Monto válido'}
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {[10000, 50000, 100000, 200000, 500000, 1000000].map((valor) => (
                                                <button
                                                    key={valor}
                                                    type="button"
                                                    onClick={() => setMonto(valor)}
                                                    className={`px-3 py-2 rounded-lg text-sm transition ${monto === valor
                                                        ? 'bg-yellow-600 text-white'
                                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                                        }`}
                                                >
                                                    ${valor.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Método de pago */}
                                    <div className="mb-6">
                                        <label className="block text-gray-300 mb-3 font-medium">
                                            Método de pago
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {metodosPago.map((metodo) => (
                                                <button
                                                    key={metodo.id}
                                                    type="button"
                                                    onClick={() => setMetodoPago(metodo.id)}
                                                    className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center ${metodoPago === metodo.id
                                                        ? 'border-yellow-500 bg-yellow-500/10'
                                                        : 'border-gray-700 bg-white hover:border-gray-600'
                                                        }`}
                                                >
                                                    <span className="text-2xl mb-2">{metodo.icon}</span>
                                                    <span className="text-sm font-medium">{metodo.nombre}</span>
                                                    <span className="text-sm font-medium">{metodo.cuenta}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-2">
                                            <p className={`text-sm ${metodoPago ? 'text-green-400' : 'text-red-400'}`}>
                                                {metodoPago ? '✅ Método seleccionado' : '❌ Selecciona un método de pago'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Comprobante (solo para NO verificados) */}
                                    {usuario?.verificado && (
                                        <div className="mb-6">
                                            <label className="block text-gray-300 mb-3 font-medium">
                                                Comprobante de pago <span className="text-red-400">*</span>
                                            </label>
                                            <div className={`border-2 ${comprobante ? 'border-green-500' : 'border-gray-700'} border-dashed rounded-xl p-6 text-center hover:border-yellow-500 transition`}>
                                                <input
                                                    type="file"
                                                    id="comprobante"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                    required={usuario?.verificado}
                                                />
                                                <label htmlFor="comprobante" className="cursor-pointer block">
                                                    {previewUrl ? (
                                                        <div className="space-y-3">
                                                            <img
                                                                src={previewUrl}
                                                                alt="Comprobante"
                                                                className="max-w-full max-h-48 mx-auto rounded-lg"
                                                            />
                                                            <p className="text-green-400 font-medium">✅ Imagen cargada</p>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setComprobante(null);
                                                                    setPreviewUrl("");
                                                                }}
                                                                className="text-sm text-red-400 hover:text-red-300"
                                                            >
                                                                Cambiar imagen
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="text-4xl">📷</div>
                                                            <div>
                                                                <p className="font-medium">Sube tu comprobante</p>
                                                                <p className="text-sm text-gray-400 mt-1">
                                                                    Toma una foto clara de tu transferencia
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                            <div className="mt-2">
                                                <p className={`text-sm ${comprobante ? 'text-green-400' : 'text-red-400'}`}>
                                                    {comprobante ? '✅ Comprobante cargado' : '❌ Comprobante requerido'}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Solo se aceptan imágenes (JPG, PNG) hasta 5MB
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Indicador de validación del formulario */}
                                    <div className="mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">Estado del formulario:</span>
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${formularioValido ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                                                {formularioValido ? '✅ Listo para depositar' : '⚠️ Campos pendientes'}
                                            </span>
                                        </div>
                                        <ul className="text-sm space-y-1 text-gray-400">
                                            <li className={monto >= 10000 && monto <= 1000000 ? 'text-green-400' : 'text-gray-500'}>
                                                • Monto válido (entre $10,000 y $1,000,000 COP)
                                            </li>
                                            <li className={metodoPago ? 'text-green-400' : 'text-gray-500'}>
                                                • Método de pago seleccionado
                                            </li>
                                            {usuario?.verificado && (
                                                <li className={comprobante ? 'text-green-400' : 'text-gray-500'}>
                                                    • Comprobante cargado
                                                </li>
                                            )}
                                        </ul>
                                    </div>

                                    {/* Botón de envío */}
                                    <button
                                        type="submit"
                                        disabled={!formularioValido || cargando || !comprobante}
                                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${(!formularioValido || cargando)
                                            ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                                            : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 hover:scale-[1.02] text-white'
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
                                            `Depositar $${monto > 0 ? monto.toLocaleString() : ''} COP`
                                        )}
                                    </button>

                                    {/* Mensaje informativo si el botón está deshabilitado */}
                                    {!formularioValido && !cargando && !comprobante && (
                                        <p className="text-center text-yellow-400 text-sm mt-3">
                                            ⚠️ Completa todos los campos requeridos para habilitar el depósito
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
                                        <p className="text-gray-400 text-sm">Saldo actual</p>
                                        <p className="text-2xl font-bold text-yellow-400">
                                            ${usuario?.saldo?.toLocaleString() || 0} COP
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Estado de verificación</p>
                                        <p className={`font-medium ${usuario?.verificado
                                            ? 'text-green-400'
                                            : usuario?.verificado_pendiente
                                                ? 'text-blue-400'
                                                : 'text-yellow-400'
                                            }`}>
                                            {usuario?.verificado
                                                ? '✅ Verificado'
                                                : usuario?.verificado_pendiente
                                                    ? '⏳ En verificación'
                                                    : '❌ No verificado'}
                                        </p>
                                        {usuario?.verificado && (
                                            <p className="text-xs text-yellow-400 mt-1">
                                                Requieres comprobante para depositar
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Límites de depósito</p>
                                        <p className="text-sm">Mínimo: $10,000 COP</p>
                                        <p className="text-sm">Máximo: $1,000,000 COP</p>
                                    </div>
                                </div>
                            </div>

                            {/* Historial de depósitos */}
                            <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Historial de depósitos</h3>
                                    <button
                                        onClick={() => setMostrarHistorial(!mostrarHistorial)}
                                        className="text-gray-400 hover:text-white text-sm"
                                    >
                                        {mostrarHistorial ? 'Mostrar menos' : 'Ver todo'}
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {historialDepositos.length > 0 ? (
                                        (mostrarHistorial ? historialDepositos : historialDepositos.slice(0, 3)).map((deposito) => (
                                            <div
                                                key={deposito.id}
                                                className="p-4 bg-gray-900/50 rounded-lg hover:bg-gray-800/50 transition cursor-pointer"
                                                onClick={() => {
                                                    // Puedes agregar un modal de detalles aquí
                                                    console.log("Detalle depósito:", deposito);
                                                }}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <div>
                                                        <p className="font-bold text-lg text-yellow-400">
                                                            ${deposito.monto.toLocaleString()} COP
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {formatearFecha(deposito.fecha_solicitud)}
                                                        </p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${deposito.estado === "APROBADO"
                                                        ? 'bg-green-900/50 text-green-400 border border-green-700/50'
                                                        : deposito.estado === "RECHAZADO"
                                                            ? 'bg-red-900/50 text-red-400 border border-red-700/50'
                                                            : 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/50'
                                                        }`}>
                                                        {deposito.estado}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <div>
                                                        <span className="text-gray-400">Método: </span>
                                                        <span className="text-white">{getMetodoNombre(deposito.metodo_pago)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400">Ref: </span>
                                                        <span className="text-white">{deposito.referencia}</span>
                                                    </div>
                                                </div>
                                                {deposito.fecha_procesamiento && (
                                                    <div className="mt-2 text-xs text-gray-500">
                                                        Procesado: {formatearFecha(deposito.fecha_procesamiento)}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6">
                                            <div className="text-4xl mb-3">📊</div>
                                            <p className="text-gray-500">No hay depósitos registrados</p>
                                            <p className="text-sm text-gray-600 mt-1">Realiza tu primer depósito</p>
                                        </div>
                                    )}
                                </div>

                                {/* Botón para recargar historial */}
                                <button
                                    onClick={cargarHistorialDepositos}
                                    className="w-full mt-4 py-2 px-4 bg-gray-900/50 hover:bg-gray-800/70 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition border border-gray-700/50"
                                >
                                    ↻ Actualizar historial
                                </button>
                            </div>

                            {/* Info adicional */}
                            <div className="bg-blue-900/20 border border-blue-800/50 rounded-2xl p-6">
                                <div className="flex items-start space-x-3">
                                    <div className="text-2xl">💡</div>
                                    <div>
                                        <h4 className="font-bold text-blue-300">Información importante</h4>
                                        <ul className="text-sm text-blue-200/80 space-y-2 mt-2">
                                            <li>• Los depósitos se procesan en 1-24 horas</li>
                                            <li>• Mantén tu comprobante por seguridad</li>
                                            <li>• Para ayuda, contacta a soporte</li>
                                        </ul>
                                    </div>
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

export default Deposito;