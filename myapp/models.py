from django.db import models

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    date = models.DateTimeField(auto_now_add=True)
    views = models.IntegerField(default=0)
    user = models.CharField(max_length=20)
    likes = models.IntegerField(default=0)
    hates = models.IntegerField(default=0)
    
class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    content = models.CharField(max_length=100)
    user = models.CharField(max_length=20)
    date = models.DateTimeField(auto_now_add=True)
    
class Visitor(models.Model):
    ip = models.CharField(max_length=45)
    date = models.DateField(auto_now_add=True)
