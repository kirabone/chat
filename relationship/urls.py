from django.urls import path
from . import views

urlpatterns = [
    path("accept/<str:username>/", views.accept ),
    path("reject/<str:username>/", views.reject),
    path("request/<str:username>/", views.sendRequest),
    path("cancel/<str:username>/", views.cancelRequest),
    path('block/<str:username>/', views.block),
    path('unblock/<str:username>/', views.unblock),
    path('unfriend/<str:unfriend>/', views.unfriend)
]