export function createMapEditorTemplate() {
  return `
  <div class="tool-shell">
    <div class="tool-frame tool-frame--editor">
      <header class="tool-header">
        <div>
          <h1 class="tool-title">地图编辑器</h1>
          <p class="tool-subtitle">滚轮可缩放，拖空白处可平移，框选模式可多选，路网模式下点目标节点可给当前多选批量连路。</p>
        </div>
        <div class="tool-toolbar">
          <a class="tool-button" href="/tools/index.html">返回工具台</a>
          <button class="tool-button" id="map-add" type="button">新增地点</button>
          <button class="tool-button" id="map-undo" type="button">撤销</button>
          <button class="tool-button" id="map-redo" type="button">重做</button>
          <button class="tool-button" id="map-select" type="button">框选模式</button>
          <button class="tool-button" id="map-road" type="button">路网模式</button>
          <button class="tool-button" id="map-zoom-out" type="button">缩小</button>
          <button class="tool-button" id="map-zoom-reset" type="button">100%</button>
          <button class="tool-button" id="map-zoom-in" type="button">放大</button>
          <button class="tool-button" id="map-reset" type="button">撤回未保存改动</button>
          <button class="tool-button is-primary" id="map-save" type="button">保存地图</button>
        </div>
      </header>
      <main class="tool-body tool-body--three tool-body--editor">
        <aside class="tool-panel tool-panel--scroll tool-panel--sidebar">
          <div class="tool-panel__title">
            <strong>地点列表</strong>
            <span class="tool-meta" id="map-count"></span>
          </div>
          <input class="tool-input" id="map-search" placeholder="按名称、id、区域搜索">
          <div class="tool-list" id="map-list"></div>
        </aside>
        <section class="tool-panel tool-panel--map">
          <div class="tool-panel__title">
            <strong>地图画布</strong>
            <div class="tool-pill-row">
              <span class="tool-pill" id="map-mode-pill"></span>
              <span class="tool-pill" id="map-selection-pill"></span>
              <span class="tool-pill" id="map-zoom-pill"></span>
            </div>
          </div>
          <div class="tool-map-shell">
            <svg class="tool-map" id="map-canvas" viewBox="0 0 1700 920" aria-label="地图编辑画布"></svg>
          </div>
          <div class="tool-meta">普通模式下拖动节点可改坐标，拖空白处可平移画布。多选后进入路网模式，再点目标节点即可批量连接或断开。</div>
        </section>
        <aside class="tool-panel tool-panel--detail tool-panel--scroll">
          <div class="tool-panel__title">
            <strong id="map-detail-title">地点详情</strong>
            <button class="tool-button is-danger" id="map-delete" type="button">删除地点</button>
          </div>
          <form class="tool-form" id="map-form">
            <div class="tool-form__grid">
              <label class="tool-field"><span>id</span><input class="tool-input" name="id"></label>
              <label class="tool-field tool-field--full"><span>名称</span><input class="tool-input" name="name"></label>
              <label class="tool-field"><span>X</span><input class="tool-input" name="x" type="number"></label>
              <label class="tool-field"><span>Y</span><input class="tool-input" name="y" type="number"></label>
              <label class="tool-field"><span>区域</span><input class="tool-input" name="region"></label>
              <label class="tool-field"><span>地形</span><input class="tool-input" name="terrain"></label>
              <label class="tool-field"><span>危险</span><input class="tool-input" name="danger" type="number"></label>
              <label class="tool-field"><span>灵气</span><input class="tool-input" name="aura" type="number"></label>
              <label class="tool-field"><span>偏向</span><input class="tool-input" name="marketBias"></label>
              <label class="tool-field"><span>市阶</span><input class="tool-input" name="marketTier" type="number"></label>
              <label class="tool-field"><span>资源</span><input class="tool-input" name="resource"></label>
              <label class="tool-field tool-field--full"><span>所属秘境 id</span><input class="tool-input" name="realmId"></label>
              <div class="tool-field tool-field--full"><span>行动列表</span><div id="map-actions-editor"></div></div>
              <div class="tool-field tool-field--full"><span>标签</span><div id="map-tags-editor"></div></div>
              <div class="tool-field tool-field--full"><span>势力 id</span><div id="map-factions-editor"></div></div>
              <label class="tool-field tool-field--full"><span>描述</span><textarea class="tool-textarea" name="desc"></textarea></label>
            </div>
          </form>
          <div class="tool-divider"></div>
          <div class="tool-panel__title"><strong>当前邻接</strong></div>
          <div class="tool-pill-row" id="map-neighbors"></div>
          <div class="tool-divider"></div>
          <div class="tool-panel__title"><strong>校验结果</strong></div>
          <ul class="tool-issues" id="map-issues"></ul>
        </aside>
      </main>
      <footer class="tool-footer">
        <span class="tool-status" id="map-status"></span>
        <span class="tool-meta">当前只在开发态生效。请用 npm run dev:tools 或 npm run dev 后打开 /tools/map-editor.html。</span>
      </footer>
    </div>
  </div>
`
}