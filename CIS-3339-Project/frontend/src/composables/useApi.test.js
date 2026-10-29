
import { describe, it, expect } from 'vitest'
import { useApi } from './useApi'

describe('useApi composable', () => {

  it('stores successful API results', async () => {
    const fakeApi = async () => ['Client A', 'Client B']

    const { data, loading, error, execute } = useApi(fakeApi)

    expect(data.value).toBe(null)
    expect(loading.value).toBe(false)

    await execute()

    expect(data.value).toEqual(['Client A', 'Client B'])
    expect(loading.value).toBe(false)
    expect(error.value).toBe(null)
  })

  it('handles API errors', async () => {
    const fakeApi = async () => {
      throw new Error('Unable to reach the server')
    }

    const { data, loading, error, execute } = useApi(fakeApi)

    await execute()

    expect(data.value).toBe(null)
    expect(error.value).toBe('Unable to reach the server')
    expect(loading.value).toBe(false)
  })

  it('allows retrying a failed request', async () => {
    let attempts = 0

    const fakeApi = async () => {
      attempts++

      if (attempts === 1) {
        throw new Error('Temporary server error')
      }

      return ['Client A']
    }

    const { data, error, execute } = useApi(fakeApi)

    await execute()
    expect(error.value).toBe('Temporary server error')

    await execute()
    expect(error.value).toBe(null)
    expect(data.value).toEqual(['Client A'])
    expect(attempts).toBe(2)
  })

  it('tracks loading while the request is pending', async () => {
    let finishRequest

    const fakeApi = () => new Promise((resolve) => {
      finishRequest = resolve
    })

    const { loading, execute } = useApi(fakeApi)

    const pendingRequest = execute()

    expect(loading.value).toBe(true)

    finishRequest(['Client A'])
    await pendingRequest

    expect(loading.value).toBe(false)
  })

})
