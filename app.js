import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://uiwmuwqarhngnhppqfqo.supabase.co",
  "sb_publishable_lXI3MvI6rVyWQKQ4P5r2ZA_zP8Ix1D7"
);

// ========================= VARIABLES =========================

let firstName = "";
let lastName = "";

let editCard = null;
let editId = null;




let email  ;
let userId ;

// Default background
let selectedBackground = "Images/background 1.jpg";

// ========================= ELEMENTS =========================

const profilePhotoImg = document.getElementById("profilePhotoImg");
const profilePhotoInput = document.getElementById("profilePhotoInput");

const signUpForm = document.getElementById("signUpForm");
const signUpFormContainer = document.getElementById("signUpFormContainer");
const postApp = document.getElementById("postApp");

// ========================= PROFILE PHOTO =========================

profilePhotoImg.addEventListener("click", () => {
  profilePhotoInput.click();
});

profilePhotoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    profilePhotoImg.src = reader.result;
  };

  reader.readAsDataURL(file);
});

// ========================= BACKGROUND SELECT =========================

function selectBackground(img) {
  document.querySelectorAll(".bg-img").forEach((image) => {
    image.classList.remove("selectedImg");
  });

  img.classList.add("selectedImg");

  selectedBackground = img.src;
}

// ========================= SIGN UP =========================

signUpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  firstName = document.getElementById("inputFirstName").value;
  lastName = document.getElementById("inputLastName").value;

  const email = document.getElementById("inputEmail4").value;
  const password = document.getElementById("inputPassword4").value;

  const { error } = await supabase.auth.signUp({
    email,
    password,
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
    title: "Account Created Successfully",
    timer: 1500,
    showConfirmButton: false,
  });

  signUpForm.reset();

  signUpFormContainer.classList.add("hidden");
  postApp.classList.remove("hidden");
});

// ========================= CREATE / UPDATE POST =========================

async function post() {
  const titleInput = document.getElementById("title");
  const descriptionInput = document.getElementById("description");

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  const { data: { user } } = await supabase.auth.getUser()
  console.log(user)

  let email = user.email;
  let userId = user.id;

  if (!title || !description) {
    Swal.fire({
      icon: "warning",
      title: "Please fill all fields",
    });

    return;
  }

  // UPDATE

  if (editId) {
    const { error } = await supabase
      .from("my-posts")
      .update({
        title,
        description,
        background: selectedBackground,
      })
      .eq("id", editId);

    if (error) {
      Swal.fire(error.message);
      return;
    }

    Swal.fire({
      icon: "success",
      title: "Post Updated",
    });

    editCard = null;
    editId = null;

    titleInput.value = "";
    descriptionInput.value = "";

    await getPosts();

    return;
  }

  // CREATE

  const { error } = await supabase
    .from("my-posts")
    .insert({
      title,
      description,
      background: selectedBackground,
      email: email,
      user_id: userId
    });

  if (error) {
    Swal.fire(error.message);
    return;
  }

  Swal.fire({
    icon: "success",
    title: "Post Created",
    timer: 1200,
    showConfirmButton: false,
  });

  titleInput.value = "";
  descriptionInput.value = "";

  await getPosts();
}

// ========================= EDIT POST =========================

function editpost(button) {
  editCard = button.closest(".card");
  editId = editCard.dataset.id;

  document.getElementById("title").value =
    editCard.querySelector("h5").textContent;

  document.getElementById("description").value =
    editCard.querySelector("p").textContent;

  // Save current background
  selectedBackground = editCard.dataset.background;

  // Highlight selected image
  document.querySelectorAll(".bg-img").forEach((img) => {
    img.classList.remove("selectedImg");

    if (img.src === selectedBackground) {
      img.classList.add("selectedImg");
    }
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// ========================= DELETE POST =========================

async function deletePost(button) {
  const card = button.closest(".card");

  const id = card.dataset.id;

  const { error } = await supabase
    .from("my-posts")
    .delete()
    .eq("id", id);

  if (error) {
    Swal.fire(error.message);
    return;
  }

  await getPosts();
}

// ========================= LOAD POSTS =========================

async function getPosts() {
  const { data, error } = await supabase
    .from("my-posts")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.log(error);
    return;
  }

  const postContainer = document.getElementById("post");

  postContainer.innerHTML = "";

  data.forEach((item) => {

    postContainer.innerHTML += `

<div
class="card post-card mb-4 text-white"
data-id="${item.id}"
data-background="${item.background}"

style="
background-image:url('${item.background}');
background-size:cover;
background-position:center;
background-repeat:no-repeat;
"
>

<div
style="
background:rgba(0,0,0,.45);
border-radius:16px;
padding:18px;
height:100%;
">

<div class="card-header d-flex align-items-center">

<img
class="profile-photo me-2"
src="${profilePhotoImg.src}"
>

<div>

<strong>${item.email}</strong>

<br>

<small>

${item.created_at
        ? new Date(item.created_at).toLocaleTimeString()
        : ""
      }

</small>

</div>

</div>

<div class="card-body">

<h5>${item.title}</h5>

<p>${item.description}</p>

</div>

<div class="card-footer border-0 bg-transparent text-end">

<button
class="btn editBtn me-2"
onclick="editpost(this)"
>

Edit

</button>

<button
class="btn btn-danger"
onclick="deletePost(this)"
>

Delete

</button>

</div>

</div>

</div>

`;

  });
}

// ========================= SEARCH  =========================

async function searchPosts() {
  const search = document.getElementById("searchInput").value;

  const { data, error } = await supabase
    .from("my-posts")
    .select("*")
    .or(`title.like.%${search}%,description.like.%${search}%,email.like.%${email}%`)
    .order("id", { ascending: false });

  if (error) {
    console.log(error);
    return;
  }

  const postContainer = document.getElementById("post");
  postContainer.innerHTML = "";

  data.forEach((item) => {
    postContainer.innerHTML += `
      <div
        class="card post-card mb-4 text-white"
        data-id="${item.id}"
        data-background="${item.background}"
        style="
          background-image:url('${item.background}');
          background-size:cover;
          background-position:center;
          background-repeat:no-repeat;
        "
      >

        <div style="background:rgba(0,0,0,.45);padding:18px;border-radius:16px;">

          <div class="card-header d-flex align-items-center">
            <img class="profile-photo me-2" src="${profilePhotoImg.src}">
            <div>
              <strong>${item.email}</strong><br>
              <small>
                ${item.created_at
        ? new Date(item.created_at).toLocaleTimeString()
        : ""}
              </small>
            </div>
          </div>

          <div class="card-body">
            <h5>${item.title}</h5>
            <p>${item.description}</p>
          </div>

          <div class="card-footer text-end bg-transparent border-0">
            <button class="btn editBtn me-2" onclick="editpost(this)">Edit</button>
            <button class="btn btn-danger" onclick="deletePost(this)">Delete</button>
          </div>

        </div>
      </div>
    `;
  });
}

// ========================= AUTH STATE =========================

supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session);

  if (session) {
    signUpFormContainer.classList.add("hidden");
    postApp.classList.remove("hidden");

    getPosts();
  } else {
    signUpFormContainer.classList.remove("hidden");
    postApp.classList.add("hidden");
  }
});

// ========================= INITIAL LOAD =========================

window.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    signUpFormContainer.classList.add("hidden");
    postApp.classList.remove("hidden");

    await getPosts();
  } else {
    signUpFormContainer.classList.remove("hidden");
    postApp.classList.add("hidden");
  }
});

// ========================= GLOBAL EXPORTS =========================

window.post = post;
window.editpost = editpost;
window.deletePost = deletePost;
window.searchPosts = searchPosts;
window.selectBackground = selectBackground;