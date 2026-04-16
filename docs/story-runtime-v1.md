# 剧情系统 V1

## 目标

- 在现有 GameState、EventBus 和 Pinia 壳层上补一层真正可运行的剧情内核。
- 先把剧情逻辑收进统一状态和统一执行器，不让弹窗、Pin Rail、NPC 面板各写一套分支逻辑。
- 第一版优先解决三件事：可分支对话、可持久化剧情进度、可复用展示入口。

## 当前落地范围

- 统一剧情状态：GameState.story
- 统一剧情配置：src/config/story.ts
- 统一剧情执行器：src/systems/story.ts
- 主展示入口：GameShell 上的剧情弹窗
- 第二展示入口：Pin Rail 上的剧情侧栏卡片
- 第一批触发点：NpcPanel -> visitNpc -> tryStartNpcVisitStory

## 状态模型

GameState.story 当前包含：

- activeStoryId：当前正在运行的剧情 ID
- activeNodeId：当前节点 ID
- activeProgressKey：当前进度键，支持全局剧情和按 NPC 分段剧情
- presentation：展示方式，当前支持 overlay、rail、embedded
- bindings：当前剧情绑定的数据，第一版已接 npcId、locationId
- progress：剧情进度表，记录状态、已看节点、触发次数、最后节点
- flags：剧情 flag 表，用于前置条件和分支衔接
- history：剧情历史，用于纪事、回看和后续 Pin Rail / Journal 扩展

## 配置方式

剧情定义放在 src/config/story.ts，采用“声明式节点 + 少量脚本钩子”的混合模式。

第一版已支持：

- trigger：npc-visit、manual
- scope：global、npc
- condition：money-at-least、affinity-at-least、trust-at-least、flag、script
- effect：add-relation、add-money、add-item、append-log、set-flag、run-script、set-presentation

这样做的原因：

- 绝大多数剧情可以直接写在配置里，便于持续补内容。
- 少量和数值、角色性格强相关的逻辑，走 scriptId 钩子，避免把配置写成脚本语言。

## 运行流程

1. 入口触发剧情，例如 visitNpc。
2. systems/story.ts 选出当前可启动的剧情定义。
3. startStory 写入 activeStoryId、activeNodeId、bindings、progress。
4. 进入节点时记录 history，并执行节点级 effects。
5. 玩家点击选项时执行 choice effects，再切到下一节点或结束剧情。
6. UI 只负责读取当前 scene 和展示，不直接写剧情规则。

## 第一版内容样例

- npc-first-impression：按 NPC 维度触发的首次搭话
- local-undercurrent：由风闻 flag 拉起的主线火种

这两条样例分别覆盖了：

- NPC 对话
- 分支选择
- flag 串联
- 全局主线火种
- 日志写入
- Pin Rail / 弹窗双入口展示

## 扩展约束

后续如果继续加剧情，优先按下面顺序扩，不要绕过统一内核：

1. 先在 src/config/story.ts 增剧情定义
2. 不够表达时，再往 src/systems/story.ts 增条件或 effect
3. 再接新的触发器，例如 world action、地图事件、支线任务链
4. 最后再补新的展示适配层，例如地图内嵌、Journal 回看、独立剧情页

## 下一步建议

- 增 action / world trigger，把随机事件和支线任务链接到同一套内核上。
- 给 Journal 增剧情历史视图，让 story.history 正式成为纪事入口。
- 给 MapPanel 或 LocationDetail 增内嵌触发区，把地图入口接到同一剧情状态上。
- 把 story script registry 再细分，逐步沉淀可复用的剧情效果函数。