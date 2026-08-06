import React from 'react';
import { 
  Languages, 
  FileText, 
  FileSpreadsheet, 
  Code2, 
  Globe, 
  Search, 
  Calculator, 
  Clock, 
  Eye, 
  Sparkles, 
  ArrowRight,
  MessageSquarePlus
} from 'lucide-react';

interface ToolItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  category: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  promptExample?: string;
  actionType: 'translator' | 'prompt';
}

interface ToolsDashboardProps {
  onOpenTranslator: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

export default function ToolsDashboard({
  onOpenTranslator,
  onSelectPrompt
}: ToolsDashboardProps) {
  const tools: ToolItem[] = [
    {
      id: 'translator',
      title: 'Tradutor Universal',
      description: 'Traduza instantaneamente textos entre os 50 idiomas mais importantes do mundo usando modelos de IA avançados. Adapte o tom da tradução (formal, informal, profissional) e ouça as traduções pronunciadas nativamente.',
      badge: '50 Idiomas',
      category: 'Utilitários',
      icon: <Languages size={24} />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      actionType: 'translator'
    },
    {
      id: 'pdf-generator',
      title: 'Gerador de Documentos & Relatórios (PDF)',
      description: 'Gere relatórios executivos, TCCs, redações, manuais, cartas formais e artigos em formato PDF pronto para impressão ou compartilhamento.',
      badge: 'Exportação PDF',
      category: 'Documentos',
      icon: <FileText size={24} />,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      promptExample: 'Crie um relatório completo em PDF sobre os impactos da Inteligência Artificial no mercado de trabalho em 2026.',
      actionType: 'prompt'
    },
    {
      id: 'excel-generator',
      title: 'Planilhas & Finanças (XLSX)',
      description: 'Monte planilhas completas de Excel com fórmulas, tabelas de controle de custos, orçamentos, cronogramas e projeções financeiras.',
      badge: 'Excel XLSX',
      category: 'Produtividade',
      icon: <FileSpreadsheet size={24} />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      promptExample: 'Monte uma planilha Excel de orçamento mensal com colunas de categorias, receitas, despesas e fórmulas de saldo.',
      actionType: 'prompt'
    },
    {
      id: 'html-builder',
      title: 'Criação de Sites HTML & Landing Pages',
      description: 'Desenvolva páginas web completas e responsivas em HTML5 e Tailwind CSS com menus funcionais, animações e formulários.',
      badge: 'Web & HTML',
      category: 'Desenvolvimento',
      icon: <Code2 size={24} />,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      promptExample: 'Crie uma landing page HTML completa para uma cafeteria artesanal com menu interativo e seção de contato.',
      actionType: 'prompt'
    },
    {
      id: 'browser-agent',
      title: 'Navegador Web Real (Playwright)',
      description: 'Permita que a IA navegue autonomamente por sites reais na web, clique em botões, preencha formulários e extraia informações ao vivo.',
      badge: 'Navegação Web',
      category: 'Automação Agêntica',
      icon: <Globe size={24} />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      promptExample: 'Acesse o site da Wikipedia e busque informações atualizadas sobre a história da exploração espacial.',
      actionType: 'prompt'
    },
    {
      id: 'web-search',
      title: 'Pesquisa na Web em Tempo Real',
      description: 'Consulte a internet para obter fatos do mundo real, cotações de moedas, notícias atualizadas, artigos e dados recentes.',
      badge: 'Busca ao Vivo',
      category: 'Pesquisa',
      icon: <Search size={24} />,
      iconBg: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
      promptExample: 'Pesquise na web as notícias mais recentes sobre os lançamentos de modelos generativos de IA este mês.',
      actionType: 'prompt'
    },
    {
      id: 'calculator',
      title: 'Calculadora Matemática & Científica',
      description: 'Resolva expressões numéricas complexas, equações matemáticas, taxas de juros e cálculos científicos com precisão exata.',
      badge: 'Precisão Numérica',
      category: 'Cálculos',
      icon: <Calculator size={24} />,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      promptExample: 'Calcule os juros compostos de R$ 10.000,00 investidos durante 36 meses com taxa de 1.1% ao mês.',
      actionType: 'prompt'
    },
    {
      id: 'scheduled-tasks',
      title: 'Agendamento Autônomo de Tarefas',
      description: 'Programe lembretes e rotinas que serão executados autonomamente pela IA na data e horário especificados.',
      badge: 'Lembretes & Rotinas',
      category: 'Produtividade',
      icon: <Clock size={24} />,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      promptExample: 'Agende um lembrete diário para as 09:00 me lembrando de verificar as métricas de vendas.',
      actionType: 'prompt'
    },
    {
      id: 'vision-analysis',
      title: 'Visão Computacional & Análise de Imagens',
      description: 'Envie fotos, prints de tela, gráficos ou documentos escaneados para extração de texto, descrição de conteúdo e análise técnica.',
      badge: 'Análise de Imagens',
      category: 'Multimídia',
      icon: <Eye size={24} />,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      promptExample: 'Analise o gráfico ou documento nesta imagem que vou anexar e me dê um resumo com os principais destaques.',
      actionType: 'prompt'
    }
  ];

  const handleCardClick = (tool: ToolItem) => {
    if (tool.actionType === 'translator') {
      onOpenTranslator();
    } else if (tool.promptExample && onSelectPrompt) {
      onSelectPrompt(tool.promptExample);
    }
  };

  return (
    <div className="flex-1 bg-[#FAF9F6] p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar font-sans">
      <div className="max-w-5xl mx-auto flex flex-col gap-8 py-2">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-600">
            <Sparkles size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Catálogo de Capacidades</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Painel de Ferramentas</h1>
          <p className="text-sm text-gray-500 font-medium max-w-2xl leading-relaxed">
            Conheça os utilitários, automações agênticas e habilidades especiais da sua IA. Clique em qualquer card para experimentar diretamente.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => handleCardClick(tool)}
              className="group bg-white border border-gray-200 hover:border-blue-300 rounded-2xl p-5 flex flex-col gap-4 cursor-pointer transition-all hover:shadow-lg duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`w-11 h-11 rounded-xl ${tool.iconBg} ${tool.iconColor} flex items-center justify-center group-hover:scale-105 transition-transform shrink-0`}>
                  {tool.icon}
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                  {tool.badge}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                  <span>{tool.title}</span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0 ml-1" />
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              {tool.promptExample && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquarePlus size={12} className="text-blue-500" /> Exemplo de Prompt
                  </span>
                  <p className="text-[11px] text-gray-600 italic line-clamp-2">
                    "{tool.promptExample}"
                  </p>
                </div>
              )}

              <div className="border-t border-gray-100 pt-3 mt-auto flex items-center justify-between text-[11px] font-bold text-blue-600 group-hover:underline">
                <span>{tool.actionType === 'translator' ? 'Abrir Tradutor' : 'Testar no Chat'}</span>
                <ArrowRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
