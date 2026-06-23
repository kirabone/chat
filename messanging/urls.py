from django.urls import path
from . import views 

urlpatterns = [
    path("send/<str:receiverUsername>/", views.sendChat),
    path("recv/<str:receiverUsername>/", views.loadChat)
]
