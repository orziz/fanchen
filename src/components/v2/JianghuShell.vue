<template>
  <div class="jianghu-shell">
    <header class="jianghu-topbar">
      <div class="jianghu-topbar-main">
        <div class="jianghu-brand-block">
          <div class="jianghu-brand-mark">
            <h1>凡尘立道录</h1>
            <span class="jianghu-brand-seal" />
          </div>
          <div class="jianghu-time-weather">
            <span>{{ dateLabel }}</span>
            <span class="divider">|</span>
            <span>{{ timeLabel }}</span>
            <span class="weather-pill">{{ world.weather }}</span>
          </div>
        </div>

        <div class="jianghu-resource-strip">
          <article v-for="resource in resources" :key="resource.label" class="resource-chip">
            <span>{{ resource.label }}</span>
            <strong>{{ resource.value }}</strong>
          </article>
        </div>
      </div>

      <nav class="jianghu-nav-strip" aria-label="主导航">
        <button
          v-for="tab in STAGE_TABS"
          :key="tab.id"
          class="jianghu-nav-button"
          :class="{ 'is-active': activeTab === tab.id }"
          type="button"
          :title="tab.label"
          @click="setTab(tab.id)"
        >
          <span class="jianghu-nav-button__dot" />
          <span class="jianghu-nav-button__label">{{ tab.shortLabel }}</span>
        </button>
      </nav>
    </header>

    <main class="jianghu-stage-shell">
      <section class="jianghu-stage-frame">
        <div class="jianghu-stage-main jianghu-stage-main--full">
          <div class="jianghu-stage-heading">
            <div class="heading-copy">
              <p class="heading-kicker">{{ activeMeta.kicker }}</p>
              <h2>{{ activeMeta.title }}</h2>
              <p v-if="activeMeta.desc">{{ activeMeta.desc }}</p>
            </div>

            <div class="heading-chips">
              <span v-for="chip in headingChips" :key="chip" class="heading-chip">{{ chip }}</span>
            </div>
          </div>

          <div class="jianghu-stage-canvas" :class="{ 'is-sheet-mode': showStageSheet }">
            <div class="stage-paper" />
            <div class="stage-ink stage-ink--top" />
            <div class="stage-ink stage-ink--bottom" />

            <template v-if="showStageSheet">
              <div class="jianghu-stage-sheet">
                <component :is="activePanelComponent" class="jianghu-panel-host" />
              </div>
            </template>

            <template v-else>
              <section class="jianghu-profile-sheet">
                <div class="sheet-brush-title">
                  <span>人物信息</span>
                </div>

                <div class="jianghu-profile-head">
                  <div class="profile-emblem">
                    <span>{{ player.name.charAt(0) || '侠' }}</span>
                  </div>
                  <div>
                    <h3>{{ player.name }}</h3>
                    <p>{{ rankData.name }} · {{ currentAffiliation?.name || '尚未投势' }}</p>
                  </div>
                </div>

                <div class="jianghu-profile-bars">
                  <div class="profile-bar-row">
                    <span>气血</span>
                    <div class="profile-bar-track"><div class="profile-bar-fill is-hp" :style="{ width: `${hpPercent}%` }" /></div>
                    <strong>{{ player.hp }}/{{ player.maxHp }}</strong>
                  </div>
                  <div class="profile-bar-row">
                    <span>真气</span>
                    <div class="profile-bar-track"><div class="profile-bar-fill is-qi" :style="{ width: `${qiPercent}%` }" /></div>
                    <strong>{{ player.qi }}/{{ player.maxQi }}</strong>
                  </div>
                  <div class="profile-bar-row">
                    <span>修为</span>
                    <div class="profile-bar-track"><div class="profile-bar-fill is-exp" :style="{ width: `${expPercent}%` }" /></div>
                    <strong>{{ player.cultivation }}/{{ nextBreakthroughNeed }}</strong>
                  </div>
                </div>
              </section>

              <section class="jianghu-hero-stage">
                <div class="hero-backdrop" />
                <div class="hero-mist" />
                <div class="hero-placeholder hero-placeholder--crest" aria-hidden="true" />
                <div class="hero-placeholder hero-placeholder--companion" aria-hidden="true" />
                <div class="hero-figure" />

                <div class="hero-calligraphy">
                  <h2>{{ player.name }}</h2>
                  <p v-if="activeMeta.motto">{{ activeMeta.motto }}</p>
                </div>
              </section>

              <aside class="jianghu-side-sheet">
                <div class="sheet-brush-title">
                  <span>武学配置</span>
                </div>

                <div class="skill-stack">
                  <article v-for="skill in displayedSkills" :key="`${skill.name}-${skill.stage}`" class="skill-card">
                    <div class="skill-card__icon">{{ skill.icon }}</div>
                    <div class="skill-card__copy">
                      <div class="skill-card__title-row">
                        <strong>{{ skill.name }}</strong>
                        <span class="skill-card__tag">{{ skill.kindLabel }}</span>
                      </div>
                      <span>{{ skill.stage }}</span>
                    </div>
                  </article>
                </div>

                <div class="sheet-brush-title is-subtle">
                  <span>当前状态</span>
                </div>

                <div class="memo-stack">
                  <article v-for="note in sideNotes" :key="note.label" class="memo-card">
                    <span>{{ note.label }}</span>
                    <strong>{{ note.value }}</strong>
                    <p>{{ note.desc }}</p>
                  </article>
                </div>
              </aside>
            </template>
          </div>

          <footer class="jianghu-stage-footer">
            <section class="jianghu-rumor-sheet">
              <div class="sheet-brush-title">
                <span>近期纪事</span>
              </div>

              <ul v-if="recentLogs.length" class="rumor-list">
                <li v-for="entry in recentLogs" :key="`${entry.stamp}-${entry.text}`" class="rumor-item">
                  <span class="rumor-item__type">{{ getLogTypeLabel(entry.type) }}</span>
                  <p>{{ entry.text }}</p>
                </li>
              </ul>
              <p v-else class="rumor-empty">天地暂时平静，无新异闻传来。</p>
            </section>

            <section class="jianghu-world-strip" aria-label="世界摘要">
              <article v-for="card in worldDigestCards" :key="card.label" class="world-digest-card">
                <span>{{ card.label }}</span>
                <strong>{{ card.value }}</strong>
                <p>{{ card.desc }}</p>
              </article>
            </section>
          </footer>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATIONS, REALM_TEMPLATES, TECHNIQUE_MAP, TIME_LABELS } from '@/config'
import { STAGE_TABS, useStage, type StageTab } from '@/composables/useStage'
import { formatNumber } from '@/utils'
import MapPanel from '@/components/panels/MapPanel.vue'
import StoryTaskPanel from '@/components/panels/StoryTaskPanel.vue'
import InventoryPanel from '@/components/panels/InventoryPanel.vue'
import IndustryPanel from '@/components/panels/IndustryPanel.vue'
import MarketPanel from '@/components/panels/MarketPanel.vue'
import AuctionPanel from '@/components/panels/AuctionPanel.vue'
import CombatPanel from '@/components/panels/CombatPanel.vue'
import NpcPanel from '@/components/panels/NpcPanel.vue'
import SectPanel from '@/components/panels/SectPanel.vue'
import WorldPanel from '@/components/panels/WorldPanel.vue'

interface StageMeta {
  kicker: string
  title: string
  desc: string
  motto: string
}

const STAGE_META: Record<StageTab, StageMeta> = {
  story: { kicker: '剧情', title: '剧情与委托', desc: '', motto: '' },
  inventory: { kicker: '行囊', title: '行囊与功法', desc: '', motto: '' },
  industry: { kicker: '产业', title: '产业经营', desc: '', motto: '' },
  market: { kicker: '商路', title: '商店与行商', desc: '', motto: '' },
  auction: { kicker: '拍市', title: '拍卖行', desc: '', motto: '' },
  map: { kicker: '山河', title: '山河图', desc: '', motto: '' },
  combat: { kicker: '战斗', title: '战斗与秘境', desc: '', motto: '' },
  npcs: { kicker: '群像', title: '江湖群像', desc: '', motto: '' },
  sect: { kicker: '势力', title: '势力与宗门', desc: '', motto: '' },
  world: { kicker: '天机', title: '天机簿', desc: '', motto: '' },
}

const PANEL_COMPONENTS: Record<StageTab, Component> = {
  story: StoryTaskPanel,
  inventory: InventoryPanel,
  industry: IndustryPanel,
  market: MarketPanel,
  auction: AuctionPanel,
  map: MapPanel,
  combat: CombatPanel,
  npcs: NpcPanel,
  sect: SectPanel,
  world: WorldPanel,
}

const store = useGameStore()
const { player, world, log, rankData, nextBreakthroughNeed, currentAffiliation } = storeToRefs(store)
const { activeTab, setTab } = useStage()

const activeMeta = computed(() => STAGE_META[activeTab.value])
const activePanelComponent = computed(() => PANEL_COMPONENTS[activeTab.value])
const showStageSheet = computed(() => activeTab.value !== 'inventory')
const currentLocation = computed(() => LOCATIONS.find(location => location.id === player.value.locationId) ?? LOCATIONS[0])
const activeRealm = computed(() => {
  const realmId = world.value.realm.activeRealmId
  return realmId ? REALM_TEMPLATES.find(realm => realm.id === realmId) || null : null
})

const dateLabel = computed(() => {
  const day = world.value.day
  const month = Math.ceil(day / 30)
  const date = ((day - 1) % 30) + 1
  const labels = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七', '二十八', '二十九', '三十']
  return `${month}月初${labels[date - 1] || date}`
})

const timeLabel = computed(() => TIME_LABELS[world.value.hour] || '子时')

const hpPercent = computed(() => {
  if (!player.value.maxHp) return 0
  return Math.min(100, Math.round((player.value.hp / player.value.maxHp) * 100))
})

const qiPercent = computed(() => {
  if (!player.value.maxQi) return 0
  return Math.min(100, Math.round((player.value.qi / player.value.maxQi) * 100))
})

const expPercent = computed(() => {
  const need = nextBreakthroughNeed.value
  if (!need) return 0
  return Math.min(100, Math.round((player.value.cultivation / need) * 100))
})

const resources = computed(() => [
  { label: '修为', value: formatNumber(player.value.cultivation) },
  { label: '真气', value: formatNumber(player.value.qi) },
  { label: '灵石', value: formatNumber(player.value.money) },
  { label: '声望', value: formatNumber(player.value.reputation) },
])

const headingChips = computed(() => [
  `第${world.value.day}日 ${timeLabel.value}`,
  `所在 ${currentLocation.value.name}`,
  `境界 ${rankData.value.name}`,
  `灵气 ${currentLocation.value.aura}`,
  `险度 ${currentLocation.value.danger}`,
])


const displayedSkills = computed(() => {
  const learned = Object.entries(player.value.learnedTechniques)
    .map(([, state]) => {
      const technique = TECHNIQUE_MAP.get(state.skillId)
      const kindMap: Record<string, string> = { heart: '内功', spell: '术法' }
      const kind = kindMap[technique?.kind || ''] || '武学'
      return {
        name: technique?.name || state.skillId,
        kindLabel: kind,
        stage: `第${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][state.stage - 1] || state.stage}重`,
        icon: (technique?.name || '武').charAt(0),
      }
    })
    .slice(0, 4)

  if (learned.length >= 4) return learned

  return [
    ...learned,
    { name: '清风剑法', kindLabel: '剑法', stage: '第八重', icon: '风' },
    { name: '太虚步法', kindLabel: '身法', stage: '第六重', icon: '步' },
    { name: '紫霞神功', kindLabel: '内功', stage: '第七重', icon: '霞' },
    { name: '天罡剑诀', kindLabel: '绝学', stage: '第一重', icon: '罡' },
  ].slice(0, 4)
})

const sideNotes = computed(() => [
  { label: '当前地点', value: currentLocation.value.name, desc: `灵气 ${currentLocation.value.aura}，险度 ${currentLocation.value.danger}。` },
  { label: '异象征兆', value: world.value.omen, desc: '先看天机，再定今日要压哪条路。' },
  { label: '当前声望', value: formatNumber(player.value.reputation), desc: '声望越高，能接的线和能开的门路越深。' },
])

const recentLogs = computed(() => log.value.slice(0, 4).map(entry => ({ ...entry, type: entry.type || 'rumor' })))

const worldDigestCards = computed(() => {
  const realmLocation = activeRealm.value ? LOCATIONS.find(location => location.id === activeRealm.value?.locationId) : null
  const highestAura = LOCATIONS.reduce((best, location) => (location.aura > best.aura ? location : best), LOCATIONS[0])

  return [
    {
      label: '当前地点',
      value: currentLocation.value.name,
      desc: `灵气 ${currentLocation.value.aura}，险度 ${currentLocation.value.danger}，当前行动会从这里继续推进。`,
    },
    {
      label: '异象征兆',
      value: world.value.omen,
      desc: `今日 ${world.value.weather}。若要改路，先去天机簿看总览，再决定下一跳。`,
    },
    {
      label: '最高灵气',
      value: highestAura.name,
      desc: `当前可见地界里灵气最高为 ${highestAura.aura}，适合作为后续修炼与探路参考。`,
    },
    {
      label: '秘境动向',
      value: activeRealm.value ? activeRealm.value.name : '暂无显世',
      desc: activeRealm.value
        ? `现身于 ${realmLocation?.name || activeRealm.value.locationId}，可从地图或天机簿切入。`
        : '眼下未见新的秘境显世，可先稳住营生、修炼与风闻。',
    },
  ]
})

function getLogTypeLabel(type?: string) {
  if (type === 'system') return '系统'
  if (type === 'warn') return '险讯'
  if (type === 'loot') return '收获'
  if (type === 'action') return '动作'
  return '纪事'
}
</script>
