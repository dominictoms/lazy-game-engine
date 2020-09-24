// not using strict mode is for pussies
"use strict";

// canvas shit
var c = undefined;
var ctx = undefined;

// global objects
var globalSprites = [];
var globalScenes = [];
var globalCameras = [];
var globalSoundObjects = [];

// active objects
var activeSceneIndex = 0;
var activeKeys = {};

// mouse shit
var mousePos = {x: undefined, y: undefined};
var activeMouse = {};

// misc
var bgCol = "rbga(0, 0, 0, 0)";
var focused = 0;
var tic = 0;
var globalPhysics = 1;

// classes
class sprite
{
	constructor(key, img, tileWidth, tileHeight, frame)
	{
		this.key = key;
		this.id = undefined;
		this.img = img;
		this.x = 0;
		this.y = 0;
		this.width = 0;
		this.height = 0;
		this.tileWidth = tileWidth;
		this.tileHeight = tileHeight;
		this.imgWidth = 0;
		this.imgHeight = 0;
		this.frame = frame;
		this.animStart = 0;
		this.animEnd = 0;
		this.animKey = undefined;
		this.framerate = 0;
		this.overlapCollision = 0;
		this.solidCollision = 0;
		this.currentOverlap = 0;
		this.overlapEnter = undefined;
		this.overlapStay = undefined;
		this.overlapExit = undefined;
		this.physics = 0;
		this.force = 0;
		this.mass = 0;
		this.accel = 0;
		this.grounded = 0;
		this.still = 0;
		this.landTop = undefined;
		this.landBottom = undefined;
		this.rows = undefined;
	}
}

class camera
{
	constructor(key, x, y)
	{
		this.key = key;
		this.x = x;
		this.y = y;
		this.minX = undefined;
		this.minY = undefined;
	}
}

class layer
{
	constructor(key, z, parallax)
	{
		this.key = key;
		this.z = z;
		this.parallax = parallax;
		this.activeSprites = [];
		this.activeText = [];
	}
}

class scene
{
	constructor(key, gravity, awake, update)
	{
		this.key = key;
		this.gravity = gravity;
		this.activeLayers = [new layer("default", 0, 1)];
		this.camIndex = 0;
		this.awake = awake;
		this.update = update;
	}
}

class textBox
{
	constructor(key, text, font, size, col, x, y)
	{
		this.key = key;
		this.text = text;
		this.font = font;
		this.size = size;
		this.col = col;
		this.x = x;
		this.y = y;
	}
}

class soundObject
{
	constructor(key, soundObject)
	{
		this.key = key;
		this.soundObject = soundObject;
		this.playOnClick = 0;
	}
}

// initialize the engine
function init(config)
{
	// create and configure the canvas
	c = document.createElement("canvas");
	c.id = "game";
	c.width = config.width;
	c.height = config.height;
	var body = document.getElementsByTagName("body")[0];
	body.appendChild(c);
	ctx = c.getContext("2d");
	
	// default stuff
	globalScenes.push(new scene("default", 10, undefined, undefined));
	mousePos = {x: config.width/2, y: config.width/2};
	
	// set favicon
	//setFavicon(fav);
	
	// configure the css
	var style = document.createElement("style");
	var aspect = getAspectRatio();
	aspect = aspect.x + "/" + aspect.y;
	var pixel = "";
	if (config.pixel) pixel = "image-rendering: pixelated; image-rendering: crisp-edges;"
	style.innerHTML = `
		html, body {overflow: hidden; background-color: black;}
		#game {position: absolute; margin: 0px; ` + pixel + ` top: 0px; left: 0px;}
		@media (min-aspect-ratio: ` + aspect + `){#game{height: 100vh; left: 50%; transform: translateX(-50%);}}
		@media (max-aspect-ratio: ` + aspect + `){#game{width: 100vw; top: 50%; transform: translateY(-50%);}}
		@media (aspect-ratio: ` + aspect + `){#game{width: 100vw; left: 0%; top: 0%; transform: translateX(0%); transform: translateY(0%);}`;
	document.head.appendChild(style);
	
	// begin the game
	window.onload = e_awake();
}

// engine awake function
function e_awake()
{
	if (typeof awake == "function") awake();
	setInterval(e_update, 1000/config.framerate);
}

// engine update loop
function e_update()
{
	// reset the canvas
	ctx.clearRect(0, 0, c.width, c.height);
	
	// update tic counter
	tic++;
	if (tic > config.framerate) tic = 1;
	
	// fill background colour
	ctx.restore();
	ctx.fillStyle = bgCol;
	ctx.fillRect(0, 0, c.width, c.height);
	
	// lock the camera
	var cam = globalCameras[globalScenes[activeSceneIndex].camIndex];
	if (cam.x < cam.minX) cam.x = cam.minX;
	if (cam.x > cam.maxX) cam.x = cam.maxX;

	// draw the active sptites
	for (var i = 0; i < globalScenes[activeSceneIndex].activeLayers.length; i++)
	{
		
		
		// move the camera
		ctx.restore();
		ctx.save();
		ctx.translate(
			Math.round(cam.x * -globalScenes[activeSceneIndex].activeLayers[i].parallax + c.width/2),
			Math.round(cam.y * -globalScenes[activeSceneIndex].activeLayers[i].parallax + c.height/2)
		);
		
		
		// draw the sprite
		for (var x = 0; x < globalScenes[activeSceneIndex].activeLayers[i].activeSprites.length; x++)
		{
			// store sprite as a variable
			var sprite = globalScenes[activeSceneIndex].activeLayers[i].activeSprites[x];
			
			// physics
			if (sprite.physics && globalPhysics)
			{
				sprite.accel += sprite.mass * globalScenes[activeSceneIndex].gravity;
				sprite.y += sprite.accel;
			}
			
			// collision
			if (sprite.solidCollision && !sprite.still)
			{	
				for (var a = 0; a < globalScenes[activeSceneIndex].activeLayers[i].activeSprites.length; a++)
				{
					// overlap collision
					if (globalScenes[activeSceneIndex].activeLayers[i].activeSprites[a].overlapCollision)
					{
						// store objects in variables
						var overlap = globalScenes[activeSceneIndex].activeLayers[i].activeSprites[a];
						var solid = sprite;
						
						// prevent object from colliding with itself
						if (overlap == solid) break;
						
						// calculate distance
						var distance = {x: overlap.x - solid.x, y: overlap.y - solid.y};
						
						// collision detection
						if (solid.x + solid.width > overlap.x && solid.x < overlap.x + overlap.width
						&& solid.y + solid.height > overlap.y && solid.y < overlap.y + overlap.height)
						{
							// overlap enter function
							if (!overlap.currentOverlap)
							{
								if (typeof overlap.overlapEnter == "function") overlap.overlapEnter();
								overlap.currentOverlap = solid;
							}
							
							// overlap exit function
							if (typeof overlap.overlapStay == "function") overlap.overlapStay();
							
						}
						else if (overlap.currentOverlap == solid)
						{
							if (typeof overlap.overlapExit == "function") overlap.overlapExit();
							overlap.currentOverlap = 0;
						}
					}
					
					// solid collision
					if (globalScenes[activeSceneIndex].activeLayers[i].activeSprites[a].solidCollision)
					{
						// store objects in variables
						var solidA = globalScenes[activeSceneIndex].activeLayers[i].activeSprites[a];
						var solidB = sprite;
						
						// prevent object from colliding with itself
						if (solidA == solidB) break;
						
						// find the center point of solid a
						var acx = solidA.x + solidA.width/2;
						var acy = solidA.y + solidA.height/2;
						
						var colboxes = [];
						
						// collision detection
						if (solidA.x + (solidA.width * solidA.rows[0])> solidB.x && solidA.x < solidB.x + (solidB.width * solidB.rows[0])
						&& solidA.y + (solidA.height * solidA.rows.length) > solidB.y && solidA.y < solidB.y + (solidB.height * solidB.rows.length))
						{
							// position to set x and y coordinates
							var xmov = 0;
							var ymov = 0;
							
							// check edge of collision
							if (solidB.y > acy) ymov = solidA.y + (solidA.height * solidA.rows.length);
							if (solidB.y < acy) ymov = solidA.y - (solidB.height * solidB.rows.length);
							if (solidB.x < acx) xmov = solidA.x - (solidB.width * solidB.rows[0]);
							if (solidB.x > acx) xmov = solidA.x + (solidA.width * solidA.rows[0]);

							// is player closest to x or y edge
							var dx = solidB.x - xmov;
							var dy = solidB.y - ymov;
							
							// transform the player to nearest edge
							if (closestToZero(dx, dy) == dx) solidB.x = xmov;
							else solidB.y = ymov;
						}
						
						// stop acceleration on land
						if (solidA.x + (solidA.width * solidA.rows[0]) > solidB.x && solidA.x < solidB.x + (solidB.width * solidB.rows[0]))
						{		
							if (solidB.y + (solidB.height * solidB.rows.length) == solidA.y && sprite.accel > 0)
							{
								if (typeof solidA.landTop == "function") solidA.landTop();
								if (typeof solidB.landTop == "function") solidB.landTop();
								sprite.accel = 0;
							}
							if (solidB.y == solidA.y + (solidA.height * solidA.rows.length) && sprite.accel < 0)
							{
								if (typeof solidA.landBottom == "function") solidA.landBottom();
								if (typeof solidB.landBottom == "function") solidB.landBottom();
								sprite.accel = 0;
							}
						}
					}
				}
			}
			
			// draw point for tile
			var drawPoint = {x: -sprite.width, y: 0};
			
			// loop through each tile
			for (var o = 0; o < sprite.frame.length; o++)
			{	
				// set tile position
				drawPoint.x += sprite.width;
				
				// dont draw if blank tile
				if (sprite.frame[o] == -1)
				{
					continue;
				}
				
				if (sprite.frame[o] === "\n")
				{
					drawPoint.x = -sprite.width;
					drawPoint.y += sprite.height;
					continue;
				}
				
				// update frame for animated sprite
				if (sprite.framerate)
				{
					if (sprite.frame[o] > sprite.animEnd
					|| sprite.frame[o] < sprite.animStart)
					{
						sprite.frame[o] = [sprite.animStart];
					}
					
					if (isMultiple(tic, config.framerate/sprite.framerate))
					{
						sprite.frame[o]++;
						if (sprite.frame[o] > sprite.animEnd)
						{
							sprite.frame[o] = [sprite.animStart];
						}
					}
				}
				
				// clip point for frame
				var clipPoint = {x: 0, y: 0};
				
				// calculate frame position
				for (var z = 0; z < sprite.frame[o]; z++)
				{
					// add frame size to clip point x
					clipPoint.x += sprite.tileWidth;
					
					// add frame size to clip point y
					if (clipPoint.x >= sprite.imgWidth)
					{
						clipPoint.x = 0;
						clipPoint.y += sprite.tileHeight;
					}
				}
				
				// draw the sprite onto the canvas
				ctx.drawImage(
					sprite.img,
					clipPoint.x,
					clipPoint.y,
					sprite.tileWidth,
					sprite.tileHeight,
					Math.round(sprite.x + drawPoint.x),
					Math.round(sprite.y + drawPoint.y),
					sprite.width,
					sprite.height
				);
			}
		}
		
		// draw the text
		for (var x = 0; x < globalScenes[activeSceneIndex].activeLayers[i].activeText.length; x++)
		{
			var text = globalScenes[activeSceneIndex].activeLayers[i].activeText[x];
			
			// set font
			ctx.font = text.size + "px " + text.font;
			
			// set colour
			ctx.fillStyle = text.col;

			// draw text
			for (var t = 0; t < text.text.length; t++)
			{	
				// draw text line
				ctx.fillText(
					text.text[t],
					text.x,
					text.y + ((text.size + text.size/5) * t)
				);
			}
		}
	}
	
	// call scene update function
	if (typeof globalScenes[activeSceneIndex].update == "function") globalScenes[activeSceneIndex].update();
	
	// call the user global update function
	if (typeof update == "function") update();
}

// gcd function
function gcd(a, b)
{
	return (b == 0) ? a : gcd (b, a % b);
}

// return an aspect ratio
function getAspectRatio(x = c.width, y = c.height)
{   
	var r = gcd(x, y);
    return {x: x/r, y: y/r};
}

// create a new sprite
function createSprite(key, imgPath, tileWidth = undefined, tileHeight = undefined)
{
	// create image object for sprite
	var img = new Image();
	img.src = imgPath;
	
	// push unloaded sprite to array
	var length = globalSprites.push(new sprite(key, img, tileWidth, tileHeight));

	// update active sprites when loaded
	img.onload = function()
	{
		// update global sprite
		var spriteIndex = getIndexFromKey(key, globalSprites);
		updateSpriteInfo(globalSprites[spriteIndex], img);
		
		// update active sprites
		for (var y = 0; y < globalScenes.length; y++)
		{
			for (var i = 0; i < globalScenes[y].activeLayers.length; i++)
			{
				for (var x = 0; x < globalScenes[y].activeLayers[i].activeSprites.length; x++)
				{
					if (globalScenes[y].activeLayers[i].activeSprites[x].key == key)
					{	
						updateSpriteInfo(globalScenes[y].activeLayers[i].activeSprites[x], img);
					}
				}
			}
		}
	}
}

function updateSpriteInfo(path, img)
{
	// set default dimensions
	path.imgWidth = img.width;
	path.imgHeight = img.height;
	
	// dimensions variable
	var dimensions = {w: img.width, h: img.height};
	
	// check if sprite has custom tile width and tile height
	if (!path.tileWidth)
	{
		path.tileWidth = dimensions.w;
		path.tileHeight = dimensions.h;
	}
	
	else if (path.tileWidth)
	{
		 dimensions.w = path.tileWidth;
		 dimensions.h = path.tileHeight;
	}
	
	// check if sprite has custom width and height
	if (!path.width)
	{
		path.width = dimensions.w;
		path.height = dimensions.h;
	}
}

// draw a sprite
function drawSprite(key, id, frame, scene, layer, x, y, w = undefined, h = undefined)
{
	// get sprite index from sprite key
	var spriteIndex = getIndexFromKey(key, globalSprites);
	
	// update variables
	if(!frame.length)
	{
		frame = [frame];
	}
	
	if(!w || !h)
	{
		w = globalSprites[spriteIndex].width;
		h = globalSprites[spriteIndex].height;
	}
	
	// rows in tilemap
	var rowlen = 0;
	var rows = [];
	for (var i = 0; i < frame.length; i++)
	{	
		// split at line break
		if (frame[i] === "\n")
		{
			rows.push(rowlen);
			rowlen = 0;
			continue;
		}
		
		rowlen++;
		
		// push at end
		if (i == frame.length - 1)
		{
			rows.push(rowlen);
		}
	}
	
	// duplicate sprite
	var newSprite = Object.assign({}, globalSprites[spriteIndex])
	
	// configure sprite
	newSprite.id = id;
	newSprite.x = x;
	newSprite.y = y;
	newSprite.width = w;
	newSprite.height = h;
	newSprite.frame = frame;
	newSprite.rows = rows;
	
	// get scene index from key
	var sceneIndex = getIndexFromKey(scene, globalScenes);
	
	// get layer index from layer key
	var layerIndex = getIndexFromKey(layer, globalScenes[sceneIndex].activeLayers);
	
	// push sprite to array
	globalScenes[sceneIndex].activeLayers[layerIndex].activeSprites.push(newSprite);
}

// move a sprite
function moveSprite(id, x, y)
{
	// get sprite from id
	var spriteIndex = getSpriteFromId(id);
	
	// move the sprite
	spriteIndex.x = x;
	spriteIndex.y = y;
}

// transform a sprite
function transformSprite(id, x, y)
{
	// get sprite from key
	var spriteIndex = getSpriteFromId(id);
	
	// transform the sprite
	spriteIndex.x += x;
	spriteIndex.y += y;
}

// set an animation for the sprite
function setSpriteAnimation(id, key, framerate, startFrame, endFrame)
{
	var spriteIndex = getSpriteFromId(id);
	spriteIndex.animStart = startFrame;
	spriteIndex.animEnd = endFrame;
	spriteIndex.framerate = framerate;
	spriteIndex.animKey = key;
}

// return sprite info
function getSpriteInfo(id)
{
	// get sprite from key
	var spriteIndex = getSpriteFromId(id);
	return {
		x: spriteIndex.x,
		y: spriteIndex.y,
		cx: spriteIndex.x + spriteIndex.width/2,
		cy: spriteIndex.y + spriteIndex.height/2,
		width: spriteIndex.width,
		height: spriteIndex.height,
		anim: spriteIndex.animKey
	}
}

// return an index from a key
function getIndexFromKey(key, arr)
{
	var index = undefined;
	for (var i = 0; i < arr.length; i++)
	{
		if (arr[i].key == key)
		{
			index = i;
		}
	}
	return index;
}

// return a sprite from the sprite id
function getSpriteFromId(id)
{
	for (var y = 0; y < globalScenes.length; y++)
	{
		for (var i = 0; i < globalScenes[y].activeLayers.length; i++)
		{
			for (var x = 0; x < globalScenes[y].activeLayers[i].activeSprites.length; x++)
			{
				if (globalScenes[y].activeLayers[i].activeSprites[x].id == id)
				{
					return globalScenes[y].activeLayers[i].activeSprites[x];
				}
			}
		}
	}
}

// lerp between two values
function lerp (a, b, s)
{
	// prevent excessive lerping
	if (s > 1) s = 1;
	
	// return the lerp value
	return (1 - s) * a + s * b;
}

// set the background colour
function setBgCol(col)
{
	bgCol = col;
}

// update key object on key down
onkeydown = function(e)
{
	if (!focused) return;
	
	if (activeKeys[e.key] == -1) return;
	activeKeys[e.key] = 1;
}

// update key object on key up
onkeyup = function(e)
{
	if (!focused) return;
	activeKeys[e.key] = 0;
}

// return true on key down
function onKeyDown(key)
{	
	if (activeKeys[key])
	{
		return 1;
	}
}

// return true on key press
function onKeyPress(key)
{	
	if (activeKeys[key] && activeKeys[key] != -1)
	{
		activeKeys[key] = -1;
		return 1;
	}
}

// create a new camera
function createCamera(key, x, y)
{
	globalCameras.push(new camera(key, x, y));
}

// set the current active camera
function setActiveCamera(key, scene)
{
	// get camera index
	var camIndex = getIndexFromKey(key, globalCameras);
	
	// get scene index
	var sceneIndex = getIndexFromKey(scene, globalScenes);
	
	// set the camera
	globalScenes[sceneIndex].camIndex = camIndex;
}

// transform the active camera
function transformActiveCam(x, y)
{
	globalCameras[globalScenes[activeSceneIndex].camIndex].x += x;
	globalCameras[globalScenes[activeSceneIndex].camIndex].y += y;
}

// move the active camera
function moveActiveCam(x, y)
{
	globalCameras[globalScenes[activeSceneIndex].camIndex].x = x;
	globalCameras[globalScenes[activeSceneIndex].camIndex].y = y;
}

// return the coordinates of the current active camera
function getActiveCamInfo()
{
	return {x: globalCameras[globalScenes[activeSceneIndex].camIndex].x, y: globalCameras[globalScenes[activeSceneIndex].camIndex].y};
}

// create a new layer
function createLayer(key, scene, z, parallax)
{
	// stop extreme parallax
	if (parallax > 2) parallax = 2;
	
	// get scene index
	var sceneIndex = getIndexFromKey(scene, globalScenes);
	
	// add layer to array
	globalScenes[sceneIndex].activeLayers.push(new layer(key, z, parallax));
	
	// sort the array
	globalScenes[sceneIndex].activeLayers.sort(function(a, b)
	{
		return a.z - b.z;
	});
}

// generate a random number
function rng(a, b)
{
	return Math.floor(Math.random() * (b - a + 1) + a);
}

// draw a text box
function drawTextBox(key, text, scene, layer, x, y, font = "Arial", col = "#000000", size = 30)
{
	// get scene index
	var sceneIndex = getIndexFromKey(scene, globalScenes);
	
	// get layer index
	var layerIndex = getIndexFromKey(layer, globalScenes[sceneIndex].activeLayers);
	
	// split text
	text = text.split("\n");
	
	// push textbox to array
	globalScenes[sceneIndex].activeLayers[layerIndex].activeText.push(new textBox(key, text, font, size, col, x, y));
}

// update mouse position object
onmousemove = function(e)
{	
	var cx = Math.round((e.clientX - c.getBoundingClientRect().left) / ((window.innerWidth  - c.getBoundingClientRect().left*2)/c.width));
	var cy = Math.round((e.clientY - c.getBoundingClientRect().top)  / ((window.innerHeight - c.getBoundingClientRect().top*2) /c.height));
	
	mousePos = {
		x: cx,
		y: cy
	};
}

// set an animation for the sprite
function setSpriteAnimation(id, key, framerate, startFrame, endFrame)
{
	var spriteIndex = getSpriteFromId(id);
	spriteIndex.animStart = startFrame;
	spriteIndex.animEnd = endFrame;
	spriteIndex.framerate = framerate;
	spriteIndex.animKey = key;
}

// check if mouse is outside canvas
function mouseOutsideCanvas(cx, cy)
{
	if (cx < 0 || cx > c.width || cy < 0 || cy > c.height)
	{
		return 1;
	}
}

// return the mouse position object
function getMousePos()
{
	var cPos = {x: mousePos.x, y: mousePos.y};
	
	// prevent negative mouse x value
	if (cPos.x < 0 || cPos.x > c.width)
	{
		if (cPos.x < 0) cPos.x = 0;
		else cPos.x = c.width;
	}
	
	// prevent negative mouse y value
	if (cPos.y < 0 || cPos.y > c.height)
	{
		if (cPos.y < 0) cPos.y = 0;
		else cPos.y = c.height;
	}
	
	return {x: cPos.x, y: cPos.y};
}

// disable right click menu
oncontextmenu = function(e)
{
	if (mouseOutsideCanvas(mousePos.x, mousePos.y)) return;
	e.preventDefault();
	e.stopPropagation();
}

// update mouse object on mouse up
onmouseup = function(e)
{
	activeMouse[e.which] = 0;
}

// update mouse object on mouse down
onmousedown = function(e)
{
	// return if outside canvas
	if (mouseOutsideCanvas(mousePos.x, mousePos.y)) return;
	
	// focus after click
	if (!focused)
	{
		// return if outside canvas
		if (mouseOutsideCanvas(mousePos.x, mousePos.y)) return;
		else playQueuedMusic();
	}

	if (activeMouse[e.which] == -1) return;
	activeMouse[e.which] = 1;
}

// return true on mouse down
function onMouseDown(button)
{	
	if (mouseOutsideCanvas(mousePos.x, mousePos.y)) return;

	if (activeMouse[button])
	{
		return 1;
	}
}

// return true on mouse press
function onMousePress(button)
{
	if (mouseOutsideCanvas(mousePos.x, mousePos.y)) return;
	
	if (activeMouse[button] && activeMouse[button] != -1)
	{
		activeMouse[button] = -1;
		return 1;
	}
}

// play queued music
function playQueuedMusic()
{
	// update focused variable
	focused = 1;
	
	// play all queued audio
	for (var i = 0; i < globalSoundObjects.length; i++)
	{
		if (globalSoundObjects[i].playOnClick)
		{
			playSoundObject(globalSoundObjects[i].key);
		}
	}
}

// set favicon
function setFavicon(img)
{
	var head = document.querySelector("head");
	var favicon = document.createElement("link");
	favicon.setAttribute("rel", "shortcut icon");
	favicon.setAttribute("href", img);
	head.appendChild(favicon);
}

// create a sound object
function createSoundObject(key, path)
{
	// create image object for sprite
	var audio = new Audio(path);
	
	// push unloaded sprite to array
	globalSoundObjects.push(new soundObject(key, audio));
}

// play a sound object
function playSoundObject(key)
{
	// get sound from key
	var soundIndex = getIndexFromKey(key, globalSoundObjects);
	
	// play if focused or set to play if unfocused
	if (focused) globalSoundObjects[soundIndex].soundObject.play();
	else globalSoundObjects[soundIndex].playOnClick = 1;
}

// is number a multiple
function isMultiple(a, b)
{
	return (!(a % b));
}

// create a new scene
function createScene(key, gravity, awake, update)
{
	globalScenes.push(new scene(key, gravity, awake, update));
}

// set the current active scene
function setActiveScene(key)
{
	var sceneIndex = getIndexFromKey(key, globalScenes);
	activeSceneIndex = sceneIndex;
	if (typeof globalScenes[activeSceneIndex].awake == "function") globalScenes[activeSceneIndex].awake();
}

function setOverlapCollision(id, bool, enter, stay, exit)
{
	var spriteIndex = getSpriteFromId(id);
	spriteIndex.overlapCollision = bool;
	spriteIndex.overlapEnter = enter;
	spriteIndex.overlapStay = stay;
	spriteIndex.overlapExit = exit;
}

function setSolidCollision(id, still, bool, landTop = undefined, landBottom = undefined)
{
	var spriteIndex = getSpriteFromId(id);
	spriteIndex.still = still;
	spriteIndex.solidCollision = bool;
	spriteIndex.landTop = landTop;
	spriteIndex.landBottom = landBottom;
}

function closestToZero(a, b)
{
	return Math.abs(b - 0) < Math.abs(a - 0) ? b : a;
}

function setPhysics(id, bool, mass = 1)
{
	var spriteIndex = getSpriteFromId(id);
	spriteIndex.physics = bool;
	spriteIndex.mass = mass;
	spriteIndex.force = mass;
}

function setSpriteAccel(id, accel)
{
	var spriteIndex = getSpriteFromId(id);
	spriteIndex.accel = accel;
}

function lockActiveCamX(min, max)
{
	globalCameras[globalScenes[activeSceneIndex].camIndex].minX = min;
	globalCameras[globalScenes[activeSceneIndex].camIndex].maxX = max;
	
}

function setPhysicsActive(bool)
{
	globalPhysics = bool;
}