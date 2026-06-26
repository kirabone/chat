from django.db import models
from django.contrib.auth.models import User
class Relation(models.Model):
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="actor")
    acted = models.ForeignKey(User, on_delete=models.CASCADE, related_name="acted")
    relation = models.TextChoices(
        "Relation",
        "F B R"
)