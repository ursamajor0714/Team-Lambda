function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

async function request(path, { method = "GET", body, params } = {}) {
  // 쿼리스트링 조립
  let url = path;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== "" && v !== null,
      ),
    ).toString();
    if (qs) url += "?" + qs;
  }

  const headers = { "Content-Type": "application/json" };
  // 변경 요청(POST/PUT/DELETE)에만 CSRF 헤더 필요
  if (method !== "GET") {
    const token = getCookie("csrftoken");
    if (token) headers["X-CSRFToken"] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || `요청 실패 (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  // 첫 진입 시 1회 호출 → csrftoken 쿠키 저장
  ensureCsrf: () => request("/api/csrf/"),

  // 인증
  me: () => request("/api/auth/me/"),
  login: (username, password) =>
    request("/api/auth/login/", {
      method: "POST",
      body: { username, password },
    }),
  logout: () => request("/api/auth/logout/", { method: "POST" }),
  register: (username, password1, password2) =>
    request("/api/auth/register/", {
      method: "POST",
      body: { username, password1, password2 },
    }),

  // 글
  postList: (params) => request("/api/posts/", { params }),
  postDetail: (pk) => request(`/api/posts/${pk}/`),
  postCreate: (title, content, tag, is_notice) =>
    request("/api/posts/create/", {
      method: "POST",
      body: { title, content, tag },
    }),
  postUpdate: (pk, title, content, tag, is_notice) =>
    request(`/api/posts/${pk}/`, {
      method: "PUT",
      body: { title, content, tag },
    }),
  postDelete: (pk) => request(`/api/posts/${pk}/`, { method: "DELETE" }),
  likePost: (pk) => request(`/api/posts/${pk}/like/`, { method: "POST" }),
  hatePost: (pk) => request(`/api/posts/${pk}/hate/`, { method: "POST" }),
  commentCreate: (pk, content, parentId = null) =>
    request(`/api/posts/${pk}/comments/`, {
      method: "POST",
      body: { content, parent_id: parentId },
    }),
  commentLike: (pk, cid, type) =>
    request(`/api/posts/${pk}/comments/${cid}/like/`, {
      method: "POST",
      body: { type },
    }),
  // 유저
  userProfile: (username) =>
    request(`/api/users/${username}`),

  changePassword: (current_password, new_password, new_password2) =>
    request("/api/auth/change-password/", {
      method: "POST",
      body: { current_password, new_password, new_password2 },
    }),
};
