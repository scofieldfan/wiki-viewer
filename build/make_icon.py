#!/usr/bin/env python3
"""Generate a wiki book icon as PNG using only stdlib."""
import struct, zlib, math

SIZE = 1024

def make_png(pixels, w, h):
    def chunk(tag, data):
        c = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', c)
    raw = b''
    for row in pixels:
        raw += b'\x00' + bytes(row)
    compressed = zlib.compress(raw, 9)
    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
        + chunk(b'IDAT', compressed)
        + chunk(b'IEND', b'')
    )

def lerp(a, b, t):
    return a + (b - a) * t

def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))

def circle_aa(cx, cy, r, x, y):
    d = math.sqrt((x - cx)**2 + (y - cy)**2)
    return clamp(255 * max(0, min(1, r - d + 0.5)))

# Background gradient: deep teal -> dark slate
BG1 = (18, 52, 74)
BG2 = (8, 28, 44)

pixels = []
for y in range(SIZE):
    row = []
    t = y / SIZE
    bg = tuple(clamp(lerp(BG1[i], BG2[i], t)) for i in range(3))
    for x in range(SIZE):
        row.extend(list(bg) + [255])
    pixels.append(row)

def set_pixel(px, py, r, g, b, a=255):
    if 0 <= px < SIZE and 0 <= py < SIZE:
        row = pixels[py]
        idx = px * 4
        # alpha blend
        fa = a / 255
        row[idx]   = clamp(row[idx]   * (1-fa) + r * fa)
        row[idx+1] = clamp(row[idx+1] * (1-fa) + g * fa)
        row[idx+2] = clamp(row[idx+2] * (1-fa) + b * fa)
        row[idx+3] = 255

def fill_rect(x1, y1, x2, y2, r, g, b, a=255):
    for py in range(y1, y2+1):
        for px in range(x1, x2+1):
            set_pixel(px, py, r, g, b, a)

def fill_rect_rounded(x1, y1, x2, y2, radius, r, g, b, a=255):
    for py in range(y1, y2+1):
        for px in range(x1, x2+1):
            # corner distance
            cx = max(x1 + radius, min(x2 - radius, px))
            cy = max(y1 + radius, min(y2 - radius, py))
            d = math.sqrt((px - cx)**2 + (py - cy)**2)
            alpha_f = max(0, min(1, radius - d + 0.5))
            set_pixel(px, py, r, g, b, clamp(a * alpha_f))

# --- Draw rounded background card ---
M = 100
R = 80
fill_rect_rounded(M, M, SIZE-M, SIZE-M, R, 30, 80, 110, 255)

# --- Book body ---
BX1, BY1, BX2, BY2 = 230, 200, 720, 820
SPINE_W = 60

# Book shadow
fill_rect_rounded(BX1+18, BY1+18, BX2+18, BY2+18, 18, 5, 15, 25, 160)

# Book cover (right pages area)
fill_rect_rounded(BX1 + SPINE_W, BY1, BX2, BY2, 12, 245, 245, 235, 255)

# Spine
fill_rect_rounded(BX1, BY1, BX1 + SPINE_W, BY2, 12, 52, 140, 180, 255)

# Page edge lines (right side of pages)
for i in range(5):
    px = BX2 + 4 + i * 3
    fill_rect(px, BY1 + 20, px, BY2 - 20, 200, 195, 185, 220)

# Text lines on page
LINE_COLOR = (80, 110, 130)
LINE_X1 = BX1 + SPINE_W + 40
LINE_X2 = BX2 - 50
LINE_HEIGHTS = [310, 360, 410, 460, 510, 560, 610, 660, 710]
LINE_LENGTHS  = [1.0, 0.85, 0.95, 0.7, 1.0, 0.88, 0.75, 0.92, 0.6]
for ly, lf in zip(LINE_HEIGHTS, LINE_LENGTHS):
    lx2 = int(LINE_X1 + (LINE_X2 - LINE_X1) * lf)
    fill_rect(LINE_X1, ly, lx2, ly+10, *LINE_COLOR, 200)

# Heading line (thicker, darker)
fill_rect(LINE_X1, 260, LINE_X2, 278, 40, 80, 110, 230)

# --- Bookmark ribbon ---
BM_X = BX2 - 100
fill_rect(BM_X, BY1, BM_X + 40, BY1 + 120, 220, 80, 60, 240)
# triangle notch at bottom of bookmark
for i in range(20):
    fill_rect(BM_X + i, BY1 + 100 + i, BM_X + 40 - i, BY1 + 101 + i, 30, 80, 110, 240)

# --- Gloss highlight on card ---
for py in range(M, M + 200):
    for px in range(M, SIZE - M):
        alpha = clamp(40 * (1 - (py - M) / 200))
        set_pixel(px, py, 255, 255, 255, alpha)

# Flatten to RGB rows
flat = []
for row in pixels:
    r_row = []
    for i in range(0, len(row), 4):
        r_row += [row[i], row[i+1], row[i+2]]
    flat.append(r_row)

# Write raw as RGBA for PNG (re-build with alpha)
raw_rows = []
for y in range(SIZE):
    r = []
    for x in range(SIZE):
        # rounded corner mask on outer card
        cx2 = max(M + R, min(SIZE-M-R, x))
        cy2 = max(M + R, min(SIZE-M-R, y))
        d2 = math.sqrt((x-cx2)**2 + (y-cy2)**2)
        outer_alpha = clamp(255 * max(0, min(1, R - d2 + 0.5)))
        src = pixels[y][x*4:x*4+4]
        r += [src[0], src[1], src[2], outer_alpha]
    raw_rows.append(r)

def make_png_rgba(pixels_rgba, w, h):
    def chunk(tag, data):
        c = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', c)
    raw = b''
    for row in pixels_rgba:
        raw += b'\x00' + bytes(row)
    compressed = zlib.compress(raw, 9)
    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', compressed)
        + chunk(b'IEND', b'')
    )

png_data = make_png_rgba(raw_rows, SIZE, SIZE)
with open('icon.png', 'wb') as f:
    f.write(png_data)
print(f"Written icon.png ({len(png_data)//1024} KB)")
