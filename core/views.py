import json
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q

from .models import Messages


@login_required
@require_http_methods(["GET"])   #confirm the request
def search(request, username):

    users = User.objects.filter(username=username)    #checks if there are users by the name

    lis = [] #empty list

    for user in users:
        lis.append({
            "username": user.username
        })       #for element user in list-like-data-structure users and append the shi into the lis
     
    return JsonResponse(lis, safe=False)        #returns the lis, since json checks for dictionary, we say safe=False

@login_required
@require_http_methods(["POST"])
def send(request, username):

    data = json.loads(request.body)  #since sending needs request body, so we get, username in urls (RESTAPI) and the message in json
                                            

    receiver = User.objects.get(    #then we get the reciever's object from receiver's username from the data json packet
        username=username
    )

    Messages.objects.create(
        sender=request.user,  #sender object= request.user
        receiver=receiver,    #receiver's object
        content=data["message"] #the content text field
    )

    return JsonResponse({   
        "status": "ok"    #returns ok for no official reason
    })

@login_required
@require_http_methods(["GET"])
def recv(request, username):

    other_user = User.objects.get(
        username=username
    )

    messages = (
        Messages.objects
        .filter(
            Q(
                sender=request.user,
                receiver=other_user
            )
            |
            Q(
                sender=other_user,
                receiver=request.user
            )
        )
        .order_by("id")
    )

    data = []

    for message in messages:
        data.append({
            "id": message.id,
            "sender": message.sender.username,
            "receiver": message.receiver.username,
            "message": message.content
        })
    
    return JsonResponse(
        data,
        safe=False
    )
@login_required
@require_http_methods(["GET"])
def home(request):
    return render(request, "core/core.html")