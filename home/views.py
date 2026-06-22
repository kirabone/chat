from django.shortcuts import render

def landing(request):
    return render(request, "landing/index.html")

def home(request):
    return render(request, "home/index.html")