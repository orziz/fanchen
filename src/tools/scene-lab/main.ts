import '@/styles/tools.css'
import { LOCATIONS, LOCATION_MAP, TIME_LABELS } from '@/config'
import { resolveArchetype } from '@/art/scene/archetype'
import { resolveWeather } from '@/art/scene/palette'
import { SceneRenderer } from '@/art/scene/renderer'

const WEATHERS = ['晴', '微雨', '大风', '寒霜', '雾起', '雷暴']
const params = new URLSearchParams(location.search)
const app = document.getElementById('app')!

function readState() {
  return {
    loc: params.get('loc') || 'qinghe',
    hour: Number(params.get('hour') ?? 6),
    weather: params.get('weather') || '晴',
    travel: params.get('travel') === '1',
    grid: params.get('grid') === '1',
  }
}

function mountScene(host: HTMLElement, locId: string, hour: number, weather: string, travel: boolean, animate: boolean) {
  const canvas = document.createElement('canvas')
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  host.appendChild(canvas)
  const renderer = new SceneRenderer(canvas)
  renderer.resize()
  const loc = LOCATION_MAP.get(locId)!
  renderer.setInput({
    key: locId, archetype: resolveArchetype(loc), hour, weather: resolveWeather(weather),
    travel, heroEffect: 'none', reduceMotion: !animate,
  })
  if (animate) renderer.start()
  return renderer
}

function render() {
  const state = readState()
  const options = (list: string[], current: string) => list.map(v => `<option value="${v}" ${v === current ? 'selected' : ''}>${v}</option>`).join('')
  app.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;padding:10px 16px;font:14px sans-serif;background:#1b1f23;color:#ddd">
      <select id="loc">${LOCATIONS.map(l => `<option value="${l.id}" ${l.id === state.loc ? 'selected' : ''}>${l.name}</option>`).join('')}</select>
      <select id="hour">${TIME_LABELS.map((label, i) => `<option value="${i}" ${i === state.hour ? 'selected' : ''}>${label}</option>`).join('')}</select>
      <select id="weather">${options(WEATHERS, state.weather)}</select>
      <label><input id="travel" type="checkbox" ${state.travel ? 'checked' : ''}> 赶路</label>
      <label><input id="grid" type="checkbox" ${state.grid ? 'checked' : ''}> 全部地点</label>
    </div>
    <div id="stage"></div>`
  const stage = document.getElementById('stage')!
  if (state.grid) {
    stage.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:6px;background:#111'
    for (const loc of LOCATIONS) {
      const cell = document.createElement('div')
      cell.style.cssText = 'position:relative;aspect-ratio:16/9'
      stage.appendChild(cell)
      mountScene(cell, loc.id, state.hour, state.weather, state.travel, false)
      const label = document.createElement('span')
      label.textContent = loc.name
      label.style.cssText = 'position:absolute;left:6px;top:4px;color:#fff;font:12px sans-serif;text-shadow:0 1px 2px #000'
      cell.appendChild(label)
    }
  } else {
    stage.style.cssText = 'width:1280px;height:720px;margin:0'
    mountScene(stage, state.loc, state.hour, state.weather, state.travel, true)
  }
  for (const id of ['loc', 'hour', 'weather', 'travel', 'grid']) {
    document.getElementById(id)!.addEventListener('change', (event) => {
      const el = event.target as HTMLInputElement
      params.set(id, el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value)
      location.search = params.toString()
    })
  }
}

render()
