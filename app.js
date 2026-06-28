 import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://uiwmuwqarhngnhppqfqo.supabase.co',
  'sb_publishable_lXI3MvI6rVyWQKQ4P5r2ZA_zP8Ix1D7'
);

let firstName = "";
let lastName = "";
let editCard = null;
let editId = null;

const profilePhotoImg = document.getElementById("profilePhotoImg");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const signUpForm = document.getElementById("signUpForm");
const signUpFormContainer = document.getElementById("signUpFormContainer");
const postApp = document.getElementById("postApp");

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

signUpForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  firstName = document.getElementById("inputFirstName").value;
  lastName = document.getElementById("inputLastName").value;

console.log(document.getElementById("inputFirstName"));
console.log(document.getElementById("inputLastName"));
console.log(document.getElementById("inputEmail4"));
console.log(document.getElementById("inputPassword4"));

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
    position: "top-end",
    icon: "success",
    title: "Account created successfully!",
    showConfirmButton: false,
    timer: 1500,
  });

  signUpForm.reset();

  signUpFormContainer.classList.add("hidden");
  postApp.classList.remove("hidden");
});

function getRandomGradient() {
  const gradients = [
    "linear-gradient(135deg, #A734BD, #FF006A)",
    "linear-gradient(135deg, #0072ff, #00c6ff)",
    "linear-gradient(135deg, #ff9966, #ff5e62)",
    "linear-gradient(135deg, #7F00FF, #E100FF)",
    "linear-gradient(135deg, #11998e, #38ef7d)",
    "linear-gradient(135deg, #f7971e, #ffd200)"
  ];

  return gradients[Math.floor(Math.random() * gradients.length)];
}

async function post() {
  const titleInput = document.getElementById("title");
  const descriptionInput = document.getElementById("description");

  const title = titleInput.value;
  const description = descriptionInput.value;

  const currentTime = new Date().toLocaleTimeString();

  if (!title.trim() || !description.trim()) {
    Swal.fire({
      title: "Empty Post",
      text: "Can't publish post without Title or Description",
      icon: "question",
    });
    return;
  }

  const postContainer = document.getElementById("post");

  // UPDATE POST
  if (editId) {
    const { error } = await supabase
      .from("my-posts")
      .update({
        title,
        description,
      })
      .eq("id", editId);

    if (error) {
      Swal.fire(error.message);
      return;
    }

    editCard.querySelector("h5").textContent = title;
    editCard.querySelector("p").textContent = description;

    editCard = null;
    editId = null;

    titleInput.value = "";
    descriptionInput.value = "";

    Swal.fire({
      icon: "success",
      title: "Post Updated",
    });

    return;
  }

  // CREATE POST
  const { data, error } = await supabase
    .from("my-posts")
    .insert({
      title,
      description,
    })
    .select();

  if (error) {
    Swal.fire(error.message);
    return;
  }

  const gradient = getRandomGradient();
  const postId = data[0].id;

  postContainer.innerHTML += `
    <div
      class="card p-3 mb-3 post-card"
      data-id="${postId}"
      style="background:${gradient}"
    >
      <div class="card-header d-flex align-items-center mb-2">
        <img
          class="profile-photo me-2"
          src="${profilePhotoImg.src}"
        />

        <div class="name-time d-flex flex-column">
          <strong>${firstName} ${lastName}</strong>
          <small>${currentTime}</small>
        </div>
      </div>

      <div class="card-body text-white">
        <h5>${title}</h5>
        <p>${description}</p>
      </div>

      <div class="card-footer d-flex justify-content-end">
        <button
          type="button"
          onclick="editpost(this)"
          class="btn editBtn me-2"
        >
          Edit
        </button>

        <button
          type="button"
          onclick="deletePost(this)"
          class="btn btn-danger deleteBtn"
        >
          Delete
        </button>
      </div>
    </div>
  `;

  titleInput.value = "";
  descriptionInput.value = "";
}

function editpost(button) {
  editCard = button.closest(".card");
  editId = editCard.dataset.id;

  document.getElementById("title").value =
    editCard.querySelector("h5").textContent;

  document.getElementById("description").value =
    editCard.querySelector("p").textContent;

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

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

  card.remove();
}

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
    const gradient = getRandomGradient();

    postContainer.innerHTML += `
      <div
        class="card p-3 mb-3 post-card"
        data-id="${item.id}"
        style="background:${gradient}"
      >
        <div class="card-header d-flex align-items-center mb-2">
          <img
            class="profile-photo me-2"
            src="${profilePhotoImg.src}"
          />

          <div class="name-time d-flex flex-column">
            <strong>${firstName} ${lastName}</strong>
            <small>
              ${
                item.created_at
                  ? new Date(item.created_at).toLocaleTimeString()
                  : ""
              }
            </small>
          </div>
        </div>

        <div class="card-body text-white">
          <h5>${item.title}</h5>
          <p>${item.description}</p>
        </div>

        <div class="card-footer d-flex justify-content-end">
          <button
            type="button"
            onclick="editpost(this)"
            class="btn editBtn me-2"
          >
            Edit
          </button>

          <button
            type="button"
            onclick="deletePost(this)"
            class="btn btn-danger deleteBtn"
          >
            Delete
          </button>
        </div>
      </div>
    `;
  });
}

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

window.post = post;
window.editpost = editpost;
window.deletePost = deletePost;