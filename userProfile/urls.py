from django.urls import path
from . import views

urlpatterns = [
    path("changeusername/<str:username>", views.changeUsername)
]