let config = {
  // Should be higher than real FPS to not skip real frames
  // Hardcoded due to JS limitations
  fps: 30,

  // How many leading zeros
  padValue: 0,

  // Format of the extracted frames
  imageMimeType: 'image/jpeg',
  imageExtension: '.jpg',

  // Name of the extracted frames zip archive
  framesZipFilename: 'extracted-frames.zip',

  // File name of the timestamp map that is optionally present in the zip archive
  timestampFile: 'timestamp.xml'
};

let jumboWelcomeElement = $('#jumbo-welcome');
let jumboAnnotateElement = $('#jumbo-annotate');
let doodle = document.querySelector('#doodle');
let canvas = document.querySelector('#canvas');
let ctx = canvas.getContext('2d');
let zipFile = document.querySelector('#zipFile');
let xmlFile = document.querySelector('#xmlFile');
let msgElement = $('#msg');
let videoDimensionsElement = document.querySelector('#videoDimensions');
let extractionProgressElement = document.querySelector('#extractionProgress');
let timestampElement = document.querySelector('#timestampLoaded');
let playBtn = $('#play');
let frameCount = $('#frameCount');
let speedInput = document.querySelector('#speed');
let sliderElement = document.querySelector('#slider');
let generateXmlButton = document.querySelector('#generateXml');

let framesManager = new FramesManager();
let annotatedObjectsTracker = new AnnotatedObjectsTracker(framesManager);

getNextKey = function ({ lastKey, classname }) {
  if (!lastKey) {
    return `A_${classname}`
  }
  let nextKey;

  if (lastKey === 'Z') {

    nextKey = String.fromCharCode(lastKey.charCodeAt() - 25) + String.fromCharCode(lastKey.charCodeAt() - 25); // AA or aa

  } else {
    var lastChar = lastKey.slice(-1);
    var sub = lastKey.slice(0, -1);
    if (lastChar === 'Z') {
      nextKey = getNextKey(sub) + String.fromCharCode(lastChar.charCodeAt() - 25);
    } else {
      nextKey = sub + String.fromCharCode(lastChar.charCodeAt() + 1);
    }
  }
  return `${nextKey}_${classname}`
};







let slider = {
  init: function (min, max, onChange) {
    $(sliderElement).slider('option', 'min', min);
    $(sliderElement).slider('option', 'max', max);
    $(sliderElement).on('slidestop', (e, ui) => {
      onChange(ui.value);
    });
    $(sliderElement).slider('enable');

    frameCount.text('0 / ' + max);
  },
  setPosition: function (frameNumber) {
    $(sliderElement).slider('option', 'value', frameNumber);
  },
  reset: function () {
    $(sliderElement).slider({ disabled: true });
  }
};
slider.reset();

let player = {
  currentFrame: 0,
  isPlaying: false,
  isReady: false,
  isSeeking: false,
  timeout: null,

  initialize: function () {
    this.currentFrame = 0;
    this.isPlaying = false;
    this.isReady = false;
    this.isSeeking = false;

    playBtn.text('Play');
  },

  ready: function () {
    this.isReady = true;
  },

  seek: function (frameNumber) {
    if (!this.isReady) return;

    // Don't allow the user to seek before the last seek is completed
    if (this.isSeeking) return;

    this.pause();

    // If the user help the control key whilst seeking (or clicking the seek bar)
    // then they don't want to try and track across large jumps
    let trackLargeSeek = !window.event.ctrlKey;

    if (frameNumber >= 0 && frameNumber < framesManager.frames.totalFrames()) {
      // This will lock the controls so that the user doesn't jump
      // around frames as promises are resolved.
      this.isSeeking = true;

      this.drawFrame(frameNumber, trackLargeSeek).then(() => { this.isSeeking = false; });
      this.currentFrame = frameNumber;
    }
  },

  play: function () {
    if (!this.isReady || this.isSeeking) return;

    this.isPlaying = true;

    playBtn.text('Pause');

    this.nextFrame();
  },

  pause: function () {
    if (!this.isReady) return;

    this.isPlaying = false;
    if (this.timeout != null) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    playBtn.text('Play');
  },

  toogle: function () {
    if (!this.isPlaying) {
      this.play();
    } else {
      this.pause();
    }
  },

  nextFrame: function () {
    if (!this.isPlaying) {
      return;
    }

    if (this.currentFrame >= framesManager.frames.totalFrames()) {
      this.done();
      return;
    }

    this.drawFrame(this.currentFrame).then(() => {
      this.currentFrame++;
      this.timeout = setTimeout(() => this.nextFrame(), 1000 / (config.fps * parseFloat(speedInput.value)));
    });
  },

  drawFrame: function (frameNumber, trackLargeSeek = true) {
    return new Promise((resolve, _) => {
      annotatedObjectsTracker.getFrameWithObjects(frameNumber, trackLargeSeek).then((frameWithObjects) => {
        ctx.drawImage(frameWithObjects.img, 0, 0);

        // Update frame number
        frameCount.text(frameNumber + ' / ' + $(sliderElement).slider('option', 'max'))


        for (let i = 0; i < frameWithObjects.objects.length; i++) {
          let object = frameWithObjects.objects[i];
          let annotatedObject = object.annotatedObject;
          let annotatedFrame = object.annotatedFrame;
          if (annotatedFrame.isVisible()) {
            // we assume the border is given in pixels
            let border = parseInt($(annotatedObject.dom).css('border-width'));

            annotatedObject.dom.style.display = 'block';
            annotatedObject.dom.style.width = annotatedFrame.bbox.width + 'px';
            annotatedObject.dom.style.height = annotatedFrame.bbox.height + 'px';
            annotatedObject.dom.style.left = annotatedFrame.bbox.x + 'px';
            annotatedObject.dom.style.top = annotatedFrame.bbox.y + 'px';
            annotatedObject.visible.prop('checked', true);

          } else {
            annotatedObject.dom.style.display = 'none';
            annotatedObject.visible.prop('checked', false);
          }
        }

        let shouldHideOthers = frameWithObjects.objects.some(o => o.annotatedObject.hideOthers);
        if (shouldHideOthers) {
          for (let i = 0; i < frameWithObjects.objects.length; i++) {
            let object = frameWithObjects.objects[i];
            let annotatedObject = object.annotatedObject;
            if (!annotatedObject.hideOthers) {
              annotatedObject.dom.style.display = 'none';
            }
          }
        }

        slider.setPosition(this.currentFrame);

        resolve();
      });
    });
  },

  done: function () {
    this.currentFrame = 0;
    this.isPlaying = false;

    playBtn.text('Play');
  }
};

function clearAllAnnotatedObjects() {
  for (let i = 0; i < annotatedObjectsTracker.annotatedObjects.length; i++) {
    clearAnnotatedObject(i);
  }
}

function clearAnnotatedObject(i) {
  let annotatedObject = annotatedObjectsTracker.annotatedObjects[i];
  annotatedObject.controls.remove();
  $(annotatedObject.dom).remove();
  annotatedObjectsTracker.annotatedObjects.splice(i, 1);
}

zipFile.addEventListener('change', extractionFileUploaded, false);
xmlFile.addEventListener('change', importXml, false);
playBtn.bind('click', playClicked);
generateXmlButton.addEventListener('click', generateXml, false);

function playClicked() {
  if (player.isPlaying) {
    player.pause();
  } else {
    player.play();
  }
}

function initializeCanvasDimensions(img) {
  // for some reason, without this line
  // optical flow tracking doesn't really work...
  doodle.style.width = img.width + 'px';

  doodle.style.height = img.height + 'px';
  canvas.width = img.width;
  canvas.height = img.height;
}

function extractionFileUploaded() {
  if (this.files.length != 1) {
    return;
  }

  zipFile.disabled = true;
  xmlFile.disabled = true;
  generateXmlButton.disabled = true;
  clearAllAnnotatedObjects();
  slider.reset();
  player.initialize();

  // Save name of zipped folder for XML annotation generation
  config['framesZipFilename'] = this.files[0].name.substr(0, this.files[0].name.length - 4);

  // Extract the specified zipped archive using zip.js
  let promise = extractFramesFromZip(config, this.files[0]);

  promise.then((frames) => {
    msgElement.prop('hidden', false);
    jumboAnnotateElement.prop('hidden', false);
    jumboWelcomeElement.prop('hidden', true);
    extractionProgressElement.innerHTML = 'Extraction completed. ' + frames.totalFrames() + ' frames captured.';
    if (frames.totalFrames() > 0) {
      frames.getFrame(0).then((blob) => {
        blobToImage(blob).then((img) => {
          initializeCanvasDimensions(img);
          ctx.drawImage(img, 0, 0);
          videoDimensionsElement.innerHTML = 'Video dimensions determined: ' + img.width + 'x' + img.height;

          if (frames.hasTimestamp()) timestampElement.innerHTML = 'Loaded timestamps from ' + config.timestampFile;

          framesManager.set(frames);
          slider.init(
            0,
            framesManager.frames.totalFrames() - 1,
            (frameNumber) => player.seek(frameNumber)
          );
          player.ready();

          xmlFile.disabled = false;
          generateXmlButton.disabled = false;
        });
      });
    }

    zipFile.disabled = false;
  });
}

function interactify(dom, onChange) {
  let bbox = $(dom);
  bbox.addClass('bbox');

  let createHandleDiv = (className) => {
    let handle = document.createElement('div');
    handle.className = className;
    bbox.append(handle);
    return handle;
  };

  bbox.resizable({
    containment: 'parent',
    handles: {
      n: createHandleDiv('ui-resizable-handle ui-resizable-n'),
      s: createHandleDiv('ui-resizable-handle ui-resizable-s'),
      e: createHandleDiv('ui-resizable-handle ui-resizable-e'),
      w: createHandleDiv('ui-resizable-handle ui-resizable-w')
    },
    stop: (e, ui) => {
      let position = bbox.position();
      onChange(Math.round(position.left), Math.round(position.top), Math.round(bbox.width()), Math.round(bbox.height()));
    },
  });

  bbox.draggable({
    containment: 'parent',
    handle: createHandleDiv('handle center-drag'),
    stop: (e, ui) => {
      let position = bbox.position();
      onChange(Math.round(position.left), Math.round(position.top), Math.round(bbox.width()), Math.round(bbox.height()));
    }
  });
}

let mouse = {
  x: 0,
  y: 0,
  startX: 0,
  startY: 0
};

let tmpAnnotatedObject = null;

doodle.onmousemove = function (e) {
  let ev = e || window.event;
  if (ev.pageX) {
    mouse.x = ev.pageX;
    mouse.y = ev.pageY;
  } else if (ev.clientX) {
    mouse.x = ev.clientX;
    mouse.y = ev.clientY;
  }
  mouse.x -= doodle.offsetLeft;
  mouse.y -= doodle.offsetTop;

  if (tmpAnnotatedObject !== null) {
    tmpAnnotatedObject.width = Math.abs(mouse.x - mouse.startX);
    tmpAnnotatedObject.height = Math.abs(mouse.y - mouse.startY);
    tmpAnnotatedObject.x = (mouse.x - mouse.startX < 0) ? mouse.x : mouse.startX;
    tmpAnnotatedObject.y = (mouse.y - mouse.startY < 0) ? mouse.y : mouse.startY;

    tmpAnnotatedObject.dom.style.width = tmpAnnotatedObject.width + 'px';
    tmpAnnotatedObject.dom.style.height = tmpAnnotatedObject.height + 'px';
    tmpAnnotatedObject.dom.style.left = tmpAnnotatedObject.x + 'px';
    tmpAnnotatedObject.dom.style.top = tmpAnnotatedObject.y + 'px';
  }
}

/**
 * Creation of a new bounding box
 */
doodle.onclick = function () {
  if (doodle.style.cursor != 'crosshair') {
    return;
  }

  if (tmpAnnotatedObject != null) {
    // second click
    let annotatedObject = new AnnotatedObject();
    annotatedObject.dom = tmpAnnotatedObject.dom;
    let bbox = new BoundingBox(tmpAnnotatedObject.x, tmpAnnotatedObject.y, tmpAnnotatedObject.width, tmpAnnotatedObject.height);
    annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
    annotatedObjectsTracker.annotatedObjects.push(annotatedObject);
    tmpAnnotatedObject = null;
    interactify(
      annotatedObject.dom,
      (x, y, width, height) => {
        let bbox = new BoundingBox(x, y, width, height);
        annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
      }
    );

    addAnnotatedObjectControls(annotatedObject);

    doodle.style.cursor = 'default';
  } else {
    // First click
    mouse.startX = mouse.x;
    mouse.startY = mouse.y;

    let dom = newBboxElement();
    dom.style.left = mouse.x + 'px';
    dom.style.top = mouse.y + 'px';
    tmpAnnotatedObject = { dom: dom };
  }
}

function newBboxElement() {
  let dom = document.createElement('div');
  dom.className = 'bbox';
  doodle.appendChild(dom);
  return dom;
}

function addAnnotatedObjectControls(annotatedObject) {
  let name = $('<input type="text" value="Name?" />');

  let lastKey;
  if (annotatedObjectsTracker.annotatedObjects[0].name) {
    const keys = annotatedObjectsTracker.annotatedObjects.map(obj => obj.name).filter(el => el).sort(function (a, b) {
      return a.length - b.length || // sort by length, if equal then
        a.localeCompare(b);    // sort by dictionary order
    });
    lastKey = keys.pop().match(/(\w*)_\w*/)[1]
  }
  name.prop('value', getNextKey({ lastKey, classname: 'ball' }))
  annotatedObject.name = name.prop('value');
  if (annotatedObject.name) {
    name.val(annotatedObject.name);
  }
  name.on('change keyup paste mouseup', function () {
    annotatedObject.name = this.value;
  });

  let id = $('<input type="text" value="ID?" />');
  id.prop('value', name.prop('value'))
  if (annotatedObject.id) {
    id.val(annotatedObject.id);
  }
  id.on('change keyup paste mouseup', function () {
    annotatedObject.id = this.value;
  });

  let visibleLabel = $('<label>');
  let visible = $('<input type="checkbox" id="visible" checked="checked" />');
  annotatedObject.visible = visible;
  visible.change(function () {
    let bbox;
    if (this.checked) {
      annotatedObject.dom.style.display = 'block';
      let jquery = $(annotatedObject.dom);
      let position = jquery.position();
      bbox = new BoundingBox(Math.round(position.left), Math.round(position.top), Math.round(jquery.width()), Math.round(jquery.height()));
    } else {
      annotatedObject.dom.style.display = 'none';
      bbox = null;
    }
    annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
  });
  visibleLabel.append(visible);
  visibleLabel.append('&nbsp;&nbsp;Is visible?');

  let hideLabel = $('<label>');
  let hide = $('<input type="checkbox" />');
  hide.change(function () {
    annotatedObject.hideOthers = this.checked;
  });
  hideLabel.append(hide);
  hideLabel.append('&nbsp;&nbsp;Hide others?');

  let del = $('<input type="button" value="Delete" />');
  del.click(function () {
    for (let i = 0; annotatedObjectsTracker.annotatedObjects.length; i++) {
      if (annotatedObject === annotatedObjectsTracker.annotatedObjects[i]) {
        clearAnnotatedObject(i);
        break;
      }
    }
  });

  let div = $('<div></div>');
  div.css({
    'border': '1px solid black',
    'display': 'inline-block',
    'margin': '5px',
    'padding': '10px'
  });
  div.append(name);
  div.append($('<br />'));
  div.append(id);
  div.append($('<br />'));
  div.append(visibleLabel);
  div.append($('<br />'));
  div.append(hideLabel);
  div.append($('<br />'));
  div.append(del);

  annotatedObject.controls = div;

  $('#objects').append(div);
}

function downloadFile(filename, text) {
  let bb = new Blob([text], { type: 'text/xml' });

  var a = document.querySelector('#downloadXML');
  a.download = filename;
  a.href = window.URL.createObjectURL(bb);
  a.click();
}

function generateXml() {
  let totalFrames = framesManager.frames.totalFrames();
  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  xml += '<annotation>\n';
  xml += '  <folder>not available</folder>\n';
  xml += '  <filename>' + config.framesZipFilename + '</filename>\n';
  xml += '  <source>\n';
  xml += '    <type>' + framesManager.frames.getSourceType() + '</type>\n';
  xml += '    <sourceImage>' + framesManager.frames.getSourceImage() + '</sourceImage>\n';
  xml += '    <sourceAnnotation>vatic.js</sourceAnnotation>\n';
  xml += '    <totalFrames>' + totalFrames + '</totalFrames>\n';
  xml += '  </source>\n';

  for (let i = 0; i < annotatedObjectsTracker.annotatedObjects.length; i++) {
    let annotatedObject = annotatedObjectsTracker.annotatedObjects[i];

    xml += '  <object>\n';
    xml += '    <name>' + annotatedObject.name + '</name>\n';
    xml += '    <moving>true</moving>\n';
    xml += '    <action/>\n';
    xml += '    <verified>0</verified>\n';
    xml += '    <id>' + annotatedObject.id + '</id>\n';
    xml += '    <createdFrame>0</createdFrame>\n';
    xml += '    <startFrame>0</startFrame>\n';
    xml += '    <endFrame>' + (totalFrames - 1) + '</endFrame>\n';

    for (let frameNumber = 0; frameNumber < totalFrames; frameNumber++) {
      let annotatedFrame = annotatedObject.get(frameNumber);
      if (annotatedFrame == null) continue;

      let bbox = annotatedFrame.bbox;
      if (bbox != null) {
        let isGroundTruth = annotatedFrame.isGroundTruth ? 1 : 0;

        xml += '    ';
        xml += '<polygon>';
        xml += '<frame>' + frameNumber + '</frame>';
        xml += '<t>' + frameNumber + '</t>';
        xml += '<pt><x>' + bbox.x + '</x><y>' + bbox.y + '</y><l>' + isGroundTruth + '</l></pt>';
        xml += '<pt><x>' + bbox.x + '</x><y>' + (bbox.y + bbox.height) + '</y><l>' + isGroundTruth + '</l></pt>';
        xml += '<pt><x>' + (bbox.x + bbox.width) + '</x><y>' + (bbox.y + bbox.height) + '</y><l>' + isGroundTruth + '</l></pt>';
        xml += '<pt><x>' + (bbox.x + bbox.width) + '</x><y>' + bbox.y + '</y><l>' + isGroundTruth + '</l></pt>';
        xml += '</polygon>\n';
      }
    }

    xml += '  </object>\n';
  }

  xml += '</annotation>\n';

  downloadFile(config.framesZipFilename + '.xml', xml);
}

function importXml() {
  if (this.files.length != 1) {
    return;
  }

  var reader = new FileReader();
  reader.onload = (e) => {
    if (e.target.readyState != 2) {
      return;
    }

    if (e.target.error) {
      throw 'file reader error';
    }

    let xml = $($.parseXML(e.target.result));
    let objects = xml.find('object');
    for (let i = 0; i < objects.length; i++) {
      let object = $(objects[i]);
      let name = object.find('name').text();
      let id = object.find('id').text();

      let annotatedObject = new AnnotatedObject();
      annotatedObject.name = name;
      annotatedObject.id = id;
      annotatedObject.dom = newBboxElement();
      annotatedObjectsTracker.annotatedObjects.push(annotatedObject);

      interactify(
        annotatedObject.dom,
        (x, y, width, height) => {
          let bbox = new BoundingBox(x, y, width, height);
          annotatedObject.add(new AnnotatedFrame(player.currentFrame, bbox, true));
        }
      );

      addAnnotatedObjectControls(annotatedObject);

      let lastFrame = -1;
      let polygons = object.find('polygon');
      for (let j = 0; j < polygons.length; j++) {
        let polygon = $(polygons[j]);
        let frameNumberFrame = parseInt(polygon.find('frame').text());
        let frameNumberT = parseInt(polygon.find('t').text());
        let pts = polygon.find('pt');
        let topLeft = $(pts[0]);
        let bottomRight = $(pts[2]);
        let isGroundTruth = parseInt(topLeft.find('l').text()) == 1;
        let x = parseInt(topLeft.find('x').text());
        let y = parseInt(topLeft.find('y').text());
        let w = parseInt(bottomRight.find('x').text()) - x;
        let h = parseInt(bottomRight.find('y').text()) - y;
        let frameNumber = ((!isNaN(frameNumberFrame)) ? frameNumberFrame : frameNumberT);
        if (lastFrame + 1 != frameNumber) {
          let annotatedFrame = new AnnotatedFrame(lastFrame + 1, null, true);
          annotatedObject.add(annotatedFrame);
        }

        let bbox = new BoundingBox(x, y, w, h);
        let annotatedFrame = new AnnotatedFrame(frameNumber, bbox, isGroundTruth);
        annotatedObject.add(annotatedFrame);

        lastFrame = frameNumber;
      }

      if (lastFrame + 1 < framesManager.frames.totalFrames()) {
        let annotatedFrame = new AnnotatedFrame(lastFrame + 1, null, true);
        annotatedObject.add(annotatedFrame);
      }
    }

    player.drawFrame(player.currentFrame);
  };
  reader.readAsText(this.files[0]);
}




// Keyboard shortcuts
window.onkeydown = function (e) {
  let preventDefault = true;

  if (e.keyCode === 32) { // space
    player.toogle();
  } else if (e.keyCode === 27) { // escape
    if (tmpAnnotatedObject != null) {
      doodle.removeChild(tmpAnnotatedObject.dom);
      tmpAnnotatedObject = null;
    }

    doodle.style.cursor = 'default';
  } else if (e.keyCode == 37) { // left
    player.seek(player.currentFrame - 1);
  } else if (e.keyCode == 39) { // right
    player.seek(player.currentFrame + 1);
  } else {
    preventDefault = false;
  }

  if (preventDefault) {
    e.preventDefault();
  }
};

// Bind to Alt+n
shortcut('optn n', document.body).bindsTo(function (e) {
  doodle.style.cursor = 'crosshair';
});

// toggle is visible? checkbox
shortcut('shift q', document.body).bindsTo(function (e) {
  e.preventDefault()
  if (annotatedObjectsTracker.annotatedObjects.length > 1) {
    alert(`Shortcuts disable because ${annotatedObjectsTracker.annotatedObjects.length} boxes are visible`)
  }
  const visible = $("visible");
  const checked = visible.prop('checked');
  visible.prop('checked', !checked).change();
})

// move top
shortcut('optn shift w', document.body).bindsTo(function (e) {
  e.preventDefault()
  updatePosition("top", (-1))
  updatePosition("height", (1))
})

shortcut('shift w', document.body).bindsTo(function (e) {
  e.preventDefault()
  updatePosition("top", (1))
  updatePosition("height", (-1))
})

// move bottom
shortcut('optn shift s', document.body).bindsTo(function (e) {
  e.preventDefault()
  updatePosition("height", (1))
})

shortcut('shift s', document.body).bindsTo(function (e) {
  e.preventDefault()
  updatePosition("height", (-1))
})

// move left side
shortcut('optn shift a', document.body).bindsTo(function (e) {
  e.preventDefault()
  updatePosition("left", (-1))
  updatePosition("width", (1))
})

shortcut('shift a', document.body).bindsTo(function (e) {
  e.preventDefault()
  updatePosition("left", (1))
  updatePosition("width", (-1))
})

// move right side
shortcut('optn shift d', document.body).bindsTo(function (e) {
  e.preventDefault()
  updatePosition("width", (1))
})

shortcut('shift d', document.body).bindsTo(function (e) {
  e.preventDefault()
  updatePosition("width", (-1))
})

const updatePosition = function (param, value) {
  if (annotatedObjectsTracker.annotatedObjects.length > 1) {
    alert(`Shortcuts disable because ${annotatedObjectsTracker.annotatedObjects.length} boxes are visible`)
  }
  const bbox = $('.bbox');
  const position = bbox.position();
  let initValue;
  if (param === 'width') {
    initValue = bbox.width()
  } else if (param === 'height') {
    initValue = bbox.height()
  } else if (param === 'top') {
    initValue = position.top
  } else if (param === 'left') {
    initValue = position.left
  }
  bbox.css(`${param}`, (initValue + value));
  let bbox2 = new BoundingBox(Math.round(position.left), Math.round(position.top), Math.round(bbox.width()), Math.round(bbox.height()));
  const frameNo = player.currentFrame;
  annotatedObjectsTracker.annotatedObjects[0].frames[frameNo].bbox = bbox2;
  return annotatedObjectsTracker;
}