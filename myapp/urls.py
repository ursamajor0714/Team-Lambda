# ─────────────────────────────────────────────────────────────────
# [React 전환] URL을 전부 /api/ 스타일로 다시 씀.
#   기존엔 path('home/', views.home) 처럼 페이지 URL이었는데,
#   React 전환 후엔 데이터 API URL만 남음. (페이지 라우팅은 React Router가 담당)
# ─────────────────────────────────────────────────────────────────
from django.urls import path
from . import views

urlpatterns = [
    # CSRF 토큰 발급 (React 첫 진입 시 1회 호출)
    path('csrf/', views.csrf, name='csrf'),

    # 인증
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/me/', views.me, name='me'),

    # 글
    path('posts/', views.post_list, name='post_list'),
    path('posts/create/', views.post_create, name='post_create'),
    path('posts/<int:pk>/', views.post_detail, name='post_detail'),
    path('posts/<int:pk>/like/', views.like_post, name='like_post'),
    path('posts/<int:pk>/hate/', views.hate_post, name='hate_post'),
    path('posts/<int:pk>/comments/', views.comment_create, name='comment_create'),
]
