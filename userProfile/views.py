from django.shortcuts import render
from userProfile.models import Profile
from django.http import HttpResponse

def changeUsername(request, username):
    profile = Profile.objects.filter(username=request.username)
    profile.username = username
    profile.save()
    return HttpResponse("success")
