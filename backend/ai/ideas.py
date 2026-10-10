"""Ready ideas for the AI studio, shown as big tiles so the child is never stuck.

Pressing a tile skips speech recognition and the text model: the request is
already known. The words on the tiles are in the frontend translations
(`ai.ideas.<id>`); the backend only needs what to send to the image model.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Idea:
    intent: str  # "edit" or "generate"
    edit_kind: str  # "add", "style", "remove" or "other"
    prompt_en: str


IDEAS = {
    "rainbow": Idea("edit", "add", "Add a bright rainbow across the sky."),
    "snow": Idea("edit", "add", "Make it gently snow everywhere, with snowflakes in the air."),
    "cartoon": Idea("edit", "style", "Turn the whole picture into a colourful cartoon drawing."),
    "no_sun": Idea("edit", "remove", "Remove the sun or the moon from the sky."),
    "space_cat": Idea(
        "generate", "other", "A happy cat in a little spacesuit floating in space among stars."
    ),
}
