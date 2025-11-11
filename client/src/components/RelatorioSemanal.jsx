import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, Loader, FileDown, ArrowLeft, TrendingUp, AlertTriangle, CheckCircle2, Info, FileText } from 'lucide-react';
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-indigo-600" size={48} />
          <p className="text-slate-600 font-semibold">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle className="mx-auto mb-4 text-red-600" size={40} />
            <p className="text-red-700 font-semibold mb-4">{erro}</p>
            <button
              onClick={carregarRelatorio}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!relatorio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <Info className="mx-auto mb-4 text-slate-400" size={40} />
          <p className="text-slate-600 mb-4 font-semibold">Nenhum dado de relatório disponível</p>
          <p className="text-sm text-slate-500">Responda questionários para gerar relatório</p>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Cabeçalho Premium */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white p-6 shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
              <FileText size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">📋 Relatório Semanal</h1>
              <p className="text-indigo-100 text-sm">Análise completa de bem-estar</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportarPDF}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-2 font-semibold transition shadow-lg"
            >
              <FileDown size={18} />
              PDF
            </button>
            {onVoltar && (
              <button
                onClick={onVoltar}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 font-semibold transition backdrop-blur"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeInUp">
          
          {/* Gráfico Pizza */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 hover:shadow-2xl transition">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp className="text-indigo-600" size={20} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Scores da Semana</h2>
            </div>
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
                    contentStyle={{ 
                      backgroundColor: '#f9fafb', 
                      border: '2px solid #e5e7eb', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legenda dos Scores */}
            <div className="mt-8 space-y-3">
              {relatorio.questionarios.map((q, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border-l-4 hover:shadow-md transition" style={{ borderColor: q.cor }}>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: q.cor }}></div>
                    <span className="font-semibold text-slate-800">{q.titulo.split('(')[0].trim()}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: q.cor }}>{q.score_atual}/{q.max_possivel}</p>
                    <p className="text-xs font-medium text-slate-500">{q.percentual}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo Semanal */}
          {relatorio.resumo_semanal && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-xl border-2 border-blue-200 p-8 hover:shadow-2xl transition">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle2 className="text-blue-600" size={20} />
                </div>
                <h2 className="text-2xl font-bold text-blue-900">Resumo da Semana</h2>
              </div>
              
              <div className="space-y-6">
                {/* Resumo */}
                <div>
                  <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <span className="text-lg">📝</span> Como foi sua semana?
                  </h3>
                  <div className="bg-white p-5 rounded-xl border-l-4 border-blue-400 text-slate-700 leading-relaxed shadow-sm">
                    {relatorio.resumo_semanal.texto_resumo}
                  </div>
                </div>

                {/* Expectativa */}
                <div>
                  <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <span className="text-lg">🎯</span> Expectativas para próxima semana
                  </h3>
                  <div className="bg-white p-5 rounded-xl border-l-4 border-cyan-400 text-slate-700 leading-relaxed shadow-sm">
                    {relatorio.resumo_semanal.texto_expectativa}
                  </div>
                </div>

                {/* Data */}
                <div className="text-xs text-blue-600 pt-4 border-t border-blue-200">
                  📅 {new Date(relatorio.resumo_semanal.data_fim_semana).toLocaleDateString('pt-BR', {
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
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 hover:shadow-2xl transition animate-fadeInUp">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <AlertTriangle className="text-purple-600" size={20} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Análise e Pontos de Atenção</h2>
            </div>
            {!analiseIA && (
              <button
                onClick={gerarAnaliseIA}
                disabled={gerando}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center gap-2 font-semibold transition shadow-lg"
              >
                {gerando && <Loader className="animate-spin" size={18} />}
                {gerando ? 'Gerando...' : '🤖 Gerar com IA'}
              </button>
            )}
          </div>

          {analiseIA ? (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl border-2 border-purple-200">
              <div className="text-slate-800 leading-relaxed space-y-4 whitespace-pre-wrap text-base">
                {analiseIA}
              </div>
              <div className="mt-6 text-sm text-slate-600 border-t border-purple-200 pt-4">
                <p className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  Análise gerada automaticamente com IA - Consulte seu psicólogo para discussão aprofundada.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-12 rounded-xl border-2 border-dashed border-slate-300 text-center">
              <AlertTriangle className="mx-auto mb-4 text-slate-400" size={40} />
              <p className="text-slate-700 font-semibold text-lg mb-3">
                Clique em "Gerar com IA" para análise personalizada
              </p>
              <p className="text-slate-500">
                com insights baseados em seus questionários e contexto semanal
              </p>
            </div>
          )}
        </div>

        {/* Detalhes dos Questionários */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 hover:shadow-2xl transition animate-fadeInUp">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="text-emerald-600" size={20} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Detalhes por Questionário</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatorio.questionarios.map((q, idx) => (
              <div key={idx} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border-l-4 hover:shadow-lg transition" style={{ borderColor: q.cor }}>
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: q.cor }}></span>
                  {q.titulo.split('(')[0].trim()}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg">
                    <span className="text-sm text-slate-600">Score Atual:</span>
                    <span className="text-2xl font-bold" style={{ color: q.cor }}>{q.score_atual}</span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg">
                    <span className="text-sm text-slate-600">Severidade:</span>
                    <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: q.cor + '20', color: q.cor }}>
                      {q.severidade}
                    </span>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-slate-600 mb-1 font-semibold">Mínima</p>
                        <p className="font-bold text-red-600 text-lg">{q.score_minimo}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1 font-semibold">Média</p>
                        <p className="font-bold text-blue-600 text-lg">{q.score_medio}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1 font-semibold">Máxima</p>
                        <p className="font-bold text-emerald-600 text-lg">{q.score_maximo}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full transition-all" 
                        style={{ 
                          width: `${(q.score_atual / q.max_possivel) * 100}%`,
                          backgroundColor: q.cor
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-600 text-center mt-2 font-semibold">{q.percentual}% do máximo</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="border-t-2 border-slate-300 pt-8 text-center text-slate-600">
          <p className="font-semibold">📊 Relatório gerado em {new Date(relatorio.data_geracao).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-500 mt-2">© PsiDados - Sistema de Acompanhamento Psicológico</p>
        </div>
      </div>
    </div>
  );
};
