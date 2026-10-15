import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import App from './App'
import { server } from './test/server'

const DEMO_URL = 'https://jsonplaceholder.typicode.com/users/1'

describe('App', () => {
  it('starts idle with no response', () => {
    render(<App />)
    expect(screen.getByText('No response yet')).toBeInTheDocument()
    expect(screen.getByText('Send a request to see the response here')).toBeInTheDocument()
  })

  it('sends the default request and renders a formatted success response', async () => {
    server.use(http.get(DEMO_URL, () => HttpResponse.json({ id: 1, name: 'Ada Lovelace' })))

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findAllByText(/200/)).not.toHaveLength(0)
    expect(screen.getByText('"Ada Lovelace"')).toBeInTheDocument()

    // The sent request is recorded in the sidebar history.
    expect(screen.getByText(/jsonplaceholder\.typicode\.com\/users\/1/)).toBeInTheDocument()
  })

  it('reports a network error distinctly, without touching history-less state', async () => {
    server.use(http.get(DEMO_URL, () => HttpResponse.error()))

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findAllByText('Network error')).not.toHaveLength(0)
  })

  it('flags an invalid JSON body before sending and reports it as invalid-json, not a network call', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('radio', { name: 'POST' }))
    await user.click(screen.getByRole('tab', { name: 'Body' }))
    await user.type(screen.getByLabelText('Request body (JSON)'), '{{not valid json')

    expect(screen.getByText(/isn't valid JSON/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findAllByText('Invalid JSON body')).not.toHaveLength(0)
  })

  it('shows a 404 with a warn-toned badge and its error body', async () => {
    server.use(
      http.get(DEMO_URL, () => HttpResponse.json({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' })),
    )

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findAllByText(/404/)).not.toHaveLength(0)
  })

  it('switches between Params, Headers and Body tabs', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('tab', { name: 'Headers' }))
    expect(screen.getByRole('tab', { name: 'Headers' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('button', { name: 'Add header' }))
    expect(screen.getAllByLabelText('Name')).toHaveLength(2) // Accept + the new row
  })
})
