(() => {
  const app = window.ShanHai;
  const { runtime } = app;

  function getGame() {
    return runtime.game;
  }

  function setGame(nextGame) {
    runtime.game = nextGame;
    return runtime.game;
  }

  Object.assign(app, {
    getGame,
    setGame,
  });
})();