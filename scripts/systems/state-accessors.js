(() => {
  const app = window.ShanHai;
  const { tables, state } = app;
  const {
    LOCATION_MAP,
    ITEM_MAP,
    RANKS,
    FACTIONS,
    PROPERTY_DEFS,
    CROPS,
    CRAFT_RECIPES,
    REALM_TEMPLATES,
    MONSTER_TEMPLATES,
  } = tables;

  function getRankData(rankIndex) {
    return RANKS[Math.min(rankIndex, RANKS.length - 1)];
  }

  function getCurrentLocation() {
    return LOCATION_MAP[app.getGame().player.locationId];
  }

  function getSelectedLocation() {
    return LOCATION_MAP[state.selectedLocationId] || getCurrentLocation();
  }

  function getItem(itemId) {
    return ITEM_MAP[itemId];
  }

  function getNpc(npcId) {
    return app.getGame().npcs.find((npc) => npc.id === npcId) || null;
  }

  function getRealm(realmId) {
    return REALM_TEMPLATES.find((realm) => realm.id === realmId) || null;
  }

  function getMonsterTemplate(monsterId) {
    return MONSTER_TEMPLATES.find((monster) => monster.id === monsterId) || null;
  }

  function getFaction(factionId) {
    return FACTIONS.find((faction) => faction.id === factionId) || null;
  }

  function getPropertyDef(propertyId) {
    return PROPERTY_DEFS.find((property) => property.id === propertyId) || null;
  }

  function getCrop(cropId) {
    return CROPS.find((crop) => crop.id === cropId) || null;
  }

  function getRecipe(recipeId) {
    return CRAFT_RECIPES.find((recipe) => recipe.id === recipeId) || null;
  }

  function findInventoryEntry(itemId) {
    return app.getGame().player.inventory.find((entry) => entry.itemId === itemId) || null;
  }

  function ensurePlayerRelation(npcId) {
    const game = app.getGame();
    game.player.relations[npcId] = game.player.relations[npcId] || app.createRelationState();
    return game.player.relations[npcId];
  }

  Object.assign(app, {
    getRankData,
    getCurrentLocation,
    getSelectedLocation,
    getItem,
    getNpc,
    getRealm,
    getMonsterTemplate,
    getFaction,
    getPropertyDef,
    getCrop,
    getRecipe,
    findInventoryEntry,
    ensurePlayerRelation,
  });
})();