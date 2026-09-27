# Лея — утверждённое направление Б

Пользователь выбрал концепт Б: `concept-b.png`.

## Характерные детали

- Девочка около 8 лет, любознательная и энергичная.
- Рыжие волосы, одна коса через левое плечо персонажа, зелёная заколка.
- Карие глаза, веснушки, мягкие стилизованные пропорции.
- Терракотовый вельветовый комбинезон: нагрудный карман, металлическая фурнитура, подвернутые штанины.
- Светлая кофта с тонкими зелёными полосами и подвернутыми рукавами.
- Зелёные кеды со светлыми шнурками и подошвой.

## Референсы

- `concept-b.png`: исходный утверждённый образ и выражения лица.
- `turnaround-b-v1.png`: сгенерированные виды спереди, сбоку, сзади и в три четверти.

Turnaround — художественный ориентир, а не точный инженерный чертёж: длину косы, расположение заколки, швы и пропорции необходимо согласовать в единой 3D-геометрии. При расхождениях приоритет у исходного концепта и списка деталей выше.

## Статус

Образ выбран. Blender 5.2.1 установлен. Создан первый объёмный эскиз с UV, текстурами, 17 костями и четырьмя анимациями; исходник — `model/lea-b.blend`, игровой файл — `../../public/models/lea-b.glb`. Загрузчик модели подключён к комнате и отдельному просмотру `/character.html`. Подробности проверки и художественные ограничения — в `model/README.md`. Визуальная проверка в браузере пока не выполнена из-за блокировки инструмента браузера политикой URL.

## Цель следующего этапа

Отдельный редактируемый персонаж и GLB с проверкой в Babylon.js. Предварительный ориентир: 15–30 тысяч треугольников, текстуры до 2048 px, компактное число материалов; бюджет уточняется по реальным устройствам. Сначала проверяются силуэт и лицо крупным планом, затем деформации и анимации idle/walk/interact/celebrate.

## Генерация turnaround

Встроенный image_gen, reference: `concept-b.png`.

Use case: stylized-concept. Edit the provided approved character design reference into a clean production character turnaround sheet for 3D modeling. Preserve the exact identity, apparent age about eight years old, original beautifully sculpted stylized face, proportions, copper auburn hair, freckles, brown eyes, terracotta corduroy dungarees, striped cream and sage long sleeve shirt with rolled sleeves, brass buttons, green sneakers and teal hairclip. This is the SAME girl, not a redesign. Wide landscape ivory sheet with four evenly spaced equal-height full-body views: straight FRONT, LEFT PROFILE, straight BACK, and front THREE-QUARTER. All views must depict the same physical character and outfit, consistent silhouette and measurements, feet on the same ground baseline, top of heads aligned. Neutral relaxed A-pose, arms angled about 25 degrees from torso with both hands fully visible, feet slightly apart, head level, closed mouth gentle neutral expression. Her single braid lies over HER LEFT shoulder (viewer right in front view); preserve that anatomical side through rotations. Show sensible strap attachment and rear pockets in back view. Orthographic-like camera without dramatic foreshortening. Carefully sculpted animation-film volumes, exquisite but practical cloth folds, simplify flyaway hair into coherent sculptable masses. Small tasteful labels 'FRONT', 'SIDE', 'BACK', '3/4' under respective views only. No cropped shoes or head. This is a reference image, no wireframes or fake technical claims.
