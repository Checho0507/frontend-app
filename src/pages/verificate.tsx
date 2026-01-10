import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';
import Footer from '../components/footer';
import { API_URL } from '../api/auth';

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    email?: string;
    fecha_verificacion?: string;
    nivel?: string;
    avatar?: string;
    verificacion_pendiente?: boolean;
}

const Verificate: React.FC = () => {
    const navigate = useNavigate();
    const [archivo, setArchivo] = useState<File | null>(null);
    const [imagenPreview, setImagenPreview] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState<'success' | 'error' | ''>('');
    const [subiendo, setSubiendo] = useState(false);
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);
    const [pasoActual, setPasoActual] = useState(1);
    const [mostrarTutorial, setMostrarTutorial] = useState(false);
    const [copiado, setCopiado] = useState(false);
    const [comprobanteEnviado, setComprobanteEnviado] = useState(false);
    const [tiempoRestante, setTiempoRestante] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ✅ useEffect principal CORREGIDO
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate('/login');
            return;
        }

        axios.get(`${API_URL}/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then(res => {
                const userData = res.data;
                console.log("=== DATOS DEL USUARIO ===");
                console.log("Usuario completo:", userData);
                console.log("verificado:", userData.verificado);
                console.log("verificacion_pendiente:", userData.verificacion_pendiente);
                console.log("========================");
                
                setUsuario(userData);
                localStorage.setItem("usuario", JSON.stringify(userData));
                
                // Lógica corregida para determinar el paso actual
                if (userData.verificado === true) {
                    console.log("✅ Usuario VERIFICADO -> Paso 4");
                    setPasoActual(4);
                    setComprobanteEnviado(true);
                    // Limpiar localStorage de estado pendiente
                    localStorage.removeItem('comprobante_enviado');
                    localStorage.removeItem('fecha_envio_comprobante');
                }
                else if (userData.verificacion_pendiente === true) {
                    console.log("⏳ Usuario con VERIFICACIÓN PENDIENTE -> Paso 3");
                    setPasoActual(3);
                    setComprobanteEnviado(true);
                    // Asegurar que localStorage también refleje esto
                    localStorage.setItem('comprobante_enviado', 'true');
                }
                else if (localStorage.getItem('comprobante_enviado') === 'true') {
                    console.log("📋 Comprobante enviado (localStorage) -> Paso 3");
                    setPasoActual(3);
                    setComprobanteEnviado(true);
                }
                else {
                    console.log("🆕 Usuario NUEVO -> Paso 1");
                    setPasoActual(1);
                    setComprobanteEnviado(false);
                }
                
                setLoading(false);
            })
            .catch((error) => {
                console.error("❌ Error obteniendo datos del usuario:", error);
                setUsuario(null);
                setLoading(false);
                navigate('/login');
            });
    }, [navigate]);

    // ✅ Polling periódico para verificar cambios de estado
    useEffect(() => {
        if (pasoActual === 3 && usuario && !usuario.verificado) {
            // Verificar cada 30 segundos si el estado cambió
            const interval = setInterval(() => {
                const token = localStorage.getItem("token");
                if (token) {
                    axios.get(`${API_URL}/me`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    })
                    .then(res => {
                        const userData = res.data;
                        console.log("🔄 Verificación periódica:", userData);
                        
                        // Si fue verificado, actualizar
                        if (userData.verificado === true) {
                            console.log("🎉 ¡Usuario verificado! Actualizando interfaz...");
                            setUsuario(userData);
                            localStorage.setItem("usuario", JSON.stringify(userData));
                            setPasoActual(4);
                            
                            // Mostrar mensaje de éxito
                            setMensaje("🎉 ¡Tu cuenta ha sido verificada exitosamente!");
                            setTipoMensaje("success");
                        }
                        // Si aún está pendiente, actualizar datos
                        else if (userData.verificacion_pendiente === true) {
                            setUsuario(userData);
                            localStorage.setItem("usuario", JSON.stringify(userData));
                        }
                    })
                    .catch(err => {
                        console.error("Error en verificación periódica:", err);
                    });
                }
            }, 30000); // 30 segundos

            return () => clearInterval(interval);
        }
    }, [pasoActual, usuario]);

    useEffect(() => {
        if (pasoActual === 3) {
            const horasRestantes = Math.floor(Math.random() * 24) + 1;
            const minutosRestantes = Math.floor(Math.random() * 60);
            setTiempoRestante(`${horasRestantes}h ${minutosRestantes}m`);
            
            const interval = setInterval(() => {
                const nuevasHoras = Math.floor(Math.random() * 24) + 1;
                const nuevosMinutos = Math.floor(Math.random() * 60);
                setTiempoRestante(`${nuevasHoras}h ${nuevosMinutos}m`);
            }, 30000);
            
            return () => clearInterval(interval);
        }
    }, [pasoActual]);

    const handleArchivoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setArchivo(file);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagenPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const file = e.dataTransfer.files[0];
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
            setArchivo(file);
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagenPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setImagenPreview(null);
            }
        }
    };

    // ✅ handleSubmit CORREGIDO
    const handleSubmit = async () => {
        if (!archivo) {
            setMensaje("⚠️ Por favor selecciona un comprobante.");
            setTipoMensaje("error");
            return;
        }

        const formData = new FormData();
        formData.append("archivo", archivo);

        setSubiendo(true);
        try {
            const token = localStorage.getItem("token");
            const response = await axios.post(`${API_URL}/verificate/verificate`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            console.log("✅ Respuesta del servidor:", response.data);

            setMensaje("✅ " + response.data.mensaje);
            setTipoMensaje("success");
            setArchivo(null);
            setImagenPreview(null);
            setComprobanteEnviado(true);

            // Actualizar localStorage
            localStorage.setItem('comprobante_enviado', 'true');
            localStorage.setItem('fecha_envio_comprobante', new Date().toISOString());

            // Cambiar al paso 3
            setPasoActual(3);

            // Actualizar el estado del usuario
            if (usuario) {
                const updatedUser = { 
                    ...usuario, 
                    verificacion_pendiente: true 
                };
                setUsuario(updatedUser);
                localStorage.setItem("usuario", JSON.stringify(updatedUser));
                console.log("✅ Usuario actualizado con verificacion_pendiente: true");
            }

            // Recargar datos del usuario desde el servidor para confirmar
            setTimeout(() => {
                axios.get(`${API_URL}/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })
                .then(res => {
                    console.log("🔄 Datos actualizados del servidor:", res.data);
                    setUsuario(res.data);
                    localStorage.setItem("usuario", JSON.stringify(res.data));
                    
                    // Asegurar que estamos en el paso 3
                    if (res.data.verificacion_pendiente === true && res.data.verificado === false) {
                        setPasoActual(3);
                        console.log("✅ Confirmado: Paso 3 activado");
                    }
                })
                .catch(err => {
                    console.error("❌ Error recargando usuario:", err);
                });
            }, 1000);

            setMensaje("⏳ Tu comprobante está en revisión. Te notificaremos cuando sea aprobado.");

        } catch (error: unknown) {
            console.error("❌ Error al subir comprobante:", error);
            const errorMsg = error || "Error al subir el comprobante. Inténtalo nuevamente.";
            setMensaje("❌ " + errorMsg);
            setTipoMensaje("error");
        } finally {
            setSubiendo(false);
        }
    };

    const copiarCodigoReferido = () => {
        if (usuario) {
            navigator.clipboard.writeText(usuario.id.toString());
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        }
    };

    const avanzarAlPaso2 = () => {
        setPasoActual(2);
    };

    const cerrarSesion = () => {
        setUsuario(null);
    };

    // ✅ Función de depuración mejorada
    const verificarEstado = () => {
        console.log("=== ESTADO ACTUAL COMPLETO ===");
        console.log("Usuario:", usuario);
        console.log("pasoActual:", pasoActual);
        console.log("verificacion_pendiente:", usuario?.verificacion_pendiente);
        console.log("verificado:", usuario?.verificado);
        console.log("comprobanteEnviado:", comprobanteEnviado);
        console.log("localStorage comprobante_enviado:", localStorage.getItem('comprobante_enviado'));
        console.log("localStorage usuario:", JSON.parse(localStorage.getItem('usuario') || '{}'));
        console.log("==============================");
        
        // Forzar recarga desde el servidor
        const token = localStorage.getItem("token");
        if (token) {
            axios.get(`${API_URL}/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }).then(res => {
                console.log("🔄 DATOS FRESCOS DEL SERVIDOR:", res.data);
            }).catch(err => {
                console.error("❌ Error obteniendo datos frescos:", err);
            });
        }
    };
    verificarEstado();

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando tu perfil...</p>
                </div>
            </div>
        );
    }

    // 🔥 VISTA PARA USUARIO YA VERIFICADO (Paso 4)
    if (usuario && usuario.verificado === true) {
        const getNivelUsuario = () => {
            if (!usuario) return 'BRONCE';
            if (usuario.saldo >= 5000000) return 'DIAMANTE';
            if (usuario.saldo >= 1000000) return 'PLATINO';
            if (usuario.saldo >= 500000) return 'ORO';
            if (usuario.saldo >= 100000) return 'PLATA';
            return 'BRONCE';
        };

        const nivel = getNivelUsuario();
        const colorNivel = {
            'BRONCE': 'from-yellow-900 to-yellow-700',
            'PLATA': 'from-gray-300 to-gray-400',
            'ORO': 'from-yellow-500 to-yellow-600',
            'PLATINO': 'from-gray-100 to-gray-300',
            'DIAMANTE': 'from-blue-300 to-purple-400'
        }[nivel];

        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                {/* Header Premium */}
                <Header 
                    usuario={usuario}
                    cerrarSesion={cerrarSesion}
                    setUsuario={setUsuario}
                />

                <main className="container mx-auto px-4 py-8">
                    {/* Banner de Bienvenida Premium */}
                    <div className="bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                        <div className="flex flex-col md:flex-row items-center justify-between">
                            <div className="flex items-center space-x-4 mb-4 md:mb-0">
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full flex items-center justify-center shadow-xl">
                                    <span className="text-2xl">👑</span>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">¡Bienvenido al Club Premium!</h1>
                                    <p className="text-gray-300">Tu cuenta está verificada y activa</p>
                                </div>
                            </div>
                            <div className="bg-black/30 rounded-xl p-4 border border-gray-700">
                                <p className="text-sm text-gray-400">Nivel Actual</p>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-3 py-1 bg-gradient-to-r ${colorNivel} rounded-full font-bold`}>
                                        {nivel}
                                    </span>
                                    <span className="text-yellow-400 text-sm">${usuario.saldo.toLocaleString()} / $5,000,000</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grid de Beneficios Premium */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-green-500 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-2xl">💰</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Comisiones VIP</h3>
                            <p className="text-gray-400 text-sm">Solo <span className="text-green-400 font-bold">2%</span> en todas tus transacciones</p>
                        </div>

                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-2xl">⚡</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Retiros Instantáneos</h3>
                            <p className="text-gray-400 text-sm">Hasta <span className="text-green-400 font-bold">$50,000</span> en segundos</p>
                        </div>

                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-2xl">🎁</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Bonos Exclusivos</h3>
                            <p className="text-gray-400 text-sm"><span className="text-green-400 font-bold">+15%</span> extra en depósitos</p>
                        </div>

                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-2xl">🏆</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Sorteos VIP</h3>
                            <p className="text-gray-400 text-sm">Premios de hasta <span className="text-green-400 font-bold">$1,000,000</span></p>
                        </div>
                    </div>

                    {/* Panel de Referidos */}
                    <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/30 mb-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">🎯 Sistema de Referidos</h2>
                                <p className="text-gray-400">Invita amigos y gana comisiones por cada uno</p>
                            </div>
                            <div className="mt-4 md:mt-0">
                                <div className="bg-black/40 rounded-xl p-4">
                                    <p className="text-sm text-gray-400">Tu código de referido</p>
                                    <div className="flex items-center space-x-3 mt-2">
                                        <div className="bg-gray-900 px-4 py-2 rounded-lg font-mono text-lg font-bold text-yellow-400">
                                            REF-{usuario.id.toString().padStart(6, '0')}
                                        </div>
                                        <button
                                            onClick={copiarCodigoReferido}
                                            className="bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-4 py-2 rounded-lg font-bold transition-all duration-300"
                                        >
                                            {copiado ? '✓ Copiado' : '📋 Copiar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-black/30 rounded-xl p-6 border border-gray-700/50">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-2xl">👥</span>
                                    <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-sm font-bold">ACTIVO</span>
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2">Comisión por Referido</h4>
                                <p className="text-3xl font-bold text-yellow-400">15%</p>
                                <p className="text-gray-400 text-sm mt-2">De las ganancias de cada referido</p>
                            </div>

                            <div className="bg-black/30 rounded-xl p-6 border border-gray-700/50">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-2xl">💰</span>
                                    <span className="px-3 py-1 bg-blue-900/50 text-blue-400 rounded-full text-sm font-bold">BONO</span>
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2">Bono de Bienvenida</h4>
                                <p className="text-3xl font-bold text-yellow-400">$10,000</p>
                                <p className="text-gray-400 text-sm mt-2">Para cada referido que se verifique</p>
                            </div>

                            <div className="bg-black/30 rounded-xl p-6 border border-gray-700/50">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-2xl">📈</span>
                                    <span className="px-3 py-1 bg-purple-900/50 text-purple-400 rounded-full text-sm font-bold">VIP</span>
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2">Nivel Premium</h4>
                                <p className="text-3xl font-bold text-yellow-400">Nivel {nivel}</p>
                                <p className="text-gray-400 text-sm mt-2">Mayores comisiones por nivel</p>
                            </div>
                        </div>
                    </div>

                    {/* Información de Verificación */}
                    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">📋 Información de Verificación</h3>
                            <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-sm font-bold">
                                VERIFICADO
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-gray-400 mb-2">Fecha de verificación</p>
                                <p className="text-white font-bold">
                                    {usuario.fecha_verificacion 
                                        ? new Date(usuario.fecha_verificacion).toLocaleDateString('es-ES', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })
                                        : 'Fecha no disponible'
                                    }
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-2">Estado de cuenta</p>
                                <p className="text-green-400 font-bold">✓ Cuenta Premium Activa</p>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <Footer />
            </div>
        );
    }

    // 🔥 VISTA PARA USUARIO NO VERIFICADO
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {/* Header */}
            <Header 
                usuario={usuario}
                cerrarSesion={cerrarSesion}
                setUsuario={setUsuario}
            />

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Banner de Verificación */}
                <div className="bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-2xl p-8 mb-8 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                        <div className="flex items-center space-x-4 mb-4 md:mb-0">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full flex items-center justify-center shadow-xl">
                                <span className="text-2xl">
                                    {pasoActual === 1 ? '🔒' : 
                                     pasoActual === 2 ? '📤' : 
                                     pasoActual === 3 ? '⏳' : '✅'}
                                </span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    {pasoActual === 1 ? '¡Desbloquea el Poder Premium!' :
                                     pasoActual === 2 ? 'Sube tu Comprobante' :
                                     pasoActual === 3 ? 'Verificación en Proceso' :
                                     '¡Cuenta Verificada!'}
                                </h1>
                                <p className="text-gray-300">
                                    {pasoActual === 1 ? 'Verifica tu cuenta en 4 simples pasos' :
                                     pasoActual === 2 ? 'Estás en el paso 2 de 4' :
                                     pasoActual === 3 ? 'Tu comprobante está en revisión' :
                                     'Disfruta de todos los beneficios premium'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setMostrarTutorial(!mostrarTutorial)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center space-x-2"
                        >
                            <span>{mostrarTutorial ? '📖 Ocultar Guía' : '📖 Ver Guía Completa'}</span>
                        </button>
                    </div>

                    {/* Tutorial Expandible */}
                    {mostrarTutorial && (
                        <div className="bg-black/40 rounded-xl p-6 border border-gray-700/50 mt-4">
                            <h3 className="text-lg font-bold text-white mb-4">📚 Guía de Verificación Paso a Paso</h3>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="font-bold">1</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Toma una foto</p>
                                        <p className="text-gray-400 text-sm">Toma una foto clara de tu documento de identidad</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="font-bold">2</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Sube una foto</p>
                                        <p className="text-gray-400 text-sm">Sube la foto de tu documento de identidad</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="font-bold">3</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">Revisión manual</p>
                                        <p className="text-gray-400 text-sm">Nuestro equipo verificará tu documento en 24-48 horas</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="font-bold">4</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">¡Cuenta Premium!</p>
                                        <p className="text-gray-400 text-sm">Recibirás notificación y acceso completo a funciones VIP</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Progreso de Verificación */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Progreso de Verificación</h2>
                        <span className="px-3 py-1 bg-yellow-900/50 text-yellow-400 rounded-full text-sm font-bold">
                            Paso {pasoActual} de 4
                        </span>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-full h-3 mb-6 overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${
                                pasoActual === 1 ? 'w-1/4 bg-yellow-500' :
                                pasoActual === 2 ? 'w-2/4 bg-yellow-500' :
                                pasoActual === 3 ? 'w-3/4 bg-blue-500' :
                                'w-full bg-green-500'
                            }`}
                        ></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { paso: 1, titulo: 'Toma una foto', subtitulo: 'Toma una foto de tu documento', color: 'yellow' },
                            { paso: 2, titulo: 'Sube la foto', subtitulo: 'Sube la foto de tu documento', color: 'yellow' },
                            { paso: 3, titulo: 'Revisión', subtitulo: 'Validando datos', color: 'blue' },
                            { paso: 4, titulo: '¡Premium!', subtitulo: 'Cuenta verificada', color: 'green' }
                        ].map(({ paso, titulo, subtitulo, color }) => (
                            <div 
                                key={paso}
                                className={`p-4 rounded-xl border transition-all duration-300 ${
                                    paso < pasoActual 
                                        ? `bg-gradient-to-br from-${color}-600/20 to-${color}-500/20 border-${color}-500/50` 
                                        : paso === pasoActual 
                                        ? `bg-gradient-to-br from-${color}-600/30 to-${color}-500/30 border-${color}-500 shadow-lg` 
                                        : 'bg-gray-800/30 border-gray-700/50'
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        paso < pasoActual 
                                            ? `bg-gradient-to-br from-${color}-500 to-${color}-600` 
                                            : paso === pasoActual 
                                            ? `bg-gradient-to-br from-${color}-400 to-${color}-500 animate-pulse` 
                                            : 'bg-gray-700'
                                    }`}>
                                        <span className="font-bold">{paso}</span>
                                    </div>
                                    <div>
                                        <p className={`font-bold ${
                                            paso <= pasoActual ? 'text-white' : 'text-gray-500'
                                        }`}>
                                            {titulo}
                                        </p>
                                        <p className="text-xs text-gray-400">{subtitulo}</p>
                                        {paso === 3 && pasoActual === 3 && tiempoRestante && (
                                            <p className="text-xs text-blue-400 mt-1">⏳ Tiempo estimado: {tiempoRestante}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 🔥 PASO 1: Solo si pasoActual es 1 Y NO tiene verificación pendiente */}
                {pasoActual === 1 && (
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30 mb-8">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                            <span className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">1</span>
                            Toma una foto de tu documento de identidad
                        </h3>

                        <p className='text-gray-400'>

                        </p>
                        
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-600/20 to-green-600/20 rounded-xl border border-yellow-500/30">
                            <div className="flex items-center space-x-3">
                                <span className="text-2xl">💡</span>
                                <div>
                                    <p className="font-bold text-white">¿Ya tomaste la foto?</p>
                                    <p className="text-gray-400 text-sm">Continúa con el siguiente paso</p>
                                </div>
                            </div>
                            <button
                                onClick={avanzarAlPaso2}
                                className="bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-6 py-2 rounded-lg font-bold transition-all duration-300"
                            >
                                Continuar al Paso 2 →
                            </button>
                        </div>
                    </div>
                )}

                {/* 🔥 PASO 2: Solo si pasoActual es 2 */}
                {pasoActual === 2 && (
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30 mb-8">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                            <span className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">2</span>
                            Subir la foto de tu documento de identidad
                        </h3>
                        
                        <div 
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                                archivo ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-yellow-500'
                            }`}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleArchivoChange}
                                className="hidden"
                            />
                            
                            <div className="space-y-4">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-500/20 to-green-500/20 rounded-full flex items-center justify-center">
                                    <span className="text-3xl">📁</span>
                                </div>
                                
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        {archivo ? '✅ Archivo Listo' : 'Sube tu foto o PDF del documento'}
                                    </h3>
                                    <p className="text-gray-400 mb-4">
                                        {archivo 
                                            ? `${archivo.name} - ${(archivo.size / 1024).toFixed(2)} KB`
                                            : 'Arrastra o haz clic para seleccionar tu foto o PDF del documento'
                                        }
                                    </p>
                                </div>

                                {imagenPreview && (
                                    <div className="max-w-md mx-auto">
                                        <div className="relative">
                                            <img 
                                                src={imagenPreview} 
                                                alt="Vista previa" 
                                                className="rounded-lg w-full max-h-48 object-contain"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setArchivo(null);
                                                    setImagenPreview(null);
                                                }}
                                                className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button className="bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300">
                                    {archivo ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
                                </button>
                            </div>
                        </div>

                        {archivo && (
                            <div className="mt-6 flex justify-center">
                                <button
                                    onClick={handleSubmit}
                                    disabled={subiendo}
                                    className={`px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
                                        subiendo
                                            ? 'bg-gray-600 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 hover:scale-105'
                                    }`}
                                >
                                    {subiendo ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Subiendo...</span>
                                        </div>
                                    ) : (
                                        '📤 Enviar para Verificación'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* 🔥 PASO 3: Solo si pasoActual es 3 (esto se activa automáticamente si verificacion_pendiente es true) */}
                {pasoActual === 3 && (
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/30 mb-8">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                            <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3 animate-pulse">3</span>
                            Revisión Manual en Proceso
                        </h3>
                        
                        <div className="bg-black/40 rounded-xl p-6 mb-6 border border-blue-500/30">
                            <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
                                        <span className="text-2xl">⏳</span>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-white">Documento en Revisión</h4>
                                        <p className="text-gray-400">Tu documento está siendo verificado por nuestro equipo</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-400">24-48</div>
                                    <div className="text-gray-400 text-sm">Horas estimadas</div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3 p-3 bg-blue-900/20 rounded-lg">
                                    <span className="text-blue-400">📋</span>
                                    <div>
                                        <p className="font-bold text-white">Estado actual</p>
                                        <p className="text-gray-400 text-sm">En espera de revisión por administrador</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-3 p-3 bg-blue-900/20 rounded-lg">
                                    <span className="text-blue-400">👁️</span>
                                    <div>
                                        <p className="font-bold text-white">¿Qué estamos verificando?</p>
                                        <p className="text-gray-400 text-sm">Que la foto del documento de identidad sea clara y legible</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-3 p-3 bg-blue-900/20 rounded-lg">
                                    <span className="text-blue-400">📧</span>
                                    <div>
                                        <p className="font-bold text-white">Notificaciones</p>
                                        <p className="text-gray-400 text-sm">Te notificaremos por correo cuando tu cuenta sea verificada</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30">
                            <div className="flex items-center space-x-3">
                                <span className="text-2xl">💡</span>
                                <div>
                                    <p className="font-bold text-white">Mientras tanto...</p>
                                    <p className="text-gray-400 text-sm">Puedes explorar las funciones básicas de la plataforma</p>
                                </div>
                            </div>
                            <a
                                href="/inicio"
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-bold transition-all duration-300"
                            >
                                Ir al Inicio
                            </a>
                        </div>
                    </div>
                )}

                {/* Mensajes de Estado */}
                {mensaje && (
                    <div className={`rounded-xl p-4 mb-6 ${
                        tipoMensaje === 'success' 
                            ? 'bg-green-900/30 border border-green-500/50' 
                            : 'bg-red-900/30 border border-red-500/50'
                    }`}>
                        <div className="flex items-center space-x-3">
                            <span className="text-xl">
                                {tipoMensaje === 'success' ? '✅' : '❌'}
                            </span>
                            <p className="text-white">{mensaje}</p>
                        </div>
                    </div>
                )}

                {/* Beneficios de Verificación */}
                <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">🌟 Beneficios que Obtendrás</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-black/40 rounded-xl p-6 border border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-green-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <span className="text-xl">💰</span>
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 text-center">Comisiones VIP</h4>
                            <p className="text-gray-400 text-sm text-center">Solo 2% en todas las transacciones</p>
                        </div>

                        <div className="bg-black/40 rounded-xl p-6 border border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <span className="text-xl">⚡</span>
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 text-center">Retiros Rápidos</h4>
                            <p className="text-gray-400 text-sm text-center">Hasta $50,000 en segundos</p>
                        </div>

                        <div className="bg-black/40 rounded-xl p-6 border border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <span className="text-xl">🎁</span>
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 text-center">Bonos Exclusivos</h4>
                            <p className="text-gray-400 text-sm text-center">+15% extra en depósitos</p>
                        </div>

                        <div className="bg-black/40 rounded-xl p-6 border border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <span className="text-xl">🏆</span>
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 text-center">Sorteos VIP</h4>
                            <p className="text-gray-400 text-sm text-center">Premios millonarios</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default Verificate;