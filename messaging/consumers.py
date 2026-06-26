from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .models import Messages
from userProfile.models import Profile
from relationship.models import Relation
from django.db.models import Q
from django.http import JsonResponse

online = {}

class MessagingConsumer(AsyncWebsocketConsumer):


    async def connect(self):
        await self.accept()
        online[self.scope["user"]] = self 

    async def disconnect(self, close_code):
        print("disconnected")
        del online[self.scope["user"]]

    async def receive(self, text_data):
        data = json.loads(text_data)["recv"]
        receiver = await Profile.objects.filter(username = data["receiver"]).afirst()
        receiver = receiver.user
        sender = self.scope["user"]
        if not Relation.objects.filter(Q(actor = sender, acted = receiver, relation = "F") | Q(acted = sender, actor = receiver, relation = "F")).aexists():
            await self.send(text_data=json.dumps({
                "status": "failed",
                "reason": "Not friends"
            }))
            return
        content = data["content"]
        await Messages.objects.acreate(sender = sender, receiver = receiver , content = content)
        if receiver in online:
            await online[receiver].sendChat(text_data = json.dumps({"sender":sender.username, "content":content}))
    
    async def sendChat(self, text_data):
        await self.send(text_data=text_data)