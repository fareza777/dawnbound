import { BootScene } from './BootScene';
import { PreloadScene } from './PreloadScene';
import { SplashScene } from './SplashScene';
import { OnboardingScene } from './OnboardingScene';
import { IntroScene } from './IntroScene';
import { MenuScene } from './MenuScene';
import { HubScene } from './hub/HubScene';
import { HubHud } from './hub/HubHud';
import { InventoryScene } from './hub/InventoryScene';
import { AlchemistScene, BlacksmithScene, GardenScene, MerchantScene } from './hub/HubShops';
import { BountiesScene, DescendScene, HeroScene, HubMenuScene, JukeboxScene, LanternTreeScene, VowsScene } from './hub/HubMenus';
import { QuestLogScene } from './hub/QuestLogScene';
import { RunMapScene } from './RunMapScene';
import { RoomScene } from './RoomScene';
import { HudScene } from './HudScene';
import { ResultsScene } from './ResultsScene';
import { TransitionScene } from './TransitionScene';
import { BoonPickScene } from './overlays/BoonPickScene';
import { BuildScene, EventScene, PauseScene, RestScene, ShopScene } from './overlays/RunOverlays';
import { SettingsScene } from './overlays/SettingsScene';
import { CodexScene } from './overlays/CodexScene';
import { DialogueScene } from './overlays/DialogueScene';
import { RemoveAdsScene, ReviveScene } from './overlays/AdOverlays';
import { NotifyScene } from './NotifyScene';

export const SCENES = [
  BootScene, PreloadScene, SplashScene, OnboardingScene, IntroScene, MenuScene,
  HubScene, HubHud, InventoryScene, BlacksmithScene, AlchemistScene, MerchantScene, GardenScene,
  HubMenuScene, QuestLogScene, BountiesScene, VowsScene, JukeboxScene, HeroScene, LanternTreeScene, DescendScene,
  RunMapScene, RoomScene, HudScene, ResultsScene, TransitionScene,
  BoonPickScene, PauseScene, BuildScene, RestScene, ShopScene, EventScene,
  SettingsScene, CodexScene, DialogueScene, ReviveScene, RemoveAdsScene, NotifyScene,
];
