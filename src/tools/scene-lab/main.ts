import '@/styles/tools.css'
import { LOCATIONS, LOCATION_MAP, TIME_LABELS } from '@/config'
import { resolveArchetype } from '@/art/scene/archetype'
import { resolveWeather } from '@/art/scene/palette'
import { SceneRenderer } from '@/art/scene/renderer'
import { HERO_POSES } from '@/art/figures/hero'
import { ENEMY_FIGURES } from '@/art/figures/enemies'

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
    figures: params.get('figures') === '1',
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
  if (state.figures) {
    renderFigures(stage)
    return
  }
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

const FIG_COLORS: Record<string, string> = {
  robe: '#d6cfbf', shade: '#9d9687', hair: '#121417', sash: '#28403a', blade: '#cfd8dc', skin: '#c9b69c',
  body: '#111416', eye: '#f0c070',
}

function figureSvg(viewBox: [number, number], parts: { d: string; cls: string; frame?: string }[], height: number) {
  const paths = parts.filter(p => p.frame !== 'b').map(p => {
    const stroke = p.cls === 'line' ? 'fill="none" stroke="rgba(30,32,34,0.6)" stroke-width="0.7"' : p.cls === 'accent' ? 'fill="none" stroke="#a8473b" stroke-width="0.9"' : `fill="${FIG_COLORS[p.cls] || '#333'}"`
    return `<path d="${p.d}" ${stroke} />`
  }).join('')
  return `<svg viewBox="0 0 ${viewBox[0]} ${viewBox[1]}" height="${height}" style="overflow:visible">${paths}</svg>`
}

/** 立绘陈列：逐一检看主角各姿态与敌方剪影。 */
function renderFigures(stage: HTMLElement) {
  stage.style.cssText = 'display:flex;flex-wrap:wrap;gap:28px;align-items:flex-end;padding:30px;background:linear-gradient(#8a9499,#c9c6bb)'
  for (const [name, pose] of Object.entries(HERO_POSES)) {
    stage.insertAdjacentHTML('beforeend', `<figure style="margin:0;text-align:center;font:12px sans-serif">${figureSvg(pose.viewBox, pose.parts, 220 * pose.scale)}<figcaption>${name}</figcaption></figure>`)
  }
  for (const [name, fig] of Object.entries(ENEMY_FIGURES)) {
    stage.insertAdjacentHTML('beforeend', `<figure style="margin:0;text-align:center;font:12px sans-serif">${figureSvg(fig.viewBox, fig.parts, 220 * fig.scale)}<figcaption>${name}</figcaption></figure>`)
  }
}

render()
