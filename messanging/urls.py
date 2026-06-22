from django.urls import path
from . import views 

urlpatterns = [
    path("send/<str:recieverUsername>/", views.sendChat),
    path("recv/<str:recieverUsername>/", views.loadChat)
]