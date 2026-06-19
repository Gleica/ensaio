/* ============================================================
   scenes.js — biblioteca de cenas prontas para ensaio
   Cada cena preenche o formulário de setup automaticamente.
   ============================================================ */

const SCENES = [
  {
    id: "aumento",
    emoji: "💰",
    title: "Pedir aumento",
    subtitle: "Gestor defensivo após 2 anos sem reajuste",
    who: "minha gestora, a Ana",
    rel: "Gestor(a) / liderança",
    traits: ["defensiva", "racional e fria"],
    goal: "Pedir um aumento de 20%. Estou há 2 anos sem reajuste, assumi novas responsabilidades e lidero 2 projetos estratégicos.",
    tone: "firme"
  },
  {
    id: "feedback",
    emoji: "😬",
    title: "Dar feedback difícil",
    subtitle: "Colega que entrega abaixo do esperado",
    who: "meu colega, o Bruno",
    rel: "Colega de trabalho",
    traits: ["defensiva", "muito emotiva"],
    goal: "Dar um feedback honesto: o Bruno entrega trabalhos com erros frequentes e isso está travando o time. Preciso ser claro sem destruir o relacionamento.",
    tone: "empático"
  },
  {
    id: "divida",
    emoji: "💸",
    title: "Cobrar dívida",
    subtitle: "Amigo que some quando o assunto é dinheiro",
    who: "meu amigo, o Carlos",
    rel: "Amigo(a)",
    traits: ["passivo-agressiva", "fria e distante"],
    goal: "Cobrar R$ 2.000 emprestados há 3 meses. O Carlos para de responder quando o assunto aparece.",
    tone: "direto"
  },
  {
    id: "contrato",
    emoji: "📋",
    title: "Encerrar parceria",
    subtitle: "Fornecedor com 3 atrasos críticos acumulados",
    who: "nosso fornecedor, o Marcos",
    rel: "Prestador / fornecedor",
    traits: ["defensiva", "explosiva"],
    goal: "Comunicar o encerramento do contrato. Três atrasos críticos nos fizeram perder um cliente importante.",
    tone: "firme"
  },
  {
    id: "prazo",
    emoji: "⏰",
    title: "Negociar prazo",
    subtitle: "Cliente exigente com entrega atrasada",
    who: "minha cliente, a Patrícia",
    rel: "Cliente",
    traits: ["racional e fria", "explosiva"],
    goal: "Pedir mais 5 dias de prazo por um problema técnico inesperado, sem perder a confiança dela.",
    tone: "diplomático"
  },
  {
    id: "demissao",
    emoji: "🤝",
    title: "Demitir alguém",
    subtitle: "Funcionário antigo com queda de performance",
    who: "meu funcionário, o João",
    rel: "Colega de trabalho",
    traits: ["muito emotiva", "manipuladora"],
    goal: "Comunicar o desligamento de um funcionário de 3 anos com queda constante de performance. Preciso ser humano e firme ao mesmo tempo.",
    tone: "empático"
  }
];
