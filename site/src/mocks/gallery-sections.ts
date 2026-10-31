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
        title: 'App structure, isolated samples',
        description: 'Topbar 40px, FeatureTabs, SidebarRow, FeatureContext and Statusbar 32px',
      },
      conversation: {
        title: 'Conversation and composer',
        description: 'User/agent messages, HandoffLink, global composer and InlineNotice',
      },
      documents: {
        title: 'Documents and approval',
        description:
          'DocumentHeader, MarkdownPreview, MermaidPreview, SelectionPopover and ApprovalNotice',
      },
      terminals: {
        title: 'Terminals, following the user refinement',
        description:
          'Terminal window icon on every tab, + button, agent execution and collapsed toolbar',
      },
    },
    headerStack: 'React + TypeScript + shadcn/ui + Tailwind',
    headerRef: 'Visual anatomy reference',
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
    convLabel: 'Message & HandoffLink (no avatars or initials)',
    composerLabel: 'Composer (exact approved anatomy)',
    contextLabel: 'Context',
    hintText: 'Ctrl+Enter to send',
    interrupt: 'Interrupt',
    runningLabel: 'Running',
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
        title: 'Estrutura do app, amostras isoladas',
        description: 'Topbar 40px, FeatureTabs, SidebarRow, FeatureContext e Statusbar 32px',
      },
      conversation: {
        title: 'Conversa e compositor',
        description: 'Mensagens Usuário/Agente, HandoffLink, Compositor Global e InlineNotice',
      },
      documents: {
        title: 'Documentos e aprovação',
        description:
          'DocumentHeader, MarkdownPreview, MermaidPreview, SelectionPopover e ApprovalNotice',
      },
      terminals: {
        title: 'Terminais, seguindo o ajuste do usuário',
        description:
          'Ícone de janelinha de terminal em cada aba, botão +, execução do agente e toolbar recolhida',
      },
    },
    headerStack: 'React + TypeScript + shadcn/ui + Tailwind',
    headerRef: 'Referência de Anatomia Visual',
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
    convLabel: 'Mensagem & HandoffLink (sem avatares nem iniciais)',
    composerLabel: 'Composer (anatomia exata aprovada)',
    contextLabel: 'Contexto',
    hintText: 'Ctrl+Enter para enviar',
    interrupt: 'Interromper',
    runningLabel: 'Executando',
  },
} as const

export function gallerySectionCopy(locale: Locale) {
  return copy[locale]
}
