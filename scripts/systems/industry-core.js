(() => {
  const app = window.ShanHai;
  const { tables } = app;
  const { PROPERTY_DEFS } = tables;

  const DEED_ITEM_BY_KIND = {
    farm: "farm-deed",
    workshop: "workshop-permit",
    shop: "shop-deed",
  };

  const SECT_UNLOCK_BY_KIND = {
    farm: "hall",
    workshop: "dojo",
    shop: "market",
  };

  const INDUSTRY_UPGRADE_BASE_COST = {
    farm: 130,
    workshop: 180,
    shop: 220,
  };

  const GOVERNMENT_CONTRACTS = {
    farm: {
      itemId: "farm-deed",
      standingNeed: 6,
      priceFactor: 0.9,
      desc: "官府备案的薄田契纸，适合从安稳营生起手。",
    },
    workshop: {
      itemId: "workshop-permit",
      standingNeed: 10,
      priceFactor: 0.92,
      desc: "衙门签发的工坊牌照，价格略低，但只卖给有地方口碑的人。",
    },
    shop: {
      itemId: "shop-deed",
      standingNeed: 14,
      priceFactor: 0.94,
      desc: "挂号在册的铺契，便宜一些，但需要本地认可你能守规矩。",
    },
  };

  const internals = app.industryInternals || (app.industryInternals = {});

  function getAssets(kind) {
    const game = app.getGame();
    return game.player.assets[`${kind}s`] || [];
  }

  function getAsset(kind, assetId) {
    return getAssets(kind).find((entry) => entry.id === assetId);
  }

  function getAllAssets() {
    return ["farm", "workshop", "shop"].flatMap((kind) => getAssets(kind).map((asset) => ({ ...asset, kind })));
  }

  function getAssetDelegateCandidates() {
    const game = app.getGame();
    const playerFaction = app.getPlayerFaction?.();
    const candidateIds = [...(game.player.sect?.disciples || []), ...(playerFaction?.members || [])];
    return [...new Set(candidateIds)]
      .map((npcId) => app.getNpc(npcId))
      .filter(Boolean);
  }

  function getManagedAssetByNpcId(npcId) {
    return getAllAssets().find((asset) => asset.managerNpcId === npcId) || null;
  }

  function getAssetManager(kind, assetId) {
    const asset = getAsset(kind, assetId);
    return asset?.managerNpcId ? app.getNpc(asset.managerNpcId) : null;
  }

  function getAssetManagerLabel(asset) {
    return asset?.managerNpcId ? (app.getNpc(asset.managerNpcId)?.name || "失联管事") : "暂未委派";
  }

  function getAssetAutomationLabel(kind, asset) {
    if (kind === "farm") {
      return asset?.automationTargetId ? `轮种 ${app.getCrop(asset.automationTargetId)?.label || asset.automationTargetId}` : "未定轮种";
    }
    if (kind === "workshop") {
      return asset?.automationTargetId ? `常做 ${app.getRecipe(asset.automationTargetId)?.label || asset.automationTargetId}` : "未定活计";
    }
    return asset?.managerNpcId ? "有人看账补货" : "暂无人照看";
  }

  function getLiquidIndustryFunds() {
    const playerFaction = app.getPlayerFaction?.();
    return (playerFaction?.treasury || 0) + app.getGame().player.money;
  }

  function spendIndustryFunds(amount) {
    const game = app.getGame();
    const playerFaction = app.getPlayerFaction?.();
    if (getLiquidIndustryFunds() < amount) return false;
    const treasurySpend = Math.min(playerFaction?.treasury || 0, amount);
    if (playerFaction) {
      playerFaction.treasury -= treasurySpend;
    }
    game.player.money -= amount - treasurySpend;
    return true;
  }

  function getAssetOperatorBonus(asset) {
    const npc = asset?.managerNpcId ? app.getNpc(asset.managerNpcId) : null;
    if (!npc) return 0;
    const relation = app.getRelation?.(npc.id);
    const trust = Math.max(0, relation?.trust || 0);
    const affinity = Math.max(0, relation?.affinity || 0);
    const game = app.getGame();
    const isDisciple = Boolean(game.player.sect?.disciples.includes(npc.id));
    const isFactionMember = Boolean(app.getPlayerFaction?.()?.members.includes(npc.id));
    return (isDisciple ? 0.12 : 0) + (isFactionMember ? 0.08 : 0) + trust * 0.003 + affinity * 0.002;
  }

  function getIndustrySupportBonus(kind, locationId = app.getCurrentLocation().id) {
    const playerFaction = app.getPlayerFaction?.();
    const sect = app.getGame().player.sect;
    const territoryBonus = app.getPlayerTerritoryModifier?.(locationId) || 0;
    if (kind === "farm") {
      return {
        output: (sect?.buildings.hall || 0) * 0.12 + territoryBonus * 0.25,
        upkeep: 0,
      };
    }
    if (kind === "workshop") {
      return {
        output: (sect?.buildings.dojo || 0) * 0.08 + territoryBonus * 0.3,
        upkeep: 0,
      };
    }
    return {
      output: ((playerFaction?.branches.caravan || 0) * 0.16) + ((sect?.buildings.market || 0) * 0.08) + territoryBonus * 0.7,
      upkeep: (playerFaction?.branches.safehouse || 0) * 0.04 + territoryBonus * 0.25,
    };
  }

  function applyIndustryNetworkGrowth(kind, value) {
    const playerFaction = app.getPlayerFaction?.();
    const sect = app.getGame().player.sect;
    if (playerFaction) {
      playerFaction.treasury += Math.max(1, Math.floor(value * (kind === "shop" ? 0.12 : 0.08)));
      playerFaction.influence += kind === "shop" ? 0.18 : 0.1;
    }
    if (sect) {
      sect.treasury += Math.max(0, Math.floor(value * 0.05));
      sect.prestige += kind === "workshop" ? 0.16 : 0.08;
    }
  }

  function hasIndustryAccess(kind, property) {
    const game = app.getGame();
    const faction = app.getCurrentAffiliation?.();
    if (faction && faction.unlocks.includes(kind)) {
      if (!property || !property.allowedFactionIds || property.allowedFactionIds.includes(faction.id)) {
        return true;
      }
    }
    if (property && hasGovernmentPropertyAccess(property)) {
      return true;
    }
    if (game.player.sect) {
      const buildingKey = SECT_UNLOCK_BY_KIND[kind];
      return (game.player.sect.buildings[buildingKey] || 0) > 0;
    }
    return false;
  }

  function getAvailableProperties() {
    const current = app.getCurrentLocation();
    return PROPERTY_DEFS.filter((property) => {
      if (property.locationTags && !property.locationTags.some((tag) => current.tags.includes(tag))) return false;
      return hasIndustryAccess(property.kind, property);
    });
  }

  function getLocalProperties() {
    const current = app.getCurrentLocation();
    return PROPERTY_DEFS.filter((property) => property.locationTags.some((tag) => current.tags.includes(tag)));
  }

  function getGovernmentStandingNeed(kind, locationId = app.getCurrentLocation().id) {
    const location = tables.LOCATION_MAP[locationId];
    const base = GOVERNMENT_CONTRACTS[kind]?.standingNeed || 0;
    return base + Math.max(0, (location?.marketTier || 0) - 1);
  }

  function hasGovernmentPropertyAccess(property) {
    const current = app.getCurrentLocation();
    if (!property || !app.getGovernmentOfficeName?.(current.id)) return false;
    if (!property.locationTags.some((tag) => current.tags.includes(tag))) return false;
    return (app.getRegionStanding?.(current.id) || 0) >= getGovernmentStandingNeed(property.kind, current.id);
  }

  Object.assign(internals, {
    DEED_ITEM_BY_KIND,
    SECT_UNLOCK_BY_KIND,
    INDUSTRY_UPGRADE_BASE_COST,
    GOVERNMENT_CONTRACTS,
    getAssets,
    getAsset,
    getAllAssets,
    getManagedAssetByNpcId,
    getLiquidIndustryFunds,
    spendIndustryFunds,
    getAssetOperatorBonus,
    getIndustrySupportBonus,
    applyIndustryNetworkGrowth,
    hasIndustryAccess,
    getGovernmentStandingNeed,
    hasGovernmentPropertyAccess,
  });

  Object.assign(app, {
    getAssetDelegateCandidates,
    getAssetManager,
    getAssetManagerLabel,
    getAssetAutomationLabel,
    getAvailableProperties,
    getLocalProperties,
  });
})();