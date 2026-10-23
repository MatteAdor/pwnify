Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\lenovo\Documents\logo_zeroday.png"
$srcImg = [System.Drawing.Bitmap]::FromFile($srcPath)

function Resize-And-Save {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$width,
        [int]$height,
        [string]$destPath
    )
    $destDir = [System.IO.Path]::GetDirectoryName($destPath)
    if (!(Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    $targetBmp = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($targetBmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($source, 0, 0, $width, $height)
    $targetBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $targetBmp.Dispose()
    Write-Output "Saved: $destPath (${width}x${height})"
}

# Android Mipmap dimensions
$densities = @(
    @{ name = "mdpi"; size = 48; fg = 108 },
    @{ name = "hdpi"; size = 72; fg = 162 },
    @{ name = "xhdpi"; size = 96; fg = 216 },
    @{ name = "xxhdpi"; size = 144; fg = 324 },
    @{ name = "xxxhdpi"; size = 192; fg = 432 }
)

foreach ($d in $densities) {
    $dir = "android/app/src/main/res/mipmap-$($d.name)"
    Resize-And-Save $srcImg $d.size $d.size "$dir/ic_launcher.png"
    Resize-And-Save $srcImg $d.size $d.size "$dir/ic_launcher_round.png"
    Resize-And-Save $srcImg $d.fg $d.fg "$dir/ic_launcher_foreground.png"
}

# Web and PWA icons
Resize-And-Save $srcImg 512 512 "public/zerox-rounded.png"
Resize-And-Save $srcImg 180 180 "public/apple-touch-icon.png"
Resize-And-Save $srcImg 64 64 "public/favicon.png"
Resize-And-Save $srcImg 32 32 "public/favicon-32x32.png"

Resize-And-Save $srcImg 512 512 "dist/zerox-rounded.png"
Resize-And-Save $srcImg 180 180 "dist/apple-touch-icon.png"
Resize-And-Save $srcImg 64 64 "dist/favicon.png"

$srcImg.Dispose()
Write-Output "Icon generation complete."
