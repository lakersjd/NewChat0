
fetch('https://ipwho.is/')
  .then(response => response.json())
  .then(data => {
    const country = data.country_code?.toLowerCase() || 'any';
    const language = (data.languages?.split(',')[0] || 'any').toLowerCase();
    document.getElementById('country').value = country;
    document.getElementById('language').value = language;
  })
  .catch(() => {
    console.warn('GeoIP detection failed.');
  });


const socket = io();
let localStream;
let peerConnection;
let currentRoom = null;

const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

document.getElementById('preferences').onsubmit = async (e) => {
  e.preventDefault();
  document.getElementById('home').classList.add('hidden');
  document.getElementById('chat').classList.remove('hidden');
  const username = document.getElementById('username').value;
  const gender = document.getElementById('gender').value;
  const tags = document.getElementById('tags').value;
  const country = document.getElementById('country').value;
  const language = document.getElementById('language').value;
  socket.emit('joinQueue', { username, gender, tags: tags.split(','), country, language });

  
  document.getElementById('home').classList.add('hidden');
  document.getElementById('searching').classList.remove('hidden');
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

  document.getElementById('localVideo').srcObject = localStream;
};

socket.on('match', (roomId) => {
  currentRoom = roomId;
  peerConnection = new RTCPeerConnection(servers);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = ({ streams: [remoteStream] }) => {
    document.getElementById('remoteVideo').srcObject = remoteStream;
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('signal', { roomId: currentRoom, candidate: event.candidate });
    }
  };

  peerConnection.createOffer()
    .then(offer => peerConnection.setLocalDescription(offer))
    .then(() => {
      socket.emit('signal', { roomId: currentRoom, sdp: peerConnection.localDescription });
    });
});

socket.on('signal', async ({ sdp, candidate }) => {
  if (sdp) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    if (sdp.type === 'offer') {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('signal', { roomId: currentRoom, sdp: answer });
    }
  }
  if (candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

document.getElementById('sendBtn').onclick = () => {
  const message = document.getElementById('messageInput').value;
  appendMessage('Me', message);
  socket.emit('chatMessage', { roomId: currentRoom, message });
  document.getElementById('messageInput').value = '';
};

socket.on('chatMessage', ({ sender, message }) => {
  appendMessage(sender, message);
});

function appendMessage(sender, message) {
  const div = document.createElement('div');
  div.textContent = `${sender}: ${message}`;
  document.getElementById('messages').appendChild(div);
}

document.getElementById('reportBtn').onclick = () => {
  socket.emit('reportUser', { roomId: currentRoom });
  alert('User reported.');
};

document.getElementById('blockBtn').onclick = () => {
  socket.emit('blockUser', { roomId: currentRoom });
  alert('User blocked. You won’t be matched again.');
};

document.getElementById('skipBtn').onclick = () => {
  socket.emit('leaveRoom', { roomId: currentRoom });
  socket.emit('joinQueue', {}); // Try finding a new person
  resetChat();
};

document.getElementById('stopBtn').onclick = () => {
  socket.emit('leaveRoom', { roomId: currentRoom });
  currentRoom = null;
  document.getElementById('chat').classList.add('hidden');
  document.getElementById('home').classList.remove('hidden');
};

function resetChat() {
  document.getElementById('remoteVideo').srcObject = null;
  document.getElementById('messages').innerHTML = '';
  if (peerConnection) peerConnection.close();
}

socket.on('strangerDisconnected', () => {
  alert('Stranger disconnected.');
  resetChat();
});

socket.on('stopSearching', () => {
  document.getElementById('searching').classList.add('hidden');
  document.getElementById('chat').classList.remove('hidden');
});

let isMuted = false;
document.getElementById('muteBtn').onclick = () => {
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
  document.getElementById('muteBtn').textContent = isMuted ? "Unmute" : "Mute";
};

// Permission handling
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(err => {
  alert("Please allow access to camera and microphone to use the chat.");
});

socket.on('match', ({ roomId, partnerInfo }) => {
  currentRoom = roomId;
  document.getElementById('partnerCountry').textContent = partnerInfo.country || "Unknown";
  document.getElementById('partnerLanguage').textContent = partnerInfo.language || "Unknown";
});

socket.on('userCount', (count) => {
  document.getElementById('userCount').textContent = `Users Online: ${count}`;
});
