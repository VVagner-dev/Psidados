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

  // Adicionar cor aos questionários para usar na legenda
  relatorio.questionarios.forEach((q, idx) => {
    q.cor = CORES_PIE[idx % CORES_PIE.length];
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText size={24} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Relatório Semanal</h1>
              <p className="text-xs text-slate-500">Análise de bem-estar</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportarPDF}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 font-medium transition text-sm"
            >
              <FileDown size={16} />
              PDF
            </button>
            {onVoltar && (
              <button
                onClick={onVoltar}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-2 font-medium transition text-sm"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div ref={relatorioRef} className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Scores + Resumo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico Pizza */}
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 hover:shadow-lg transition">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp className="text-indigo-600" size={18} />
              </div>
              <h2 className="font-bold text-slate-900">Scores da Semana</h2>
            </div>
            <div className="w-full h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosPizza}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, max }) => `${name}: ${value}/${max}`}
                    outerRadius={100}
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
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legenda */}
            <div className="mt-4 space-y-2">
              {relatorio.questionarios.map((q, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: q.cor }}></div>
                    <span className="font-medium text-slate-800 text-sm">{q.titulo.split('(')[0].trim()}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm" style={{ color: q.cor }}>{q.score_atual}/{q.max_possivel}</p>
                    <p className="text-xs text-slate-500">{q.percentual}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo Semanal */}
          {relatorio.resumo_semanal && (
            <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 hover:shadow-lg transition">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle2 className="text-blue-600" size={18} />
                </div>
                <h2 className="font-bold text-slate-900">Resumo da Semana</h2>
              </div>
              
              <div className="space-y-4">
                {/* Resumo */}
                <div>
                  <h3 className="font-medium text-slate-700 mb-2 text-sm">Como foi sua semana?</h3>
                  <div className="bg-slate-50 p-3 rounded-lg border-l-2 border-blue-400 text-slate-700 leading-relaxed text-sm">
                    {relatorio.resumo_semanal.texto_resumo}
                  </div>
                </div>

                {/* Expectativa */}
                <div>
                  <h3 className="font-medium text-slate-700 mb-2 text-sm">Próxima semana</h3>
                  <div className="bg-slate-50 p-3 rounded-lg border-l-2 border-cyan-400 text-slate-700 leading-relaxed text-sm">
                    {relatorio.resumo_semanal.texto_expectativa}
                  </div>
                </div>

                {/* Data */}
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
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

        {/* Análise e Pontos de Atenção */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="text-amber-600" size={18} />
              </div>
              <h2 className="font-bold text-slate-900">Análise e Pontos de Atenção</h2>
            </div>
            {!analiseIA && (
              <button
                onClick={gerarAnaliseIA}
                disabled={gerando}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium transition text-sm"
              >
                {gerando && <Loader className="animate-spin" size={16} />}
                {gerando ? 'Gerando...' : 'Gerar com IA'}
              </button>
            )}
          </div>

          {analiseIA ? (
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <div className="text-slate-800 leading-relaxed space-y-3 text-sm whitespace-pre-wrap">
                {analiseIA}
              </div>
              <div className="mt-4 text-xs text-slate-600 border-t border-slate-200 pt-3">
                <p>✨ Análise gerada com IA - Consulte seu psicólogo para discussão aprofundada.</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-8 rounded-lg border border-dashed border-slate-300 text-center">
              <AlertTriangle className="mx-auto mb-3 text-slate-400" size={32} />
              <p className="text-slate-700 font-medium text-sm mb-2">
                Clique em "Gerar com IA" para análise personalizada
              </p>
              <p className="text-slate-500 text-xs">
                com insights baseados em seus questionários
              </p>
            </div>
          )}
        </div>

        {/* Detalhes dos Questionários */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 hover:shadow-lg transition">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="text-emerald-600" size={18} />
            </div>
            <h2 className="font-bold text-slate-900">Detalhes dos Questionários</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatorio.questionarios.map((q, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-4 border-l-4 hover:shadow-md transition" style={{ borderColor: q.cor }}>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: q.cor }}></span>
                  {q.titulo.split('(')[0].trim()}
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Score:</span>
                    <span className="font-bold" style={{ color: q.cor }}>{q.score_atual}/{q.max_possivel}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Severidade:</span>
                    <span className="text-xs font-medium px-2 py-1 rounded" style={{ backgroundColor: q.cor + '20', color: q.cor }}>
                      {q.severidade}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-white p-2 rounded">
                    <div>
                      <p className="text-slate-600 font-medium text-xs">Min</p>
                      <p className="font-bold text-red-600">{q.score_minimo}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium text-xs">Média</p>
                      <p className="font-bold text-blue-600">{q.score_medio}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium text-xs">Max</p>
                      <p className="font-bold text-emerald-600">{q.score_maximo}</p>
                    </div>
                  </div>

                  <div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all" 
                        style={{ 
                          width: `${(q.score_atual / q.max_possivel) * 100}%`,
                          backgroundColor: q.cor
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-600 text-center mt-1 font-medium">{q.percentual}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Individual de Cada Questionário */}
        <div className="space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="text-purple-600" size={18} />
            </div>
            Análise Individual dos Questionários
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {relatorio.questionarios.map((q, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: q.cor }}></div>
                  <h3 className="font-bold text-slate-900">{q.titulo}</h3>
                  <span className="ml-auto text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: q.cor + '20', color: q.cor }}>
                    {q.severidade}
                  </span>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg border-l-4 mb-4" style={{ borderColor: q.cor }}>
                  <p className="text-slate-800 leading-relaxed text-sm">
                    {q.analise || `Sua pontuação neste questionário foi de ${q.score_atual} de ${q.max_possivel} pontos, correspondendo a ${q.percentual}% de conclusão. Este resultado indica ${q.severidade.toLowerCase()} nesta área de avaliação.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 font-medium mb-1">Status Atual</p>
                    <p className="text-lg font-bold" style={{ color: q.cor }}>{q.score_atual}/{q.max_possivel}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium mb-1">Tendência</p>
                    <p className="text-xs text-slate-600">
                      {q.score_atual > q.score_medio ? '📈 Acima da média' : q.score_atual < q.score_medio ? '📉 Abaixo da média' : '➡️ Dentro da média'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-6 text-center text-slate-600 text-sm">
          <p className="font-medium">📊 Relatório de {new Date(relatorio.data_geracao).toLocaleDateString('pt-BR')}</p>
          <p className="text-xs text-slate-500 mt-1">© PsiDados - Sistema de Acompanhamento Psicológico</p>
        </div>
      </div>
    </div>
  );
};
