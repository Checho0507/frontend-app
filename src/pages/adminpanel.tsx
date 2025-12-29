import { useCallback, useEffect, useState, type JSX } from "react";
import axios from "axios";

interface Usuario {
    id: number;
    username: string;
    email: string;
    verificado: boolean;
    saldo: number;
    referido_por: number | null;
}

interface Verificacion {
    id: number;
    usuario_id: number;
    archivo_url: string;
    estado: "pendiente" | "aprobada" | "rechazada";
    creado_en: string;
    usuario?: {
        username: string;
        email?: string;
        verificado?: boolean;
    };
}

interface Deposito {
    id: number;
    usuario_id: number;
    monto: number;
    metodo_pago: string;
    referencia: string;
    estado: string; // "PENDIENTE", "APROBADO", "RECHAZADO"
    comprobante_url: string | null;
    fecha_solicitud: string;
    fecha_procesamiento: string | null;
    usuario?: {
        username: string;
        email?: string;
        verificado?: boolean;
    };
}

interface Retiro {
    id: number;
    usuario_id: number;
    monto: number;
    metodo_retiro: string;
    cuenta_destino: string;
    referencia: string;
    estado: string; // "PENDIENTE", "APROBADO", "RECHAZADO"
    comision: number;
    total: number;
    fecha_solicitud: string;
    fecha_procesamiento: string | null;
    observaciones?: string;
    usuario?: {
        username: string;
        email?: string;
        verificado?: boolean;
        saldo?: number;
    };
}

export default function AdminPanel(): JSX.Element {
    const [me, setMe] = useState<Usuario | null>(null);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [verificaciones, setVerificaciones] = useState<Verificacion[]>([]);
    const [depositosPendientes, setDepositosPendientes] = useState<Deposito[]>([]);
    const [retirosPendientes, setRetirosPendientes] = useState<Retiro[]>([]);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState<{ text: string; type?: "info" | "success" | "error" } | null>(null);
    const [procesandoId, setProcesandoId] = useState<number | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState<"todos" | "verificados" | "no_verificados">("todos");
    const [activeTab, setActiveTab] = useState<"depositos" | "retiros">("depositos");

    const token = localStorage.getItem("token");

    const showMsg = (text: string, type: "info" | "success" | "error" = "info") => {
        setMensaje({ text, type });
        setTimeout(() => setMensaje(null), 5000);
    };

    const fetchAll = useCallback(async () => {
        if (!token) {
            setLoading(false);
            showMsg("No hay token. Inicia sesión como admin.", "error");
            return;
        }

        setLoading(true);
        try {
            const meRes = await axios.get<Usuario>("http://localhost:8000/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMe(meRes.data);

            if (meRes.data.username !== "admin") {
                showMsg("⛔ Acceso denegado. Se requiere usuario admin.", "error");
                setLoading(false);
                return;
            }

            const [usersRes, verifsRes, depositosRes, retirosRes] = await Promise.all([
                axios.get<Usuario[]>("http://localhost:8000/admin/admin/usuarios", { headers: { Authorization: `Bearer ${token}` } }),
                axios.get<Verificacion[]>("http://localhost:8000/admin/admin/verificaciones", { headers: { Authorization: `Bearer ${token}` } }),
                axios.get<Deposito[]>("http://localhost:8000/transacciones/admin/depositos/pendientes", { headers: { Authorization: `Bearer ${token}` } }),
                axios.get<Retiro[]>("http://localhost:8000/transacciones/admin/retiros/pendientes", { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const usuariosData = usersRes.data;
            const verificacionesData = verifsRes.data;
            const depositosData = depositosRes.data;
            const retirosData = retirosRes.data;

            const verificadosIds = new Set(usuariosData.filter(u => u.verificado).map(u => u.id));
            const pendientes = verificacionesData.filter(v => v.estado === "pendiente" && !verificadosIds.has(v.usuario_id));

            const enriquecidas = pendientes.map(v => {
                const u = usuariosData.find(x => x.id === v.usuario_id);
                return {
                    ...v,
                    usuario: u ? { username: u.username, email: u.email, verificado: u.verificado } : v.usuario,
                };
            });

            // Enriquecer depósitos con datos de usuario
            const depositosEnriquecidos = depositosData.map(d => {
                const u = usuariosData.find(x => x.id === d.usuario_id);
                return {
                    ...d,
                    usuario: u ? { username: u.username, email: u.email, verificado: u.verificado } : undefined
                };
            });

            // Enriquecer retiros con datos de usuario
            const retirosEnriquecidos = retirosData.map(r => {
                const u = usuariosData.find(x => x.id === r.usuario_id);
                return {
                    ...r,
                    usuario: u ? { 
                        username: u.username, 
                        email: u.email, 
                        verificado: u.verificado,
                        saldo: u.saldo 
                    } : undefined
                };
            });

            setUsuarios(usuariosData);
            setVerificaciones(enriquecidas);
            setDepositosPendientes(depositosEnriquecidos);
            setRetirosPendientes(retirosEnriquecidos);
            showMsg("✅ Datos cargados correctamente", "success");
        } catch (err: any) {
            console.error(err);
            const detail = err?.response?.data?.detail || err.message || "Error conectando con el backend";
            showMsg(`⚠️ ${detail}`, "error");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const aprobarUsuario = async (userId: number) => {
        if (!token) {
            showMsg("No hay token", "error");
            return;
        }

        if (!window.confirm("Confirmar: aprobar verificación y marcar usuario como verificado?")) return;

        try {
            setProcesandoId(userId);
            await axios.post(`http://localhost:8000/admin/admin/verificar/${userId}`, null, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setUsuarios(prev => prev.map(u => (u.id === userId ? { ...u, verificado: true } : u)));
            setVerificaciones(prev => prev.filter(v => v.usuario_id !== userId));
            showMsg("Usuario verificado correctamente", "success");

            setTimeout(() => fetchAll(), 800);
        } catch (err: any) {
            console.error(err);
            showMsg(err?.response?.data?.detail || "No se pudo verificar el usuario", "error");
        } finally {
            setProcesandoId(null);
        }
    };

    const aprobarDeposito = async (depositoId: number) => {
        if (!token) return;

        if (!window.confirm("¿Estás seguro de aprobar este depósito? Esto agregará el saldo al usuario.")) return;

        try {
            setProcesandoId(depositoId);
            await axios.post(`http://localhost:8000/transacciones/admin/depositos/${depositoId}/aprobar`, null, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Actualizar lista de depósitos pendientes
            setDepositosPendientes(prev => prev.filter(d => d.id !== depositoId));
            
            // Actualizar saldo del usuario en la lista local
            const deposito = depositosPendientes.find(d => d.id === depositoId);
            if (deposito) {
                setUsuarios(prev => prev.map(u => {
                    if (u.id === deposito.usuario_id) {
                        return { ...u, saldo: u.saldo + deposito.monto };
                    }
                    return u;
                }));
            }

            showMsg("Depósito aprobado correctamente", "success");
        } catch (err: any) {
            showMsg(err?.response?.data?.detail || "Error al aprobar el depósito", "error");
        } finally {
            setProcesandoId(null);
        }
    };

    const eliminarVerificacion = async (verificacionId: number) => {
        if (!token) return;
        if (!window.confirm("¿Estás seguro de rechazar esta verificación?")) return;
        try {
            setProcesandoId(verificacionId);
            await axios.post(`http://localhost:8000/admin/admin/rechazar/${verificacionId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setVerificaciones(prev => prev.filter(v => v.id !== verificacionId));
            showMsg("Verificación eliminada correctamente", "success");
            localStorage.removeItem("verificacion_en_proceso");
        } catch (err: any) {
            showMsg(err?.response?.data?.detail || "Error al eliminar la verificación", "error");
        } finally {
            setProcesandoId(null);
        }
    };

    const rechazarDeposito = async (depositoId: number) => {
        if (!token) return;

        if (!window.confirm("¿Estás seguro de rechazar este depósito? Se notificará al usuario.")) return;

        try {
            setProcesandoId(depositoId);
            await axios.post(`http://localhost:8000/transacciones/admin/depositos/${depositoId}/rechazar`, null, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Remover de la lista de pendientes
            setDepositosPendientes(prev => prev.filter(d => d.id !== depositoId));
            showMsg("Depósito rechazado correctamente", "success");
        } catch (err: any) {
            showMsg(err?.response?.data?.detail || "Error al rechazar el depósito", "error");
        } finally {
            setProcesandoId(null);
        }
    };

    const aprobarRetiro = async (retiroId: number) => {
        if (!token) return;

        if (!window.confirm("¿Estás seguro de aprobar este retiro? Esto descontará el saldo del usuario.")) return;

        try {
            setProcesandoId(retiroId);
            await axios.post(`http://localhost:8000/transacciones/admin/retiros/${retiroId}/aprobar`, null, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Actualizar lista de retiros pendientes
            setRetirosPendientes(prev => prev.filter(r => r.id !== retiroId));
            
            // Actualizar saldo del usuario en la lista local
            const retiro = retirosPendientes.find(r => r.id === retiroId);
            if (retiro && retiro.usuario) {
                setUsuarios(prev => prev.map(u => {
                    if (u.id === retiro.usuario_id) {
                        return { ...u, saldo: Math.max(0, u.saldo - retiro.monto) };
                    }
                    return u;
                }));
            }

            showMsg("Retiro aprobado correctamente", "success");
        } catch (err: any) {
            const errorMsg = err?.response?.data?.detail || "Error al aprobar el retiro";
            showMsg(errorMsg, "error");
            
            // Si el error es por saldo insuficiente, actualizar la lista para reflejar el cambio
            if (errorMsg.includes("Saldo insuficiente")) {
                setRetirosPendientes(prev => prev.filter(r => r.id !== retiroId));
            }
        } finally {
            setProcesandoId(null);
        }
    };

    const rechazarRetiro = async (retiroId: number) => {
        if (!token) return;

        if (!window.confirm("¿Estás seguro de rechazar este retiro? El saldo del usuario se mantendrá igual.")) return;

        try {
            setProcesandoId(retiroId);
            await axios.post(`http://localhost:8000/transacciones/admin/retiros/${retiroId}/rechazar`, null, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Remover de la lista de pendientes
            setRetirosPendientes(prev => prev.filter(r => r.id !== retiroId));
            showMsg("Retiro rechazado correctamente", "success");
        } catch (err: any) {
            showMsg(err?.response?.data?.detail || "Error al rechazar el retiro", "error");
        } finally {
            setProcesandoId(null);
        }
    };

    const rechazarUsuarioDisabled = true;
    const eliminarUsuarioDisabled = true;

    const usuariosFiltrados = usuarios.filter(u => {
        const q = busqueda.trim().toLowerCase();
        const matchQuery = !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
        const matchFiltro =
            filtro === "todos" ||
            (filtro === "verificados" && u.verificado) ||
            (filtro === "no_verificados" && !u.verificado);
        return matchQuery && matchFiltro;
    });

    const verificacionesReales = verificaciones.filter(v => v.estado === "pendiente" && !v.usuario?.verificado);

    const styles = {
        container: {
            padding: '2rem',
            maxWidth: '1400px',
            margin: '0 auto',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
            backgroundColor: '#f8fafc',
            minHeight: '100vh'
        } as React.CSSProperties,

        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            padding: '1.5rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
        } as React.CSSProperties,

        title: {
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1e293b',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        } as React.CSSProperties,

        buttonGroup: {
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
        } as React.CSSProperties,

        button: {
            padding: '0.625rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '500',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        } as React.CSSProperties,

        primaryButton: {
            backgroundColor: '#3b82f6',
            color: 'white',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        } as React.CSSProperties,

        secondaryButton: {
            backgroundColor: '#f1f5f9',
            color: '#475569',
            border: '1px solid #cbd5e1'
        } as React.CSSProperties,

        successButton: {
            backgroundColor: '#10b981',
            color: 'white'
        } as React.CSSProperties,

        dangerButton: {
            backgroundColor: '#ef4444',
            color: 'white'
        } as React.CSSProperties,

        warningButton: {
            backgroundColor: '#f59e0b',
            color: 'white'
        } as React.CSSProperties,

        infoButton: {
            backgroundColor: '#3b82f6',
            color: 'white'
        } as React.CSSProperties,

        tabButton: {
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '500',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            marginRight: '0.5rem'
        } as React.CSSProperties,

        tabButtonActive: {
            backgroundColor: '#3b82f6',
            color: 'white',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        } as React.CSSProperties,

        alert: {
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        } as React.CSSProperties,

        alertSuccess: {
            backgroundColor: '#dcfce7',
            color: '#166534',
            border: '1px solid #bbf7d0'
        } as React.CSSProperties,

        alertError: {
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca'
        } as React.CSSProperties,

        alertInfo: {
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            border: '1px solid #bfdbfe'
        } as React.CSSProperties,

        card: {
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            marginBottom: '2rem',
            overflow: 'hidden'
        } as React.CSSProperties,

        cardHeader: {
            padding: '1.5rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc'
        } as React.CSSProperties,

        cardTitle: {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1e293b',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        } as React.CSSProperties,

        cardContent: {
            padding: '1.5rem'
        } as React.CSSProperties,

        stats: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
        } as React.CSSProperties,

        statCard: {
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            textAlign: 'center' as const
        } as React.CSSProperties,

        statNumber: {
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1e293b'
        } as React.CSSProperties,

        statLabel: {
            fontSize: '0.875rem',
            color: '#64748b',
            marginTop: '0.25rem'
        } as React.CSSProperties,

        searchContainer: {
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap' as const
        } as React.CSSProperties,

        input: {
            padding: '0.625rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            minWidth: '200px',
            transition: 'border-color 0.2s ease'
        } as React.CSSProperties,

        select: {
            padding: '0.625rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            backgroundColor: 'white',
            cursor: 'pointer'
        } as React.CSSProperties,

        table: {
            width: '100%',
            borderCollapse: 'collapse' as const,
            fontSize: '0.875rem'
        } as React.CSSProperties,

        tableHeader: {
            backgroundColor: '#f8fafc',
            borderBottom: '2px solid #e2e8f0'
        } as React.CSSProperties,

        th: {
            padding: '0.75rem 1rem',
            textAlign: 'left' as const,
            fontWeight: '600',
            color: '#374151',
            fontSize: '0.75rem',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em'
        } as React.CSSProperties,

        td: {
            padding: '1rem',
            borderBottom: '1px solid #f1f5f9',
            verticalAlign: 'middle' as const
        } as React.CSSProperties,

        tableRow: {
            transition: 'background-color 0.15s ease'
        } as React.CSSProperties,

        badge: {
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
        } as React.CSSProperties,

        badgeSuccess: {
            backgroundColor: '#dcfce7',
            color: '#166534'
        } as React.CSSProperties,

        badgeError: {
            backgroundColor: '#fef2f2',
            color: '#991b1b'
        } as React.CSSProperties,

        badgeWarning: {
            backgroundColor: '#fef3c7',
            color: '#92400e'
        } as React.CSSProperties,

        badgeInfo: {
            backgroundColor: '#dbeafe',
            color: '#1e40af'
        } as React.CSSProperties,

        actionButtons: {
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
        } as React.CSSProperties,

        smallButton: {
            padding: '0.375rem 0.75rem',
            borderRadius: '6px',
            border: 'none',
            fontSize: '0.75rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
        } as React.CSSProperties,

        emptyState: {
            textAlign: 'center' as const,
            padding: '3rem 1rem',
            color: '#64748b',
            fontSize: '0.875rem'
        } as React.CSSProperties,

        accessDenied: {
            padding: '2rem',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            color: '#991b1b',
            fontWeight: '600',
            textAlign: 'center' as const,
            border: '1px solid #fecaca'
        } as React.CSSProperties,

        link: {
            color: '#3b82f6',
            textDecoration: 'none',
            fontWeight: '500',
            transition: 'color 0.2s ease'
        } as React.CSSProperties,

        tabContainer: {
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '1rem'
        } as React.CSSProperties
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>
                    <span>👨‍💼</span>
                    Panel de Administración
                </h1>
                <div style={styles.buttonGroup}>
                    <button
                        onClick={fetchAll}
                        disabled={loading}
                        style={{
                            ...styles.button,
                            ...styles.primaryButton,
                            ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                        }}
                    >
                        <span>{loading ? "🔄" : "🔄"}</span>
                        {loading ? "Cargando..." : "Actualizar"}
                    </button>
                    <button
                        onClick={() => {
                            localStorage.removeItem("token");
                            localStorage.removeItem("username");
                            showMsg("Sesión cerrada, redirigiendo al login...", "info");
                            setTimeout(() => {
                                window.location.href = "/login";
                            }, 3000);
                        }}
                        style={{ ...styles.button, ...styles.secondaryButton }}
                    >
                        <span>🚪</span>
                        Cerrar sesión
                    </button>
                </div>
            </header>

            {mensaje && (
                <div style={{
                    ...styles.alert,
                    ...(mensaje.type === "success" ? styles.alertSuccess :
                        mensaje.type === "error" ? styles.alertError : styles.alertInfo)
                }}>
                    <span>
                        {mensaje.type === "success" ? "✅" :
                            mensaje.type === "error" ? "❌" : "ℹ️"}
                    </span>
                    {mensaje.text}
                </div>
            )}

            {me?.username !== "admin" ? (
                <div style={styles.accessDenied}>
                    ⛔ Acceso denegado — debes entrar como <strong>admin</strong>.
                </div>
            ) : (
                <>
                    {/* Estadísticas */}
                    <div style={styles.stats}>
                        <div style={styles.statCard}>
                            <div style={styles.statNumber}>{usuarios.length}</div>
                            <div style={styles.statLabel}>Total Usuarios</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statNumber}>{usuarios.filter(u => u.verificado).length}</div>
                            <div style={styles.statLabel}>Verificados</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statNumber}>{verificacionesReales.length}</div>
                            <div style={styles.statLabel}>Verificaciones Pendientes</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statNumber}>{depositosPendientes.length}</div>
                            <div style={styles.statLabel}>Depósitos Pendientes</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statNumber}>{retirosPendientes.length}</div>
                            <div style={styles.statLabel}>Retiros Pendientes</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statNumber}>
                                ${usuarios.reduce((sum, u) => sum + u.saldo, 0).toFixed(2)}
                            </div>
                            <div style={styles.statLabel}>Saldo Total</div>
                        </div>
                    </div>

                    {/* Transacciones Pendientes (Depósitos y Retiros) */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={styles.cardTitle}>
                                    <span>💸</span>
                                    Transacciones Pendientes
                                    <span style={{ marginLeft: '1rem', fontSize: '0.875rem', fontWeight: 'normal', color: '#64748b' }}>
                                        ({activeTab === 'depositos' ? depositosPendientes.length : retirosPendientes.length})
                                    </span>
                                </h3>
                                <div style={styles.tabContainer}>
                                    <button
                                        onClick={() => setActiveTab('depositos')}
                                        style={{
                                            ...styles.tabButton,
                                            ...(activeTab === 'depositos' ? styles.tabButtonActive : {})
                                        }}
                                    >
                                        📥 Depósitos ({depositosPendientes.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('retiros')}
                                        style={{
                                            ...styles.tabButton,
                                            ...(activeTab === 'retiros' ? styles.tabButtonActive : {})
                                        }}
                                    >
                                        📤 Retiros ({retirosPendientes.length})
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div style={styles.cardContent}>
                            {activeTab === 'depositos' ? (
                                depositosPendientes.length === 0 ? (
                                    <div style={styles.emptyState}>
                                        <span style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>💰</span>
                                        No hay depósitos pendientes de aprobación
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={styles.table}>
                                            <thead style={styles.tableHeader}>
                                                <tr>
                                                    <th style={styles.th}>ID</th>
                                                    <th style={styles.th}>Usuario</th>
                                                    <th style={styles.th}>Monto</th>
                                                    <th style={styles.th}>Método</th>
                                                    <th style={styles.th}>Referencia</th>
                                                    <th style={styles.th}>Fecha</th>
                                                    <th style={styles.th}>Comprobante</th>
                                                    <th style={styles.th}>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {depositosPendientes.map(d => (
                                                    <tr key={d.id} style={styles.tableRow}>
                                                        <td style={styles.td}>#{d.id}</td>
                                                        <td style={styles.td}>
                                                            <strong>{d.usuario?.username || `ID: ${d.usuario_id}`}</strong>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                {d.usuario?.email}
                                                            </div>
                                                        </td>
                                                        <td style={styles.td}>
                                                            <strong style={{ color: '#059669' }}>
                                                                ${Number(d.monto).toLocaleString()}
                                                            </strong>
                                                        </td>
                                                        <td style={styles.td}>
                                                            <span style={{
                                                                ...styles.badge,
                                                                ...styles.badgeWarning
                                                            }}>
                                                                {d.metodo_pago}
                                                            </span>
                                                        </td>
                                                        <td style={styles.td}>
                                                            <code style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                                                {d.referencia}
                                                            </code>
                                                        </td>
                                                        <td style={styles.td}>
                                                            {new Date(d.fecha_solicitud).toLocaleString('es-ES')}
                                                        </td>
                                                        <td style={styles.td}>
                                                            {d.comprobante_url ? (
                                                                <a
                                                                    href={`http://localhost:8000/${d.comprobante_url}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    style={styles.link}
                                                                >
                                                                    📄 Ver comprobante
                                                                </a>
                                                            ) : (
                                                                <span style={{ color: '#9ca3af' }}>—</span>
                                                            )}
                                                        </td>
                                                        <td style={styles.td}>
                                                            <div style={styles.actionButtons}>
                                                                <button
                                                                    onClick={() => aprobarDeposito(d.id)}
                                                                    disabled={procesandoId === d.id}
                                                                    style={{
                                                                        ...styles.smallButton,
                                                                        ...styles.successButton,
                                                                        ...(procesandoId === d.id ? { opacity: 0.6 } : {})
                                                                    }}
                                                                >
                                                                    {procesandoId === d.id ? "⏳" : "✅"}
                                                                    {procesandoId === d.id ? "Procesando" : "Aprobar"}
                                                                </button>
                                                                <button
                                                                    onClick={() => rechazarDeposito(d.id)}
                                                                    disabled={procesandoId === d.id}
                                                                    style={{
                                                                        ...styles.smallButton,
                                                                        ...styles.dangerButton,
                                                                        ...(procesandoId === d.id ? { opacity: 0.6 } : {})
                                                                    }}
                                                                >
                                                                    ❌ Rechazar
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            ) : (
                                retirosPendientes.length === 0 ? (
                                    <div style={styles.emptyState}>
                                        <span style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>💸</span>
                                        No hay retiros pendientes de aprobación
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={styles.table}>
                                            <thead style={styles.tableHeader}>
                                                <tr>
                                                    <th style={styles.th}>ID</th>
                                                    <th style={styles.th}>Usuario</th>
                                                    <th style={styles.th}>Monto</th>
                                                    <th style={styles.th}>Método</th>
                                                    <th style={styles.th}>Cuenta Destino</th>
                                                    <th style={styles.th}>Referencia</th>
                                                    <th style={styles.th}>Fecha</th>
                                                    <th style={styles.th}>Saldo Usuario</th>
                                                    <th style={styles.th}>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {retirosPendientes.map(r => {
                                                    const saldoSuficiente = r.usuario?.saldo ? r.usuario.saldo >= r.monto : false;
                                                    return (
                                                        <tr key={r.id} style={styles.tableRow}>
                                                            <td style={styles.td}>#{r.id}</td>
                                                            <td style={styles.td}>
                                                                <strong>{r.usuario?.username || `ID: ${r.usuario_id}`}</strong>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                    {r.usuario?.email}
                                                                    {r.usuario?.verificado && (
                                                                        <span style={{ marginLeft: '0.5rem', color: '#059669' }}>✓ Verificado</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td style={styles.td}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                                    <strong style={{ color: '#dc2626' }}>
                                                                        ${Number(r.monto).toLocaleString()}
                                                                    </strong>
                                                                    {r.comision > 0 && (
                                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                                            Comisión: ${Number(r.comision).toLocaleString()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td style={styles.td}>
                                                                <span style={{
                                                                    ...styles.badge,
                                                                    ...styles.badgeInfo
                                                                }}>
                                                                    {r.metodo_retiro}
                                                                </span>
                                                            </td>
                                                            <td style={styles.td}>
                                                                <code style={{ 
                                                                    fontSize: '0.75rem', 
                                                                    backgroundColor: '#f1f5f9', 
                                                                    padding: '0.25rem 0.5rem', 
                                                                    borderRadius: '4px',
                                                                    wordBreak: 'break-all'
                                                                }}>
                                                                    {r.cuenta_destino}
                                                                </code>
                                                            </td>
                                                            <td style={styles.td}>
                                                                <code style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                                                    {r.referencia}
                                                                </code>
                                                            </td>
                                                            <td style={styles.td}>
                                                                {new Date(r.fecha_solicitud).toLocaleString('es-ES')}
                                                            </td>
                                                            <td style={styles.td}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <strong style={{ 
                                                                        color: saldoSuficiente ? '#059669' : '#dc2626'
                                                                    }}>
                                                                        ${r.usuario?.saldo?.toLocaleString() || 'N/A'}
                                                                    </strong>
                                                                    {!saldoSuficiente && (
                                                                        <span style={{
                                                                            ...styles.badge,
                                                                            ...styles.badgeError,
                                                                            fontSize: '0.625rem'
                                                                        }}>
                                                                            ❌ Insuficiente
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td style={styles.td}>
                                                                <div style={styles.actionButtons}>
                                                                    <button
                                                                        onClick={() => aprobarRetiro(r.id)}
                                                                        disabled={procesandoId === r.id || !saldoSuficiente}
                                                                        title={!saldoSuficiente ? "Saldo insuficiente" : "Aprobar retiro"}
                                                                        style={{
                                                                            ...styles.smallButton,
                                                                            ...styles.successButton,
                                                                            ...(procesandoId === r.id ? { opacity: 0.6 } : {}),
                                                                            ...(!saldoSuficiente ? { opacity: 0.5, cursor: 'not-allowed' } : {})
                                                                        }}
                                                                    >
                                                                        {procesandoId === r.id ? "⏳" : "✅"}
                                                                        {procesandoId === r.id ? "Procesando" : "Aprobar"}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => rechazarRetiro(r.id)}
                                                                        disabled={procesandoId === r.id}
                                                                        style={{
                                                                            ...styles.smallButton,
                                                                            ...styles.dangerButton,
                                                                            ...(procesandoId === r.id ? { opacity: 0.6 } : {})
                                                                        }}
                                                                    >
                                                                        ❌ Rechazar
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Verificaciones pendientes */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h3 style={styles.cardTitle}>
                                <span>📂</span>
                                Verificaciones Pendientes ({verificacionesReales.length})
                            </h3>
                        </div>
                        <div style={styles.cardContent}>
                            {verificacionesReales.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <span style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>📋</span>
                                    No hay verificaciones pendientes
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={styles.table}>
                                        <thead style={styles.tableHeader}>
                                            <tr>
                                                <th style={styles.th}>ID</th>
                                                <th style={styles.th}>Usuario</th>
                                                <th style={styles.th}>Fecha</th>
                                                <th style={styles.th}>Archivo</th>
                                                <th style={styles.th}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {verificacionesReales.map(v => (
                                                <tr key={v.id} style={styles.tableRow}>
                                                    <td style={styles.td}>#{v.id}</td>
                                                    <td style={styles.td}>
                                                        <strong>{v.usuario?.username || `ID: ${v.usuario_id}`}</strong>
                                                    </td>
                                                    <td style={styles.td}>
                                                        {new Date(v.creado_en).toLocaleString('es-ES')}
                                                    </td>
                                                    <td style={styles.td}>
                                                        <a
                                                            href={`http://localhost:8000/${v.archivo_url}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={styles.link}
                                                        >
                                                            📄 Ver recibo
                                                        </a>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <div style={styles.actionButtons}>
                                                            <button
                                                                onClick={() => aprobarUsuario(v.usuario_id)}
                                                                disabled={procesandoId === v.usuario_id}
                                                                style={{
                                                                    ...styles.smallButton,
                                                                    ...styles.successButton,
                                                                    ...(procesandoId === v.usuario_id ? { opacity: 0.6 } : {})
                                                                }}
                                                            >
                                                                {procesandoId === v.usuario_id ? "⏳" : "✅"}
                                                                {procesandoId === v.usuario_id ? "Procesando" : "Aprobar"}
                                                            </button>

                                                            <button
                                                                onClick={() => eliminarVerificacion(v.usuario_id)}
                                                                style={{
                                                                    ...styles.smallButton,
                                                                    ...styles.dangerButton,
                                                                    opacity: 0.5
                                                                }}
                                                            >
                                                                ❌ Rechazar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Gestión de usuarios */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={styles.cardTitle}>
                                    <span>👥</span>
                                    Gestión de Usuarios ({usuarios.length})
                                </h3>
                            </div>
                        </div>
                        <div style={styles.cardContent}>
                            <div style={styles.searchContainer}>
                                <input
                                    placeholder="🔍 Buscar por usuario o email..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    style={styles.input}
                                />
                                <select
                                    value={filtro}
                                    onChange={(e) => setFiltro(e.target.value as any)}
                                    style={styles.select}
                                >
                                    <option value="todos">Todos los usuarios</option>
                                    <option value="verificados">✅ Verificados</option>
                                    <option value="no_verificados">❌ No verificados</option>
                                </select>
                            </div>

                            {usuariosFiltrados.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <span style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>👤</span>
                                    No se encontraron usuarios con esos filtros
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={styles.table}>
                                        <thead style={styles.tableHeader}>
                                            <tr>
                                                <th style={styles.th}>ID</th>
                                                <th style={styles.th}>Usuario</th>
                                                <th style={styles.th}>Email</th>
                                                <th style={styles.th}>Estado</th>
                                                <th style={styles.th}>Saldo</th>
                                                <th style={styles.th}>Referido por</th>
                                                <th style={styles.th}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usuariosFiltrados.map(u => (
                                                <tr
                                                    key={u.id}
                                                    style={{
                                                        ...styles.tableRow
                                                    }}
                                                >
                                                    <td style={styles.td}>#{u.id}</td>
                                                    <td style={styles.td}>
                                                        <strong style={{ color: u.username === 'admin' ? '#dc2626' : '#1e293b' }}>
                                                            {u.username}
                                                            {u.username === 'admin' && <span style={{ marginLeft: '0.5rem' }}>👑</span>}
                                                        </strong>
                                                    </td>
                                                    <td style={styles.td}>{u.email}</td>
                                                    <td style={styles.td}>
                                                        <span style={{
                                                            ...styles.badge,
                                                            ...(u.verificado ? styles.badgeSuccess : styles.badgeError)
                                                        }}>
                                                            {u.verificado ? "✅ Verificado" : "❌ No verificado"}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <strong style={{ color: '#059669' }}>
                                                            ${Number(u.saldo).toFixed(2)}
                                                        </strong>
                                                    </td>
                                                    <td style={styles.td}>
                                                        {u.referido_por ? `#${u.referido_por}` :
                                                            <span style={{ color: '#9ca3af' }}>—</span>}
                                                    </td>
                                                    <td style={styles.td}>
                                                        <div style={styles.actionButtons}>
                                                            {!u.verificado && (
                                                                <button
                                                                    onClick={() => aprobarUsuario(u.id)}
                                                                    disabled={procesandoId === u.id}
                                                                    style={{
                                                                        ...styles.smallButton,
                                                                        ...styles.successButton,
                                                                        ...(procesandoId === u.id ? { opacity: 0.6 } : {})
                                                                    }}
                                                                >
                                                                    {procesandoId === u.id ? "⏳" : "✅"}
                                                                    {procesandoId === u.id ? "..." : "Verificar"}
                                                                </button>
                                                            )}

                                                            <button
                                                                disabled={eliminarUsuarioDisabled || u.username === "admin"}
                                                                title={eliminarUsuarioDisabled ? "Endpoint no implementado en backend" : "Eliminar usuario"}
                                                                style={{
                                                                    ...styles.smallButton,
                                                                    ...styles.dangerButton,
                                                                    opacity: (eliminarUsuarioDisabled || u.username === "admin") ? 0.5 : 1,
                                                                    cursor: (eliminarUsuarioDisabled || u.username === "admin") ? 'not-allowed' : 'pointer'
                                                                }}
                                                            >
                                                                🗑️ Eliminar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}