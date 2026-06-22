from django.shortcuts import render
from .models import Relationship
from django.http import JsonResponse, HttpResponse
from django.db.models import Q
from userProfile.models import Profile

def friendList(request):    
    friends = Relationship.objects.filter(Q(status = "F", actor = request.user) | Q(status= "F" ,acted = request.user))
    friendList = []
    for friend in friends:
        if friend.actor == request.user:
            friendList.append(friend.acted.username)
        else:
            friendList.append(friend.actor.username)
    return JsonResponse(friendList, safe=False)
        
def blockList(request):
    blocked = Relationship.objects.filter(status = "B", actor = request.user)
    blockList = []
    for block in blocked:
        blockList.append(block.acted.username)
    return JsonResponse(blockList, safe=False)
    
def requestSent(request):
    requests = Relationship.objects.filter(status = "R", actor = request.user)
    requestList = []
    for relation in requests:
        requestList.append(relation.acted.username)
    return JsonResponse(requestList, safe=False)

def requestRecv(request):
    requests = Relationship.objects.filter(status = "R", acted = request.user)
    requestList = []
    for relation in requests:
        requestList.append(relation.actor.username)
    return JsonResponse(requestList, safe=False)

def blockUser(request, user):
    target = Profile.objects.filter(username = user).first()
    if not target:
        return HttpResponse("failed")
    if Relationship.objects.filter(acted = request.user, actor = target.user, status="B").exists():
        mutualBlock = True
    else:
        mutualBlock = False
    Relationship.objects.filter(Q(acted = target.user, actor = request.user) | Q(actor = target.user, acted = request.user)).delete()
    if mutualBlock:
        Relationship.objects.create(acted = target.user, actor = request.user, status="B")
        Relationship.objects.create(actor = target.user, acted = request.user, status="B")
        return HttpResponse("success")
    if not mutualBlock:
        Relationship.objects.create(acted = target.user, actor = request.user, status="B")
        return HttpResponse("success")

def unblockUser(request, user):
    target = Profile.objects.filter(username = user).first()
    if not target:
        return HttpResponse("failed")
    Relationship.objects.filter(acted = target.user, actor = request.user, status = 'B').delete()
    return HttpResponse("succss")
   

def request(request, user):
    target = Profile.objects.filter(username = user).first()
    if not target:
        return HttpResponse("failed")   
    if Relationship.objects.filter(Q(acted = target.user, actor = request.user, status = 'B') | Q(actor = target.user, acted = request.user, status = 'B')| Q(acted = target.user, actor = request.user, status = 'F') | Q(actor = target.user, acted = request.user, status = 'F') | Q(acted = target.user, actor = request.user, status = 'R') | Q(actor = target.user, acted = request.user, status = 'R')).exists():
        return HttpResponse("success")
    else:
        Relationship.objects.create(acted = target.user, actor = request.user, status = 'R')
        return HttpResponse("success")
    
def reject(request, user):
    target = Profile.objects.filter(username = user).first()
    if not target:
        return HttpResponse("failed")
    if Relationship.objects.filter(actor = target.user, acted = request.user, status="R").exists():
        Relationship.objects.filter(actor = target.user, acted = request.user, status="R").delete()
        return HttpResponse("success")
    else:
        return HttpResponse("failed")

def accept(request, user):
    target = Profile.objects.filter(username = user).first()
    if not target:
        return HttpResponse("failed")
    if Relationship.objects.filter(actor = target.user, acted = request.user, status="R").exists():
        Relationship.objects.filter(actor = target.user, acted = request.user, status="R").delete()
        Relationship.objects.create(actor = target.user, acted = request.user, status="F")
        return HttpResponse("success")
    else:
        return HttpResponse("failed")
    
def cancelRequest(request, user):
    target = Profile.objects.filter(username = user).first()
    if not target: 
        return HttpResponse("failed")
    if Relationship.objects.filter(actor = request.user, acted = target.user, status="R").exists():
        Relationship.objects.filter(actor = request.user, acted = target.user, status="R").delete()
        return HttpResponse("success")
    else:
        return HttpResponse("failed")
    
def unfriend(request, user):
    target = Profile.objects.filter(username = user).first()
    if not target:
        return HttpResponse("failed")
    if Relationship.objects.filter(Q(actor = request.user, acted = target.user, status="F") | Q(acted = request.user, actor = target.user, status="F") ):
        Relationship.objects.filter(Q(actor = request.user, acted = target.user, status="F") | Q(acted = request.user, actor = target.user, status="F") ).delete()
        return HttpResponse("success")
    return HttpResponse("failed")


