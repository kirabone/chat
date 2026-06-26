from django.urls import path
from . import views

urlpatterns = [
    path('loadmessages/', views.loadMessages)
]