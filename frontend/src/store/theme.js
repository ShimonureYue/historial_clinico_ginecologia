import { create } from 'zustand'

const useThemeStore = create((set) => ({
  dark: localStorage.getItem('expediente_dark') === 'true',

  toggle: () =>
    set((state) => {
      const next = !state.dark
      localStorage.setItem('expediente_dark', String(next))
      document.documentElement.classList.toggle('dark', next)
      return { dark: next }
    }),
}))

if (localStorage.getItem('expediente_dark') === 'true') {
  document.documentElement.classList.add('dark')
}

export default useThemeStore
