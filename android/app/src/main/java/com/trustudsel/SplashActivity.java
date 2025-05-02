package com.trustudsel;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.appcompat.app.AppCompatActivity;

public class SplashActivity extends AppCompatActivity {
    private static final int SPLASH_DISPLAY_LENGTH = 1000; // Just 500ms for quick transition

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.launch_screen);

        // Start with a shorter timeout to ensure we don't wait too long
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                // If activity hasn't been destroyed, start MainActivity
                if (!isFinishing()) {
                    Intent mainIntent = new Intent(SplashActivity.this, MainActivity.class);
                    mainIntent.addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION); // Prevent transition animation
                    startActivity(mainIntent);
                    finish();
                    overridePendingTransition(0, 0); // No animation between activities
                }
            }
        }, SPLASH_DISPLAY_LENGTH);
    }
} 