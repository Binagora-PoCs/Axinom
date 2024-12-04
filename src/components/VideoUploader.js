import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { BlobServiceClient } from "@azure/storage-blob";
import { Button, ProgressBar, Form } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import dashjs from "dashjs";

const VideoUploader = () => {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [encodingMessages, setEncodingMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [jobId, setJobId] = useState(null);
  const pollingIntervalRef = useRef(null);
  const [dashUrl, setDashUrl] = useState(null);
  const videoRef = useRef(null);
  const [axinomAccessToken, setAccessToken] = useState("");

  const BLOB_SAS_URL = process.env.REACT_APP_BLOB_URL + "/" + process.env.REACT_APP_AZURE_STORAGE_CONTAINER_INPUT_NAME + "?" + process.env.REACT_APP_SAS_TOKEN;

// Function to authenticate service account and retrieve an access token
  const authenticateServiceAccount = async () => {
    try {
      console.log(process.env.REACT_APP_AXINOM_CLIENT_ID);
      console.log(process.env.REACT_APP_AXINOM_CLIENT_SECRET);
      console.log("Environment Variables:", process.env);
      const query = `
        mutation {
          authenticateServiceAccount(
            input: {
              clientId: "${process.env.REACT_APP_AXINOM_CLIENT_ID}",
              clientSecret: "${process.env.REACT_APP_AXINOM_CLIENT_SECRET}"
            }
          ) {
            accessToken
            expiresInSeconds
            tokenType
          }
        }
      `;

      const response = await axios.post(
        process.env.REACT_APP_AXINOM_AUTH_URL,
        { query },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const token = response.data.data.authenticateServiceAccount.accessToken;
      setAccessToken(token);
      console.log("Access Token Generated:", token);
    } catch (error) {
      console.error("Failed to authenticate service account:", error.message);
      setMessage("Authentication failed. Check your credentials.");
    }
  };

  // Trigger the authentication function on component mount
  useEffect(() => {
    authenticateServiceAccount();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadFile = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    try {
      setMessage("Uploading...");

      // Step 1: Create a BlobServiceClient using the SAS token
      const blobServiceClient = new BlobServiceClient(BLOB_SAS_URL);

      // Step 2: Get a reference to the container and blob
      const containerClient = blobServiceClient.getContainerClient(file.name);
      const blockBlobClient = containerClient.getBlockBlobClient(file.name);

      // Step 3: Upload the file
      const uploadBlobOptions = {
        blobHTTPHeaders: { blobContentType: file.type },
        onProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loadedBytes / file.size) * 100);
          setUploadProgress(progress);
        },
      };

      await blockBlobClient.uploadBrowserData(file, uploadBlobOptions);
      copyWatermarkToSubdirectory();
      setMessage("Upload successful! Initiating encoding...");
      initiateEncoding(file.name); // Pass the uploaded file name
    } catch (error) {
      setMessage("Upload failed. Please try again.");
      console.error("Error uploading file:", error.message);
    }
  };

  const copyWatermarkToSubdirectory = async () => {
    const containerName = "video-input"; // Your container name
    const watermarkFileName = "logo-binagora.png"; // Replace with your watermark file name
    const newSubDirectory = file.name; // Replace with the name of the new subdirectory
  
    try {
      // Create BlobServiceClient
      const blobServiceClient = new BlobServiceClient(process.env.REACT_APP_BLOB_URL + "?" + process.env.REACT_APP_SAS_TOKEN);
  
      // Get the container client
      const containerClient = blobServiceClient.getContainerClient(containerName);
  
      // Define source and destination blob paths
      const sourceBlobPath = watermarkFileName;
      const destinationBlobPath = `${newSubDirectory}/${watermarkFileName}`;
  
      // Get source and destination blob clients
      const sourceBlobClient = containerClient.getBlobClient(sourceBlobPath);
      const destinationBlobClient = containerClient.getBlobClient(destinationBlobPath);
  
      // Start the copy operation
      const copyPoller = await destinationBlobClient.beginCopyFromURL(sourceBlobClient.url);
  
      // Wait for the copy to complete
      await copyPoller.pollUntilDone();
  
      console.log(`Watermark file copied from ${sourceBlobPath} to ${destinationBlobPath}`);
    } catch (error) {
      console.error("Error copying the watermark file:", error.message);
    }
  };

  const initiateEncoding = async (fileName) => {
    try {
      const requestBody = {
        ExternalId: "10",
        ExternalType: "movie",
        ContentAcquisition: {
          Provider: "AzureBlob",
          UriPath: process.env.REACT_APP_BLOB_URL + "/" + process.env.REACT_APP_AZURE_STORAGE_CONTAINER_INPUT_NAME + "/" + fileName,
          CredentialsName: process.env.REACT_APP_AZURE_STORAGE_ACCOUNT_NAME,
          CredentialsSecret: process.env.REACT_APP_AZURE_STORAGE_ENCRYPTED_PRIMARY_KEY,
          CredentialsProtection: "Encrypted"
        },
        MediaMappings: {
          VideoStreamExpression: "^.*\\.(mp4)$",
          FailOnNoVideoTracks: true,
          FailOnNoAudioTracks: false,
          FailOnNoSubtitleTracks: false,
          FailOnNoCaptionTracks: false
        },
        ContentProcessing: {
            OutputFormat: ["Cmaf"],
            VisibleVideoWatermarks: [
              {
                  WatermarkFileName: "logo-binagora.png",
                  PositionXPercentage: 20, 
                  PositionYPercentage: 20, 
                  StartTime: "00:00:00",
                  EndTime: "00:00:10",
                  FadeInDurationInMs: 1000,
                  FadeOutDurationInMs: 1000,
                  SizePercentage: 30, 
                  OpacityPercentage: 100
              }
          ]    
        },
        ContentPublishing: {
            Provider: "AzureBlob",
            UriPath: process.env.REACT_APP_BLOB_URL + "/" + process.env.REACT_APP_AZURE_STORAGE_CONTAINER_OUTPUT_NAME + "/" + fileName,
            CredentialsName: process.env.REACT_APP_AZURE_STORAGE_ACCOUNT_NAME,
            CredentialsSecret: process.env.REACT_APP_AZURE_STORAGE_ENCRYPTED_PRIMARY_KEY,
            CredentialsProtection: "Encrypted"
        },
        MessagePublishers: [ {
            Type : "rabbitmq",
            Protocol: "amqps", // amqp or amqps
            Host : process.env.REACT_APP_RABBITMQ_HOST,
            VirtualHost : process.env.REACT_APP_RABBITMQ_VHOST,
            Queue: process.env.REACT_APP_RABBITMQ_ENCODING_QUEUE_NAME,
            Port: process.env.REACT_APP_RABBITMQ_PORT,
            CredentialsName : process.env.REACT_APP_RABBITMQ_CREDENTIALS_NAME,
            CredentialsSecret : process.env.REACT_APP_RABBITMQ_ENCRYPTED_CREDENTIALS_SECRET,
            CredentialsProtection: "Encrypted"
        }
      ]};

      const response = await axios.post("/api/Job", requestBody, {
        headers: {
          Authorization: `Bearer ${axinomAccessToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });

      const jobId = response.data.JobId;
      setJobId(jobId);
      setMessage(`Encoding started. Job ID: ${jobId}`);
    } catch (error) {
      setMessage("Failed to initiate encoding.");
      console.error("Error initiating encoding:", error.message);
    }
  };

  const monitorEncodingStatus = async (jobId) => {
    try {
      const response = await axios.get("http://localhost:3001/api/job-status");
      const messages = response.data.messages;

      const jobMessages = messages.filter((msg) => msg.JobId === jobId);

      if (jobMessages.length > 0) {
        setEncodingMessages((prevMessages) => [...prevMessages, ...jobMessages]);

        // Stop polling if a message contains the "output" field
        const completedMessage = jobMessages.find(
          (msg) => msg.Output
        );

        if (completedMessage) {
          setMessage(`Job completed with output: ${completedMessage.Output}`);
          setDashUrl(completedMessage.Output?.dash);
          clearInterval(pollingIntervalRef.current); // Stop polling
          pollingIntervalRef.current = null; // Clean up the reference
        }
      }
    } catch (error) {
      console.error("Error fetching encoding status:", error.message);
    }
  };
  

  useEffect(() => {
    if (jobId) {
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(() => {
          monitorEncodingStatus(jobId);
        }, 5000);
      }

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [jobId]);

  useEffect(() => {
    if (dashUrl && videoRef.current) {
      // Initialize the DASH player
      const player = dashjs.MediaPlayer().create();
      player.initialize(videoRef.current, dashUrl, true);
    }
  }, [dashUrl]);

  return (
    <div className="container mt-5">
      <h3>Upload and Encode Video</h3>
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Select a video file</Form.Label>
          <Form.Control type="file" accept="video/*" onChange={handleFileChange} />
        </Form.Group>
        {uploadProgress > 0 && (
          <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} />
        )}
        <Button className="mt-3" variant="primary" onClick={uploadFile}>
          Upload and Encode
        </Button>
      </Form>
      {message && <p className="mt-3">{message}</p>}

      <div className="d-flex mt-5">
        <div className="encoding-messages-container">
          <h4>Encoding Messages</h4>
          <ul>
            {encodingMessages.map((msg, index) => (
              <li key={index}>
                <strong>Job ID:</strong> {msg.JobId} <br />
                <strong>Timestamp:</strong> {new Date(msg.Timestamp).toLocaleString()} <br />
                <strong>Progress:</strong> {msg.Progress || "N/A"}% <br />
                <strong>Warnings:</strong> {msg.Warnings || "N/A"} <br />
                <strong>FileName:</strong> {msg.FileName || "N/A"}
              </li>
            ))}
          </ul>
        </div>

        {dashUrl && (
          <div className="video-player-container">
            <h4>Video Player</h4>
            <video ref={videoRef} controls style={{ width: "100%" }}></video>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;
