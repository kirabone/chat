from django.shortcuts import render

def home(request):
    return render(request, "home/index.html")

def landing(request):
    return render(request, "landing/index.html")