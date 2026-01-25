import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
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

interface VerificacionResponse {
    ok: boolean;
    mensaje: string;
    email: string;
    verificado: boolean;
    saldo: number;
}

const VerificacionPage: React.FC = () => {
    const navigate = useNavigate();
    const { user_id } = useParams<{ user_id: string }>();
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);
    const [verificando, setVerificando] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState<'success' | 'error' | 'info'>('info');
    const [verificacionCompleta, setVerificacionCompleta] = useState(false);

    // Verificar si el usuario está logueado y obtener sus datos
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            axios.get(`${API_URL}/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            .then(res => {
                setUsuario(res.data);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    // Verificar la cuenta cuando se carga la página
    useEffect(() => {
        const verificarCuenta = async () => {
            if (!user_id || verificacionCompleta) return;

            setVerificando(true);
            setMensaje('Verificando tu cuenta...');
            setTipoMensaje('info');

            try {
                const response = await axios.post<VerificacionResponse>(
                    `${API_URL}/admin/verificacion/${user_id}`
                );

                if (response.data.ok) {
                    setMensaje(response.data.mensaje || '✅ ¡Tu cuenta ha sido verificada exitosamente!');
                    setTipoMensaje('success');
                    
                    // Actualizar el usuario actual si está logueado
                    if (usuario) {
                        const updatedUser = {
                            ...usuario,
                            verificado: true,
                            saldo: response.data.saldo,
                            verificacion_pendiente: false
                        };
                        setUsuario(updatedUser);
                        
                        // Actualizar localStorage
                        const storedUser = localStorage.getItem("usuario");
                        if (storedUser) {
                            const parsedUser = JSON.parse(storedUser);
                            localStorage.setItem("usuario", JSON.stringify({
                                ...parsedUser,
                                verificado: true,
                                saldo: response.data.saldo,
                                verificacion_pendiente: false
                            }));
                        }
                    }
                    
                    setVerificacionCompleta(true);
                    
                    // Mostrar detalles del bonus
                    setTimeout(() => {
                        setMensaje(prev => prev + `\n\n💰 Bonus recibido: $${response.data.saldo.toLocaleString()} COP`);
                    }, 1000);
                }
            } catch (error: any) {
                console.error('Error verificando cuenta:', error);
                
                if (error.response) {
                    switch (error.response.status) {
                        case 404:
                            setMensaje('❌ Usuario no encontrado. El enlace de verificación es inválido.');
                            break;
                        case 400:
                            if (error.response.data.detail === "Usuario ya verificado") {
                                setMensaje('✅ Este usuario ya está verificado. Puedes iniciar sesión normalmente.');
                                setTipoMensaje('success');
                                setVerificacionCompleta(true);
                            } else if (error.response.data.detail === "Usuario sin email") {
                                setMensaje('❌ El usuario no tiene un email registrado.');
                            } else {
                                setMensaje(`❌ Error: ${error.response.data.detail}`);
                            }
                            break;
                        case 403:
                            setMensaje('❌ No tienes permiso para realizar esta acción.');
                            break;
                        case 401:
                            setMensaje('⚠️ Se requiere autenticación de administrador para esta acción.');
                            break;
                        default:
                            setMensaje(`❌ Error del servidor: ${error.response.data.detail || 'Error desconocido'}`);
                    }
                } else if (error.request) {
                    setMensaje('❌ No se pudo conectar con el servidor. Verifica tu conexión a internet.');
                } else {
                    setMensaje('❌ Error al procesar la verificación.');
                }
                
                setTipoMensaje('error');
            } finally {
                setVerificando(false);
            }
        };

        verificarCuenta();
    }, [user_id, verificacionCompleta, usuario]);

    const getNivelUsuario = (saldo: number): string => {
        if (saldo >= 5000000) return 'DIAMANTE';
        if (saldo >= 1000000) return 'PLATINO';
        if (saldo >= 500000) return 'ORO';
        if (saldo >= 100000) return 'PLATA';
        return 'BRONCE';
    };

    const getColorNivel = (nivel: string): string => {
        switch (nivel) {
            case 'DIAMANTE': return 'from-blue-300 to-purple-400';
            case 'PLATINO': return 'from-gray-100 to-gray-300';
            case 'ORO': return 'from-yellow-500 to-yellow-600';
            case 'PLATA': return 'from-gray-300 to-gray-400';
            default: return 'from-yellow-900 to-yellow-700';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300 text-xl font-bold">Cargando...</p>
                </div>
            </div>
        );
    }

    const nivel = usuario ? getNivelUsuario(usuario.saldo) : 'BRONCE';
    const colorNivel = getColorNivel(nivel);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {/* Header */}
            {usuario && (
                <Header 
                    usuario={usuario}
                    cerrarSesion={() => navigate('/login')}
                    setUsuario={setUsuario}
                />
            )}

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Banner de Verificación */}
                <div className="bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-2xl p-8 mb-8 backdrop-blur-sm">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl ${
                            verificando ? 'bg-gradient-to-br from-yellow-500 to-blue-500 animate-pulse' :
                            tipoMensaje === 'success' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                            tipoMensaje === 'error' ? 'bg-gradient-to-br from-red-500 to-pink-500' :
                            'bg-gradient-to-br from-blue-500 to-purple-500'
                        }`}>
                            <span className="text-2xl">
                                {verificando ? '⏳' :
                                 tipoMensaje === 'success' ? '✅' :
                                 tipoMensaje === 'error' ? '❌' : '🔍'}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {verificando ? 'Verificando tu cuenta...' :
                                 tipoMensaje === 'success' ? '¡Verificación Exitosa!' :
                                 tipoMensaje === 'error' ? 'Error en la verificación' :
                                 'Proceso de verificación'}
                            </h1>
                            <p className="text-gray-300">
                                {verificando ? 'Estamos procesando tu verificación...' :
                                 'Resultado del proceso de verificación de cuenta'}
                            </p>
                        </div>
                    </div>

                    {/* Mensaje de estado */}
                    {mensaje && (
                        <div className={`rounded-xl p-6 mb-6 ${
                            tipoMensaje === 'success' 
                                ? 'bg-green-900/30 border border-green-500/50' 
                                : tipoMensaje === 'error'
                                ? 'bg-red-900/30 border border-red-500/50'
                                : 'bg-blue-900/30 border border-blue-500/50'
                        }`}>
                            <div className="space-y-3">
                                {mensaje.split('\n\n').map((line, index) => (
                                    <p key={index} className={`text-lg ${
                                        tipoMensaje === 'success' ? 'text-green-200' :
                                        tipoMensaje === 'error' ? 'text-red-200' :
                                        'text-blue-200'
                                    }`}>
                                        {line}
                                    </p>
                                ))}
                            </div>
                            {verificando && (
                                <div className="mt-4 flex items-center space-x-3">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-white text-sm">Procesando...</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Información del token */}
                    {user_id && (
                        <div className="bg-black/40 rounded-xl p-4 mb-6">
                            <p className="text-gray-400 text-sm mb-2">Token de verificación:</p>
                            <code className="bg-gray-900 px-4 py-2 rounded-lg font-mono text-yellow-400 break-all">
                                {user_id}
                            </code>
                            <p className="text-gray-400 text-sm mt-2">
                                ID de usuario: {user_id ? parseInt(user_id) - 12345678 : 'N/A'}
                            </p>
                        </div>
                    )}

                    {/* Beneficios de la verificación exitosa */}
                    {tipoMensaje === 'success' && usuario && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-black/30 rounded-xl p-6 border border-green-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-2xl">💰</span>
                                        <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-sm font-bold">BONUS</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">Bonus por verificación</h4>
                                    <p className="text-3xl font-bold text-yellow-400">
                                        ${usuario.saldo.toLocaleString()}
                                    </p>
                                    <p className="text-gray-400 text-sm mt-2">Saldo actual disponible</p>
                                </div>

                                <div className="bg-black/30 rounded-xl p-6 border border-green-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-2xl">👥</span>
                                        <span className="px-3 py-1 bg-blue-900/50 text-blue-400 rounded-full text-sm font-bold">REFERIDOS</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">Bonus por referidos</h4>
                                    <p className="text-2xl font-bold text-yellow-400">+$2,000</p>
                                    <p className="text-gray-400 text-sm mt-2">Por cada referido verificado</p>
                                </div>

                                <div className="bg-black/30 rounded-xl p-6 border border-green-500/30">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-2xl">🏆</span>
                                        <span className="px-3 py-1 bg-purple-900/50 text-purple-400 rounded-full text-sm font-bold">NIVEL</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">Tu nivel actual</h4>
                                    <div className="px-3 py-1 bg-gradient-to-r ${colorNivel} rounded-full font-bold inline-block">
                                        {nivel}
                                    </div>
                                    <p className="text-gray-400 text-sm mt-2">Con todos los beneficios</p>
                                </div>
                            </div>

                            {/* Acciones después de verificación */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="flex-1 bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3"
                                >
                                    <span>🚀 Ir a mi Dashboard</span>
                                </button>
                                <button
                                    onClick={() => navigate('/inicio')}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3"
                                >
                                    <span>🏠 Ir al Inicio</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Acciones para errores */}
                    {tipoMensaje === 'error' && (
                        <div className="space-y-4">
                            <div className="bg-red-900/20 rounded-xl p-4">
                                <p className="text-red-300 mb-2">Posibles soluciones:</p>
                                <ul className="list-disc list-inside text-red-200/80 space-y-1">
                                    <li>Asegúrate de que el enlace sea correcto</li>
                                    <li>Verifica que tu cuenta no esté ya verificada</li>
                                    <li>Contacta con soporte si el problema persiste</li>
                                </ul>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300"
                                >
                                    Iniciar Sesión
                                </button>
                                <button
                                    onClick={() => navigate('/verificate')}
                                    className="flex-1 bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300"
                                >
                                    Ir a Verificación Manual
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Enlace de referidos para usuarios verificados */}
                    {tipoMensaje === 'success' && usuario && (
                        <div className="mt-8 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/30">
                            <h3 className="text-xl font-bold text-white mb-4">🎯 Invita a tus amigos y gana más</h3>
                            <div className="space-y-4">
                                <p className="text-gray-300">
                                    Ahora que estás verificado, puedes invitar a tus amigos y ganar $2,000 por cada uno que se verifique.
                                </p>
                                <div className="bg-black/40 rounded-xl p-4">
                                    <p className="text-sm text-gray-400 mb-2">Tu código de referido:</p>
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-gray-900 px-4 py-2 rounded-lg font-mono text-lg font-bold text-yellow-400">
                                            REF-{usuario.id.toString().padStart(6, '0')}
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(usuario.id.toString());
                                                setMensaje(prev => prev + '\n\n📋 Código de referido copiado al portapapeles!');
                                            }}
                                            className="bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white px-4 py-2 rounded-lg font-bold transition-all duration-300"
                                        >
                                            📋 Copiar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Información adicional */}
                <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">📋 Sobre la verificación</h3>
                    <div className="space-y-3">
                        <p className="text-gray-300">
                            La verificación de cuenta es un proceso de seguridad que nos permite:
                        </p>
                        <ul className="list-disc list-inside text-gray-400 space-y-2 pl-4">
                            <li>Confirmar que eres una persona real</li>
                            <li>Proteger tu cuenta contra acceso no autorizado</li>
                            <li>Habilitar todas las funciones premium de la plataforma</li>
                            <li>Acceder a retiros y transacciones completas</li>
                            <li>Participar en sorteos y promociones exclusivas</li>
                        </ul>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default VerificacionPage;