import type { Locale } from '@/shared/i18n'

const copy = {
  en: {
    sections: {
      tokens: {
        title: 'Tokens',
        description: 'Semantic color tokens, JetBrains Mono typography, spacing and radii',
      },
      primitives: {
        title: 'Primitives, shadcn/ui + Tailwind',
        description: 'Form controls, buttons in multiple states, badges and kbd shortcuts',
      },
      shell: {
        title: 'App structure',
        description: 'Topbar 40px, feature tabs, sidebar rows, feature context and statusbar 32px',
      },
      conversation: {
        title: 'Conversation and composer',
        description: 'User and agent messages, handoff link, global composer and inline notices',
      },
      documents: {
        title: 'Documents and approvals',
        description:
          'Document header, Markdown preview, Mermaid preview, selection popover and approval notice',
      },
      terminals: {
        title: 'Terminals',
        description:
          'Terminal window icon on every tab, + button, agent execution and collapsed toolbar',
      },
    },
    semanticColors: 'Semantic colors',
    typography: 'Typography (JetBrains Mono)',
    headingSample: 'Compact heading (18px / 600)',
    bodySample: 'Body (13px / 400)',
    labelSample: 'Label (12px / 500)',
    metaSample: 'Metadata (11px / 400)',
    spacing: 'Spacing scale (px)',
    radii: 'Border radius',
    radiusButtons: 'Buttons & inputs',
    radiusComposer: 'Global composer',
    radiusBadges: 'Status badges',
    radiusNote: 'Do not use brutalist zero-radius or generic pills.',
    inputStates: 'Input text (states)',
    textareaSelect: 'Textarea & select / combobox',
    openDemo: 'Open state (demonstration only)',
    checkboxSwitch: 'Checkbox & switch',
    badgesKbd: 'Badges & keyboard',
    loadingSecondary: 'Stopping...',
    loadingGhost: 'Loading',
    buttonsGroup: 'Button · variants and states',
    ghostHover: 'Hover (underline)',
  },
  'pt-br': {
    sections: {
      tokens: {
        title: 'Tokens',
        description: 'Tokens semânticos de cor, tipografia JetBrains Mono, espaçamentos e raios',
      },
      primitives: {
        title: 'Primitivas, shadcn/ui + Tailwind',
        description: 'Controles de formulário, botões em múltiplos estados, badges e atalhos kbd',
      },
      shell: {
        title: 'Estrutura do app',
        description:
          'Topbar 40px, abas de feature, linhas da sidebar, contexto da feature e statusbar 32px',
      },
      conversation: {
        title: 'Conversa e compositor',
        description:
          'Mensagens do usuário e do agente, link de handoff, compositor global e avisos inline',
      },
      documents: {
        title: 'Documentos e aprovações',
        description:
          'Cabeçalho do documento, prévia Markdown, prévia Mermaid, popover de seleção e aviso de aprovação',
      },
      terminals: {
        title: 'Terminais',
        description:
          'Ícone de janela de terminal em cada aba, botão +, execução do agente e toolbar recolhida',
      },
    },
    semanticColors: 'Cores semânticas',
    typography: 'Tipografia (JetBrains Mono)',
    headingSample: 'Heading compacto (18px / 600)',
    bodySample: 'Body (13px / 400)',
    labelSample: 'Label (12px / 500)',
    metaSample: 'Metadata (11px / 400)',
    spacing: 'Escala de espaçamento (px)',
    radii: 'Raios de borda (border radius)',
    radiusButtons: 'Botões & inputs',
    radiusComposer: 'Compositor global',
    radiusBadges: 'Badges de status',
    radiusNote: 'Nunca usar zero-radius brutalista nem pills circulares genéricas.',
    inputStates: 'Input text (estados)',
    textareaSelect: 'Textarea & select / combobox',
    openDemo: 'Estado aberto (somente demonstração)',
    checkboxSwitch: 'Checkbox & switch',
    badgesKbd: 'Badges & atalhos',
    loadingSecondary: 'Parando...',
    loadingGhost: 'Carregando',
    buttonsGroup: 'Button · variações e estados',
    ghostHover: 'Hover (sublinhado)',
  },
} as const

export function gallerySectionCopy(locale: Locale) {
  return copy[locale]
}
