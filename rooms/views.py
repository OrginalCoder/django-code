import json
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseBadRequest
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