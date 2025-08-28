class App {
  constructor() {
    this.storage = firebase.storage();
    this.firestore = firebase.firestore();
    this.$fileInput = document.querySelector("#upload-file");
    this.$caption = document.querySelector("#create-caption");
    this.$uploadFileButton = document.querySelector("#upload-button");
    this.$app = document.querySelector("#app");
    this.$firebaseAuthContainer = document.querySelector("#firebaseui-auth-container");
    this.$authUser = document.querySelector(".auth-user");
    this.$uploadButton = document.querySelector(".upload-button");
    this.$uploadPage = document.querySelector("#upload-page");
    this.$uploadPage.style.display = "none";
    this.$discardButton = document.querySelector(".discard-btn");
    this.$postContainer = document.querySelector(".posts");
    this.$options = document.querySelector(".options");
    this.$optionsModal = document.querySelector("#options-modal");
    this.$cancel = document.querySelector(".cancel");
    this.$optionsModal.style.display = "none";
    this.$modalContent = document.querySelector("modal-content");
    this.ui = new firebaseui.auth.AuthUI(firebase.auth());
    this.editingPostId = null;
    this.handleAuth();
    this.addEventListeners();

    this.$authUser.addEventListener("click", (event) => {
      event.preventDefault();
      this.handleLogout();
    });

    this.$uploadButton.addEventListener("click", (event) => {
      this.handleUpload();
    });

    this.$uploadFileButton.addEventListener("click", (event) => {
      event.preventDefault();
      this.saveToStorage();
    });

    this.$postContainer.addEventListener("click", (event) => {
  const optionsBtn = event.target.closest(".options");
  if (optionsBtn) {
    event.preventDefault();
    const postDiv = optionsBtn.closest(".post");
    const postUserId = postDiv.getAttribute("data-userid");
    const postId = postDiv.getAttribute("data-postid");
    this.lastClickedPostId = postId;
    const isOwner = this.checkOwner({ userId: postUserId });

    const listItems = this.$optionsModal.querySelectorAll("li");
    if (isOwner) {
      listItems[0].textContent = "Edit";
      listItems[1].textContent = "Delete";
    } else {
      listItems[0].textContent = "Report";
      listItems[1].textContent = "Unfollow";
    }
    this.$optionsModal.style.display = "block";
  }
});

    this.$cancel.addEventListener("click", (event) => {
      event.preventDefault();
      this.$optionsModal.style.display = "none";
    });

    const editButton = this.$optionsModal.querySelector("li");
    editButton.addEventListener("click", (event) => {
  if (editButton.textContent === "Edit") {
    const postId = this.lastClickedPostId;
    if (!postId) return;

    this.firestore.collection("images").doc(postId).get().then(doc => {
      if (doc.exists) {
        const post = doc.data();
        this.$caption.value = post.caption;
        const img = document.querySelector("#current-edit-image");
        if (img) {
          img.src = post.url;
          img.style.display = "block";
        }
        this.editingPostId = postId;
        this.handleUpload();
        this.$optionsModal.style.display = "none";
      }
    });
  }
});

const deleteButton = this.$optionsModal.querySelectorAll("li")[1];
deleteButton.addEventListener("click", (event) => {
  if (deleteButton.textContent === "Delete") {
    const postId = this.lastClickedPostId;
    if (!postId) return;


    if (!confirm("Are you sure you want to delete this post?")) return;

    this.firestore.collection("images").doc(postId).delete()
      .then(() => {
        this.$optionsModal.style.display = "none";
        this.displayPost(); 
      })
      .catch((error) => {
        alert("Failed to delete post: " + error.message);
      });
  }
});


}

saveToStorage() {
  const file = this.$fileInput.files[0];
  const captionValue = this.$caption.value;
  const user = firebase.auth().currentUser;
  const displayName = user.displayName;
  if (!user) return;

  if (this.editingPostId) {
    const postRef = this.firestore.collection("images").doc(this.editingPostId);
    if (file) {
     
      const storageRef = this.storage.ref("images/" + file.name);
      const uploadTask = storageRef.put(file);
      uploadTask.on("state_changed", null, null, () => {
        storageRef.getDownloadURL().then((url) => {
          postRef.update({
            caption: captionValue,
            url: url,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          }).then(() => {
            this.editingPostId = null;
            this.$fileInput.value = "";
            this.$caption.value = "";
            this.handleDiscard();
            this.displayPost();
          });
        });
      });
    } else {
      postRef.update({
        caption: captionValue,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      }).then(() => {
        this.editingPostId = null;
        this.$fileInput.value = "";
        this.$caption.value = "";
        this.handleDiscard();
        this.displayPost();
      });
    }
  } else {
    if (!file) return;
    const storageRef = this.storage.ref("images/" + file.name);
    const uploadTask = storageRef.put(file);
    uploadTask.on("state_changed", null, null, () => {
      storageRef.getDownloadURL().then((url) => {
        const imageData = {
          userId: user.uid,
          displayName: displayName,
          photoURL: user.photoURL,
          caption: captionValue,
          url: url,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        };
        this.firestore.collection("images").add(imageData).then(() => {
          this.$fileInput.value = "";
          this.$caption.value = "";
          this.handleDiscard();
          this.displayPost();
        });
      });
    });
  }
}

  handleUpload() {
    this.$firebaseAuthContainer.style.display = "none";
    this.$app.style.display = "none";
    this.$uploadPage.style.display = "block";
  }

  handleDiscard() {
    this.$firebaseAuthContainer.style.display = "none";
    this.$app.style.display = "block";
    this.$uploadPage.style.display = "none";
    const img = document.querySelector("#current-edit-image");
    if (img) {
      img.src = "";
      img.style.display = "none";
    }
}

  handleAuth() {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.$authUser.innerHTML = "Logout";
        this.redirectToApp();
        this.displayPost();
      } else {
        this.redirectToAuth();
      }
    });
  }

  handleLogout() {
    firebase
      .auth()
      .signOut()
      .then(() => {
        this.redirectToAuth();
      })
      .catch((error) => {
        console.log("ERROR OCCURRED", error);
      });
  }

  redirectToApp() {
    this.$firebaseAuthContainer.style.display = "none";
    this.$app.style.display = "block";
  }

  redirectToAuth() {
    this.$firebaseAuthContainer.style.display = "block";
    this.$app.style.display = "none";

    this.ui.start("#firebaseui-auth-container", {
      signInOptions: [firebase.auth.EmailAuthProvider.PROVIDER_ID],
    });
  }

  addEventListeners() {
    this.$discardButton.addEventListener("click", (event) => {
      this.handleDiscard();
    });
  }

checkOwner(post) {
  const user = firebase.auth().currentUser;
  if (!user) return false;
  return user.uid === post.userId;
}

  displayPost() {
    this.$postContainer.innerHTML = "";
    this.firestore.collection("images").orderBy("timestamp", "desc").get()
    .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          const post = doc.data();
          this.$postContainer.innerHTML += `
    <div class="post" data-userid="${post.userId}" data-postid="${doc.id}">
      <div class="header">
        <div class="profile-area">
          <div class="post-pic">
            <img class="_6q-tv" data-testid="user-avatar" draggable="false" src="${post.url}" />
          </div>
          <span class="profile-name">${post.displayName}</span>
        </div>
        <div class="options">
          <svg aria-label="More options" class="_8-yf5" fill="#262626" height="16" viewBox="0 0 48 48" width="16">
            <circle cx="8" cy="24" r="4.5"></circle>
            <circle cx="24" cy="24" r="4.5"></circle>
            <circle cx="40" cy="24" r="4.5"></circle>
          </svg>
        </div>
      </div>
      <div class="body">
        <img alt="Post image" class="FFVAD" src="${post.url}" style="object-fit: cover" />
      </div>
      <div class="footer">
        <span class="caption"><b>${post.displayName}</b> ${post.caption}</span>
      </div>
    </div>
  `;
        });
      })
      .catch((error) => {
        console.error("Error fetching posts:", error);
      });
  }
}

const InstagramApp = new App();
