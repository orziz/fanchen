import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import { useGameStore } from '@/stores/game'
import '@/styles/index.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')

if (import.meta.env.DEV) {
  ;(window as unknown as { __fanchen: unknown }).__fanchen = { store: useGameStore(pinia) }
}
