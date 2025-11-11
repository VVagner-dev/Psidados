import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Download, Loader } from 'lucide-react';

export default function RelatorioSemanal({ pacienteId, token }) {
  const [relatorio, setRelatorio] = useState(null);
  const [analiseIA, setAnaliseIA] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);

  // Buscar relatório ao montar componente
  useEffect(() => {
    carregarRelatorio();
  }, [pacienteId, token]);

  const carregarRelatorio = async () => {
    try {
      setLoading(true);
      setErro(null);

      const response = await fetch(`/api/relatorio/semana/${pacienteId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.message || 'Erro ao carregar relatório');
        return;
      }

      setRelatorio(data);
      
      // Se há análise no banco, exibir
      if (data.resumo_semanal?.analise_ia) {
        setAnaliseIA(data.resumo_semanal.analise_ia);
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      setErro('Erro ao conectar com servidor');
    } finally {
      setLoading(false);
    }
  };

  const gerarAnaliseIA = async () => {
    if (!relatorio) return;

    try {
      setGerando(true);
      setErro(null);

      const response = await fetch(`/api/relatorio/gerar-ia/${pacienteId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ relatorio })
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.message || 'Erro ao gerar análise');
        return;
      }

      setAnaliseIA(data.analise);
    } catch (error) {
      console.error('Erro ao gerar análise:', error);
      setErro('Erro ao gerar análise com IA');
    } finally {
      setGerando(false);
    }
  };

  const exportarPDF = () => {
    const conteudo = document.getElementById('relatorio-completo');
    if (!conteudo) return;

    const janela = window.open('', '', 'width=900,height=1000');
    janela.document.write(`
      <html>
      <head>
        <title>Relatório Semanal</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { color: #1f2937; }
          .card { border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .score-box { background: #f3f4f6; padding: 15px; margin: 10px 0; border-left: 4px solid #3b82f6; }
          .analise { background: #f0fdf4; padding: 20px; margin: 20px 0; border-radius: 8px; }
        </style>
      </head>
      <body>${conteudo.innerHTML}</body>
      </html>
    `);
    janela.document.close();
    janela.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={40} />
          <p className="text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-red-700">{erro}</p>
        <button
          onClick={carregarRelatorio}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!relatorio) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Nenhum dado de relatório disponível</p>
        <p className="text-sm text-gray-500">Responda questionários para gerar relatório</p>
      </div>
    );
  }

  // Preparar dados para gráficos
  const dadosGrafico = relatorio.questionarios.map(q => ({
    nome: q.titulo.split('(')[0].trim(),
    score: q.score_atual,
    maximo: q.max_possivel,
    media: q.score_medio,
    categoria: q.titulo.includes('PHQ') ? 'Depressão' : q.titulo.includes('GAD') ? 'Ansiedade' : 'Afeto'
  }));

  const dadosRadar = relatorio.questionarios.map(q => ({
    nome: q.titulo.split('(')[0].trim(),
    valor: q.percentual
  }));

  return (
    <div id="relatorio-completo" className="space-y-6 pb-8">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">Relatório Semanal</h1>
        <p className="text-teal-100">
          {new Date(relatorio.data_geracao).toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={gerarAnaliseIA}
          disabled={gerando}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
        >
          {gerando && <Loader className="animate-spin" size={18} />}
          {gerando ? 'Gerando...' : 'Gerar Análise com IA'}
        </button>
        <button
          onClick={exportarPDF}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
        >
          <Download size={18} />
          Exportar PDF
        </button>
        <button
          onClick={carregarRelatorio}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
        >
          Atualizar
        </button>
      </div>

      {/* Resumo da Semana */}
      {relatorio.resumo_semanal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4">📝 Resumo da Semana</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Como você descreveria a semana?</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{relatorio.resumo_semanal.texto_resumo}</p>
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Expectativas para próxima semana:</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{relatorio.resumo_semanal.texto_expectativa}</p>
            </div>
          </div>
        </div>
      )}

      {/* Scores e Pontuações */}
      <div>
        <h2 className="text-2xl font-bold mb-4">📊 Scores da Semana</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {relatorio.questionarios.map((q, idx) => (
            <div key={idx} className="bg-white border-2 rounded-lg p-5" style={{ borderColor: q.cor }}>
              <h3 className="font-bold text-lg mb-3">{q.titulo.split('(')[0].trim()}</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Score Atual</p>
                  <p className="text-3xl font-bold" style={{ color: q.cor }}>
                    {q.score_atual}/{q.max_possivel}
                  </p>
                  <p className="text-xs text-gray-500">{q.percentual}%</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-600">Severidade</p>
                  <p className="font-semibold" style={{ color: q.cor }}>{q.severidade}</p>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>📈 Média: {q.score_medio}</p>
                  <p>🔝 Máxima: {q.score_maximo}</p>
                  <p>🔽 Mínima: {q.score_minimo}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de Barras */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">📈 Comparação de Scores</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dadosGrafico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nome" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="score" fill="#3b82f6" name="Score Atual" />
            <Bar dataKey="media" fill="#10b981" name="Média Semanal" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico Radar */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">🎯 Percentual de Severidade</h2>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={dadosRadar}>
            <PolarGrid />
            <PolarAngleAxis dataKey="nome" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar name="Percentual" dataKey="valor" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Análise com IA */}
      {analiseIA && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-green-900 mb-4">🤖 Análise Inteligente</h2>
          <div className="text-gray-700 space-y-3 whitespace-pre-wrap">
            {analiseIA}
          </div>
        </div>
      )}

      {!analiseIA && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">Clique em "Gerar Análise com IA" para receber uma análise personalizada baseada em seus dados.</p>
        </div>
      )}
    </div>
  );
}
