// src/components/Header.tsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../api/auth";

interface Usuario {
    id: number;
    username: string;
    saldo: number;
    verificado: boolean;
    nivel?: string;
    verificado_pendiente?: boolean;
}

interface HeaderProps {
    usuario: Usuario | null;
    cerrarSesion: () => void;
    setUsuario: React.Dispatch<React.SetStateAction<Usuario | null>>;
}

const Header: React.FC<HeaderProps> = ({ usuario, cerrarSesion, setUsuario }) => {
    const navigate = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [menuNavegacionAbierto, setMenuNavegacionAbierto] = useState(false);
    const [bonoDisponible, setBonoDisponible] = useState(false);
    const [montoBono, setMontoBono] = useState<number>(100);
    const [tiempoRestante, setTiempoRestante] = useState<string>("");
    const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuNavRef = useRef<HTMLDivElement>(null);

    // Cerrar menús al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuAbierto(false);
            }
            if (menuNavRef.current && !menuNavRef.current.contains(event.target as Node)) {
                setMenuNavegacionAbierto(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Cerrar menú de navegación al cambiar de página
    useEffect(() => {
        setMenuNavegacionAbierto(false);
    }, [navigate]);

    // Verificar bono diario
    useEffect(() => {
        const verificarBonoDiario = () => {
            const hoy = new Date().toDateString();
            const ultimoBonoGuardado = localStorage.getItem('ultimo_bono_diario');
            const ultimaFechaBono = ultimoBonoGuardado ? JSON.parse(ultimoBonoGuardado).fecha : null;

            if (ultimaFechaBono !== hoy) {
                setBonoDisponible(true);
                // Bono basado en verificación del usuario
                const bonoBase = usuario?.verificado ? 100 : 10;
                setMontoBono(bonoBase);
            } else {
                setBonoDisponible(false);

                // Calcular tiempo restante para próximo bono
                const ahora = new Date();
                const manana = new Date();
                manana.setDate(manana.getDate() + 1);
                manana.setHours(0, 0, 0, 0);

                const diferencia = manana.getTime() - ahora.getTime();
                const horas = Math.floor(diferencia / (1000 * 60 * 60));
                const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
                const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

                setTiempoRestante(`${horas}h ${minutos}m ${segundos}s`);
            }
        };

        verificarBonoDiario();
        const intervalo = setInterval(verificarBonoDiario, 1000);

        return () => clearInterval(intervalo);
    }, [usuario]);

    const getNivelUsuario = () => {
        if (!usuario) return 'BRONCE';
        if (usuario.saldo >= 5000000) return 'DIAMANTE';
        if (usuario.saldo >= 1000000) return 'PLATINO';
        if (usuario.saldo >= 500000) return 'ORO';
        if (usuario.saldo >= 100000) return 'PLATA';
        return 'BRONCE';
    };

    const getColorNivel = (nivel: string) => {
        switch (nivel) {
            case 'DIAMANTE': return 'from-blue-300 to-purple-400';
            case 'PLATINO': return 'from-gray-100 to-gray-300';
            case 'ORO': return 'from-yellow-500 to-yellow-600';
            case 'PLATA': return 'from-gray-300 to-gray-400';
            default: return 'from-yellow-900 to-yellow-700';
        }
    };

    const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
        setNotificacion({ text, type });
        setTimeout(() => setNotificacion(null), 5000);
    };

    const reclamarBonoDiario = async () => {
        if (!bonoDisponible || !usuario) return;

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                showMsg("No estás autenticado", "error");
                return;
            }

            const response = await axios.post(
                `${API_URL}/bonus-diario/bonus-diario`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = response.data;

            // Actualizar saldo del usuario con la respuesta del backend
            setUsuario(prev => prev ? {
                ...prev,
                saldo: data.nuevo_saldo
            } : null);

            // Guardar en localStorage que ya reclamó el bono hoy
            localStorage.setItem('ultimo_bono_diario', JSON.stringify({
                fecha: new Date().toDateString(),
                monto: data.monto
            }));

            setBonoDisponible(false);
            showMsg(`¡${data.mensaje}!`, "success");

            // Agregar al historial de bonos
            const nuevoHistorialBono = {
                id: Date.now(),
                tipo: "bono_diario",
                monto: data.monto,
                fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                tipo_usuario: data.tipo_usuario
            };

            const historialBonos = JSON.parse(localStorage.getItem('historial_bonos') || '[]');
            localStorage.setItem('historial_bonos', JSON.stringify([nuevoHistorialBono, ...historialBonos.slice(0, 9)]));

        } catch (err: any) {
            if (err.response?.status === 400) {
                // Usuario ya reclamó el bono hoy según el backend
                setBonoDisponible(false);
                localStorage.setItem('ultimo_bono_diario', JSON.stringify({
                    fecha: new Date().toDateString(),
                    monto: usuario?.verificado ? 100 : 10
                }));
                showMsg(err.response.data.detail, "info");
            } else if (err.response?.status === 401) {
                showMsg("Tu sesión ha expirado", "error");
                setTimeout(() => {
                    localStorage.removeItem("token");
                    cerrarSesion();
                    navigate('/login');
                }, 2000);
            } else {
                showMsg(err.response?.data?.detail || "Error al reclamar el bono", "error");
            }
        }
    };

    const handleDeposito = () => {
    console.log('Navegando a /deposito', usuario); // Ver esto en consola
    setMenuAbierto(false);
    navigate('/transacciones/deposito');
};

    const handleRetiro = () => {
        setMenuAbierto(false);
        navigate('/transacciones/retiro');
    };

    const handleLogout = () => {
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
        localStorage.removeItem("historial_bonos");
        localStorage.removeItem("ultimo_bono_diario");

        cerrarSesion();
        setMenuAbierto(false);
        showMsg("Sesión cerrada correctamente", "success");
        setTimeout(() => navigate('/login'), 1500);
    };

    const nivel = getNivelUsuario();
    const colorNivel = getColorNivel(nivel);

    return (
        <>
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

            {/* Header Principal */}
            <header className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-lg border-b border-yellow-500/30 relative z-40">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo y Nombre */}
                        <div className="flex items-center space-x-4">
                            {/* Botón de menú hamburguesa (solo móvil) */}
                            <button
                                onClick={() => setMenuNavegacionAbierto(!menuNavegacionAbierto)}
                                className="md:hidden text-gray-300 hover:text-white transition-colors p-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-white font-bold text-xl">$</span>
                                </div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
                                    BETREF
                                </h1>
                            </div>
                        </div>

                        {/* Navegación - Oculto en móviles */}
                        <nav className="hidden md:flex items-center space-x-6">
                            <Link to="/inicio" className="text-gray-50 hover:text-yellow-300 transition-colors flex items-center space-x-2 font-bold">
                                <span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">
                                    <linearGradient id="house_gr1_2" x1="7.219" x2="24.781" y1="11.901" y2="29.464" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#00e9ff" stop-opacity=".95" />
                                        <stop offset="1" stop-color="#00e9ff" stop-opacity=".5" />
                                    </linearGradient>

                                    <path fill="url(#house_gr1_2)"
                                        d="M28,15.12V25c0,1.66-1.34,3-3,3H7c-1.66,0-3-1.34-3-3v-9.88L15.67,5.11
    c0.19-0.16,0.47-0.16,0.66,0L28,15.12z"/>

                                    <linearGradient id="house_gr2_2" x1="24.214" x2="29.501" y1="4.373" y2="9.659" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#ff3519" stop-opacity=".95" />
                                        <stop offset="1" stop-color="#ff3519" stop-opacity=".5" />
                                    </linearGradient>

                                    <path fill="url(#house_gr2_2)"
                                        d="M28,5v6.16l-4-3.43V5c0-0.55,0.45-1,1-1h2C27.55,4,28,4.45,28,5z" />

                                    <linearGradient id="house_gr3_2" x1="11.396" x2="20.604" y1="18.189" y2="27.396" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#fff" stop-opacity=".8" />
                                        <stop offset=".519" stop-color="#fff" stop-opacity=".5" />
                                        <stop offset="1" stop-color="#fff" stop-opacity=".6" />
                                    </linearGradient>

                                    <path fill="url(#house_gr3_2)"
                                        d="M12,28V18c0-0.552,0.448-1,1-1h6c0.552,0,1,0.448,1,1v10H12z" />

                                    <linearGradient id="house_gr4_2" x1="8.189" x2="23.811" y1="6.619" y2="22.24" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#ff3519" stop-opacity=".95" />
                                        <stop offset="1" stop-color="#ff3519" stop-opacity=".5" />
                                    </linearGradient>

                                    <path fill="url(#house_gr4_2)"
                                        d="M29.5,15.93c-0.346,0-0.693-0.119-0.976-0.361L16.326,5.112
    c-0.188-0.161-0.463-0.161-0.651,0L3.476,15.568
    c-0.628,0.539-1.576,0.467-2.115-0.163
    c-0.54-0.629-0.466-1.576,0.163-2.115L13.722,2.834
    c1.319-1.132,3.236-1.132,4.556,0l12.198,10.457
    c0.629,0.539,0.702,1.486,0.163,2.115
    C30.342,15.752,29.922,15.93,29.5,15.93z"/>

                                    <linearGradient id="house_gr5_2" x1="7.696" x2="27.414" y1="7.112" y2="26.831" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stop-color="#fff" stop-opacity=".6" />
                                        <stop offset=".493" stop-color="#fff" stop-opacity="0" />
                                        <stop offset=".997" stop-color="#fff" stop-opacity=".3" />
                                    </linearGradient>

                                    <path fill="url(#house_gr5_2)"
                                        d="M16,1.986c-0.809,0-1.618,0.283-2.278,0.849
    L1.524,13.291c-0.629,0.539-0.702,1.486-0.163,2.115
    C1.658,15.752,2.078,15.93,2.5,15.93c0.346,0,0.693-0.119,0.976-0.361
    L4,15.119V25c0,1.66,1.34,3,3,3h18c1.66,0,3-1.34,3-3v-9.881
    l0.524,0.449c0.283,0.243,0.63,0.361,0.976,0.361
    c0.422,0,0.843-0.178,1.139-0.524c0.54-0.629,0.466-1.576-0.163-2.115
    L28,11.168V5c0-0.55-0.45-1-1-1h-2c-0.55,0-1,0.45-1,1v2.74
    l-5.722-4.905C17.618,2.269,16.809,1.986,16,1.986z"/>
                                </svg>
                                </span>
                                <span className="hidden md:inline">Inicio</span>
                            </Link>
                            <Link to="/referidos" className="text-blue-400 hover:text-yellow-300 transition-colors flex items-center space-x-2 font-bold">
                                <span>👥</span>
                                <span className="hidden md:inline">Referidos</span>
                            </Link>
                            {usuario?.verificado && (
                                <Link to="/sorteovip" className="text-red-400 hover:text-yellow-300 transition-colors flex items-center space-x-2 font-bold">
                                    <span>🎟</span>
                                    <span className="hidden md:inline">Sorteo VIP</span>
                                </Link>
                            )}
                            {usuario?.verificado && (
                                <Link to="/inversiones" className="text-yellow-400 hover:text-yellow-300 transition-colors flex items-center space-x-2 font-bold">
                                    <span>💰</span>
                                    <span className="hidden md:inline">Inversiones</span>
                                </Link>
                            )}
                            <Link to="/juegos" className="text-green-400 hover:text-yellow-300 transition-colors flex items-center space-x-2 font-bold">
                                <span>🎮</span>
                                <span className="hidden md:inline">Juegos</span>
                            </Link>
                            {usuario && !usuario.verificado && !usuario.verificado_pendiente && (
                                <Link to="/verificate" className="text-gray-300 hover:text-white transition-colors flex items-center space-x-2">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle cx="12" cy="12" r="12" fill="#22C55E" />
                                        <path
                                            d="M7 12.5L10.5 16L17 9"
                                            stroke="white"
                                            stroke-width="2.5"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>
                                    <span className="hidden md:inline">Verificate</span>
                                </Link>
                            )}
                            {usuario?.verificado_pendiente && (
                                <Link to="/verificate" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-2">
                                    <span>⏳</span>
                                    <span className="hidden md:inline">En Verificación</span>
                                </Link>
                            )}
                        </nav>

                        {/* Controles de usuario (siempre visibles) */}
                        <div className="flex items-center space-x-4">
                            {/* Botón de Bono Diario */}
                            {usuario && (
                                <button
                                    onClick={reclamarBonoDiario}
                                    disabled={!bonoDisponible}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl font-bold transition-all duration-300 ${bonoDisponible
                                            ? usuario.verificado
                                                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 hover:scale-105 animate-pulse'
                                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 hover:scale-105 animate-pulse'
                                            : 'bg-gray-800/50 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    <span className="text-xl">🎁</span>
                                    <span className="hidden sm:inline">
                                        {bonoDisponible
                                            ? `Bono: $${montoBono}`
                                            : 'Bono Diario'}
                                    </span>
                                </button>
                            )}

                            {/* Menú de Usuario */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setMenuAbierto(!menuAbierto)}
                                    className="flex items-center space-x-3 focus:outline-none hover:opacity-90 transition-opacity relative z-50"
                                >
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm text-gray-300">{usuario?.username}</p>
                                        <p className="text-lg font-bold text-white">${usuario?.saldo?.toLocaleString() ?? 0}</p>
                                    </div>
                                    <div className={`w-12 h-12 bg-gradient-to-br ${colorNivel} rounded-full flex items-center justify-center font-bold text-lg relative`}>
                                        {nivel.charAt(0)}
                                        {menuAbierto && (
                                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                                        )}
                                    </div>
                                    <svg
                                        className={`w-4 h-4 text-gray-400 transition-transform ${menuAbierto ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Menú Desplegable */}
                                {menuAbierto && usuario && (
                                    <div className="fixed right-4 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-[9999] animate-fadeIn">
                                        {/* Encabezado del Menú */}
                                        <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-10 h-10 bg-gradient-to-br ${colorNivel} rounded-full flex items-center justify-center font-bold`}>
                                                    {nivel.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-white truncate">{usuario.username}</p>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span className={`px-2 py-0.5 text-xs bg-gradient-to-br ${colorNivel} rounded-full font-bold`}>
                                                            {nivel}
                                                        </span>
                                                        {usuario.verificado ? (
                                                            <span className="text-xs text-green-400">Verificado ✓</span>
                                                        ) : usuario.verificado_pendiente ? (
                                                            <span className="text-xs text-blue-400">En verificación</span>
                                                        ) : (
                                                            <span className="text-xs text-yellow-400">Sin verificar</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Opciones del Menú */}
                                        <div className="py-2 bg-gray-800/95">
                                            {/* Bono Diario en el Menú */}
                                            <button
                                                onClick={reclamarBonoDiario}
                                                disabled={!bonoDisponible}
                                                className={`flex items-center w-full px-4 py-3 text-left transition-colors ${bonoDisponible
                                                        ? usuario.verificado
                                                            ? 'text-yellow-400 hover:bg-gray-700/80 hover:text-yellow-300'
                                                            : 'text-blue-400 hover:bg-gray-700/80 hover:text-blue-300'
                                                        : 'text-gray-500 cursor-not-allowed'
                                                    }`}
                                            >
                                                <span className="mr-3 text-lg">🎁</span>
                                                <div className="flex-1">
                                                    <p className="font-medium">Bono Diario</p>
                                                    <p className="text-xs">
                                                        {bonoDisponible
                                                            ? `¡Reclama $${usuario.verificado ? 100 : 10} hoy!`
                                                            : tiempoRestante
                                                                ? `Próximo bono en ${tiempoRestante}`
                                                                : 'Ya reclamado hoy'}
                                                    </p>
                                                </div>
                                                {bonoDisponible ? (
                                                    <span className={`px-2 py-1 text-xs rounded animate-pulse ${usuario.verificado
                                                            ? 'bg-yellow-900/50 text-yellow-400'
                                                            : 'bg-blue-900/50 text-blue-400'
                                                        }`}>
                                                        ¡NUEVO!
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 text-xs bg-gray-900/50 text-gray-400 rounded">
                                                        Reclamado
                                                    </span>
                                                )}
                                            </button>

                                            {/* Depósito */}
                                            <button
                                                onClick={handleDeposito}
                                                className="flex items-center w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700/80 hover:text-white transition-colors"
                                            >
                                                <span className="mr-3 text-lg">💰</span>
                                                <div className="flex-1">
                                                    <p className="font-medium">Depositar</p>
                                                    <p className="text-xs text-gray-500">Agregar fondos a tu cuenta</p>
                                                </div>
                                                {usuario.verificado ? (
                                                    <span className="px-2 py-1 text-xs bg-green-900/50 text-green-400 rounded">VIP</span>
                                                ) : (
                                                    <span ></span>
                                                )}
                                            </button>

                                            {/* Retiro */}
                                            <button
                                                onClick={handleRetiro}
                                                className="flex items-center w-full px-4 py-3 text-left text-gray-300 hover:bg-gray-700/80 hover:text-white transition-colors"
                                            >
                                                <span className="mr-3 text-lg">💳</span>
                                                <div className="flex-1">
                                                    <p className="font-medium">Retirar</p>
                                                    <p className="text-xs text-gray-500">Retirar tus ganancias</p>
                                                </div>
                                                {usuario.verificado ? (
                                                    <span className="px-2 py-1 text-xs bg-blue-900/50 text-blue-400 rounded">Rápido</span>
                                                ) : (
                                                    <span ></span>
                                                )}
                                            </button>

                                            {/* Separador */}
                                            <div className="border-t border-gray-700 my-2"></div>

                                            {/* Cerrar Sesión */}
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center w-full px-4 py-3 text-left text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
                                            >
                                                <span className="mr-3 text-lg">🚪</span>
                                                <div className="flex-1">
                                                    <p className="font-medium">Cerrar Sesión</p>
                                                    <p className="text-xs text-red-300/70">Salir de tu cuenta</p>
                                                </div>
                                            </button>
                                        </div>

                                        {/* Pie del Menú */}
                                        <div className="px-4 py-3 bg-gray-900/95 border-t border-gray-700">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs text-gray-500">Saldo disponible</p>
                                                    <p className="text-sm font-bold text-yellow-400">${usuario.saldo.toLocaleString()} COP</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Bono diario</p>
                                                    <p className="text-xs font-bold text-green-400">
                                                        ${usuario.verificado ? "100" : "10"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Menú de navegación móvil (hamburguesa) */}
            {menuNavegacionAbierto && (
                <div ref={menuNavRef} className="md:hidden fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-lg animate-fadeIn">
                    <div className="flex flex-col h-full p-6">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-white">Navegación</h2>
                            <button
                                onClick={() => setMenuNavegacionAbierto(false)}
                                className="text-gray-300 hover:text-white text-3xl p-2"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="flex flex-col space-y-4">
                            <Link
                                to="/inicio"
                                className="flex items-center space-x-3 p-4 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-xl transition-colors"
                                onClick={() => setMenuNavegacionAbierto(false)}
                            >
                                <span><svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="28" height="28" viewBox="0 0 32 32">
                                    <linearGradient id="KB1PQjYBsGUWyrsznZa0Sa_EaHvBlFeXuaQ_gr1" x1="7.219" x2="24.781" y1="11.901" y2="29.464" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00e9ff" stop-opacity=".95"></stop><stop offset="1" stop-color="#00e9ff" stop-opacity=".5"></stop></linearGradient><path fill="url(#KB1PQjYBsGUWyrsznZa0Sa_EaHvBlFeXuaQ_gr1)" d="M28,15.12V25c0,1.66-1.34,3-3,3H7c-1.66,0-3-1.34-3-3v-9.88L15.67,5.11	c0.19-0.16,0.47-0.16,0.66,0L28,15.12z"></path><linearGradient id="KB1PQjYBsGUWyrsznZa0Sb_EaHvBlFeXuaQ_gr2" x1="24.214" x2="29.501" y1="4.373" y2="9.659" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff3519" stop-opacity=".95"></stop><stop offset="1" stop-color="#ff3519" stop-opacity=".5"></stop></linearGradient><path fill="url(#KB1PQjYBsGUWyrsznZa0Sb_EaHvBlFeXuaQ_gr2)" d="M28,5v6.16l-4-3.43V5c0-0.55,0.45-1,1-1h2C27.55,4,28,4.45,28,5z"></path><linearGradient id="KB1PQjYBsGUWyrsznZa0Sc_EaHvBlFeXuaQ_gr3" x1="11.396" x2="20.604" y1="18.189" y2="27.396" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".8"></stop><stop offset=".519" stop-color="#fff" stop-opacity=".5"></stop><stop offset="1" stop-color="#fff" stop-opacity=".6"></stop></linearGradient><path fill="url(#KB1PQjYBsGUWyrsznZa0Sc_EaHvBlFeXuaQ_gr3)" d="M12,28V18c0-0.552,0.448-1,1-1h6c0.552,0,1,0.448,1,1v10H12z"></path><linearGradient id="KB1PQjYBsGUWyrsznZa0Sd_EaHvBlFeXuaQ_gr4" x1="8.189" x2="23.811" y1="6.619" y2="22.24" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff3519" stop-opacity=".95"></stop><stop offset="1" stop-color="#ff3519" stop-opacity=".5"></stop></linearGradient><path fill="url(#KB1PQjYBsGUWyrsznZa0Sd_EaHvBlFeXuaQ_gr4)" d="M29.5,15.93c-0.346,0-0.693-0.119-0.976-0.361L16.326,5.112c-0.188-0.161-0.463-0.161-0.651,0	L3.476,15.568c-0.628,0.539-1.576,0.467-2.115-0.163c-0.54-0.629-0.466-1.576,0.163-2.115L13.722,2.834	c1.319-1.132,3.236-1.132,4.556,0l12.198,10.457c0.629,0.539,0.702,1.486,0.163,2.115C30.342,15.752,29.922,15.93,29.5,15.93z"></path><linearGradient id="KB1PQjYBsGUWyrsznZa0Se_EaHvBlFeXuaQ_gr5" x1="7.696" x2="27.414" y1="7.112" y2="26.831" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".6"></stop><stop offset=".493" stop-color="#fff" stop-opacity="0"></stop><stop offset=".997" stop-color="#fff" stop-opacity=".3"></stop></linearGradient><path fill="url(#KB1PQjYBsGUWyrsznZa0Se_EaHvBlFeXuaQ_gr5)" d="M16,2.486c0.711,0,1.405,0.259,1.952,0.728l5.722,4.905L24.5,8.827V7.74V5	c0-0.276,0.224-0.5,0.5-0.5h2c0.276,0,0.5,0.224,0.5,0.5v6.168v0.23l0.175,0.15l2.476,2.123c0.203,0.174,0.326,0.416,0.346,0.682	c0.021,0.266-0.064,0.524-0.238,0.727c-0.19,0.222-0.467,0.349-0.759,0.349c-0.238,0-0.469-0.085-0.65-0.241l-0.524-0.449	L27.5,14.032v1.087V25c0,1.378-1.122,2.5-2.5,2.5H7c-1.378,0-2.5-1.122-2.5-2.5v-9.881v-1.087L3.675,14.74l-0.524,0.449	C2.97,15.344,2.739,15.43,2.5,15.43c-0.293,0-0.569-0.127-0.759-0.349c-0.174-0.203-0.258-0.461-0.238-0.727	c0.021-0.266,0.144-0.509,0.346-0.682L14.048,3.214C14.595,2.744,15.289,2.486,16,2.486 M16,1.986c-0.809,0-1.618,0.283-2.278,0.849	L1.524,13.291c-0.629,0.539-0.702,1.486-0.163,2.115C1.658,15.752,2.078,15.93,2.5,15.93c0.346,0,0.693-0.119,0.976-0.361L4,15.119	V25c0,1.66,1.34,3,3,3h18c1.66,0,3-1.34,3-3v-9.881l0.524,0.449c0.283,0.243,0.63,0.361,0.976,0.361	c0.422,0,0.843-0.178,1.139-0.524c0.54-0.629,0.466-1.576-0.163-2.115L28,11.168V5c0-0.55-0.45-1-1-1h-2c-0.55,0-1,0.45-1,1v2.74	l-5.722-4.905C17.618,2.269,16.809,1.986,16,1.986L16,1.986z"></path>
                                </svg></span>
                                <span className="text-lg font-medium">Inicio</span>
                            </Link>

                            <Link
                                to="/referidos"
                                className="flex items-center space-x-3 p-4 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-xl transition-colors"
                                onClick={() => setMenuNavegacionAbierto(false)}
                            >
                                <span className="text-2xl">👥</span>
                                <span className="text-lg font-medium">Referidos</span>
                            </Link>

                            {usuario?.verificado && (
                                <Link
                                    to="/sorteovip"
                                    className="flex items-center space-x-3 p-4 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-xl transition-colors"
                                    onClick={() => setMenuNavegacionAbierto(false)}
                                >
                                    <span className="text-2xl">🎟</span>
                                    <span className="text-lg font-medium">Sorteo VIP</span>
                                </Link>
                            )}
                            {usuario?.verificado && (
                                <Link
                                    to="/inversiones"
                                    className="flex items-center space-x-3 p-4 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-xl transition-colors"
                                    onClick={() => setMenuNavegacionAbierto(false)}
                                >
                                    <span className="text-2xl">💰</span>
                                    <span className="text-lg font-medium">Inversiones</span>
                                </Link>
                            )}

                            <Link
                                to="/juegos"
                                className="flex items-center space-x-3 p-4 text-yellow-400 hover:text-yellow-300 hover:bg-gray-800/50 rounded-xl transition-colors font-bold"
                                onClick={() => setMenuNavegacionAbierto(false)}
                            >
                                <span className="text-2xl">🎮</span>
                                <span className="text-lg font-medium">Juegos</span>
                            </Link>

                            {usuario && !usuario.verificado && !usuario.verificado_pendiente && (
                                <Link
                                    to="/verificate"
                                    className="flex items-center space-x-3 p-4 text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-xl transition-colors"
                                    onClick={() => setMenuNavegacionAbierto(false)}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="28"
                                        height="28"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle cx="12" cy="12" r="12" fill="#22C55E" />
                                        <path
                                            d="M7 12.5L10.5 16L17 9"
                                            stroke="white"
                                            stroke-width="2.5"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>
                                    <span className="text-lg font-medium">Verificate</span>
                                </Link>
                            )}

                            {usuario?.verificado_pendiente && (
                                <Link
                                    to="/verificate"
                                    className="flex items-center space-x-3 p-4 text-blue-400 hover:text-blue-300 hover:bg-gray-800/50 rounded-xl transition-colors"
                                    onClick={() => setMenuNavegacionAbierto(false)}
                                >
                                    <span className="text-2xl">⏳</span>
                                    <span className="text-lg font-medium">En Verificación</span>
                                </Link>
                            )}
                        </div>

                        <div className="mt-auto pt-6 border-t border-gray-700">
                            <div className="text-center text-gray-400 text-sm">
                                <p>BETREF © 2024</p>
                                <p className="mt-1">Todos los derechos reservados</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Botón flotante de bono (solo móvil y cuando está disponible) */}
            {bonoDisponible && usuario && (
                <div className="md:hidden fixed bottom-6 right-6 z-50 animate-bounce">
                    <button
                        onClick={reclamarBonoDiario}
                        className={`p-4 rounded-full shadow-2xl flex items-center space-x-3 hover:scale-110 transition-transform ${usuario.verificado
                                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            }`}
                    >
                        <span className="text-2xl">🎁</span>
                        <div className="text-left">
                            <div className="font-bold">¡Bono Diario!</div>
                            <div className="text-sm">${usuario.verificado ? "100" : "10"} disponibles</div>
                        </div>
                    </button>
                </div>
            )}
        </>
    );
};

export default Header;