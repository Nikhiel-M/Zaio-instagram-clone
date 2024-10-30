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

        this.ui = new firebaseui.auth.AuthUI(firebase.auth());
        this.handleAuth();

        this.$authUser.addEventListener("click", (event) => {
            this.handleLogout();
        });

        this.$uploadButton.addEventListener("click", (event) => {
            this.handleUpload();
            this.saveToStorage();
            this.readFromStorage();
        });

     
    }

    saveToStorage() {
        this.$uploadFileButton.addEventListener("click", (event) => {
            event.preventDefault(); // Prevent default form submission if within a form

            const file = this.$fileInput.files[0]; // Get the first file input
            if (!file) {
                console.error("No file selected.");
                return;
            }

            const captionValue = this.$caption.value; // Get current caption value
            console.log("File:", file);
            console.log("Caption:", captionValue);

            const user = firebase.auth().currentUser;
            if (!user) {
                console.error("No user is signed in.");
                return;
            }

            // Get user's display name
            const displayName = user.displayName;

            const storageRef = this.storage.ref('images/' + file.name);
            const uploadTask = storageRef.put(file);

            // Attach listener to monitor upload progress
            uploadTask.on('state_changed', (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
            }, (error) => {
                console.error("Error during upload:", error);
            }, () => {
                // Upload completed successfully, now we get the download URL
                storageRef.getDownloadURL().then((url) => {
                    console.log('File available at', url);

                    const userId = firebase.auth().currentUser.uid;

                    const imageData = {
                        userId: userId,
                        displayName: displayName, // Include user's display name
                        caption: captionValue,
                        url: url,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    // Add imageData to Firestore
                    return this.firestore.collection('images').add(imageData);
                }).then(() => {
                    console.log('Data stored successfully in Firestore');
                    // Optionally, reset the input fields
                    this.$fileInput.value = '';
                    this.$caption.value = '';
                }).catch((error) => {
                    console.error('Error storing data:', error);
                });
            });
        });
    }

    readFromStorage() {
        const dynamicContentDiv = document.querySelector("#dynamic-content");
        const dynamicCaptionDiv = document.querySelector("#dynamic-caption");

        this.firestore.collection('images').orderBy('timestamp', 'desc').get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const post = doc.data();
                // Populate dynamic content and caption divs
                dynamicContentDiv.innerHTML += `<img src="${post.url}" alt="Dynamic Image" />`;
                dynamicCaptionDiv.innerHTML += `<p><b>${post.displayName}</b> ${post.caption}</p>`;
            });
        }).catch((error) => {
            console.error("Error fetching posts:", error);
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

    addEventlistenrs() {
        this.$discardButton.addEventListener("click", (event) => {
          this.handleDiscard()
        })
      }
}

const InstagramApp = new App();
