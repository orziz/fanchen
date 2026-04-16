<template>
  <div :class="['ui-metric-grid', `ui-metric-grid--${variant}`, className]">
    <component
      :is="itemTag"
      v-for="(item, index) in items"
      :key="item.key ?? `${item.label}-${index}`"
      :class="['ui-metric-grid__item', item.boxClass]"
    >
      <span :class="['ui-metric-grid__label', item.labelClass]">{{ item.label }}</span>
      <strong :class="['ui-metric-grid__value', item.valueClass]">{{ item.value }}</strong>
    </component>
  </div>
</template>

<script setup lang="ts">
type MetricVariant = 'summary' | 'stat' | 'badge'
type ClassName = string | string[] | Record<string, boolean>

interface MetricItem {
  key?: string | number
  label: string
  value: string | number
  boxClass?: ClassName
  labelClass?: ClassName
  valueClass?: ClassName
}

withDefaults(defineProps<{
  items: MetricItem[]
  variant?: MetricVariant
  itemTag?: string
  className?: ClassName
}>(), {
  variant: 'summary',
  itemTag: 'div',
})
</script>