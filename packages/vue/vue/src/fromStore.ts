import { shallowRef, onScopeDispose } from 'vue'
import type { Subscription } from '@adapttable/core'

export function fromStore<T>(
  getSnapshot: () => T,
  subscribe: (cb: (state: T) => void) => Subscription
) {
  const state = shallowRef(getSnapshot())
  let subscription: Subscription | null = null

  subscription = subscribe((newState) => {
    state.value = newState
  })

  onScopeDispose(() => {
    if (subscription) {
      subscription.unsubscribe()
    }
  })

  return state
}
