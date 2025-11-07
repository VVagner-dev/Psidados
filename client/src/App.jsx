import React, { useState, useContext, createContext, useEffect } from 'react';
import { 
  BrowserRouter, Routes, Route, Link, Navigate, 
  Outlet, useLocation, useNavigate, useParams 
} from 'react-router-dom';
import { 
  Users, LogIn, LogOut, FileText, 
  ChevronRight, Brain, User, KeyRound, ArrowLeft, 
  Settings, Trash2, Edit, UserPlus, Save
} from 'lucide-react';

// --- AUTENTICAÇÃO ---

// 1. Contexto de Autenticação
const AuthContext = createContext(null);

const useAuth = () => {
  return useContext(AuthContext);
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
  const [paciente, setPaciente] = useState(() => {
     try {
      const stored = localStorage.getItem('paciente-token');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Falha ao ler 'paciente-token' do localStorage", e);
      return null;
    }
  });
  
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
  const loginPsicologo = async (email, crp, senha) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, crp, senha }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Credenciais inválidas.');
      setPsicologo({ token: data.token, nome: data.nome || 'Psicólogo(a)' });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const loginPaciente = async (codigoAcesso) => {
    try {
      const response = await fetch('/api/paciente-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_acesso: codigoAcesso }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Código de acesso inválido.');
      setPaciente({ token: data.token, nome: data.nome || 'Paciente' });
      return { success: true };
    } catch (error) {
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
  if (!paciente) {
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
          <Link 
            to="/paciente/resumo"
            className={`px-5 py-2 rounded-md font-medium ${isResumo ? 'bg-teal-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Resumo Semanal
          </Link>
        </div>
        <Outlet />
      </div>
    </div>
  );
};


// --- COMPONENTES DE PÁGINA ---

// ( / )
const Home = () => {
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
      </div>
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
  const location = useLocation();
  const { loginPaciente } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/paciente/questionario';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const resultado = await loginPaciente(codigo);
    setIsLoading(false);
    if (resultado.success) {
      navigate(from, { replace: true });
    } else {
      setError(resultado.message || 'Código de acesso inválido.');
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
      
      const data = await response.json();
      
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
          <InputForm label="Nome Completo" name="nome_completo" type="text" value={formData.nome_completo} onChange={handleChange} disabled={isLoading} />
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
      if (!response.ok) throw new Error('Não foi possível carregar os pacientes.');
      const data = await response.json();
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
      
      const data = await response.json();
      
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
                <p className="text-lg font-medium text-teal-700">{p.nome_completo}</p>
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
        
        if (!pacienteRes.ok || !respostasRes.ok || !resumosRes.ok) {
          throw new Error('Falha ao carregar dados do paciente.');
        }
        
        const dataPaciente = await pacienteRes.json();
        const dataRespostas = await respostasRes.json();
        const dataResumos = await resumosRes.json();
        
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
        {paciente?.nome_completo || "Detalhes do Paciente"}
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
  const [formData, setFormData] = useState({ nome_completo: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    if (!formData.nome_completo || !formData.email) {
      setError('Por favor, preencha nome e email.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/pacientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${psicologo.token}`,
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao criar paciente.');

      setSuccess(`Paciente criado! Código de acesso: ${data.codigo_acesso}`);
      setFormData({ nome_completo: '', email: '' });
      setTimeout(() => navigate('/psicologo/dashboard'), 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormWrapper titulo="Novo Paciente" linkVoltar="/psicologo/dashboard">
      <form onSubmit={handleSubmit} className="space-y-6">
        <InputForm label="Nome Completo" name="nome_completo" type="text" value={formData.nome_completo} onChange={handleChange} disabled={isSubmitting || !!success} />
        <InputForm label="Email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={isSubmitting || !!success} />
        
        <FormStatus success={success} error={error} />
        
        {!success && (
          <BotaoSubmit label="Salvar Paciente e Gerar Código" labelLoading="Salvando..." isLoading={isSubmitting} icon={<UserPlus />} />
        )}
      </form>
    </FormWrapper>
  );
};

// ( /psicologo/paciente/:id/editar )
const EditarPacienteForm = () => {
  const { id: pacienteId } = useParams();
  const { psicologo } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ nome_completo: '', email: '' });
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
        if (!response.ok) throw new Error('Falha ao buscar dados do paciente.');
        const data = await response.json();
        setFormData({ nome_completo: data.nome_completo, email: data.email });
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
      
      const data = await response.json();
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
        <InputForm label="Nome Completo" name="nome_completo" type="text" value={formData.nome_completo} onChange={handleChange} disabled={isSubmitting} />
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

  // Lista mockada de questionários, já que a API não fornece
  const mockQuestionariosLista = [
    { id: 1, nome: "GAD-7 (Ansiedade)" },
    { id: 2, nome: "PHQ-9 (Depressão)" }
  ];

  const [paciente, setPaciente] = useState(null);
  const [selectedQuestionarioId, setSelectedQuestionarioId] = useState('');
  const [frequencia, setFrequencia] = useState('diaria');
  
  const [isLoading, setIsLoading] = useState(true); // Para buscar
  const [isSubmitting, setIsSubmitting] = useState(false); // Para enviar
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Buscar dados atuais do paciente (para saber o plano atual)
  useEffect(() => {
    if (!pacienteId || !psicologo?.token) return;
    
    const fetchPaciente = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/pacientes/${pacienteId}`, {
           headers: { 'Authorization': `Bearer ${psicologo.token}` }
        });
        if (!response.ok) throw new Error('Falha ao buscar dados do paciente.');
        const data = await response.json();
        setPaciente(data);
        setSelectedQuestionarioId(data.questionario_atual_id || '');
        setFrequencia(data.frequencia || 'diaria');
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

    try {
      const response = await fetch(`/api/pacientes/${pacienteId}/questionario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${psicologo.token}`,
        },
        body: JSON.stringify({
          questionario_id: selectedQuestionarioId,
          frequencia: frequencia
        }),
      });
      
      const data = await response.json();
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
    <FormWrapper titulo={`Configurar Plano: ${paciente?.nome_completo || ''}`} linkVoltar={`/psicologo/paciente/${pacienteId}/dashboard`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Seleção de Questionário */}
        <div>
          <label htmlFor="questionario" className="block text-lg font-medium text-gray-800">Questionário</label>
           <select 
              id="questionario"
              value={selectedQuestionarioId}
              onChange={(e) => setSelectedQuestionarioId(Number(e.target.value))}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              disabled={isSubmitting}
            >
              <option value="">-- Selecione um questionário --</option>
              {mockQuestionariosLista.map(q => (
                <option key={q.id} value={q.id}>{q.nome}</option>
              ))}
            </select>
        </div>

        {/* Seleção de Frequência */}
        <div>
          <label htmlFor="frequencia" className="block text-lg font-medium text-gray-800">Frequência</label>
           <select 
              id="frequencia"
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
              disabled={isSubmitting}
            >
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
              {/* Adicionar mais opções se o backend suportar */}
            </select>
        </div>

        <FormStatus success={success} error={error} />
        
        <BotaoSubmit label="Salvar Plano" labelLoading="Salvando..." isLoading={isSubmitting} icon={<Save />} />
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

  useEffect(() => {
    if (!paciente?.token) return;
    const fetchQuestionario = async () => {
      setIsLoading(true);
      setError('');
      setSuccess('');
      try {
        const response = await fetch('/api/questionario/hoje', {
          headers: { 'Authorization': `Bearer ${paciente.token}` },
        });
        const data = await response.json();
        if (response.status === 404) setError(data.message || 'Nenhum questionário para hoje.');
        else if (response.status === 409) setSuccess(data.message || 'Você já respondeu o questionário de hoje.');
        else if (!response.ok) throw new Error(data.message || 'Falha ao buscar questionário.');
        else {
          setQuestionario(data);
          const respostasIniciais = {};
          if (data.perguntas && Array.isArray(data.perguntas)) {
             data.perguntas.forEach((p, index) => {
               const perguntaId = p.id || `q${index}`;
               respostasIniciais[perguntaId] = null;
             });
          }
          setRespostas(respostasIniciais);
        }
      } catch (err) { setError(err.message); }
      finally { setIsLoading(false); }
    };
    fetchQuestionario();
  }, [paciente.token]);

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
      const response = await fetch('/api/questionario/responder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${paciente.token}`,
        },
        body: JSON.stringify({
          questionarioId: questionario.id,
          respostas: respostas,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao enviar respostas.');
      setSuccess('Obrigado! Suas respostas foram enviadas com sucesso.');
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
    const opcoes = pergunta.opcoes || [
      { texto: "Nenhuma vez", valor: 0 },
      { texto: "Vários dias", valor: 1 },
      { texto: "Mais da metade dos dias", valor: 2 },
      { texto: "Quase todos os dias", valor: 3 },
    ];

    return (
      <fieldset key={perguntaId} className="border-t pt-4">
        <legend className="block text-lg font-medium text-gray-800">
          {pergunta.texto || 'Pergunta sem texto'}
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
      {isLoading && renderLoading()}
      {error && !success && renderMensagem(error, 'error')}
      {success && renderMensagem(success, 'success')}
      {questionario && !isLoading && !success && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <h2 className="text-xl font-semibold text-gray-700">{questionario.nome}</h2>
          <p className="text-gray-600">{questionario.descricao || 'Responda as perguntas abaixo.'}</p>
          {questionario.perguntas && questionario.perguntas.map((p, i) => renderPergunta(p, i))}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <BotaoSubmit label="Enviar Respostas" labelLoading="Enviando..." isLoading={isSubmitting} icon={<FileText />} />
        </form>
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
          resumo_semanal: resumoSemanal,
          expectativa_semana: expectativaSemana,
        }),
      });
      const data = await response.json();
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
            disabled={isSubmitting || !!success}
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
            disabled={isSubmitting || !!success}
          ></textarea>
        </div>
        {!success && (
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