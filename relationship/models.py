from django.db import models
from django.contrib.auth.models import User

class Relationship(models.Model):
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="actor")
    acted = models.ForeignKey(User, on_delete=models.CASCADE, related_name="acted")
    status = models.CharField(
        max_length=1,
        choices=[
            ("B", "Block"),
            ("F", "Friend"),
            ("R", "Request"),
        ]
    )