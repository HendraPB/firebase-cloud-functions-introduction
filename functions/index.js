const functions = require("firebase-functions");
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: serviceAccount.project_id+'.firebaseio.com/',
  storageBucket: serviceAccount.project_id+'.appspot.com'
});
const os = require("os");
const path = require("path");
const spawn = require("child-process-promise").spawn;
const cors = require("cors")({ origin: true });
const Busboy = require("busboy");
const fs = require("fs");

exports.onFileChange = functions.storage.object().onFinalize(async (object) => {
  // generate Thumbnail Triggered

  const fileBucket = object.bucket; // The Storage bucket that contains the file.
  const filePath = object.name; // File path in the bucket.
  const contentType = object.contentType; // File content type.
  const metageneration = object.metageneration; // Number of times metadata has been generated. New objects have a value of 1.
  const fileName = path.basename(filePath);
  const bucket = admin.storage().bucket(fileBucket);

  // Once the thumbnail has been uploaded this function will trigerred again then create download URL use filename as firebase database key.
  if (fileName.startsWith('thumb_')) {
    return bucket.file(filePath).getSignedUrl({
      action: 'read',
      expires: '01-04-2593'
    })
    .then(signedUrls => {
      admin.database().ref(fileName.split(".")[0].replace('thumb_', '')).update({
        path: signedUrls[0],
      });
    });
  }

  // Download file from bucket.
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const metadata = {
    contentType: contentType,
  };
  await bucket.file(filePath).download({destination: tempFilePath});
  // Generate a thumbnail using ImageMagick.
  await spawn('convert', [tempFilePath, '-thumbnail', '500x500>', tempFilePath]);
  // We add a 'thumb_' prefix to thumbnails file name. That's where we'll upload the thumbnail.
  const thumbFileName = `thumb_${fileName}`;
  const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);
  // Uploading the thumbnail.
  await bucket.upload(tempFilePath, {
    destination: thumbFilePath,
    metadata: metadata,
  });

  await bucket.file(filePath).delete();
  await fs.unlinkSync(tempFilePath);
  return console.log('Thumbnail uploaded.')
});

exports.uploadFile = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== "POST") {
      return res.status(500).json({
        message: "Not allowed"
      });
    }
    const busboy = new Busboy({ headers: req.headers });
    let uploadData = null;

    busboy.on("file", async (fieldname, file, filename, encoding, mimetype) => {
      // check if the filename contain character that cannot be firebase database key.
      await admin.database().ref(filename.split(".")[0]).set({
        path: 'url not available yet',
      })
      .catch(function(error) {
        return res.status(500).json({
          message: error.message+'. Keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]"'
        });
      });

      if (!mimetype.startsWith('image/')) {
        return res.status(500).json({
          message: "Cannot upload other than image files"
        });
      }
      const filepath = path.join(os.tmpdir(), filename);
      uploadData = { file: filepath, type: mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on("finish", () => {
      const bucket = admin.storage().bucket();
      bucket.upload(uploadData.file, {
        uploadType: "media",
        metadata: {
          metadata: {
            contentType: uploadData.type
          }
        }
      })
      .then(() => {
        res.status(200).json({
          message: "File uploaded successfully"
        });
      })
      .catch(err => {
        res.status(500).json({
          error: err
        });
      });
    });
    busboy.end(req.rawBody);
  });
});