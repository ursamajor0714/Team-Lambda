# [React 전환] 새로 만든 파일
# 역할: Django 모델 객체(Post, Comment) → JSON 으로 변환해주는 다리 역할
#       기존엔 template(home.html, post_detail.html)이 모델을 직접 받아서 HTML로 만들었지만,
#       React로 바뀌면서 "JSON"으로 보내야 하기 때문에 Serializer가 필요해짐
from rest_framework import serializers
from .models import Post, Comment


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['id', 'post', 'content', 'user', 'date']
        read_only_fields = ['user', 'date']


class PostListSerializer(serializers.ModelSerializer):
    """홈(목록) 화면용 — 댓글 수만 같이 내려주고 본문은 짧게"""
    comment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'title', 'user', 'date', 'views', 'likes', 'hates', 'comment_count']


class PostDetailSerializer(serializers.ModelSerializer):
    """상세 화면용 — 댓글, 이전/다음 글까지 같이 내려줌"""
    comments = CommentSerializer(source='comment_set', many=True, read_only=True)
    prev_post = serializers.SerializerMethodField()
    next_post = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'user', 'date', 'views',
                  'likes', 'hates', 'comments', 'prev_post', 'next_post']

    def get_prev_post(self, obj):
        prev = Post.objects.filter(id__lt=obj.id).order_by('-id').first()
        return {'id': prev.id, 'title': prev.title} if prev else None

    def get_next_post(self, obj):
        nxt = Post.objects.filter(id__gt=obj.id).order_by('id').first()
        return {'id': nxt.id, 'title': nxt.title} if nxt else None
