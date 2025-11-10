import React, { useState, useContext, createContext, useEffect } from 'react';
import { 
  BrowserRouter, Routes, Route, Link, Navigate, 
  Outlet, useLocation, useNavigate, useParams 
} from 'react-router-dom';
import { 
  Users, LogIn, LogOut, FileText, 
  ChevronRight, Brain, User, KeyRound, ArrowLeft, 
  Settings, Trash2, Edit, UserPlus, Save,
  BugPlay, AlertCircle
} from 'lucide-react';
import TestPanel from './components/TestPanel';
import { useTestMode } from './contexts/TestModeContext';

// --- AUTENTICAÇÃO ---

// 1. Contexto de Autenticação
const AuthContext = createContext(null);

const useAuth = () => {
  return useContext(AuthContext);
};

// Função para logs persistentes
const persistentLog = (type, ...args) => {
  const log = {
    timestamp: new Date().toISOString(),
    type,
    message: args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
  };
  
  // Manter logs no localStorage
  const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
  logs.push(log);
  localStorage.setItem('debug_logs', JSON.stringify(logs.slice(-50))); // Manter últimos 50 logs
  
  // Log normal no console
  console[type](...args);
};

// Parser seguro que evita 'Unexpected end of JSON input' quando o servidor
// retorna uma resposta vazia ou HTML de erro. Disponível em todo o módulo.
const safeParseResponse = async (response) => {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { message: text };
  }
  return { ok: response.ok, status: response.status, data, headers: response.headers };
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
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <Link to="/psicologo/dashboard" className="flex items-center">
              <Brain className="text-teal-600" />
              <span className="ml-2 font-bold text-xl text-gray-800">PsiDados</span>
            </Link>
            <div className="flex items-center">
              <span className="text-gray-700 mr-4">
                Olá, {psicologo.nome}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center p-10 bg-white rounded-lg shadow-xl">
        <Brain className="mx-auto h-16 w-16 text-teal-600" />
        <h1 className="mt-4 text-4xl font-bold text-gray-900">
          Bem-vindo ao PsiDados
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          A ponte inteligente entre psicólogos e pacientes.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/login-psicologo"
            className="flex items-center justify-center px-6 py-3 bg-teal-600 text-white rounded-md font-semibold shadow-lg hover:bg-teal-700 transition duration-300"
          >
            <User className="mr-2" />
            Portal do Psicólogo
          </Link>
          <Link
            to="/login-paciente"
            className="flex items-center justify-center px-6 py-3 bg-gray-700 text-white rounded-md font-semibold shadow-lg hover:bg-gray-800 transition duration-300"
          >
            <KeyRound className="mr-2" />
            Portal do Paciente
          </Link>
        </div>
        <div className="mt-6">
          <Link
            to="/registrar-psicologo"
            className="text-sm text-teal-600 hover:underline"
          >
            É psicólogo? Crie sua conta
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 pt-6 border-t">
            <button
              onClick={toggleTestMode}
              className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition duration-300 ${
                isTestMode
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <div className="text-center">
          <Brain className="mx-auto h-12 w-12 text-teal-600" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            Portal do Psicólogo
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-2 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="seuemail@dominio.com"
            />
          </div>
          <div>
            <label className="font-medium">CRP</label>
            <input
              type="text"
              required
              value={crp}
              onChange={(e) => setCrp(e.target.value)}
              className="w-full mt-2 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="00/12345"
            />
          </div>
           <div>
            <label className="font-medium">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full mt-2 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="********"
            />
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition duration-300 disabled:bg-teal-400"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <LogIn className="mr-2 h-5 w-5" />
            )}
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
         <p className="mt-6 text-center text-sm space-x-2">
          <Link to="/" className="text-teal-600 hover:underline">Voltar para Home</Link>
          <span>|</span>
          <Link to="/registrar-psicologo" className="text-teal-600 hover:underline">Criar conta</Link>
        </p>
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <div className="text-center">
          <KeyRound className="mx-auto h-12 w-12 text-teal-600" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            Portal do Paciente
          </h2>
          <p className="mt-2 text-gray-600">Use seu código de acesso para entrar.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-medium">Código de Acesso</label>
            <input
              type="text"
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="w-full mt-2 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="XXXXXX"
            />
          </div>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition duration-300 disabled:bg-teal-400"
          >
             {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <LogIn className="mr-2 h-5 w-5" />
            )}
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
         <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-teal-600 hover:underline">Voltar para Home</Link>
        </p>

        {/* Seção de Debug */}
        {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
          <div className="mt-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Info:</h3>
            <div className="text-xs font-mono bg-white p-2 rounded max-h-40 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index} className={`mb-1 ${
                  info.type === 'error' ? 'text-red-600' : 
                  info.type === 'warn' ? 'text-yellow-600' : 
                  'text-gray-600'
                }`}>
                  [{info.timestamp.split('T')[1].split('.')[0]}] {info.message}
                </div>
              ))}
            </div>
          </div>
        )}
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
        <div className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-teal-600" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            Criar Conta (Psicólogo)
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <InputForm label="Nome Completo" name="nome" type="text" value={formData.nome} onChange={handleChange} disabled={isLoading} />
          <InputForm label="Email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={isLoading} />
          <InputForm label="CRP" name="crp" type="text" value={formData.crp} onChange={handleChange} disabled={isLoading} placeholder="00/12345" />
          <InputForm label="Senha" name="senha" type="password" value={formData.senha} onChange={handleChange} disabled={isLoading} placeholder="Min. 6 caracteres" />
          
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          {success && <p className="text-sm text-green-600 text-center">{success}</p>}

          <button 
            type="submit"
            disabled={isLoading || !!success}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition duration-300 disabled:bg-teal-400"
          >
            {isLoading ? <Spinner /> : <UserPlus className="mr-2 h-5 w-5" />}
            {isLoading ? 'A Criar...' : 'Criar Conta'}
          </button>
        </form>
         <p className="mt-6 text-center text-sm">
          <Link to="/login-psicologo" className="text-teal-600 hover:underline">Já tem conta? Entrar</Link>
        </p>
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

  if (isLoading) return <div className="text-center p-8"><Spinner /> Carregando pacientes...</div>;

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Seus Pacientes</h1>
        <Link
          to="/psicologo/criar-paciente"
          className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-md font-semibold shadow-lg hover:bg-teal-700 transition duration-300"
        >
          <UserPlus className="mr-2 h-5 w-5" />
          Adicionar Paciente
        </Link>
      </div>
      
      {error && <div className="p-3 rounded-md bg-red-100 text-red-800 text-center font-medium mb-4">{error}</div>}
      
      {pacientes.length === 0 && !error ? (
        <p className="text-gray-600">Você ainda não cadastrou nenhum paciente.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {pacientes.map((p) => (
            <li key={p.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="mb-2 sm:mb-0">
                <p className="text-lg font-medium text-teal-700">{p.nome}</p>
                <p className="text-sm text-gray-500">Email: {p.email}</p>
                <p className="text-sm text-gray-500">Código de Acesso: <span className="font-mono bg-gray-100 p-1 rounded">{p.codigo_acesso}</span></p>
              </div>
              <div className="flex space-x-2">
                <Link 
                  to={`/psicologo/paciente/${p.id}/dashboard`}
                  className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <FileText className="h-4 w-4" />
                </Link>
                <Link 
                  to={`/psicologo/paciente/${p.id}/configurar`}
                  className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  title="Configurar Plano"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                 <Link 
                  to={`/psicologo/paciente/${p.id}/editar`}
                  className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </Link>
                <button 
                  onClick={() => handleDelete(p.id)}
                  className="flex items-center px-3 py-1.5 bg-red-100 border border-red-200 rounded-md text-sm font-medium text-red-700 hover:bg-red-200"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ( /psicologo/paciente/:id/dashboard )
// Renomeado de PacienteDetalhes para PacienteDashboard
const PacienteDashboard = () => {
  const { id: pacienteId } = useParams();
  const { psicologo } = useAuth();
  const { isTestMode } = useTestMode();
  
  const [paciente, setPaciente] = useState(null);
  const [respostas, setRespostas] = useState([]);
  const [resumos, setResumos] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (isLoading) {
    return <div className="text-center p-8"><Spinner /> Carregando dados do paciente...</div>;
  }
  
  if (error) {
    return <div className="text-center p-8 text-red-600">Erro: {error}</div>;
  }

  return (
    <div>
      <Link to="/psicologo/dashboard" className="flex items-center text-teal-600 hover:underline mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Dashboard
      </Link>
      
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        {paciente?.nome || "Detalhes do Paciente"}
      </h1>
      <p className="text-lg text-gray-600 mb-6">
        Plano Atual: <span className="font-semibold">{paciente?.questionario_nome || "Nenhum"} ({paciente?.frequencia || "N/A"})</span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Resumos Semanais (IA)</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {resumos.length === 0 ? (
              <p className="text-gray-500">Nenhum resumo semanal enviado.</p>
            ) : (
              resumos.map(r => (
                <div key={r.id} className="p-4 border rounded-md bg-gray-50">
                  <p className="text-sm text-gray-500">{new Date(r.data_envio).toLocaleDateString()}</p>
                  <p className="mt-2 text-gray-800"><span className="font-semibold">Resumo:</span> {r.resumo_semanal}</p>
                  <p className="mt-1 text-gray-800"><span className="font-semibold">Expectativa:</span> {r.expectativa_semana}</p>
                  <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-md">
                    <p className="font-semibold text-teal-800">Análise (IA):</p>
                    <p className="text-teal-700 whitespace-pre-wrap">{r.analise_ia || "Aguardando análise..."}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Respostas Diárias</h2>
           <div className="space-y-4 max-h-96 overflow-y-auto">
            {respostas.length === 0 ? (
              <p className="text-gray-500">Nenhuma resposta diária enviada.</p>
            ) : (
              respostas.map(r => (
                 <div key={r.id} className="p-4 border rounded-md">
                   <p className="font-semibold text-gray-700">Questionário: {r.questionario_nome}</p>
                   <p className="text-sm text-gray-500">{new Date(r.data_resposta).toLocaleDateString()}</p>
                   <p className="mt-2 text-gray-800">Pontuação Total: {r.pontuacao_total}</p>
                 </div>
              ))
            )}
          </div>
        </div>
      </div>
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
        // Recarregar o questionário
        window.location.reload();
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
          if (data.temQuestionarioHoje === false) {
            // Sem questionário para hoje
            if (data.message === 'Você já enviou a sua resposta de hoje.') {
              setSuccess('Você já respondeu o questionário de hoje. Volte amanhã!');
            } else {
              setError(data.message || 'Nenhum questionário para hoje.');
            }
          } else if (data.temQuestionarioHoje === true) {
            // Tem questionário para hoje
            setQuestionario(data);
            const respostasIniciais = {};
            if (data.perguntas && Array.isArray(data.perguntas)) {
               data.perguntas.forEach((p, index) => {
                 const perguntaId = typeof p === 'string' ? `q${index}` : (p.id || `q${index}`);
                 respostasIniciais[perguntaId] = null;
               });
            }
            setRespostas(respostasIniciais);
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
      
      if (data.resumoNecessario) {
        sessionStorage.setItem('mostrarResumo', 'true');
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

  useEffect(() => {
    const mostrarResumo = sessionStorage.getItem('mostrarResumo');
    if (mostrarResumo === 'true') {
      setIsDisabled(false);
      sessionStorage.removeItem('mostrarResumo');
    } else {
      setIsDisabled(true);
      setError('O resumo semanal só pode ser preenchido após completar os 3 questionários da semana.');
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
  <div>
    <Link to={linkVoltar} className="flex items-center text-teal-600 hover:underline mb-4">
      <ArrowLeft className="mr-2 h-4 w-4" />
      Voltar
    </Link>
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">{titulo}</h1>
      {children}
    </div>
  </div>
);

const FormStatus = ({ success, error }) => (
  <>
    {success && (
      <div className="p-3 rounded-md bg-green-100 text-green-800 text-center font-medium">
        <p>{success}</p>
        <p className="text-sm">Redirecionando...</p>
      </div>
    )}
    {error && (
      <div className="p-3 rounded-md bg-red-100 text-red-800 text-center font-medium">
        {error}
      </div>
    )}
  </>
);

const BotaoSubmit = ({ label, labelLoading, isLoading, icon }) => (
  <button 
    type="submit"
    disabled={isLoading}
    className="w-full flex items-center justify-center px-6 py-3 bg-teal-600 text-white rounded-md font-semibold shadow-lg hover:bg-teal-700 transition duration-300 disabled:bg-teal-400"
  >
    {isLoading ? <Spinner /> : React.cloneElement(icon, { className: "mr-2 h-5 w-5" })}
    {isLoading ? labelLoading : label}
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