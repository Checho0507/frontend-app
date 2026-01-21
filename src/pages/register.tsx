import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_URL } from "../api/auth";

// Define el tipo de datos del formulario de registro
interface RegisterForm {
  referido_por: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const [searchParams] = useSearchParams();
  
  const [form, setForm] = useState<RegisterForm>({
    referido_por: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [referralBonusInfo, setReferralBonusInfo] = useState(false);

  // Capturar el código de referido de la URL al montar el componente
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setForm(prevForm => ({
        ...prevForm,
        referido_por: refCode
      }));
    }
  }, [searchParams]);

  // Función para validar email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Función para validar todo el formulario
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Validar términos
    if (!termsAccepted) {
      setError("Debes aceptar los términos y condiciones para registrarte");
      return false;
    }

    // Validar username
    if (!form.username.trim()) {
      errors.username = "El nombre de usuario es requerido";
      isValid = false;
    } else if (form.username.length < 3) {
      errors.username = "El nombre de usuario debe tener al menos 3 caracteres";
      isValid = false;
    }

    // Validar email
    if (!form.email.trim()) {
      errors.email = "El correo electrónico es requerido";
      isValid = false;
    } else if (!validateEmail(form.email)) {
      errors.email = "Por favor ingresa un correo electrónico válido (ejemplo: usuario@dominio.com)";
      isValid = false;
    }

    // Validar password
    if (!form.password) {
      errors.password = "La contraseña es requerida";
      isValid = false;
    } else if (form.password.length < 6) {
      errors.password = "La contraseña debe tener al menos 6 caracteres";
      isValid = false;
    }

    // Validar confirmación de password
    if (!form.confirmPassword) {
      errors.confirmPassword = "Por favor confirma tu contraseña";
      isValid = false;
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden";
      isValid = false;
    }

    // Validar código de referido (si se proporciona)
    if (form.referido_por && !/^\d+$/.test(form.referido_por)) {
      errors.referido_por = "El código de referido debe ser un número válido";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  // Limpiar error de un campo específico cuando el usuario empieza a editarlo
  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
    setError(""); // También limpiamos el error general
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    clearFieldError(name); // Limpiar error cuando el usuario empieza a escribir
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSuccess(false);

    // Validar formulario antes de enviar
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Preparar datos para envío
      const submitData = {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        referido_por: form.referido_por ? parseInt(form.referido_por) : null
      };

      console.log("Enviando datos:", submitData);

      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setForm({
          referido_por: "",
          username: "",
          email: "",
          password: "",
          confirmPassword: ""
        });
        setTermsAccepted(false);
        console.log("Usuario registrado:", data);
      } else {
        // Manejar errores específicos del backend
        if (res.status === 422) {
          const backendErrors = data.detail || {};
          const errorMessages: Record<string, string> = {};
          
          // Mapear errores del backend a campos específicos
          if (Array.isArray(backendErrors)) {
            backendErrors.forEach((err: any) => {
              if (err.loc && err.loc[1]) {
                const field = err.loc[1];
                errorMessages[field] = err.msg;
              }
            });
          }
          
          if (Object.keys(errorMessages).length > 0) {
            setFieldErrors(errorMessages);
            setError("Por favor corrige los errores en el formulario");
          } else {
            setError(data.detail || "Error en los datos enviados");
          }
        } else if (res.status === 400) {
          // Manejar errores 400 (bad request)
          if (data.detail && typeof data.detail === 'string') {
            // Intentar extraer información del error
            if (data.detail.includes('email') || data.detail.toLowerCase().includes('correo')) {
              setFieldErrors({ email: "El correo electrónico no es válido o ya está registrado" });
            } else if (data.detail.includes('username')) {
              setFieldErrors({ username: "El nombre de usuario ya existe" });
            } else {
              setError(data.detail);
            }
          } else {
            setError("Error en la solicitud. Verifica los datos ingresados.");
          }
        } else {
          setError(data.detail || "Error al registrar la cuenta");
        }
      }
    } catch (err) {
      console.error("Error completo:", err);
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="relative w-full max-w-md">
        {/* Efectos de fondo */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-green-500/10 rounded-3xl blur-xl"></div>
        <div className="absolute -top-4 -left-4 w-20 h-20 bg-gradient-to-r from-yellow-500 to-green-500 rounded-full blur-lg opacity-30"></div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-r from-purple-500 to-red-500 rounded-full blur-lg opacity-20"></div>
        
        {/* Tarjeta principal */}
        <div className="relative bg-gray-900/90 backdrop-blur-lg border border-gray-700/50 shadow-2xl rounded-2xl overflow-hidden">
          {/* Cabecera con patrón de juego */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 border-b border-yellow-500/30">
            <div className="flex items-center justify-center mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">$</span>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
                  BETREF
                </h1>
              </div>
            </div>
            <p className="text-center text-gray-300 text-sm">Crear Cuenta - ¡Gana desde el inicio!</p>
          </div>
          
          <div className="p-6 md:p-8">
            {/* Banner de bonificación */}
            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-600/20 to-green-600/20 border border-yellow-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">¡BONO DE BIENVENIDA!</p>
                    <p className="text-yellow-300 text-xs">100 créditos gratis + 10% en depósitos</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setReferralBonusInfo(!referralBonusInfo)}
                  className="text-yellow-400 hover:text-yellow-300 text-sm font-medium"
                >
                  {referralBonusInfo ? "Menos info" : "Más info"}
                </button>
              </div>
              
              {referralBonusInfo && (
                <div className="mt-3 pt-3 border-t border-yellow-500/30">
                  <ul className="text-gray-300 text-xs space-y-1">
                    <li className="flex items-start">
                      <svg className="w-3 h-3 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>100 créditos</strong> al verificar tu cuenta</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-3 h-3 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>10% extra</strong> en tu primer depósito</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-3 h-3 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>15% de comisión</strong> por cada referido activo</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Código de Referido */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Código de Referido <span className="text-gray-500 text-xs">(opcional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="referido_por"
                    placeholder="Ingresa código de referido"
                    value={form.referido_por}
                    onChange={handleChange}
                    className={`w-full pl-10 p-3 bg-gray-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white placeholder-gray-500 ${
                      fieldErrors.referido_por 
                        ? 'border-red-500 focus:ring-red-500' 
                        : form.referido_por 
                          ? 'border-green-500' 
                          : 'border-gray-700'
                    }`}
                  />
                  {form.referido_por && !fieldErrors.referido_por && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {fieldErrors.referido_por && (
                  <p className="text-red-400 text-xs mt-1 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.referido_por}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {form.referido_por && !fieldErrors.referido_por
                    ? "✓ Código aplicado - Recibirás bonos extras" 
                    : "Si te refirió alguien, gana ambos bonos extras"
                  }
                </p>
              </div>

              {/* Nombre de Usuario */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="username"
                    placeholder="Ej: apostador_pro"
                    value={form.username}
                    onChange={handleChange}
                    className={`w-full pl-10 p-3 bg-gray-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white placeholder-gray-500 ${
                      fieldErrors.username ? 'border-red-500 focus:ring-red-500' : 'border-gray-700'
                    }`}
                    required
                    minLength={3}
                  />
                </div>
                {fieldErrors.username && (
                  <p className="text-red-400 text-xs mt-1 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="tucorreo@ejemplo.com"
                    value={form.email}
                    onChange={handleChange}
                    className={`w-full pl-10 p-3 bg-gray-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white placeholder-gray-500 ${
                      fieldErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-700'
                    }`}
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-red-400 text-xs mt-1 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.email}
                  </p>
                )}
                {!fieldErrors.email && form.email && !validateEmail(form.email) && (
                  <p className="text-yellow-400 text-xs mt-1 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Ingresa un correo electrónico válido (ejemplo: usuario@dominio.com)
                  </p>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-10 p-3 bg-gray-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white placeholder-gray-500 ${
                      fieldErrors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-700'
                    }`}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showPassword ? (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </>
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-red-400 text-xs mt-1 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Confirmar Contraseña
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Repite tu contraseña"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`w-full p-3 bg-gray-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white placeholder-gray-500 ${
                    fieldErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-700'
                  }`}
                  required
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Términos y Condiciones */}
              <div className="flex items-start pt-2">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={() => {
                      setTermsAccepted(!termsAccepted);
                      if (error === "Debes aceptar los términos y condiciones para registrarte") {
                        setError("");
                      }
                    }}
                    className={`h-4 w-4 focus:ring-yellow-500 border rounded bg-gray-800 ${
                      error === "Debes aceptar los términos y condiciones para registrarte" 
                        ? 'border-red-500 text-red-600' 
                        : 'border-gray-700 text-yellow-600'
                    }`}
                    required
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="text-gray-300">
                    Acepto los{" "}
                    <a href="#" className="text-yellow-500 hover:text-yellow-400 font-medium">
                      Términos y Condiciones
                    </a>{" "}
                    y la{" "}
                    <a href="#" className="text-yellow-500 hover:text-yellow-400 font-medium">
                      Política de Privacidad
                    </a>
                  </label>
                  <p className="text-gray-500 text-xs mt-1">
                    Confirmo que soy mayor de 18 años y acepto las reglas del juego responsable.
                  </p>
                </div>
              </div>

              {/* Botón de Registro */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-4"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando cuenta...
                  </>
                ) : (
                  "¡Crear Cuenta y Recibir Bono!"
                )}
              </button>

              {/* Enlace a Login */}
              <div className="text-center mt-6">
                <p className="text-gray-400">
                  ¿Ya tienes cuenta?{" "}
                  <Link to="/login" className="text-yellow-500 hover:text-yellow-400 font-bold transition-colors">
                    Inicia sesión aquí
                  </Link>
                </p>
              </div>
            </form>

            {/* Mensajes de éxito y error general */}
            {success && (
              <div className="mt-6 p-4 bg-green-900/30 border border-green-700/50 text-green-300 rounded-xl flex items-start">
                <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">¡Cuenta creada exitosamente!</p>
                  <p className="text-sm mt-1">Revisa tu correo para verificar tu cuenta y activar tu bono de bienvenida.</p>
                </div>
              </div>
            )}

            {error && Object.keys(fieldErrors).length === 0 && (
              <div className="mt-6 p-4 bg-red-900/30 border border-red-700/50 text-red-300 rounded-xl flex items-start">
                <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Información de Seguridad */}
            <div className="mt-6 pt-4 border-t border-gray-800">
              <div className="flex items-center text-xs text-gray-500">
                <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Tu información está protegida con encriptación SSL de 256-bit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas legales */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Juego responsable. Apuestas permitidas solo para mayores de 18 años.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            © 2024 BETREF. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}