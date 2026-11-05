// Fixture for the local, separately packaged Android QA app only.
const services = window.__services;
const game = window.__game;
if (!game.scene.isActive('Menu') || services.ads.diagnostics.interstitialStatus !== 'Ready') {
  throw new Error('Menu and loaded native interstitial required');
}
const save = services.save.data;
save.profile.introSeen = true;
save.profile.tutorialDone = true;
save.stats.runs = 2;
save.shop.noAds = false;
save.shop.adBreaks = 0;
save.shop.lastInterstitialAt = 0;
save.shop.giftDay = 0;
const run = window.__run.start({ heroId: 'rowan', seed: 20261006 });
run.embersFound = 7;
run.gold = 45;
run.kills = 8;
run.roomsCleared = 3;
run.timeSec = 90;
game.scene.stop('Menu');
game.scene.start('Results', { victory: false });
return { seeded: true, purpose: 'Tap normal Return to Village, then the normal optional village gift' };
