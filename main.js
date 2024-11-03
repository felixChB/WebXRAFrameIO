const socket = io();

let playerID = null;
let thisPlayer = null;
let thisPlayerColor = null;

//let previousPosition = null;
//let previousRotation = null;

/*
AFRAME.registerComponent('sync-move', {
    update: function () {
        const position = this.el.getAttribute('position');
        const rotation = this.el.getAttribute('rotation');

        // Check if position or rotation has changed
        if (!previousPosition || !previousRotation ||
            position.x !== previousPosition.x || position.y !== previousPosition.y || position.z !== previousPosition.z ||
            rotation.x !== previousRotation.x || rotation.y !== previousRotation.y || rotation.z !== previousRotation.z) {

            console.log('Player moved');

            // Emit playerMoved event to the server
            socket.emit('playerMoved', {
                id: socket.id,
                position: position,
                rotation: rotation
            });

            // Update previous position and rotation
            previousPosition = position;
            previousRotation = rotation;
        }
    }
});*/

AFRAME.registerComponent('rotation-reader', {
    tick: function () {
      // `this.el` is the element.
      // `object3D` is the three.js object.
  
      // `rotation` is a three.js Euler using radians. `quaternion` also available.
      console.log(this.el.object3D.rotation);
  
      // `position` is a three.js Vector3.
      console.log(this.el.object3D.position);
    }
  });

socket.on('yourPlayerInfo', (socket) => {

    // get the Connection ID of the Player
    playerID = socket.id;
    thisPlayerColor = socket.color;

    // Spawn yourself Entity
    addPlayer(socket);
    // get the Player Entity
    thisPlayer = document.getElementById(playerID);
    // give yourself movement and rotation controls
    thisPlayer.setAttribute('camera', '');
    thisPlayer.setAttribute('look-controls', '');
    thisPlayer.setAttribute('wasd-controls', '');
    thisPlayer.setAttribute('rotation-reader', '');
    //thisPlayer.setAttribute('sync-move', '');
});


document.addEventListener('click', () => {
    socket.emit('clicked');
});

socket.on('colorChanged', (color) => {
    document.getElementById('testBox').setAttribute('color', color);
});

// get Player Information from the Server and calling Spawning function
socket.on('currentState', (players) => {
    Object.keys(players).forEach((id) => {
        let playerByID = document.getElementById(id) || addPlayer(players[id]);
        if (playerByID) {
            playerByID.setAttribute('position', players[id].position);
            playerByID.setAttribute('rotation', players[id].rotation);

            //playerByID.object3D.position.set(players[id].position.x, players[id].position.y, players[id].position.z);
            //playerByID.object3D.rotation.set(players[id].rotation.x, players[id].rotation.y, players[id].rotation.z);
        }
    });
});

// Spawn Player Entity with the Connection ID
function addPlayer(player) {
    const el = document.createElement('a-box');
    el.setAttribute('id', player.id);
    el.setAttribute('position', player.position);
    el.setAttribute('rotation', player.rotation);
    el.setAttribute('color', player.color);
    document.querySelector('a-scene').appendChild(el);
}

socket.on('newPlayer', (player) => {
    console.log('New player joined: ', player.id);
    addPlayer(player);
});

socket.on('playerDisconnected', (id) => {
    const el = document.getElementById(id);
    if (el) {
        el.parentNode.removeChild(el);
    }
});

// Detect player movement and rotation
/*
if (thisPlayer) {
    thisPlayer.addEventListener('componentchanged', (event) => {
        console.log('player moved');
        if (event.detail.name === 'position' || event.detail.name === 'rotation') {
            console.log('Player moved');
            socket.emit('playerMoved', {
                id: socket.id,
                position: player.getAttribute('position'),
                rotation: player.getAttribute('rotation')
            });
        }
    });
} */

setInterval(function () {
    if (thisPlayer) {
        socket.emit('update', {
            position: thisPlayer.getAttribute('position'),
            rotation: thisPlayer.getAttribute('rotation')
        });
    }
}, 10);