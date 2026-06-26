from django.shortcuts import render
from .models import Relation
from userProfile.models import Profile
from django.db.models import Q
from django.http import HttpResponse, JsonResponse

def sendRequest(request, username):
    user = Profile.objects.filter(username =username).first().user
    if Relation.objects.filter(
        Q(actor = request.user, acted = user, relation = "F") 
        | Q(acted = request.user, actor = user, relation = 'F') 
        | Q(actor = request.user , acted = user, relation = 'B') 
        | Q(acted = request.user, actor = user, relation = 'R') 
        | Q(actor = request.user , acted = user, relation = 'B') 
        | Q(acted = request.user, actor = user, relation = 'R')).exists():
        return HttpResponse("failed")
    else:
        Relation.objects.create(actor = request.user, acted = user, relation = "R")
        return HttpResponse("success")
    
def accept(request, username):
    user = Profile.objects.filter(username =username).first().user
    if Relation.objects.filter(actor = user, acted = request.user, relation = 'R').exists():
        Relation.objects.filter(actor = user, acted = request.user, relation = 'R').delete()
        Relation.objects.create(actor = user, acted = request.user, relation = 'F')
        return HttpResponse("success")
    else:
        return HttpResponse('failed')
    
def reject(request, username):
    user = Profile.objects.filter(username =username).first().user
    if Relation.objects.filter(actor = user, acted = request.user, relation = 'R').exists():
        Relation.objects.filter(actor = user, acted = request.user, relation = 'R').delete()
        return HttpResponse("success")
    else:
        return HttpResponse('failed')
    
def block(request, username):
    user = Profile.objects.filter(username =username).first().user
    Relation.objects.filter(Q(actor = request.user, acted = user) 
        | Q(actor = user, acted = request.user)).exclude(actor = user, acted = request.user, relation = 'B').delete()
    Relation.objects.create(actor = request.user, acted = user, relation = "B")
    return HttpResponse('success')

def unblock(request, username):
    user = Profile.objects.filter(username =username).first().user
    Relation.objects.delete(actor = request.user, acted = user, relation = "B")
    return HttpResponse("success")

def unfriend(request, username):
    user = Profile.objects.filter(username =username).first().user
    Relation.objects.filter(Q(actor = request.user, acted = user, relation = "F") 
        | Q(actor = user, acted = request.user, relation = 'F')).delete()
    return HttpResponse("success")

def cancelRequest(request , username):
    user = Profile.objects.filter(username =username).first().user
    Relation.objects.filter(Q(actor = request.user, acted = user, relation = "R")).delete()
    return HttpResponse("success")


