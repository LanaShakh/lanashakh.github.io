# -*- coding: utf-8 -*-
"""
Генерация голосового пака «Станции 42».

Тот же движок и голос, что в паке игры «Считаем с Роботом»:
Silero TTS, модель v4_ru, спикер xenia, 48 кГц. Совпадение проверялось
на одинаковом тексте («сорок два» против готового n42.mp3) — длительность
до миллисекунды и практически совпадающий спектр.

Вопросы и ответы синтезируются ЦЕЛЫМИ ФРАЗАМИ, а не собираются из слов:
склейка даёт рваную интонацию, а разбирать такую речь на слух ребёнку
с дислексией — лишняя работа, которой быть не должно.

Что получается (203 файла в voices_pack/):
    qm_6_7.mp3   «сколько будет шесть умножить на семь»
    am_6_7.mp3   «шесть умножить на семь равно сорок два»
    qd_42_7.mp3  «сколько будет сорок два разделить на семь»
    ad_42_7.mp3  «сорок два разделить на семь равно шесть»
    op_umn / op_del / op_eq — отдельные слова, запас на случай склейки

Числа n0…n100 и похвалы взяты из пака «Робота» и заново не генерируются.

Запуск:
    python3 -m venv venv
    ./venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch
    ./venv/bin/pip install numpy imageio-ffmpeg
    curl -O https://models.silero.ai/models/tts/ru/v4_ru.pt
    ./venv/bin/python gen_voices.py

На обычном CPU весь пак собирается примерно за минуту.
"""
import os
import subprocess
import wave

import torch
import imageio_ffmpeg

MODEL   = 'v4_ru.pt'
SPEAKER = 'xenia'
RATE    = 48000
BITRATE = '64k'
OUT     = '../voices_pack'

_U = ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
      'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
      'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
_T = {2: 'двадцать', 3: 'тридцать', 4: 'сорок', 5: 'пятьдесят',
      6: 'шестьдесят', 7: 'семьдесят', 8: 'восемьдесят', 9: 'девяносто'}


def word(n):
    """Число словами: нужно, чтобы не полагаться на нормализацию модели."""
    if n < 20:
        return _U[n]
    if n == 100:
        return 'сто'
    t, u = divmod(n, 10)
    return _T[t] + ('' if u == 0 else ' ' + _U[u])


def phrases():
    """Все реплики, которые игра может произнести, кроме отдельных чисел."""
    items = {}
    for a in range(2, 10):
        for b in range(a, 10):
            p = a * b
            items[f'qm_{a}_{b}'] = f'сколько будет {word(a)} умножить на {word(b)}'
            items[f'am_{a}_{b}'] = f'{word(a)} умножить на {word(b)} равно {word(p)}'
            for d in {a, b}:                      # для квадратов делитель один
                items[f'qd_{p}_{d}'] = f'сколько будет {word(p)} разделить на {word(d)}'
                items[f'ad_{p}_{d}'] = f'{word(p)} разделить на {word(d)} равно {word(p // d)}'
    items['op_umn'] = 'умножить на'
    items['op_del'] = 'разделить на'
    items['op_eq']  = 'равно'
    return items


def main():
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    torch.set_num_threads(os.cpu_count() or 4)
    model = torch.package.PackageImporter(MODEL).load_pickle('tts_models', 'model')
    model.to(torch.device('cpu'))

    os.makedirs(OUT, exist_ok=True)
    items = phrases()
    for i, (name, text) in enumerate(items.items(), 1):
        mp3 = f'{OUT}/{name}.mp3'
        if os.path.exists(mp3):
            continue
        audio = model.apply_tts(text=text, speaker=SPEAKER, sample_rate=RATE)
        wav = f'{OUT}/{name}.wav'
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes((audio.numpy() * 32767).astype('int16').tobytes())
        subprocess.run([ff, '-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame',
                        '-b:a', BITRATE, '-ac', '1', '-ar', str(RATE), mp3], check=True)
        os.remove(wav)
        if i % 25 == 0:
            print(f'{i}/{len(items)}', flush=True)
    print('готово:', len(items), 'файлов')


if __name__ == '__main__':
    main()
