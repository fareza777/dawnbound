package com.fajar.dawnbound;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.SnapshotsClient;
import com.google.android.gms.games.snapshot.Snapshot;
import com.google.android.gms.games.snapshot.SnapshotMetadataChange;
import com.google.android.gms.tasks.Task;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Minimal bridge to Google Play Games Services v2 (official SDK only): sign-in state, one Saved Games slot for cloud
 * save, achievements and leaderboards. Everything is a no-op until a real Games project id is configured in
 * res/values/strings.xml (game_services_project_id), so development builds run without a Play Console setup.
 */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {

    private boolean ready = false;

    @Override
    public void load() {
        String appId = getContext().getString(R.string.game_services_project_id);
        if (appId == null || appId.trim().isEmpty() || "0".equals(appId.trim())) return;
        try {
            PlayGamesSdk.initialize(getContext());
            ready = true;
        } catch (Exception e) {
            ready = false;
        }
    }

    private boolean requireReady(PluginCall call) {
        if (!ready) {
            call.reject("Play Games is not configured");
            return false;
        }
        return true;
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject res = new JSObject();
        res.put("available", ready);
        if (!ready) {
            res.put("signedIn", false);
            call.resolve(res);
            return;
        }
        PlayGames.getGamesSignInClient(getActivity()).isAuthenticated().addOnCompleteListener(task -> {
            res.put("signedIn", task.isSuccessful() && task.getResult().isAuthenticated());
            call.resolve(res);
        });
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        if (!requireReady(call)) return;
        PlayGames.getGamesSignInClient(getActivity()).signIn().addOnCompleteListener(task -> {
            JSObject res = new JSObject();
            res.put("signedIn", task.isSuccessful() && task.getResult().isAuthenticated());
            call.resolve(res);
        });
    }

    /** Writes `data` (UTF-8 text) to the named Saved Games slot, creating it on first use. */
    @PluginMethod
    public void saveGame(PluginCall call) {
        if (!requireReady(call)) return;
        String name = call.getString("name", "dawnbound");
        String data = call.getString("data");
        String description = call.getString("description", "Dawnbound");
        Long playedMs = call.getLong("playedMs", 0L);
        if (data == null) {
            call.reject("data is required");
            return;
        }
        SnapshotsClient client = PlayGames.getSnapshotsClient(getActivity());
        client.open(name, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED).addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult().getData() == null) {
                call.reject("Could not open the cloud save", task.getException());
                return;
            }
            Snapshot snapshot = task.getResult().getData();
            snapshot.getSnapshotContents().writeBytes(data.getBytes(StandardCharsets.UTF_8));
            SnapshotMetadataChange change = new SnapshotMetadataChange.Builder()
                .setDescription(description)
                .setPlayedTimeMillis(playedMs == null ? 0L : playedMs)
                .build();
            Task<?> commit = client.commitAndClose(snapshot, change);
            commit.addOnCompleteListener(done -> {
                if (done.isSuccessful()) call.resolve();
                else call.reject("Could not write the cloud save", done.getException());
            });
        });
    }

    /** Reads the named Saved Games slot; resolves { data: null } when there is no cloud save yet. */
    @PluginMethod
    public void loadGame(PluginCall call) {
        if (!requireReady(call)) return;
        String name = call.getString("name", "dawnbound");
        SnapshotsClient client = PlayGames.getSnapshotsClient(getActivity());
        client.open(name, false, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED).addOnCompleteListener(task -> {
            JSObject res = new JSObject();
            if (!task.isSuccessful() || task.getResult().getData() == null) {
                // Not found (first launch on this account) is the common case, not an error.
                res.put("data", null);
                call.resolve(res);
                return;
            }
            Snapshot snapshot = task.getResult().getData();
            try {
                byte[] bytes = snapshot.getSnapshotContents().readFully();
                res.put("data", bytes.length == 0 ? null : new String(bytes, StandardCharsets.UTF_8));
            } catch (IOException e) {
                client.discardAndClose(snapshot);
                call.reject("Could not read the cloud save", e);
                return;
            }
            client.discardAndClose(snapshot);
            call.resolve(res);
        });
    }

    @PluginMethod
    public void unlockAchievement(PluginCall call) {
        if (!requireReady(call)) return;
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("id is required");
            return;
        }
        PlayGames.getAchievementsClient(getActivity()).unlock(id);
        call.resolve();
    }

    @PluginMethod
    public void showAchievements(PluginCall call) {
        if (!requireReady(call)) return;
        PlayGames.getAchievementsClient(getActivity()).getAchievementsIntent().addOnCompleteListener(task -> {
            if (task.isSuccessful()) launch(task.getResult(), call);
            else call.reject("Achievements unavailable", task.getException());
        });
    }

    @PluginMethod
    public void submitScore(PluginCall call) {
        if (!requireReady(call)) return;
        String id = call.getString("id");
        Long score = call.getLong("score");
        if (id == null || id.isEmpty() || score == null) {
            call.reject("id and score are required");
            return;
        }
        PlayGames.getLeaderboardsClient(getActivity()).submitScore(id, score);
        call.resolve();
    }

    @PluginMethod
    public void showLeaderboard(PluginCall call) {
        if (!requireReady(call)) return;
        String id = call.getString("id");
        Task<Intent> intent = id == null || id.isEmpty()
            ? PlayGames.getLeaderboardsClient(getActivity()).getAllLeaderboardsIntent()
            : PlayGames.getLeaderboardsClient(getActivity()).getLeaderboardIntent(id);
        intent.addOnCompleteListener(task -> {
            if (task.isSuccessful()) launch(task.getResult(), call);
            else call.reject("Leaderboards unavailable", task.getException());
        });
    }

    private void launch(Intent intent, PluginCall call) {
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open Play Games", e);
        }
    }
}
