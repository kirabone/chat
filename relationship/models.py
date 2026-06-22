from django.db import models
from django.contrib.auth.models import User

class Relationship(models.Model):
    actor = models.ForeignKey(User, on_delete=models.CASCADE)
    acted = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(
        max_length=1,
        choices=[
            ("B", "Block"),
            ("F", "Friend"),
            ("R", "Request"),
        ]
    )