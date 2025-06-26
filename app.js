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
        this.$discardButton = document.querySelector(".discard-btn")
        this.$postContainer = document.querySelector(".posts")
        this.ui = new firebaseui.auth.AuthUI(firebase.auth());
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
    }

    saveToStorage() {
        const file = this.$fileInput.files[0];
        if (!file) return;
        const captionValue = this.$caption.value;
        const user = firebase.auth().currentUser;
        if (!user) return;
        const displayName = user.displayName;
        const storageRef = this.storage.ref('images/' + file.name);
        const uploadTask = storageRef.put(file);
        uploadTask.on('state_changed', null, null, () => {
            storageRef.getDownloadURL().then((url) => {
                const imageData = {
                    userId: user.uid,
                    displayName: displayName,
                    caption: captionValue,
                    url: url,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                return this.firestore.collection('images').add(imageData);
            }).then(() => {
                this.$fileInput.value = '';
                this.$caption.value = '';
                this.handleDiscard();
                this.displayPost(); // Refresh posts after upload
            });
        });
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
      }

    handleAuth() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.$authUser.innerHTML = "Logout";
                this.redirectToApp();
                this.displayPost(); // Show posts after login
            } else {
                this.redirectToAuth();
            }
        });
    }

    handleLogout() {
        firebase.auth().signOut().then(() => {
            this.redirectToAuth();
        }).catch((error) => {
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

        this.ui.start('#firebaseui-auth-container', {
            signInOptions: [
                firebase.auth.EmailAuthProvider.PROVIDER_ID
            ],
            // Other config options...
        });
    }

    addEventListeners() {
        this.$discardButton.addEventListener("click", (event) => {
          this.handleDiscard()
        })
      }

      displayPost() {
        this.$postContainer.innerHTML = ""; // Clear previous posts
        this.firestore.collection('images').orderBy('timestamp', 'desc').get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const post = doc.data();
                this.$postContainer.innerHTML += `
                    <div class="post">
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
        }).catch((error) => {
            console.error("Error fetching posts:", error);
        });
    }
    
    
}

const InstagramApp = new App();
