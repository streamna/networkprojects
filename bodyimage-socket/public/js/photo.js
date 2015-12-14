var width = 540;    // We will scale the photo width to this
var height = 0;     // This will be computed based on the input stream

var streaming = false;
var video = null;
var outputcanvas = null;
var outputctx=null;
var outputphoto = null;
var startbutton = null;
var ctracker; 
var ctrackerimage;
var canvasInput;
var cc;
var imgtgtbtn = null;
var retouchbtn = null;
var sendbtn = null;
var facefound = false;
var overlayposition = [];
var targetpositions=[];
var retouchunit=1;

function getposition(element){
    var rect = element.getBoundingClientRect();
    var elementLeft,elementTop; //x and y
    var scrollTop = document.documentElement.scrollTop?
                    document.documentElement.scrollTop:document.body.scrollTop;
    var scrollLeft = document.documentElement.scrollLeft?                   
                     document.documentElement.scrollLeft:document.body.scrollLeft;
    elementTop = rect.top+scrollTop;
    elementLeft = rect.left+scrollLeft;

    return [elementTop, elementLeft];
}

function clearphoto() {
    outputctx.fillStyle = "#AAA";
    outputctx.fillRect(0, 0, outputcanvas.width, outputcanvas.height);

    var data = outputcanvas.toDataURL('image/png');
    //outputphoto.setAttribute('src', data);
    outputphoto.src=data;
}

function takepicture() {
    if (width && height) {
      outputcanvas.width = width;
      outputcanvas.height = height;
      outputctx.drawImage(video, 0, 0, width, height);

      var data = outputcanvas.toDataURL('image/png');
      //outputphoto.setAttribute('src', data);
      outputphoto.src=data;
    } else {
      clearphoto();
    }
}

function targetFace(){
    var x,y;
    targetpositions = ctracker.getCurrentPosition();
    //console.log(targetpositions);
    if (targetpositions) {
      for (var p = 0;p < targetpositions.length;p++) {  
          x = targetpositions[p][0].toFixed(2);
          y = targetpositions[p][1].toFixed(2);
          var track = document.createElement('div');
          $(track).css({"position":"absolute","left":x+'px',"top":y+'px',"background":'red',"z-index":"1" });
           track.style.background='red';
           track.innerHTML='*';
          document.body.appendChild(track);
      }
    }
}

(function() {
  function startup() {
    retouchunit = 1;

      video = document.getElementById('video');
      outputcanvas = document.getElementById('outputcanvas');
      outputctx = outputcanvas.getContext('2d');
      overlaycanvas= document.getElementById('overlay');
      overlayCC=overlaycanvas.getContext('2d');

      //outputphoto = document.getElementById('outputphoto');
      outputphoto = new Image();
      //append to output

      startbutton = document.getElementById('startbutton');
      imgtgtbtn = document.getElementById('imgtgtbtn');
      retouchbtn = document.getElementById('retouchbtn');
      sendbtn = document.getElementById('sendbtn');

      navigator.getMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia || navigator.msGetUserMedia);

      navigator.getMedia(
          { video: true, audio: false},
          function(stream) {
              if (navigator.mozGetUserMedia) {
                video.mozSrcObject = stream;
              } else {
                var vendorURL = window.URL || window.webkitURL;
                video.src = vendorURL.createObjectURL(stream);
              }
              video.play();
          }, // function stream
          function(err) {
            console.log("An error occured! " + err);
          }
      );//navigator.getMedia

      video.addEventListener('canplay', function(ev){
        if (!streaming) {
          height = video.videoHeight / (video.videoWidth/width);      
          if (isNaN(height)) {
            height = width / (4/3);
          }

          video.setAttribute('width', width);
          video.setAttribute('height', height);
          outputcanvas.setAttribute('width', width);
          outputcanvas.setAttribute('height', height);
          overlaycanvas.setAttribute('width', width);
          overlaycanvas.setAttribute('height', height);
          canvasInput.setAttribute('width', width);
          canvasInput.setAttribute('height', height);

          overlayposition = getposition(outputcanvas);
          overlaycanvas.style.top=overlayposition[0]+'px';
          overlaycanvas.style.left=overlayposition[1]+'px';
          streaming = true;
        }
      }, false);

      /*-----------start-------------*/
      startbutton.addEventListener('click', function(ev){
          if(facefound==true){
              takepicture();
              ev.preventDefault();
              $('.buttons').css({"opacity":"1"});

              targetFace();  //target face
          }else{
            alert('face haven\'t found yet, please try to adjust your face');
          }
      }, false);

      clearphoto();
      clmtrackerinit();

      // imgtgtbtn.addEventListener('click',function(ev){   
      //     ev.preventDefault();
      //     ctrackerimage = new clm.tracker();
      //     ctrackerimage.init(pModel);
      //     ctrackerimage.start(outputcanvas);
      //     drawLoopimg();
      // });
      retouchbtn.addEventListener('click',function(ev){
          ev.preventDefault();
          retoucheyes();
          retouchcheek();
      });
      sendbtn.addEventListener('click',function(ev){
          ev.preventDefault();
      });

  }//startup

  window.addEventListener('load', startup, false);
})();


function retoucheyes(){

  var radius = distance(targetpositions[25], targetpositions[23])/2;
  var scaleRatio = 3;
  var aspectRatio = radius*2/(targetpositions[26][1]-targetpositions[24][1]);
  aspectRatio.toFixed(2);

  var leftlimit = targetpositions[23][0];
  var rightlimit = targetpositions[25][0];
  var toplimit = targetpositions[24][1];
  var bottomlimit = targetpositions[26][1];

  var centerPostion = [targetpositions[27][0], targetpositions[27][1]];

  for (var i = toplimit; i < bottomlimit; i+=retouchunit) { //line by line
      for (var j = leftlimit; j <rightlimit; j+=retouchunit) {
           var positionToUse = eyebigger(centerPostion, [j,i], radius, scaleRatio, aspectRatio);
           
           console.log("current:"+[j,i]);
           console.log(positionToUse);

           var replace= outputctx.getImageData(j,i,retouchunit,retouchunit);
           outputctx.putImageData(replace,positionToUse[0],positionToUse[1]);
      }
  }

}//retouch eyes




function distance(p1,p2){
    var dx= p1[0]-p2[0];
    var dy= p1[1]-p2[1];
    return Math.sqrt(dx*dx + dy*dy).toFixed(2);
}

//float scaleRatio;// 缩放系数，0无缩放，大于0则放大
// float radius;// 缩放算法的作用域半径
// aspectRatio; // 所处理图像的宽高比
/*
ScaleFactor = 1 - XY / PowRadius
ScaleFactor = 1 - Strength / 100 * ScaleFactor              '   按照这种关系计算取样点的位置
PosX = OffsetX * ScaleFactor + PointX
PosY = OffSetY * ScaleFactor + PointY
*/

function eyebigger (centerPostion, currentPosition, radius, scaleRatio, aspectRatio) {
    var offsetradius = distance(centerPostion, currentPosition);
    var positionToUse= currentPosition;

    if(offsetradius<radius){   // if in the circle
         var alpha = 1.0 - scaleRatio * Math.pow(offsetradius/radius - 1.0, 2.0);
         positionToUse[0] = centerPostion[0] + alpha*(currentPosition[0] - centerPostion[0]);
         positionToUse[1] = centerPostion[1] + alpha*(currentPosition[1] - centerPostion[1]);
         
         // var ScaleFactor = 1 - offsetradius*offsetradius/radius/radius;
         // ScaleFactor = 1-scaleRatio/100*ScaleFactor;
    }
      
    return positionToUse; 
}








function retouchcheek(){

}//retouch cheek
        
function drawLoopimg() {
  drawRequest = requestAnimFrame(drawLoopimg);
  overlayCC.clearRect(0, 0, width, height);
  if (ctrackerimage.getCurrentPosition()) {
    ctrackerimage.draw(overlay);
  }
}


function drawLoopvideo() {
  requestAnimationFrame(drawLoopvideo);
  cc.clearRect(0, 0, canvasInput.width, canvasInput.height);
  ctracker.draw(canvasInput);
}  


function clmtrackerinit(){
    ctracker = new clm.tracker();
    ctracker.init(pModel);
    ctracker.start(video);

    canvasInput = document.getElementById('clmcanvas');
    cc = canvasInput.getContext('2d');

    canvasInput.height = height;
    canvasInput.width = width;
    drawLoopvideo();
    positionLoop();
    retouchunit=2;
}


function positionLoop() {
    requestAnimationFrame(positionLoop);
    var positions = ctracker.getCurrentPosition();
    // print the positions
    var positionString = "";
    if (positions) {
      for (var p = 0;p < 71;p++) {
          var x = positions[p][0].toFixed(2);
          var y = positions[p][1].toFixed(2);
          positionString += "point "+p+" : ["+x+","+y+"]<br/>";
          var newdiv = document.createElement('div');
          newdiv.innerHTML = "**";
      }
      document.getElementById('positions').innerHTML = positionString;
    }
}//positionLoop()

document.addEventListener("clmtrackrNotFound", function(event) {
  facefound = false;
  if(ctrackerimage)   ctrackerimage.stop();
  var errormsg= "The tracking had problems with finding a face. Face not found.";
  document.getElementById('status').innerHTML = errormsg;
}, false);

document.addEventListener("clmtrackrLost", function(event) {
  facefound=false;
  if(ctrackerimage)   ctrackerimage.stop();
  var errormsg= "The tracking had problems with finding a face. Face lost";
  document.getElementById('status').innerHTML = errormsg;
}, false);

document.addEventListener("clmtrackrConverged", function(event) {
  facefound=true;
  document.getElementById('status').innerHTML="Face Found. You can take a photo now";
}, false);
        












