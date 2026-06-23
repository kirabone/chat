from django.shortcuts import render
from userProfile.models import Profile
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods

@login_required
@require_http_methods(["GET"])
def changeUsername(request, username):
    if Profile.objects.filter(username=username).exists():
        return HttpResponse("username taken", status=400)
    Profile.objects.filter(user=request.user).update(username=username)
    return HttpResponse("success")