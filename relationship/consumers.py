from channels.generic.websocket import AsyncWebsocketConsumer
from relationship.models import Relation
from django.db.models import Q
from userProfile.models import Profile
import json
from channels.db import database_sync_to_async

class RelationshipConsumer(AsyncWebsocketConsumer):

    @database_sync_to_async
    def getData(self):
        user = self.scope["user"]
        friendList = list((Relation.objects.filter(Q(actor = user, relation = 'F') 
            |Q(acted = user, relation = "F") )).values())
        blockList = list(Relation.objects.filter(actor = user, relation = 'B').values())
        recvRequests = list(Relation.objects.filter(acted = user, relation = "R").values())
        SentRequests = list(Relation.objects.filter(actor = user, relation = "R").values())
        return friendList, blockList, recvRequests, SentRequests
        
    async def connect(self):
        await self.accept()
        data = await self.getData()
        await self.send(text_data=json.dumps(data))
    
    async def update(self):
        data = await self.getData()
        await self.send(text_data=json.dumps(data))