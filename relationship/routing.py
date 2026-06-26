from django.urls import re_path
from .consumers import RelationshipConsumer

websocket_urlpatterns = [
    re_path(r"ws/Relationship/$", RelationshipConsumer.as_asgi()),
]