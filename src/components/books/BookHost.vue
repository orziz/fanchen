<template>
  <Transition name="book">
    <div v-if="activeBook" class="book-host" @pointerdown.self="closeBook">
      <component :is="component" :key="activeBook" />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useBooks, type BookId } from '@/composables/useBooks'
import CharacterBook from '@/components/books/CharacterBook.vue'
import BagBook from '@/components/books/BagBook.vue'
import MapBook from '@/components/books/MapBook.vue'
import MarketBook from '@/components/books/MarketBook.vue'
import IndustryBook from '@/components/books/IndustryBook.vue'
import FactionBook from '@/components/books/FactionBook.vue'
import PeopleBook from '@/components/books/PeopleBook.vue'
import ChronicleBook from '@/components/books/ChronicleBook.vue'

const BOOK_COMPONENTS: Record<BookId, Component> = {
  character: CharacterBook,
  bag: BagBook,
  map: MapBook,
  market: MarketBook,
  industry: IndustryBook,
  faction: FactionBook,
  people: PeopleBook,
  chronicle: ChronicleBook,
}

const { activeBook, closeBook } = useBooks()
const component = computed(() => (activeBook.value ? BOOK_COMPONENTS[activeBook.value] : null))
</script>
