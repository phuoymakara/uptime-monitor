import { readonly, ref } from 'vue'

const _isOpen = ref(true)
const _isMobileOpen = ref(false)

export function useSidebar() {
  return {
    isOpen: readonly(_isOpen),
    isMobileOpen: readonly(_isMobileOpen),
    toggle: () => { _isOpen.value = !_isOpen.value },
    openMobile: () => { _isMobileOpen.value = true },
    closeMobile: () => { _isMobileOpen.value = false },
  }
}
