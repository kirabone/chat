from relationship.routing import websocket_urlpatterns as relationship_route
from messaging.routing import websocket_urlpatterns as messaging_route

websocket_urlpatterns = (
    relationship_route +
    messaging_route
)