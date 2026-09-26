/**
 * Google Play Games Services configuration.
 *
 * BEFORE RELEASE (all optional — the game works fully without Play Games):
 *  1. Play Console > Play Games Services > Setup: create the Games project, enable "Saved games".
 *  2. Put the project id in android/app/src/main/res/values/strings.xml (`game_services_project_id`).
 *  3. Create the achievements/leaderboards there and paste their ids below. Empty ids are skipped.
 */
export const PLAY_GAMES = {
  /** Saved Games slot name for the cloud save. */
  saveSlot: 'dawnbound_main',
  /** Local achievement id → Play Games achievement id (e.g. "CgkI…"). */
  achievements: {
    a_first_run: '', a_first_death: '', a_kills_100: '', a_kills_1000: '', a_gorehorn: '', a_twins: '', a_azhar: '',
    a_vesper: '', a_malachar: '', a_win_3: '', a_legendary: '', a_mythic: '', a_plus10: '', a_full_set: '', a_boons_30: '',
    a_relics_30: '', a_events_15: '', a_talents_10: '', a_harvest: '', a_heroes: '', a_shards: '', a_vow5: '', a_daily: '',
    a_quests_10: '',
  } as Record<string, string>,
  /** Leaderboard ids. */
  leaderboards: {
    bestDepth: '',
    daily: '',
    endless: '',
  },
  /** Minimum seconds between automatic cloud uploads (app pause always uploads). */
  uploadEverySec: 90,
};

export type LeaderboardKey = keyof typeof PLAY_GAMES.leaderboards;
