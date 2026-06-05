# ─────────────────────────────────────────────────────────────────
# [React 전환] 이 파일은 거의 다 새로 작성됨.
#   - 기존: render(request, 'home.html', {...})   → HTML 페이지 반환
#   - 변경: Response({...}) 또는 JsonResponse(...) → JSON 데이터만 반환
#   화면 그리는 일은 React(frontend/src/pages/*.jsx)가 담당함.
# ─────────────────────────────────────────────────────────────────
from datetime import timedelta

from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.db.models import Count
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Post, Comment, Visitor
from .serializers import (
    PostListSerializer,
    PostDetailSerializer,
    CommentSerializer,
)


# ─────────────────────────────────────────────────────────────────
# [React 전환] CSRF 토큰 발급용 엔드포인트 (신규)
#   React에서 첫 진입 시 이 API를 한 번 호출해서 csrftoken 쿠키를 받아둠.
#   이후 POST 요청 시 X-CSRFToken 헤더에 그 값을 실어 보냄.
# ─────────────────────────────────────────────────────────────────
@require_GET
def csrf(request):
    return JsonResponse({'csrfToken': get_token(request)})


# ─────────────────────────────────────────────────────────────────
# 글 목록 (기존 home 뷰의 핵심 로직 유지, 응답만 JSON으로)
# ─────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([AllowAny])
def post_list(request):
    query = request.GET.get('query', '')
    search_type = request.GET.get('search_type', 'title')
    search_period = request.GET.get('search_period', 'all')
    page = int(request.GET.get('page', 1))
    page_size = 30

    posts = Post.objects.annotate(comment_count=Count('comment')).order_by('-id')

    # 검색 필터 (기존 로직 그대로)
    if query:
        if search_type == 'title':
            posts = posts.filter(title__icontains=query)
        elif search_type == 'content':
            posts = posts.filter(content__icontains=query)
        elif search_type == 'title_content':
            posts = posts.filter(title__icontains=query) | posts.filter(content__icontains=query)
        elif search_type == 'user':
            posts = posts.filter(user__icontains=query)

    # 기간 필터 (기존 로직 그대로)
    today = timezone.now().date()
    if search_period == 'today':
        posts = posts.filter(date__date=today)
    elif search_period == 'week':
        posts = posts.filter(date__date__gte=today - timedelta(days=7))
    elif search_period == 'month':
        posts = posts.filter(date__date__gte=today - timedelta(days=30))

    # 페이지네이션 (기존엔 Paginator 사용, 여기선 슬라이싱)
    total = posts.count()
    start = (page - 1) * page_size
    posts_page = posts[start:start + page_size]

    # 방문자 기록 (기존 home 뷰 로직)
    ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
    if ip and not Visitor.objects.filter(ip=ip, date=today).exists():
        Visitor.objects.create(ip=ip)

    return Response({
        'posts': PostListSerializer(posts_page, many=True).data,
        'page': page,
        'page_size': page_size,
        'total': total,
        'has_next': start + page_size < total,
        # [React 전환] 기존 home.html에 표시되던 상단 통계도 같이 내려줌
        'today_posts': Post.objects.filter(date__date=today).count(),
        'today_comments': Comment.objects.filter(date__date=today).count(),
        'today_visitors': Visitor.objects.filter(date=today).count(),
    })


# ─────────────────────────────────────────────────────────────────
# 글 상세 + 작성 (기존 post_detail + write 뷰를 한 함수로 합침)
#   GET /api/posts/<pk>/ → 상세 조회
# ─────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([AllowAny])
def post_detail(request, pk):
    try:
        post = Post.objects.get(pk=pk)
    except Post.DoesNotExist:
        return Response({'detail': '존재하지 않는 글입니다.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(PostDetailSerializer(post).data)


# ─────────────────────────────────────────────────────────────────
# 글 작성 (기존 write 뷰의 POST 분기)
#   POST /api/posts/  body: { title, content }
# ─────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def post_create(request):
    title = request.data.get('title')
    content = request.data.get('content')
    if not title or not content:
        return Response({'detail': '제목과 내용을 모두 입력해주세요.'}, status=status.HTTP_400_BAD_REQUEST)
    user = request.user.username if request.user.is_authenticated else '익명'
    post = Post.objects.create(title=title, content=content, user=user)
    return Response({'id': post.id}, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────────────────────────
# 좋아요 / 싫어요 (기존 like_post, hate_post)
#   세션 기반 중복 방지 로직은 그대로 유지
# ─────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def like_post(request, pk):
    try:
        post = Post.objects.get(pk=pk)
    except Post.DoesNotExist:
        return Response({'detail': '존재하지 않는 글입니다.'}, status=status.HTTP_404_NOT_FOUND)
    session_key = f'liked_{pk}'
    if not request.session.get(session_key):
        post.likes += 1
        post.save()
        request.session[session_key] = True
    return Response({'likes': post.likes})


@api_view(['POST'])
@permission_classes([IsAuthenticated])  # 기존엔 @login_required
def hate_post(request, pk):
    try:
        post = Post.objects.get(pk=pk)
    except Post.DoesNotExist:
        return Response({'detail': '존재하지 않는 글입니다.'}, status=status.HTTP_404_NOT_FOUND)
    session_key = f'hated_{pk}'
    if not request.session.get(session_key):
        post.hates += 1
        post.save()
        request.session[session_key] = True
    return Response({'hates': post.hates})


# ─────────────────────────────────────────────────────────────────
# 댓글 작성 (기존 comment 뷰)
#   POST /api/posts/<pk>/comments/  body: { content }
# ─────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def comment_create(request, pk):
    try:
        post = Post.objects.get(pk=pk)
    except Post.DoesNotExist:
        return Response({'detail': '존재하지 않는 글입니다.'}, status=status.HTTP_404_NOT_FOUND)
    content = request.data.get('content')
    if not content:
        return Response({'detail': '댓글 내용을 입력해주세요.'}, status=status.HTTP_400_BAD_REQUEST)
    user = request.user.username if request.user.is_authenticated else '익명'
    cmt = Comment.objects.create(post=post, content=content, user=user)
    return Response(CommentSerializer(cmt).data, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────────────────────────
# 회원가입 / 로그인 / 로그아웃 / 내 정보
#   기존엔 Django 기본 LoginView + register 뷰 + 템플릿이 처리했지만
#   React에선 JSON으로 받고 JSON으로 답해야 함.
#   forms.py가 사라졌으므로 username 검증 로직(13자, 영숫자만)을 여기서 직접 수행.
# ─────────────────────────────────────────────────────────────────
import re

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    username = request.data.get('username', '').strip()
    password1 = request.data.get('password1', '')
    password2 = request.data.get('password2', '')

    # 기존 CustomRegisterForm.clean_username 의 검증을 그대로 옮겨옴
    if len(username) > 13:
        return Response({'detail': '아이디는 13자리 이하로 입력해주세요.'}, status=400)
    if not re.match(r'^[A-Za-z0-9]+$', username):
        return Response({'detail': '아이디는 영어 대소문자와 숫자만 가능합니다.'}, status=400)
    if password1 != password2:
        return Response({'detail': '비밀번호가 일치하지 않습니다.'}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'detail': '이미 사용중인 아이디입니다.'}, status=400)

    user = User.objects.create_user(username=username, password=password1)
    login(request, user)  # 가입 후 자동 로그인 (기존 동작 유지)
    return Response({'username': user.username}, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({'detail': '아이디 또는 비밀번호가 올바르지 않습니다.'}, status=400)
    login(request, user)
    return Response({'username': user.username})


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request)
    return Response({'detail': '로그아웃 되었습니다.'})


@api_view(['GET'])
@permission_classes([AllowAny])
def me(request):
    """React가 새로고침될 때마다 '나 누구야?' 물어보는 엔드포인트"""
    if request.user.is_authenticated:
        return Response({'username': request.user.username, 'is_authenticated': True})
    return Response({'is_authenticated': False})
