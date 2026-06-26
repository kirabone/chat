from django.shortcuts import render
from userProfile.models import Profile
from django.http import HttpResponse

def changeUsername(request, newname):
    if not Profile.objects.filter(username = newname).exists():
        return htt("failed")
    Profile.objects.filter(username = newname).delete()
    Profile.objects.create(username = newname)
    return HttpResponse("success")
