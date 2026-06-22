from django.shortcuts import render
from userProfile.models import Profile
from django.http import HttpResponse

def changeUsername(request, username):
    if Profile.objects.filter(username=username).exists():
        return HttpResponse("username taken", status=400)
    Profile.objects.filter(user=request.user).update(username=username)
    return HttpResponse("success")