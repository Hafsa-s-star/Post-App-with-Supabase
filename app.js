import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://uiwmuwqarhngnhppqfqo.supabase.co",
  "sb_publishable_lXI3MvI6rVyWQKQ4P5r2ZA_zP8Ix1D7"
);

// ========================= STATE VARIABLES =========================

let currentUser = null;
let currentUserRole = "user";
let isAdmin = false;

let allPostsData = [];
let allUsersData = [];

let editCard = null;
let editId = null;

// Backgrounds
let selectedBackground = "images/background 1.jpg";
let modalSelectedBackground = "images/background 1.jpg";

// ========================= DOM ELEMENTS =========================

const authContainer = document.getElementById("authContainer");
const signUpForm = document.getElementById("signUpForm");
const loginForm = document.getElementById("loginForm");
const postApp = document.getElementById("postApp");
const feedView = document.getElementById("feedView");
const adminDashboardView = document.getElementById("adminDashboardView");

const profileBtn = document.getElementById("profileBtn");
const dropdown = document.getElementById("profileDropdown");
const navFeedBtn = document.getElementById("navFeedBtn");
const navAdminBtn = document.getElementById("navAdminBtn");
const adminDropdownOption = document.getElementById("adminDropdownOption");
const feedDropdownOption = document.getElementById("feedDropdownOption");

// Profile Dropdown Elements
const userNameEl = document.getElementById("userName");
const userEmailEl = document.getElementById("userEmail");
const userRoleBadgeEl = document.getElementById("userRoleBadge");
const dropdownAvatarEl = document.getElementById("dropdownAvatar");

// ========================= AUTH TAB TOGGLE (LOGIN <-> SIGN UP) =========================

function switchAuthTab(tab) {
  const loginContainer = document.getElementById("loginFormContainer");
  const signUpContainer = document.getElementById("signUpFormContainer");
  const loginToggleBtn = document.getElementById("toggleLoginBtn");
  const signUpToggleBtn = document.getElementById("toggleSignUpBtn");

  if (tab === "signup") {
    if (loginContainer) loginContainer.classList.add("hidden");
    if (signUpContainer) signUpContainer.classList.remove("hidden");
    if (loginToggleBtn) loginToggleBtn.classList.remove("active");
    if (signUpToggleBtn) signUpToggleBtn.classList.add("active");
  } else {
    if (signUpContainer) signUpContainer.classList.add("hidden");
    if (loginContainer) loginContainer.classList.remove("hidden");
    if (signUpToggleBtn) signUpToggleBtn.classList.remove("active");
    if (loginToggleBtn) loginToggleBtn.classList.add("active");
  }
}

function fillAdminCredentials() {
  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  if (emailInput) emailInput.value = "pakistan.hafsa@gmail.com";
  if (passwordInput) passwordInput.value = "hafsa";

  Swal.fire({
    icon: "info",
    title: "Admin Credentials Filled",
    text: "Email: pakistan.hafsa@gmail.com",
    timer: 1200,
    showConfirmButton: false,
  });
}

// ========================= PROFILE DROPDOWN TOGGLE =========================

profileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdown.classList.toggle("hidden");
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target) && !profileBtn.contains(e.target)) {
    dropdown.classList.add("hidden");
  }
});

// ========================= VIEW TOGGLING (FEED <-> ADMIN) =========================

async function toggleView(viewName) {
  dropdown.classList.add("hidden");

  if (viewName === "admin") {
    if (!isAdmin) {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "You do not have Administrator privileges.",
      });
      return;
    }

    feedView.classList.add("hidden");
    adminDashboardView.classList.remove("hidden");

    navFeedBtn.classList.remove("active");
    navAdminBtn.classList.add("active");

    if (adminDropdownOption) adminDropdownOption.classList.add("hidden");
    if (feedDropdownOption) feedDropdownOption.classList.remove("hidden");

    await loadAdminData();
  } else {
    // feed view
    adminDashboardView.classList.add("hidden");
    feedView.classList.remove("hidden");

    navFeedBtn.classList.add("active");
    navAdminBtn.classList.remove("active");

    if (isAdmin && adminDropdownOption) adminDropdownOption.classList.remove("hidden");
    if (feedDropdownOption) feedDropdownOption.classList.add("hidden");

    await getPosts();
  }
}

// ========================= ROLE RESOLUTION =========================

async function checkUserRole(user) {
  if (!user) return "user";

  // Check admin email
  if (user.email && user.email.toLowerCase() === "pakistan.hafsa@gmail.com") {
    return "admin";
  }

  // 1. Check user metadata first
  if (user.user_metadata?.role) {
    return user.user_metadata.role.toLowerCase();
  }

  // 2. Check profiles table in Supabase
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (data && data.role) {
      return data.role.toLowerCase();
    }
  } catch (err) {
    console.warn("Could not query profiles table:", err);
  }

  // 3. Check app_metadata
  if (user.app_metadata?.role) {
    return user.app_metadata.role.toLowerCase();
  }

  return "user";
}

async function updateAuthUI(user) {
  if (user) {
    currentUser = user;
    currentUserRole = await checkUserRole(user);
    isAdmin = currentUserRole === "admin";

    const fullName = user.user_metadata?.full_name || user.email.split("@")[0];
    const email = user.email;

    // Navbar Profile Button Initials
    const initial = fullName.charAt(0).toUpperCase();
    profileBtn.textContent = initial;
    if (dropdownAvatarEl) dropdownAvatarEl.textContent = initial;

    // Profile Dropdown Info
    if (userNameEl) userNameEl.textContent = fullName;
    if (userEmailEl) userEmailEl.textContent = email;

    if (userRoleBadgeEl) {
      userRoleBadgeEl.textContent = isAdmin ? "ADMIN" : "USER";
      userRoleBadgeEl.className = isAdmin ? "badge badge-role-admin mt-1" : "badge badge-role-user mt-1";
    }

    // Admin buttons visibility
    if (isAdmin) {
      navAdminBtn.classList.remove("hidden");
      if (adminDropdownOption) adminDropdownOption.classList.remove("hidden");
      const adminActiveEmailEl = document.getElementById("adminActiveEmail");
      if (adminActiveEmailEl) adminActiveEmailEl.textContent = email;

      // Ensure admin metadata is synced in Supabase Auth so RLS allows admin actions
      if (user.user_metadata?.role !== "admin") {
        supabase.auth.updateUser({
          data: { role: "admin" }
        }).catch(console.warn);
      }
    } else {
      navAdminBtn.classList.add("hidden");
      if (adminDropdownOption) adminDropdownOption.classList.add("hidden");
    }

    authContainer.classList.add("hidden");
    postApp.classList.remove("hidden");
  } else {
    currentUser = null;
    currentUserRole = "user";
    isAdmin = false;

    authContainer.classList.remove("hidden");
    postApp.classList.add("hidden");
    navAdminBtn.classList.add("hidden");
  }
}

// ========================= BACKGROUND SELECT =========================

function selectBackground(img) {
  document.querySelectorAll("#feedView .bg-img").forEach((image) => {
    image.classList.remove("selectedImg");
  });

  img.classList.add("selectedImg");
  selectedBackground = img.src;
}

function selectModalBackground(img) {
  document.querySelectorAll("#modalBgImagesContainer .bg-img").forEach((image) => {
    image.classList.remove("selectedImg");
  });

  img.classList.add("selectedImg");
  modalSelectedBackground = img.src;
}

// ========================= SIGN UP =========================

signUpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const firstName = document.getElementById("inputFirstName").value.trim();
  const lastName = document.getElementById("inputLastName").value.trim();
  const email = document.getElementById("inputEmail4").value.trim();
  const password = document.getElementById("inputPassword4").value;
  const phone = document.getElementById("inputAddress").value.trim();
  const city = document.getElementById("inputCity").value.trim();

  // All signups default to 'user' role unless it is the dedicated admin email
  const role = email.toLowerCase() === "pakistan.hafsa@gmail.com" ? "admin" : "user";
  const fullName = `${firstName} ${lastName}`.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        city,
        role: role,
      },
    },
  });

  if (error) {
    Swal.fire({
      icon: "error",
      title: "Sign Up Failed",
      text: error.message,
    });
    return;
  }

  // Also sync into profiles table if available
  if (data?.user?.id) {
    try {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        phone,
        city,
        role: role,
      });
    } catch (upsertErr) {
      console.warn("Profiles table sync:", upsertErr);
    }
  }

  Swal.fire({
    icon: "success",
    title: "Account Created Successfully",
    text: role === "admin" ? "Admin privileges granted!" : "Welcome to Post App!",
    timer: 2000,
    showConfirmButton: false,
  });

  signUpForm.reset();

  if (data?.session) {
    await updateAuthUI(data.session.user);
    if (role === "admin") {
      await toggleView("admin");
    } else {
      await toggleView("feed");
    }
  } else {
    // If confirmation is needed or session not yet established, switch to login tab
    switchAuthTab("login");
  }
});

// ========================= LOG IN =========================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    Swal.fire({
      icon: "error",
      title: "Login Failed",
      text: error.message,
    });
    return;
  }

  Swal.fire({
    icon: "success",
    title: "Logged in successfully",
    timer: 1500,
    showConfirmButton: false,
  });

  loginForm.reset();

  await updateAuthUI(data.user);

  if (isAdmin) {
    await toggleView("admin");
  } else {
    await toggleView("feed");
  }
});

// ========================= FORGOT PASSWORD =========================

async function forgotPassword(e) {
  e.preventDefault();
  const { value: email } = await Swal.fire({
    title: "Reset Password",
    input: "email",
    inputLabel: "Your email address",
    inputPlaceholder: "Enter your email address",
    showCancelButton: true,
  });

  if (email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
      });
    } else {
      Swal.fire({
        icon: "success",
        title: "Check your email",
        text: "Password reset link sent to " + email,
      });
    }
  }
}

// ========================= LOGOUT =========================

async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    Swal.fire({
      icon: "error",
      title: error.message,
    });
    return;
  }

  Swal.fire({
    icon: "success",
    title: "Logged out successfully",
    timer: 1000,
    showConfirmButton: false,
  });

  dropdown.classList.add("hidden");
  location.reload();
}

// ========================= GOOGLE SIGN IN =========================

async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    Swal.fire({
      icon: "error",
      title: error.message,
    });
  }
}

// ========================= CREATE / UPDATE POST (FEED) =========================

async function post() {
  const titleInput = document.getElementById("title");
  const descriptionInput = document.getElementById("description");
  const imageInput = document.getElementById("background-image");
  const imageFile = imageInput.files[0];

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    Swal.fire({
      icon: "error",
      title: "Please log in first.",
    });
    return;
  }

  const email = user.email;
  const userId = user.id;

  if (!title || !description) {
    Swal.fire({
      icon: "warning",
      title: "Please fill all fields",
    });
    return;
  }

  let imageUrl = selectedBackground;
  if (imageFile) {
    const fileName = `${Date.now()}-${imageFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(fileName, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.warn("Storage upload error:", uploadError);
      // Fallback to selected background if storage bucket is not configured
    } else {
      const { data: imageData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);
      imageUrl = imageData.publicUrl;
    }
  }

  // UPDATE
  if (editId) {
    // 1. Optimistically update local data and UI immediately
    const idx = allPostsData.findIndex((p) => String(p.id) === String(editId));
    let previousPost = null;
    if (idx !== -1) {
      previousPost = { ...allPostsData[idx] };
      allPostsData[idx].title = title;
      allPostsData[idx].description = description;
      allPostsData[idx].background = imageUrl;
    }
    renderData(allPostsData);
    if (!adminDashboardView.classList.contains("hidden")) {
      renderAdminPostsTable(allPostsData);
    }

    let query = supabase
      .from("my-posts")
      .update({
        title,
        description,
        background: imageUrl,
      })
      .eq("id", editId);

    // If regular user, restrict update to own post. If Admin, allow editing any post!
    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query.select();

    if (error) {
      // Revert if error
      if (idx !== -1 && previousPost) {
        allPostsData[idx] = previousPost;
        renderData(allPostsData);
        if (!adminDashboardView.classList.contains("hidden")) {
          renderAdminPostsTable(allPostsData);
        }
      }
      Swal.fire({
        icon: "error",
        title: error.message || "You cannot update this post.",
      });
      return;
    }

    editCard = null;
    editId = null;

    titleInput.value = "";
    descriptionInput.value = "";
    imageInput.value = "";

    if (!data || data.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Updated on Screen",
        html: `The post was updated on your screen, but <b>Supabase Row Level Security (RLS)</b> blocked permanent modification in the database.<br><br>
        To allow Admin updates in Supabase, run the script in <code>supabase_rls_setup.sql</code> in your Supabase SQL Editor.`,
      });
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Post Updated Successfully",
    });
    return;
  }

  // CREATE
  const fullName = user.user_metadata?.full_name || user.email.split("@")[0];
  const { error } = await supabase.from("my-posts").insert({
    title,
    description,
    background: imageUrl,
    email: email,
    name: fullName,
    user_id: userId,
  });

  if (error) {
    Swal.fire({
      icon: "error",
      title: error.message,
    });
    return;
  }

  Swal.fire({
    icon: "success",
    title: "Post Created Successfully",
    timer: 1200,
    showConfirmButton: false,
  });

  titleInput.value = "";
  descriptionInput.value = "";
  imageInput.value = "";

  await getPosts();
}

// ========================= EDIT POST (FEED) =========================

async function editpost(button) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const card = button.closest(".post-card");

  // Admin can edit ANY post! Regular user can only edit their own.
  if (!isAdmin && card.dataset.userid !== user.id) {
    Swal.fire({
      icon: "error",
      title: "You can only edit your own posts.",
      text: "Only Administrators have permission to edit all posts.",
    });
    return;
  }

  editCard = card;
  editId = card.dataset.id;

  document.getElementById("title").value = card.querySelector("h5").textContent;
  document.getElementById("description").value = card.querySelector("p").textContent;

  selectedBackground = card.dataset.background || "images/background 1.jpg";

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// ========================= DELETE POST (FEED) =========================

async function deletePost(button) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const card = button.closest(".post-card");

  // Admin can delete ANY post! Regular user can only delete their own.
  if (!isAdmin && card.dataset.userid !== user.id) {
    Swal.fire({
      icon: "error",
      title: "You can only delete your own posts.",
      text: "Only Administrators have permission to delete all posts.",
    });
    return;
  }

  const result = await Swal.fire({
    title: "Delete this post?",
    text: "This action cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it!",
  });

  if (!result.isConfirmed) return;

  const id = card.dataset.id;

  // 1. Optimistically remove from local state immediately
  const deletedIndex = allPostsData.findIndex((p) => String(p.id) === String(id));
  const backupPost = deletedIndex !== -1 ? allPostsData[deletedIndex] : null;

  allPostsData = allPostsData.filter((p) => String(p.id) !== String(id));
  renderData(allPostsData);
  const totalPostsEl = document.getElementById("adminTotalPosts");
  if (totalPostsEl) totalPostsEl.textContent = allPostsData.length;
  if (!adminDashboardView.classList.contains("hidden")) {
    renderAdminPostsTable(allPostsData);
  }

  // 2. Perform delete in Supabase
  let query = supabase.from("my-posts").delete().eq("id", id);
  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query.select();

  if (error) {
    // Revert if error
    if (backupPost && deletedIndex !== -1) {
      allPostsData.splice(deletedIndex, 0, backupPost);
      renderData(allPostsData);
      if (totalPostsEl) totalPostsEl.textContent = allPostsData.length;
      if (!adminDashboardView.classList.contains("hidden")) {
        renderAdminPostsTable(allPostsData);
      }
    }
    Swal.fire({
      icon: "error",
      title: error.message,
    });
    return;
  }

  if (!data || data.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "Removed from UI",
      html: `The post was removed from your screen, but <b>Supabase Row Level Security (RLS)</b> blocked database deletion.<br><br>
      To allow Admin deletion in Supabase, run the script in <code>supabase_rls_setup.sql</code> in your Supabase SQL Editor.`,
    });
    return;
  }

  Swal.fire({
    icon: "success",
    title: "Post deleted",
    timer: 1000,
    showConfirmButton: false,
  });
}

// ========================= LOAD POSTS (FEED) =========================

async function getPosts() {
  const { data, error } = await supabase
    .from("my-posts")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Error fetching posts:", error);
    return;
  }

  allPostsData = data || [];
  renderData(allPostsData);
}

// ========================= SEARCH POSTS (FEED) =========================

async function searchPosts() {
  const search = document.getElementById("searchInput").value.trim();

  if (!search) {
    renderData(allPostsData);
    return;
  }

  const filtered = allPostsData.filter((item) => {
    const titleMatch = item.title?.toLowerCase().includes(search.toLowerCase());
    const descMatch = item.description?.toLowerCase().includes(search.toLowerCase());
    const nameMatch = item.name?.toLowerCase().includes(search.toLowerCase());
    return titleMatch || descMatch || nameMatch;
  });

  renderData(filtered);
}

// ========================= RENDER FEED POSTS =========================

function renderData(data) {
  const postContainer = document.getElementById("post");
  if (!postContainer) return;

  postContainer.innerHTML = "";
  if (!data || data.length === 0) {
    postContainer.innerHTML = `<div class="col-12 text-center py-5"><h3 class="text-muted">No posts found</h3></div>`;
    return;
  }

  data.forEach((item) => {
    const isOwner = currentUser && item.user_id === currentUser.id;
    const canManage = isOwner || isAdmin;

    postContainer.innerHTML += `
      <div
        class="card post-card mb-4 text-white"
        data-id="${item.id}"
        data-userid="${item.user_id || ""}"
        data-background="${item.background || "images/background 1.jpg"}"
        style="
          background-image:url('${item.background || "images/background 1.jpg"}');
        "
      >
        <div class="post-card-inner">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <strong>${escapeHtml(item.name || "Anonymous")}</strong>
              ${isAdmin && !isOwner ? '<span class="badge badge-role-admin ms-1">Admin View</span>' : ""}
              <br>
              <small class="time text-white-50">
                ${item.created_at ? new Date(item.created_at).toLocaleString() : ""}
              </small>
            </div>
            ${item.email ? `<small class="text-white-50 text-truncate" style="max-width: 140px;">${escapeHtml(item.email)}</small>` : ""}
          </div>

          <div class="my-2 overflow-hidden" style="flex: 1;">
            <h5 class="fw-bold text-white text-truncate mb-1" title="${escapeHtml(item.title || "")}">${escapeHtml(item.title || "Untitled")}</h5>
            <p class="mb-0 text-white-50" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; font-size: 14px; line-height: 1.4;">${escapeHtml(item.description || "")}</p>
          </div>

          <div class="border-0 bg-transparent text-end mt-3 d-flex justify-content-end gap-2">
            ${
              canManage
                ? `
              <button class="post-action-btn editBtn" onclick="editpost(this)">
                <i class="bi bi-pencil-square me-1"></i> Edit
              </button>
              <button class="post-action-btn deleteBtn" onclick="deletePost(this)">
                <i class="bi bi-trash3 me-1"></i> Delete
              </button>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;
  });
}

// ====================================================================
// ========================= ADMIN DASHBOARD ==========================
// ====================================================================

async function loadAdminData() {
  if (!isAdmin) return;

  // 1. Fetch Posts
  const { data: posts, error: postsErr } = await supabase
    .from("my-posts")
    .select("*")
    .order("id", { ascending: false });

  if (!postsErr && posts) {
    allPostsData = posts;
    document.getElementById("adminTotalPosts").textContent = posts.length;
    renderAdminPostsTable(posts);
  }

  // 2. Fetch Users
  await loadAdminUsers();
}

async function loadAdminUsers() {
  let usersList = [];

  // Try fetching from profiles table
  try {
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!profErr && profiles && profiles.length > 0) {
      usersList = profiles;
    }
  } catch (e) {
    console.warn("Profiles fetch error:", e);
  }

  // Fallback: If profiles table is empty or pending creation, compile distinct users from posts + currentUser
  if (usersList.length === 0) {
    const userMap = new Map();

    if (currentUser) {
      userMap.set(currentUser.id, {
        id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || "Admin User",
        email: currentUser.email,
        phone: currentUser.user_metadata?.phone || "N/A",
        city: currentUser.user_metadata?.city || "N/A",
        role: currentUserRole,
        created_at: currentUser.created_at || new Date().toISOString(),
      });
    }

    allPostsData.forEach((p) => {
      if (p.user_id && !userMap.has(p.user_id)) {
        userMap.set(p.user_id, {
          id: p.user_id,
          full_name: p.name || "App User",
          email: p.email || "user@example.com",
          phone: "N/A",
          city: "N/A",
          role: "user",
          created_at: p.created_at || new Date().toISOString(),
        });
      }
    });

    usersList = Array.from(userMap.values());
  }

  allUsersData = usersList;
  document.getElementById("adminTotalUsers").textContent = allUsersData.length;
  renderAdminUsersTable(allUsersData);
}

// ------------------------- ADMIN POSTS TABLE & ACTIONS -------------------------

function renderAdminPostsTable(posts) {
  const tbody = document.getElementById("adminPostsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!posts || posts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No posts available.</td></tr>`;
    return;
  }

  posts.forEach((post) => {
    const dateFormatted = post.created_at ? new Date(post.created_at).toLocaleDateString() : "-";
    tbody.innerHTML += `
      <tr>
        <td>
          <img src="${post.background || "images/background 1.jpg"}" class="table-post-thumb" alt="Preview">
        </td>
        <td>
          <div class="fw-bold text-dark">${escapeHtml(post.title || "Untitled")}</div>
          <small class="text-muted text-truncate d-inline-block" style="max-width: 280px;">
            ${escapeHtml(post.description || "")}
          </small>
        </td>
        <td>
          <div class="fw-semibold">${escapeHtml(post.name || "Unknown")}</div>
          <small class="text-muted">${escapeHtml(post.email || "N/A")}</small>
        </td>
        <td>
          <small class="text-muted">${dateFormatted}</small>
        </td>
        <td class="text-end">
          <div class="d-inline-flex gap-2">
            <button class="admin-action-btn admin-edit-btn" onclick="openAdminEditPostModal('${post.id}')">
              <i class="bi bi-pencil me-1"></i> Edit
            </button>
            <button class="admin-action-btn admin-delete-btn" onclick="adminDeletePost('${post.id}')">
              <i class="bi bi-trash me-1"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

function filterAdminPosts() {
  const query = document.getElementById("adminSearchPostsInput").value.trim().toLowerCase();
  if (!query) {
    renderAdminPostsTable(allPostsData);
    return;
  }

  const filtered = allPostsData.filter((p) => {
    return (
      p.title?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.name?.toLowerCase().includes(query) ||
      p.email?.toLowerCase().includes(query)
    );
  });

  renderAdminPostsTable(filtered);
}

function openAdminCreatePostModal() {
  document.getElementById("adminPostModalTitle").textContent = "Create Post (Admin)";
  document.getElementById("modalPostId").value = "";
  document.getElementById("modalPostTitle").value = "";
  document.getElementById("modalPostDescription").value = "";
  document.getElementById("modalPostAuthor").value = currentUser?.user_metadata?.full_name || "Admin";

  const modalEl = document.getElementById("adminPostModal");
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function openAdminEditPostModal(postId) {
  const post = allPostsData.find((p) => String(p.id) === String(postId));
  if (!post) return;

  document.getElementById("adminPostModalTitle").textContent = "Edit Post (Admin)";
  document.getElementById("modalPostId").value = post.id;
  document.getElementById("modalPostTitle").value = post.title || "";
  document.getElementById("modalPostDescription").value = post.description || "";
  document.getElementById("modalPostAuthor").value = post.name || "";

  modalSelectedBackground = post.background || "images/background 1.jpg";

  document.querySelectorAll("#modalBgImagesContainer .bg-img").forEach((img) => {
    if (img.src === modalSelectedBackground || img.getAttribute("src") === modalSelectedBackground) {
      img.classList.add("selectedImg");
    } else {
      img.classList.remove("selectedImg");
    }
  });

  const modalEl = document.getElementById("adminPostModal");
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function adminSavePost() {
  const postId = document.getElementById("modalPostId").value;
  const title = document.getElementById("modalPostTitle").value.trim();
  const description = document.getElementById("modalPostDescription").value.trim();
  const authorName = document.getElementById("modalPostAuthor").value.trim();
  const imageInput = document.getElementById("modal-background-image");
  const imageFile = imageInput.files[0];

  if (!title || !description) {
    Swal.fire({
      icon: "warning",
      title: "Please fill all required fields",
    });
    return;
  }

  let imageUrl = modalSelectedBackground;
  if (imageFile) {
    const fileName = `${Date.now()}-${imageFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(fileName, imageFile);

    if (!uploadError) {
      const { data: imageData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);
      imageUrl = imageData.publicUrl;
    }
  }

  if (postId) {
    // EDIT POST
    // 1. Optimistically update local data and UI immediately so user sees the change instantly
    const idx = allPostsData.findIndex((p) => String(p.id) === String(postId));
    let previousPost = null;
    if (idx !== -1) {
      previousPost = { ...allPostsData[idx] };
      allPostsData[idx].title = title;
      allPostsData[idx].description = description;
      allPostsData[idx].background = imageUrl;
      if (authorName) allPostsData[idx].name = authorName;
    }
    renderAdminPostsTable(allPostsData);
    renderData(allPostsData);

    bootstrap.Modal.getOrCreateInstance(document.getElementById("adminPostModal")).hide();

    // 2. Persist update to Supabase
    const { data, error } = await supabase
      .from("my-posts")
      .update({
        title,
        description,
        background: imageUrl,
        name: authorName,
      })
      .eq("id", postId)
      .select();

    if (error) {
      // Revert if error
      if (idx !== -1 && previousPost) {
        allPostsData[idx] = previousPost;
        renderAdminPostsTable(allPostsData);
        renderData(allPostsData);
      }
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message,
      });
      return;
    }

    // If RLS blocked the update in the database (0 rows returned)
    if (!data || data.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Updated in UI",
        html: `The post was updated on your screen, but <b>Supabase Row Level Security (RLS)</b> blocked permanent modification in the database.<br><br>
        To allow Admin edits in Supabase, run the script in <code>supabase_rls_setup.sql</code> in your Supabase SQL Editor.`,
      });
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Post Updated by Admin",
      timer: 1500,
      showConfirmButton: false,
    });
  } else {
    // CREATE POST
    const { data, error } = await supabase
      .from("my-posts")
      .insert({
        title,
        description,
        background: imageUrl,
        name: authorName || "Admin",
        email: currentUser?.email || "admin@example.com",
        user_id: currentUser?.id,
      })
      .select();

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Creation Failed",
        text: error.message,
      });
      return;
    }

    bootstrap.Modal.getOrCreateInstance(document.getElementById("adminPostModal")).hide();

    if (data && data[0]) {
      allPostsData.unshift(data[0]);
    }
    renderAdminPostsTable(allPostsData);
    renderData(allPostsData);
    document.getElementById("adminTotalPosts").textContent = allPostsData.length;

    Swal.fire({
      icon: "success",
      title: "Post Created by Admin",
      timer: 1500,
      showConfirmButton: false,
    });
  }
}

async function adminDeletePost(postId) {
  const result = await Swal.fire({
    title: "Admin Delete Confirmation",
    text: "Are you sure you want to delete this post? This will permanently remove it from the system.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it",
  });

  if (!result.isConfirmed) return;

  // 1. Optimistically remove from local state immediately so it DISAPPEARS instantly
  const deletedIndex = allPostsData.findIndex((p) => String(p.id) === String(postId));
  const backupPost = deletedIndex !== -1 ? allPostsData[deletedIndex] : null;

  allPostsData = allPostsData.filter((p) => String(p.id) !== String(postId));
  renderAdminPostsTable(allPostsData);
  renderData(allPostsData);
  const totalPostsEl = document.getElementById("adminTotalPosts");
  if (totalPostsEl) totalPostsEl.textContent = allPostsData.length;

  // 2. Perform delete in Supabase with .select() to verify row deletion
  const { data, error } = await supabase.from("my-posts").delete().eq("id", postId).select();

  if (error) {
    // Rollback if error
    if (backupPost && deletedIndex !== -1) {
      allPostsData.splice(deletedIndex, 0, backupPost);
      renderAdminPostsTable(allPostsData);
      renderData(allPostsData);
      if (totalPostsEl) totalPostsEl.textContent = allPostsData.length;
    }
    Swal.fire({
      icon: "error",
      title: "Delete Failed",
      text: error.message,
    });
    return;
  }

  // If 0 rows were deleted because Supabase RLS blocked it
  if (!data || data.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "Removed from UI",
      html: `The post was removed from your screen, but <b>Supabase Row Level Security (RLS)</b> blocked database deletion.<br><br>
      To allow permanent database deletion by Admin, run the script in <code>supabase_rls_setup.sql</code> in your Supabase SQL Editor.`,
    });
    return;
  }

  Swal.fire({
    icon: "success",
    title: "Post Deleted Successfully",
    timer: 1200,
    showConfirmButton: false,
  });
}

// ------------------------- ADMIN USERS TABLE & ACTIONS -------------------------

function renderAdminUsersTable(users) {
  const tbody = document.getElementById("adminUsersTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No users found.</td></tr>`;
    return;
  }

  users.forEach((user) => {
    const isCurrent = currentUser && user.id === currentUser.id;
    const roleIsAdmin = (user.role || "").toLowerCase() === "admin";

    tbody.innerHTML += `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <div class="profile-avatar-circle me-2" style="width: 34px; height: 34px; font-size: 14px;">
              ${(user.full_name || user.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="fw-bold text-dark">
                ${escapeHtml(user.full_name || "User")} ${isCurrent ? '<span class="badge bg-secondary ms-1">You</span>' : ""}
              </div>
              <small class="text-muted text-break">${user.id ? user.id.substring(0, 10) + "..." : ""}</small>
            </div>
          </div>
        </td>
        <td>
          <div class="text-dark">${escapeHtml(user.email || "N/A")}</div>
        </td>
        <td>
          <div>${escapeHtml(user.phone || "N/A")}</div>
          <small class="text-muted">${escapeHtml(user.city || "N/A")}</small>
        </td>
        <td>
          <span class="badge ${roleIsAdmin ? "badge-role-admin" : "badge-role-user"}">
            ${roleIsAdmin ? "ADMIN" : "USER"}
          </span>
        </td>
        <td class="text-end">
          <div class="d-inline-flex gap-2">
            <button class="admin-action-btn admin-edit-btn" onclick="openAdminEditUserModal('${user.id}')">
              <i class="bi bi-pencil me-1"></i> Edit
            </button>
            <button class="admin-action-btn admin-delete-btn" onclick="adminDeleteUser('${user.id}')" ${isCurrent ? "disabled title='Cannot delete your own active admin account'" : ""}>
              <i class="bi bi-trash me-1"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

function filterAdminUsers() {
  const query = document.getElementById("adminSearchUsersInput").value.trim().toLowerCase();
  if (!query) {
    renderAdminUsersTable(allUsersData);
    return;
  }

  const filtered = allUsersData.filter((u) => {
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.city?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query)
    );
  });

  renderAdminUsersTable(filtered);
}

function openAdminCreateUserModal() {
  document.getElementById("adminUserModalTitle").textContent = "Add New User";
  document.getElementById("modalUserId").value = "";
  document.getElementById("modalUserMode").value = "create";

  document.getElementById("modalUserNameInput").value = "";
  document.getElementById("modalUserEmailInput").value = "";
  document.getElementById("modalUserEmailInput").disabled = false;
  document.getElementById("modalUserPasswordInput").value = "";
  document.getElementById("modalUserPasswordGroup").style.display = "block";
  document.getElementById("modalUserPhoneInput").value = "";
  document.getElementById("modalUserCityInput").value = "";
  document.getElementById("modalUserRoleSelect").value = "user";

  const modalEl = document.getElementById("adminUserModal");
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function openAdminEditUserModal(userId) {
  const user = allUsersData.find((u) => u.id === userId);
  if (!user) return;

  document.getElementById("adminUserModalTitle").textContent = "Edit User & Role";
  document.getElementById("modalUserId").value = user.id;
  document.getElementById("modalUserMode").value = "edit";

  document.getElementById("modalUserNameInput").value = user.full_name || "";
  document.getElementById("modalUserEmailInput").value = user.email || "";
  document.getElementById("modalUserEmailInput").disabled = true; // Email cannot be altered directly
  document.getElementById("modalUserPasswordGroup").style.display = "none";
  document.getElementById("modalUserPhoneInput").value = user.phone || "";
  document.getElementById("modalUserCityInput").value = user.city || "";
  document.getElementById("modalUserRoleSelect").value = (user.role || "user").toLowerCase();

  const modalEl = document.getElementById("adminUserModal");
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function adminSaveUser() {
  const mode = document.getElementById("modalUserMode").value;
  const userId = document.getElementById("modalUserId").value;
  const fullName = document.getElementById("modalUserNameInput").value.trim();
  const email = document.getElementById("modalUserEmailInput").value.trim();
  const password = document.getElementById("modalUserPasswordInput").value;
  const phone = document.getElementById("modalUserPhoneInput").value.trim();
  const city = document.getElementById("modalUserCityInput").value.trim();
  const role = document.getElementById("modalUserRoleSelect").value;

  if (mode === "create") {
    if (!fullName || !email || !password) {
      Swal.fire({
        icon: "warning",
        title: "Please provide Full Name, Email, and Password",
      });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          city,
          role: role.toLowerCase(),
        },
      },
    });

    if (error) {
      Swal.fire({
        icon: "error",
        title: "User Creation Failed",
        text: error.message,
      });
      return;
    }

    // Upsert into profiles
    try {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        phone,
        city,
        role: role.toLowerCase(),
      });
    } catch (upsertErr) {
      console.warn("Profiles insert error:", upsertErr);
    }

    Swal.fire({
      icon: "success",
      title: "User Created Successfully",
      text: `User ${email} created with role ${role.toUpperCase()}.`,
    });
  } else {
    // EDIT MODE
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          city,
          role: role.toLowerCase(),
        })
        .eq("id", userId);

      if (error) {
        console.warn("Could not update profiles table directly:", error);
      }
    } catch (e) {
      console.warn("Profiles update exception:", e);
    }

    // Update in local data
    const idx = allUsersData.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      allUsersData[idx].full_name = fullName;
      allUsersData[idx].phone = phone;
      allUsersData[idx].city = city;
      allUsersData[idx].role = role;
    }

    Swal.fire({
      icon: "success",
      title: "User Updated Successfully",
    });
  }

  bootstrap.Modal.getOrCreateInstance(document.getElementById("adminUserModal")).hide();
  await loadAdminUsers();
}

async function adminDeleteUser(userId) {
  if (currentUser && userId === currentUser.id) {
    Swal.fire({
      icon: "error",
      title: "Action Not Allowed",
      text: "You cannot delete your own active administrator account.",
    });
    return;
  }

  const result = await Swal.fire({
    title: "Delete User?",
    text: "Are you sure you want to remove this user from the system?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete user",
  });

  if (!result.isConfirmed) return;

  try {
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) {
      console.warn("Profiles delete notice:", error);
    }
  } catch (e) {
    console.warn("Profiles delete exception:", e);
  }

  allUsersData = allUsersData.filter((u) => u.id !== userId);
  document.getElementById("adminTotalUsers").textContent = allUsersData.length;
  renderAdminUsersTable(allUsersData);

  Swal.fire({
    icon: "success",
    title: "User Removed",
    timer: 1200,
    showConfirmButton: false,
  });
}

// ========================= UTILITY HELPERS =========================

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ========================= REALTIME & AUTH LISTENER =========================

supabase.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    await updateAuthUI(session.user);
    if (isAdmin && !adminDashboardView.classList.contains("hidden")) {
      await loadAdminData();
    } else {
      await getPosts();
    }
  } else {
    await updateAuthUI(null);
  }
});

supabase
  .channel("realtime-posts")
  .on("postgres_changes", { event: "*", schema: "public", table: "my-posts" }, async (payload) => {
    console.log("Realtime change received:", payload);
    if (!adminDashboardView.classList.contains("hidden") && isAdmin) {
      await loadAdminData();
    } else {
      await getPosts();
    }
  })
  .subscribe();

// ========================= INITIAL LOAD =========================

window.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session && session.user) {
    await updateAuthUI(session.user);
    await getPosts();
  } else {
    await updateAuthUI(null);
  }
});

// ========================= GLOBAL EXPORTS =========================

window.signInWithGoogle = signInWithGoogle;
window.post = post;
window.editpost = editpost;
window.deletePost = deletePost;
window.searchPosts = searchPosts;
window.selectBackground = selectBackground;
window.selectModalBackground = selectModalBackground;
window.logout = logout;
window.renderData = renderData;
window.toggleView = toggleView;
window.forgotPassword = forgotPassword;
window.switchAuthTab = switchAuthTab;
window.fillAdminCredentials = fillAdminCredentials;

// Admin Exports
window.loadAdminData = loadAdminData;
window.filterAdminPosts = filterAdminPosts;
window.openAdminCreatePostModal = openAdminCreatePostModal;
window.openAdminEditPostModal = openAdminEditPostModal;
window.adminSavePost = adminSavePost;
window.adminDeletePost = adminDeletePost;

window.filterAdminUsers = filterAdminUsers;
window.openAdminCreateUserModal = openAdminCreateUserModal;
window.openAdminEditUserModal = openAdminEditUserModal;
window.adminSaveUser = adminSaveUser;
window.adminDeleteUser = adminDeleteUser;
