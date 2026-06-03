# Считалочка 🔢

Обучающая игра-счёт для детей под Android. Нативное приложение на **Kotlin + Jetpack Compose**.
Подготовлено для публикации в **RuStore**.

## Что внутри

Три уровня сложности:

| Уровень       | Возраст | Что тренируем            |
|---------------|---------|--------------------------|
| 🐣 Малыш      | 3–4 года | счёт предметов до 5      |
| 🦊 Дошкольник | 5–6 лет  | счёт предметов до 10     |
| 🦉 Умник      | 7+ лет   | сложение и вычитание     |

- Раунд из 10 заданий, звёзды за результат (сохраняются между запусками).
- Крупные кнопки, яркие цвета, звуковая обратная связь — удобно маленьким пальчикам.
- Полностью оффлайн, без рекламы, без сбора данных, без интернет-разрешений.

## Сборка

Нужен JDK 17 и Android SDK (через Android Studio или `sdkmanager`).

```bash
cd schitalochka
./gradlew assembleDebug        # debug APK -> app/build/outputs/apk/debug/
./gradlew assembleRelease      # release APK (нужна подпись, см. ниже)
./gradlew bundleRelease        # AAB для магазинов
```

Самый простой путь: открыть папку `schitalochka/` в **Android Studio** и нажать ▶️.

### Автосборка в GitHub Actions

В репозитории есть workflow `.github/workflows/android-build.yml`: при каждом
пуше с изменениями в `schitalochka/**` собирается debug-APK и кладётся в
артефакты сборки (вкладка **Actions** → нужный запуск → **Artifacts**).

## Подпись release-сборки

Для публикации нужен подписанный AAB. Создай ключ:

```bash
keytool -genkey -v -keystore schitalochka.keystore \
  -alias schitalochka -keyalg RSA -keysize 2048 -validity 10000
```

Добавь в `app/build.gradle.kts` блок `signingConfigs` и подключи его к
`buildTypes.release`, либо подписывай через Android Studio:
**Build → Generate Signed Bundle / APK**. Keystore в репозиторий не коммить.

## Публикация в RuStore

1. Зарегистрируй аккаунт разработчика на [console.rustore.ru](https://console.rustore.ru).
2. Собери подписанный **AAB** (`./gradlew bundleRelease`).
3. Заполни карточку: название «Считалочка», описание, скриншоты, иконка.
4. Возрастной рейтинг: **0+**. Категория: «Образование» / «Детям».
5. Приложи **политику конфиденциальности** — файл [`PRIVACY.md`](PRIVACY.md).
   Размести её по публичному URL (например, на GitHub Pages) и укажи ссылку.
6. Поскольку приложение не запрашивает интернет и не собирает данные,
   декларация о данных — «данные не собираются».

## Вынести в отдельный репозиторий

Сейчас проект лежит подпапкой в репозитории сайта. Чтобы сделать его отдельным репо:

```bash
# 1. Создай пустой репозиторий на GitHub (например, schitalochka)
# 2. Из корня сайта:
git subtree split --prefix=schitalochka -b schitalochka-only
git push git@github.com:<твой-аккаунт>/schitalochka.git schitalochka-only:main
```

После этого workflow и папку `schitalochka/` можно удалить из репозитория сайта.

## Технологии

- Kotlin 1.9, Jetpack Compose (Material 3), Compose BOM 2024.06
- Android Gradle Plugin 8.5.2, Gradle 8.7
- minSdk 24, targetSdk 34
