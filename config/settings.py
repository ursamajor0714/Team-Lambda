import os
from dotenv import load_dotenv
load_dotenv()
from pathlib import Path
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("SECRET_KEY")
DEBUG = os.environ.get("DEBUG") == "True"

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # [React 전환] DRF + CORS 앱 등록
    'rest_framework',
    'corsheaders',
    'myapp',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # [React 전환] CORS 미들웨어는 가장 위쪽(CommonMiddleware 위)에 둬야 함
    'corsheaders.middleware.CorsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # [React 전환] templaters/ 폴더 삭제됨. 빈 리스트로 변경 (admin 페이지는 APP_DIRS=True로 동작)
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
# [React 전환] static/ 폴더 삭제됨. STATICFILES_DIRS 제거 (admin 정적파일은 collectstatic으로 처리)

# ─────────────────────────────────────────────────────────────────
# [React 전환] 아래는 React 프론트엔드와 통신하기 위한 추가 설정
# ─────────────────────────────────────────────────────────────────

# DRF 기본 설정: 세션 인증 사용
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

# CORS 설정: React 개발 서버(Vite 기본 포트 5173)에서 오는 요청 허용
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
# 쿠키를 주고받으려면 반드시 True (세션 인증 사용 시 필수)
CORS_ALLOW_CREDENTIALS = True

# CSRF 신뢰 origin: React에서 POST 요청 시 CSRF 토큰 검증 통과시키기 위함
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

# 쿠키 SameSite 설정: 다른 origin에서 쿠키 보내려면 Lax 이상 필요
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
# React가 JS에서 CSRF 쿠키를 읽어 헤더에 실어 보내야 하므로 HttpOnly=False
CSRF_COOKIE_HTTPONLY = False
