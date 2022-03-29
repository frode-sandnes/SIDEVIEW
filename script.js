// globals
const video = document.getElementById("video1");
const video2 = document.getElementById("video2");
const textElem = document.querySelector("[data-text]")
const progressMessage = document.getElementById("progress");
const result = document.getElementById("result");
const singleclickinfo = document.getElementById("singleclickinfo");
const doubleclickinfo = document.getElementById("doubleclickinfo");
var canvas;
var worker;

async function processing()
  {
  // deactivate mouse events while processing
  document.removeEventListener("mousedown", processing);
  // show different status
  progressMessage.style.visibility = "visible";     
  result.style.visibility = "hidden";   
  singleclickinfo.style.visibility = "hidden";    
  // Copy image from camera on invisible canvas
  canvas.getContext("2d").drawImage(video, 0, 0, video.width, video.height)

  // analyse the canvas - short form
 /* const {
        data: { text },
        } = await worker.recognize(canvas);
*/
// alternative - long form
var obj = await worker.recognize(canvas);
var text = obj.data.text;
// look at individual bits and include

console.dir(obj);

  progressMessage.style.visibility = "hidden";   
  video.style.visibility = "hidden";       
  result.textContent = text; 
  result.style.visibility = "visible";     
  doubleclickinfo.style.visibility = "visible";  
  // Go to new state  
  document.addEventListener("dblclick", viewing);
  }

async function viewing()
  {
  document.removeEventListener("dblclick", viewing);
  result.style.visibility = "hidden";
  progressMessage.style.visibility = "hidden";       
  video.style.visibility = "visible";              
  singleclickinfo.style.visibility = "visible";    
  doubleclickinfo.style.visibility = "hidden";  
  document.addEventListener("mousedown", processing);
  }

async function setup() 
  {
// console log to document
// Reference to an output container, use 'pre' styling for JSON output
var output = document.createElement('pre');
document.body.appendChild(output);

// Reference to native method(s)
var oldLog = console.log;

console.log = function( ...items ) {

    // Call native method first
    oldLog.apply(this,items);

    // Use JSON to transform objects, all others display normally
    items.forEach( (item,i)=>{
        items[i] = (typeof item === 'object' ? JSON.stringify(item,null,4) : item);
    });
    output.innerHTML += items.join(' ') + '<br />';

};
console.log("Starting");

/*// You could even allow Javascript input...
function consoleInput( data ) {
    // Print it to console as typed
    console.log( data + '<br />' );
    try {
        console.log( eval( data ) );
    } catch (e) {
        console.log( e.stack );
    }
}*/

  const devices = await navigator.mediaDevices.enumerateDevices();
  console.log("devices",devices);

    // To get maximul resulution set up ideal dimensions
    var constraints = 
        { 
        video:  {
                width: { ideal: 4096 },
                height: { ideal: 2160 },
                facingMode: "environment" 
                } 
        };

//  const stream = await navigator.mediaDevices.getUserMedia({ video: true })
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  let stream_settings = stream.getVideoTracks()[0].getSettings();

  // actual width & height of the camera video
  let stream_width = stream_settings.width;
  let stream_height = stream_settings.height;

  console.log('Width: ' + stream_width + 'px');
  console.log('Height: ' + stream_height + 'px');
  // the width of the video - deacted due to processing lag.
//  video.width = stream_width;
//  video.height = stream_height;

  video.srcObject = stream;


// camera 2 - for laptop repeat first camera, even though other is connected - maybe due to permision

var constraints2 = 
{ 
video:  {
        width: { ideal: 4096 },
        height: { ideal: 2160 },
        facingMode: "user" 
        } 
};
const stream2 = await navigator.mediaDevices.getUserMedia(constraints2);
let stream_settings2 = stream2.getVideoTracks()[0].getSettings();

  // actual width & height of the camera video
  let stream_width2 = stream_settings2.width;
  let stream_height2 = stream_settings2.height;

  console.log('Width: ' + stream_width2 + 'px');
  console.log('Height: ' + stream_height2 + 'px');

  video2.srcObject = stream2;


// other stuff

  video.addEventListener("playing", async () => 
    {
    worker = Tesseract.createWorker()
    await worker.load()
    await worker.loadLanguage("eng")
    await worker.initialize("eng")

    canvas = document.createElement("canvas")
    canvas.width = video.width
    canvas.height = video.height

    singleclickinfo.style.visibility = "visible";    
    document.addEventListener("mousedown", processing);
    })
}

//setup();


function loadImage(url) 
    {
    return new Promise(r => 
          { 
          let i = new Image();          
          i.onload = (() => r(i)); i.src = url; 
          });
    }


function onload()
    {
    const selectedFile = document.getElementById('input').files[0];

    }


async function testAnalysis()
  {
    console.warn("Started");
    // Part 1: load the image into a canvas
    let img = await loadImage("./images/textsample1.png");
//    let img = await loadImage("./images/textsample2norsk.png"); // norwegian test
//    let img = await loadImage("./images/textsample9rotate5.png"); // rotation tests
//    let img = await loadImage("./images/textsample3rotate10.png");
//    let img = await loadImage("./images/textsample4rotate30.png");
//    let img = await loadImage("./images/textsample5rotate45.png");
//    let img = await loadImage("./images/textsample6rotate60.png");
//    let img = await loadImage("./images/textsample7rotate90.png");
//    let img = await loadImage("./images/textsample8rotate180.png");
//    let img = await loadImage("./images/textsample10invert.png"); // invert test
//    let img = await loadImage("./images/textsample11lowcontrast.png"); // low contrast test

    // setup canvas
    var canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;   // set the canvas equal to the browser viewport dimensions.
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    // paint image on canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // get pixel data
    // var imageData = ctx.getImageData(0, 0, img.width, img.height).data;
    // console.log("image data:", imageData);


    // use tessaract to get the text
    // set up tesseract worker
    var worker = Tesseract.createWorker(
        {
//        logger: m => console.log(m)
        }
      );
    await worker.load();
    // "nor" for norwegian - "eng+nor" both...?
    await worker.loadLanguage("eng+nor");
    await worker.initialize("eng+nor");

    // analyse the text
/*    var meta = await worker.detect(canvas);
    console.log(meta);
    console.log("rotation",meta.data.orientation_degrees);
    console.log("rotation confidence",meta.data.orientation_confidence);*/

    // recognize the text 
    var obj = await worker.recognize(canvas);
    var text = obj.data.text;
    // look at individual bits 
    console.log(text);
    console.dir(obj);
    
    console.warn("Ended");
  }


// bruk med file select
/*async function handleFileSelect(evt) {
  var files = evt.target.files; // FileList object
  var name= files[0].name;

  console.log(name);

  let img = await loadImage(name);

  // setup canvas
  var canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;   // set the canvas equal to the browser viewport dimensions.
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  // paint image on canvas
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  // test getting data
  var imageData = ctx.getImageData(0, 0, img.width, img.height).data;
  console.log("image data:", imageData);

      // use tessaract to get the text
    // set up tesseract worker
    var worker = Tesseract.createWorker();
    await worker.load();
    // "nor" for norwegian - "eng+nor" both...?
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    // recognize the text 
    var obj = await worker.recognize(canvas);
    var text = obj.data.text;
    // look at individual bits 
    console.log(text);
    console.dir(obj);  
}*/

//document.getElementById('files').addEventListener('change', handleFileSelect, false);
//testAnalysis();

setup();