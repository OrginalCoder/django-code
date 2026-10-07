# Django Code - Web-based Cloud IDE

Django Code — brauzer orqali to'g'ridan-to'g'ri Django loyihalarini yaratish, tahrirlash va ishga tushirish uchun mo'ljallangan zamonaviy interaktiv Cloud IDE tizimi.

## Asosiy imkoniyatlar
- **Monaco Editor:** VS Code asosidagi professional kod muharriri (syntax highlighting, avtomatik qator ko'chirish, tablar, hotkeys).
- **Real-time PTY Terminal:** xterm.js va WebSockets (Channels + Daphne) orqali to'g'ridan-to'g'ri real tizim konsoli (Linuxda bash/sh, Windowsda cmd/powershell).
- **Fayllar daraxti:** Loyiha fayllarini ko'rish, yaratish, o'chirish va avtomatik sinxronizatsiya qilish.
- **Splitter Resizer:** Muharrir va terminal o'rtasidagi balandlikni sichqoncha bilan tortib o'zgartirish.
- **Mobile Responsive:** Smartfon va planshetlarda to'liq moslashuvchan interfeys (slide-in drawer menyu, touch optimizatsiya).
- **Mustaqil xonalar (Sandboxes):** Har bir mavzu yoki dars uchun `rooms_storage/` ichida alohida ajratilgan muhit.

---

## Mahalliy kompyuterda ishga tushirish (Local Setup)

1. **Virtual muhitni faollashtiring:**
   ```bash
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```

2. **Kutubxonalarni o'rnatish:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Migratsiyalarni amalga oshirish:**
   ```bash
   python manage.py migrate
   ```

4. **Loyihani ishga tushirish:**
   ```bash
   python manage.py runserver
   ```
   Brauzerda `http://127.0.0.1:8000/` manzilini oching.

---

## Render.com platformasiga to'liq deploy qilish bo'yicha qo'llanma

Render.com — bepul tarifda ham WebSockets va ASGI (Daphne) serverlarini qo'llab-quvvatlaydigan eng qulay bulutli platformalardan biridir.

### 1-qadam: Loyihani GitHub'ga yuklash
1. Loyiha papkasida Git repositoriysini oching:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Django Code IDE"
   ```
2. GitHub'da yangi repozitoriy yarating (masalan, `django-code`) va loyihangizni yuklang:
   ```bash
   git remote add origin https://github.com/<sizning-username>/<repo-nomi>.git
   git branch -M main
   git push -u origin main
   ```

---

### 2-qadam: Render.com da Web Service yaratish
1. [Render.com](https://render.com) saytiga kiring va profilingiz orqali tizimga kiring (GitHub orqali kirish tavsiya etiladi).
2. Dashboard sahifasida **New +** tugmasini bosing va **Web Service** bo'limini tanlang.
3. GitHub repozitoriyingizni ro'yxatdan topib, **Connect** tugmasini bosing.

---

### 3-qadam: Asosiy sozlamalarni kiritish
Ochilgan forma oynasida quyidagi parametrlarni aniq kiriting:

* **Name:** `django-code` (yoki istalgan nom)
* **Region:** `Frankfurt (EU Central)` yoki o'zingizga yaqin region
* **Branch:** `main`
* **Root Directory:** *(bo'sh qoldiring)*
* **Runtime:** `Python 3`
* **Build Command:**
  ```bash
  pip install -r requirements.txt && python manage.py migrate
  ```
* **Start Command:**
  ```bash
  daphne -b 0.0.0.0 -p $PORT config.asgi:application
  ```
  *(DIQQAT: WSGI emas, aynan `daphne` va `config.asgi:application` yozilishi shart, aks holda WebSockets ishlamaydi).*
* **Instance Type:** `Free`

---

### 4-qadam: Environment Variables (Muhit o'zgaruvchilari)
Sahifaning pastki qismidagi **Advanced** yoki **Environment Variables** bo'limiga o'ting va quyidagi o'zgaruvchilarni qo'shing:

| Key | Value | Izoh |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.12.0` | Python versiyasi |
| `DJANGO_SETTINGS_MODULE` | `config.settings` | Sozlamalar fayli |

---

### 5-qadam: Deploy jarayonini boshlash
1. **Create Web Service** tugmasini bosing.
2. Render avtomatik ravishda GitHub'dan kodni tortib oladi, `requirements.txt` kutubxonalarini o'rnatadi, migratsiyalarni yurgizadi va Daphne serverini ishga tushiradi.
3. Deploy tugagach (odatda 2-3 daqiqa), yuqori qismda sizning onlayn havolangiz paydo bo'ladi (masalan: `https://django-code.onrender.com`).

---

### 6-qadam: Boshlang'ich xonalarni yaratish
Render'dagi yangi SQLite bazada boshlang'ich xonalar paydo bo'lishi uchun:
1. Render dashboardida xizmatingiz sahifasidagi **Shell** yorlig'iga (tabiga) o'ting.
2. Shell konsolida quyidagi buyruqni bering:
   ```bash
   python manage.py shell
   ```
3. Shell ichida quyidagi kodni kiritib Enter bosing:
   ```python
   from rooms.models import Room
   Room.objects.get_or_create(title="Django ORM va Ma'lumotlar Bazasi", slug="django-orm", folder_name="room_django_orm", order=1, description="Django ORM amaliyoti")
   Room.objects.get_or_create(title="Django Views va URL Routing", slug="django-views", folder_name="room_django_views", order=2, description="Views va shablonlar amaliyoti")
   exit()
   ```

---

## Muhim eslatmalar va cheklovlar
1. **WebSocket ulanishi:** Render bepul tarifda WebSockets ulanishini to'liq qo'llab-quvvatlaydi, hech qanday qo'shimcha to'lov talab etilmaydi.
2. **Free Tier uyqu rejimi:** Render bepul tarifida 15 daqiqa faoliyat bo'lmasa, server uyqu (spin-down) rejimiga o'tadi. Keyingi kirishda server uyg'onishi uchun taxminan 30-50 soniya vaqt ketishi mumkin.
3. **Fayllar saqlanishi (Ephemeral Storage):** Render bepul tarifidagi disk vaqtinchalik (ephemeral) hisoblanadi. Agar server qayta yuklansa (restart), foydalanuvchilar yaratgan fayllar qayta tiklanmasligi mumkin. Doimiy saqlash uchun Render'da Persistent Disk qo'shish yoki loyihani VPS serverga o'rnatish tavsiya etiladi.
