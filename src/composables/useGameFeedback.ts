import { onBeforeUnmount, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { LOCATION_MAP, RANKS } from '@/config'
import { bus } from '@/core/events'
import { useFx } from '@/composables/useFx'
import { sfx } from '@/audio/sfx'
import { lifespanOf } from '@/systems/life/cultivation'
import { currentGoal } from '@/systems/life/goals'

/**
 * 把规则层的变化翻成可感的反馈：数值飘字、破境横幅、战斗打击感、抵达与入门的提示音。
 * 只读状态与事件，不改动任何游戏数据。
 */
export function useGameFeedback() {
  const store = useGameStore()
  const { float, banner, shake, flash, heroMotion, enemyMotion } = useFx()
  const offs: Array<() => void> = []
  let quietUntil = 0
  const quiet = () => { quietUntil = performance.now() + 800 }
  offs.push(bus.on('game:loaded', quiet), bus.on('game:reset', quiet), bus.on('game:initialized', quiet))

  watch(
    () => {
      const p = store.player
      return [p.cultivation, p.money, p.reputation, p.hp] as const
    },
    (next, prev) => {
      if (!prev || store.combat.currentEnemy || performance.now() < quietUntil) return
      const [cult, money, rep, hp] = next
      const [pCult, pMoney, pRep, pHp] = prev
      let shown = 0
      const push = (text: string, tone: Parameters<typeof float>[1], icon?: string) => {
        if (shown >= 3) return
        shown += 1
        float(text, tone, 'hero', icon)
      }
      if (cult > pCult) { push(`修为 +${cult - pCult}`, 'gold', 'cultivation'); sfx.gain() }
      if (money > pMoney) { push(`灵石 +${money - pMoney}`, 'gain', 'stone'); sfx.coin() }
      if (rep > pRep) push(`声望 +${rep - pRep}`, 'gain', 'fame')
      if (hp < pHp - 2) push(`气血 -${pHp - hp}`, 'loss', 'hp')
    },
  )

  offs.push(bus.on('player:breakthrough', ({ success, rankIndex }: { success: boolean; rankIndex: number }) => {
    if (success) {
      banner('breakthrough', `踏入${RANKS[rankIndex]?.name || ''}境`, `寿元增至${lifespanOf(store.player)}岁`, 3600)
      flash('rgba(255, 238, 196, 0.85)')
      heroMotion('surge', 1600)
      sfx.breakthrough()
    } else {
      banner('breakthrough-fail', '冲关没成', '受了内伤，修为折了三成', 2600)
      shake(1.4)
      sfx.breakthroughFail()
    }
  }))

  offs.push(bus.on('combat:start', ({ enemy }: { enemy: { name: string; boss: boolean } }) => {
    banner('faction', enemy.boss ? `${enemy.name}现身` : `遭遇 ${enemy.name}`, enemy.boss ? '进来了就没有退路' : '', 1800)
    sfx.swing()
  }))
  offs.push(bus.on('combat:enemy-hit', ({ damage }: { damage: number }) => {
    heroMotion('attack', 360)
    window.setTimeout(() => {
      enemyMotion('hit', 320)
      float(`-${damage}`, damage >= 30 ? 'crit' : 'loss', 'enemy')
      sfx.hit(damage >= 30)
    }, 140)
  }))
  offs.push(bus.on('combat:enemy-dodge', () => {
    heroMotion('attack', 360)
    window.setTimeout(() => float('闪避', 'info', 'enemy'), 140)
    sfx.swing()
  }))
  offs.push(bus.on('combat:spell', ({ name }: { name: string }) => {
    float(name, 'qi', 'hero')
    flash('rgba(170, 220, 205, 0.35)')
    sfx.spell()
  }))
  offs.push(bus.on('combat:player-hit', ({ damage, guarded }: { damage: number; guarded: boolean }) => {
    window.setTimeout(() => {
      enemyMotion('attack', 360)
      window.setTimeout(() => {
        heroMotion('hit', 320)
        float(`-${damage}${guarded ? ' 格挡' : ''}`, 'loss', 'hero')
        shake(guarded ? 0.5 : 1)
        sfx.hurt()
      }, 150)
    }, 520)
  }))
  offs.push(bus.on('combat:victory', ({ name, boss, money }: { name: string; boss: boolean; money: number }) => {
    enemyMotion('defeated', 900)
    window.setTimeout(() => {
      banner('victory', boss ? `打倒${name}` : '得胜', `灵石 +${money}`, 2200)
      sfx.victory()
    }, 450)
  }))
  offs.push(bus.on('combat:defeat', ({ name }: { name: string }) => {
    banner('defeat', '输了', `被${name}打倒在地`, 2400)
    shake(1.6)
    sfx.defeat()
  }))
  offs.push(bus.on('combat:flee', () => {
    float('脱身', 'info', 'hero')
    sfx.swing()
  }))
  offs.push(bus.on('travel:arrived', ({ locationId }: { locationId: string }) => {
    const location = LOCATION_MAP.get(locationId)
    if (!location) return
    banner('arrival', location.name, `${location.region} · ${location.terrain}`, 2400)
    sfx.chime()
  }))
  offs.push(bus.on('faction:joined', ({ name, title }: { name: string; title: string }) => {
    banner('faction', `入${name}`, `身份：${title}`, 2600)
    sfx.chime()
  }))
  offs.push(bus.on('goal:completed', ({ title }: { title: string }) => {
    const next = currentGoal()
    banner('unlock', `志向 · ${title}`, next ? `下一步：${next.title}` : '', 2600)
    sfx.chime()
  }))
  offs.push(bus.on('life:ended', () => {
    banner('defeat', '一世已尽', '', 3000)
    sfx.defeat()
  }))
  offs.push(bus.on('state:inventory-changed', ({ quantity }: { quantity: number }) => {
    if (quantity > 0) sfx.loot()
  }))

  onBeforeUnmount(() => offs.forEach(off => off()))
}
