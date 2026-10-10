"""Reply templates for the rule-based assistant, per language.

Several variants per situation keep the assistant from sounding robotic.
Placeholders: {label} is the command the child should say, {heard} is what
the recogniser heard, {effect} describes what just happened to the photo.
"Unclear" texts are used when speech was caught but matched no command.
"""

LABELS = {
    "kk": {
        "brighten": "Жарық қыл",
        "darken": "Қараңғы қыл",
        "grayscale": "Ақ-қара",
        "rotate": "Бұр",
        "undo": "Артқа",
        "save": "Сақта",
    },
    "ru": {
        "brighten": "Сделай светлее",
        "darken": "Сделай темнее",
        "grayscale": "Чёрно-белое",
        "rotate": "Поверни",
        "undo": "Назад",
        "save": "Сохрани",
    },
    "en": {
        "brighten": "Brighten",
        "darken": "Darken",
        "grayscale": "Black and white",
        "rotate": "Rotate",
        "undo": "Undo",
        "save": "Save",
    },
}

TEXTS = {
    "kk": {
        "task": "«{label}» деп айт",
        "praise": ["Керемет!", "Жарайсың!", "Тамаша!", "Өте жақсы!"],
        "effects": {
            "brighten": "Фото жарығырақ болды.",
            "darken": "Фото қараңғырақ болды.",
            "grayscale": "Енді фото ақ-қара.",
            "rotate": "Фото бұрылды.",
            "undo": "Соңғы өзгерісті қайтардық.",
            "save": "Фото сақталды.",
        },
        "retry_heard": [
            "Мен «{heard}» деп естідім. Ондай команда жоқ. «{label}» деп айтып көр.",
            "«{heard}» дегенді естідім. Келесі жолы «{label}» деп айтайық.",
        ],
        "retry_unclear": [
            "Мен команданы түсінбедім. «{label}» деп тағы айтып көр.",
            "Бұл команда емес сияқты. Микрофонды басып, «{label}» деп айт.",
        ],
        "free_retry_heard": [
            "Мен «{heard}» деп естідім. Төмендегі командалардың бірін айтып көр.",
        ],
        "free_retry_unclear": [
            "Мен команданы түсінбедім. Төмендегі командалардың бірін айтып көр.",
        ],
        "other_command": [
            "{effect} Ал енді тапсырмаға оралайық.",
            "{effect} Жақсы! Енді мына тапсырманы орындап көр.",
        ],
        "finished": "Барлық тапсырманы орындадың! Енді кез келген команданы айта аласың.",
    },
    "ru": {
        "task": "Скажи «{label}»",
        "praise": ["Отлично!", "Здорово!", "Молодец!", "Получилось!"],
        "effects": {
            "brighten": "Фото стало светлее.",
            "darken": "Фото стало темнее.",
            "grayscale": "Теперь фото чёрно-белое.",
            "rotate": "Фото повернулось.",
            "undo": "Последнее изменение отменено.",
            "save": "Фото сохранено.",
        },
        "retry_heard": [
            "Слышу «{heard}», но такой команды нет. Попробуй сказать «{label}».",
            "Похоже на «{heard}». Давай скажем «{label}».",
        ],
        "retry_unclear": [
            "Команду не удалось разобрать. Попробуй сказать «{label}».",
            "Это не похоже на команду. Нажми на микрофон и скажи «{label}».",
        ],
        "free_retry_heard": [
            "Слышу «{heard}», но такой команды нет. Выбери любую команду внизу.",
        ],
        "free_retry_unclear": [
            "Команду не удалось разобрать. Скажи любую команду из тех, что внизу.",
        ],
        "other_command": [
            "{effect} А теперь вернёмся к заданию.",
            "{effect} Хорошо! Теперь попробуй вот это задание.",
        ],
        "finished": "Все задания выполнены! Теперь можно говорить любую команду.",
    },
    "en": {
        "task": "Say “{label}”",
        "praise": ["Great job!", "Well done!", "Nice!", "You did it!"],
        "effects": {
            "brighten": "The photo is brighter now.",
            "darken": "The photo is darker now.",
            "grayscale": "The photo is black and white now.",
            "rotate": "The photo has turned.",
            "undo": "The last change is undone.",
            "save": "The photo is saved.",
        },
        "retry_heard": [
            "I heard “{heard}”, which isn't a command. Try saying “{label}”.",
            "That sounded like “{heard}”. Let's try “{label}”.",
        ],
        "retry_unclear": [
            "I couldn't catch a command. Try saying “{label}”.",
            "That didn't sound like a command. Press the microphone and say “{label}”.",
        ],
        "free_retry_heard": [
            "I heard “{heard}”, which isn't a command. Pick any command below.",
        ],
        "free_retry_unclear": [
            "I couldn't catch a command. Try any command below.",
        ],
        "other_command": [
            "{effect} Now let's go back to the task.",
            "{effect} Good! Now try this task.",
        ],
        "finished": "You finished every task! Now you can use any command.",
    },
}
