
let socket = io();
let localStream;
let peerConnection;
let country = "";
let language = "";

const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function startChat() {
  country = document.getElementById("countrySelect").value;
  language = document.getElementById("languageSelect").value;
  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
    document.getElementById("welcomeScreen").style.display = "none";
    document.getElementById("videoContainer").style.display = "flex";
    document.getElementById("chatContainer").style.display = "block";
    document.getElementById("controls").style.display = "flex";

    document.getElementById("localVideo").srcObject = stream;
    localStream = stream;
    socket.emit("join", { country, language });
  });
}

socket.on("match", (data) => {
  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = event => {
    if (event.candidate) socket.emit("candidate", event.candidate);
  };
  peerConnection.ontrack = event => {
    document.getElementById("remoteVideo").srcObject = event.streams[0];
  };

  if (data.initiator) {
    peerConnection.createOffer().then(offer => {
      peerConnection.setLocalDescription(offer);
      socket.emit("offer", offer);
    });
  }
});

socket.on("offer", (offer) => {
  peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  peerConnection.createAnswer().then(answer => {
    peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
  });
});

socket.on("answer", answer => {
  peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("candidate", candidate => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

function sendMessage() {
  const msg = document.getElementById("messageInput").value;
  socket.emit("message", msg);
  appendMessage("You", msg);
  document.getElementById("messageInput").value = "";
}

socket.on("message", msg => appendMessage("Stranger", msg));

function appendMessage(sender, msg) {
  const messages = document.getElementById("messages");
  messages.innerHTML += `<div><strong>${sender}:</strong> ${msg}</div>`;
  messages.scrollTop = messages.scrollHeight;
}

function skip() {
  location.reload();
}

function stop() {
  if (peerConnection) peerConnection.close();
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    document.getElementById("localVideo").srcObject = null;
    document.getElementById("remoteVideo").srcObject = null;
  }
  socket.emit("stop");
  document.getElementById("videoContainer").style.display = "none";
  document.getElementById("chatContainer").style.display = "none";
  document.getElementById("controls").style.display = "none";
  document.getElementById("welcomeScreen").style.display = "block";
}

function report() {
  socket.emit("report");
  alert("User reported.");
}
