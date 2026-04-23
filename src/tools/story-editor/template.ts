import {
  STORY_EDITOR_PRESENTATION_OPTIONS,
  STORY_EDITOR_SPEAKER_MODE_OPTIONS,
  STORY_EDITOR_TRIGGER_KIND_OPTIONS,
  STORY_EDITOR_TRIGGER_SCOPE_OPTIONS,
  renderOptionsMarkup,
} from '@/tools/story-editor/enums'

export function createStoryEditorTemplate() {
  return `
    <div class="tool-shell">
      <div class="tool-frame tool-frame--editor">
        <header class="tool-header">
          <div>
            <p class="tool-kicker">开发态配置台</p>
            <h1 class="tool-title">剧情编辑器</h1>
            <p class="tool-subtitle">把剧情卷册、节点流向与触发细则收进一页里，便于连着看结构、文案和落点。</p>
          </div>
          <div class="tool-toolbar">
            <a class="tool-button" href="/tools/index.html">返回工具台</a>
            <button class="tool-button" id="story-add" type="button">新增剧情</button>
            <button class="tool-button" id="node-add" type="button">新增节点</button>
            <button class="tool-button" id="choice-add" type="button">新增选项</button>
            <button class="tool-button" id="story-reset" type="button">撤回未保存改动</button>
            <button class="tool-button is-primary" id="story-save" type="button">保存剧情</button>
          </div>
        </header>

        <main class="tool-body tool-body--three tool-body--editor">
          <aside class="tool-panel tool-panel--scroll">
            <div class="tool-panel__title">
              <strong>剧情卷册</strong>
              <span class="tool-meta" id="story-count"></span>
            </div>
            <p class="tool-panel__copy">先在这里筛出剧情卷册，再往下挑节点细看。</p>
            <input class="tool-input" id="story-search" placeholder="按标题、id、摘要搜索剧情">
            <div class="tool-list" id="story-list"></div>

            <div class="tool-divider"></div>

            <div class="tool-panel__title">
              <strong>节点簿</strong>
              <span class="tool-meta" id="node-count"></span>
            </div>
            <p class="tool-panel__copy">节点簿优先给你看起点、跳转和说话口吻。</p>
            <input class="tool-input" id="node-search" placeholder="按节点 id、说话人、正文搜索">
            <div class="tool-list" id="node-list"></div>
          </aside>

          <section class="tool-panel tool-panel--story-graph">
            <div class="tool-panel__title">
              <strong id="graph-title">剧情流图</strong>
              <span class="tool-meta" id="graph-meta"></span>
            </div>
            <p class="tool-panel__copy">中轴只看结构关系，左边卷册与右边表单负责细项落地。</p>
            <div class="story-editor-legend">
              <span class="story-editor-legend__item"><i class="story-editor-legend__line is-next"></i> 顺接 next</span>
              <span class="story-editor-legend__item"><i class="story-editor-legend__line is-choice"></i> 选项跳转</span>
              <span class="story-editor-legend__item"><i class="story-editor-legend__chip is-start"></i> 起点</span>
              <span class="story-editor-legend__item"><i class="story-editor-legend__chip is-terminal"></i> 收束</span>
            </div>
            <div class="story-editor-graph-shell" id="story-graph-stage"></div>

            <div class="tool-divider"></div>

            <div class="tool-panel__title">
              <strong>当前预览</strong>
            </div>
            <div id="story-preview"></div>
          </section>

          <section class="tool-panel tool-panel--scroll">
            <div class="tool-panel__title">
              <strong>剧情设定</strong>
              <button class="tool-button is-danger" id="story-delete" type="button">删除剧情</button>
            </div>
            <form class="tool-form" id="story-form">
              <div class="tool-form__grid">
                <label class="tool-field"><span>剧情 id</span><input class="tool-input" name="id"></label>
                <label class="tool-field"><span>默认呈现</span><select class="tool-select" name="defaultPresentation">${renderOptionsMarkup(STORY_EDITOR_PRESENTATION_OPTIONS)}</select></label>
                <label class="tool-field tool-field--full"><span>标题</span><input class="tool-input" name="title"></label>
                <label class="tool-field tool-field--full"><span>摘要</span><textarea class="tool-textarea" name="summary"></textarea></label>
                <label class="tool-field tool-field--full"><span>起始节点</span><select class="tool-select" name="startNodeId"></select></label>
              </div>
            </form>
            <div class="story-editor-binding-grid" id="story-bindings"></div>

            <div class="tool-divider"></div>

            <div class="tool-panel__title">
              <strong>触发器</strong>
              <button class="tool-button" id="trigger-reset" type="button">清空触发器</button>
            </div>
            <form class="tool-form" id="trigger-form">
              <div class="tool-form__grid">
                <label class="tool-field"><span>触发类型</span><select class="tool-select" name="kind">${renderOptionsMarkup(STORY_EDITOR_TRIGGER_KIND_OPTIONS)}</select></label>
                <label class="tool-field"><span>作用域</span><select class="tool-select" name="scope">${renderOptionsMarkup(STORY_EDITOR_TRIGGER_SCOPE_OPTIONS)}</select></label>
                <label class="tool-field tool-field--full"><span>脚本 id</span><input class="tool-input" name="scriptId"></label>
                <label class="tool-checkbox"><input type="checkbox" name="once">仅触发一次</label>
              </div>
            </form>
            <div id="trigger-conditions"></div>
            <button class="tool-button" id="trigger-condition-add" type="button">新增触发条件</button>

            <div class="tool-divider"></div>

            <div class="tool-panel__title">
              <strong>节点详情</strong>
              <button class="tool-button is-danger" id="node-delete" type="button">删除节点</button>
            </div>
            <form class="tool-form" id="node-form">
              <div class="tool-form__grid">
                <label class="tool-field"><span>节点 id</span><input class="tool-input" name="id"></label>
                <label class="tool-field"><span>说话模式</span><select class="tool-select" name="speakerMode">${renderOptionsMarkup(STORY_EDITOR_SPEAKER_MODE_OPTIONS)}</select></label>
                <label class="tool-field tool-field--full"><span>说话人</span><input class="tool-input" name="speaker"></label>
                <label class="tool-field tool-field--full"><span>next</span><select class="tool-select" name="next"></select></label>
                <label class="tool-field tool-field--full"><span>正文</span><textarea class="tool-textarea" name="text"></textarea></label>
              </div>
            </form>
            <div id="node-effects"></div>
            <button class="tool-button" id="node-effect-add" type="button">新增节点效果</button>

            <div class="tool-divider"></div>

            <div class="tool-panel__title">
              <strong>选项簿</strong>
              <button class="tool-button is-danger" id="choice-delete" type="button">删除选项</button>
            </div>
            <div class="story-editor-choice-list" id="choice-list"></div>
            <form class="tool-form" id="choice-form">
              <div class="tool-form__grid">
                <label class="tool-field"><span>选项 id</span><input class="tool-input" name="id"></label>
                <label class="tool-field"><span>next</span><select class="tool-select" name="next"></select></label>
                <label class="tool-field tool-field--full"><span>选项文案</span><textarea class="tool-textarea" name="text"></textarea></label>
              </div>
            </form>
            <div id="choice-conditions"></div>
            <button class="tool-button" id="choice-condition-add" type="button">新增选项条件</button>
            <div id="choice-effects"></div>
            <button class="tool-button" id="choice-effect-add" type="button">新增选项效果</button>

            <div class="tool-divider"></div>

            <div class="tool-panel__title"><strong>校验结果</strong></div>
            <ul class="tool-issues" id="story-issues"></ul>
          </section>
        </main>

        <footer class="tool-footer">
          <span class="tool-status" id="story-status"></span>
          <span class="tool-meta">保存会直接回写 src/config/story.ts，当前不覆盖动态任务系统。</span>
        </footer>
      </div>
    </div>
  `
}