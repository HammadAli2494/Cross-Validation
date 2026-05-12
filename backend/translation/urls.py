from django.urls import path

from . import views


urlpatterns = [
    path("health/", views.health, name="health"),
    path("signs/", views.signs, name="signs"),
    path("translate/landmarks/", views.translate_landmarks, name="translate-landmarks"),
    path("translate/frame/", views.translate_frame, name="translate-frame"),
]
