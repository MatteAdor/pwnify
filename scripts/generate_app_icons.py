import os
import sys
from PIL import Image

SRC_PATH = r"C:\Users\lenovo\.gemini\antigravity\brain\2197e929-2fcd-46ab-bc0c-d59438602b02\.user_uploaded\media_1792351648045_5630f804.jpg"
PROJECT_ROOT = r"c:\Users\lenovo\Documents\zeroDay_app"

def main():
    if not os.path.exists(SRC_PATH):
        print(f"Error: Source image not found at {SRC_PATH}")
        sys.exit(1)

    img = Image.open(SRC_PATH).convert("RGBA")
    print(f"Loaded master image: {img.size}, mode: {img.mode}")

    # 1. Save master PNGs
    brand_dir = os.path.join(PROJECT_ROOT, "public", "brand")
    os.makedirs(brand_dir, exist_ok=True)
    
    master_png_path = os.path.join(brand_dir, "zeroday_icon.png")
    img.save(master_png_path, "PNG", optimize=True)
    print(f"Saved: {master_png_path}")

    icon_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save(os.path.join(brand_dir, "zeroday_icon_512.png"), "PNG", optimize=True)
    icon_512.save(os.path.join(PROJECT_ROOT, "public", "icon-512.png"), "PNG", optimize=True)

    icon_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192.save(os.path.join(brand_dir, "zeroday_icon_192.png"), "PNG", optimize=True)
    icon_192.save(os.path.join(PROJECT_ROOT, "public", "icon-192.png"), "PNG", optimize=True)

    # 2. Apple Touch Icon (180x180)
    icon_180 = img.resize((180, 180), Image.Resampling.LANCZOS)
    icon_180.save(os.path.join(PROJECT_ROOT, "public", "apple-touch-icon.png"), "PNG", optimize=True)

    # 3. Favicon PNG (32x32 and 64x64)
    icon_64 = img.resize((64, 64), Image.Resampling.LANCZOS)
    icon_64.save(os.path.join(PROJECT_ROOT, "public", "favicon.png"), "PNG", optimize=True)

    # 4. Multi-res ICO (16, 32, 48, 64)
    ico_path = os.path.join(PROJECT_ROOT, "public", "favicon.ico")
    icon_64.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    print(f"Saved favicon.ico with multi-res sizes")

    # 4b. Favicon SVG
    import base64
    import io
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
        # Mipmap densities mapping (density: launcher_size, foreground_size)
        densities = {
            "mipmap-mdpi": (48, 108),
            "mipmap-hdpi": (72, 162),
            "mipmap-xhdpi": (96, 216),
            "mipmap-xxhdpi": (144, 324),
            "mipmap-xxxhdpi": (192, 432),
        }

        # For round icons, create a circular crop mask
        from PIL import ImageDraw
        def make_round(square_img):
            size = square_img.size
            mask = Image.new('L', size, 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, size[0], size[1]), fill=255)
            output = square_img.copy()
            output.putalpha(mask)
            return output

        for folder, (l_size, fg_size) in densities.items():
            target_folder = os.path.join(android_res_dir, folder)
            os.makedirs(target_folder, exist_ok=True)

            # Square launcher
            l_img = img.resize((l_size, l_size), Image.Resampling.LANCZOS)
            l_img.save(os.path.join(target_folder, "ic_launcher.png"), "PNG")

            # Round launcher
            r_img = make_round(l_img)
            r_img.save(os.path.join(target_folder, "ic_launcher_round.png"), "PNG")

            # Foreground adaptive icon
            # For foreground, let's keep centered with padding
            fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
            # inner icon scale ~ 72%
            inner_size = int(fg_size * 0.72)
            inner_img = img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
            offset = (fg_size - inner_size) // 2
            fg_canvas.paste(inner_img, (offset, offset))
            fg_canvas.save(os.path.join(target_folder, "ic_launcher_foreground.png"), "PNG")

            print(f"Updated Android assets in {folder}")

    print("All icons successfully generated and deployed.")

if __name__ == "__main__":
    main()
