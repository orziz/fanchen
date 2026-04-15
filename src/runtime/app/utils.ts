(() => {
  const app = window.ShanHai;

  function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomFloat(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  function sample<T>(array: T[]) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function round(value: number, digits = 1) {
    const ratio = 10 ** digits;
    return Math.round(value * ratio) / ratio;
  }

  function formatNumber(value: number | string) {
    return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 0 });
  }

  function uid(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function buildMapTexture() {
    return {
      glows: Array.from({ length: 26 }, () => ({
        x: randomInt(0, 1120),
        y: randomInt(0, 560),
        radius: randomInt(42, 128),
      })),
      strokes: Array.from({ length: 22 }, () => ({
        x: randomInt(0, 1120),
        y: randomInt(0, 560),
        cpX: randomInt(-80, 80),
        cpY: randomInt(-54, 54),
        endX: randomInt(-150, 150),
        endY: randomInt(-60, 60),
        width: randomInt(1, 3),
      })),
    };
  }

  function deepClone<T>(value: T) {
    return JSON.parse(JSON.stringify(value));
  }

  function ensureArray<T>(value: T[] | null | undefined | unknown) {
    return Array.isArray(value) ? value : [];
  }

  app.utils = {
    ...app.utils,
    randomInt,
    randomFloat,
    sample,
    clamp,
    round,
    formatNumber,
    uid,
    buildMapTexture,
    deepClone,
    ensureArray,
  };
})();