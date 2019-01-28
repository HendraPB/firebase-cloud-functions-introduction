# Modifications
1. Create download URL on thumb file and save it on firebase database using filename as key
2. Delete uploaded file on storage after thumb file generated
3. Use firebase-admin instead of google-cloud-storage

## Installation
``` bash
#clone repo
git clone https://github.com/HendraPB/firebase-cloud-functions-introduction.git

# change your directory to project
cd firebase-cloud-functions-introduction

# install Firebase cli(skip this step if you already installed it)
npm install -g firebase-tools

# Connects your local machine to Firebase(skip this step if your local machine already connects)
firebase login

# Setting up Firebase functions and choose your project then make sure you choose other options by default
firebase init functions

# configure firebase.json
cp firebase.json.example firebase.json

# install Firebase function dependencies(skip this step if you already installed it on firebase init)
cd functions && npm install && cd ..
```

Before deploying, download Firebase Admin SDK at https://console.firebase.google.com/project/_/settings/seraccounts/adminsdk?hl=en then move it to the function folder and rename it to serviceAccount.json

``` bash
# deploy it on Firebase
firebase deploy
```

## how to use it
For now you can follow this tutorial https://academind.com/learn/vue-js/snippets/image-upload/