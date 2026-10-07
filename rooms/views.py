import json
import re
import urllib.request
import urllib.error
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponse
from django.views.decorators.http import require_http_methods
from .models import Room
from ide_backend import file_manager


def room_list(request):
    rooms = Room.objects.all()
    return render(request, 'rooms/room_list.html', {'rooms': rooms})


def workspace(request, room_slug):
    room = get_object_or_404(Room, slug=room_slug)
    folder_name = room.folder_name or room.slug
    file_manager.get_room_dir(folder_name)
    initial_tree = file_manager.get_file_tree(folder_name)
    all_rooms = Room.objects.exclude(id=room.id)

    context = {
        'room': room,
        'folder_name': folder_name,
        'initial_tree': json.dumps(initial_tree),
        'all_rooms': all_rooms,
    }
    return render(request, 'rooms/workspace.html', context)


@require_http_methods(["GET"])
def api_file_tree(request, room_slug):
    room = get_object_or_404(Room, slug=room_slug)
    folder_name = room.folder_name or room.slug
    try:
        tree = file_manager.get_file_tree(folder_name)
        return JsonResponse({"success": True, "tree": tree})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@require_http_methods(["GET"])
def api_read_file(request, room_slug):
    room = get_object_or_404(Room, slug=room_slug)
    folder_name = room.folder_name or room.slug
    file_path = request.GET.get('path', '').strip()

    if not file_path:
        return JsonResponse({"success": False, "error": "Fayl yo'li ko'rsatilmadi"}, status=400)

    try:
        data = file_manager.read_file(folder_name, file_path)
        return JsonResponse({"success": True, **data})
    except FileNotFoundError:
        return JsonResponse({"success": False, "error": f"Fayl topilmadi: {file_path}"}, status=404)
    except PermissionError as e:
        return JsonResponse({"success": False, "error": str(e)}, status=403)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@require_http_methods(["POST"])
def api_save_file(request, room_slug):
    room = get_object_or_404(Room, slug=room_slug)
    folder_name = room.folder_name or room.slug

    try:
        body = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({"success": False, "error": "Noto'g'ri JSON formati"}, status=400)

    file_path = body.get('path', '').strip()
    content = body.get('content', '')

    if not file_path:
        return JsonResponse({"success": False, "error": "Fayl yo'li ko'rsatilmadi"}, status=400)

    try:
        res = file_manager.save_file(folder_name, file_path, content)
        return JsonResponse(res)
    except PermissionError as e:
        return JsonResponse({"success": False, "error": str(e)}, status=403)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@require_http_methods(["POST"])
def api_create_file(request, room_slug):
    room = get_object_or_404(Room, slug=room_slug)
    folder_name = room.folder_name or room.slug

    try:
        body = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({"success": False, "error": "Noto'g'ri JSON formati"}, status=400)

    rel_path = body.get('path', '').strip()
    item_type = body.get('type', 'file')

    if not rel_path:
        return JsonResponse({"success": False, "error": "Yo'l ko'rsatilmadi"}, status=400)

    try:
        res = file_manager.create_item(folder_name, rel_path, item_type)
        return JsonResponse(res)
    except FileExistsError as e:
        return JsonResponse({"success": False, "error": str(e)}, status=409)
    except PermissionError as e:
        return JsonResponse({"success": False, "error": str(e)}, status=403)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@require_http_methods(["POST"])
def api_delete_file(request, room_slug):
    room = get_object_or_404(Room, slug=room_slug)
    folder_name = room.folder_name or room.slug

    try:
        body = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({"success": False, "error": "Noto'g'ri JSON formati"}, status=400)

    rel_path = body.get('path', '').strip()

    if not rel_path:
        return JsonResponse({"success": False, "error": "Yo'l ko'rsatilmadi"}, status=400)

    try:
        res = file_manager.delete_item(folder_name, rel_path)
        return JsonResponse(res)
    except FileNotFoundError as e:
        return JsonResponse({"success": False, "error": str(e)}, status=404)
    except PermissionError as e:
        return JsonResponse({"success": False, "error": str(e)}, status=403)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


def api_version(request):
    from django.conf import settings
    return JsonResponse({
        "status": "ok",
        "csrf_trusted_origins": getattr(settings, 'CSRF_TRUSTED_ORIGINS', []),
    })


def preview_redirect(request):
    return redirect('/preview/')


def preview_proxy(request, subpath=""):
    target_url = f"http://127.0.0.1:8001/{subpath}"
    query = request.META.get('QUERY_STRING', '')
    if query:
        target_url = f"{target_url}?{query}"

    headers = {
        'User-Agent': request.META.get('HTTP_USER_AGENT', 'Django-Code-Preview'),
        'Accept': request.META.get('HTTP_ACCEPT', '*/*'),
        'Host': '127.0.0.1:8001',
    }
    if 'HTTP_COOKIE' in request.META:
        headers['Cookie'] = request.META['HTTP_COOKIE']
    if 'CONTENT_TYPE' in request.META:
        headers['Content-Type'] = request.META['CONTENT_TYPE']
    elif 'HTTP_CONTENT_TYPE' in request.META:
        headers['Content-Type'] = request.META['HTTP_CONTENT_TYPE']

    body = request.body if request.method in ['POST', 'PUT', 'PATCH'] else None

    req = urllib.request.Request(target_url, data=body, headers=headers, method=request.method)

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            content = response.read()
            content_type = response.headers.get('Content-Type', 'text/html')

            if 'text/html' in content_type.lower():
                try:
                    html_text = content.decode('utf-8', errors='replace')
                    html_text = re.sub(r'href="/(?!preview/)', 'href="/preview/', html_text)
                    html_text = re.sub(r"href='/(?!preview/)", "href='/preview/", html_text)
                    html_text = re.sub(r'src="/(?!preview/)', 'src="/preview/', html_text)
                    html_text = re.sub(r"src='/(?!preview/)", "src='/preview/", html_text)
                    html_text = re.sub(r'action="/(?!preview/)', 'action="/preview/', html_text)
                    html_text = re.sub(r"action='/(?!preview/)", "action='/preview/", html_text)
                    content = html_text.encode('utf-8')
                except Exception:
                    pass

            resp = HttpResponse(content, status=response.status, content_type=content_type)
            for k, v in response.headers.items():
                if k.lower() == 'location':
                    if v.startswith('http://127.0.0.1:8001/'):
                        resp['Location'] = v.replace('http://127.0.0.1:8001/', '/preview/')
                    elif v.startswith('/') and not v.startswith('/preview/'):
                        resp['Location'] = f"/preview{v}"
                    else:
                        resp['Location'] = v
                elif k.lower() == 'set-cookie':
                    resp['Set-Cookie'] = v
                elif k.lower() not in ['content-length', 'transfer-encoding', 'connection']:
                    resp[k] = v
            return resp

    except urllib.error.HTTPError as e:
        err_content = e.read()
        err_type = e.headers.get('Content-Type', 'text/html')
        resp = HttpResponse(err_content, status=e.code, content_type=err_type)
        for k, v in e.headers.items():
            if k.lower() not in ['content-length', 'transfer-encoding', 'connection']:
                resp[k] = v
        return resp

    except Exception:
        fallback_html = """<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loyiha ishga tushmagan - Django Code</title>
    <style>
        body { margin: 0; padding: 0; min-height: 100vh; background-color: #0b0f19; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; display: flex; align-items: center; justify-content: center; }
        .box { background: #131b2e; border: 1px solid #1e293b; border-radius: 14px; padding: 36px; max-width: 520px; width: 90%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .icon { width: 52px; height: 52px; margin: 0 auto 18px; color: #38bdf8; }
        h1 { font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #f1f5f9; }
        p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px; }
        .cmd { background: #070a13; border: 1px solid #1e293b; padding: 12px 16px; border-radius: 8px; font-family: monospace; color: #4ade80; font-size: 14px; margin-bottom: 24px; user-select: all; }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; font-size: 13px; border: none; cursor: pointer; transition: background 0.2s; }
        .btn:hover { background: #1d4ed8; }
        .countdown { margin-top: 18px; font-size: 12px; color: #64748b; }
    </style>
</head>
<body>
    <div class="box">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h1>Loyiha hali ishga tushirilmadi</h1>
        <p>Brauzerda saytingizni ko'rish uchun avval IDE terminalida quyidagi buyruqni bering:</p>
        <div class="cmd">python manage.py runserver 8001</div>
        <button class="btn" onclick="location.reload()">Sahifani yangilash</button>
        <div class="countdown" id="cd">Avtomatik yangilanadi: 4s</div>
    </div>
    <script>
        let s = 4;
        setInterval(() => {
            s--;
            if (s <= 0) {
                location.reload();
            } else {
                document.getElementById('cd').innerText = 'Avtomatik yangilanadi: ' + s + 's';
            }
        }, 1000);
    </script>
</body>
</html>"""
        return HttpResponse(fallback_html, status=502, content_type='text/html')