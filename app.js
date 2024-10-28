class App {
    constructor() {
        this.$firebaseAuthContainer = document.querySelector("#firebaseui-auth-container");
        this.$mainContainer = document.querySelector(".main-container")
        this.$logoutButton = document.querySelector(".logout-button")



        this.ui = new firebaseui.auth.AuthUI(auth);
        this.handelAuth();


       this.ui.start('#firebaseui-auth-container', {
        signInOptions: [
          firebase.auth.EmailAuthProvider.PROVIDER_ID
        ],
        // Other config options...
        
      });

      this.addEventlistenrs()
    }


    handelAuth() {
        firebase.auth().onAuthStateChanged((user) => {
    
          if (user) {
            console.log(user.uid)
            this.userId = user.uid
            this.redirectToApp()
    
          } else {
            this.redirectToAuth()
          }
        });
      }


      redirectToApp(){
        this.$firebaseAuthContainer.style.display = "none"
        this.$mainContainer.style.display = "block"    
      }
    
      redirectToAuth() {
        this.$firebaseAuthContainer.style.display = "block"
        this.$mainContainer.style.display = "none";
    
        this.ui.start('#firebaseui-auth-container', {
          callbacks: {
            signInSuccessWithAuthResult: (authResult, redirectUrl) => {
              // User successfully signed in.
              // Return type determines whether we continue the redirect automatically
              // or whether we leave that to developer to handle
              this.userId = authResult.user.uid
              this.redirectToApp()
              return false;
            }
          },
          signInOptions: [
            firebase.auth.EmailAuthProvider.PROVIDER_ID,
            firebase.auth.GoogleAuthProvider.PROVIDER_ID,
          ],
          // Other config options...
        });
      }

      handelLogout() {
        firebase.auth().signOut().then(() => {
          this.redirectToAuth()
        }).catch((error) => {
          console.log("ERROR OCCURED", error)
            });
      }


      addEventlistenrs() {
        this.$logoutButton.addEventListener("click", (event) => {
            this.handelLogout();
        })
      }
    



}





const app = new App()