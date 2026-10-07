import os
import sys
import json
import asyncio
from pathlib import Path
from django.conf import settings
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rooms.models import Room
from ide_backend import file_manager


class TerminalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_slug = self.scope['url_route']['kwargs']['room_slug']
        self.room = await self.get_room(self.room_slug)

        if not self.room:
            await self.accept()
            await self.send(f"\r\n\x1b[31m[Xatolik] '{self.room_slug}' nomli xona topilmadi!\x1b[0m\r\n")
            await self.close(code=4404)
            return

        await self.accept()

        self.folder_name = (self.room.folder_name or self.room.slug or f"room_{self.room.id}").strip()
        self.room_dir = file_manager.get_room_dir(self.folder_name)
        self.is_connected = True
        self.pty_process = None
        self.read_task = None

        welcome_banner = (
            f"\r\n\x1b[1;32m=== Django Code Terminal ({self.folder_name}) ===\x1b[0m\r\n"
            f"\x1b[90mXona papkasi: \x1b[33mrooms_storage/{self.folder_name}\x1b[0m\r\n\r\n"
            f"\x1b[1;33mDIQQAT: 8000-portda asosiy IDE ishlamoqda!\x1b[0m\r\n"
            f"\x1b[90mO'z loyihangizni ishga tushirishda port ko'rsating (8001):\x1b[0m\r\n"
            f"  -> \x1b[1;32mpython manage.py runserver 8001\x1b[0m\r\n"
            f"  -> Brauzerda ochish manzili: \x1b[1;36mhttp://127.0.0.1:8001/\x1b[0m\r\n\r\n"
        )
        await self.send(text_data=welcome_banner)

        try:
            self.start_pty()
            self.read_task = asyncio.create_task(self.read_from_pty())
        except Exception as e:
            await self.send(f"\r\n\x1b[31mTerminalni ishga tushirishda xatolik: {str(e)}\x1b[0m\r\n")
            await self.close()

    @database_sync_to_async
    def get_room(self, slug):
        try:
            return Room.objects.get(slug=slug)
        except Room.DoesNotExist:
            try:
                return Room.objects.get(folder_name=slug)
            except (Room.DoesNotExist, Room.MultipleObjectsReturned):
                if str(slug).isdigit():
                    try:
                        return Room.objects.get(id=int(slug))
                    except Room.DoesNotExist:
                        pass
                return None

    def get_terminal_env(self):
        env = os.environ.copy()
        venv_path = Path(settings.BASE_DIR) / '.venv'
        if venv_path.exists():
            scripts_dir = venv_path / ('Scripts' if os.name == 'nt' else 'bin')
            if scripts_dir.exists():
                env['PATH'] = str(scripts_dir) + os.pathsep + env.get('PATH', '')
                env['VIRTUAL_ENV'] = str(venv_path)

        env['PYTHONUNBUFFERED'] = '1'
        env['TERM'] = 'xterm-256color'
        if os.name == 'nt':
            env['PROMPT'] = f"({self.folder_name}) $P$G "
        return env

    def start_pty(self):
        env = self.get_terminal_env()
        cwd = str(self.room_dir)

        if os.name == 'nt':
            try:
                import winpty
                comspec = os.environ.get('COMSPEC', 'cmd.exe')
                self.pty_process = winpty.PtyProcess.spawn(
                    comspec,
                    cwd=cwd,
                    env=env,
                    dimensions=(24, 80)
                )
            except ImportError as err:
                raise RuntimeError("Windows uchun 'pywinpty' kutubxonasi o'rnatilmagan!") from err
        else:
            try:
                import ptyprocess
                shell = os.environ.get('SHELL', '/bin/bash')
                self.pty_process = ptyprocess.PtyProcessUnicode.spawn(
                    [shell],
                    cwd=cwd,
                    env=env,
                    dimensions=(24, 80)
                )
            except ImportError:
                raise RuntimeError("Linux uchun 'ptyprocess' kutubxonasi talab qilinadi.")

    async def read_from_pty(self):
        while self.is_connected and self.pty_process:
            try:
                if not self.pty_process.isalive():
                    break
                chunk = await asyncio.to_thread(self.pty_process.read, 1024)
                if chunk and self.is_connected:
                    await self.send(text_data=chunk)
            except (EOFError, OSError):
                break
            except asyncio.CancelledError:
                break
            except Exception:
                break

        if self.is_connected:
            await self.send("\r\n\x1b[33mTerminal sessiyasi tugatildi.\x1b[0m\r\n")

    def write_pty(self, data):
        if self.pty_process and self.is_connected:
            try:
                self.pty_process.write(data)
            except Exception:
                pass

    def resize_pty(self, rows, cols):
        if self.pty_process and self.is_connected:
            try:
                self.pty_process.setwinsize(rows, cols)
            except Exception:
                pass

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            payload = json.loads(text_data)
            if isinstance(payload, dict):
                action = payload.get('type')
                if action == 'resize':
                    rows = int(payload.get('rows', 24))
                    cols = int(payload.get('cols', 80))
                    self.resize_pty(rows, cols)
                    return
                elif action == 'input':
                    self.write_pty(payload.get('data', ''))
                    return
        except (ValueError, TypeError):
            pass

        self.write_pty(text_data)

    async def disconnect(self, close_code):
        self.is_connected = False
        if self.read_task:
            self.read_task.cancel()

        if self.pty_process:
            try:
                self.pty_process.terminate()
            except Exception:
                pass
            self.pty_process = None
