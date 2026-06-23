from django.urls import path
from . import views

urlpatterns = [
    path("search/", views.search),
    path("search/<str:search_query>/", views.search),
    path("friends/", views.friendList),
    path("blocks/", views.blockList),
    path("requests/sent/", views.requestSent),
    path("requests/received/", views.requestRecv),
    path("block/<str:user>/", views.blockUser),
    path("unblock/<str:user>/", views.unblockUser),
    path("request/<str:user>/", views.request),
    path("request/cancel/<str:user>/", views.cancelRequest),
    path("request/accept/<str:user>/", views.accept),
    path("request/reject/<str:user>/", views.reject),
    path("unfriend/<str:user>/", views.unfriend),
]