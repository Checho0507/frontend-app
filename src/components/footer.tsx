import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-lg border-t border-yellow-500/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-6 md:mb-0">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">$</span>
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
              BETREF
            </h2>
          </div>

          <div className="text-center md:text-right">
            <p className="text-gray-400 text-sm">© 2024 BETREF. Todos los derechos reservados.</p>
            <p className="text-gray-500 text-xs mt-2">Juego responsable. Prohibido el acceso a menores de 18 años.</p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700/50 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors">Términos y Condiciones</a>
            <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors">Política de Privacidad</a>
            <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors">Juego Responsable</a>
            <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors">Centro de Ayuda</a>
            <a href="#" className="text-gray-400 hover:text-yellow-400 transition-colors">Contacto</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
