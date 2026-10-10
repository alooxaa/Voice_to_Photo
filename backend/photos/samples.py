"""Three generated sample scenes that every new user receives.

The scenes are drawn with Pillow, so no image files need to be shipped in the
repository and nothing has to be downloaded.
"""

import io

from django.core.files.base import ContentFile
from PIL import Image, ImageDraw

from .models import Photo

WIDTH, HEIGHT = 1200, 800

TITLES = {
    "kk": {"mountains": "Таулар", "sea": "Теңіз", "city": "Қала"},
    "ru": {"mountains": "Горы", "sea": "Море", "city": "Город"},
    "en": {"mountains": "Mountains", "sea": "Sea", "city": "City"},
}


def _sky(draw: ImageDraw.ImageDraw, top: tuple, bottom: tuple, height: int) -> None:
    """Paint a vertical sky blend, one line at a time."""
    for y in range(height):
        t = y / height
        color = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom, strict=True))
        draw.line([(0, y), (WIDTH, y)], fill=color)


def draw_mountains() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(image)
    _sky(draw, (120, 170, 230), (225, 238, 250), HEIGHT)
    draw.ellipse([880, 110, 1020, 250], fill=(255, 214, 102))
    draw.polygon([(0, 620), (260, 260), (520, 620)], fill=(96, 112, 150))
    draw.polygon([(260, 260), (210, 330), (255, 310), (300, 335)], fill=(245, 248, 255))
    draw.polygon([(320, 640), (700, 180), (1080, 640)], fill=(70, 86, 128))
    draw.polygon([(700, 180), (630, 265), (690, 245), (760, 270)], fill=(245, 248, 255))
    draw.polygon([(800, 660), (1050, 360), (1300, 660)], fill=(110, 126, 166))
    draw.rectangle([0, 600, WIDTH, HEIGHT], fill=(92, 150, 92))
    for x in range(40, WIDTH, 140):
        draw.polygon([(x, 700), (x + 30, 610), (x + 60, 700)], fill=(52, 104, 70))
    return image


def draw_sea() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(image)
    _sky(draw, (250, 196, 140), (255, 236, 200), 430)
    draw.ellipse([520, 300, 680, 460], fill=(255, 170, 80))
    draw.rectangle([0, 430, WIDTH, HEIGHT], fill=(40, 96, 170))
    for row, y in enumerate(range(470, HEIGHT, 55)):
        for x in range(-60 + (row % 2) * 60, WIDTH, 120):
            draw.arc([x, y, x + 120, y + 40], 200, 340, fill=(160, 200, 240), width=4)
    draw.polygon([(160, 520), (380, 520), (340, 570), (200, 570)], fill=(120, 70, 40))
    draw.line([(270, 520), (270, 380)], fill=(80, 50, 30), width=6)
    draw.polygon([(276, 390), (276, 510), (360, 510)], fill=(250, 250, 245))
    draw.polygon([(0, 800), (0, 690), (300, 760), (420, 800)], fill=(236, 210, 150))
    return image


def draw_city() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(image)
    _sky(draw, (30, 44, 92), (92, 108, 168), HEIGHT)
    draw.ellipse([960, 90, 1060, 190], fill=(250, 240, 200))
    buildings = [
        (40, 360, 200),
        (230, 250, 360),
        (390, 420, 520),
        (550, 200, 700),
        (730, 330, 860),
        (890, 280, 1030),
        (1060, 400, 1170),
    ]
    for left, top, right in buildings:
        draw.rectangle([left, top, right, 700], fill=(44, 52, 84))
        for wy in range(top + 30, 680, 60):
            for wx in range(left + 20, right - 30, 45):
                lit = (wx * 7 + wy * 3) % 5 != 0
                window = (255, 210, 110) if lit else (70, 80, 115)
                draw.rectangle([wx, wy, wx + 22, wy + 30], fill=window)
    draw.rectangle([0, 700, WIDTH, HEIGHT], fill=(36, 40, 56))
    for x in range(0, WIDTH, 120):
        draw.rectangle([x + 20, 745, x + 80, 755], fill=(230, 230, 230))
    return image


SCENES = {"mountains": draw_mountains, "sea": draw_sea, "city": draw_city}


def create_sample_photos(user, language: str = "kk") -> list[Photo]:
    titles = TITLES.get(language, TITLES["kk"])
    photos = []
    for key, draw in SCENES.items():
        buffer = io.BytesIO()
        draw().save(buffer, format="JPEG", quality=90)
        photo = Photo(owner=user, title=titles[key], title_key=key)
        photo.original.save(f"{key}.jpg", ContentFile(buffer.getvalue()), save=False)
        photo.save()
        photos.append(photo)
    return photos
