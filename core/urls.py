from django.urls import path
from . import views
print("CORE URLS FILE LOADED")
urlpatterns = [
    path("search/<str:username>/", views.search),
    path("send/<str:username>/", views.send),
    path("recv/<str:username>/", views.recv),
    path("", views.home)
]