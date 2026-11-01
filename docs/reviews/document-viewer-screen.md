# Revisão — document-viewer-screen

- **Rodada:** 2026-10-31
- **Achados abertos:** 2
- **Estado:** aguardando correção
- **Implementado por:** codex

> Arquivo reescrito por inteiro a cada `/rpi-review`. Um achado só desaparece
> daqui por ter deixado de existir no código: quem corrige não marca resolvido.

<!-- findings:begin -->

| Severidade | Arquivo:linha | Problema | Correção sugerida |
|------------|---------------|----------|-------------------|
| Low | src/renderer/src/shared/api/mock-source.ts:59 | readArtifact devolve o Markdown pelo tipo (spec, plan, review), não pelo artefato; todo spec mostra o conteúdo de login-oauth assim que houver mais de uma feature. | Chavear o Markdown mock por id do artefato (ou feature), com fallback por tipo. |
| Low | src/renderer/src/pages/document/document-page.tsx:16 | A feature do documento é inferida pelo prefixo do nome; sem correspondência, o popover 'Review with agent' aparece mas o clique não faz nada. | Ligar artefato à feature por featureId explícito e ocultar o popover (ou abrir o composer central) quando não houver feature. |

<!-- findings:end -->
