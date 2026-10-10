import { describe, it, expect, vi } from 'vitest'
import { fromStore } from './fromStore'

describe('fromStore', () => {
  it('should update ref when core emits new state', () => {
    const initial = { rows: [{ id: 1 }] }
    const updated = { rows: [{ id: 1 }, { id: 2 }] }

    const getSnapshot = vi.fn().mockReturnValue(initial)
    let cb: (s: any) => void = () => {}

    const subscribe = vi.fn((callback) => {
      cb = callback
      return { unsubscribe: vi.fn() }
    })

    const state = fromStore(getSnapshot, subscribe)

    expect(state.value).toEqual(initial)

    cb(updated)

    expect(state.value).toEqual(updated)
  })

  it('should register unsubscribe via onScopeDispose', () => {
    const initial = { rows: [] }
    const unsubscribe = vi.fn()

    const subscribe = vi.fn((cb: any) => ({ unsubscribe }))
    const getSnapshot = () => initial

    fromStore(getSnapshot, subscribe)

    expect(subscribe).toHaveBeenCalled()
    expect(unsubscribe).not.toHaveBeenCalled()
  })
})
