import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Styleguide } from '../../site/src/pages/styleguide'
import { MermaidPreview } from '../../src/widgets/documents/ui/mermaid-preview'

it('shows real interactive local components without starting an agent', () => {
  render(<Styleguide locale="en" />)
  fireEvent.click(screen.getByRole('switch', { name: 'Interrupt when sending a new message' }))
  expect(
    screen.getByRole('switch', { name: 'Interrupt when sending a new message' }),
  ).toHaveAttribute('aria-checked', 'false')
  expect(screen.getByRole('heading', { name: /Tokens/ })).toBeInTheDocument()
  expect(screen.getByTestId('gallery-terminal-preview')).toHaveTextContent('npm run dev')
})

it('renders the Portuguese gallery with translated labels only', () => {
  render(<Styleguide locale="pt-br" />)
  expect(screen.getByRole('heading', { name: /Tokens/ })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Salvar alterações' }).length).toBeGreaterThan(0)
  expect(screen.queryByText('Save changes')).toBeNull()
})

it('keeps a diagram with invalid source as readable text without executing it', async () => {
  render(
    <MermaidPreview
      source="flowchart LR\n  A --> <script>alert(1)</script>"
      errorLabel="Diagram could not be rendered."
    />,
  )
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Diagram could not be rendered.'),
  )
  expect(document.querySelector('script')).toBeNull()
})
