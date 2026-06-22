from django.shortcuts import render
from relationship.models import Relationship
from messanging.models import Messages
from django.http import JsonResponse, HttpResponse
from django.db.models import Q
from userProfile.models import Profile
import json


def loadChat(request, receiverUsername):
    receiver = Profile.objects.filter(username = receiverUsername).first()
    if not receiver:
        return HttpResponse("user not found", status=404)
    messages = Messages.objects.filter(Q(receiver = request.user , sender = receiver.user) | Q(receiver = receiver.user, sender = request.user))
    messageList = []
    for message in messages:
        messageList.append({message.sender.username:message.content})
    return JsonResponse(messageList, safe=False)

def sendChat(request, receiverUsername):
    receiver = Profile.objects.filter(username = receiverUsername).first()
    if not receiver:
        return HttpResponse("user not found", status=404)
    elif Relationship.objects.filter(Q(acted = receiver.user, actor = request.user, status = 'B') | Q(actor = receiver.user, acted = request.user, status = 'B')).exists():
        return HttpResponse("failed")
    elif Relationship.objects.filter(Q(acted = receiver.user, actor = request.user, status = 'F') | Q(actor = receiver.user, acted = request.user, status = 'F')).exists():
        content = json.loads(request.body)["content"]
        Messages.objects.create(receiver=receiver.user, sender=request.user, content=content)
        return HttpResponse("success")
    return HttpResponse('failed')