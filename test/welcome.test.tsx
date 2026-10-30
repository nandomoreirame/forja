import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../src/renderer/src/app/App'

describe('Welcome screen', () => {
  it('shows the project entry points and disconnected workspace status', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('Open project folder')).toBeInTheDocument()
    expect(screen.getByText('Recent projects')).toBeInTheDocument()
    expect(screen.getByText('Show All Commands')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Sem projeto')
  })
  it('omits navigation arrows from the command bar', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Go back' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Go forward' })).not.toBeInTheDocument()
  })
  it('keeps all controls disabled in the static preview', () => {
    render(<App />)
    const controls = screen.getAllByRole('button')
    expect(controls.length).toBeGreaterThan(0)
    for (const control of controls) expect(control).toBeDisabled()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
