import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/header";
import Footer from "../components/footer";
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

export default function Juegos() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [notificacion, setNotificacion] = useState<{ text: string; type?: "success" | "error" | "info" } | null>(null);
  const [estadisticasJuegos, setEstadisticasJuegos] = useState({
    totalJuegos: 0,
    juegosDisponibles: 0,
    multiplicadorMaximo: "500x"
  });

  useEffect(() => {
    console.log('Usuario en Referidos:', usuario);
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
      if (token) {
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
      }
    }
  }, [navigate, usuario, setUsuario]);

  // Cargar configuración de juegos disponibles
  useEffect(() => {
    const juegosDisponibles = [
      { nombre: "Ruleta", disponible: true },
      { nombre: "Dados", disponible: true },
      { nombre: "Tragamonedas", disponible: true },
      { nombre: "Blackjack", disponible: true },
      { nombre: "Minas", disponible: true },
      { nombre: "Aviator", disponible: true },
      { nombre: "Cara o Sello", disponible: true },
      { nombre: "Carta Mayor", disponible: true },
      { nombre: "Piedra, Papel o Tijera", disponible: true },
      { nombre: "Ruleta Europea", disponible: true }
    ];

    setEstadisticasJuegos({
      totalJuegos: juegosDisponibles.length,
      juegosDisponibles: juegosDisponibles.filter(j => j.disponible).length,
      multiplicadorMaximo: "500x"
    });
  }, []);

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setNotificacion({ text, type });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const cerrarSesion = () => {
    // Limpiar localStorage
    const itemsParaMantener = [
      "historial_blackjack",
      "estadisticas_acumulativas_blackjack",
      "historial_minas",
      "estadisticas_acumulativas_minas"
    ];

    // Eliminar todos los items excepto los de historial
    Object.keys(localStorage).forEach(key => {
      if (!itemsParaMantener.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    setUsuario(null);
    showMsg("Sesión cerrada correctamente", "success");
    setTimeout(() => navigate('/login'), 1500);
  };

  const juegos = [
    {
      nombre: "Ruleta",
      descripcion: "Gira la ruleta y gana grandes premios",
      ruta: "/juegos/ruleta",
      icono: "🎯",
      color: "from-red-500 to-pink-500",
      disponible: true
    },
    {
      nombre: "Dados",
      descripcion: "Apuesta y lanza los dados",
      ruta: "/juegos/dados",
      icono: "🎲",
      color: "from-green-500 to-emerald-500",
      disponible: true
    },
    {
      nombre: "Tragamonedas",
      descripcion: "Gira y alinea símbolos para ganar",
      ruta: "/juegos/tragamonedas",
      icono: "🎰",
      color: "from-yellow-500 to-amber-500",
      disponible: true
    },
    {
      nombre: "Blackjack",
      descripcion: "Consigue 21 y derrota a la banca",
      ruta: "/juegos/blackjack",
      icono: "🃏",
      color: "from-blue-500 to-purple-500",
      disponible: true
    },
    {
      nombre: "Minas",
      descripcion: "Encuentra las minas y multiplica tus ganancias",
      ruta: "/juegos/minas",
      icono: "💣",
      color: "from-orange-500 to-red-500",
      disponible: true
    },
    {
      nombre: "Aviator",
      descripcion: "Apuesta al vuelo y gana antes de que se estrelle",
      ruta: "/juegos/aviator",
      icono: "✈️",
      color: "from-cyan-500 to-blue-500",
      disponible: true
    },
    {
      nombre: "Cara o Sello",
      descripcion: "Apuesta al resultado del lanzamiento de una moneda",
      ruta: "/juegos/caraosello",
      icono: "🪙",
      color: "from-gray-500 to-gray-700",
      disponible: true
    },
    {
      nombre: "Carta Mayor",
      descripcion: "Apuesta a la carta más alta y gana",
      ruta: "/juegos/cartamayor",
      icono: "🃏",
      color: "from-pink-500 to-purple-500",
      disponible: true
    },
    {
      nombre: "Piedra, Papel o Tijera",
      descripcion: "Desafía al sistema en este clásico juego",
      ruta: "/juegos/piedrapapeltijera",
      icono: "✊",
      color: "from-yellow-500 to-red-500",
      disponible: true
    },
    {
      nombre: "Ruleta Europea",
      descripcion: "Disfruta de la versión clásica de la ruleta",
      ruta: "/juegos/ruletaeuropea",
      icono: "🎡",
      color: "from-purple-500 to-pink-500",
      disponible: false
    }
  ];

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-xl font-bold">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

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

      {/* Header Component */}
      <Header
        usuario={usuario}
        cerrarSesion={cerrarSesion}
        setUsuario={setUsuario}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-green-500/10"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-yellow-500 to-green-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-500 to-red-500 rounded-full blur-3xl opacity-20"></div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block mb-6">
              <span className="px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-full text-sm font-bold text-yellow-400">
                🎮 ZONA DE JUEGOS EXCLUSIVA
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400 bg-clip-text text-transparent animate-gradient">
                Sala de Juegos VIP
              </span>
              <br />
              <span className="text-white">Diversión y Grandes Premios</span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Invierte, juega y pon a prueba tu suerte con nuestros juegos exclusivos.
              <span className="text-yellow-400 font-bold"> ¡Gana hasta {estadisticasJuegos.multiplicadorMaximo} tu inversión!</span>
            </p>

            {/* Stats Mini */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-white">{estadisticasJuegos.totalJuegos}</div>
                <div className="text-sm text-gray-400">Juegos Disponibles</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-white">{estadisticasJuegos.multiplicadorMaximo}</div>
                <div className="text-sm text-gray-400">Multiplicador Máximo</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-white">98.7%</div>
                <div className="text-sm text-gray-400">Tasa de Pago</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                <div className="text-2xl font-bold text-white">24/7</div>
                <div className="text-sm text-gray-400">Disponibilidad</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lista de juegos */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">🎯 Elige Tu Juego Favorito</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Cada juego ofrece experiencias únicas y oportunidades para multiplicar tu inversión
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {juegos.map((juego, i) => (
            <div
              key={i}
              onClick={() => juego.disponible ? navigate(juego.ruta) : null}
              className={`group bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300 cursor-pointer ${juego.disponible
                ? 'border-gray-700/50 hover:border-yellow-500/50 hover:scale-[1.02]'
                : 'border-gray-700/30 opacity-70 cursor-not-allowed'
                }`}
            >
              <div className="flex flex-col items-center text-center h-full">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-gradient-to-br ${juego.color} shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300`}>
                  <span className="text-4xl">{juego.icono}</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{juego.nombre}</h3>

                <p className="text-gray-400 text-sm mb-4 flex-grow">{juego.descripcion}</p>

                <div className="w-full mt-auto">
                  {juego.disponible ? (
                    <div className="bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-xl p-3 group-hover:border-yellow-400/50 transition-colors">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-green-400">✓</span>
                        <span className="text-sm text-gray-300">Disponible</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600/30 rounded-xl p-3">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-yellow-400">⏳</span>
                        <span className="text-sm text-gray-400">Próximamente</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Información adicional */}
        <div className="mt-16 bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">💰</span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Apuestas Mínimas</h4>
              <p className="text-gray-300">Desde $100 por juego</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">⚡</span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Retiros Rápidos</h4>
              <p className="text-gray-300">Ganancias disponibles en segundos</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">🏆</span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Bonos VIP</h4>
              <p className="text-gray-300">+15% en depósitos para verificados</p>
            </div>
          </div>
        </div>

        {/* Información de juegos nuevos */}
        <div className="mt-12 p-6 bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-2xl">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <span className="text-2xl">💣</span>
            </div>
            <div>
              <h4 className="text-xl font-bold text-white mb-2">¡Nuevo Juego Disponible!</h4>
              <p className="text-gray-300">
                Prueba nuestro emocionante juego de <span className="text-yellow-400 font-bold">Minas</span>.
                Encuentra las casillas seguras y multiplica tus ganancias.
                <span className="text-green-400 font-bold"> ¡Retírate en cualquier momento y conserva tus ganancias!</span>
              </p>
              <button
                onClick={() => navigate('/juegos/minas')}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-lg transition-all duration-300 hover:scale-105"
              >
                Probar Minas 💣
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Component */}
      <Footer />
    </div>
  );
}