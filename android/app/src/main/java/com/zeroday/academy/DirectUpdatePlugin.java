package com.zeroday.academy;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "DirectUpdate")
public class DirectUpdatePlugin extends Plugin {

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void getDistributionFlavor(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("flavor", BuildConfig.DISTRIBUTION_FLAVOR);
        call.resolve(ret);
    }

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ret.put("canInstall", getContext().getPackageManager().canRequestPackageInstalls());
        } else {
            ret.put("canInstall", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to open unknown app sources settings: " + e.getMessage());
            }
        } else {
            call.resolve();
        }
    }

    @PluginMethod
    public void downloadAndInstallApk(PluginCall call) {
        String urlString = call.getString("url");
        String expectedSha256 = call.getString("expectedSha256");

        if (urlString == null || urlString.isEmpty()) {
            call.reject("URL parameter is required.");
            return;
        }

        executor.execute(() -> {
            HttpURLConnection connection = null;
            InputStream input = null;
            FileOutputStream output = null;

            try {
                URL url = new URL(urlString);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.connect();

                int responseCode = connection.getResponseCode();
                if (responseCode < 200 || responseCode >= 300) {
                    call.reject("HTTP error downloading APK: " + responseCode + " " + connection.getResponseMessage());
                    return;
                }

                int fileLength = connection.getContentLength();
                input = connection.getInputStream();

                File cacheDir = getContext().getCacheDir();
                File outputFile = new File(cacheDir, "zeroday-update.apk");
                if (outputFile.exists()) {
                    outputFile.delete();
                }

                output = new FileOutputStream(outputFile);
                byte[] data = new byte[8192];
                long total = 0;
                int count;
                long lastProgressTime = 0;

                MessageDigest digest = MessageDigest.getInstance("SHA-256");

                while ((count = input.read(data)) != -1) {
                    total += count;
                    digest.update(data, 0, count);
                    output.write(data, 0, count);

                    long now = System.currentTimeMillis();
                    if (now - lastProgressTime > 200 || (fileLength > 0 && total == fileLength)) {
                        lastProgressTime = now;
                        int progressPercent = fileLength > 0 ? (int) ((total * 100) / fileLength) : -1;
                        JSObject progressObj = new JSObject();
                        progressObj.put("progress", progressPercent);
                        progressObj.put("bytesDownloaded", total);
                        progressObj.put("totalBytes", fileLength);
                        notifyListeners("downloadProgress", progressObj);
                    }
                }

                output.flush();

                // Compute SHA-256
                byte[] hashBytes = digest.digest();
                StringBuilder sb = new StringBuilder();
                for (byte b : hashBytes) {
                    sb.append(String.format("%02x", b));
                }
                String actualSha256 = sb.toString();

                if (expectedSha256 != null && !expectedSha256.trim().isEmpty()) {
                    if (!actualSha256.equalsIgnoreCase(expectedSha256.trim())) {
                        outputFile.delete();
                        call.reject("Integrità compromessa: SHA-256 non corrisponde. Atteso: " + expectedSha256 + ", Calcolato: " + actualSha256);
                        return;
                    }
                }

                // Launch package installer
                Context context = getContext();
                Uri apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    outputFile
                );

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);

                JSObject res = new JSObject();
                res.put("success", true);
                res.put("filePath", outputFile.getAbsolutePath());
                res.put("sha256", actualSha256);
                call.resolve(res);

            } catch (Exception e) {
                call.reject("Download or installation failed: " + e.getMessage());
            } finally {
                try {
                    if (output != null) output.close();
                    if (input != null) input.close();
                } catch (Exception ignored) {}
                if (connection != null) connection.disconnect();
            }
        });
    }

    @PluginMethod
    public void installLocalApk(PluginCall call) {
        String filePath = call.getString("filePath");
        String expectedSha256 = call.getString("expectedSha256");

        if (filePath == null) {
            call.reject("filePath is required");
            return;
        }

        File apkFile = new File(filePath);
        if (!apkFile.exists()) {
            call.reject("APK file does not exist at: " + filePath);
            return;
        }

        try {
            if (expectedSha256 != null && !expectedSha256.trim().isEmpty()) {
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                try (FileInputStream fis = new FileInputStream(apkFile)) {
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = fis.read(buffer)) != -1) {
                        digest.update(buffer, 0, read);
                    }
                }
                byte[] hashBytes = digest.digest();
                StringBuilder sb = new StringBuilder();
                for (byte b : hashBytes) {
                    sb.append(String.format("%02x", b));
                }
                String actualSha256 = sb.toString();
                if (!actualSha256.equalsIgnoreCase(expectedSha256.trim())) {
                    call.reject("SHA-256 verification failed: " + actualSha256);
                    return;
                }
            }

            Context context = getContext();
            Uri apkUri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                apkFile
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to trigger installer: " + e.getMessage());
        }
    }
}
