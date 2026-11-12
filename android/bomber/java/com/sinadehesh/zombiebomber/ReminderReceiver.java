package com.sinadehesh.zombiebomber;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

/**
 * Shows a reminder to come back: one the day after the game was last left, when the next daily
 * reward is ready, and one three days on. MainActivity sets them when the game is left and cancels
 * them when it is opened, and only once the player has collected a daily reward. What they say comes
 * from the game (the reward that is waiting, the coins the soldiers have collected); until the game
 * has said, a plain line that is always true. If notifications aren't allowed for the app, nothing
 * is shown.
 */
public class ReminderReceiver extends BroadcastReceiver {
    static final String KIND = "kind";
    static final String TITLE = "reminderTitle", TEXT = "reminderText";   // + 1 or 2, in the app's preferences
    private static final String CHANNEL = "reminders";

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null || !nm.areNotificationsEnabled()) return;
            int kind = intent.getIntExtra(KIND, 1) == 2 ? 2 : 1;
            SharedPreferences prefs = context.getSharedPreferences("zombiebomber", Context.MODE_PRIVATE);
            String title = prefs.getString(TITLE + kind, kind == 1 ? "Your daily reward is ready" : "The horde is back");
            String text = prefs.getString(TEXT + kind, kind == 1 ? "Come back and collect it." : "Your base needs you. Your daily reward is waiting.");

            Intent open = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            Notification.Builder b;
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, "Reminders", NotificationManager.IMPORTANCE_DEFAULT);
                ch.setDescription("When your daily reward is ready");
                nm.createNotificationChannel(ch);
                b = new Notification.Builder(context, CHANNEL);
            } else {
                b = legacyBuilder(context);
            }
            b.setSmallIcon(R.drawable.ic_stat_bomb)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setColor(0xFFFF7A2F)
                .setAutoCancel(true)
                .setContentIntent(tap);
            nm.notify(kind, b.build());
        } catch (RuntimeException e) {
            Log.w("ZombieBomber", "reminder: " + e.getMessage());
        }
    }

    @SuppressWarnings("deprecation")   // Android 7: notifications without channels
    private static Notification.Builder legacyBuilder(Context context) { return new Notification.Builder(context); }
}
