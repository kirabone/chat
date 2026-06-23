from django.shortcuts import render
from .models import Relationship
from django.contrib.auth.models import User
from django.http import JsonResponse, HttpResponse
from django.db.models import Q
from userProfile.models import Profile
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods

@login_required
@require_http_methods(["GET"])
def friendList(request):    
    friends = Relationship.objects.filter(Q(status = "F", actor = request.user) | Q(status= "F" ,acted = request.user))
    friendList = []
    for friend in friends:
        if friend.actor == request.user:
            friendList.append(friend.acted.username)
        else:
            friendList.append(friend.actor.username)
    return JsonResponse(friendList, safe=False)

@login_required
@require_http_methods(["GET"])      
def blockList(request):
    blocked = Relationship.objects.filter(status = "B", actor = request.user)
    blockList = []
    for block in blocked:
        blockList.append(block.acted.username)
    return JsonResponse(blockList, safe=False)
    
@login_required
@require_http_methods(["GET"])    
def requestSent(request):
    requests = Relationship.objects.filter(status = "R", actor = request.user)
    requestList = []
    for relation in requests:
        requestList.append(relation.acted.username)
    return JsonResponse(requestList, safe=False)

@login_required
@require_http_methods(["GET"])
def requestRecv(request):
    requests = Relationship.objects.filter(status = "R", acted = request.user)
    requestList = []
    for relation in requests:
        requestList.append(relation.actor.username)
    return JsonResponse(requestList, safe=False)

@login_required
@require_http_methods(["GET"])
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

@login_required
@require_http_methods(["GET"])
def unblockUser(request, user):
    target = Profile.objects.filter(username = user).first()
    if not target:
        return HttpResponse("failed")
    Relationship.objects.filter(acted = target.user, actor = request.user, status = 'B').delete()
    return HttpResponse("succss")
   
@login_required
@require_http_methods(["GET"])
def request(request, user):
    target = Profile.objects.filter(username = user).first()
    if not target:
        return HttpResponse("failed")   
    if Relationship.objects.filter(Q(acted = target.user, actor = request.user, status = 'B') | Q(actor = target.user, acted = request.user, status = 'B')| Q(acted = target.user, actor = request.user, status = 'F') | Q(actor = target.user, acted = request.user, status = 'F') | Q(acted = target.user, actor = request.user, status = 'R') | Q(actor = target.user, acted = request.user, status = 'R')).exists():
        return HttpResponse("success")
    else:
        Relationship.objects.create(acted = target.user, actor = request.user, status = 'R')
        return HttpResponse("success")
    
@login_required
@require_http_methods(["GET"])
def reject(request, user):
    target = Profile.objects.filter(username = user).first()
    if not target:
        return HttpResponse("failed")
    if Relationship.objects.filter(actor = target.user, acted = request.user, status="R").exists():
        Relationship.objects.filter(actor = target.user, acted = request.user, status="R").delete()
        return HttpResponse("success")
    else:
        return HttpResponse("failed")

@login_required
@require_http_methods(["GET"])
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

@login_required
@require_http_methods(["GET"])
def cancelRequest(request, user):
    target = Profile.objects.filter(username = user).first()
    if not target: 
        return HttpResponse("failed")
    if Relationship.objects.filter(actor = request.user, acted = target.user, status="R").exists():
        Relationship.objects.filter(actor = request.user, acted = target.user, status="R").delete()
        return HttpResponse("success")


def _relationship_status(request_user, target_user):
    if Relationship.objects.filter(
        Q(actor=request_user, acted=target_user, status="B") |
        Q(actor=target_user, acted=request_user, status="B")
    ).exists():
        return "blocked"

    if Relationship.objects.filter(
        Q(actor=request_user, acted=target_user, status="F") |
        Q(actor=target_user, acted=request_user, status="F")
    ).exists():
        return "friend"

    if Relationship.objects.filter(
        actor=request_user, acted=target_user, status="R"
    ).exists():
        return "request_sent"

    if Relationship.objects.filter(
        actor=target_user, acted=request_user, status="R"
    ).exists():
        return "request_received"

    return "none"

@login_required
@require_http_methods(["GET"])
def search(request, search_query=""):
    query = (search_query or "").strip()
    if not query:
        return JsonResponse([], safe=False)

    users = User.objects.exclude(pk=request.user.pk).filter(
        Q(profile__username__icontains=query)
    ).distinct()

    results = []

    for target_user in users:
        profile = Profile.objects.filter(user=target_user).first()
        if not profile:
            profile = Profile.objects.create(
                user=target_user,
                username=target_user.username[:16],
            )

        status = _relationship_status(request.user, target_user)

        results.append({
            "username": profile.username,
            "status": status,
        })

    return JsonResponse(results, safe=False)

@login_required
@require_http_methods(["GET"])
def unfriend(request, user):

    target = Profile.objects.filter(username=user).first()
    if not target:
        return HttpResponse("failed")
    
    
    Relationship.objects.filter(
        Q(actor=request.user, acted=target.user, status="F") |
        Q(actor=target.user, acted=request.user, status="F")
    ).delete()
    
    return HttpResponse("success")



