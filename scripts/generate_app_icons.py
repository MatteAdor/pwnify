import os
import sys
import io
import base64
from PIL import Image, ImageDraw

SRC_PATH = r"C:\Users\lenovo\.gemini\antigravity\brain\2197e929-2fcd-46ab-bc0c-d59438602b02\.user_uploaded\media_1793648555983_909786a0.jpg"
DOCUMENTS_DIR = r"C:\Users\lenovo\Documents"
PROJECT_ROOT = r"C:\Users\lenovo\Documents\zeroDay_app"

def main():
    if not os.path.exists(SRC_PATH):
        print(f"Error: Source image not found at {SRC_PATH}")
        sys.exit(1)

    img = Image.open(SRC_PATH).convert("RGBA")
    print(f"Loaded master image: {img.size}, mode: {img.mode}")

    # 0. Save master copies in Documents
    master_doc1 = os.path.join(DOCUMENTS_DIR, "logo_pwnify.png")
    master_doc2 = os.path.join(DOCUMENTS_DIR, "logo_zeroday.png")
    img.save(master_doc1, "PNG", optimize=True)
    img.save(master_doc2, "PNG", optimize=True)
    print(f"Saved: {master_doc1} and {master_doc2}")

    # 1. Save master PNGs in public/brand and public/
    brand_dir = os.path.join(PROJECT_ROOT, "public", "brand")
    os.makedirs(brand_dir, exist_ok=True)
    
    brand_master = os.path.join(brand_dir, "zeroday_icon.png")
    pwnify_brand_master = os.path.join(brand_dir, "pwnify_icon.png")
    img.save(brand_master, "PNG", optimize=True)
    img.save(pwnify_brand_master, "PNG", optimize=True)
    print(f"Saved: {brand_master}")

    icon_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save(os.path.join(brand_dir, "zeroday_icon_512.png"), "PNG", optimize=True)
    icon_512.save(os.path.join(brand_dir, "pwnify_icon_512.png"), "PNG", optimize=True)
    icon_512.save(os.path.join(PROJECT_ROOT, "public", "icon-512.png"), "PNG", optimize=True)
    icon_512.save(os.path.join(PROJECT_ROOT, "public", "zerox-rounded.png"), "PNG", optimize=True)

    icon_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save(os.path.join(brand_dir, "zeroday_icon_192.png"), "PNG", optimize=True)
    icon_192.save(os.path.join(brand_dir, "pwnify_icon_192.png"), "PNG", optimize=True)
    icon_192.save(os.path.join(PROJECT_ROOT, "public", "icon-192.png"), "PNG", optimize=True)

    # 2. Apple Touch Icon (180x180)
    icon_180 = img.resize((180, 180), Image.Resampling.LANCZOS)
    icon_180.save(os.path.join(PROJECT_ROOT, "public", "apple-touch-icon.png"), "PNG", optimize=True)

    # 3. Favicon PNG (32x32 and 64x64)
    icon_64 = img.resize((64, 64), Image.Resampling.LANCZOS)
    icon_64.save(os.path.join(PROJECT_ROOT, "public", "favicon.png"), "PNG", optimize=True)
    icon_32 = img.resize((32, 32), Image.Resampling.LANCZOS)
    icon_32.save(os.path.join(PROJECT_ROOT, "public", "favicon-32x32.png"), "PNG", optimize=True)

    # 4. Multi-res ICO (16, 32, 48, 64)
    ico_path = os.path.join(PROJECT_ROOT, "public", "favicon.ico")
    icon_64.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    print("Saved favicon.ico with multi-res sizes")

    # 4b. Favicon SVG
    bio = io.BytesIO()
    icon_192.save(bio, format="PNG")
    b64_str = base64.b64encode(bio.getvalue()).decode("ascii")
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <rect width="192" height="192" rx="42" fill="#000000"/>
  <image href="data:image/png;base64,{b64_str}" x="0" y="0" width="192" height="192"/>
</svg>
'''
    with open(os.path.join(PROJECT_ROOT, "public", "favicon.svg"), "w", encoding="utf-8") as f:
        f.write(svg_content)
    print("Generated public/favicon.svg")

    # 5. Android Capacitor Mipmap icons
    android_res_dir = os.path.join(PROJECT_ROOT, "android", "app", "src", "main", "res")
    if os.path.exists(android_res_dir):
        densities = {
            "mipmap-mdpi": (48, 108),
            "mipmap-hdpi": (72, 162),
            "mipmap-xhdpi": (96, 216),
            "mipmap-xxhdpi": (144, 324),
            "mipmap-xxxhdpi": (192, 432),
        }

        def make_round(square_img):
            size = square_img.size
            mask = Image.new('L', size, 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, size[0], size[1]), fill=255)
            output = square_img.copy()
            output.putalpha(mask)
            return output

        # Extract white glyph with alpha transparency for adaptive icon foreground
        gray = img.convert("L")
        glyph_alpha = Image.new("RGBA", img.size, (255, 255, 255, 255))
        glyph_alpha.putalpha(gray)

        for folder, (l_size, fg_size) in densities.items():
            target_folder = os.path.join(android_res_dir, folder)
            os.makedirs(target_folder, exist_ok=True)

            # Square launcher
            l_img = img.resize((l_size, l_size), Image.Resampling.LANCZOS)
            l_img.save(os.path.join(target_folder, "ic_launcher.png"), "PNG")

            # Round launcher
            r_img = make_round(l_img)
            r_img.save(os.path.join(target_folder, "ic_launcher_round.png"), "PNG")

            # Foreground adaptive icon (scaled to 72% centered)
            fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
            inner_size = int(fg_size * 0.72)
            inner_glyph = glyph_alpha.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
            offset = (fg_size - inner_size) // 2
            fg_canvas.paste(inner_glyph, (offset, offset), inner_glyph)
            fg_canvas.save(os.path.join(target_folder, "ic_launcher_foreground.png"), "PNG")

            print(f"Updated Android launcher assets in {folder}")

        # 6. Android Splash screens
        splash_targets = {
            "drawable": (480, 320),
            "drawable-land-mdpi": (480, 320),
            "drawable-land-hdpi": (800, 480),
            "drawable-land-xhdpi": (1280, 720),
            "drawable-land-xxhdpi": (1600, 960),
            "drawable-land-xxxhdpi": (1920, 1280),
            "drawable-port-mdpi": (320, 480),
            "drawable-port-hdpi": (480, 800),
            "drawable-port-xhdpi": (720, 1280),
            "drawable-port-xxhdpi": (960, 1600),
            "drawable-port-xxxhdpi": (1280, 1920),
        }

        for folder, (w, h) in splash_targets.items():
            splash_folder = os.path.join(android_res_dir, folder)
            os.makedirs(splash_folder, exist_ok=True)
            splash_canvas = Image.new("RGBA", (w, h), (0, 0, 0, 255))
            
            # Icon size in splash: ~35% of the smaller dimension
            icon_dim = max(64, int(min(w, h) * 0.35))
            resized_logo = img.resize((icon_dim, icon_dim), Image.Resampling.LANCZOS)
            
            offset_x = (w - icon_dim) // 2
            offset_y = (h - icon_dim) // 2
            splash_canvas.paste(resized_logo, (offset_x, offset_y), resized_logo)
            
            splash_path = os.path.join(splash_folder, "splash.png")
            splash_canvas.save(splash_path, "PNG")
            print(f"Updated Splash screen: {folder}/splash.png ({w}x{h})")

    # 7. Also sync to dist/ if dist exists
    dist_dir = os.path.join(PROJECT_ROOT, "dist")
    if os.path.exists(dist_dir):
        dist_brand = os.path.join(dist_dir, "brand")
        os.makedirs(dist_brand, exist_ok=True)
        img.save(os.path.join(dist_brand, "zeroday_icon.png"), "PNG")
        icon_512.save(os.path.join(dist_brand, "zeroday_icon_512.png"), "PNG")
        icon_192.save(os.path.join(dist_brand, "zeroday_icon_192.png"), "PNG")
        icon_512.save(os.path.join(dist_dir, "icon-512.png"), "PNG")
        icon_512.save(os.path.join(dist_dir, "zerox-rounded.png"), "PNG")
        icon_192.save(os.path.join(dist_dir, "icon-192.png"), "PNG")
        icon_180.save(os.path.join(dist_dir, "apple-touch-icon.png"), "PNG")
        icon_64.save(os.path.join(dist_dir, "favicon.png"), "PNG")
        icon_32.save(os.path.join(dist_dir, "favicon-32x32.png"), "PNG")
        icon_64.save(os.path.join(dist_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
        with open(os.path.join(dist_dir, "favicon.svg"), "w", encoding="utf-8") as f:
            f.write(svg_content)
        print("Updated dist/ static assets.")

    print("\n[SUCCESS] All icon, web, PWA and Android splash assets generated and deployed.")

if __name__ == "__main__":
    main()
