package com.zeroday.academy.security;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.os.Build;
import android.os.Debug;
import android.os.Process;
import android.util.Base64;
import android.util.Log;

import com.zeroday.academy.BuildConfig;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.List;

/**
 * ZeroDay App RASP (Runtime Application Self-Protection) Engine.
 * Defends against:
 * 1. Repackaging & Lucky Patcher / APKTool signing modification (Signature Verification)
 * 2. Dynamic hooking frameworks (Frida, LSPosed, Xposed, Substrate)
 * 3. Runtime debuggers (JDWP, LLDB, gdb, ptrace via TracerPid)
 * 4. Rooted OS environment (Magisk, su binary, KernelSU, test-keys)
 * 5. Untrusted installation sources (Sideloading outside Google Play)
 */
public final class ZeroDaySecurityManager {

    private static final String TAG = "ZeroDaySec";

    // =========================================================================
    // TODO: INSERISCI QUI L'HASH SHA-256 IN BASE64 DEL TUO KEYSTORE DI RILASCIO
    //
    // Come ottenere l'hash SHA-256 Base64:
    // keytool -list -v -keystore <il-tuo-keystore.jks> -alias <tuo-alias>
    // Prendi l'impronta digitale SHA-256 (in esadecimale es. AB:CD:12:34:...) e convertila in Base64:
    // oppure con OpenSSL:
    // keytool -exportcert -alias <tuo-alias> -keystore <il-tuo-keystore.jks> | openssl sha256 -binary | openssl base64
    // =========================================================================
    public static final String EXPECTED_RELEASE_SIGNATURE_SHA256_BASE64 =
            "TODO_REPLACE_WITH_RELEASE_CERT_SHA256_BASE64";

    // Known trusted installer packages (Google Play Store)
    private static final List<String> TRUSTED_INSTALLERS = Arrays.asList(
            "com.android.vending",
            "com.google.android.feedback"
    );

    // Common root binary locations
    private static final String[] SU_PATHS = new String[]{
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su"
    };

    private ZeroDaySecurityManager() {}

    /**
     * Initializes all RASP integrity and threat detection checks.
     */
    public static void init(Context context) {
        if (context == null) return;

        boolean tampered = checkSignatureIntegrity(context);
        boolean hookDetected = checkHookingFrameworks();
        boolean debuggerDetected = checkDebuggerAttached();
        boolean rootDetected = checkRootEnvironment();
        boolean untrustedSource = checkUntrustedInstallSource(context);

        // Security Incident Decision Matrix
        if (!BuildConfig.DEBUG) {
            // RELEASE MODE: Strictly enforce zero tolerance on tampering, hooking, and debuggers
            if (tampered) {
                onThreatDetected("Integrity violation: Application signature mismatch or APK tampering detected.");
            }
            if (hookDetected) {
                onThreatDetected("Hooking framework active (Frida / Xposed / LSPosed). Execution terminated.");
            }
            if (debuggerDetected) {
                onThreatDetected("Debugger or native ptrace attachment detected.");
            }
            if (rootDetected) {
                // In a cybersecurity education app, warn or terminate based on policy
                Log.w(TAG, "Root environment detected.");
            }
            if (untrustedSource) {
                Log.w(TAG, "Installed from untrusted or sideloaded source.");
            }
        } else {
            // DEBUG MODE: Log warnings without terminating developer sessions
            if (tampered) Log.w(TAG, "[DEBUG] Keystore hash check bypassed in debug build.");
            if (hookDetected) Log.w(TAG, "[DEBUG] Hooking check executed.");
            if (debuggerDetected) Log.w(TAG, "[DEBUG] Debugger attached (allowed in debug).");
            if (rootDetected) Log.w(TAG, "[DEBUG] Root environment detected.");
        }
    }

    /**
     * 1. Anti-Tamper / Anti-Repackage: Signature Verification
     * Verifies that the running APK certificate SHA-256 matches the release keystore.
     * Prevents APKTool modification, Lucky Patcher signature spoofing, and rogue distribution.
     */
    public static boolean checkSignatureIntegrity(Context context) {
        if ("TODO_REPLACE_WITH_RELEASE_CERT_SHA256_BASE64".equals(EXPECTED_RELEASE_SIGNATURE_SHA256_BASE64)) {
            // Placeholder not replaced yet: Allow in debug, trigger warning in release
            return !BuildConfig.DEBUG;
        }

        try {
            PackageManager pm = context.getPackageManager();
            String packageName = context.getPackageName();
            Signature[] signatures = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageInfo packageInfo = pm.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES);
                SigningInfo signingInfo = packageInfo.signingInfo;
                if (signingInfo != null) {
                    if (signingInfo.hasMultipleSigners()) {
                        signatures = signingInfo.getApkContentsSigners();
                    } else {
                        signatures = signingInfo.getSigningCertificateHistory();
                    }
                }
            } else {
                @SuppressWarnings("deprecation")
                PackageInfo packageInfo = pm.getPackageInfo(packageName, PackageManager.GET_SIGNATURES);
                signatures = packageInfo.signatures;
            }

            if (signatures == null || signatures.length == 0) {
                return true; // Tampered: no signature found
            }

            for (Signature sig : signatures) {
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                byte[] digest = md.digest(sig.toByteArray());
                String currentSha256Base64 = Base64.encodeToString(digest, Base64.NO_WRAP);

                if (EXPECTED_RELEASE_SIGNATURE_SHA256_BASE64.equals(currentSha256Base64)) {
                    return false; // Valid official signature!
                }
            }

            return true; // Signature mismatch -> APK was repackaged/resigned
        } catch (Exception e) {
            return true;
        }
    }

    /**
     * 2. Anti-Hooking: Frida & Xposed / LSPosed Detection
     */
    public static boolean checkHookingFrameworks() {
        // A. Inspect memory maps for loaded agent libraries
        if (checkProcMaps()) {
            return true;
        }

        // B. Check for active Frida server default TCP ports (27042, 27043)
        if (checkFridaPorts()) {
            return true;
        }

        // C. Check for known hooking classes in current ClassLoader
        if (checkHookingClasses()) {
            return true;
        }

        return false;
    }

    private static boolean checkProcMaps() {
        try (BufferedReader reader = new BufferedReader(new FileReader("/proc/self/maps"))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String lower = line.toLowerCase();
                if (lower.contains("frida-gadget") ||
                    lower.contains("frida-agent") ||
                    lower.contains("libgadget.so") ||
                    lower.contains("xposed") ||
                    lower.contains("lsposed") ||
                    lower.contains("edxposed") ||
                    lower.contains("substrate") ||
                    lower.contains("sandhook") ||
                    lower.contains("pine")) {
                    return true;
                }
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    private static boolean checkFridaPorts() {
        int[] ports = new int[]{27042, 27043};
        for (int port : ports) {
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress("127.0.0.1", port), 50);
                return true; // Frida server listening
            } catch (Exception ignored) {
            }
        }
        return false;
    }

    private static boolean checkHookingClasses() {
        String[] suspiciousClasses = new String[]{
                "de.robv.android.xposed.XposedBridge",
                "de.robv.android.xposed.XposedHelpers",
                "me.weishu.exposed.ExposedBridge",
                "com.saurik.substrate.MS$2",
                "top.canyie.pine.Pine"
        };
        for (String className : suspiciousClasses) {
            try {
                Class.forName(className);
                return true; // Hooking class loaded
            } catch (ClassNotFoundException ignored) {
            }
        }
        return false;
    }

    /**
     * 3. Anti-Debug: JDWP and TracerPid Detection
     */
    public static boolean checkDebuggerAttached() {
        if (Debug.isDebuggerConnected() || Debug.waitingForDebugger()) {
            return true;
        }

        // Native ptrace detection (TracerPid in /proc/self/status)
        try (BufferedReader reader = new BufferedReader(new FileReader("/proc/self/status"))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("TracerPid:")) {
                    String pidStr = line.substring("TracerPid:".length()).trim();
                    int tracerPid = Integer.parseInt(pidStr);
                    if (tracerPid > 0) {
                        return true; // Traced by debugger / frida / lldb
                    }
                    break;
                }
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    /**
     * 4. Root Detection
     */
    public static boolean checkRootEnvironment() {
        // Build tags check
        String buildTags = Build.TAGS;
        if (buildTags != null && buildTags.contains("test-keys")) {
            return true;
        }

        // SU binary check
        for (String path : SU_PATHS) {
            try {
                if (new File(path).exists()) {
                    return true;
                }
            } catch (Exception ignored) {
            }
        }

        // PATH su check
        String pathEnv = System.getenv("PATH");
        if (pathEnv != null) {
            for (String dir : pathEnv.split(":")) {
                File file = new File(dir, "su");
                if (file.exists()) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 5. Sideloading / Untrusted Installer Source Detection
     */
    public static boolean checkUntrustedInstallSource(Context context) {
        try {
            PackageManager pm = context.getPackageManager();
            String installer = null;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                installer = pm.getInstallSourceInfo(context.getPackageName()).getInstallingPackageName();
            } else {
                @SuppressWarnings("deprecation")
                String pkg = pm.getInstallerPackageName(context.getPackageName());
                installer = pkg;
            }

            if (installer == null || !TRUSTED_INSTALLERS.contains(installer)) {
                return true; // Sideloaded or unknown market
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    /**
     * Immediate blocking termination when critical threat is confirmed in release.
     */
    private static void onThreatDetected(String reason) {
        Log.e(TAG, "CRITICAL SECURITY INCIDENT: " + reason);
        // Force crash / kill process immediately
        Process.killProcess(Process.myPid());
        System.exit(1);
        Runtime.getRuntime().halt(1);
    }
}
