import type { LifeEventDef } from '@/types/life'
import { WILD_EVENTS } from '@/config/lifeEvents/wild'
import { DAILY_EVENTS } from '@/config/lifeEvents/daily'
import { ERRAND_EVENTS } from '@/config/lifeEvents/errands'
import { STORY_EVENTS } from '@/config/lifeEvents/story'

/** 凡尘一世里会遇上的全部事件；抽取条件写在各事件的 when 里，机缘与剧情类由卡片或上文引出。 */
export const LIFE_EVENTS: LifeEventDef[] = [...WILD_EVENTS, ...DAILY_EVENTS, ...ERRAND_EVENTS, ...STORY_EVENTS]

export const LIFE_EVENT_MAP = new Map(LIFE_EVENTS.map(event => [event.id, event]))
