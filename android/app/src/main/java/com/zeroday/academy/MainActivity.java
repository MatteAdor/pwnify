package com.zeroday.academy;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DirectUpdatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
