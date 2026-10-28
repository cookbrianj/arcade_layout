import zlib
import struct
import math

def generate_arcade_icon(filepath, size=512):
    # RGBA buffer
    width, height = size, size
    pixels = bytearray(width * height * 4)

    def set_pixel(x, y, r, g, b, a):
        if 0 <= x < width and 0 <= y < height:
            idx = (y * width + x) * 4
            # Alpha blend over background
            curr_a = pixels[idx + 3] / 255.0
            new_a = a / 255.0
            out_a = new_a + curr_a * (1.0 - new_a)
            if out_a > 0:
                pixels[idx] = int((r * new_a + pixels[idx] * curr_a * (1.0 - new_a)) / out_a)
                pixels[idx + 1] = int((g * new_a + pixels[idx + 1] * curr_a * (1.0 - new_a)) / out_a)
                pixels[idx + 2] = int((b * new_a + pixels[idx + 2] * curr_a * (1.0 - new_a)) / out_a)
                pixels[idx + 3] = int(out_a * 255)

    # 1. Dark Rounded App Icon Background (macOS squircle approx)
    center = size / 2.0
    radius = size * 0.44
    for y in range(height):
        for x in range(width):
            # Squircle distance |x - cx|^4 + |y - cy|^4 < r^4
            dx = abs(x - center)
            dy = abs(y - center)
            # Rounded rect distance
            rx = max(0, dx - (radius - 50))
            ry = max(0, dy - (radius - 50))
            dist = math.sqrt(rx * rx + ry * ry)
            if dist <= 50:
                # Radial gradient dark cosmic blue (#0c1222 to #050811)
                t = (y / float(height))
                r = int(12 * (1 - t) + 5 * t)
                g = int(18 * (1 - t) + 8 * t)
                b = int(34 * (1 - t) + 17 * t)
                set_pixel(x, y, r, g, b, 255)

    # 2. Glowing Neon Border around squircle
    for y in range(height):
        for x in range(width):
            dx = abs(x - center)
            dy = abs(y - center)
            rx = max(0, dx - (radius - 50))
            ry = max(0, dy - (radius - 50))
            dist = math.sqrt(rx * rx + ry * ry)
            if 46 <= dist <= 50:
                set_pixel(x, y, 6, 182, 212, 220) # Cyan border

    # 3. Arcade Cabinet Silhouette
    # Marquee (Top)
    for y in range(120, 180):
        for x in range(160, 352):
            set_pixel(x, y, 2, 132, 199, 255) # Electric blue marquee
    for y in range(130, 170):
        for x in range(175, 337):
            set_pixel(x, y, 250, 204, 21, 255) # Gold neon glow inside marquee

    # Screen Bezel & Screen
    for y in range(180, 300):
        for x in range(170, 342):
            set_pixel(x, y, 15, 23, 42, 255) # Dark bezel
    for y in range(195, 285):
        for x in range(185, 327):
            # Screen glow (magenta/cyan gradient)
            st = (y - 195) / 90.0
            sr = int(217 * (1 - st) + 34 * st)
            sg = int(70 * (1 - st) + 211 * st)
            sb = int(239 * (1 - st) + 238 * st)
            set_pixel(x, y, sr, sg, sb, 255)

    # Control Panel (Jutting out)
    for y in range(300, 345):
        for x in range(145, 367):
            set_pixel(x, y, 220, 38, 38, 255) # Red control panel
    # Joysticks (2 players)
    for cy in range(308, 322):
        for cx in range(195, 209):
            set_pixel(cx, cy, 250, 204, 21, 255) # Yellow ball top P1
        for cx in range(303, 317):
            set_pixel(cx, cy, 56, 189, 248, 255) # Cyan ball top P2

    # Lower Body & Coin Door
    for y in range(345, 430):
        for x in range(165, 347):
            set_pixel(x, y, 30, 41, 59, 255) # Lower cabinet
    for y in range(365, 415):
        for x in range(220, 292):
            set_pixel(x, y, 15, 23, 42, 255) # Coin door
    for y in range(375, 385):
        for x in range(235, 245):
            set_pixel(x, y, 249, 115, 22, 255) # Glowing orange coin slot 1
        for x in range(267, 277):
            set_pixel(x, y, 249, 115, 22, 255) # Glowing orange coin slot 2

    # Output raw PNG format
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # Filter type 0 (None)
        raw_data.extend(pixels[y * width * 4 : (y + 1) * width * 4])

    compressed = zlib.compress(bytes(raw_data), 9)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        crc = zlib.crc32(tag + data) & 0xffffffff
        return c + struct.pack('>I', crc)

    png_bytes = bytearray(b'\x89PNG\r\n\x1a\n')
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png_bytes.extend(chunk(b'IHDR', ihdr))
    png_bytes.extend(chunk(b'IDAT', compressed))
    png_bytes.extend(chunk(b'IEND', b''))

    with open(filepath, 'wb') as f:
        f.write(png_bytes)

if __name__ == '__main__':
    import os
    os.makedirs('build', exist_ok=True)
    generate_arcade_icon('build/icon.png', 512)
    print("Generated build/icon.png successfully")

