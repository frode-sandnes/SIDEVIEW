// globals
const video = document.querySelector("video")
const textElem = document.querySelector("[data-text]")
const progressMessage = document.getElementById("progress");
const singleclickinfo = document.getElementById("singleclickinfo");
const doubleclickinfo = document.getElementById("doubleclickinfo");
var canvas;
var worker;

let processing = async () =>
  {
  // deactivate mouse events while processing
  document.removeEventListener("mousedown", processing);
  // show different status
  progressMessage.style.visibility = "visible";     
  singleclickinfo.style.visibility = "hidden";    
  // Copy image from camera on invisible canvas
  canvas.getContext("2d").drawImage(video, 0, 0, video.width, video.height)
  document.body.appendChild(canvas);
  
  console.log("about to process");
  findPerspectivePoints(canvas);
  
  progressMessage.style.visibility = "hidden";   
  video.style.visibility = "hidden";       
  doubleclickinfo.style.visibility = "visible";  
  // Go to new state  
  document.addEventListener("dblclick", viewing);
  }

let viewing = async () =>
  {
  document.removeEventListener("dblclick", viewing);
  progressMessage.style.visibility = "hidden";       
  video.style.visibility = "visible";              
  singleclickinfo.style.visibility = "visible";    
  doubleclickinfo.style.visibility = "hidden";  
  document.addEventListener("mousedown", processing);
  }

let setup = async () => 
  {
    // To get maximul resulution set up ideal dimensions
    var constraints = 
        { 
        video:  {
                width: { ideal: 4096 },
                height: { ideal: 2160 } 
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

  video.addEventListener("playing", async () => 
    {
console.log("in analyser");      
    canvas = document.createElement("canvas")
    canvas.width = video.width
    canvas.height = video.height

    singleclickinfo.style.visibility = "visible";    
    document.addEventListener("mousedown", processing);
    })
}


let loadImage = (url) => 
    {
    return new Promise(r => 
          { 
          let i = new Image();          
          i.onload = (() => r(i)); i.src = url; 
          });
    }


let onload = () =>
    {
    const selectedFile = document.getElementById('input').files[0];
    }

let offlineTesting = async () =>
  {
  console.log("starting");
  
  let img = await loadImage("IMG_0930.jpg");  
  // setup canvas
  var canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;   // set the canvas equal to the browser viewport dimensions.
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  // paint image on canvas
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  findPerspectivePoints(canvas);
  }

let getPixel = (imageData,x,y,w) =>
  {
  const bytesPerPixel = 4;
  const index = x*bytesPerPixel + y*w*bytesPerPixel;
  const d = imageData.data;
  return {r: d[index], g: d[index+1], b: d[index+2]};  
  }
let setPixel = (imageData,x,y,w,r,g,b) =>
  {
  const bytesPerPixel = 4;
  const index = x*bytesPerPixel + y*w*bytesPerPixel;
  const d = imageData.data;
  d[index] = r;
  d[index+1] = g;
  d[index+2] = b;  
  }  

const upperThreshold = 170;
const lowerThreshold = 120;

let filterNonScreen = (imageData,w,h) =>
  {
  for (var y = 0; y < h; y++)
    {
    // find extreme white points -> screen area
    var min = 1000;
    var max = 0;
    for (var x = 0; x < w; x++)
        {
        const p = getPixel(imageData,x,y,w);
        if (p.r > upperThreshold && p.g  > upperThreshold && p.b > upperThreshold)
            {
            if (x < min)
                {
                min = x;                
                }
            if (x > max)
                {
                max = x;                
                }                
            }       
        }
    // fill beginning and end with black

    if (min < max)
        {
        for (var x = 0; x < min; x++)
            {
            setPixel(imageData,x,y,w,0,0,0);     
            }
        for (var x = max; x < w; x++)
            {
            setPixel(imageData,x,y,w,0,0,0);     
            }
        }
    else  
      {
      for (var x = 0; x < w; x++)
          {
            setPixel(imageData,x,y,w,0,0,0);     
          }        
      }
    }    
  }

// filter small artefacts - assume a quantized image into basic colours
let noiseGate = (imageData,w,h) =>
  {
  const minGap = 10; // minimum gap allowed
  for (var y = 0; y < h; y++)
    {
    // find extreme white points -> screen area
    var start = 0;
    var end = 0;
    var active = false;
    for (var x = 0; x < w; x++)
        {
        const p = getPixel(imageData,x,y,w);
        if (p.r > upperThreshold || p.g  > upperThreshold || p.b > upperThreshold)
              {
              if (!active)
                  {
                  start = x;
                  active = true;  
                  }
              }     
          else
              {
              if (active)
                  {
                  end = x;
                  active = false;                    
                  if (end - start < minGap)
                      {        
                      // clear the line
                      for (var x = start; x < end; x++)
                          {
                          setPixel(imageData,x,y,w,0,0,0);     
                          }       
                      }  
                  }
              }  
        }
    }        
  }

// check the white region of the screen
let findPerspectivePoints = async (c) =>
  {
  const ctx = c.getContext("2d");
  const imageData = ctx.getImageData(0,0,c.width,c.height);
  const w = c.width;
  const h = c.height;

  filterNonScreen(imageData,w,h);

  for (var x = 0; x < w; x++)
    {
    for (var y = 0; y < h; y++)
        {
        const p = getPixel(imageData,x,y,w);       
        if (!checkPoint(p))
          {
          setPixel(imageData,x,y,w,0,0,0);          
          }
        }
    }
  noiseGate(imageData,w,h);  
  const boxes = getBoundingPoints(imageData,w,h);
  ctx.putImageData(imageData, 0, 0);
  
  // view result
  ctx.beginPath();
  ctx.strokeStyle = "#FF0000";
  var points = [];
  for (var box of boxes)
    {
    ctx.rect(box.minX, box.minY, box.maxX-box.minX, box.maxY-box.minY);
    points.push(midPoint(box));
    }
  ctx.stroke();
  ctx.closePath();

  // the first stuff we made
  ctx.beginPath();
  ctx.strokeStyle = "#FFFFFF";    
  ctx.moveTo(points[3].x,points[3].y);
  for (var pts of points)
    {
    ctx.lineTo(pts.x,pts.y);
    }
  ctx.stroke();

  // inverse backwards projection - new stuff.
  const param = await findInverseProjection(points);    
  // console.log({param}); 
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries()); 

  var embed = params.embed;
//  var embed = "<iframe width=\"640\" height=\"360\" src=\"https://www.youtube.com/embed/WNI4j2bboCc\" title=\"YouTube video player\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen></iframe>";
  addResultingURL(param,embed);  
  }

// Maps the 3D-point into the display - assumes the shape is square for simplicity, 
// and needs the midpoint in one of the dimensions, as well as the width of the square.
// This routine is created to simulate the perspective projection in the browser as I was unable to 
// tap into the mechanism in a simple manner.
let toDisplay = (point3D,distance,width,midPoint) =>
    {
    // unmarshall values
    const x = point3D.x;
    const y = point3D.y;
    const z = point3D.z-distance;  // må legge på distance her
    // fixed in this example 
    const halfWidth = width/2;
    // scaling factor to ensure shapes far away gets back to the same size. Distance here should only affect perspective projection not size.
    const widthFactor = halfWidth*distance/halfWidth;
    // move apex 
    const x1 = x - midPoint;  // can expand to separate x and y midpoint later if needed
    const y1 = y - midPoint;
    const x2 = -x1/z;
    const y2 = -y1/z;
    // scale back up and translate back
    const px = x2*widthFactor + midPoint;
    const py = y2*widthFactor + midPoint;
    return {x:px, y:py};
    }  
  
let drawBox = (points,color = "#FFFFFF") =>
    {
    console.assert(typeof points !== "undefined")           
    var canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");      
    ctx.beginPath();
    ctx.strokeStyle = color;    
    ctx.moveTo(points[3].x,points[3].y);
    for (var pts of points)
      {
      ctx.lineTo(pts.x,pts.y);
      }
    ctx.stroke();
    ctx.closePath();    
    }

  let drawCross = (points,centroid, color = "#FFFFFF") =>
    {
    var canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");      
    ctx.beginPath();
    ctx.strokeStyle = color;    
    
    for (var pts of points)
      {
      ctx.moveTo(pts.x,pts.y);
      ctx.lineTo(centroid.x,centroid.y);
      }
    ctx.stroke();
    ctx.closePath();    
    }

let checkPoint = (p) =>
  {
  var found = false;

  if (p.r > upperThreshold && p.g < lowerThreshold && p.b < lowerThreshold)
    {
    found = true;
    p = {r:255, g:0, b:0};
    }  
  else if (p.r < lowerThreshold && p.g > upperThreshold && p.b < lowerThreshold)
    {
      found = true;
      p = {r:0, g:255, b:0};
    }     
  else if (p.r < lowerThreshold && p.g < lowerThreshold && p.b > upperThreshold)
    {
      found = true;
      p = {r:0, g:0, b:255};
    }   
  else if (p.r > upperThreshold && p.g < lowerThreshold && p.b > lowerThreshold)
    {
      found = true;
      p = {r:255, g:0, b:255};
    }   
  return found;     
  }

// assuming a filtered image as input - find the exterme values
let getBoundingPoints = (imageData,w,h) =>
  {
  var NE = {maxX:0, maxY:0, minX:10000,minY:1000};
  var NW = {maxX:0, maxY:0, minX:10000,minY:1000};
  var SW = {maxX:0, maxY:0, minX:10000,minY:1000};
  var SE = {maxX:0, maxY:0, minX:10000,minY:1000};
  for (var x = 0; x < w; x++)
    {
    for (var y = 0; y < h; y++)
        {
        const p = getPixel(imageData,x,y,w);       
        if (p.g > upperThreshold) // green
          {
          checkBounds(x,y,NE);
          }
        if (p.r > upperThreshold && p.b < lowerThreshold) // red
          {
          checkBounds(x,y,NW);
          }
        if (p.r < lowerThreshold && p.b > upperThreshold) // blue
          {
          checkBounds(x,y,SW);
          }  
        if (p.r > upperThreshold && p.b > upperThreshold) // blue
          {
          checkBounds(x,y,SE);
          }                                    
        }
    }  
 // clockwise from NW (origin)    
  return [NW, NE, SE, SW];
//  return [NE, NW, SW, SE];
  }

let checkBounds = (x,y,box) =>
  {
  if (x < box.minX)
      {
      box.minX = x;  
      }
  if (x > box.maxX)
      {
      box.maxX = x;  
      }  
  if (y < box.minY)
      {
      box.minY = y;  
      }
  if (y > box.maxY)
      {
      box.maxY = y;  
      }     
  }

let midPoint = (box) =>
  {
  return {x: (box.minX+box.maxX)/2, y: (box.minY+box.maxY)/2}; 
  }


// Using the https://github.com/Infl1ght/projection-3d-2d library for mappng between screen and real world
let findInverseProjection = async(pts) =>
  {
  // setting up points displayed on screen (point3D) and the corresponding 4 points detected in camera (point2D)
  const points3d = [    // going clockwise from NW (origin) - convension herein
      [10, 10],
      [100, 10],
      [100, 100],
      [10, 100],
    ];
  const points2d = [
      [pts[0].x, pts[0].y],
      [pts[1].x, pts[1].y],
      [pts[2].x, pts[2].y],
      [pts[3].x, pts[3].y],
    ]; 
  const projectionCalculator = new Projection3d2d.ProjectionCalculator2d(points3d, points2d);

  // find the camera screen in the real world.
  const invertedSquarePts = [];
  var p =  projectionCalculator.getUnprojectedPoint([200,200]); // NW - then clockwise
  invertedSquarePts.push({x:p[0],y:p[1]});

  p =  projectionCalculator.getUnprojectedPoint([400,200]); // NE
  invertedSquarePts.push({x:p[0],y:p[1]});

  p =  projectionCalculator.getUnprojectedPoint([400,400]); // SE
  invertedSquarePts.push({x:p[0],y:p[1]});

  p =  projectionCalculator.getUnprojectedPoint([200,400]); // SW 
  invertedSquarePts.push({x:p[0],y:p[1]});


  drawBox(invertedSquarePts, "#00FF00");
  drawBox([ {x: 10, y:10},{x: 100, y:10},{x: 100, y:100},{x: 10, y:100}], "#00FFFF");
  
    // 2D tranform params
  const params = analyzeInverseProjection(invertedSquarePts);
  console.table({params});
  return params;
  }



// take inverse projection and extract XY-scaling and X-Y shear parameters for 2D transform.
let analyzeInverseProjection = (points) =>
  {
  // find the lengths and angles of the sides
  const dists = [];
  const angles = [];
  // can I convert this to functional style? experiment
  for (var i = 0; i<points.length;i++)
    {
    var i2 = (i+1)%points.length;
    var p1 = points[i];
    var p2 = points[i2];
    var dx = p1.x-p2.x;
    var dy = p1.y-p2.y;
    dists.push((dx**2 + dy**2)**(1/2));
    if (i%2 != 0)
      {
      [dx, dy] = [dy, dx];  // swap  
      }  
    angles.push(Math.atan(dy/dx));
    }
  // find the longest x and y lengths respectively as representative of the 2D shape.
  var xIdx = 0; // defaults index to the arrays
  var yIdx = 1;
  if (dists[2] > dists[0])
      {
      xIdx = 2;
      }
  if (dists[3] > dists[1])
      {
      yIdx = 3;
      }     
  // find scaling factor assume x should be scaled up to compensate for perspective view
  var scalingX = dists[yIdx]/dists[xIdx];
  var skewX = angles[xIdx];
  var skewY = angles[yIdx];
  console.log("2d-transorm params",scalingX,skewX,skewY);
  document.getElementById("transform").style.transform = CSS2DTransform(scalingX,skewX,skewY);
  console.log(document.getElementById("transform").style.transform);
  return {scalingX:scalingX,skewX:skewX,skewY:skewY};
  }

let  CSS2DTransform = (scalingX,skewX,skewY) =>
  {
  return "matrix("+scalingX+","+skewX+","+skewY+",1,0,0)";    
  }

let addResultingURL = (param,embed) =>
  {
//  const transform = encodeURIComponent(CSStransformStr(param.dist,param.Yrot,param.Xrot,param.Zrot));
  const transform = encodeURIComponent(CSS2DTransform(param.scalingX,param.skewX,param.skewY));
  const link = "viewer.html" + "?transform=" + transform + "&embed=" + encodeURIComponent(embed);
  const e = document.getElementById("finalMessage");
  e.innerHTML += "<p>Set up the display with the following link.</p>";
  e.innerHTML += "<a href="+link+">"+link+"</a>";
  e.innerHTML += "<p></p>";

  // just for debut - sets the result
  document.getElementById("transform").style.transform = transform;
  }


  
// for operation
 setup();

// for offline Testing
//offlineTesting();
