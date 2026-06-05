from django.contrib import admin
from .models import Post, Comment, Visitor

admin.site.register(Post)
admin.site.register(Comment)
admin.site.register(Visitor)

from django.contrib.auth.models import User

