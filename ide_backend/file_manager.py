import os
from pathlib import Path
from django.conf import settings

IGNORED_NAMES = {
    '__pycache__',
    '.git',
    '.idea',
    '.vscode',
    '.pytest_cache',
    '.mypy_cache',
    '.venv',
    'venv',
}

IGNORED_EXTENSIONS = {'.pyc', '.pyo'}


def get_room_storage_root() -> Path:
    storage_dir = getattr(settings, 'ROOMS_STORAGE_DIR', settings.BASE_DIR / 'rooms_storage')
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir.resolve()


def get_room_dir(folder_name: str) -> Path:
    if not folder_name:
        raise ValueError("Xona papkasi nomi ko'rsatilmadi!")

    root = get_room_storage_root()
    safe_folder_name = os.path.basename(folder_name.strip("/\\"))
    room_path = (root / safe_folder_name).resolve()

    if not str(room_path).startswith(str(root)):
        raise PermissionError("Ruxsat berilmagan papka!")

    room_path.mkdir(parents=True, exist_ok=True)
    return room_path


def resolve_safe_path(folder_name: str, relative_path: str) -> Path:
    room_dir = get_room_dir(folder_name)
    norm_rel = os.path.normpath(relative_path or "").lstrip("/\\")
    if norm_rel in ("", "."):
        return room_dir

    target_path = (room_dir / norm_rel).resolve()
    try:
        common = os.path.commonpath([str(room_dir), str(target_path)])
    except ValueError:
        raise PermissionError("Ruxsat berilmagan yo'l!")

    if common != str(room_dir):
        raise PermissionError("Directory traversal taqiqlangan!")

    return target_path


def get_file_tree(folder_name: str) -> list:
    room_dir = get_room_dir(folder_name)

    def scan_dir(current_path: Path) -> list:
        items = []
        try:
            entries = sorted(list(current_path.iterdir()), key=lambda e: (not e.is_dir(), e.name.lower()))
        except (PermissionError, OSError):
            return items

        for entry in entries:
            name = entry.name
            if name in IGNORED_NAMES or entry.suffix in IGNORED_EXTENSIONS:
                continue

            rel_path = entry.relative_to(room_dir).as_posix()

            if entry.is_dir():
                items.append({
                    "name": name,
                    "path": rel_path,
                    "type": "directory",
                    "children": scan_dir(entry)
                })
            else:
                items.append({
                    "name": name,
                    "path": rel_path,
                    "type": "file",
                    "size": entry.stat().st_size
                })
        return items

    return scan_dir(room_dir)


def is_binary_file(filepath: Path) -> bool:
    known_binary_exts = {'.sqlite3', '.db', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.exe', '.bin'}
    if filepath.suffix.lower() in known_binary_exts:
        return True
    try:
        with open(filepath, 'rb') as f:
            chunk = f.read(1024)
            if b'\x00' in chunk:
                return True
    except Exception:
        pass
    return False


def read_file(folder_name: str, relative_path: str) -> dict:
    target_path = resolve_safe_path(folder_name, relative_path)

    if not target_path.exists():
        raise FileNotFoundError(f"Fayl topilmadi: {relative_path}")

    if target_path.is_dir():
        raise IsADirectoryError(f"Bu papka, fayl emas: {relative_path}")

    if is_binary_file(target_path):
        return {
            "path": relative_path,
            "content": f"[Binar fayl ({target_path.name}) - tahrirlash imkoni yo'q]",
            "is_binary": True,
            "size": target_path.stat().st_size
        }

    try:
        with open(target_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(target_path, 'r', encoding='latin-1', errors='replace') as f:
            content = f.read()

    return {
        "path": relative_path,
        "content": content,
        "is_binary": False,
        "size": target_path.stat().st_size
    }


def save_file(folder_name: str, relative_path: str, content: str) -> dict:
    target_path = resolve_safe_path(folder_name, relative_path)

    if target_path.is_dir():
        raise IsADirectoryError("Papka ustiga fayl yozib bo'lmaydi!")

    target_path.parent.mkdir(parents=True, exist_ok=True)

    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return {
        "success": True,
        "path": relative_path,
        "size": target_path.stat().st_size
    }


def create_item(folder_name: str, relative_path: str, item_type: str = "file") -> dict:
    target_path = resolve_safe_path(folder_name, relative_path)

    if target_path.exists():
        raise FileExistsError(f"Bu nomdagi fayl yoki papka allaqachon mavjud: {relative_path}")

    if item_type == "directory":
        target_path.mkdir(parents=True, exist_ok=True)
    else:
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.touch(exist_ok=False)

    return {
        "success": True,
        "path": relative_path,
        "type": item_type
    }


def delete_item(folder_name: str, relative_path: str) -> dict:
    target_path = resolve_safe_path(folder_name, relative_path)
    room_dir = get_room_dir(folder_name)

    if target_path == room_dir:
        raise PermissionError("Loyiha asosiy ildiz papkasini o'chirib bo'lmaydi!")

    if not target_path.exists():
        raise FileNotFoundError(f"Topilmadi: {relative_path}")

    if target_path.is_dir():
        import shutil
        shutil.rmtree(target_path)
    else:
        target_path.unlink()

    return {
        "success": True,
        "path": relative_path
    }
