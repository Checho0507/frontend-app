import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import Header from "../components/header";
import Footer from "../components/footer";
import { API_URL } from "../api/auth";

interface Usuario {
  id: number;
  username: string;
  saldo: number;
  verificado: boolean;
  nivel?: string;
}

interface CartaPoker {
  valor: string;
  palo: string;
  valor_numerico: number;
}

interface HistorialPartida {
  id: number;
  resultado: string;
  ganancia: number;
  fecha: string;
  buyIn: number;
  boteFinal: number;
  manoJugador: string;
  manoBanca: string;
}

type EstadoJuego = "esperando" | "pre_flop" | "flop" | "turn" | "river" | "showdown" | "terminada";
type AccionJugador = "igualar" | "subir" | "pasar" | "retirarse";

export default function Poker() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cartasJugador, setCartasJugador] = useState<CartaPoker[]>([]);
  const [cartasBanca, setCartasBanca] = useState<CartaPoker[]>([]);
  const [cartasComunitarias, setCartasComunitarias] = useState<CartaPoker[]>([]);
  const [fichasJugador, setFichasJugador] = useState<number>(0);
  const [fichasBanca, setFichasBanca] = useState<number>(0);
  const [bote, setBote] = useState<number>(0);

  // apuestaMinima = TO_CALL (lo que falta para igualar)
  const [apuestaMinima, setApuestaMinima] = useState<number>(0);

  const [rondaActual, setRondaActual] = useState<EstadoJuego>("esperando");
  const [estado, setEstado] = useState<EstadoJuego>("esperando");
  const [mensaje, setMensaje] = useState<string>("");
  const [ganancia, setGanancia] = useState<number>(0);
  const [mostrarCartasBanca, setMostrarCartasBanca] = useState<boolean>(false);
  const [manoJugador, setManoJugador] = useState<string>("");
  const [manoBanca, setManoBanca] = useState<string>("");

  // blinds
  const [smallBlind, setSmallBlind] = useState<number>(25);
  const [bigBlind, setBigBlind] = useState<number>(50);

  const [apuestaSeleccionada, setApuestaSeleccionada] = useState<number>(1000);
  const [blindSeleccionado, setBlindSeleccionado] = useState<number>(25);
  const [apuestasPermitidas, setApuestasPermitidas] = useState<number[]>([200, 500, 1000, 2500, 5000, 10000]);
  const [blindsDisponibles, setBlindsDisponibles] = useState<number[]>([10, 25, 50, 100, 200, 500]);

  const [montoSubida, setMontoSubida] = useState<number>(0);

  const [historial, setHistorial] = useState<HistorialPartida[]>([]);
  const [estadisticas, setEstadisticas] = useState({
    totalPartidas: 0,
    gananciaTotal: 0,
    buyInTotal: 0,
    balance: 0,
    partidasGanadas: 0,
  });

  const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(
    null
  );

  useEffect(() => {
    if (!usuario) {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const usuarioGuardado = localStorage.getItem("usuario");
      if (usuarioGuardado) {
        try {
          setUsuario(JSON.parse(usuarioGuardado));
        } catch {}
      }
    }
  }, [navigate, usuario]);

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const [resApuestas, resBlinds] = await Promise.all([
          axios.get(`${API_URL}/juegos/poker/apuestas-permitidas`),
          axios.get(`${API_URL}/juegos/poker/blinds`),
        ]);
        setApuestasPermitidas(resApuestas.data.apuestas_permitidas);
        setBlindsDisponibles(resBlinds.data.blinds_disponibles);
        setApuestaSeleccionada(resApuestas.data.apuestas_permitidas[2] || 1000);
        setBlindSeleccionado(resBlinds.data.blinds_disponibles[1] || 25);
      } catch (error) {
        console.error("Error al cargar configuración:", error);
      }
    };
    cargarConfiguracion();

    const historialGuardado = localStorage.getItem("historial_poker");
    if (historialGuardado) setHistorial(JSON.parse(historialGuardado).slice(0, 10));
  }, []);

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotificacion({ text, type });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const agregarAlHistorial = (resultado: string, ganancia: number, buyIn: number, boteFinal: number, manoJugador: string, manoBanca: string) => {
    const nueva: HistorialPartida = {
      id: Date.now(),
      resultado,
      ganancia,
      buyIn,
      boteFinal,
      manoJugador,
      manoBanca,
      fecha: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nuevoHistorial = [nueva, ...historial.slice(0, 9)];
    setHistorial(nuevoHistorial);
    localStorage.setItem("historial_poker", JSON.stringify(nuevoHistorial));

    const esVictoria = ganancia > 0;
    setEstadisticas((prev) => ({
      ...prev,
      totalPartidas: prev.totalPartidas + 1,
      gananciaTotal: prev.gananciaTotal + (ganancia > 0 ? ganancia : 0),
      buyInTotal: prev.buyInTotal + buyIn,
      balance: prev.balance + ganancia,
      partidasGanadas: prev.partidasGanadas + (esVictoria ? 1 : 0),
    }));
  };

  const animarConfetti = () => {
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } });
  };

  const reiniciarJuego = () => {
    setSessionId(null);
    setCartasJugador([]);
    setCartasBanca([]);
    setCartasComunitarias([]);
    setFichasJugador(0);
    setFichasBanca(0);
    setBote(0);
    setApuestaMinima(0);
    setRondaActual("esperando");
    setEstado("esperando");
    setMensaje("");
    setGanancia(0);
    setMostrarCartasBanca(false);
    setManoJugador("");
    setManoBanca("");
    setMontoSubida(0);
  };

  const iniciarJuego = async () => {
    if (!usuario) return showMsg("Debes iniciar sesión para jugar", "error");
    if (usuario.saldo < apuestaSeleccionada)
      return showMsg(`Saldo insuficiente. Necesitas $${apuestaSeleccionada} para jugar.`, "error");

    setCargando(true);
    setMensaje("");
    setCartasJugador([]);
    setCartasBanca([]);
    setCartasComunitarias([]);
    setMostrarCartasBanca(false);
    setRondaActual("esperando");
    setEstado("esperando");
    setGanancia(0);
    setManoJugador("");
    setManoBanca("");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/poker/iniciar?apuesta=${apuestaSeleccionada}&blind=${blindSeleccionado}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSessionId(res.data.session_id);
      setCartasJugador(res.data.cartas_jugador);
      setFichasJugador(res.data.fichas_jugador);
      setFichasBanca(res.data.fichas_banca);
      setBote(res.data.bote);
      setApuestaMinima(res.data.apuesta_minima);
      setRondaActual(res.data.ronda_actual as EstadoJuego);
      setEstado(res.data.estado as EstadoJuego);

      setSmallBlind(res.data.small_blind ?? blindSeleccionado);
      setBigBlind(res.data.big_blind ?? blindSeleccionado * 2);

      setUsuario((prev) => (prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev));
      showMsg("¡Juego iniciado! Elige una acción para esta ronda.", "success");
    } catch (error: any) {
      showMsg(error.response?.data?.detail || "Error al iniciar el juego.", "error");
    } finally {
      setCargando(false);
    }
  };

  const realizarAccion = async (accion: AccionJugador, cantidad: number = 0) => {
    if (!sessionId || estado === "terminada") return;
    setCargando(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/juegos/poker/${sessionId}/accion?accion=${accion}&cantidad=${cantidad}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.fichas_jugador !== undefined) setFichasJugador(res.data.fichas_jugador);
      if (res.data.fichas_banca !== undefined) setFichasBanca(res.data.fichas_banca);
      if (res.data.bote !== undefined) setBote(res.data.bote);
      if (res.data.apuesta_minima !== undefined) setApuestaMinima(res.data.apuesta_minima);
      if (res.data.ronda_actual) setRondaActual(res.data.ronda_actual as EstadoJuego);
      if (res.data.cartas_comunitarias) setCartasComunitarias(res.data.cartas_comunitarias);
      if (res.data.estado) setEstado(res.data.estado as EstadoJuego);

      if (res.data.accion_banca) showMsg(`La banca: ${res.data.accion_banca}`, "info");

      if (res.data.estado === "terminada" || res.data.resultado) {
        setEstado("terminada");
        setMensaje(res.data.resultado || "Juego terminado");
        setGanancia(res.data.ganancia || 0);

        if (res.data.cartas_banca) {
          setCartasBanca(res.data.cartas_banca);
          setMostrarCartasBanca(true);
        }
        if (res.data.mano_jugador) setManoJugador(res.data.mano_jugador);
        if (res.data.mano_banca) setManoBanca(res.data.mano_banca);

        if (res.data.nuevo_saldo !== undefined) {
          setUsuario((prev) => (prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev));
        }

        agregarAlHistorial(
          res.data.resultado || "Partida terminada",
          res.data.ganancia || 0,
          apuestaSeleccionada,
          res.data.bote_final || 0,
          res.data.mano_jugador || "",
          res.data.mano_banca || ""
        );

        if ((res.data.ganancia || 0) > 0) animarConfetti();

        setSessionId(null);
      }
    } catch (error: any) {
      showMsg(error.response?.data?.detail || "Error al realizar acción.", "error");
    } finally {
      setCargando(false);
    }
  };

  const rendirse = async () => {
    if (!sessionId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/juegos/poker/${sessionId}/rendirse`, {}, { headers: { Authorization: `Bearer ${token}` } });

      setEstado("terminada");
      setMensaje(res.data.resultado);
      setGanancia(res.data.ganancia);
      setUsuario((prev) => (prev ? { ...prev, saldo: res.data.nuevo_saldo } : prev));
      setSessionId(null);

      agregarAlHistorial(res.data.resultado, res.data.ganancia, apuestaSeleccionada, 0, "Rendición", "");
    } catch (error: any) {
      showMsg(error.response?.data?.detail || "Error al rendirse", "error");
    }
  };

  const obtenerEstado = async () => {
    if (!sessionId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/juegos/poker/${sessionId}/estado`, { headers: { Authorization: `Bearer ${token}` } });

      setCartasJugador(res.data.cartas_jugador);
      setFichasJugador(res.data.fichas_jugador);
      setFichasBanca(res.data.fichas_banca);
      setBote(res.data.bote);
      setApuestaMinima(res.data.apuesta_minima);
      setRondaActual(res.data.ronda_actual as EstadoJuego);
      setEstado(res.data.estado as EstadoJuego);
      setCartasComunitarias(res.data.cartas_comunitarias || []);
    } catch (error) {
      console.error("Error al obtener estado:", error);
    }
  };

  const renderCarta = (carta: CartaPoker, oculta: boolean = false, esComunitaria: boolean = false) => {
    if (oculta) {
      return (
        <div className="w-16 h-24 bg-gradient-to-br from-red-900 to-red-800 rounded-lg flex items-center justify-center border-2 border-red-700 shadow-lg">
          <span className="text-white text-2xl">?</span>
        </div>
      );
    }

    const color = carta.palo === "♠️" || carta.palo === "♣️" ? "text-gray-900" : "text-red-600";
    const bgColor = esComunitaria ? "from-green-50 to-green-100" : "from-white to-gray-50";

    return (
      <div className={`w-16 h-24 bg-gradient-to-br ${bgColor} rounded-lg flex flex-col items-center justify-center border-2 border-gray-300 shadow-lg ${color}`}>
        <div className="text-sm font-bold">{carta.valor}</div>
        <div className="text-2xl">{carta.palo}</div>
      </div>
    );
  };

  const renderRonda = () => {
    switch (rondaActual) {
      case "pre_flop":
        return "Pre-Flop (Cartas privadas)";
      case "flop":
        return "Flop (3 cartas comunitarias)";
      case "turn":
        return "Turn (4ª carta comunitaria)";
      case "river":
        return "River (5ª carta comunitaria)";
      case "showdown":
        return "Showdown (Revelación final)";
      default:
        return "Esperando para comenzar";
    }
  };

  const limpiarHistorial = () => {
    setHistorial([]);
    localStorage.removeItem("historial_poker");
    showMsg("Historial limpiado", "info");
  };

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-xl font-bold">Cargando Póker...</p>
        </div>
      </div>
    );
  }

  const puedePasar = apuestaMinima === 0;
  const puedeIgualar = apuestaMinima > 0 && fichasJugador >= apuestaMinima;

  const minSubida = (apuestaMinima > 0 ? apuestaMinima + bigBlind : bigBlind);
  const puedeSubir = fichasJugador >= minSubida;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900">
      {notificacion && (
        <div
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl font-bold flex items-center space-x-3 shadow-2xl animate-slideIn ${
            notificacion.type === "success"
              ? "bg-gradient-to-r from-green-900/90 to-green-800/90 border border-green-500/50 text-green-200"
              : notificacion.type === "error"
              ? "bg-gradient-to-r from-red-900/90 to-red-800/90 border border-red-500/50 text-red-200"
              : "bg-gradient-to-r from-blue-900/90 to-blue-800/90 border border-blue-500/50 text-blue-200"
          }`}
        >
          <span className="text-xl">{notificacion.type === "success" ? "✅" : notificacion.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{notificacion.text}</span>
        </div>
      )}

      <Header
        usuario={usuario}
        cerrarSesion={() => {
          localStorage.clear();
          navigate("/login");
        }}
        setUsuario={setUsuario}
      />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-yellow-500/10"></div>
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block mb-6">
              <span className="px-4 py-2 bg-gradient-to-r from-red-600/20 to-yellow-600/20 border border-red-500/30 rounded-full text-sm font-bold text-red-400">
                ♠️ TEXAS HOLD'EM VIP ♦️
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-red-400 via-yellow-400 to-red-400 bg-clip-text text-transparent">¡Póker Texas Hold'em!</span>
              <br />
              <span className="text-white">Compite contra la banca</span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Buy-in desde <span className="text-yellow-400 font-bold">${apuestasPermitidas[0]}</span> hasta{" "}
              <span className="text-yellow-400 font-bold">${apuestasPermitidas[apuestasPermitidas.length - 1]}</span>.
              <span className="text-red-400 font-bold"> Una acción por ronda: pasar/igualar/subir/retirarse.</span>
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              {estado === "esperando" && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">💰 Configura tu partida</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-300 mb-3">Buy-in</h4>
                      <div className="flex gap-2 flex-wrap">
                        {apuestasPermitidas.map((apuesta) => (
                          <button
                            key={apuesta}
                            onClick={() => setApuestaSeleccionada(apuesta)}
                            disabled={usuario.saldo < apuesta}
                            className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 ${
                              apuestaSeleccionada === apuesta
                                ? "bg-gradient-to-r from-yellow-600 to-red-600 text-white shadow-lg scale-105"
                                : usuario.saldo < apuesta
                                ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700"
                                : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white border border-gray-700"
                            }`}
                          >
                            ${apuesta.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-300 mb-3">Blind Pequeño</h4>
                      <div className="flex gap-2 flex-wrap">
                        {blindsDisponibles.map((blind) => (
                          <button
                            key={blind}
                            onClick={() => setBlindSeleccionado(blind)}
                            className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 ${
                              blindSeleccionado === blind
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                                : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/70 hover:text-white border border-gray-700"
                            }`}
                          >
                            ${blind}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-gray-400">
                    Buy-in: <span className="text-yellow-400 font-bold">${apuestaSeleccionada.toLocaleString()}</span>
                    <span className="mx-4">•</span>
                    SB: <span className="text-blue-400 font-bold">${blindSeleccionado}</span>
                    <span className="mx-4">•</span>
                    BB: <span className="text-purple-400 font-bold">${blindSeleccionado * 2}</span>
                  </div>
                </div>
              )}

              <div className="mb-8">
                <div className="mb-12">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">🎯 {renderRonda()}</h3>
                  <div className="flex gap-4 justify-center flex-wrap mb-6">
                    {cartasComunitarias.map((carta, i) => (
                      <div key={i} className="transform hover:scale-110 transition-transform">
                        {renderCarta(carta, false, true)}
                      </div>
                    ))}
                    {rondaActual === "pre_flop" &&
                      [...Array(5)].map((_, i) => (
                        <div key={`empty-${i}`} className="w-16 h-24 bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-600"></div>
                      ))}
                  </div>

                  <div className="text-center mb-4">
                    <div className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 rounded-xl border border-yellow-600/30">
                      <div className="text-sm text-yellow-300">Bote Actual</div>
                      <div className="text-2xl font-bold text-yellow-400">${bote.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center my-8">
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                  <div className="px-4 text-gray-500">VS</div>
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="inline-block px-4 py-2 mb-4 bg-gradient-to-r from-green-900/40 to-green-800/40 rounded-xl border border-green-600/30">
                      <h3 className="text-xl font-bold text-green-400">
                        🎯 Tú <span className="ml-2 text-sm text-green-300">(${fichasJugador.toLocaleString()})</span>
                      </h3>
                    </div>
                    <div className="flex gap-4 justify-center flex-wrap">
                      {cartasJugador.map((carta, i) => (
                        <div key={i} className="transform hover:scale-110 transition-transform">
                          {renderCarta(carta)}
                        </div>
                      ))}
                    </div>
                    {manoJugador && (
                      <div className="mt-3 px-4 py-2 bg-green-900/30 rounded-lg">
                        <div className="text-sm text-green-400">{manoJugador}</div>
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <div className="inline-block px-4 py-2 mb-4 bg-gradient-to-r from-red-900/40 to-red-800/40 rounded-xl border border-red-600/30">
                      <h3 className="text-xl font-bold text-red-400">
                        🏦 Banca <span className="ml-2 text-sm text-red-300">(${fichasBanca.toLocaleString()})</span>
                      </h3>
                    </div>
                    <div className="flex gap-4 justify-center flex-wrap">
                      {cartasBanca.length > 0 ? (
                        cartasBanca.map((carta, i) => <div key={i}>{renderCarta(carta, !mostrarCartasBanca)}</div>)
                      ) : (
                        <>
                          <div>{renderCarta({ valor: "?", palo: "?", valor_numerico: 0 }, true)}</div>
                          <div>{renderCarta({ valor: "?", palo: "?", valor_numerico: 0 }, true)}</div>
                        </>
                      )}
                    </div>
                    {manoBanca && (
                      <div className="mt-3 px-4 py-2 bg-red-900/30 rounded-lg">
                        <div className="text-sm text-red-400">{manoBanca}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="mb-6">
                  <div className="text-2xl font-bold text-white mb-2">
                    Saldo: <span className="text-yellow-400">${usuario?.saldo?.toLocaleString() ?? 0}</span>
                  </div>

                  {mensaje && (
                    <div
                      className={`px-6 py-4 rounded-xl font-bold mb-4 ${
                        ganancia > 0
                          ? "bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-500/50 text-green-200"
                          : ganancia < 0
                          ? "bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/50 text-red-200"
                          : "bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 border border-yellow-500/50 text-yellow-200"
                      }`}
                    >
                      {mensaje}
                      {ganancia !== 0 && (
                        <div className="text-lg mt-2">
                          {ganancia > 0 ? (
                            <span className="text-green-400">💰 Ganancia: +${ganancia.toLocaleString()}</span>
                          ) : (
                            <span className="text-red-400">💸 Pérdida: ${Math.abs(ganancia).toLocaleString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {estado !== "terminada" && estado !== "esperando" && (
                    <div className="px-4 py-3 bg-gray-800/40 rounded-xl mb-4">
                      <div className="text-lg font-bold text-white">
                        Para igualar: <span className="text-yellow-400">${apuestaMinima.toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        SB: ${smallBlind} • BB: ${bigBlind} • Tus fichas: ${fichasJugador.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {estado === "esperando" && (
                  <button
                    onClick={iniciarJuego}
                    disabled={cargando || usuario.saldo < apuestaSeleccionada}
                    className={`w-full max-w-xs py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 ${
                      cargando
                        ? "bg-gray-600 cursor-not-allowed opacity-70"
                        : "bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-500 hover:to-red-500 hover:scale-105 active:scale-95"
                    } ${usuario.saldo < apuestaSeleccionada ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {cargando ? "Iniciando..." : `♠️ Comenzar Partida ($${apuestaSeleccionada.toLocaleString()})`}
                  </button>
                )}

                {estado !== "esperando" && estado !== "terminada" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => realizarAccion("pasar")}
                        disabled={cargando || !puedePasar}
                        className={`py-3 px-6 rounded-xl font-bold transition-all duration-300 ${
                          cargando ? "bg-gray-600 cursor-not-allowed opacity-70" : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600"
                        } ${!puedePasar ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        🤚 Pasar
                      </button>

                      <button
                        onClick={() => realizarAccion("igualar")}
                        disabled={cargando || !puedeIgualar}
                        className={`py-3 px-6 rounded-xl font-bold transition-all duration-300 ${
                          cargando ? "bg-gray-600 cursor-not-allowed opacity-70" : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600"
                        } ${!puedeIgualar ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        💰 Igualar (${apuestaMinima})
                      </button>

                      <button
                        onClick={() => realizarAccion("subir", minSubida)}
                        disabled={cargando || !puedeSubir}
                        className={`py-3 px-6 rounded-xl font-bold transition-all duration-300 ${
                          cargando ? "bg-gray-600 cursor-not-allowed opacity-70" : "bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600"
                        } ${!puedeSubir ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        ⬆️ Subir (mín ${minSubida})
                      </button>

                      <button
                        onClick={() => realizarAccion("retirarse")}
                        disabled={cargando}
                        className={`py-3 px-6 rounded-xl font-bold transition-all duration-300 ${
                          cargando ? "bg-gray-600 cursor-not-allowed opacity-70" : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600"
                        }`}
                      >
                        🏳️ Retirarse
                      </button>
                    </div>

                    <div className="pt-4 border-t border-gray-700/50">
                      <div className="text-white font-bold mb-2">Subida personalizada (aporte total):</div>
                      <div className="flex gap-2 justify-center items-center">
                        <input
                          type="number"
                          min={minSubida}
                          max={fichasJugador}
                          value={montoSubida}
                          onChange={(e) => setMontoSubida(parseInt(e.target.value) || 0)}
                          className="w-40 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                          placeholder={`Mín: $${minSubida}`}
                        />
                        <button
                          onClick={() => realizarAccion("subir", montoSubida)}
                          disabled={cargando || montoSubida < minSubida || montoSubida > fichasJugador}
                          className="py-2 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Subir ${montoSubida.toLocaleString()}
                        </button>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Nota: “Subir” aquí es tu aporte total en la acción (igualar + raise).
                      </div>
                    </div>

                    <div className="mt-2">
                      <button
                        onClick={rendirse}
                        className="py-2 px-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-xl font-bold text-gray-300 transition-all duration-300"
                      >
                        ⚠️ Rendirse (Recuperar 50% de lo apostado)
                      </button>
                    </div>
                  </div>
                )}

                {estado === "terminada" && (
                  <div className="space-y-4">
                    <button
                      onClick={reiniciarJuego}
                      className="w-full max-w-xs py-4 px-8 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-500 hover:to-red-500 hover:scale-105 active:scale-95 transition-all duration-300"
                    >
                      ♠️ Nueva Partida
                    </button>

                    {!mostrarCartasBanca && cartasBanca.length === 0 && (
                      <button
                        onClick={obtenerEstado}
                        className="py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-bold transition-all duration-300"
                      >
                        🔄 Actualizar Estado
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <h3 className="text-xl font-bold text-white mb-4">📊 Tus Estadísticas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                  <div className="text-sm text-gray-400">Total Partidas</div>
                  <div className="text-2xl font-bold text-blue-400">{estadisticas.totalPartidas}</div>
                </div>
                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                  <div className="text-sm text-gray-400">Partidas Ganadas</div>
                  <div className="text-2xl font-bold text-green-400">{estadisticas.partidasGanadas}</div>
                </div>
                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                  <div className="text-sm text-gray-400">Ratio Victorias</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {estadisticas.totalPartidas > 0 ? `${((estadisticas.partidasGanadas / estadisticas.totalPartidas) * 100).toFixed(1)}%` : "0%"}
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                  <div className="text-sm text-gray-400">Balance</div>
                  <div className={`text-2xl font-bold ${estadisticas.balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                    ${estadisticas.balance}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">📝 Historial de Partidas</h3>
                {historial.length > 0 && (
                  <button onClick={limpiarHistorial} className="px-3 py-1 text-sm bg-red-900/30 text-red-300 hover:bg-red-800/40 rounded-lg transition-colors">
                    Limpiar
                  </button>
                )}
              </div>

              {historial.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">♠️</div>
                  <p className="text-gray-400">No hay partidas registradas</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {historial.map((p) => (
                    <div key={p.id} className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`font-medium ${p.ganancia > 0 ? "text-green-400" : "text-gray-300"}`}>
                            {p.resultado.length > 28 ? p.resultado.substring(0, 28) + "..." : p.resultado}
                          </div>
                          <div className="text-sm text-gray-400">{p.fecha}</div>
                          <div className="text-xs text-gray-500">Buy-in: ${p.buyIn} • Bote: ${p.boteFinal}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${p.ganancia > 0 ? "text-green-400" : "text-gray-300"}`}>
                            {p.ganancia > 0 ? `+$${p.ganancia}` : `-$${Math.abs(p.ganancia)}`}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{p.manoJugador}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-yellow-600/20 to-red-600/20 border border-yellow-500/30 rounded-2xl p-6">
              <h4 className="text-lg font-bold text-white mb-3">💡 Nota</h4>
              <div className="text-gray-300 text-sm leading-relaxed">
                En este modo: <strong>1 acción por ronda</strong>. Tras tu acción, la banca responde una vez y, si ambos quedan igualados, se avanza a la siguiente calle.
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
