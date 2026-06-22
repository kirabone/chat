from django.db import models
from django.contrib.auth.models import User

class Messages(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="recv")
    content = models.TextField(max_length=4096)