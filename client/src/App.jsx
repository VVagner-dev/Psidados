import React, { useState, useContext, createContext, useEffect } from 'react';
import { 
  BrowserRouter, Routes, Route, Link, Navigate, 
  Outlet, useLocation, useNavigate, useParams 
} from 'react-router-dom';
import { 
  Users, LogIn, LogOut, FileText, 
  ChevronRight, Brain, User, KeyRound, ArrowLeft, 
  Settings, Trash2, Edit, UserPlus, Save,
  BugPlay, AlertCircle, BarChart3, TrendingUp, AlertTriangle, CheckCircle2,
  MoreVertical, Eye
} from 'lucide-react';
import TestPanel from './components/TestPanel';
import { useTestMode } from './contexts/TestModeContext';
import RelatorioSemanal from './components/RelatorioSemanal';
import { Card, CardHeader, CardBody, Button, Badge, Alert, PageHeader, SectionHeader, LoadingSpinner } from './components/UIComponents';

// --- AUTENTICAÇÃO ---

// 1. Contexto de Autenticação
const AuthContext = createContext(null);

const useAuth = () => {
  return useContext(AuthContext);
};

// Função para logs persistentes (simples wrapper)
const persistentLog = (type, ...args) => {
  // type pode ser 'info'|'warn'|'error' etc.
  if (type === 'error') console.error(...args);
  else if (type === 'warn') console.warn(...args);
  else console.log(...args);
};

// Mapeador de nomes de questionários para exibição
const getQuestionarioNome = (tipoQuestionario) => {
  const mapa = {
    'questionario1': 'GAD-7 (Ansiedade)',
    'questionario2': 'PHQ-9 (Depressão)',
    'questionario3': 'PANAS (Afeto Positivo e Negativo)',
    'questBiomarkers': 'ASSIST (Uso de Substâncias)'
  };
  return mapa[tipoQuestionario] || tipoQuestionario;
};

// Helper: parse fetch Response safely and return { data, status }
const safeParseResponse = async (response) => {
  if (!response) return { data: null, status: 0 };
  const status = response.status;
  const ct = response.headers && response.headers.get ? response.headers.get('content-type') || '' : '';
  if (ct.includes('application/json')) {
    try {
      const data = await response.json();
      return { data, status };
    } catch (err) {
      try {
        const text = await response.text();
        return { data: { message: text }, status };
      } catch (e) {
        return { data: null, status };
      }
    }
  } else {
    try {
      const text = await response.text();
      return { data: { message: text }, status };
    } catch (err) {
      return { data: null, status };
    }
  }
};

// 2. Provedor de Autenticação
const AuthProvider = ({ children }) => {
  // Estado para o psicólogo logado
  const [psicologo, setPsicologo] = useState(() => {
    try {
      const stored = localStorage.getItem('psicologo-token');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Falha ao ler 'psicologo-token' do localStorage", e);
      return null;
    }
  });
  
  // Estado para o paciente logado
  const [paciente, setPaciente] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Efeito para carregar e validar o token do paciente
  useEffect(() => {
    const loadAndValidateToken = async () => {
      try {
        const stored = localStorage.getItem('paciente-token');
        if (!stored) {
          setIsLoadingAuth(false);
          return;
        }

        const parsedData = JSON.parse(stored);
        if (!parsedData || !parsedData.token) {
          console.error("Dados do paciente inválidos no localStorage");
          localStorage.removeItem('paciente-token');
          setIsLoadingAuth(false);
          return;
        }

        // Tentar validar o token com o servidor
        try {
          const response = await fetch('/api/questionario/hoje', {
            headers: {
              'Authorization': `Bearer ${parsedData.token}`
            }
          });

          if (!response.ok) {
            console.error("Token inválido ou expirado");
            localStorage.removeItem('paciente-token');
            setPaciente(null);
          } else {
            setPaciente(parsedData);
          }
        } catch (error) {
          console.error("Erro ao validar token:", error);
          localStorage.removeItem('paciente-token');
          setPaciente(null);
        }
      } catch (e) {
        console.error("Falha ao processar token do paciente:", e);
        localStorage.removeItem('paciente-token');
      } finally {
        setIsLoadingAuth(false);
      }
    };

    loadAndValidateToken();
  }, []);
  
  // Efeitos para salvar no localStorage
  useEffect(() => {
    if (psicologo) {
      localStorage.setItem('psicologo-token', JSON.stringify(psicologo));
      localStorage.removeItem('paciente-token'); // Garante que apenas um esteja logado
      setPaciente(null);
    } else {
      localStorage.removeItem('psicologo-token');
    }
  }, [psicologo]);

  useEffect(() => {
    if (paciente) {
      localStorage.setItem('paciente-token', JSON.stringify(paciente));
      localStorage.removeItem('psicologo-token'); // Garante que apenas um esteja logado
      setPsicologo(null);
    } else {
      localStorage.removeItem('paciente-token');
    }
  }, [paciente]);

  // --- Funções de Login ---
  // --- Funções de Login ---

  const loginPsicologo = async (email, crp, senha) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, crp, senha }),
      });
      const { data } = await safeParseResponse(response);
      if (!response.ok) throw new Error(data.message || 'Credenciais inválidas.');
      setPsicologo({ token: data.token, nome: data.nome || 'Psicólogo(a)' });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const loginPaciente = async (codigoAcesso) => {
    try {
      console.log('Iniciando processo de login do paciente...');
      
      if (!codigoAcesso) {
        throw new Error('Código de acesso é obrigatório');
      }

      // 1. Fazer login
      console.log('Fazendo requisição de login...');
      const response = await fetch('/api/paciente-auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ codigo_acesso: codigoAcesso })
      });
      
      console.log('Resposta recebida, status:', response.status);
      const { data } = await safeParseResponse(response);
      console.log('Dados da resposta:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Código de acesso inválido.');
      }
      
      if (!data.token) {
        throw new Error('Token não recebido do servidor');
      }

      // 2. Primeiro preparar e salvar os dados do paciente
      const userDataForStorage = {
        token: data.token,
        nome: data.paciente?.nome || 'Paciente',
        id: data.paciente?.id,
        email: data.paciente?.email,
        tipo: 'paciente',
        loginTime: new Date().toISOString()
      };
      
      console.log('Salvando dados do paciente...');
      localStorage.setItem('paciente-token', JSON.stringify(userDataForStorage));
      setPaciente(userDataForStorage);

      console.log('Login concluído com sucesso');
      return { success: true };
      
    } catch (error) {
      console.error('Erro durante o processo de login:', error);
      localStorage.removeItem('paciente-token');
      setPaciente(null);
      return { success: false, message: error.message };
    }
  };

  // --- Funções de Logout ---
  const logoutPsicologo = () => setPsicologo(null);
  const logoutPaciente = () => setPaciente(null);

  const value = { 
    psicologo, 
    paciente, 
    loginPsicologo, 
    loginPaciente, 
    logoutPsicologo, 
    logoutPaciente 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. Rota Protegida do Psicólogo
const ProtectedPsicologoRoute = () => {
  const { psicologo } = useAuth();
  const location = useLocation();
  if (!psicologo) {
    return <Navigate to="/login-psicologo" state={{ from: location }} replace />;
  }
  return <PsicologoLayout />;
};

  // 4. Rota Protegida do Paciente
const ProtectedPacienteRoute = () => {
  const { paciente } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!paciente?.token) {
    return <Navigate to="/login-paciente" state={{ from: location }} replace />;
  }

  return <PacienteLayout />;
};
// --- LAYOUTS ---

// 5. Layouts (Wrappers com Navbar/Menu)

// Layout do Psicólogo (Dashboard)
const PsicologoLayout = () => {
  const { psicologo, logoutPsicologo } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutPsicologo();
    navigate('/login-psicologo');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

// Layout do Paciente (Questionário, Resumo)
const PacienteLayout = () => {
  const { paciente, logoutPaciente } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logoutPaciente();
    navigate('/login-paciente');
  };
  
  const isQuestionario = location.pathname.endsWith('questionario');
  const isResumo = location.pathname.endsWith('resumo');
  const [podeVerResumo, setPodeVerResumo] = useState(false);

  useEffect(() => {
    const mostrarResumo = sessionStorage.getItem('mostrarResumo') === 'true';
    setPodeVerResumo(mostrarResumo);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-teal-50 flex flex-col items-center justify-center p-4">
       <div className="absolute top-4 right-4">
         <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-white hover:bg-gray-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </button>
       </div>
      
      <div className="w-full max-w-2xl">
         <div className="flex items-center justify-center mb-4">
            <Brain className="text-teal-700 h-8 w-8" />
            <span className="ml-2 font-bold text-2xl text-gray-800">PsiDados</span>
        </div>
        
        {/* Histórico removido — mostrando apenas o Relatório Semanal quando solicitado */}

        <p className="text-center text-xl text-gray-700 mb-6">
          Olá, {paciente.nome}.
        </p>

        {/* Abas de Navegação */}
        <div className="flex justify-center space-x-4 mb-6">
          <Link 
            to="/paciente/questionario"
            className={`px-5 py-2 rounded-md font-medium ${isQuestionario ? 'bg-teal-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Questionário Diário
          </Link>
          {podeVerResumo && (
            <Link 
              to="/paciente/resumo"
              className={`px-5 py-2 rounded-md font-medium ${isResumo ? 'bg-teal-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Resumo Semanal
            </Link>
          )}
        </div>
        <Outlet />
      </div>
    </div>
  );
};


// --- COMPONENTES DE PÁGINA ---

// ( / )
const Home = () => {
  const { isTestMode, toggleTestMode } = useTestMode();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-xl mb-4">
              <Brain className="h-7 w-7 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mt-4">
              PsiDados
            </h1>
            <p className="text-slate-600 text-sm mt-2">
              A ponte inteligente entre psicólogos e pacientes
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <Link
              to="/login-psicologo"
              className="flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-200 text-sm"
            >
              <Brain className="mr-2 h-4 w-4" />
              Portal do Psicólogo
            </Link>
            <Link
              to="/login-paciente"
              className="flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition duration-200 text-sm"
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Portal do Paciente
            </Link>
          </div>

          <div className="text-center border-t border-slate-200 pt-4">
            <Link
              to="/registrar-psicologo"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition"
            >
              Criar conta de psicólogo
            </Link>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={toggleTestMode}
                className={`w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                  isTestMode
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isTestMode ? (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Modo de Teste Ativo
                  </>
                ) : (
                  <>
                    <BugPlay className="w-4 h-4 mr-2" />
                    Ativar Modo de Teste
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      <TestPanel />
    </div>
  );
};

// ( /login-psicologo )
const LoginPsicologo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginPsicologo } = useAuth();
  
  const [email, setEmail] = useState('');
  const [crp, setCrp] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/psicologo/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const resultado = await loginPsicologo(email, crp, senha);
    setIsLoading(false);
    if (resultado.success) {
      navigate(from, { replace: true });
    } else {
      setError(resultado.message || 'Falha no login. Verifique suas credenciais.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-xl mb-4">
              <Brain className="h-7 w-7 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-4">
              Portal do Psicólogo
            </h2>
            <p className="text-slate-600 text-sm mt-2">Acesse sua conta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition bg-white disabled:bg-slate-50 text-sm"
                placeholder="seu@email.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">CRP</label>
              <input
                type="text"
                required
                value={crp}
                onChange={(e) => setCrp(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition bg-white disabled:bg-slate-50 text-sm"
                placeholder="00/12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition bg-white disabled:bg-slate-50 text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="text-red-600 flex-shrink-0" size={16} />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Entrar
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
            <p className="text-center text-sm text-slate-600">Não tem conta?</p>
            <Link
              to="/registrar-psicologo"
              className="w-full py-2.5 px-4 border border-indigo-600 text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition text-center flex items-center justify-center gap-2 text-sm"
            >
              <UserPlus size={16} />
              Criar Conta
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            <Link to="/" className="text-indigo-600 hover:underline">← Voltar</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// ( /login-paciente )
const LoginPaciente = () => {
  const navigate = useNavigate();
  const { loginPaciente } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState([]);

  // Função para adicionar informações de debug
  const addDebugInfo = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    setDebugInfo(prev => [...prev, { timestamp, message, type }]);
    persistentLog(type, message);
  };

  useEffect(() => {
    // Limpar logs antigos ao montar o componente
    setDebugInfo([]);
    localStorage.removeItem('debug_logs');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    addDebugInfo('=== Início do processo de login do paciente ===');
    addDebugInfo(`Tentando login com código: ${codigo}`);

    try {
      // Tentar fazer login
      const resultado = await loginPaciente(codigo);
      addDebugInfo('Resultado do login: ' + JSON.stringify(resultado));

      if (!resultado.success) {
        addDebugInfo('Falha no login: ' + resultado.message, 'error');
        setError(resultado.message || 'Código de acesso inválido.');
        setIsLoading(false);
        return;
      }

      addDebugInfo('Login bem-sucedido!');
      setSuccessMessage('Login bem-sucedido! Redirecionando...');
      
      // Aguardar 1 segundo antes de redirecionar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addDebugInfo('Redirecionando para /paciente/questionario');
      navigate('/paciente/questionario', { 
        replace: true,
        state: { justLoggedIn: true }
      });
    } catch (err) {
      addDebugInfo('Erro durante o processo de login: ' + err.message, 'error');
      setError('Erro ao fazer login. Por favor, tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-xl mb-4">
              <LogIn className="h-7 w-7 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-4">
              Portal do Paciente
            </h2>
            <p className="text-slate-600 text-sm mt-2">Insira seu código de acesso</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Código de Acesso</label>
              <input
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2.5 text-center text-lg tracking-widest border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition bg-white disabled:bg-slate-50 uppercase text-sm"
                placeholder="XXXXXX"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="text-red-600 flex-shrink-0" size={16} />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={16} />
                <p className="text-sm font-medium text-emerald-700">{successMessage}</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Entrar
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            <Link to="/" className="text-indigo-600 hover:underline">← Voltar</Link>
          </p>

          {/* Seção de Debug */}
          {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200 text-xs bg-slate-50 p-2 rounded">
              <h3 className="text-xs font-semibold text-slate-600 mb-1">Debug:</h3>
              <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
                {debugInfo.map((info, index) => (
                  <div key={index} className={`${
                    info.type === 'error' ? 'text-red-600' : 
                    info.type === 'warn' ? 'text-amber-600' : 
                    'text-slate-600'
                  }`}>
                    {info.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ( /registrar-psicologo )
const RegistroPsicologo = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    crp: '',
    senha: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const { data } = await safeParseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao registrar.');
      }
      
      setSuccess('Conta criada com sucesso! A redirecionar para o login...');
      setTimeout(() => {
        navigate('/login-psicologo');
      }, 2000);

    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-xl shadow-md p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-xl mb-4">
              <UserPlus className="h-7 w-7 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-4">
              Criar Conta
            </h2>
            <p className="text-slate-600 text-sm mt-2">Registre-se como psicólogo</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
              <input
                type="text"
                name="nome_completo"
                required
                value={formData.nome_completo}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition bg-white disabled:bg-slate-50 text-sm"
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition bg-white disabled:bg-slate-50 text-sm"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">CRP</label>
              <input
                type="text"
                name="crp"
                required
                value={formData.crp}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition bg-white disabled:bg-slate-50 text-sm"
                placeholder="00/12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
              <input
                type="password"
                name="senha"
                required
                value={formData.senha}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition bg-white disabled:bg-slate-50 text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="text-red-600 flex-shrink-0" size={16} />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={16} />
                <p className="text-sm font-medium text-emerald-700">{success}</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading || !!success}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Criar Conta
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
            <p className="text-center text-sm text-slate-600">Já tem conta?</p>
            <Link
              to="/login-psicologo"
              className="w-full py-2.5 px-4 border border-indigo-600 text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition text-center flex items-center justify-center gap-2 text-sm"
            >
              <LogIn size={16} />
              Entrar
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            <Link to="/" className="text-indigo-600 hover:underline">← Voltar</Link>
          </p>
        </div>
      </div>
    </div>
  );
};


// --- COMPONENTES DO PSICÓLOGO ---

// ( /psicologo/dashboard )
const DashboardPsicologo = () => {
  const [pacientes, setPacientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const { psicologo } = useAuth();
  const navigate = useNavigate();

  const fetchPacientes = async () => {
    if (!psicologo?.token) {
      setIsLoading(false);
      setError("Token não encontrado.");
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch('/api/pacientes', {
        headers: { 'Authorization': `Bearer ${psicologo.token}` },
      });
  const { data } = await safeParseResponse(response);
  if (!response.ok) throw new Error(data.message || 'Não foi possível carregar os pacientes.');
  setPacientes(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setPacientes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPacientes();
  }, [psicologo.token]);

  const handleDelete = async (pacienteId) => {
    // Simples confirmação do browser
    if (!window.confirm("Tem certeza que deseja eliminar este paciente? Esta ação é irreversível.")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/pacientes/${pacienteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${psicologo.token}` },
      });
      const { data } = await safeParseResponse(response);
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao eliminar paciente.');
      }
      
      // Atualiza a lista removendo o paciente
      setPacientes(prev => prev.filter(p => p.id !== pacienteId));
      
    } catch (err) {
      setError(err.message); // Mostra o erro no dashboard
    }
  };

  // Função para gerar cor do avatar baseada no nome
  const getAvatarColor = (nome) => {
    const colors = ['bg-indigo-100', 'bg-blue-100', 'bg-purple-100', 'bg-pink-100', 'bg-green-100', 'bg-yellow-100', 'bg-orange-100', 'bg-red-100'];
    const index = nome.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getAvatarTextColor = (nome) => {
    const colors = ['text-indigo-700', 'text-blue-700', 'text-purple-700', 'text-pink-700', 'text-green-700', 'text-yellow-700', 'text-orange-700', 'text-red-700'];
    const index = nome.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isLoading) return <div className="text-center p-8"><Spinner /> Carregando pacientes...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Brain className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">PsiDados</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block text-sm">
                <p className="font-medium text-slate-900">Olá, {psicologo?.nome?.split(' ')[0] || "Profissional"}</p>
                <p className="text-xs text-slate-500">{psicologo?.email}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('authPsicologo');
                  window.location.href = '/';
                }}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-indigo-600" size={28} />
              Meus Pacientes
            </h2>
            <p className="text-slate-600 text-sm mt-1">Gerencie seus pacientes</p>
          </div>
          <Link
            to="/psicologo/criar-paciente"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
          >
            <UserPlus size={18} />
            Novo Paciente
          </Link>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium text-red-700 text-sm">Erro ao carregar pacientes</p>
              <p className="text-red-600 text-xs mt-1">{error}</p>
            </div>
          </div>
        )}
        
        {pacientes.length === 0 && !error ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-medium mb-2">Nenhum paciente cadastrado</p>
            <p className="text-slate-500 text-sm mb-4">Comece adicionando seu primeiro paciente</p>
            <Link
              to="/psicologo/criar-paciente"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
            >
              <UserPlus size={16} />
              Criar Paciente
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pacientes.map((p) => (
              <div
                key={p.id}
                className="group bg-white rounded-xl border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer overflow-hidden relative"
                onClick={() => navigate(`/psicologo/paciente/${p.id}/dashboard`)}
              >
                {/* Gradient Background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:bg-indigo-100 transition-colors"></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Avatar + Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex-shrink-0 h-16 w-16 rounded-full ${getAvatarColor(p.nome)} flex items-center justify-center shadow-md`}>
                      <span className={`font-bold text-xl ${getAvatarTextColor(p.nome)}`}>
                        {p.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === p.id ? null : p.id);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </div>

                  {/* Paciente Info */}
                  <div className="mb-4">
                    <h3 className="font-bold text-lg text-slate-900 mb-1">{p.nome}</h3>
                    <p className="text-sm text-slate-500 mb-3">{p.email}</p>
                    
                    {/* Access Code */}
                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Código de Acesso</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono font-bold text-indigo-600">{p.codigo_acesso || "N/A"}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(p.codigo_acesso || "");
                            alert("Código copiado!");
                          }}
                          className="p-1.5 hover:bg-indigo-100 rounded transition text-indigo-600 hover:text-indigo-700"
                          title="Copiar código de acesso"
                        >
                          <span className="text-sm">📋</span>
                        </button>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/psicologo/paciente/${p.id}/dashboard`);
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Eye size={16} />
                      Ver Detalhes
                    </button>
                  </div>

                  {/* Menu Dropdown */}
                  {openMenuId === p.id && (
                    <div className="absolute right-6 top-20 bg-white border border-slate-200 rounded-lg shadow-xl z-20 min-w-48">
                      <Link 
                        to={`/psicologo/paciente/${p.id}/dashboard`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 border-b border-slate-100 first:rounded-t-lg"
                      >
                        <Eye size={16} />
                        Ver Detalhes
                      </Link>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleDelete(p.id);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                      >
                        <Trash2 size={16} />
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

// ( /psicologo/paciente/:id/dashboard )
// Renomeado de PacienteDetalhes para PacienteDashboard
const PacienteDashboard = () => {
  const { id: pacienteId } = useParams();
  const { psicologo } = useAuth();
  const { isTestMode } = useTestMode();
  const navigate = useNavigate();
  
  const [paciente, setPaciente] = useState(null);
  const [respostas, setRespostas] = useState([]);
  const [resumos, setResumos] = useState([]);
  const [mostraRelatorio, setMostraRelatorio] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedResumoId, setExpandedResumoId] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!pacienteId || !psicologo?.token) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [pacienteRes, respostasRes, resumosRes] = await Promise.all([
           fetch(`/api/pacientes/${pacienteId}`, {
             headers: { 'Authorization': `Bearer ${psicologo.token}` }
          }),
          fetch(`/api/pacientes/${pacienteId}/respostas-diarias`, {
             headers: { 'Authorization': `Bearer ${psicologo.token}` }
          }),
          fetch(`/api/pacientes/${pacienteId}/resumos-semanais`, {
             headers: { 'Authorization': `Bearer ${psicologo.token}` }
          }),
        ]);
        
        const pacienteParsed = await safeParseResponse(pacienteRes);
        const respostasParsed = await safeParseResponse(respostasRes);
        const resumosParsed = await safeParseResponse(resumosRes);

        if (!pacienteRes.ok || !respostasRes.ok || !resumosRes.ok) {
          throw new Error(pacienteParsed.data.message || 'Falha ao carregar dados do paciente.');
        }

        const dataPaciente = pacienteParsed.data;
        const dataRespostas = respostasParsed.data;
        const dataResumos = resumosParsed.data;

        setPaciente(dataPaciente);
        setRespostas(dataRespostas);
        setResumos(dataResumos);
        
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [pacienteId, psicologo.token]);

  const handleEditarPaciente = () => {
    navigate(`/psicologo/paciente/${pacienteId}/editar`);
  };

  const handleConfigurarPlano = () => {
    navigate(`/psicologo/paciente/${pacienteId}/configurar`);
  };

  const handleDesvincularPaciente = async () => {
    if (window.confirm('Tem certeza que deseja desvincular este paciente? Esta ação é irreversível.')) {
      try {
        const response = await fetch(`/api/pacientes/${pacienteId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${psicologo.token}` },
        });
        const { data } = await safeParseResponse(response);
        if (!response.ok) {
          throw new Error(data.message || 'Erro ao desvincular paciente.');
        }
        
        setSuccess('Paciente desvinculado com sucesso.');
        setTimeout(() => {
          navigate('/psicologo/dashboard');
        }, 1500);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // Se está mostrando relatório, exibir o componente
  if (mostraRelatorio) {
    return (
      <RelatorioSemanal 
        pacienteId={pacienteId}
        token={psicologo?.token}
        onVoltar={() => setMostraRelatorio(false)}
      />
    );
  }

  if (isLoading) {
    return <div className="text-center p-8"><Spinner /> Carregando dados do paciente...</div>;
  }
  
  if (error) {
    return <div className="text-center p-8 text-red-600">Erro: {error}</div>;
  }

  // Formatação de data para "X de Mes, YYYY"
  function formatarDataMesPorExtenso(dataString) {
    const data = new Date(dataString);
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return formatter.format(data).replace(',', ' de').replace(' de ', ' de ');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-100 text-green-800 border border-green-200">
            {success}
          </div>
        )}

        {/* Título e Informações Básicas */}
        <div className="mb-8">
          <Link to="/psicologo/dashboard" className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center mb-4">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Voltar
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">Detalhes do Paciente</h1>
          <p className="mt-2 text-lg text-gray-600">{paciente?.nome || "Carregando..."}</p>
        </div>

        {/* Grid: Informações + Ações */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Card de Informações - Ocupa 2 colunas */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Informações</h2>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">E-mail</p>
                <p className="text-lg text-gray-800 mt-1">{paciente?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Membro Desde</p>
                <p className="text-lg text-gray-800 mt-1">{formatarDataMesPorExtenso(paciente?.data_criacao || new Date())}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Código de Acesso</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg text-gray-800 font-mono bg-slate-100 px-3 py-2 rounded-md font-bold">{paciente?.codigo_acesso || "N/A"}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(paciente?.codigo_acesso || "");
                      alert("Código de acesso copiado!");
                    }}
                    className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-md transition text-sm font-medium flex items-center gap-1"
                    title="Copiar código de acesso"
                  >
                    <span>📋</span> Copiar
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Plano Atual</p>
                <p className="text-lg text-gray-800 mt-1">
              {paciente?.questionario_nome ? getQuestionarioNome(paciente.questionario_nome) : "Nenhum"} <span className="text-sm text-gray-500">({paciente?.frequencia || "N/A"})</span>
                </p>
              </div>
            </div>
          </div>

          {/* Card de Ações */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ações</h2>
            <div className="space-y-3">
              <button 
                onClick={() => setMostraRelatorio(true)}
                className="w-full text-left py-3 px-4 font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center"
              >
                <FileText className="mr-2 h-4 w-4" />
                Ver Relatório Semanal
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="w-full text-left py-3 px-4 font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-100 transition-colors flex items-center border"
              >
                <FileText className="mr-2 h-4 w-4 text-slate-600" />
                Histórico de Relatórios Semanais
              </button>
              <button 
                onClick={handleEditarPaciente}
                className="w-full text-left py-3 px-4 font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar Informações
              </button>
              <button 
                onClick={handleConfigurarPlano}
                className="w-full text-left py-3 px-4 font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center"
              >
                <Settings className="mr-2 h-4 w-4" />
                Configurar Plano
              </button>
              <button 
                onClick={handleDesvincularPaciente}
                className="w-full text-left py-3 px-4 font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-colors flex items-center mt-4"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Desvincular Paciente
              </button>
            </div>
          </div>
        </div>

        {/* Resumos Semanais e Respostas Diárias */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Modal / Painel de Histórico de Resumos Semanais */}
          {showHistory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowHistory(false)}></div>
              <div className="relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-6 overflow-y-auto max-h-[80vh]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Histórico de Relatórios Semanais</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowHistory(false)} className="px-3 py-2 bg-slate-100 rounded hover:bg-slate-200">Fechar</button>
                  </div>
                </div>

                <div className="space-y-4">
                  {resumos && resumos.length > 0 ? (
                    resumos
                      .slice()
                      .sort((a,b) => new Date(b.data_fim_semana || b.data_envio) - new Date(a.data_fim_semana || a.data_envio))
                      .map(r => {
                        let analisesQ = r.analises_questionarios;
                        try { if (typeof analisesQ === 'string' && analisesQ.trim()) analisesQ = JSON.parse(analisesQ); } catch(e) {}
                        const resumoDate = r.data_fim_semana || r.data_envio || r.data_envio;
                        return (
                          <div key={r.id} className="border border-slate-100 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm text-slate-500">Semana encerrada em</div>
                                <div className="font-semibold text-gray-800">{formatarDataMesPorExtenso(resumoDate)}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setExpandedResumoId(expandedResumoId === r.id ? null : r.id)}
                                  className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                                >
                                  {expandedResumoId === r.id ? 'Ocultar' : 'Ver Detalhes'}
                                </button>
                              </div>
                            </div>

                            {expandedResumoId === r.id && (
                              <div className="mt-3 text-sm text-slate-700 space-y-3">
                                { (r.texto_resumo || r.resumo_semanal?.texto_resumo) && (
                                  <div>
                                    <p className="font-medium text-slate-600 mb-1">Resumo da Semana</p>
                                    <p className="whitespace-pre-line">{r.texto_resumo || r.resumo_semanal?.texto_resumo}</p>
                                  </div>
                                )}

                                { (r.texto_expectativa || r.resumo_semanal?.texto_expectativa) && (
                                  <div>
                                    <p className="font-medium text-slate-600 mb-1">Expectativa</p>
                                    <p className="whitespace-pre-line">{r.texto_expectativa || r.resumo_semanal?.texto_expectativa}</p>
                                  </div>
                                )}

                                { r.resumo_geral && (
                                  <div>
                                    <p className="font-medium text-slate-600 mb-1">Resumo Geral (IA)</p>
                                    <p className="whitespace-pre-line">{r.resumo_geral}</p>
                                  </div>
                                ) }

                                { r.analise_pontos && (
                                  <div>
                                    <p className="font-medium text-slate-600 mb-1">Análise e Pontos de Atenção (IA)</p>
                                    <p className="whitespace-pre-line">{r.analise_pontos}</p>
                                  </div>
                                ) }

                                { analisesQ && typeof analisesQ === 'object' && (
                                  <div>
                                    <p className="font-medium text-slate-600 mb-2">Análises por Questionário</p>
                                    <div className="space-y-2">
                                      {Object.keys(analisesQ).map(k => (
                                        <div key={k} className="bg-slate-50 p-2 rounded">
                                          <div className="text-xs text-slate-500">{getQuestionarioNome(k)}</div>
                                          <div className="text-sm text-slate-800 whitespace-pre-line">{analisesQ[k]}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-sm text-slate-500">Ainda não há resumos semanais para este paciente.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Resumos Semanais */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Resumos Semanais (IA)</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {resumos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum resumo semanal enviado.</p>
              ) : (
                resumos.map(r => (
                  <div key={r.id} className="p-4 border-l-4 border-indigo-500 rounded-lg bg-indigo-50">
                    <p className="text-sm text-gray-500 font-semibold">{new Date(r.data_envio).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Resumo da Semana</p>
                        <p className="text-sm text-gray-800 mt-1 italic">{r.resumo_semanal}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Expectativa</p>
                        <p className="text-sm text-gray-800 mt-1 italic">{r.expectativa_semana}</p>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-white border border-indigo-200 rounded-lg">
                      <p className="font-bold text-indigo-800 text-sm mb-2">💡 Análise (IA):</p>
                      <p className="text-sm text-indigo-700 leading-relaxed">{r.analise_ia || "Aguardando análise..."}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Respostas Diárias */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Respostas Diárias</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {respostas.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma resposta diária enviada.</p>
              ) : (
                respostas.map(r => (
                  <div key={r.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{r.questionario_nome || "Questionário"}</p>
                        <p className="text-sm text-gray-500 mt-1">{new Date(r.data_resposta).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-600">{r.percentual || 0}%</p>
                        <p className="text-xs text-gray-500">conclusão</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// ( /psicologo/criar-paciente )
const CriarPacienteForm = () => {
  const { psicologo } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ nome: '', email: '' });
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pacienteIdCriado, setPacienteIdCriado] = useState(null);
  const [etapa, setEtapa] = useState(1); // 1 = dados, 2 = dias

  const diasSemana = [
    { id: 1, nome: 'Segunda-feira' },
    { id: 2, nome: 'Terça-feira' },
    { id: 3, nome: 'Quarta-feira' },
    { id: 4, nome: 'Quinta-feira' },
    { id: 5, nome: 'Sexta-feira' },
    { id: 6, nome: 'Sábado' },
    { id: 7, nome: 'Domingo' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleDia = (diaId) => {
    setDiasSelecionados(prev => {
      if (prev.includes(diaId)) {
        return prev.filter(id => id !== diaId);
      } else if (prev.length < 3) {
        return [...prev, diaId].sort((a, b) => a - b);
      }
      return prev;
    });
  };

  const handleSubmitDados = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/pacientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${psicologo.token}`,
        },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email
        }),
      });
      
      const { data, status } = await safeParseResponse(response);
      console.log('Response status:', status);
      console.log('Response data:', data);
      if (!response.ok) throw new Error(data.message || 'Erro ao criar paciente.');

      console.log('Setting pacienteIdCriado to:', data.id);
      setPacienteIdCriado(data.id);
      setSuccess(`Paciente ${data.nome} criado (Código: ${data.codigo_acesso})! Agora selecione os dias dos questionários.`);
      setEtapa(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDias = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (diasSelecionados.length !== 3) {
      setError('Selecione exatamente 3 dias da semana.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Questionários em ordem: questionario1, questionario2, questionario3
      const configuracaoDias = diasSelecionados.map((diaId, index) => ({
        diaId,
        questionarioId: index + 1 // 1, 2, 3
      }));

      const response = await fetch(`/api/pacientes/${pacienteIdCriado}/questionario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${psicologo.token}`,
        },
        body: JSON.stringify({
          configuracao_questionarios: configuracaoDias,
          resumo_semanal_apos_terceiro: true
        }),
      });

      const { data } = await safeParseResponse(response);
      if (!response.ok) throw new Error(data.message || 'Erro ao configurar dias.');

      setSuccess('Paciente criado e configurado com sucesso!');
      setTimeout(() => navigate('/psicologo/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormWrapper titulo={etapa === 1 ? "Novo Paciente" : "Selecionar Dias"} linkVoltar="/psicologo/dashboard">
      {etapa === 1 ? (
        <form onSubmit={handleSubmitDados} className="space-y-6">
          <InputForm label="Nome Completo" name="nome" type="text" value={formData.nome} onChange={handleChange} disabled={isSubmitting || !!success} required />
          <InputForm label="Email (opcional)" name="email" type="email" value={formData.email} onChange={handleChange} disabled={isSubmitting || !!success} />
          
          <FormStatus success={success} error={error} />
          
          {!success && (
            <BotaoSubmit label="Próximo" labelLoading="Salvando..." isLoading={isSubmitting} icon={<UserPlus />} />
          )}
        </form>
      ) : (
        <form onSubmit={handleSubmitDias} className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Selecione 3 Dias da Semana</h2>
            <p className="text-gray-600 mb-4">
              Os questionários serão atribuídos automaticamente em ordem (PHQ-9 → GAD-7 → Diário de Humor).
            </p>
            
            <div className="space-y-3">
              {diasSemana.map(dia => (
                <label key={dia.id} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={diasSelecionados.includes(dia.id)}
                    onChange={() => toggleDia(dia.id)}
                    disabled={isSubmitting || (!diasSelecionados.includes(dia.id) && diasSelecionados.length >= 3)}
                    className="h-5 w-5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 font-medium text-gray-700">{dia.nome}</span>
                  {diasSelecionados.includes(dia.id) && (
                    <span className="ml-auto text-sm text-teal-600 font-semibold">
                      #{diasSelecionados.indexOf(dia.id) + 1}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <FormStatus success={success} error={error} />
          
          <BotaoSubmit 
            label={`Finalizar (${diasSelecionados.length}/3 dias)`} 
            labelLoading="Salvando..." 
            isLoading={isSubmitting} 
            icon={<Save />}
            disabled={diasSelecionados.length !== 3}
          />
        </form>
      )}
    </FormWrapper>
  );
};

// ( /psicologo/paciente/:id/editar )
const EditarPacienteForm = () => {
  const { id: pacienteId } = useParams();
  const { psicologo } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ nome: '', email: '' });
  const [isLoading, setIsLoading] = useState(true); // Loading para buscar
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading para enviar
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Buscar dados atuais do paciente
  useEffect(() => {
    if (!pacienteId || !psicologo?.token) return;
    
    const fetchPaciente = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/pacientes/${pacienteId}`, {
           headers: { 'Authorization': `Bearer ${psicologo.token}` }
        });
  const { data } = await safeParseResponse(response);
  if (!response.ok) throw new Error(data.message || 'Falha ao buscar dados do paciente.');
  setFormData({ nome: data.nome, email: data.email });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPaciente();
  }, [pacienteId, psicologo.token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Enviar atualização
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/pacientes/${pacienteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${psicologo.token}`,
        },
        body: JSON.stringify(formData),
      });
      
  const { data } = await safeParseResponse(response);
  if (!response.ok) throw new Error(data.message || 'Erro ao atualizar paciente.');

  setSuccess('Paciente atualizado com sucesso!');
      setTimeout(() => navigate('/psicologo/dashboard'), 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="text-center p-8"><Spinner /> Carregando...</div>;

  return (
    <FormWrapper titulo="Editar Paciente" linkVoltar="/psicologo/dashboard">
      <form onSubmit={handleSubmit} className="space-y-6">
        <InputForm label="Nome Completo" name="nome" type="text" value={formData.nome} onChange={handleChange} disabled={isSubmitting} />
        <InputForm label="Email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={isSubmitting} />
        
        <FormStatus success={success} error={error} />
        
        <BotaoSubmit label="Salvar Alterações" labelLoading="Salvando..." isLoading={isSubmitting} icon={<Save />} />
      </form>
    </FormWrapper>
  );
};

// ( /psicologo/paciente/:id/configurar )
const ConfigurarPlanoPaciente = () => {
  const { id: pacienteId } = useParams();
  const { psicologo } = useAuth();
  const navigate = useNavigate();

  // Lista de questionários disponíveis
  const questionariosLista = [
    { id: 1, nome: "GAD-7 (Ansiedade)" },
    { id: 2, nome: "PHQ-9 (Depressão)" },
    { id: 3, nome: "ASSIST (Uso de Substâncias)" }
  ];

  // Estado para os dias selecionados e seus questionários
  const [configuracaoDias, setConfiguracaoDias] = useState([]);
  const [paciente, setPaciente] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const diasSemana = [
    { id: 1, nome: 'Segunda-feira' },
    { id: 2, nome: 'Terça-feira' },
    { id: 3, nome: 'Quarta-feira' },
    { id: 4, nome: 'Quinta-feira' },
    { id: 5, nome: 'Sexta-feira' },
    { id: 6, nome: 'Sábado' },
    { id: 7, nome: 'Domingo' }
  ];

  // Função para manipular a seleção de dias
  const handleDiaChange = (diaId, questionarioId) => {
    setConfiguracaoDias(prev => {
      // Se já existe uma configuração para este dia, remova
      const semDiaAtual = prev.filter(config => config.diaId !== diaId);
      
      // Se um questionário foi selecionado e ainda não temos 3 dias (ou estamos editando um existente)
      if (questionarioId && (semDiaAtual.length < 3 || prev.some(config => config.diaId === diaId))) {
        return [...semDiaAtual, { diaId, questionarioId }];
      }
      
      return semDiaAtual;
    });
  };

  // Função para verificar se um dia está selecionado
  const isDiaSelecionado = (diaId) => {
    return configuracaoDias.some(config => config.diaId === diaId);
  };

  // Função para obter o questionário associado a um dia
  const getQuestionarioDoDia = (diaId) => {
    const config = configuracaoDias.find(config => config.diaId === diaId);
    return config ? config.questionarioId : '';
  };

  // Buscar dados atuais do paciente
  useEffect(() => {
    if (!pacienteId || !psicologo?.token) return;
    
    const fetchPaciente = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/pacientes/${pacienteId}`, {
           headers: { 'Authorization': `Bearer ${psicologo.token}` }
        });
        const { data } = await safeParseResponse(response);
        if (!response.ok) throw new Error(data.message || 'Falha ao buscar dados do paciente.');
        setPaciente(data);
        // Configurar dias e questionários salvos, se existirem
        if (data.configuracao_questionarios) {
          setConfiguracaoDias(data.configuracao_questionarios);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPaciente();
  }, [pacienteId, psicologo.token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    // Validar se exatamente 3 dias foram selecionados
    if (configuracaoDias.length !== 3) {
      setError('Por favor, selecione exatamente 3 dias da semana.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/pacientes/${pacienteId}/questionario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${psicologo.token}`,
        },
        body: JSON.stringify({
          configuracao_questionarios: configuracaoDias,
          resumo_semanal_apos_terceiro: true // Indica que o resumo deve ser solicitado após o terceiro questionário
        }),
      });
      
      const { data } = await safeParseResponse(response);
      if (!response.ok) throw new Error(data.message || 'Erro ao definir plano.');

      setSuccess('Plano do paciente atualizado com sucesso!');
      setTimeout(() => navigate(`/psicologo/paciente/${pacienteId}/dashboard`), 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="text-center p-8"><Spinner /> Carregando...</div>;

  return (
    <FormWrapper titulo={`Configurar Plano: ${paciente?.nome || ''}`} linkVoltar={`/psicologo/paciente/${pacienteId}/dashboard`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Configuração dos Questionários</h2>
          <p className="text-gray-600 mb-4">
            Selecione 3 dias da semana e atribua um questionário para cada dia.
            O paciente preencherá o resumo semanal após completar o terceiro questionário.
          </p>
          
          <div className="space-y-4">
            {diasSemana.map(dia => (
              <div key={dia.id} className="border p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`dia-${dia.id}`}
                      checked={isDiaSelecionado(dia.id)}
                      onChange={() => {
                        if (isDiaSelecionado(dia.id)) {
                          handleDiaChange(dia.id, null);
                        } else if (configuracaoDias.length < 3) {
                          handleDiaChange(dia.id, questionariosLista[0].id);
                        }
                      }}
                      className="h-5 w-5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      disabled={isSubmitting || (!isDiaSelecionado(dia.id) && configuracaoDias.length >= 3)}
                    />
                    <label htmlFor={`dia-${dia.id}`} className="ml-3 font-medium text-gray-700">
                      {dia.nome}
                    </label>
                  </div>
                  
                  {isDiaSelecionado(dia.id) && (
                    <select
                      value={getQuestionarioDoDia(dia.id)}
                      onChange={(e) => handleDiaChange(dia.id, Number(e.target.value))}
                      className="ml-4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                      disabled={isSubmitting}
                    >
                      {questionariosLista.map(q => (
                        <option key={q.id} value={q.id}>{q.nome}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <FormStatus success={success} error={error} />
        
        <BotaoSubmit 
          label="Salvar Configuração" 
          labelLoading="Salvando..." 
          isLoading={isSubmitting} 
          icon={<Save />} 
        />
      </form>
    </FormWrapper>
  );
};


// --- COMPONENTES DO PACIENTE ---

// ( /paciente/questionario )
const QuestionarioPaciente = () => {
  const { paciente } = useAuth();
  const navigate = useNavigate();
  // If user clicked 'Refazer' from ResumoPaciente, an override object will be in sessionStorage
  const overrideRaw = typeof window !== 'undefined' ? sessionStorage.getItem('override_questionario') : null;
  const overrideObj = overrideRaw ? JSON.parse(overrideRaw) : null;
  const [questionario, setQuestionario] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isTestMode, testDate, setTestDate } = useTestMode();
  const [diaAtual, setDiaAtual] = useState(0); // 0 = domingo, 1 = segunda, etc

  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // Função para obter o dia da semana considerando timezone Brasil (mesmo que backend)
  const getDayOfWeekBR = (date) => {
    const dateStr = date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const dateObj = new Date(dateStr);
    return dateObj.getDay();
  };

  const mudarDia = (offset) => {
    const novaData = new Date(testDate);
    novaData.setDate(novaData.getDate() + offset);
    setTestDate(novaData);
    setDiaAtual(getDayOfWeekBR(novaData));
  };

  // Sincronizar diaAtual quando testDate muda
  useEffect(() => {
    if (testDate) {
      setDiaAtual(getDayOfWeekBR(testDate));
    }
  }, [testDate]);

  const reiniciarQuestionarios = async () => {
    if (!window.confirm('Tem certeza que deseja reiniciar os questionários? Esta ação é irreversível.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/questionario/reiniciar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paciente.token}`,
          'Content-Type': 'application/json',
          ...(isTestMode && { 'x-test-mode': 'true' }),
        }
      });
      
      if (response.ok) {
        setSuccess('Questionários reiniciados com sucesso!');
        setError('');
        // Limpar flags do sessionStorage relacionadas ao resumo
        sessionStorage.removeItem('mostrarResumo');
        // Recarregar o questionário
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao reiniciar questionários');
      }
    } catch (err) {
      setError('Erro ao reiniciar questionários: ' + err.message);
    }
  };

  // Função auxiliar para fazer requisições autenticadas
  const fetchAutenticado = async (url, options = {}) => {
    if (!paciente?.token) {
      console.error('Token não encontrado no estado do paciente');
      localStorage.removeItem('paciente-token');
      window.location.href = '/login-paciente';
      return;
    }

    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${paciente.token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include' // Alterado para 'include' para permitir cookies em requisições cross-origin
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    console.log('Fazendo requisição autenticada:', {
      url,
      method: options.method || 'GET',
      credentials: finalOptions.credentials
    });

    try {
      const response = await fetch(url, finalOptions);
      
      if (response.status === 401) {
        console.error('Token expirado ou inválido');
        localStorage.removeItem('paciente-token');
        // Usar navigate ao invés de window.location para manter o estado do React Router
        window.location.replace('/login-paciente');
        return;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response;
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      if (error.name === 'TypeError') {
        // Erro de rede ou CORS
        console.error('Erro de rede ou CORS');
      }
      throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (!paciente?.token) {
      console.log('Token não disponível, ignorando fetch');
      return;
    }

    // Garantir que testDate está inicializado
    const currentDate = testDate || new Date();

    const fetchQuestionario = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      try {
        console.log('Iniciando busca do questionário...');
        // Se houver override (refazer), usar o objeto salvo no sessionStorage
        if (overrideObj) {
          console.log('🟡 Usando override_questionario:', overrideObj);
          setQuestionario(overrideObj.questionario);
          // inicializar respostas vazias
          const respostasIniciais = {};
          if (overrideObj.questionario.perguntas && Array.isArray(overrideObj.questionario.perguntas)) {
            overrideObj.questionario.perguntas.forEach((p, index) => {
              const perguntaId = typeof p === 'string' ? `q${index}` : (p.id || `q${index}`);
              respostasIniciais[perguntaId] = null;
            });
          }
          setRespostas(respostasIniciais);
          setIsLoading(false);
          return;
        }
        console.log('testDate:', currentDate);
        
        // Adiciona a data de teste como parâmetro de consulta se estiver no modo teste
        // IMPORTANTE: Converter para Brasil timezone ANTES de enviar
        let endpoint = '/api/questionario/hoje';
        if (isTestMode) {
          // Obter a data em São Paulo timezone
          const dateStrBR = currentDate.toLocaleString("en-US", {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: "America/Sao_Paulo"
          });
          const [mes, dia, ano] = dateStrBR.split('/');
          const dateBRFormatted = `${ano}-${mes}-${dia}`; // YYYY-MM-DD em Brasil
          endpoint = `/api/questionario/hoje?test_date=${dateBRFormatted}`;
          console.log(`🕐 Frontend: testDate=${currentDate.toISOString()} -> Brazil date=${dateBRFormatted}`);
        }

        console.log('Endpoint:', endpoint);
        console.log('Estado do paciente:', {
          temToken: !!paciente?.token,
          tipo: paciente?.tipo,
          isTestMode
        });

        const response = await fetchAutenticado(endpoint, {
          headers: isTestMode ? { 'X-Test-Mode': 'true' } : undefined
        });

        if (!isMounted) return;

        if (!response) {
          console.log('Nenhuma resposta recebida do fetchAutenticado');
          return;
        }

        const { data } = await safeParseResponse(response);
        console.log('Resposta do servidor:', { status: response.status, data });

        if (response.ok) {
          // Status 200 - pode ser sucesso ou "sem questionário"
          if (data.temQuestionarioHoje === true) {
            // Tem questionário para hoje
            setQuestionario(data);
            setError('');
            setSuccess('');
            const respostasIniciais = {};
            if (data.perguntas && Array.isArray(data.perguntas)) {
               data.perguntas.forEach((p, index) => {
                 const perguntaId = typeof p === 'string' ? `q${index}` : (p.id || `q${index}`);
                 respostasIniciais[perguntaId] = null;
               });
            }
            setRespostas(respostasIniciais);
          } else {
            // Sem questionário para hoje (temQuestionarioHoje === false ou undefined)
            setQuestionario(null);
            setRespostas({});
            if (data.message === 'Você já enviou a sua resposta de hoje.') {
              setSuccess('Você já respondeu o questionário de hoje. Volte amanhã!');
              setError('');
            } else {
              setError(data.message || 'Nenhum questionário para hoje.');
              setSuccess('');
            }
          }
        } else {
          console.error('Erro na resposta:', response.status, data);
          throw new Error(data.message || 'Falha ao buscar questionário.');
        }
      } catch (err) {
        console.error('Erro ao buscar questionário:', err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchQuestionario();

    return () => {
      isMounted = false;
    };
  }, [paciente?.token, isTestMode, testDate]);

  const handleRespostaChange = (perguntaId, valor) => {
    setRespostas(prev => ({ ...prev, [perguntaId]: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const todasRespondidas = Object.values(respostas).every(v => v !== null && v !== undefined);
    if (!todasRespondidas) {
      setError('Por favor, responda todas as perguntas.');
      setIsSubmitting(false);
      return;
    }

    try {
      const body = {
        questionarioId: questionario.id,
        respostas: respostas,
      };

      // Se estiver em modo de teste, adicionar a data de teste em Brasil timezone
      if (isTestMode && testDate) {
        // Converter para Brasil timezone ANTES de enviar
        const dateStrBR = testDate.toLocaleString("en-US", {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: "America/Sao_Paulo"
        });
        const [mes, dia, ano] = dateStrBR.split('/');
        body.dataResposta = `${ano}-${mes}-${dia}`; // YYYY-MM-DD em Brasil
        console.log(`🕐 Frontend (submit): testDate=${testDate.toISOString()} -> dataResposta=${body.dataResposta}`);
      }

      // Se veio de um override (refazer), enviar a data do questionário que foi perdido
      const overrideRawNow = typeof window !== 'undefined' ? sessionStorage.getItem('override_questionario') : null;
      if (overrideRawNow) {
        try {
          const ov = JSON.parse(overrideRawNow);
          if (ov && ov.date) {
            body.dataResposta = ov.date; // YYYY-MM-DD
            console.log('🚨 Enviando resposta com dataResposta (refazer):', body.dataResposta);
          }
        } catch (err) {
          console.error('Erro ao parsear override_questionario', err);
        }
      }

      const response = await fetch('/api/questionario/responder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${paciente.token}`,
          ...(isTestMode && { 'x-test-mode': 'true' }),
        },
        body: JSON.stringify(body),
      });
  const { data } = await safeParseResponse(response);
  if (!response.ok) throw new Error(data.message || 'Erro ao enviar respostas.');
      setSuccess('Obrigado! Suas respostas foram enviadas com sucesso.');
      
      console.log('🎯 Resposta do servidor:', data);
      console.log('📊 resumoNecessario:', data.resumoNecessario);
      
      if (data.resumoNecessario) {
        console.log('✅ Navegando para resumo...');
        sessionStorage.setItem('mostrarResumo', 'true');
        setTimeout(() => {
          navigate('/paciente/resumo');
        }, 1500);
      }
      
      // Se veio de override, remover o override e a entrada de missedQuestionarios correspondente
      try {
        const overrideRawNow = typeof window !== 'undefined' ? sessionStorage.getItem('override_questionario') : null;
        if (overrideRawNow) {
          const ov = JSON.parse(overrideRawNow);
          // limpar override
          sessionStorage.removeItem('override_questionario');
          // remover do missedQuestionarios
          const missKey = 'missedQuestionarios';
          const current = JSON.parse(sessionStorage.getItem(missKey) || '[]');
          const filtered = current.filter(item => !(item.date === ov.date && item.questionario && ov.questionario && item.questionario.titulo === ov.questionario.titulo));
          sessionStorage.setItem(missKey, JSON.stringify(filtered));
        }
      } catch (err) {
        console.error('Erro ao limpar override/missedQuestionarios', err);
      }

      setQuestionario(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLoading = () => (
    <div className="flex justify-center items-center p-8">
      <Spinner /> <span className="ml-3 text-gray-700">Buscando seu questionário...</span>
    </div>
  );

  const renderMensagem = (msg, tipo = 'success') => (
     <div className={`p-4 rounded-md ${tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
      <p className="font-medium text-center">{msg}</p>
    </div>
  );

  const renderPergunta = (pergunta, index) => {
    const perguntaId = pergunta.id || `q${index}`;
    
    // Suportar tanto strings quanto objetos
    const textopergunta = typeof pergunta === 'string' ? pergunta : (pergunta.texto || 'Pergunta sem texto');
    
    // Se questionario recebe opcoes do backend, usar; senão usar padrão
    let opcoes = [];
    if (questionario.opcoes && typeof questionario.opcoes[0] === 'string') {
      // opcoes vem como array de strings do backend
      opcoes = questionario.opcoes.map((opt, idx) => ({
        texto: opt,
        valor: idx
      }));
    } else if (pergunta.opcoes) {
      opcoes = pergunta.opcoes;
    } else {
      // Padrão PHQ-9/GAD-7
      opcoes = [
        { texto: "Nenhuma vez", valor: 0 },
        { texto: "Vários dias", valor: 1 },
        { texto: "Mais da metade dos dias", valor: 2 },
        { texto: "Quase todos os dias", valor: 3 },
      ];
    }

    return (
      <fieldset key={perguntaId} className="border-t pt-4">
        <legend className="block text-lg font-medium text-gray-800">
          {textopergunta}
        </legend>
        <div className="mt-4 space-y-3">
          {opcoes.map((opt) => (
            <label key={opt.valor} className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
              <input 
                type="radio"
                name={perguntaId}
                value={opt.valor}
                checked={respostas[perguntaId] === opt.valor}
                onChange={() => handleRespostaChange(perguntaId, opt.valor)}
                className="h-5 w-5 text-teal-600 focus:ring-teal-500"
              />
              <span className="ml-3 text-gray-700">{opt.texto}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Questionário do Dia</h1>
      
      {!isTestMode && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-300 rounded-lg">
          <p className="text-sm text-blue-800">💡 <strong>Dica:</strong> Clique em "Ativar Modo de Teste" no topo para simular diferentes dias da semana</p>
        </div>
      )}
      
      {isTestMode && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-semibold text-yellow-800 mb-3">📅 Modo de Teste - Controles de Simulação:</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => mudarDia(-1)}
              className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-sm font-medium hover:bg-yellow-300"
            >
              ← Dia Anterior
            </button>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
              {dias[diaAtual]} ({testDate.toLocaleDateString()})
            </span>
            <button
              onClick={() => mudarDia(1)}
              className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-sm font-medium hover:bg-yellow-300"
            >
              Próximo Dia →
            </button>
            <button
              onClick={reiniciarQuestionarios}
              className="px-3 py-1 bg-red-200 text-red-800 rounded text-sm font-medium hover:bg-red-300"
            >
              🔄 Reiniciar Questionários
            </button>
          </div>
        </div>
      )}
      
      {isLoading && renderLoading()}
      {error && !success && !questionario && renderMensagem(error, 'error')}
      {success && renderMensagem(success, 'success')}
      {questionario && !isLoading && !success && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">Se você não puder responder agora, pode pular e voltar depois.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  try {
                    // salvar na lista de questionários perdidos para permitir refazer depois
                    const hoje = questionario?.dataConsulta || (new Date()).toISOString().split('T')[0];
                    const missKey = 'missedQuestionarios';
                    const current = JSON.parse(sessionStorage.getItem(missKey) || '[]');
                    // salvar o objeto inteiro do questionário (perguntas/opcoes/titulo) e a data
                    current.push({ date: hoje, questionario });
                    sessionStorage.setItem(missKey, JSON.stringify(current));
                  } catch (err) {
                    console.error('Erro ao salvar missedQuestionarios', err);
                  }
                  navigate('/');
                }}
                className="px-3 py-1 text-sm bg-slate-100 rounded hover:bg-slate-200"
              >
                Pular por agora
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); localStorage.removeItem('paciente-token'); window.location.href = '/login-paciente'; }}
                className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
              >
                Sair
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <p className="text-sm font-medium text-teal-700 mb-2">📋 Questionário de Hoje:</p>
              <h2 className="text-xl font-bold text-teal-900">{questionario.titulo || questionario.nome}</h2>
              {questionario.descricao && <p className="text-gray-600 mt-2">{questionario.descricao}</p>}
            </div>
            {questionario.perguntas && questionario.perguntas.map((p, i) => renderPergunta(p, i))}
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <BotaoSubmit label="Enviar Respostas" labelLoading="Enviando..." isLoading={isSubmitting} icon={<FileText />} />
          </form>
        </div>
      )}
      {!isLoading && !questionario && !success && error && (
        <div className="p-6 text-center bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-800 mb-2">📭 Hoje não tem questionário para responder</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Volte nos dias configurados pelo seu psicólogo!</p>
        </div>
      )}
    </div>
  );
};

// ( /paciente/resumo )
const ResumoPaciente = () => {
  const { paciente } = useAuth();
  const [resumoSemanal, setResumoSemanal] = useState('');
  const [expectativaSemana, setExpectativaSemana] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDisabled, setIsDisabled] = useState(true);
  const navigate = useNavigate();
  const [missed, setMissed] = useState([]);

  useEffect(() => {
    const mostrarResumo = sessionStorage.getItem('mostrarResumo');
    if (mostrarResumo === 'true') {
      setIsDisabled(false);
      setError('');
    } else {
      setIsDisabled(true);
      setError('O resumo semanal só pode ser preenchido após completar os 3 questionários da semana.');
    }
    try {
      const m = JSON.parse(sessionStorage.getItem('missedQuestionarios') || '[]');
      setMissed(m);
    } catch (err) {
      setMissed([]);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    if (!resumoSemanal || !expectativaSemana) {
      setError('Por favor, preencha ambos os campos.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/resumo/semanal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${paciente.token}`,
        },
        body: JSON.stringify({
          texto_resumo: resumoSemanal,
          texto_expectativa: expectativaSemana,
        }),
      });
      const { data } = await safeParseResponse(response);
      if (!response.ok) {
        if (response.status === 409) setError(data.message || 'Você já enviou o resumo desta semana.');
        else throw new Error(data.message || 'Erro ao enviar resumo.');
      } else {
        setSuccess('Resumo enviado com sucesso! O psicólogo será notificado.');
        setResumoSemanal('');
        setExpectativaSemana('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Resumo Semanal</h1>
      <FormStatus success={success} error={error} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="resumo" className="block text-lg font-medium text-gray-800">Como foi sua semana?</label>
          <p className="text-sm text-gray-500 mb-2">Escreva um breve resumo sobre seus sentimentos, desafios e conquistas.</p>
          <textarea
            id="resumo"
            rows="6"
            value={resumoSemanal}
            onChange={(e) => setResumoSemanal(e.target.value)}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
            placeholder="Esta semana eu me senti..."
            disabled={isSubmitting || !!success || isDisabled}
          ></textarea>
          {isDisabled && missed.length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="font-semibold text-yellow-800 mb-2">Você tem questionários não respondidos:</p>
              <ul className="space-y-2 text-sm text-yellow-900">
                {missed.map((m, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{m.questionario?.titulo || m.questionario?.nome || 'Questionário'}</div>
                      <div className="text-xs text-yellow-800">Data: {m.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          // colocar override e ir para refazer
                          sessionStorage.setItem('override_questionario', JSON.stringify(m));
                          navigate('/paciente/questionario');
                        }}
                        className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                      >
                        Refazer
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
         <div>
          <label htmlFor="expectativa" className="block text-lg font-medium text-gray-800">Expectativa para a próxima semana</label>
           <p className="text-sm text-gray-500 mb-2">O que você gostaria de focar ou alcançar?</p>
          <textarea 
            id="expectativa"
            rows="3"
            value={expectativaSemana}
            onChange={(e) => setExpectativaSemana(e.target.value)}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
            placeholder="Eu gostaria de..."
            disabled={isSubmitting || !!success || isDisabled}
          ></textarea>
        </div>
        {!success && !isDisabled && (
          <BotaoSubmit label="Enviar Resumo" labelLoading="Enviando..." isLoading={isSubmitting} icon={<FileText />} />
        )}
      </form>
    </div>
  );
};


// --- COMPONENTES AUXILIARES ---

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const InputForm = ({ label, name, type, value, onChange, disabled, placeholder = '' }) => (
  <div>
    <label htmlFor={name} className="block text-lg font-medium text-gray-800">{label}</label>
    <input 
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
      placeholder={placeholder}
      disabled={disabled}
      required
    />
  </div>
);

const FormWrapper = ({ titulo, linkVoltar, children }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
    <div className="max-w-2xl mx-auto">
      <Link to={linkVoltar} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold mb-8 group">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition" />
        Voltar
      </Link>
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <h1 className="text-3xl font-bold mb-8 text-slate-900">{titulo}</h1>
        {children}
      </div>
    </div>
  </div>
);

const FormStatus = ({ success, error }) => (
  <>
    {success && (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border-2 border-emerald-200 text-emerald-700">
        <CheckCircle2 size={20} className="flex-shrink-0" />
        <div>
          <p className="font-semibold">{success}</p>
          <p className="text-sm">Redirecionando...</p>
        </div>
      </div>
    )}
    {error && (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border-2 border-red-200 text-red-700">
        <AlertTriangle size={20} className="flex-shrink-0" />
        <p className="font-semibold">{error}</p>
      </div>
    )}
  </>
);

const BotaoSubmit = ({ label, labelLoading, isLoading, icon }) => (
  <button 
    type="submit"
    disabled={isLoading}
    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all"
  >
    {isLoading ? (
      <>
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {labelLoading}
      </>
    ) : (
      <>
        {icon && React.cloneElement(icon, { className: "w-5 h-5" })}
        {label}
      </>
    )}
  </button>
);


// --- Componente Principal (App) ---

function App() {
  const { isTestMode } = useTestMode();

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login-psicologo" element={<LoginPsicologo />} />
          <Route path="/login-paciente" element={<LoginPaciente />} />
          <Route path="/registrar-psicologo" element={<RegistroPsicologo />} />

          {/* Rotas Protegidas do Psicólogo */}
          <Route path="/psicologo" element={<ProtectedPsicologoRoute />}>
            <Route index element={<Navigate to="dashboard" replace />} /> 
            <Route path="dashboard" element={<DashboardPsicologo />} />
            <Route path="criar-paciente" element={<CriarPacienteForm />} />
            <Route path="paciente/:id/dashboard" element={<PacienteDashboard />} />
            <Route path="paciente/:id/editar" element={<EditarPacienteForm />} />
            <Route path="paciente/:id/configurar" element={<ConfigurarPlanoPaciente />} />
          </Route>

          {/* Rotas Protegidas do Paciente */}
          <Route path="/paciente" element={<ProtectedPacienteRoute />}>
            <Route index element={<Navigate to="questionario" replace />} />
            <Route path="questionario" element={<QuestionarioPaciente />} />
            <Route path="resumo" element={<ResumoPaciente />} />
          </Route>
          
           {/* Rota "Não Encontrado" */}
          <Route path="*" element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-800">404</h1>
                <p className="text-xl text-gray-600 mb-4">Página não encontrada</p>
                <Link to="/" className="text-blue-600 hover:underline">Voltar para a Home</Link>
              </div>
            </div>
          } />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;