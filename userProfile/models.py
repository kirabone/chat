from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE )
    usename = models.TextField(max_length=24)
    bio = models.TextField(max_length=256)