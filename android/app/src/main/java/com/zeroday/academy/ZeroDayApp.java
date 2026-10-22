package com.zeroday.academy;

import android.app.Application;
import com.zeroday.academy.security.ZeroDaySecurityManager;

public class ZeroDayApp extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        // Initialize RASP (Runtime Application Self-Protection) security engine
        ZeroDaySecurityManager.init(this);
    }
}
