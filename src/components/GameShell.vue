<template>
  <div class="backdrop"></div>
  <div class="app-shell">
    <GameHero />

    <main class="desktop-layout">
      <aside class="sidebar-stack">
        <PlayerPanel />
        <DockPanel />
      </aside>

      <section class="card workbench">
        <GameWorkbench />
      </section>
    </main>

    <GameWindows />
  </div>
</template>

<script setup lang="ts">
import GameHero from './GameHero.vue'
import GameWorkbench from './GameWorkbench.vue'
import GameWindows from './GameWindows.vue'
import PlayerPanel from './PlayerPanel.vue'
import DockPanel from './DockPanel.vue'
</script>
