from django.shortcuts import render
import json
from django.http import JsonResponse, HttpResponse
from .models import Messages
from userProfile.models import Profile
from relationship.models import Relation
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.db.models import Q

@login_required
@require_http_methods(["GET"])
def loadMessages(request, username):
    receiver = Profile.objects.filter(username = username).first().user
    messages = Messages.objects.filter(Q(sender = request.user, receiver = receiver) 
        | Q(sender = receiver, receiver = request.user)).values("Sender__username", "content")
    return JsonResponse(messages, safe=False)


