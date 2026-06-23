from django.shortcuts import render
from django.contrib.auth.decorators import login_required

def landing(request):
    return render(request, "landing/index.html")

@login_required(login_url="/accounts/google/login/")
def home(request):
    return render(request, "home/index.html")
