import os
import sys
import numpy as np
from PIL import Image, ImageDraw

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

SRC_ROUNDED = os.path.join(PROJECT_ROOT, "public", "pwnify-rounded.png")
SRC_SQUARE = os.path.join(PROJECT_ROOT, "public", "brand", "pwnify_icon.png")

def make_round(img):
    size = img.size
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0], size[1]), fill=255)
    output = img.copy()
    output.putalpha(mask)
    return output

def extract_alpha_glyph(src_img):
    """
    Extracts the bright glyph on black background into an RGBA image
    with transparent background, perfectly preserving anti-aliasing.
    """
    arr = np.array(src_img.convert("RGBA"), dtype=np.float32)
    alpha = np.max(arr[:, :, :3], axis=2) / 255.0
    fg = np.zeros_like(arr)
    mask = alpha > 0.001
    for c in range(3):
        fg[mask, c] = np.clip(arr[mask, c] / alpha[mask], 0, 255)
    fg[:, :, 3] = alpha * 255.0
    return Image.fromarray(fg.astype(np.uint8), mode="RGBA")

def main():
    if not os.path.exists(SRC_ROUNDED):
        print(f"Error: Master rounded image not found at {SRC_ROUNDED}")
        sys.exit(1)

    img_rounded = Image.open(SRC_ROUNDED).convert("RGBA")
    print(f"Loaded master rounded icon: {img_rounded.size}")

    if os.path.exists(SRC_SQUARE):
        img_square = Image.open(SRC_SQUARE).convert("RGBA")
    else:
        img_square = img_rounded

    brand_dir = os.path.join(PROJECT_ROOT, "public", "brand")
    os.makedirs(brand_dir, exist_ok=True)

    # 1. Master PNGs
    icon_512 = img_rounded.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save(os.path.join(PROJECT_ROOT, "public", "icon-512.png"), "PNG", optimize=True)
    icon_512.save(os.path.join(brand_dir, "pwnify_icon_512.png"), "PNG", optimize=True)
    icon_512.save(os.path.join(brand_dir, "zeroday_icon_512.png"), "PNG", optimize=True)

    icon_192 = img_rounded.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save(os.path.join(PROJECT_ROOT, "public", "icon-192.png"), "PNG", optimize=True)
    icon_192.save(os.path.join(brand_dir, "pwnify_icon_192.png"), "PNG", optimize=True)
    icon_192.save(os.path.join(brand_dir, "zeroday_icon_192.png"), "PNG", optimize=True)

    # 2. Apple Touch Icon (180x180)
    icon_180 = img_rounded.resize((180, 180), Image.Resampling.LANCZOS)
    icon_180.save(os.path.join(PROJECT_ROOT, "public", "apple-touch-icon.png"), "PNG", optimize=True)

    # 3. Favicon PNG (32x32 and 64x64)
    icon_64 = img_rounded.resize((64, 64), Image.Resampling.LANCZOS)
    icon_32 = img_rounded.resize((32, 32), Image.Resampling.LANCZOS)
    icon_32.save(os.path.join(PROJECT_ROOT, "public", "favicon.png"), "PNG", optimize=True)
    icon_32.save(os.path.join(PROJECT_ROOT, "public", "favicon-32x32.png"), "PNG", optimize=True)

    # 4. Multi-res ICO (16, 32, 48, 64)
    ico_path = os.path.join(PROJECT_ROOT, "public", "favicon.ico")
    icon_64.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    print("Saved public/favicon.ico with multi-res sizes")

    # 5. Favicon SVG
    import base64
    import io
    bio = io.BytesIO()
    icon_192.save(bio, format="PNG")
    b64_str = base64.b64encode(bio.getvalue()).decode("ascii")
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="100%" height="100%">
  <image href="data:image/png;base64,{b64_str}" x="0" y="0" width="192" height="192"/>
</svg>
'''
    with open(os.path.join(PROJECT_ROOT, "public", "favicon.svg"), "w", encoding="utf-8") as f:
        f.write(svg_content)
    print("Generated public/favicon.svg")

    # 6. Android Mipmap icons
    android_res_dir = os.path.join(PROJECT_ROOT, "android", "app", "src", "main", "res")
    if os.path.exists(android_res_dir):
        densities = {
            "mipmap-mdpi": (48, 108),
            "mipmap-hdpi": (72, 162),
            "mipmap-xhdpi": (96, 216),
            "mipmap-xxhdpi": (144, 324),
            "mipmap-xxxhdpi": (192, 432),
        }

        # Extract isolated glyph for adaptive foreground
        glyph_img = extract_alpha_glyph(img_square)

        for folder, (l_size, fg_size) in densities.items():
            target_folder = os.path.join(android_res_dir, folder)
            os.makedirs(target_folder, exist_ok=True)

            # Square/Rounded launcher icon (legacy)
            l_img = img_rounded.resize((l_size, l_size), Image.Resampling.LANCZOS)
            l_img.save(os.path.join(target_folder, "ic_launcher.png"), "PNG", optimize=True)

            # Round launcher icon
            sq_img = img_square.resize((l_size, l_size), Image.Resampling.LANCZOS)
            r_img = make_round(sq_img)
            r_img.save(os.path.join(target_folder, "ic_launcher_round.png"), "PNG", optimize=True)

            # Foreground adaptive icon (108dp canvas, ~76% safe area scale)
            fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
            inner_size = int(fg_size * 0.76)
            inner_img = glyph_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
            offset = (fg_size - inner_size) // 2
            fg_canvas.paste(inner_img, (offset, offset), inner_img)
            fg_canvas.save(os.path.join(target_folder, "ic_launcher_foreground.png"), "PNG", optimize=True)

            print(f"Updated Android launcher icons in {folder}")

        # 7. Android Splash Screens
        splash_bg_color = (6, 10, 18, 255) # #060A12 dark cyber theme
        splash_targets = [
            ("drawable", (480, 320)),
            ("drawable-land-mdpi", (480, 320)),
            ("drawable-land-hdpi", (800, 480)),
            ("drawable-land-xhdpi", (1280, 720)),
            ("drawable-land-xxhdpi", (1600, 960)),
            ("drawable-land-xxxhdpi", (1920, 1280)),
            ("drawable-port-mdpi", (320, 480)),
            ("drawable-port-hdpi", (480, 800)),
            ("drawable-port-xhdpi", (720, 1280)),
            ("drawable-port-xxhdpi", (960, 1600)),
            ("drawable-port-xxxhdpi", (1280, 1920)),
        ]

        for folder, (sw, sh) in splash_targets:
            splash_folder = os.path.join(android_res_dir, folder)
            os.makedirs(splash_folder, exist_ok=True)
            splash_img = Image.new("RGBA", (sw, sh), splash_bg_color)
            
            # Icon scaled to ~32% of smaller dimension
            icon_dim = max(48, int(min(sw, sh) * 0.32))
            scaled_icon = img_rounded.resize((icon_dim, icon_dim), Image.Resampling.LANCZOS)
            px = (sw - icon_dim) // 2
            py = (sh - icon_dim) // 2
            splash_img.paste(scaled_icon, (px, py), scaled_icon)
            
            # Save as 24-bit RGB or RGBA PNG
            splash_path = os.path.join(splash_folder, "splash.png")
            splash_img.convert("RGB").save(splash_path, "PNG", optimize=True)
            print(f"Updated Android splash screen in {folder} ({sw}x{sh})")

    print("\nAll brand, web, mobile launcher icons, and splash screens generated successfully!")

if __name__ == "__main__":
    main()
