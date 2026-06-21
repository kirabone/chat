from django.db import models
from django.contrib.auth.models import User


class Messages(models.Model):
    sender = models.ForeignKey(
        User,
        related_name="sent",
        on_delete=models.CASCADE
    )

    receiver = models.ForeignKey(
        User,
        related_name="recv",
        on_delete=models.CASCADE
    )

    content = models.TextField()

