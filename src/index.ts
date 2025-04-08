import { io } from 'socket.io-client';
import * as AFRAME from 'aframe';
import * as THREE from 'three';

const socket = io();

const rotationQuaternion = null;
if (rotationQuaternion) {
    //console.log('Rotation Quaternion: ', rotationQuaternion);
}
let clientStartTime = Date.now();
const clientRefreshRate = 10; // time between client updates in ms

let clientID: string;
let clientPlayer: Player | null = null;
let playerUsingXR: boolean = false;
let leftController: THREE.XRTargetRaySpace | undefined = undefined;
let rightController: THREE.XRTargetRaySpace | undefined = undefined;
let leftControllerMesh: AFRAME.Entity | null = null;
let rightControllerMesh: AFRAME.Entity | null = null;
// let clientStartPos: { x: number, y: number, z: number };

let playerList: { [key: string]: Player } = {};
let previousPlayer: PreviousPlayerData | null = null;
getLocalStorage();

let sceneStartInfos: SceneStartInfos;
let playerStartInfos: { [key: number]: PlayerStartInfo };

// store the textBlock GUI elements for updating the scores
/*
const guiTextElements: { [key: string]: GUI.TextBlock } = {};
const guiRectElements: { [key: string]: GUI.Rectangle } = {};
*/

let exitGameAreaInterval: NodeJS.Timeout | null = null;
let enteredGameAreaInterval: NodeJS.Timeout | null = null;

// Get HTML Elements
// const divFps = document.getElementById('fps');
// const divID = document.getElementById('clientID');
const startScreen = document.getElementById('startScreen');
const continueAsPreviousPlayer = document.getElementById('continueAsPreviousPlayer');
const loadingScreen = document.getElementById('loadingScreen');
const startButtons: { [key: number]: HTMLButtonElement } = {};
for (let i = 1; i <= 4; i++) {
    let startbutton = document.getElementById(`startPos-${i}`);
    startButtons[i] = startbutton as HTMLButtonElement;
}

// Test Variables
let serverUpdateCounter = 0;
let oldServerUpdateCounter = 0;
let latencyTestArray: string[] = [];
const updateCounterArray: number[] = [];
const renderLoopTestArray: { suc: number; time: number }[] = [];

let fpsOldTime = 0;
let fpsNewTime = 0;
const fpsArray: { suc: number; time: number }[] = [];

////////////////////////////// CREATE BABYLON SCENE ETC. //////////////////////////////

// Basic Setup ---------------------------------------------------------------------------------
const scene = document.querySelector('a-scene');
// const xr = scene?.renderer.xr;
const sceneThree = scene?.object3D as THREE.Scene;

let camera = document.getElementById('camera') as AFRAME.Entity;
console.log('Camera: ', camera);
camera.setAttribute('position', '0 5 0');
camera.object3D.position.set(0, 5, 0);
camera.object3D.rotation.set(Math.PI / 2, Math.PI, Math.PI / 4);

// let ssr: SSRRenderingPipeline;

function createBasicScene(sceneStartInfos: SceneStartInfos, playerStartInfos: { [key: number]: PlayerStartInfo }) {

    const playCubeSize = sceneStartInfos.playCubeSize;
    const playCubeElevation = sceneStartInfos.playCubeElevation;
    const playerAreaDepth = sceneStartInfos.playerAreaDepth;
    const ballSize = sceneStartInfos.ballSize;
    const ballStartPos = sceneStartInfos.ballStartPos;
    const ballColor = sceneStartInfos.ballColor;
    const calculatedCubeHeight = sceneStartInfos.calculatedCubeHeight;
    const midPointOfPlayCube = sceneStartInfos.midPointOfPlayCube;
    // let playerPaddleSize = sceneStartInfos.playerPaddleSize;

    // Camera --------------------------------------------------------------------------------------


    // Lights --------------------------------------------------------------------------------------

    // Meshes --------------------------------------------------------------------------------------

    let edgeWidth = 0.3;

    const ballSphere = document.getElementById('ball') as AFRAME.Entity;
    ballSphere.object3D.position.set(ballStartPos.x, ballStartPos.y, ballStartPos.z);
    ballSphere.object3D.scale.set(ballSize, ballSize, ballSize);
    ballSphere.setAttribute('material', 'color', ballColor);

    const playBox = document.getElementById('playBox') as AFRAME.Entity;
    playBox.object3D.position.set(0, playCubeElevation, 0);
    playBox.object3D.scale.set(playCubeSize.x, playCubeSize.y, playCubeSize.z);

    // Grounds for the Player Start Positions
    const player1Ground = document.getElementById('player1Ground') as AFRAME.Entity;
    player1Ground.object3D.position.set(playerStartInfos[1].position.x, -25, 0);
    player1Ground.object3D.scale.set(playerAreaDepth, 50, playCubeSize.z);
    player1Ground.setAttribute('material', 'color', playerStartInfos[1].color);

    const player2Ground = document.getElementById('player2Ground') as AFRAME.Entity;
    player2Ground.object3D.position.set(playerStartInfos[2].position.x, -25, 0);
    player2Ground.object3D.scale.set(playerAreaDepth, 50, playCubeSize.z);
    player2Ground.setAttribute('material', 'color', playerStartInfos[2].color);

    const player3Ground = document.getElementById('player3Ground') as AFRAME.Entity;
    player3Ground.object3D.position.set(0, -25, playerStartInfos[3].position.z);
    player3Ground.object3D.scale.set(playCubeSize.x, 50, playerAreaDepth);
    player3Ground.setAttribute('material', 'color', playerStartInfos[3].color);

    const player4Ground = document.getElementById('player4Ground') as AFRAME.Entity;
    player4Ground.object3D.position.set(0, -25, playerStartInfos[4].position.z);
    player4Ground.object3D.scale.set(playCubeSize.x, 50, playerAreaDepth);
    player4Ground.setAttribute('material', 'color', playerStartInfos[4].color);

    const player1Wall = document.getElementById('player1Wall') as AFRAME.Entity;
    player1Wall.object3D.position.set(playerStartInfos[1].position.x, midPointOfPlayCube, 0);
    player1Wall.object3D.scale.set(edgeWidth, calculatedCubeHeight, playCubeSize.z);

    const player2Wall = document.getElementById('player2Wall') as AFRAME.Entity;
    player2Wall.object3D.position.set(-playerStartInfos[2].position.x, midPointOfPlayCube, 0);
    player2Wall.object3D.scale.set(edgeWidth, calculatedCubeHeight, playCubeSize.z);

    const player3Wall = document.getElementById('player3Wall') as AFRAME.Entity;
    player3Wall.object3D.position.set(0, midPointOfPlayCube, playerStartInfos[3].position.z);
    player3Wall.object3D.scale.set(playCubeSize.x, calculatedCubeHeight, edgeWidth);

    const player4Wall = document.getElementById('player4Wall') as AFRAME.Entity;
    player4Wall.object3D.position.set(0, midPointOfPlayCube, -playerStartInfos[4].position.z);
    player4Wall.object3D.scale.set(playCubeSize.x, calculatedCubeHeight, edgeWidth);

    // create walls for the top and the bottom of the playcube
    const topWall = document.getElementById('player5Wall') as AFRAME.Entity;
    topWall.object3D.position.set(0, playCubeSize.y, 0);
    topWall.object3D.scale.set(playCubeSize.x, 0.01, playCubeSize.z);

    const bottomWall = document.getElementById('player6Wall') as AFRAME.Entity;
    bottomWall.object3D.position.set(0, playCubeElevation, 0);
    bottomWall.object3D.scale.set(playCubeSize.x, 0.01, playCubeSize.z);

    // GUI --------------------------------------------------------------------------------------

    /*
    let areaExitGUI = GUI.AdvancedDynamicTexture.CreateFullscreenUI("areaExitGUI");
    let areaExitRect = new GUI.Rectangle();
    areaExitRect.width = "60%";
    areaExitRect.height = "60%";
    areaExitRect.thickness = 1;
    areaExitRect.color = "white";
    areaExitRect.alpha = 1;
    areaExitRect.zIndex = 1;
    areaExitGUI.addControl(areaExitRect);
    guiRectElements['areaExitRect'] = areaExitRect;
    areaExitRect.isVisible = false;

    let areaExitText = new GUI.TextBlock();
    //areaExitText.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    areaExitText.top = "5%";
    areaExitText.text = "";
    areaExitText.color = "white";
    areaExitText.fontFamily = "loadedFont";
    areaExitText.fontSize = 20;
    areaExitRect.addControl(areaExitText);
    guiTextElements['areaExitText'] = areaExitText;

    let areaEnteredGUI = GUI.AdvancedDynamicTexture.CreateFullscreenUI("areaEnteredGUI");
    let areaEnteredRect = new GUI.Rectangle();
    areaEnteredRect.width = "60%";
    areaEnteredRect.height = "60%";
    areaEnteredRect.thickness = 1;
    areaEnteredRect.color = "white";
    areaEnteredRect.alpha = 1;
    areaEnteredRect.zIndex = 1;
    areaEnteredGUI.addControl(areaEnteredRect);
    guiRectElements['areaEnteredRect'] = areaEnteredRect;
    areaEnteredRect.isVisible = false;

    let areaEnteredText = new GUI.TextBlock();
    //areaEnteredText.textVerticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    areaEnteredText.top = "5%";
    areaEnteredText.text = "";
    areaEnteredText.color = "white";
    areaEnteredText.fontFamily = "loadedFont";
    areaEnteredText.fontSize = 20;
    areaEnteredRect.addControl(areaEnteredText);
    guiTextElements['areaEnteredText'] = areaEnteredText;
    */
}

////////////////////////////// END CREATE BABYLON SCENE ETC. //////////////////////////////

interface PlayerStartInfo {
    playerNumber: number;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    color: string;
    used: boolean;
}

interface SceneStartInfos {
    playCubeSize: { x: number, y: number, z: number };
    playCubeElevation: number;
    playerAreaDepth: number;
    playerPaddleSize: { w: number, h: number };
    ballSize: number;
    ballStartPos: { x: number, y: number, z: number };
    ballColor: string;
    calculatedCubeHeight: number;
    midPointOfPlayCube: number;
}

// interface Ball {
//     position: { x: number, y: number, z: number };
//     counter: number;
// }

interface PlayerGameData {
    id: string;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    contrPosR: { x: number, y: number, z: number };
    contrPosL: { x: number, y: number, z: number };
    contrRotR: { x: number, y: number, z: number };
    contrRotL: { x: number, y: number, z: number };
}

interface PlayerData {
    id: string;
    color: string;
    playerNumber: number;
    score: number;
    isPlaying: boolean;
    inPosition: number;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    contrPosR: { x: number, y: number, z: number };
    contrPosL: { x: number, y: number, z: number };
    contrRotR: { x: number, y: number, z: number };
    contrRotL: { x: number, y: number, z: number };
}

interface PreviousPlayerData {
    id: string;
    color: string;
    playerNumber: number;
    score: number;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    contrPosR: { x: number, y: number, z: number };
    contrPosL: { x: number, y: number, z: number };
    contrRotR: { x: number, y: number, z: number };
    contrRotL: { x: number, y: number, z: number };
    playerTime: number;
}

class Player implements PlayerData {
    id: string;
    color: string;
    playerNumber: number;
    score: number;
    isPlaying: boolean;
    inPosition: number;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    contrPosR: { x: number, y: number, z: number };
    contrPosL: { x: number, y: number, z: number };
    contrRotR: { x: number, y: number, z: number };
    contrRotL: { x: number, y: number, z: number };
    headObj?: AFRAME.Entity | null;
    controllerR?: AFRAME.Entity | null;
    controllerL?: AFRAME.Entity | null;
    paddle?: AFRAME.Entity | null;
    scoreMesh?: AFRAME.Entity | null;
    paddleLight?: AFRAME.Entity | null;

    constructor(player: PlayerData, headObj?: AFRAME.Entity, controllerR?: AFRAME.Entity, controllerL?: AFRAME.Entity, paddle?: AFRAME.Entity, scoreMesh?: AFRAME.Entity, paddleLight?: AFRAME.Entity) {
        this.id = player.id;
        this.color = player.color;
        this.playerNumber = player.playerNumber;
        this.score = player.score;
        this.isPlaying = player.isPlaying;
        this.inPosition = player.inPosition;
        this.position = { x: player.position.x, y: player.position.y, z: player.position.z };
        this.rotation = { x: player.rotation.x, y: player.rotation.y, z: player.rotation.z };
        this.contrPosR = { x: player.contrPosR.x, y: player.contrPosR.y, z: player.contrPosR.z };
        this.contrPosL = { x: player.contrPosL.x, y: player.contrPosL.y, z: player.contrPosL.z };
        this.contrRotR = { x: player.contrRotR.x, y: player.contrRotR.y, z: player.contrRotR.z };
        this.contrRotL = { x: player.contrRotL.x, y: player.contrRotL.y, z: player.contrRotL.z };
        this.headObj = headObj || null;
        this.controllerR = controllerR || null;
        this.controllerL = controllerL || null;
        this.paddle = paddle || null;
        this.scoreMesh = scoreMesh || null;
        this.paddleLight = paddleLight || null;
    }

    setData(playerGameData: PlayerGameData) {
        this.position = { x: playerGameData.position.x, y: playerGameData.position.y, z: playerGameData.position.z };
        this.rotation = { x: playerGameData.rotation.x, y: playerGameData.rotation.y, z: playerGameData.rotation.z };
        this.contrPosR = { x: playerGameData.contrPosR.x, y: playerGameData.contrPosR.y, z: playerGameData.contrPosR.z };
        this.contrPosL = { x: playerGameData.contrPosL.x, y: playerGameData.contrPosL.y, z: playerGameData.contrPosL.z };
        this.contrRotR = { x: playerGameData.contrRotR.x, y: playerGameData.contrRotR.y, z: playerGameData.contrRotR.z };
        this.contrRotL = { x: playerGameData.contrRotL.x, y: playerGameData.contrRotL.y, z: playerGameData.contrRotL.z };
    }

    updateObj() {
        if (this.headObj) {
            this.headObj.object3D.position.set(this.position.x, this.position.y, this.position.z);
            this.headObj.object3D.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
        }
        if (this.controllerR) {
            this.controllerR.object3D.position.set(this.contrPosR.x, this.contrPosR.y, this.contrPosR.z);
            this.controllerR.object3D.rotation.set(this.contrRotR.x, this.contrRotR.y, this.contrRotR.z);
        }
        if (this.controllerL) {
            this.controllerL.object3D.position.set(this.contrPosL.x, this.contrPosL.y, this.contrPosL.z);
            this.controllerL.object3D.rotation.set(this.contrRotL.x, this.contrRotL.y, this.contrRotL.z);
        }
        // clamp the paddle position to the play area
        if (this.paddle) {
            if (this.playerNumber == 1) {
                let paddleY, paddleZ;
                if (this.contrPosR.y + sceneStartInfos.playerPaddleSize.h / 2 > sceneStartInfos.playCubeSize.y) {
                    paddleY = sceneStartInfos.playCubeSize.y - sceneStartInfos.playerPaddleSize.h / 2;
                } else if (this.contrPosR.y - sceneStartInfos.playerPaddleSize.h / 2 < sceneStartInfos.playCubeElevation) {
                    paddleY = sceneStartInfos.playCubeElevation + sceneStartInfos.playerPaddleSize.h / 2;
                } else {
                    paddleY = this.contrPosR.y;
                }
                if (this.contrPosR.z + sceneStartInfos.playerPaddleSize.w / 2 > sceneStartInfos.playCubeSize.z / 2) {
                    paddleZ = sceneStartInfos.playCubeSize.z / 2 - sceneStartInfos.playerPaddleSize.w / 2;
                } else if (this.contrPosR.z - sceneStartInfos.playerPaddleSize.w / 2 < -sceneStartInfos.playCubeSize.z / 2) {
                    paddleZ = -sceneStartInfos.playCubeSize.z / 2 + sceneStartInfos.playerPaddleSize.w / 2;
                } else {
                    paddleZ = this.contrPosR.z;
                }
                this.paddle.object3D.position.set(sceneStartInfos.playCubeSize.x / 2, paddleY, paddleZ);
                if (this.scoreMesh && playerUsingXR) {
                    this.scoreMesh.object3D.position.set(this.paddle.object3D.position.x, this.paddle.object3D.position.y, this.paddle.object3D.position.z);
                }
                if (this.paddleLight) {
                    this.paddleLight.object3D.position.set(this.paddle.object3D.position.x, this.paddle.object3D.position.y, this.paddle.object3D.position.z);
                }
            } else if (this.playerNumber == 2) {
                let paddleY, paddleZ;
                if (this.contrPosR.y + sceneStartInfos.playerPaddleSize.h / 2 > sceneStartInfos.playCubeSize.y) {
                    paddleY = sceneStartInfos.playCubeSize.y - sceneStartInfos.playerPaddleSize.h / 2;
                } else if (this.contrPosR.y - sceneStartInfos.playerPaddleSize.h / 2 < sceneStartInfos.playCubeElevation) {
                    paddleY = sceneStartInfos.playCubeElevation + sceneStartInfos.playerPaddleSize.h / 2;
                } else {
                    paddleY = this.contrPosR.y;
                }
                if (this.contrPosR.z + sceneStartInfos.playerPaddleSize.w / 2 > sceneStartInfos.playCubeSize.z / 2) {
                    paddleZ = sceneStartInfos.playCubeSize.z / 2 - sceneStartInfos.playerPaddleSize.w / 2;
                } else if (this.contrPosR.z - sceneStartInfos.playerPaddleSize.w / 2 < -sceneStartInfos.playCubeSize.z / 2) {
                    paddleZ = -sceneStartInfos.playCubeSize.z / 2 + sceneStartInfos.playerPaddleSize.w / 2;
                } else {
                    paddleZ = this.contrPosR.z;
                }
                this.paddle.object3D.position.set(-sceneStartInfos.playCubeSize.x / 2, paddleY, paddleZ);
                if (this.scoreMesh && playerUsingXR) {
                    this.scoreMesh.object3D.position.set(this.paddle.object3D.position.x, this.paddle.object3D.position.y, this.paddle.object3D.position.z);
                }
                if (this.paddleLight) {
                    this.paddleLight.object3D.position.set(this.paddle.object3D.position.x, this.paddle.object3D.position.y, this.paddle.object3D.position.z);
                }
            } else if (this.playerNumber == 3) {
                let paddleY, paddleX;
                if (this.contrPosR.y + sceneStartInfos.playerPaddleSize.h / 2 > sceneStartInfos.playCubeSize.y) {
                    paddleY = sceneStartInfos.playCubeSize.y - sceneStartInfos.playerPaddleSize.h / 2;
                } else if (this.contrPosR.y - sceneStartInfos.playerPaddleSize.h / 2 < sceneStartInfos.playCubeElevation) {
                    paddleY = sceneStartInfos.playCubeElevation + sceneStartInfos.playerPaddleSize.h / 2;
                } else {
                    paddleY = this.contrPosR.y;
                }
                if (this.contrPosR.x + sceneStartInfos.playerPaddleSize.w / 2 > sceneStartInfos.playCubeSize.x / 2) {
                    paddleX = sceneStartInfos.playCubeSize.x / 2 - sceneStartInfos.playerPaddleSize.w / 2;
                } else if (this.contrPosR.x - sceneStartInfos.playerPaddleSize.w / 2 < -sceneStartInfos.playCubeSize.x / 2) {
                    paddleX = -sceneStartInfos.playCubeSize.x / 2 + sceneStartInfos.playerPaddleSize.w / 2;
                } else {
                    paddleX = this.contrPosR.x;
                }
                this.paddle.object3D.position.set(paddleX, paddleY, sceneStartInfos.playCubeSize.z / 2);
                if (this.scoreMesh && playerUsingXR) {
                    this.scoreMesh.object3D.position.set(this.paddle.object3D.position.x, this.paddle.object3D.position.y, this.paddle.object3D.position.z);
                }
                if (this.paddleLight) {
                    this.paddleLight.object3D.position.set(this.paddle.object3D.position.x, this.paddle.object3D.position.y, this.paddle.object3D.position.z);
                }
            } else if (this.playerNumber == 4) {
                let paddleY, paddleX;
                if (this.contrPosR.y + sceneStartInfos.playerPaddleSize.h / 2 > sceneStartInfos.playCubeSize.y) {
                    paddleY = sceneStartInfos.playCubeSize.y - sceneStartInfos.playerPaddleSize.h / 2;
                } else if (this.contrPosR.y - sceneStartInfos.playerPaddleSize.h / 2 < sceneStartInfos.playCubeElevation) {
                    paddleY = sceneStartInfos.playCubeElevation + sceneStartInfos.playerPaddleSize.h / 2;
                } else {
                    paddleY = this.contrPosR.y;
                }
                if (this.contrPosR.x + sceneStartInfos.playerPaddleSize.w / 2 > sceneStartInfos.playCubeSize.x / 2) {
                    paddleX = sceneStartInfos.playCubeSize.x / 2 - sceneStartInfos.playerPaddleSize.w / 2;
                } else if (this.contrPosR.x - sceneStartInfos.playerPaddleSize.w / 2 < -sceneStartInfos.playCubeSize.x / 2) {
                    paddleX = -sceneStartInfos.playCubeSize.x / 2 + sceneStartInfos.playerPaddleSize.w / 2;
                } else {
                    paddleX = this.contrPosR.x;
                }
                this.paddle.object3D.position.set(paddleX, paddleY, -sceneStartInfos.playCubeSize.z / 2);
                if (this.scoreMesh && playerUsingXR) {
                    this.scoreMesh.object3D.position.set(this.paddle.object3D.position.x, this.paddle.object3D.position.y, this.paddle.object3D.position.z);
                }
                if (this.paddleLight) {
                    this.paddleLight.object3D.position.set(this.paddle.object3D.position.x, this.paddle.object3D.position.y, this.paddle.object3D.position.z);
                }
            }
        }
    }

    sendData(xrCamera?: AFRAME.Entity, leftController?: AFRAME.Entity, rightController?: AFRAME.Entity) {
        if (xrCamera && leftController && rightController) {
            const headPos = {
                x: xrCamera?.object3D.position.x,
                y: xrCamera?.object3D.position.y,
                z: xrCamera?.object3D.position.z
            };
            const headRot = {
                x: xrCamera?.object3D.rotation.x,
                y: xrCamera?.object3D.rotation.y,
                z: xrCamera?.object3D.rotation.z
            };
            const contrPosR = {
                x: rightController?.object3D.position.x,
                y: rightController?.object3D.position.y,
                z: rightController?.object3D.position.z
            };
            const contrPosL = {
                x: leftController?.object3D.position.x,
                y: leftController?.object3D.position.y,
                z: leftController?.object3D.position.z
            };
            const contrRotR = {
                x: rightController?.object3D.rotation.x,
                y: rightController?.object3D.rotation.y,
                z: rightController?.object3D.rotation.y
            };
            const contrRotL = {
                x: leftController?.object3D.rotation.x,
                y: leftController?.object3D.rotation.y,
                z: leftController?.object3D.rotation.y
            };

            socket.emit('clientUpdate', {
                position: headPos,
                rotation: headRot,
                contrPosR: contrPosR,
                contrPosL: contrPosL,
                contrRotR: contrRotR,
                contrRotL: contrRotL,
                clientSendTime: Date.now()
            });
        }
    }
}

(async function main() {

    // Add an event listener to each button
    for (let i = 1; i <= Object.keys(startButtons).length; i++) {

        // mouse hover effect and camera position change
        startButtons[i].addEventListener('mouseover', () => {
            handleMouseOver(i);
        });
        // end mouse hover effect and camera position change to default
        startButtons[i].addEventListener('mouseout', () => {
            handleMouseOut(i);
        });

        startButtons[i].addEventListener('click', () => {
            // const htmlBtnId = (event.target as HTMLElement).id;
            // const btnPlayerNumber = Number(htmlBtnId.split('-')[]);
            // console.log(`Button with id ${htmlBtnId} clicked`);
            socket.emit('requestEnterAR', i);
            // socket.emit('requestJoinGame', i);
        });
    }



    if (scene) {
        scene.addEventListener('enter-vr', () => {
            playerUsingXR = true;
        });

        scene.addEventListener('exit-vr', () => {
            getLocalStorage();
            playerUsingXR = false;
            console.log('Player is leaving VR');
            socket.emit('playerEndVR');
            startScreen?.style.setProperty('display', 'flex');
        });
    }

    window.addEventListener('keydown', function (event) {
        // exit VR Session on ESC
        if (event.key === 'Escape') {
            // console.log('Escape Key pressed');
            if (playerUsingXR && scene) {
                scene?.exitVR();
                // engine.resize();
            }
        }
    });

    setInterval(function () {
        // console.log('Interval Function');
        if (clientPlayer) {
            if (playerUsingXR) {
                if (camera && leftControllerMesh && rightControllerMesh) {
                    // console.log('Sending Data to Server while VR');
                    clientPlayer.sendData(camera, leftControllerMesh, rightControllerMesh);
                }
            }
        }
    }, clientRefreshRate);

})();

// !1
// Send the client's start time to the server upon connection
socket.on('connect', () => {
    socket.emit('clientStartTime', clientStartTime);
    // console.log('Previous Player Data: ', previousPlayer);
    latencyTestArray.push(`----------Client Connected----------`);
});

// !2
socket.on('ClientID', (id) => {
    console.log('This Client ID: ', id);
    latencyTestArray.push(`----------This Client ID: ${id} ----------`);
});

// !3
socket.on('reload', () => {
    console.log('Server requested reload');
    latencyTestArray.push(`----------Server requested reload----------`);
    if (scene) {
        scene.exitVR();
    }
    window.location.reload();
});

// set the prevoius player to available
/*socket.on('timeForPreviousPlayers', () => {
    if (previousPlayer != null) {
        let timeDiffPreviousPlayer = clientStartTime - previousPlayer.playerTime;

        console.log('Time Difference to Previous Player: ', timeDiffPreviousPlayer);

        if (timeDiffPreviousPlayer < 30000) {
            console.log(`Previous Player ${previousPlayer.playerNumber} found.`);

            if (continueAsPreviousPlayer) {
                continueAsPreviousPlayer.style.display = 'block';
                continueAsPreviousPlayer.innerHTML = `Continue as Player ${previousPlayer.playerNumber} <span id="btn-arrow-pre"></span>`;
                continueAsPreviousPlayer.style.setProperty('border-color', previousPlayer.color);
                continueAsPreviousPlayer.style.setProperty('color', previousPlayer.color);
                continueAsPreviousPlayer.style.setProperty('box-shadow', `0 0 15px ${previousPlayer.color}50, 0 0 30px ${previousPlayer.color}50, inset 0 0 10px ${previousPlayer.color}50`);
                continueAsPreviousPlayer.style.setProperty('text-shadow', `0 0 10px ${previousPlayer.color}, 0 0 20px ${previousPlayer.color}`);
                // set the color of the button arrow
                let buttonArrow = document.getElementById(`btn-arrow-pre`);
                if (buttonArrow) {
                    buttonArrow.style.setProperty('border-color', previousPlayer.color);
                }

                // click event listener for the continue as previous player button
                continueAsPreviousPlayer.addEventListener('click', () => {
                    console.log('Pressed continue as Previous Player');
                    socket.emit('continueAsPreviousPlayer', previousPlayer);
                });

                // mouse over effect for the continue as previous player button
                continueAsPreviousPlayer.addEventListener('mouseover', () => {
                    if (previousPlayer) {
                        handleMouseOver(previousPlayer.playerNumber, true);
                    }
                });

                // mouse out effect for the continue as previous player button
                continueAsPreviousPlayer.addEventListener('mouseout', () => {
                    if (previousPlayer) {
                        handleMouseOut(previousPlayer.playerNumber, true);
                    }
                });

            }
        } else {
            console.log('Previous Player found, but too late.');
            localStorage.removeItem('player');
        }
    } else {
        console.log('No Previous Player found.');
    }
});*/

// !4
socket.on('joinedWaitingRoom', () => {
    console.log(`You joined the waiting Room. Enter VR to join the Game.`);
    latencyTestArray.push(`----------Client joined Waiting Room----------`);

    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
});

socket.on('startPosDenied', (errorCode) => {
    if (errorCode == 0) {
        console.log('AR Enter position denied. Position is alreay taken.');
    } else if (errorCode == 1) {
        console.log('Starting the Game denied. You are in no game position.');
    } else if (errorCode == 2) {
        console.log('Starting the Game denied. Position is alreay taken.');
    }
});

// !5
// get all current Player Information from the Server at the start
// and spawning all current players except yourself
socket.on('currentState', (players: { [key: string]: Player }, ballColor: string,
    playerStartInfosServer: { [key: number]: PlayerStartInfo }, sceneStartInfosServer: SceneStartInfos) => {

    latencyTestArray.push(`----------Client received currentState----------`);

    sceneStartInfos = sceneStartInfosServer;
    playerStartInfos = playerStartInfosServer;

    // Basic Stuff from the srever for the website and the scene
    // create the Basic babylonjs scene with the infos from the server
    createBasicScene(sceneStartInfos, playerStartInfos);
    // set the start button color for the players
    setStartButtonColor(playerStartInfos);

    let ball = document.getElementById('ball') as AFRAME.Entity;
    ball.setAttribute('color', ballColor);

    // console.log('Playercount: ', Object.keys(players).length);

    Object.keys(players).forEach((id) => {

        // Add new player to the playerList
        playerList[id] = new Player(players[id]);

        // Spawn new player Entity
        addPlayer(playerList[id], false);
        if (playerList[id].isPlaying) {
            addPlayerGameUtils(playerList[id], false);
        }
    });

    setPlayerAvailability(playerStartInfos);
});

// !6
socket.on('clientEntersAR', (newSocketPlayer) => {
    latencyTestArray.push(`----------Client enters AR----------`);

    startScreen?.style.setProperty('display', 'none');

    // if (divID) {
    //     divID.innerHTML = `Player ID: ${newSocketPlayer.id}`;
    // }

    // Start VR Session for the client
    // if (xr) {
    //     xr.setReferenceSpaceType('local-floor');
    // }

    if (scene) {
        scene.enterVR();
    }

    console.log('Enter AR');

    // console log the xr device
    rightController = scene?.renderer.xr.getController(0);
    leftController = scene?.renderer.xr.getController(1);

    rightControllerMesh = document.getElementById('right-controller') as AFRAME.Entity;
    leftControllerMesh = document.getElementById('left-controller') as AFRAME.Entity;

    if (rightControllerMesh) {
        rightControllerMesh.addEventListener('abuttondown', (event) => {
            // !7
            if (!playerList[clientID].isPlaying) {
                socket.emit('requestJoinGame', playerList[clientID].inPosition);
            }
        });

        rightControllerMesh.addEventListener('bbuttondown', (event) => {
            if (playerList[clientID].isPlaying) {
                socket.emit('clientExitsGame', playerList[clientID].playerNumber);
            }
        });
    }

    if (leftControllerMesh) {
        leftControllerMesh.addEventListener('thumbstickdown', (event) => {
            socket.emit('collectingTests', 'all');
        });


        leftControllerMesh.addEventListener('xbuttondown', (event) => {
            // for testing to report a lag
            console.log('Send Lag report');
            socket.emit('reportLag', serverUpdateCounter);
            latencyTestArray.push(`----------Report a Lag at or before Counter: ${serverUpdateCounter}----------`);
        });

        leftControllerMesh.addEventListener('ybuttondown', (event) => {
            // for testing to report a lag
            console.log('Send Lag report');
            socket.emit('reportLag', serverUpdateCounter);
            latencyTestArray.push(`----------Report a Lag at or before Counter: ${serverUpdateCounter}----------`);
        });
    }

    // get the Connection ID of the Player
    clientID = newSocketPlayer.id;

    // get the player of this socket
    clientPlayer = new Player(newSocketPlayer);

    // remove the previous player from the local storage
    localStorage.removeItem('clientID');

    // add this socket player to the playerList
    playerList[clientID] = clientPlayer;

    // Spawn yourself Entity
    addPlayer(playerList[clientID], true);

    // set the xrCamera position and rotation to the player position and rotation from the server
    if (camera) {
        camera.object3D.position.set(playerList[clientID].position.x, playerList[clientID].position.y, playerList[clientID].position.z);
        camera.object3D.rotation.set(playerList[clientID].rotation.x, playerList[clientID].rotation.y, playerList[clientID].rotation.z);
    }

    let playerWall = document.getElementById(`player${playerList[clientID].playerNumber}Wall`) as AFRAME.Entity;
    playerWall.object3D.visible = false;
});

// when the current player is already on the server and a new player joins
socket.on('newPlayer', (newPlayer) => {
    latencyTestArray.push(`----------New Player joined: ${newPlayer.id}----------`);
    // console log about new player joined
    console.log('New player joined: ', newPlayer.id);

    // Add new player to the playerList
    playerList[newPlayer.id] = new Player(newPlayer);

    // Spawn new player Entity
    addPlayer(playerList[newPlayer.id], false);

    /*if (previousPlayer) {
        if (previousPlayer.playerNumber == newPlayer.playerNumber) {
            if (continueAsPreviousPlayer && continueAsPreviousPlayer.style.display != 'none' && !continueAsPreviousPlayer.classList.contains('unavailable')) {
                continueAsPreviousPlayer.classList.add('unavailable');
            }
        }
    }*/
});

// !8
// when the client is on the server and a new player starts playing
// can be the client itself (if in ar)
socket.on('playerStartPlaying', (newPlayerId, startPlayingNumber) => {
    latencyTestArray.push(`----------Player started playing: ${newPlayerId} as ${startPlayingNumber}----------`);
    console.log('Player started playing: ', newPlayerId, ' as ', startPlayingNumber);

    playerList[newPlayerId].isPlaying = true;
    playerList[newPlayerId].playerNumber = startPlayingNumber;

    // set the material of the player to a player material
    changePlayerColor(newPlayerId);

    if (newPlayerId == clientID) {
        addPlayerGameUtils(playerList[newPlayerId], true);
    } else {
        addPlayerGameUtils(playerList[newPlayerId], false);
    }

    let playerWall = document.getElementById(`player${playerList[newPlayerId].playerNumber}Wall`) as AFRAME.Entity;
    if (playerWall) {
        playerWall.object3D.visible = false;
    }
    // let playerScore = scene.getMeshByName(`player${playerList[newPlayer.id].playerNumber}ScoreMesh`) as Mesh;
    // if (playerScore) {
    //     playerScore.isVisible = true;
    // }

    updatePlayerScore(newPlayerId, playerList[newPlayerId].score);

    // set the availability of the start buttons according to the used startpositions on the server
    if (playerList[newPlayerId].isPlaying) {
        if (!startButtons[playerList[newPlayerId].playerNumber].classList.contains('unavailable')) {
            startButtons[playerList[newPlayerId].playerNumber].classList.add('unavailable');
        }
    }

    //guiRectElements['areaEnteredRect'].isVisible = false;
    //guiTextElements['areaEnteredText'].text = ``;
    //guiTextElements['areaEnteredText'].color = "white";
});

// update the players position and rotation from the server
socket.on('serverUpdate', (playerGameDataList, ballPosition, serverSendTime, serverUpdateCounterServer) => {
    Object.keys(playerGameDataList).forEach((id) => {
        if (playerList[id]) {
            // set the new data from the server to the player
            playerList[id].setData(playerGameDataList[id]);
            // update the player object in the scene
            // playerList[id].updateObj();
        }
    });
    // console.log('Server Update Counter: ', serverUpdateCounter);

    serverUpdateCounter = serverUpdateCounterServer;
    // save the time when the client recieved the server update
    // pair it with the server update counter to store the specific update with the recivied time
    updateCounterArray[serverUpdateCounter] = performance.now();

    updateBall(ballPosition);

    // send the pong back to the server to calculate the ServerRoundTrip Time
    socket.emit('ServerPong', serverSendTime, socket.id, serverUpdateCounter);
});

// recieve a score update from the server
socket.on('scoreUpdate', (scoredPlayerID, newScore) => {
    if (playerList[scoredPlayerID]) {
        playerList[scoredPlayerID].score = newScore;

        updatePlayerScore(scoredPlayerID, newScore);
    }
});

socket.on('inPosChange', (playerId, newInPos) => {
    console.log(`${playerId}: InPos change from ${playerList[playerId].inPosition} to ${newInPos}`);
    if (playerList[playerId]) {
        playerList[playerId].inPosition = newInPos;
    }
});

function changePlayerColor(playerId: string) {
    (playerList[playerId].headObj as AFRAME.Entity).setAttribute('color', playerStartInfos[playerList[playerId].playerNumber].color);
    (playerList[playerId].paddle as AFRAME.Entity).setAttribute('color', playerStartInfos[playerList[playerId].playerNumber].color);
    (playerList[playerId].controllerL as AFRAME.Entity).setAttribute('color', playerStartInfos[playerList[playerId].playerNumber].color);
    (playerList[playerId].controllerR as AFRAME.Entity).setAttribute('color', playerStartInfos[playerList[playerId].playerNumber].color);
}

function updateBall(ballPosition: { x: number, y: number, z: number }) {
    let ballSphere = document.getElementById('ball') as AFRAME.Entity;
    ballSphere.object3D.position.set(ballPosition.x, ballPosition.y, ballPosition.z);
}

// update the score gui element for the specific player
function updatePlayerScore(scoredPlayerID: string, newScore: number) {
    // if (guiTextElements[`score${playerList[scoredPlayerID].playerNumber}Label`]) {
    //     guiTextElements[`score${playerList[scoredPlayerID].playerNumber}Label`].text = newScore.toString();
    // }
    // if (guiTextElements[`player${playerList[scoredPlayerID].playerNumber}_scoreLabel`]) {
    //     guiTextElements[`player${playerList[scoredPlayerID].playerNumber}_scoreLabel`].text = newScore.toString();
    // }
}

// when the scene is first loaded this will set the color of the start buttons
// the information can so be send from the server to the client
function setStartButtonColor(startPositions: { [key: number]: PlayerStartInfo }) {
    for (let i = 1; i <= Object.keys(startButtons).length; i++) {
        let startButton = document.getElementById(`startPos-${i}`);
        if (startButton) {
            startButton.style.setProperty('border-color', startPositions[i].color);
            startButton.style.setProperty('color', startPositions[i].color);
            startButton.style.setProperty('box-shadow', `0 0 15px ${startPositions[i].color}50, 0 0 30px ${startPositions[i].color}50, inset 0 0 10px ${startPositions[i].color}50`);
            startButton.style.setProperty('text-shadow', `0 0 10px ${startPositions[i].color}, 0 0 20px ${startPositions[i].color}`);
        }
        // set the color of the button arrow
        let buttonArrow = document.getElementById(`btn-arrow-${i}`);
        if (buttonArrow) {
            buttonArrow.style.setProperty('border-color', startPositions[i].color);
        }
    }
}

// set which player positions are available for the client
// set the availability of the start buttons, the visibility of the player walls and the visibility of the player scores
function setPlayerAvailability(startPositions: { [key: number]: PlayerStartInfo }) {
    for (let i = 1; i <= Object.keys(startButtons).length; i++) {
        let playerWall = document.getElementById(`player${i}Wall`) as AFRAME.Entity;
        // let playerScoreMesh = scene.getMeshByName(`player${i}ScoreMesh`) as Mesh;
        if (startPositions[i].used == true) {
            if (playerWall) {
                playerWall.object3D.visible = false;
            }
            // if (playerScoreMesh) {
            //     playerScoreMesh.isVisible = true;
            // }
            if (!startButtons[i].classList.contains('unavailable')) {
                startButtons[i].classList.add('unavailable');
            }
            if (previousPlayer) {
                if (previousPlayer.playerNumber == i) {
                    if (continueAsPreviousPlayer && continueAsPreviousPlayer.style.display != 'none' && !continueAsPreviousPlayer.classList.contains('unavailable')) {
                        continueAsPreviousPlayer.classList.add('unavailable');
                    }
                }
            }
        } else {
            if (playerWall) {
                playerWall.object3D.visible = true;
            }
            // if (playerScoreMesh) {
            //     playerScoreMesh.isVisible = false;
            // }
            if (startButtons[i].classList.contains('unavailable')) {
                startButtons[i].classList.remove('unavailable');
            }
            if (previousPlayer) {
                if (previousPlayer.playerNumber == i) {
                    if (continueAsPreviousPlayer && continueAsPreviousPlayer.style.display != 'none' && continueAsPreviousPlayer.classList.contains('unavailable')) {
                        continueAsPreviousPlayer.classList.remove('unavailable');
                    }
                }
            }
        }
    }
}

// Spawn Player Entity with the Connection ID
function addPlayer(player: Player, isPlayer: boolean) {
    console.log(`Spawning Player: ${player.id} as Player ${player.inPosition}`);

    let headScaling = 0.3;
    let controllerScaling = 0.1;

    // add the players head
    player.headObj = document.createElement('a-box');
    player.headObj.setAttribute('id', `player${player.playerNumber}_head`);
    player.headObj.setAttribute('color', playerStartInfos[player.playerNumber].color);
    player.headObj.object3D.scale.set(headScaling, headScaling, headScaling);
    player.headObj.object3D.position.set(player.position.x, player.position.y, player.position.z);
    player.headObj.object3D.rotation.set(player.rotation.x, player.rotation.y, player.rotation.z);

    // dont show the players head, if it is the player itself
    if (isPlayer) {
        player.headObj.object3D.visible = false;
    }

    // add the players right and left controller
    player.controllerR = document.createElement('a-box');
    player.controllerR.setAttribute('id', `player${player.playerNumber}_contrR`);
    player.controllerR.setAttribute('color', playerStartInfos[player.playerNumber].color);
    player.controllerR.object3D.scale.set(controllerScaling, controllerScaling, controllerScaling);
    player.controllerR.object3D.position.set(player.contrPosR.x, player.contrPosR.y, player.contrPosR.z);
    player.controllerR.object3D.rotation.set(player.contrRotR.x, player.contrRotR.y, player.contrRotR.z);

    player.controllerL = document.createElement('a-box');
    player.controllerL.setAttribute('id', `player${player.playerNumber}_contrL`);
    player.controllerL.setAttribute('color', playerStartInfos[player.playerNumber].color);
    player.controllerL.object3D.scale.set(controllerScaling, controllerScaling, controllerScaling);
    player.controllerL.object3D.position.set(player.contrPosL.x, player.contrPosL.y, player.contrPosL.z);
    player.controllerL.object3D.rotation.set(player.contrRotL.x, player.contrRotL.y, player.contrRotL.z);

    // player.headObj.isVisible = false;
    // player.controllerL.isVisible = false;
    // player.controllerR.isVisible = false;

    scene?.appendChild(player.headObj);
    scene?.appendChild(player.controllerR);
    scene?.appendChild(player.controllerL);

    playerList[player.id].headObj = player.headObj;
    playerList[player.id].controllerR = player.controllerR;
    playerList[player.id].controllerL = player.controllerL;
}

// spawn the stuff for playing for the player
function addPlayerGameUtils(player: Player, isPlayer: boolean) {
    console.log(`Spawning Player Game Utils of Player: ${player.id} as Player ${player.playerNumber}`);

    let paddleThickness = 0.01;

    // add the players paddle
    player.paddle = document.createElement('a-box');
    player.paddle.setAttribute('id', `player${player.playerNumber}_paddle`);
    if (player.paddle) {
        if (player.playerNumber == 1) {
            player.paddle.object3D.scale.set(paddleThickness, sceneStartInfos.playerPaddleSize.h, sceneStartInfos.playerPaddleSize.w);
            player.paddle.object3D.position.set(sceneStartInfos.playCubeSize.x / 2, player.contrPosR.y, player.contrPosR.z);
        } else if (player.playerNumber == 2) {
            player.paddle.object3D.scale.set(paddleThickness, sceneStartInfos.playerPaddleSize.h, sceneStartInfos.playerPaddleSize.w);
            player.paddle.object3D.position.set(-sceneStartInfos.playCubeSize.x / 2, player.contrPosR.y, player.contrPosR.z);
        } else if (player.playerNumber == 3) {
            player.paddle.object3D.scale.set(sceneStartInfos.playerPaddleSize.w, sceneStartInfos.playerPaddleSize.h, paddleThickness);
            player.paddle.object3D.position.set(player.contrPosR.x, player.contrPosR.y, sceneStartInfos.playCubeSize.z / 2);
        } else if (player.playerNumber == 4) {
            player.paddle.object3D.scale.set(sceneStartInfos.playerPaddleSize.w, sceneStartInfos.playerPaddleSize.h, paddleThickness);
            player.paddle.object3D.position.set(player.contrPosR.x, player.contrPosR.y, -sceneStartInfos.playCubeSize.z / 2);
        }
    }
    player.paddle.object3D.position.set(player.contrPosR.x, player.contrPosR.y, player.contrPosR.z);
    player.paddle.setAttribute('color', playerStartInfos[player.playerNumber].color);

    // add a light to the paddle
    player.paddleLight = document.createElement('a-light');
    player.paddleLight.setAttribute('id', `player${player.playerNumber}_paddleLight`);
    player.paddleLight.setAttribute('type', 'point');
    player.paddleLight.setAttribute('color', playerStartInfos[player.playerNumber].color);
    player.paddleLight.setAttribute('intensity', '1');
    player.paddleLight.setAttribute('distance', '2');
    player.paddleLight.object3D.position.set(player.paddle.object3D.position.x, player.paddle.object3D.position.y, player.paddle.object3D.position.z);

    // add the score Mesh to the player
    player.scoreMesh = document.createElement('a-plane');
    player.scoreMesh.setAttribute('id', `player${player.playerNumber}_scoreMesh`);
    player.scoreMesh.setAttribute('color', playerStartInfos[player.playerNumber].color);

    if (player.scoreMesh) {
        if (playerUsingXR) {
            player.scoreMesh.object3D.position.set(player.contrPosR.x, player.contrPosR.y, player.contrPosR.z);
        } else {
            if (player.playerNumber == 1) {
                player.scoreMesh.object3D.position.set(sceneStartInfos.playCubeSize.x / 2, sceneStartInfos.midPointOfPlayCube, 0);
            } else if (player.playerNumber == 2) {
                player.scoreMesh.object3D.position.set(-(sceneStartInfos.playCubeSize.x / 2), sceneStartInfos.midPointOfPlayCube, 0);
            } else if (player.playerNumber == 3) {
                player.scoreMesh.object3D.position.set(0, sceneStartInfos.midPointOfPlayCube, (sceneStartInfos.playCubeSize.z / 2));
            } else if (player.playerNumber == 4) {
                player.scoreMesh.object3D.position.set(0, sceneStartInfos.midPointOfPlayCube, -(sceneStartInfos.playCubeSize.z / 2));
            }
        }
    }
    if (!isPlayer) {
        // billboard mode in aframe suchen
    } else {
        player.scoreMesh.object3D.rotation.set(playerStartInfos[player.playerNumber].rotation.x, playerStartInfos[player.playerNumber].rotation.y, playerStartInfos[player.playerNumber].rotation.z);
    }

    // var playerScoreTex = GUI.AdvancedDynamicTexture.CreateForMesh(player.scoreMesh);
    // // Player Score
    // var scoreRect = new GUI.Rectangle();
    // scoreRect.thickness = 0;
    // playerScoreTex.addControl(scoreRect);
    // var scoreLabel = new GUI.TextBlock();
    // scoreLabel.fontFamily = "loadedFont";
    // scoreLabel.text = "0";
    // scoreLabel.color = playerStartInfos[player.playerNumber].color;
    // scoreLabel.fontSize = 100;
    // scoreRect.addControl(scoreLabel);
    // // add to guiTextElements
    // guiTextElements[`player${player.playerNumber}_scoreLabel`] = scoreLabel;

    scene?.appendChild(player.paddle);
    scene?.appendChild(player.paddleLight);
    scene?.appendChild(player.scoreMesh);

    playerList[player.id].paddle = player.paddle;
    playerList[player.id].paddleLight = player.paddleLight;
    playerList[player.id].scoreMesh = player.scoreMesh;
}

// visual effect if the ball bounces on a paddle or wall
socket.on('ballBounce', (whichPlayer: number, isPaddle: boolean) => {

    Object.keys(playerList).forEach((id) => {
        if (playerList[id].playerNumber == whichPlayer) {
            if (isPaddle) {
                if (playerList[id].paddle) {
                    playerList[id].paddle.setAttribute('color', 'white');
                    //(playerList[id].paddle?.material as StandardMaterial).emissiveColor = darkenColor3(Color3.FromHexString(playerList[id].color), 1.5);
                    setTimeout(function () {
                        playerList[id].paddle?.setAttribute('color', playerStartInfos[whichPlayer].color);
                    }, 150);
                }
            }
        }
    });

    // let playerWall = document.getElementById(`player${whichPlayer}Wall`) as AFRAME.Entity;

    if (!isPaddle) {
        // hier ball bounce änder farbe
        setTimeout(function () {
            // hier ballbounce zurück farbe
        }, 150);
    }
});

socket.on('playerExitGame', (playerId) => {
    const exitPlayer = playerList[playerId];
    if (exitPlayer) {
        console.log(`Player ${exitPlayer.playerNumber} left the game.`);
        latencyTestArray.push(`----------Player ${exitPlayer.playerNumber} left the game.----------`);

        let playerWall = document.getElementById(`player${exitPlayer.playerNumber}Wall`) as AFRAME.Entity;
        if (playerWall) {
            playerWall.object3D.visible = true;
        }
        // let playerScore = scene.getMeshByName(`player${exitPlayer.playerNumber}ScoreMesh`) as Mesh;
        // if (playerScore) {
        //     playerScore.isVisible = false;
        // }

        playerList[playerId].isPlaying = false;

        exitPlayer.paddle?.parentNode?.removeChild(exitPlayer.paddle);
        exitPlayer.paddleLight?.parentNode?.removeChild(exitPlayer.paddleLight);
        exitPlayer.scoreMesh?.parentNode?.removeChild(exitPlayer.scoreMesh);

        // set the availability of the start buttons according to the used startpositions on the server
        if (!playerList[playerId].isPlaying) {
            if (startButtons[playerList[playerId].playerNumber].classList.contains('unavailable')) {
                startButtons[playerList[playerId].playerNumber].classList.remove('unavailable');
            }
        }
        playerList[playerId].playerNumber = 0;
        changePlayerColor(playerId);

        //guiRectElements['areaExitRect'].isVisible = false;
        //guiTextElements['areaExitText'].text = ``;
        //guiTextElements['areaExitText'].color = "white";
    }
});

socket.on('playerDisconnected', (id) => {
    const disconnectedPlayer = playerList[id];
    if (disconnectedPlayer) {
        console.log('Player disconnected: ', id);
        latencyTestArray.push(`----------Player ${disconnectedPlayer.playerNumber} disconnected.----------`);
        disconnectedPlayer.headObj?.parentNode?.removeChild(disconnectedPlayer.headObj);
        disconnectedPlayer.controllerR?.parentNode?.removeChild(disconnectedPlayer.controllerR);
        disconnectedPlayer.controllerL?.parentNode?.removeChild(disconnectedPlayer.controllerL);
        disconnectedPlayer.paddle?.parentNode?.removeChild(disconnectedPlayer.paddle);
        disconnectedPlayer.paddleLight?.parentNode?.removeChild(disconnectedPlayer.paddleLight);
        disconnectedPlayer.scoreMesh?.parentNode?.removeChild(disconnectedPlayer.scoreMesh);

        let playerWall = document.getElementById(`player${disconnectedPlayer.playerNumber}Wall`) as AFRAME.Entity;
        if (playerWall) {
            playerWall.object3D.visible = true;
        }
        let playerScore = document.getElementById(`player${disconnectedPlayer.playerNumber}_scoreMesh`) as AFRAME.Entity;
        if (playerScore) {
            playerScore.object3D.visible = false;

            // player score back to normal position
            if (disconnectedPlayer.playerNumber == 1) {
                playerScore.object3D.position.set((sceneStartInfos.playCubeSize.x / 2), sceneStartInfos.playCubeSize.x / 2, 0);
            } else if (disconnectedPlayer.playerNumber == 2) {
                playerScore.object3D.position.set(-(sceneStartInfos.playCubeSize.x / 2), sceneStartInfos.playCubeSize.x / 2, 0);
            } else if (disconnectedPlayer.playerNumber == 3) {
                playerScore.object3D.position.set(0, sceneStartInfos.playCubeSize.x / 2, (sceneStartInfos.playCubeSize.z / 2));
            } else if (disconnectedPlayer.playerNumber == 4) {
                playerScore.object3D.position.set(0, sceneStartInfos.playCubeSize.x / 2, -(sceneStartInfos.playCubeSize.z / 2));
            }
        }

        // set the availability of the start buttons according to the used startpositions on the server
        if (disconnectedPlayer.isPlaying) {
            if (startButtons[disconnectedPlayer.playerNumber].classList.contains('unavailable')) {
                startButtons[disconnectedPlayer.playerNumber].classList.remove('unavailable');
            }
        }
        if (previousPlayer) {
            if (previousPlayer.playerNumber == disconnectedPlayer.playerNumber) {
                if (continueAsPreviousPlayer && continueAsPreviousPlayer.style.display != 'none' && continueAsPreviousPlayer.classList.contains('unavailable')) {
                    continueAsPreviousPlayer.classList.remove('unavailable');
                }
            }
        }

        delete playerList[id];

        if (id == clientID) {
            camera.object3D.position.set(0, 5, 0);
            camera.object3D.rotation.set(Math.PI / 2, Math.PI, Math.PI / 4);
        }
    }
});

// when the playing player Exits the game area
socket.on('exitGameArea', (areaExitTimerTime) => {
    console.log('Player exit the Game Area. Timer: ', areaExitTimerTime);
    //guiRectElements['areaExitRect'].isVisible = true;
    //guiRectElements['areaExitRect'].color = playerStartInfos[playerList[clientID].playerNumber].color;
    //guiTextElements['areaExitText'].text = `You exit the Game Area of Position ${playerList[clientID].playerNumber}.\nExit the Game in: \n${areaExitTimerTime / 1000}s\nor reenter the Game Area.`;
    //guiTextElements['areaExitText'].color = playerStartInfos[playerList[clientID].playerNumber].color;
    let timer = areaExitTimerTime / 1000;
    exitGameAreaInterval = setInterval(() => {
        timer -= 1;
        //guiTextElements['areaExitText'].text = `You exit the Game Area of Position ${playerList[clientID].playerNumber}.\nExit the Game in: \n${timer}s\nor reenter the Game Area.`;
        if (timer <= 0) {
            clearInterval(exitGameAreaInterval as NodeJS.Timeout);
            timer = areaExitTimerTime / 1000;
        }
    }, 1000);
});

// when the playing player reenters the game area
socket.on('reenteredGameArea', () => {
    console.log('Player reentered the Game Area.');
    //guiRectElements['areaExitRect'].isVisible = false;
    //guiTextElements['areaExitText'].text = ``;
    //guiTextElements['areaExitText'].color = "white";
    clearInterval(exitGameAreaInterval as NodeJS.Timeout);
});

// when the player enters a game area to join the game
socket.on('enteredGameArea', (areaEnteredTimerTime) => {
    console.log('Player reentered the Game Area. Timer: ', areaEnteredTimerTime);
    //guiRectElements['areaEnteredRect'].isVisible = true;
    //guiRectElements['areaEnteredRect'].color = playerStartInfos[playerList[clientID].inPosition].color;
    //guiTextElements['areaEnteredText'].text = `You entered the Game Area of Position ${playerList[clientID].inPosition}.\nJoin the Game in: \n${areaEnteredTimerTime / 1000}s\nor leave the Game Area.`;
    //guiTextElements['areaEnteredText'].color = playerStartInfos[playerList[clientID].inPosition].color;
    let timer = areaEnteredTimerTime / 1000;
    enteredGameAreaInterval = setInterval(() => {
        timer -= 1;
        //guiTextElements['areaEnteredText'].text = `You entered the Game Area of Position ${playerList[clientID].inPosition}.\nJoin the Game in: \n${timer}s\nor leave the Game Area.`;
        if (timer <= 0) {
            clearInterval(enteredGameAreaInterval as NodeJS.Timeout);
            timer = areaEnteredTimerTime / 1000;
        }
    }, 1000);
});

// when the player Exits the game area while trying to join the game
socket.on('exitJoiningGameArea', () => {
    console.log('Player exit the Joining Game Area.');
    //guiRectElements['areaEnteredRect'].isVisible = false;
    //guiTextElements['areaEnteredText'].text = ``;
    //guiTextElements['areaEnteredText'].color = "white";
    clearInterval(enteredGameAreaInterval as NodeJS.Timeout);
});

////////////////////////// RENDER LOOP //////////////////////////////
// Register a render loop to repeatedly render the scene
function animate() {
    if (scene) {

        Object.keys(playerList).forEach((id) => {
            if (playerList[id]) {
                playerList[id].updateObj();
            }
        });

        if (serverUpdateCounter > 0) {

            // calculate the time difference between the client recieving the server update and teh client showing the update
            // this is the time it takes for the client to process the server update and show it on the screen
            if (oldServerUpdateCounter != serverUpdateCounter) {
                const renderLoopTime = performance.now();
                const deltaRenderLoopTime = renderLoopTime - updateCounterArray[serverUpdateCounter];
                const roundedDRLT = Math.round(deltaRenderLoopTime);

                // console.log('Server Update Counter: ', serverUpdateCounter);
                // latencyTestArray.push(`Server Update Counter: ${serverUpdateCounter}`);
                latencyTestArray.push(`SUC: ${serverUpdateCounter}, Delay: ${roundedDRLT}ms`);
                renderLoopTestArray.push({ suc: serverUpdateCounter, time: roundedDRLT });

            }
            oldServerUpdateCounter = serverUpdateCounter;

            // calculate the fps
            fpsNewTime = performance.now();
            const fps = Math.round(fpsNewTime - fpsOldTime);
            fpsArray.push({ suc: serverUpdateCounter, time: fps });

            fpsOldTime = fpsNewTime;
        }

        scene.renderer.render(sceneThree, scene.camera);
    }
}
if (scene) {
    scene.renderer.setAnimationLoop(animate);
}

////////////////////////// END RENDER LOOP //////////////////////////////

/////////////////////////// HTML CSS Stuff //////////////////////////////

function handleMouseOver(playerNumber: number, isPreButton: boolean = false) {
    const playerStartInfo = playerStartInfos[playerNumber];
    let button, buttonArrow;
    if (isPreButton == false) {
        button = document.getElementById(`startPos-${playerNumber}`);
        buttonArrow = document.getElementById(`btn-arrow-${playerNumber}`);
    } else {
        button = document.getElementById(`continueAsPreviousPlayer`);
        buttonArrow = document.getElementById(`btn-arrow-pre`);
    }
    if (button && !button.classList.contains('unavailable')) {
        // hover effect for the start button
        button.style.backgroundColor = playerStartInfo.color;
        button.style.color = 'black';

        if (buttonArrow) {
            buttonArrow.style.setProperty('border-color', 'black');
            buttonArrow.style.setProperty('width', '10px');
            buttonArrow.style.setProperty('height', '10px');
        }

        if (playerStartInfo) {
            // change camera position to the player start position while hovering over the button

            let cameraHight = sceneStartInfos.playCubeSize.y / 1.5;

            camera.object3D.rotation.set(playerStartInfo.rotation.x, playerStartInfo.rotation.y, playerStartInfo.rotation.z);
            camera.object3D.position.set(playerStartInfo.position.x, cameraHight, playerStartInfo.position.z);

            if (playerNumber == 1) {
                camera.object3D.position.set(playerStartInfo.position.x + 2, cameraHight, playerStartInfo.position.z);
            } else if (playerNumber == 2) {
                camera.object3D.position.set(playerStartInfo.position.x - 2, cameraHight, playerStartInfo.position.z);
            } else if (playerNumber == 3) {
                camera.object3D.position.set(playerStartInfo.position.x, cameraHight, playerStartInfo.position.z + 2);
            } else if (playerNumber == 4) {
                camera.object3D.position.set(playerStartInfo.position.x, cameraHight, playerStartInfo.position.z - 2);
            }

            // hide the specific player wall while hovering over the button
            let playerWall = document.getElementById(`player${playerNumber}Wall`) as AFRAME.Entity;
            if (playerWall) {
                playerWall.object3D.visible = false;
            }

        }
    }
}

function handleMouseOut(playerNumber: number, isPreButton: boolean = false) {
    const playerStartInfo = playerStartInfos[playerNumber];
    let button, buttonArrow;
    if (isPreButton == false) {
        button = document.getElementById(`startPos-${playerNumber}`);
        buttonArrow = document.getElementById(`btn-arrow-${playerNumber}`);
    } else {
        button = document.getElementById(`continueAsPreviousPlayer`);
        buttonArrow = document.getElementById(`btn-arrow-pre`);
    }
    if (button && !button.classList.contains('unavailable')) {
        // change colors back to default
        button.style.backgroundColor = '#00000000';
        button.style.color = playerStartInfo.color;

        // let buttonArrow = document.getElementById(`btn-arrow-${playerNumber}`);
        if (buttonArrow) {
            buttonArrow.style.setProperty('border-color', playerStartInfo.color);
            buttonArrow.style.setProperty('width', '6px');
            buttonArrow.style.setProperty('height', '6px');
        }

        if (playerStartInfo) {
            // change camera position back to default
            camera.object3D.position.set(0, 5, 0);
            camera.object3D.rotation.set(Math.PI / 2, Math.PI, Math.PI / 4);


            // show the specific player wall again
            let playerWall = document.getElementById(`player${playerNumber}Wall`) as AFRAME.Entity;
            if (playerWall /*&& !playerUsingXR*/) {
                playerWall.object3D.visible = true;
            }
        }
    }
}

/////////////////////////// END HTML CSS Stuff //////////////////////////////

/////////////////////////// LOCAL STORAGE //////////////////////////////
// set up Interval function for the local storage of the player data
setInterval(function () {
    setLocalStorage();
}, 1000);

function setLocalStorage() {
    if (playerList[clientID]) {
        let safedPreviousPlayer = {
            id: clientID,
            color: playerList[clientID].color,
            playerNumber: playerList[clientID].playerNumber,
            score: playerList[clientID].score,
            // position: playerList[clientID].position,
            position: { x: playerList[clientID].position.x, y: 0, z: playerList[clientID].position.z }, // dont save the y position (xr adds the head hight automatically)
            rotation: { x: 0, y: playerList[clientID].rotation.y, z: 0 },    //only save the y rotation
            // rotation: playerList[clientID].rotation,
            contrPosR: playerList[clientID].contrPosR,
            contrPosL: playerList[clientID].contrPosL,
            // contrRotR: playerList[clientID].contrRotR,
            contrRotR: { x: 0, y: 0, z: 0 },                                 //reset the controller rotation
            // contrRotL: playerList[clientID].contrRotL,
            contrRotL: { x: 0, y: 0, z: 0 },                                 //reset the controller rotation
            playerTime: Date.now()
        };
        let jsonPreviousPlayer = JSON.stringify(safedPreviousPlayer);
        // console.log(`Previous safed Player: ${jsonPreviousPlayer}`);

        if (typeof (Storage) !== "undefined") {
            localStorage.setItem('player', jsonPreviousPlayer);
        } else {
            console.log('No Web Storage support');
        }
    }
}

function getLocalStorage() {
    if (typeof (Storage) !== "undefined") {
        // Code for localStorage/sessionStorage.
        // localStorage.setItem('clientID', `${clientID}`);
        if (localStorage.getItem('player') != null) {
            let parsedJsonPreviousPlayer = JSON.parse(localStorage.getItem('player') || '{}');
            previousPlayer = {
                id: parsedJsonPreviousPlayer.id,
                color: parsedJsonPreviousPlayer.color,
                playerNumber: Number(parsedJsonPreviousPlayer.playerNumber),
                score: Number(parsedJsonPreviousPlayer.score),
                position:
                {
                    x: Number(parsedJsonPreviousPlayer.position.x),
                    y: Number(parsedJsonPreviousPlayer.position.y),
                    z: Number(parsedJsonPreviousPlayer.position.z)
                },
                rotation:
                {
                    x: Number(parsedJsonPreviousPlayer.rotation.x),
                    y: Number(parsedJsonPreviousPlayer.rotation.y),
                    z: Number(parsedJsonPreviousPlayer.rotation.z)
                },
                contrPosR:
                {
                    x: Number(parsedJsonPreviousPlayer.contrPosR.x),
                    y: Number(parsedJsonPreviousPlayer.contrPosR.y),
                    z: Number(parsedJsonPreviousPlayer.contrPosR.z)
                },
                contrPosL:
                {
                    x: Number(parsedJsonPreviousPlayer.contrPosL.x),
                    y: Number(parsedJsonPreviousPlayer.contrPosL.y),
                    z: Number(parsedJsonPreviousPlayer.contrPosL.z)
                },
                contrRotR:
                {
                    x: Number(parsedJsonPreviousPlayer.contrRotR.x),
                    y: Number(parsedJsonPreviousPlayer.contrRotR.y),
                    z: Number(parsedJsonPreviousPlayer.contrRotR.z)
                },
                contrRotL:
                {
                    x: Number(parsedJsonPreviousPlayer.contrRotL.x),
                    y: Number(parsedJsonPreviousPlayer.contrRotL.y),
                    z: Number(parsedJsonPreviousPlayer.contrRotL.z)
                },
                playerTime: Number(parsedJsonPreviousPlayer.playerTime)
            }

            console.log('Previous Player Data: ', previousPlayer);
        } else {
            previousPlayer = null;
        }
    } else {
        // Sorry! No Web Storage support..
        console.log('No Web Storage support');
    }
}
/////////////////////////// END LOCAL STORAGE //////////////////////////////

///////////////////////////// TESTING GROUND ////////////////////////////

window.addEventListener('keydown', function (event) {

    // add an event listener for ending the server und get the test results
    // l: latency, n: network, x: end server without test results
    // if (event.key === 'x') {
    //     socket.emit('collectingTests', 'shutdown');
    // }
    if (event.key === 'l') {
        socket.emit('collectingTests', 'latency');
    }
    if (event.key === 'n') {
        socket.emit('collectingTests', 'network');
    }
    if (event.key === 'a') {
        socket.emit('collectingTests', 'all');
    }
});

socket.on('requestTestArray', () => {
    for (let i = 0; i < updateCounterArray.length; i++) {
        if (updateCounterArray[i] == undefined) {
            latencyTestArray.push(`SUC: ${i}, ERROR: Serverupdate not recieved`);
        }
    }
    socket.emit('sendTestArray', latencyTestArray, renderLoopTestArray, fpsArray);
    console.log('Test Array sent to Server');
    // latencyTestArray = [];
});

// document.addEventListener('click', () => {
//     if (playerUsingXR) {
//         socket.emit('clicked', playerList[clientID].color);
//     }
// });

// socket.on('colorChanged', (color) => {

//     // console.log('Color Changed to: ', color);
//     // change color of the sphere
//     let ballMaterial = scene.getMaterialByName('ballMaterial') as PBRMaterial;
//     ballMaterial.emissiveColor = Color3.FromHexString(color);

// });

// function debugTestclick() {
//     socket.emit('testClick', clientID);
//     console.log('XRCam Rotation Quat: ', xrCamera?.rotationQuaternion);
//     console.log('XRCam Rotation: ', xrCamera?.rotationQuaternion.toEulerAngles());
// }

socket.on('ping', (data) => {
    const clientReceiveTime = Date.now();
    // console.log('Ping received: ', data);
    socket.emit('pong', { serverSendTime: data.serverSendTime, clientReceiveTime, clientId: socket.id });
});

/*socket.on('clientPong', (serverClientSendTime) => {
    const clientSendTime = serverClientSendTime;
    const clientReceiveTime = Date.now();
    const clientRoundTripTime = clientReceiveTime - clientSendTime;
    // console.log('Client Round Trip Time: ', clientRoundTripTime);
    socket.emit('clientRoundTripTime', clientRoundTripTime, socket.id);
});*/

////////////////////////// END TESTING GROUND ////////////////////////////// 