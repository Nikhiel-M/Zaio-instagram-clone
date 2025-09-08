class App {
  constructor() {
    this.storage = firebase.storage();
    this.firestore = firebase.firestore();
    this.$fileInput = document.querySelector("#upload-file");
    this.$caption = document.querySelector("#create-caption");
    this.$uploadFileButton = document.querySelector("#upload-button");
    this.$app = document.querySelector("#app");
    this.$firebaseAuthContainer = document.querySelector(
      "#firebaseui-auth-container"
    );
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
    this.$progressBar = document.querySelector(".progress-bar");
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

        this.firestore
          .collection("images")
          .doc(postId)
          .get()
          .then((doc) => {
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

        this.firestore
          .collection("images")
          .doc(postId)
          .delete()
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
    if (!user || !file) return;

    const storageRef = this.storage.ref("images/" + file.name);
    const uploadTask = storageRef.put(file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

        this.$progressBar.style.width = progress + "%";
      },
      (error) => {},
      () => {
        storageRef.getDownloadURL().then((url) => {
          const imageData = {
            userId: user.uid,
            displayName: displayName,
            photoURL: user.photoURL,
            caption: captionValue,
            url: url,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          };

          this.firestore
            .collection("images")
            .add(imageData)
            .then(() => {
              this.$fileInput.value = "";
              this.$caption.value = "";
              this.handleDiscard();
              this.displayPost();

              setTimeout(() => {
                this.$progressBar.style.width = "0%";
              }, 1000);
            });
        });
      }
    );
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
    this.firestore
      .collection("images")
      .orderBy("timestamp", "desc")
      .get()
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
      <div class="interact-btns">
      <span class="x1qfufaz">
      <div class="x1ypdohk" data-visualcompletion="ignore-dynamic"><div class="x1i10hfl x972fbf x10w94by x1qhh985 x14e42zd x9f619 x3ct3a4 xdj266r x14z9mp xat24cr x1lziwak x16tdsg8 x1hl2dhg xggy1nq x1a2a7pz x6s0dn4 xjbqb8w x1ejq31n x18oe1m7 x1sy0etr xstzfhl x1ypdohk x78zum5 xl56j7k x1y1aw1k xf159sx xwib8y2 xmzvs34 xcdnw81" role="button" tabindex="0">
      <div class="x6s0dn4 x78zum5 xdt5ytf xl56j7k"><span><svg aria-label="Like" class="x1lliihq x1n2onr6 xyb1xck" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><title>Like</title>
      <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z"></path></svg></span>
      </div></div></div></span><span><div class="x1i10hfl x972fbf x10w94by x1qhh985 x14e42zd x9f619 x3ct3a4 xdj266r x14z9mp xat24cr x1lziwak x16tdsg8 x1hl2dhg xggy1nq x1a2a7pz x6s0dn4 xjbqb8w x1ejq31n x18oe1m7 x1sy0etr xstzfhl x1ypdohk x78zum5 xl56j7k x1y1aw1k xf159sx xwib8y2 xmzvs34 xcdnw81" role="button" tabindex="0"><div class="x6s0dn4 x78zum5 xdt5ytf xl56j7k"><svg aria-label="Comment" class="x1lliihq x1n2onr6 x5n08af" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><title>Comment</title><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></path></svg></div></div></span>
      <div class="x1i10hfl x1qjc9v5 xjbqb8w xjqpnuy xc5r6h4 xqeqjp1 x1phubyo x13fuv20 x18b5jzi x1q0q8m5 x1t7ytsu x972fbf x10w94by x1qhh985 x14e42zd x9f619 x1ypdohk xdl72j9 x2lah0s x3ct3a4 xdj266r x14z9mp xat24cr x1lziwak x2lwn1j xeuugli x1n2onr6 x16tdsg8 x1hl2dhg xggy1nq x1ja2u2z x1t137rt x1fmog5m xu25z0z x140muxe xo1y3bh x3nfvp2 x1q0g3np x87ps6o x1lku1pv x1a2a7pz x1mywscw x1y1aw1k xf159sx xwib8y2 xmzvs34" role="button" tabindex="0"><svg aria-label="Share" class="x1lliihq x1n2onr6 xyb1xck" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><title>Share</title><line fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" x1="22" x2="9.218" y1="3" y2="10.083"></line><polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></polygon></svg>
      <div class="x1ey2m1c xtijo5x x1o0tod xg01cxk x47corl x10l6tqk x13vifvy x1ebt8du x19991ni x1dhq9h x1fmog5m xu25z0z x140muxe xo1y3bh" role="none" data-visualcompletion="ignore"></div></div></div>
        
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
