import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, Loader, FileDown, ArrowLeft } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const CORES_PIE = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

export default function RelatorioSemanal({ pacienteId, token, onVoltar }) {
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

  // Preparar dados para gráfico pizza
  const dadosPizza = relatorio.questionarios.map((q, idx) => ({
    name: q.titulo.split('(')[0].trim(),
    value: q.score_atual,
    max: q.max_possivel,
    cor: CORES_PIE[idx % CORES_PIE.length],
    severidade: q.severidade
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-1">📋 Relatório Semanal</h1>
            <p className="text-indigo-100">Análise de bem-estar e saúde mental</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportarPDF}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium transition"
            >
              <FileDown size={18} />
              Baixar PDF
            </button>
            {onVoltar && (
              <button
                onClick={onVoltar}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2 font-medium transition"
              >
                <ArrowLeft size={18} />
                Voltar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div ref={relatorioRef} className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Seção 1: Gráfico Pizza + Resumo Semanal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Gráfico Pizza */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Scores da Semana</h2>
            <div className="w-full h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosPizza}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, max }) => `${name}: ${value}/${max}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dadosPizza.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value}/${props.payload.max}`,
                      props.payload.name
                    ]}
                    contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legenda dos Scores */}
            <div className="mt-6 space-y-2">
              {relatorio.questionarios.map((q, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4" style={{ borderColor: q.cor }}>
                  <span className="font-semibold text-gray-700">{q.titulo.split('(')[0].trim()}</span>
                  <div className="text-right">
                    <p className="text-xl font-bold" style={{ color: q.cor }}>{q.score_atual}/{q.max_possivel}</p>
                    <p className="text-xs text-gray-600">{q.severidade}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo Semanal */}
          {relatorio.resumo_semanal && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-8 border-2 border-blue-200">
              <h2 className="text-2xl font-bold text-blue-900 mb-6">📝 Resumo da Semana</h2>
              
              <div className="space-y-6">
                {/* Resumo */}
                <div>
                  <h3 className="font-bold text-blue-800 mb-3">Como foi sua semana?</h3>
                  <div className="bg-white p-4 rounded-lg border-l-4 border-blue-400 text-gray-700 leading-relaxed">
                    {relatorio.resumo_semanal.texto_resumo}
                  </div>
                </div>

                {/* Expectativa */}
                <div>
                  <h3 className="font-bold text-blue-800 mb-3">Expectativas para próxima semana</h3>
                  <div className="bg-white p-4 rounded-lg border-l-4 border-blue-400 text-gray-700 leading-relaxed">
                    {relatorio.resumo_semanal.texto_expectativa}
                  </div>
                </div>

                {/* Data */}
                <div className="text-xs text-blue-600 pt-2">
                  Enviado em {new Date(relatorio.resumo_semanal.data_fim_semana).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seção 2: Análise e Pontos de Atenção */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              � Análise e Pontos de Atenção
            </h2>
            {!analiseIA && (
              <button
                onClick={gerarAnaliseIA}
                disabled={gerando}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2 font-medium transition"
              >
                {gerando && <Loader className="animate-spin" size={18} />}
                {gerando ? 'Gerando...' : '🤖 Gerar com IA'}
              </button>
            )}
          </div>

          {analiseIA ? (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {analiseIA}
              </div>
              <div className="mt-6 text-sm text-gray-600 border-t border-indigo-200 pt-4">
                <p>✨ Análise gerada automaticamente com IA - Consulte seu psicólogo para discussão aprofundada.</p>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl border-2 border-dashed border-gray-300 text-center">
              <p className="text-gray-700 font-medium text-lg mb-3">
                Clique em "Gerar com IA" para receber uma análise personalizada
              </p>
              <p className="text-gray-600">
                baseada em seus questionários e contexto semanal.
              </p>
            </div>
          )}
        </div>

        {/* Detalhes dos Questionários */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📈 Detalhes por Questionário</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatorio.questionarios.map((q, idx) => (
              <div key={idx} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-l-4" style={{ borderColor: q.cor }}>
                <h3 className="font-bold text-lg text-gray-800 mb-4">{q.titulo.split('(')[0].trim()}</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Score Atual:</span>
                    <span className="text-2xl font-bold" style={{ color: q.cor }}>{q.score_atual}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Severidade:</span>
                    <span className="text-sm font-semibold px-3 py-1 rounded" style={{ backgroundColor: q.cor + '20', color: q.cor }}>
                      {q.severidade}
                    </span>
                  </div>

                  <hr className="my-3" />

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-gray-600 mb-1">Mínima</p>
                      <p className="font-bold text-red-600">{q.score_minimo}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Média</p>
                      <p className="font-bold text-blue-600">{q.score_medio}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Máxima</p>
                      <p className="font-bold text-green-600">{q.score_maximo}</p>
                    </div>
                  </div>

                  <div className="w-full bg-gray-300 rounded-full h-2 mt-4">
                    <div 
                      className="h-2 rounded-full transition-all" 
                      style={{ 
                        width: `${(q.score_atual / q.max_possivel) * 100}%`,
                        backgroundColor: q.cor
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 text-center">{q.percentual}% do máximo</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="border-t-2 border-gray-300 pt-6 text-center text-sm text-gray-600">
          <p>Relatório gerado em {new Date(relatorio.data_geracao).toLocaleString('pt-BR')}</p>
          <p className="mt-2 text-xs text-gray-500">© PsiDados - Sistema de Acompanhamento Psicológico</p>
        </div>
      </div>
    </div>
  );
};
