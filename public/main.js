var socket = io.connect();

$("document").ready(function() {


    navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia;


    var localStream, localPeerConnection, remotePeerConnection;
    var sendChannel, receiveChannel;
    
    var room = 'dogroom';

    var localVid = $("#vidcam").get(0);
    var remoteVid = $("#vidcam2").get(0);

/*
    var constraints = {
        video: {
            mandatory: {
                minAspectRatio: 1.333,
                maxAspectRatio: 1.334
            },
            optional: [{
                    minFrameRate: 60
                },
                // {maxWidth : 640},
                //  {maxHeight : 480}
            ]
        }


    };
*/

var constraints = {
    mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
    }
};

    function trace(text) {
        console.log((performance.now() / 1000).toFixed(3) + ": " + text);
    }

    function gotStream(stream) {
        trace("Received local stream");
        localVid.src = window.URL.createObjectURL(stream);
        localStream = stream;
        
        if (localStream.getVideoTracks().length > 0) {
            trace("Using video device: " + localStream.getVideoTracks()[0].label);
        }

        if (localStream.getAudioTracks().length > 0) {
            trace("Useing audio device: " + localStream.getAudioTracks()[0].label);
        }

        var servers = null;

        localPeerConnection = new RTCPeerConnection(servers);
        trace("Created local peer connection object localPeerConnection");
        localPeerConnection.onicecandidate = gotLocalIceCandidate;

        localPeerConnection.addStream(localStream);
        trace("Added localstream to localPeerConnection");
        localPeerConnection.onaddstream = gotRemoteStream;
    }
    
    function gotRemoteStream(event)
    {
        remoteVid.src = URL.createObjectURL(event.stream);
        trace("Received remote stream");
    }

    function start() {
        trace("Requesting local stream");

        window.navigator.getUserMedia({video:true, audio:true}, gotStream, function(error) {
            trace("getUserMedia error: " + error);
        });
        
        console.log('Joining room ' + room);
        socket.emit('create or join',room);
    }
    
    $("#startBtn").click(start);
    $("#stopBtn").click(hangup);
    $("#callBtn").click(call);
  /*  $("#callBtn").click(function () {
        var data = $("#dataChannelSend").val();
        sendChannel.send(data);
        trace("Send data: " + data);
    });*/
    
    
    function createConnection() {
        
        var servers = null;
        
        localPeerConnection = new RTCPeerConnection(servers, 
            {optional : [{RtcDataChannels: true}]});
        trace("Created local peer connection object localPeerConnection");
        
        try {
            sendChannel = localPeerConnection.createDataChannel("sendDataChannel",
                {reliable : false});
            trace("Created send data channel")
        } catch (e)
        {
            trace("createDataChannel failed: " + e.message);
        }
        
        localPeerConnection.onicecandidate = gotLocalIceCandidate;
        sendChannel.onopen = handleSendDataStateChange;
        sendChannel.onclose = handleSendDataStateChange;
        
        remotePeerConnection = new RTCPeerConnection(servers,
            {optional : [{RtcDataChannels : true}]});
        trace("Created remote peer connection object remotePeerConnection");
        
        remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
        remotePeerConnection.ondatachannel = gotReceiveChannel;
        
        localPeerConnection.createOffer(gotLocalDescription,handleErr);
    }
    
    function sendData() {
        
    }
    
    function closeChannels ()
    {
        trace("Closing data channels");
        sendChannel.close();
        receiveChannel.close();
        localPeerConnection.close();
        remotePeerConnection.close();
        localPeerConnection = null;
        remotePeerConnection = null;
        $("#dataChannelSend").val("");
        $("#dataChannelReceive").val("");
    }
    
    function handleMessage(event)
    {
        trace("Received message: " + event.data);
        $("#dataChannelReceive").val(event.data);
    }
    
    function gotReceiveChannel(event)
    {
        trace("Receive channel entered");
        receiveChannel = event.channel;
        receiveChannel.onmessage = handleMessage;
        receiveChannel.onopen = handleReceiveChannelStateChange;
        receiveChannel.onclose = handleReceiveChannelStateChange;
    }
    
    function handleSendDataStateChange() {
        var readyState = sendChannel.readyState;
        trace("Send channel state is : " + readyState);
        
        var dataChannelSend = document.getElementById("dataChannelSend");
        
        if (readyState === "open")
        {
            dataChannelSend.disabled = false;
            dataChannelSend.focus();
            dataChannelSend.placeholder = "";
            
        }
        else
        {
            dataChannelSend.disabled = true;
        }
    }
    
    function handleReceiveChannelStateChange () {
        var readyState = receiveChannel.readyState;
        trace("Receive channel state is: " + readyState);
    }
    

    function call() {
        trace("Starting call");

        localPeerConnection.createOffer(gotLocalDescription,handleErr,constraints);
        
      //  remotePeerConnection = new RTCPeerConnection(servers);
      //  trace("Created remote peer connection object remotePeerConnection");
      //  remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
      //  remotePeerConnection.onaddstream = gotRemoteStream;
        
        
    }
    
    socket.on('joined',function (room) {
        var servers = null;
        
        console.log('other person joined ' + room);
    });
    
    function gotLocalDescription(description)
    {
        localPeerConnection.setLocalDescription(description);
        trace("Offer from localPeerConnection: \n" + description.sdp);
        socket.emit("remote description", {type : 'offer',desc: description});
    }
    
    socket.on("remote description", function (description) {
            localPeerConnection.setRemoteDescription(description.desc);
            
            if (description.type === 'offer')
            {
                localPeerConnection.createAnswer(gotRemoteDescription, handleErr,constraints);
            }
    });
    
    //socket.on("sender description", function (description) {
   //         localPeerConnection.setRemoteDescription(description);
   //         localPeerConnection.createAnswer(gotRemoteDescription, handleErr);
   // });
    
    function gotRemoteDescription(description)
    {
        //remotePeerConnection.setLocalDescription(description);
        localPeerConnection.setLocalDescription(description);
        trace("Answer from remotePeerConnection: \n" + description.sdp);
       // localPeerConnection.setRemoteDescription(description);
       socket.emit("remote description",{type : 'answer',desc: description})
    }
    
    function handleErr()
    {
        
    }
    
    function hangup() {
        trace("Ending call");
        
        if (localPeerConnection)
            localPeerConnection.close();
        
        if (remotePeerConnection)
            remotePeerConnection.close();
        
        localPeerConnection = null;
    //    remotePeerConnection = null;
        localStream.stop();
        localVid.src = null;
        remoteVid.src = null;
    }
    
    socket.on("ice candidate", function (candidate) {
        localPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        trace("Local ICE candidate: \n" + candidate.candidate);
    });

    function gotLocalIceCandidate(event) {
        if (event.candidate) {
            socket.emit("ice candidate",event.candidate);
        }
    }

    function gotRemoteIceCandidate(event) {
        if (event.candidate) {
            localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
            trace("Remote ICE candidate: \n " + event.candidate.candidate);
        }
    }

    function successCallback(stream) {
        window.stream = stream;
        var video = document.querySelector("video");

        video.src = window.URL.createObjectURL(stream);
        video.play();

        var vidTrack = video.getVideoTracks()[0];
    }

    function errorCallback(error) {
        alert(navigator.getUserMedia);

        var props = "";

        for (var prop in error) {
            props += prop + "-" + error[prop] + " ";
        }

        alert("getUserMedia error " + props);
    }


//    $("#startBtn").click(function() {
//       window.navigator.getUserMedia(constraints, successCallback, errorCallback);
//    });

});
