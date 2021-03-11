var conf = {
	"iceServers": [
		{
			"urls": [
				"stun:74.125.247.128:3478",
				"stun:[2001:4860:4864:4:8000::]:3478"
			]
		},
		{
			"urls": [
				"turn:74.125.247.128:3478?transport=udp",
				"turn:[2001:4860:4864:4:8000::]:3478?transport=udp",
				"turn:74.125.247.128:3478?transport=tcp",
				"turn:[2001:4860:4864:4:8000::]:3478?transport=tcp"
			],
			"username": "CObVrYIGEgZDOQHXfxgYqvGggqMKIICjBTAK",
			"credential": "KUy+sU3qiIMWWKr2/o2ZRS4Y5XI="
		}
	]
};

var pc = new RTCPeerConnection(conf);
var localStream, _fileChannel, chatEnabled, context, source,
	_chatChannel, sendFileDom = {},
	recFileDom = {}, receiveBuffer = [],
	receivedSize = 0,
	file,
	bytesPrev = 0;

var myPassword = "9418409uf9879";

function errHandler(err) {
	console.log(err);
}

function enableChat() {
	enable_chat.checked ? (chatEnabled = true) : (chatEnabled = false);
}
enableChat();

navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
	localStream = stream;
	// micused.innerHTML = localStream.getAudioTracks()[0].label;
	localStream.getTracks().forEach((track) => {
		pc.addTrack(track, localStream);
	});
}).catch(errHandler);

const remoteStream = new MediaStream();
const remoteAudio = document.querySelector('#remote');
remoteAudio.srcObject = remoteStream;

pc.addEventListener('track', async (event) => {
	remoteStream.addTrack(event.track, remoteStream);
});

function sendMsg() {
	var text = sendTxt.value;
	chat.innerHTML = chat.innerHTML + "<pre class=sent>" + text + "</pre>";
	_chatChannel.send(text);
	sendTxt.value = "";
	return false;
}
pc.ondatachannel = function (e) {
	if (e.channel.label == "fileChannel") {
		console.log('fileChannel Received -', e);
		_fileChannel = e.channel;
		fileChannel(e.channel);
	}
	if (e.channel.label == "chatChannel") {
		console.log('chatChannel Received -', e);
		_chatChannel = e.channel;
		chatChannel(e.channel);
	}
};

pc.onicecandidate = function (e) {
	var cand = e.candidate;
	if (!cand) {
		// console.log('iceGatheringState complete', pc.localDescription.sdp);
		console.log(pc.localDescription)
		var localValue = JSON.stringify(pc.localDescription);

		localOffer.value = CryptoJS.AES.encrypt(localValue, myPassword);
	} else {
		console.log(cand.candidate);
	}
}
pc.oniceconnectionstatechange = function () {
	console.log('iceconnectionstatechange: ', pc.iceConnectionState);
}
pc.onaddstream = function (e) {
	console.log('remote onaddstream', e.stream);
	remote.src = URL.createObjectURL(e.stream);
}
pc.onconnection = function (e) {
	console.log('onconnection ', e);
}

remoteOfferGot.onclick = function () {
	var remoteValue = CryptoJS.AES.decrypt(remoteOffer.value, myPassword);
	console.log(remoteValue.toString(CryptoJS.enc.Utf8));
	var _remoteOffer = new RTCSessionDescription(JSON.parse(remoteValue.toString(CryptoJS.enc.Utf8)));
	console.log('remoteOffer \n', _remoteOffer);
	pc.setRemoteDescription(_remoteOffer).then(function () {
		console.log('setRemoteDescription ok');
		if (_remoteOffer.type == "offer") {
			pc.createAnswer().then(function (description) {
				console.log('createAnswer 200 ok \n', description);
				pc.setLocalDescription(description).then(function () {
				}).catch(errHandler);
			}).catch(errHandler);
		}
	}).catch(errHandler);
}

localOfferSet.onclick = function () {
	if (chatEnabled) {
		_chatChannel = pc.createDataChannel('chatChannel');
		// _fileChannel = pc.createDataChannel('fileChannel');
		// _fileChannel.binaryType = 'arraybuffer';
		chatChannel(_chatChannel);
		// fileChannel(_fileChannel);
	}
	pc.createOffer().then(des => {
		console.log('createOffer ok ');
		pc.setLocalDescription(des).then(() => {
			setTimeout(function () {
				if (pc.iceGatheringState == "complete") {
					return;
				} else {
					console.log('after GetherTimeout');

					var localValue = JSON.stringify(pc.localDescription);

					localOffer.value = CryptoJS.AES.encrypt(localValue, myPassword);
				}
			}, 2000);
			console.log('setLocalDescription ok');
		}).catch(errHandler);
		// For chat
	}).catch(errHandler);
}



function chatChannel(e) {
	_chatChannel.onopen = function (e) {
		console.log('chat channel is open', e);
	}
	_chatChannel.onmessage = function (e) {
		chat.innerHTML = chat.innerHTML + "<pre>" + e.data + "</pre>"
	}
	_chatChannel.onclose = function () {
		console.log('chat channel closed');
	}
}

function Stats() {
	pc.getStats(null, function (stats) {
		for (var key in stats) {
			var res = stats[key];
			console.log(res.type, res.googActiveConnection);
			if (res.type === 'googCandidatePair' &&
				res.googActiveConnection === 'true') {
				// calculate current bitrate
				var bytesNow = res.bytesReceived;
				console.log('bit rate', (bytesNow - bytesPrev));
				bytesPrev = bytesNow;
			}
		}
	});
}

// streamAudioFile.onchange = function () {
// 	console.log('streamAudioFile');
// 	context = new AudioContext();
// 	var file = streamAudioFile.files[0];
// 	if (file) {
// 		if (file.type.match('audio*')) {
// 			var reader = new FileReader();
// 			reader.onload = (function (readEvent) {
// 				context.decodeAudioData(readEvent.target.result, function (buffer) {
// 					// create an audio source and connect it to the file buffer
// 					source = context.createBufferSource();
// 					source.buffer = buffer;
// 					source.start(0);

// 					// connect the audio stream to the audio hardware
// 					source.connect(context.destination);

// 					// create a destination for the remote browser
// 					var remote = context.createMediaStreamDestination();

// 					// connect the remote destination to the source
// 					source.connect(remote);

// 					local.srcObject = remote.stream
// 					local.muted = true;
// 					// add the stream to the peer connection
// 					pc.addStream(remote.stream);

// 					// create a SDP offer for the new stream
// 					// pc.createOffer(setLocalAndSendMessage);
// 				});
// 			});

// 			reader.readAsArrayBuffer(file);
// 		}
// 	}
// }

// var audioRTC = function (cb) {
// 	console.log('streamAudioFile');
// 	window.context = new AudioContext();
// 	var file = streamAudioFile.files[0];
// 	if (file) {
// 		if (file.type.match('audio*')) {
// 			var reader = new FileReader();
// 			reader.onload = (function (readEvent) {
// 				context.decodeAudioData(readEvent.target.result, function (buffer) {
// 					// create an audio source and connect it to the file buffer
// 					var source = context.createBufferSource();
// 					source.buffer = buffer;
// 					source.start(0);

// 					// connect the audio stream to the audio hardware
// 					source.connect(context.destination);

// 					// create a destination for the remote browser
// 					var remote = context.createMediaStreamDestination();

// 					// connect the remote destination to the source
// 					source.connect(remote);
// 					window.localStream = remote.stream;
// 					cb({ 'status': 'success', 'stream': true });
// 				});
// 			});

// 			reader.readAsArrayBuffer(file);
// 		}
// 	}
// }
