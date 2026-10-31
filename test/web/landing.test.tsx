import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Landing, followUrl } from '../../site/src/pages/landing'

it('localizes the proposition, CTA and preview labels together', () => {
  render(<Landing locale="pt-br" />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Avance com seus agentes de IA',
  )
  expect(
    screen.getAllByText(
      'Um ambiente de desenvolvimento com agentes de IA, opinativo sobre o fluxo RPI, da especificação à revisão, com você no controle de cada etapa.',
    )[0],
  ).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /Acompanhar desenvolvimento/ })[0]).toHaveAttribute(
    'href',
    followUrl,
  )
  expect(screen.getByTestId('product-preview')).toHaveTextContent('Implementador')
  expect(screen.getByTestId('product-preview')).not.toHaveTextContent('Implementer')
  expect(screen.queryByRole('link', { name: /download/i })).toBeNull()
})

it('keeps English product mocks in the English landing', () => {
  render(<Landing locale="en" />)
  expect(screen.getByTestId('product-preview')).toHaveTextContent('Implementer')
  expect(screen.getByTestId('product-preview')).not.toHaveTextContent('Implementador')
})
