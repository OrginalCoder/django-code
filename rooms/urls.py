from django.urls import path, re_path
from . import views

app_name = 'rooms'

urlpatterns = [
    path('', views.room_list, name='room_list'),
    path('workspace/<slug:room_slug>/', views.workspace, name='workspace'),
    path('api/<slug:room_slug>/tree/', views.api_file_tree, name='api_file_tree'),
    path('api/<slug:room_slug>/read/', views.api_read_file, name='api_read_file'),
    path('api/<slug:room_slug>/save/', views.api_save_file, name='api_save_file'),
    path('api/<slug:room_slug>/create/', views.api_create_file, name='api_create_file'),
    path('api/<slug:room_slug>/delete/', views.api_delete_file, name='api_delete_file'),
    path('api/version/', views.api_version, name='api_version'),
    path('preview', views.preview_redirect, name='preview_redirect'),
    re_path(r'^preview/(?P<subpath>.*)$', views.preview_proxy, name='preview_proxy'),
]