# =====================================================================
# ZeroDay Security & Hardening ProGuard / R8 Rules
# =====================================================================

# Aggressive Obfuscation & Optimization
-repackageclasses ''
-allowaccessmodification

# Total Log Stripping in Release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
}

# Strip System.out and System.err
-assumenosideeffects class java.io.PrintStream {
    public void println(java.lang.String);
    public void print(java.lang.String);
}

# Preserve Line Numbers / SourceFile attributes for crashes (optional, but keep obfuscated)
-renamesourcefileattribute SourceFile
-keepattributes Exceptions,InnerClasses,Signature,Deprecated,*Annotation*,EnclosingMethod

# JavaScript Interface preservation (Essential for Capacitor WebView Bridge)
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Capacitor Framework Rules
-keep public class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public <methods>;
}
-keep class com.getcapacitor.Bridge
-keep class com.getcapacitor.PluginCall { *; }
-keep class com.getcapacitor.JSObject { *; }
-keep class com.getcapacitor.JSArray { *; }

# Cordova Compatibility
-keep public class * extends org.apache.cordova.CordovaPlugin
-keep class org.apache.cordova.** { *; }

# Keep App Entry & RASP
-keep public class com.zeroday.academy.MainActivity
-keep public class com.zeroday.academy.ZeroDayApp
-keep public class com.zeroday.academy.security.ZeroDaySecurityManager {
    public static void init(...);
}

# Don't warn on missing optional libraries
-dontwarn com.google.android.gms.**
-dontwarn org.apache.cordova.**
-dontwarn androidx.**
