import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Download, Loader, FileDown } from 'lucide-react';
import html2pdf from 'html2pdf.js';

export default function RelatorioSemanal({ pacienteId, token }) {
  const [relatorio, setRelatorio] = useState(null);
  const [analiseIA, setAnaliseIA] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);
  const relatorioRef = useRef(null);

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

  const exportarPDF = async () => {
    if (!relatorioRef.current) return;

    try {
      const element = relatorioRef.current;
      const opt = {
        margin: 10,
        filename: `Relatorio_Semanal_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setErro('Erro ao exportar PDF');
    }
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
    <div ref={relatorioRef} id="relatorio-completo" className="space-y-8 pb-12 bg-white">
      {/* Cabeçalho Premium */}
      <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 text-white rounded-lg p-8 shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">📋 Relatório Semanal</h1>
            <p className="text-teal-100 text-lg">Análise de bem-estar e saúde mental</p>
          </div>
          <div className="text-right bg-white/20 rounded-lg p-4">
            <p className="text-teal-100 text-sm mb-1">Semana de:</p>
            <p className="text-white font-semibold">
              {new Date(relatorio.data_geracao).toLocaleDateString('pt-BR', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3 flex-wrap sticky top-0 bg-white py-4 z-10">
        <button
          onClick={gerarAnaliseIA}
          disabled={gerando}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2 font-medium transition"
        >
          {gerando && <Loader className="animate-spin" size={18} />}
          {gerando ? 'Gerando...' : '🤖 Gerar Análise com IA'}
        </button>
        <button
          onClick={exportarPDF}
          className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium transition"
        >
          <FileDown size={18} />
          📥 Baixar PDF
        </button>
        <button
          onClick={carregarRelatorio}
          className="px-5 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition"
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Resumo da Semana */}
      {relatorio.resumo_semanal && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
            📝 <span>Resumo da Semana</span>
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-blue-800 mb-3 text-lg">Como você descreveria a semana que passou?</h3>
              <p className="text-gray-700 leading-relaxed bg-white p-4 rounded border-l-4 border-blue-400">
                {relatorio.resumo_semanal.texto_resumo}
              </p>
            </div>
            <div>
              <h3 className="font-bold text-blue-800 mb-3 text-lg">Expectativas para próxima semana</h3>
              <p className="text-gray-700 leading-relaxed bg-white p-4 rounded border-l-4 border-blue-400">
                {relatorio.resumo_semanal.texto_expectativa}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scores e Pontuações */}
      <div>
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 text-gray-800">
          📊 <span>Scores da Semana</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {relatorio.questionarios.map((q, idx) => (
            <div 
              key={idx} 
              className="bg-white border-4 rounded-lg p-6 shadow-md hover:shadow-lg transition"
              style={{ borderColor: q.cor }}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-gray-800">{q.titulo.split('(')[0].trim()}</h3>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: q.cor }}
                >
                  {q.percentual}%
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-semibold mb-1 uppercase">Score Atual</p>
                  <p className="text-4xl font-bold" style={{ color: q.cor }}>
                    {q.score_atual}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">máximo: {q.max_possivel}</p>
                </div>

                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-600 font-semibold mb-1 uppercase">Severidade</p>
                  <p className="font-bold text-lg" style={{ color: q.cor }}>
                    {q.severidade}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded p-2">
                    <p className="text-xs text-gray-600">Média</p>
                    <p className="font-bold text-blue-600">{q.score_medio}</p>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-xs text-gray-600">Máxima</p>
                    <p className="font-bold text-green-600">{q.score_maximo}</p>
                  </div>
                  <div className="bg-red-50 rounded p-2">
                    <p className="text-xs text-gray-600">Mínima</p>
                    <p className="font-bold text-red-600">{q.score_minimo}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de Barras */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-8 shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
          📈 <span>Comparação de Scores</span>
        </h2>
        <div className="w-full h-80 bg-gray-50 rounded p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={relatorio.questionarios.map(q => ({
              nome: q.titulo.split('(')[0].trim(),
              score: q.score_atual,
              media: q.score_medio
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip 
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="score" fill="#3b82f6" name="Score Atual" radius={[8, 8, 0, 0]} />
              <Bar dataKey="media" fill="#10b981" name="Média Semanal" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico Radar */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-8 shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
          🎯 <span>Percentual de Severidade</span>
        </h2>
        <div className="w-full h-80 bg-gray-50 rounded p-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={relatorio.questionarios.map(q => ({
              nome: q.titulo.split('(')[0].trim(),
              valor: q.percentual
            }))}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="nome" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Percentual" dataKey="valor" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Análise com IA */}
      {analiseIA && (
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-green-300 rounded-lg p-8 shadow-md">
          <h2 className="text-2xl font-bold text-green-900 mb-6 flex items-center gap-2">
            🤖 <span>Análise Inteligente</span>
          </h2>
          <div className="bg-white rounded-lg p-6 text-gray-700 leading-relaxed whitespace-pre-wrap">
            {analiseIA}
          </div>
        </div>
      )}

      {!analiseIA && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-8 text-center shadow-md">
          <p className="text-gray-700 mb-4 text-lg font-medium">
            ⚠️ Clique em "Gerar Análise com IA" para receber uma análise personalizada
          </p>
          <p className="text-gray-600">baseada em seus dados e contexto semanal.</p>
        </div>
      )}

      {/* Rodapé */}
      <div className="border-t-2 border-gray-300 pt-6 mt-8 text-center text-sm text-gray-600">
        <p>Relatório gerado automaticamente em {new Date(relatorio.data_geracao).toLocaleString('pt-BR')}</p>
        <p className="mt-2 text-xs">© PsiDados - Sistema de Acompanhamento Psicológico</p>
      </div>
    </div>
  );
}
