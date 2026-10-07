from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/terminal/(?P<room_slug>[^/]+)/?$', consumers.TerminalConsumer.as_asgi()),
]
