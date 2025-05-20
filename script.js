
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
  socket.emit('joinQueue', { username, gender, tags: tags.split(',') });

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
