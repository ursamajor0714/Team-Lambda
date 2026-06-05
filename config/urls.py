from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # [React 전환] 기존엔 path('', ...) 였지만 이제 모든 API는 /api/ 아래로
    path('api/', include('myapp.urls')),
]
