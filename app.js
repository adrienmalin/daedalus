const MAX_LEVEL = 3
const DRAW_PERIOD = 0.04 // s
const FLOOR = 390 // px
const TIME_TO_SCREEN = 10 // s
const UPDATE_PERIOD = 0.01 // s
const STEP = FLOOR * UPDATE_PERIOD / TIME_TO_SCREEN // px
const FIRST_NOTE = 48 // C2
const LAST_NOTE = 73 // C4
const NOTE_NAMES = [
    "C",     "C♯",    "D",     "D♯",    "E",     "F",     "F♯",    "G",     "G♯",    "A",  "A♯",    "B"
]
const FREQUENCIES = [
    16.35,   17.32,   18.35,   19.45,   20.6,    21.83,   23.12,   24.5,    25.96,   27.5, 29.14,   30.87,
    32.7,    34.65,   36.71,   38.89,   41.2,    43.65,   46.25,   49,      51.91,   55,   58.27,   61.74,
    65.41,   69.3,    73.42,   77.78,   82.41,   87.31,   92.5,    98,      103.83,  110,  116.54,  123.47,
    130.81,  138.59,  146.83,  155.56,  164.81,  174.61,  185,     196,     207.65,  220,  233.08,  246.94,
    261.63,  277.18,  293.66,  311.13,  329.63,  349.23,  369.99,  392,     415.3,   440,  466.16,  493.88,
    523.25,  554.37,  587.33,  622.25,  659.26,  698.46,  739.99,  783.99,  830.61,  880,  932.33,  987.77,
    1046.5,  1108.73, 1174.66, 1244.51, 1318.51, 1396.91, 1479.98, 1567.98, 1661.22, 1760, 1864.66, 1975.53,
    2093,    2217.46, 2349.32, 2489.02, 2637.02, 2793.83, 2959.96, 3135.96, 3322.44, 3520, 3729.31, 3951.07,
    4186.01, 4434.92, 4698.64, 4978.03, 5274.04, 5587.65, 5919.91, 6271.93, 6644.88, 7040, 7458.62, 7902.13,
]


Array.prototype.remove = function(item) {
    let index = this.indexOf(item)
    if (index == 0) {
        this.shift()
        return true
    } else if (index > 0) {
        this.splice(index, index)
        return true
    }
    else return false
}
    
class Sprite {
    constructor(canvasCtx, src, x, y, width, height, frames=1, zoom=2) {
        this.canvasCtx = canvasCtx
        this.sprite = new Image()
        this.sprite.src = `img/${src}`
        this.sx = 0
        this.sy = 0
        this.sWidth = width
        this.sHeight = height
        this.dWidth = zoom * width
        this.dHeight = zoom * height
        this.x = x
        this.y = y
        this.frames = frames
        this.frame = 0
        this.animated = false
        this.repeat = false
    }

    set x(x) {
        this._x = x
        this.dx = x - (this.dWidth / 2)
    }

    get x() {
        return this._x
    }

    set y(y) {
        this._y = y
        this.dy = y - (this.dHeight / 2)
    }

    get y() {
        return this._y
    }

    play(repeat=false) {
        this.animated = true
        this.repeat = repeat
        return new Promise((resolve, reject) => {
            this.onanimationend = resolve
        })
    }

    animate() {
        if (this.animated) {
            if (this.repeat) {
                this.frame = (this.frame + 1) % this.frames
            } else {
                if (this.frame < this.frames -1) {
                    this.frame++
                } else if (this.frame == this.frames -1) {
                    this.onanimationend()
                }
            }
        }
    }

    onanimationend () {}

    draw(deltaX=0, deltaY=0) {
        canvasCtx.drawImage(
            this.sprite,
            this.sx + this.frame * this.sWidth,
            this.sy,
            this.sWidth,
            this.sHeight,
            this.dx + deltaX,
            this.dy + deltaY,
            this.dWidth,
            this.dHeight
        )

        this.animate()
    }
}


class Cannon extends Sprite {
    constructor(canvasCtx, note) {
        let sharp = [1, 3, 6, 8, 10].includes(note % 12)
        //super(canvasCtx, "cannon.png", 34 * (note - FIRST_NOTE) + 66, sharp? 418:424, 11, 26, 4)
        super(canvasCtx, "cannon.png", 34 * (note - FIRST_NOTE) + 66, 424 - 8*(note % 3), 11, 26, 4)
        this.note = note
        this.key = keyMap[note - FIRST_NOTE]?.toUpperCase() || ""
        this.impactHeight = 9
        this.impactY = 0
        this.sy = sharp? 0 : this.sHeight
        this.shooting = false
        this.df = 1
        this.pipeSprite = new Sprite(canvasCtx, "pipe.png", this.x-1, this.y+36, 16, 18)
    }

    draw(deltaX=0, deltaY=0) {
        if (this.shooting) {
            this.frame += this.df
            if (this.frame >= this.frames) this.df = -1
            else if (this.frame <= 2) this.df = 1
        } else {
            if (this.frame > 0) this.frame--
        }
        this.pipeSprite.draw(deltaX, deltaY)
        this.canvasCtx.fillStyle = "#d3d6cf"
        this.canvasCtx.fillText(this.key, this.pipeSprite.x+2, this.pipeSprite.y+9)
        this.canvasCtx.fillStyle = "#222327"
        this.canvasCtx.fillText(this.key, this.pipeSprite.x, this.pipeSprite.y+8)
        super.draw(deltaX, deltaY)
        if (this.frame) {
            this.canvasCtx.drawImage(this.sprite, this.sWidth*(this.frame), 0, this.sWidth, 1, this.dx, this.impactY, 22, this.dy - this.impactY)
            if (this.impactY) this.canvasCtx.drawImage(this.sprite, this.sWidth*(this.frame), 2*this.sHeight, this.sWidth, this.impactHeight, this.dx, this.impactY, this.dWidth, 2*this.impactHeight)
        }
    }

    explose() {
        return new Sprite(canvasCtx, "big-explosion.png", this.x, this.y, 48, 48, 8)
    }
}


class Note extends Sprite {
    constructor(canvasCtx, note, duration, velocity, sx, sy, width, height, frames, shotAnimationPeriod) {
        super(canvasCtx, "note.png", 34 * (note - FIRST_NOTE) + 66, 0, width, height, frames, 1)
        this.note = note
        this.duration = duration
        this.velocity = velocity
        this.sx = sx
        this.sy = sy
        this.shotAnimationPeriod = shotAnimationPeriod
        this.shot = false
        this.time = 0
        this.angriness = 1
    }

    animate() {
        this.frame = Math.floor(this.time/10) % this.frames
        this.time++
    }

    draw(deltaX=0, deltaY=0) {
        if (this.shot) {
            this.drawShot()
        } else {
            super.draw(deltaX, deltaY)
        }
    }

    drawShot() {
        canvasCtx.drawImage(this.sprite, 0, 0, this.sWidth, this.sHeight, this.dx, this.dy, this.dWidth, this.dHeight)
    }

    explose() {
        return new Sprite(this.canvasCtx, "tiny-explosion.png", this.x, this.y, 16, 16, 7)
    }

    playNoise(time) {
        playNoise(0.4, 1400, 0.3, time)
    }
}


class Sixteenth extends Note {
    constructor(canvasCtx, note, duration, velocity) {
        super(canvasCtx, note, duration, velocity, 21, 0, 21, 32, 2, 2)
    }
}


class Eighth extends Note {
    constructor(canvasCtx, note, duration, velocity) {
        super(canvasCtx, note, duration, velocity, 42, 0, 21, 32, 2, 2)
    }
}


class Quarter extends Note {
    constructor(canvasCtx, note, duration, velocity) {
        super(canvasCtx, note, duration, velocity, 34, 33, 30, 66, 2, 4)
    }

    drawShot() {
        canvasCtx.drawImage(this.sprite, 0, 34, 35, 66, this.dx, this.dy, 35, 66)
    }

    explose() {
        return new Sprite(this.canvasCtx, "little-explosion.png", this.x, this.y, 33, 33, 5)
    }

    playNoise(time) {
        playNoise(0.5, 1000, 0.5, time)
    }
}

class Whole extends Note {
    constructor(canvasCtx, note, duration, velocity) {
        super(canvasCtx, note, duration, velocity, 36, 100, 36, 40, 1)
        this.angriness = 2
    }

    animate() {}

    drawShot() {
        canvasCtx.drawImage(this.sprite, 0, this.sy, this.sWidth, this.sHeight, this.dx, this.dy, this.dWidth, this.dHeight)
    }

    explose() {
        return new Sprite(canvasCtx, "big-explosion.png", this.x, this.y, 48, 48, 8)
    }

    playNoise(time) {
        playNoise(0.7, 400, 0.8, time)
    }
}


let keyMap = keyMapInput.value
let playing = false

let canvasCtx = canvas.getContext("2d")
canvasCtx.mozImageSmoothingEnabled = false
canvasCtx.webkitImageSmoothingEnabled = false
canvasCtx.msImageSmoothingEnabled = false
canvasCtx.imageSmoothingEnabled = false

canvasCtx.font = '12px "Press Start 2P"'
canvasCtx.textAlign = "center"

let consoleSprite =  new Sprite(canvasCtx, "console.png", canvas.width/2, 554, 482, 104)
let syntheSprite = new Sprite(canvasCtx, "synthe.png", canvas.width/2, 546, 110, 80)
let cannonSprites = []
for (let note=FIRST_NOTE; note<LAST_NOTE; note++) cannonSprites[note] = new Cannon(canvasCtx, note)
let batterySprite = new Sprite(canvasCtx, "battery.png", 890, 40, 44, 13, 13)
batterySprite.frame = 12

window.onload = function() {
    draw()
    startDialog.showModal()
}

let audioCtx
let volume
let wave
let mod
let depth
let compressor
let oscillators = {}
let updateTaskId
function init() {
    Tone.start()

    audioCtx = new AudioContext()

    compressor = audioCtx.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-50, audioCtx.currentTime)
    compressor.knee.setValueAtTime(40, audioCtx.currentTime)
    compressor.ratio.setValueAtTime(12, audioCtx.currentTime)
    compressor.attack.setValueAtTime(0, audioCtx.currentTime)
    compressor.release.setValueAtTime(0.25, audioCtx.currentTime)
    compressor.connect(audioCtx.destination)

    volume = audioCtx.createGain()
    volRange.oninput()
    volume.connect(compressor)

    mod = audioCtx.createOscillator() // the modulating oscillator
    depth = audioCtx.createGain() // the modulator amplifier
    modRange.oninput()
    mod.frequency.value = 6
    mod.connect(depth)
    mod.start()

    onpartialinput()

    Tone.Transport.scheduleRepeat(draw, DRAW_PERIOD)
    updateTaskId = Tone.Transport.scheduleRepeat(update, UPDATE_PERIOD)

    if (window.localStorage.midiKeyboard) {
        midiSelect.onfocus()
        keyMapInput.onchange()
    }

    settingsDialog.onclose = newGame
    showSettings()
}
startDialog.onclose = init

let animateConsole = 0
function draw() {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height)

    if (animateConsole) {
        animateConsole++
        if (animateConsole > 5) {
            animateConsole = 0
        }
    }
    let deltaY = animateConsole? 4 : 0;

    consoleSprite.draw(0, deltaY)
    cannonSprites.forEach(cannonSprite => cannonSprite.draw(0, deltaY))
    noteSprites.forEach(noteSprite => noteSprite.draw())
    syntheSprite.draw(0, -deltaY)
    explosionSprites.forEach(explosionSprite => explosionSprite.draw())
    batterySprite.draw()
}

function showSettings() {
    pause()
    settingsDialog.showModal()
}
window.onblur = showSettings

function pause() {
    Tone.Transport.pause()
    playing = false
}

settingsButton.onclick = showSettings

keyMapInput.onclick =  keyMapInput.onkeyup = function(event) {
    let cursorPosition = keyMapInput.selectionEnd
    if ((event.key == "ArrowRight" && cursorPosition <=  keyMapInput.value.length) || cursorPosition == 0) {
        keyMapInput.setSelectionRange(cursorPosition, cursorPosition+1)
    } else {
        keyMapInput.setSelectionRange(cursorPosition-1, cursorPosition)
    }
}

keyMapInput.onchange = function(event) {
    keyMap = keyMapInput.value
    if (midiKeyboard) {
        cannonSprites.forEach((cannonSprite, index) => {
            cannonSprite.key = NOTE_NAMES[index % NOTE_NAMES.length]
        })
    } else {
        cannonSprites.forEach((cannonSprite, index) => {
            cannonSprite.key = keyMap[index - FIRST_NOTE].toUpperCase()
        })
    }
}

var midiIputs
var midiKeyboard = window.localStorage.midiKeyboard || ""
midiSelect.onfocus = function() {
    midiIputs = {}
    midiSelect.innerHTML = `<option value="">Aucun (utiliser les touches ci-dessous)</option>`
    navigator.requestMIDIAccess().then(
        midiAccess => {
            if (midiAccess.inputs.size) {
                for ([,input,] of midiAccess.inputs) {
                    midiIputs[input.id] = input
                    var option = document.createElement("option")
                    option.value = input.id
                    option.innerText = input.name
                    midiSelect.add(option)
                    input.onmidimessage = null
                }
                if(midiIputs[midiKeyboard]) midiSelect.value = midiKeyboard
            }
        },
        error => {
            console.log(error)
        }
    )
}

midiSelect.oninput = () => {
    for (const id in midiIputs) midiIputs[id].onmidimessage = null
    midiKeyboard = midiSelect.value
    if (midiKeyboard) {
        midiIputs[midiKeyboard].onmidimessage = onMIDIMessage
    }
    keyMapInput.onchange()
    window.localStorage.midiKeyboard = midiKeyboard
}

volRange.oninput = function(event) {
    volume.gain.linearRampToValueAtTime(volRange.value, audioCtx.currentTime)
}

modRange.oninput = function(event) {
    depth.gain.value = modRange.value
}

function onpartialinput() {
    wave = audioCtx.createPeriodicWave(
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0].concat(Array.from(document.querySelectorAll(".partial")).map(range => range.value)),
        {disableNormalization: false,}
    )
    for (const note in oscillators) {
        oscillators[note].setPeriodicWave(wave)
    }
}

let level
function newGame() {
    level = 0
    nextLevel()
}

let midiSong
let noteSprites = []
let explosionSprites = []
let health
function nextLevel(time=0) {
    Tone.Transport.pause(time)
    level++
    midiSong = Midi.fromUrl(`midi/${level}.mid`).then((midi) => {
        midiSong = midi
        health = 12
        batterySprite.frame = health
        levelTitle.innerText = `Niveau ${level}`
        songNameTitle.innerText = midiSong.name
        noteSprites = []
        midiSong.tracks.forEach(track => {
            //console.log(track.name)
            track.notes.filter(note => FIRST_NOTE <= note.midi && note.midi <= LAST_NOTE).forEach(note => {
                let noteSprite
                let durationInQuarter = note.durationTicks / midiSong.header.ppq
                if (durationInQuarter <= 0.25) noteSprite = new Sixteenth(canvasCtx, note.midi, note.duration)
                else if (durationInQuarter <= 0.5) noteSprite = new Eighth(canvasCtx, note.midi, note.duration)
                else if (durationInQuarter <= 1) noteSprite = new Quarter(canvasCtx, note.midi, note.duration)
                else noteSprite = new Whole(canvasCtx, note.midi, note.duration)
                Tone.Transport.scheduleOnce(time => noteSprites.push(noteSprite), time + note.time)
            })        
        })
        Tone.Transport.scheduleOnce(nextLevel, time + midiSong.duration + TIME_TO_SCREEN)
    
        levelDialog.showModal()
    }).catch((error) => {
        victory(time)
    })
}

levelDialog.onclose = resume

function resume() {
    settingsDialog.onclose = resume
    playing = true
    Tone.Transport.start()
}

document.onkeydown = function(event) {
    if (playing && keyMap.includes(event.key)) {
        event.preventDefault()
        let note = FIRST_NOTE + keyMap.indexOf(event.key)
        shoot(note)
    }
}

document.onkeyup = function(event) {
    if (playing && keyMap.includes(event.key)) {
        event.preventDefault()
        let note = FIRST_NOTE + keyMap.indexOf(event.key)
        stopShoot(note)
    }
}

function onMIDIMessage(event) {
    let [code, note, velocity] = event.data
    if (144 <= code && code <= 159 && cannonSprites[note]) {
        shoot(note)
    } else if (128 <= code && code <= 143 && cannonSprites[note]) {
        stopShoot(note)
    }
}

function shoot(note) {
    cannonSprites[note].shooting = true

    if (cannonSprites[note].oscillator) return

    var oscillator = audioCtx.createOscillator({type: "sawtooth"})
    oscillator.type = "sawtooth"
    oscillator.frequency.value = FREQUENCIES[note - 24]

    oscillator.velocity = audioCtx.createGain()
    oscillator.velocity.gain.value = 0
    oscillator.velocity.gain.linearRampToValueAtTime(0.15, Tone.Transport.seconds + 0.05)
    oscillator.connect(oscillator.velocity)
    oscillator.start()
    oscillator.velocity.connect(volume)

    depth.connect(oscillator.detune)
    
    cannonSprites[note].oscillator = oscillator
}

function stopShoot(note) {
    cannonSprites[note].shooting = false

    if (!cannonSprites[note].oscillator) return

    var oscillator = cannonSprites[note].oscillator
    oscillator.velocity.gain.exponentialRampToValueAtTime(0.01, Tone.Transport.seconds, 0.5)
    oscillator.stop(Tone.Transport.seconds + 0.5)
    
    delete(cannonSprites[note].oscillator)
}

function update(time) {
    noteSprites.filter(noteSprite => !noteSprite.shot).forEach(noteSprite => {
        noteSprite.y += STEP
    })
    noteSprites.filter(noteSprite => noteSprite.y >= FLOOR).forEach(noteSprite => {
        let explosionSprite = noteSprite.explose()
        explosionSprites.push(explosionSprite)
        explosionSprite.play().then(() => explosionSprites.remove(explosionSprite))
        noteSprite.playNoise(time)
        animateConsole = 1
        health--
        batterySprite.frame = health
    })
    noteSprites = noteSprites.filter(note => note.y < FLOOR)

    if (health <= 0) {
        gameOver(time)
        return
    }

    cannonSprites.filter(cannonSprite => cannonSprite.shooting).forEach(cannonSprite => {
        let noteSprite = noteSprites.find(noteSprite => noteSprite.note == cannonSprite.note)
        cannonSprite.impactY  = noteSprite?.y || 0
        if (noteSprite) {
            cannonSprite.impactY = noteSprite.y
            if (!noteSprite.shot) {
                playNote(noteSprite.note, noteSprite.velocity, noteSprite.duration, time)
                noteSprite.shot = true
                window.setTimeout(() => {
                    noteSprites.remove(noteSprite)
                    let explosionSprite = noteSprite.explose()
                    explosionSprites.push(explosionSprite)
                    explosionSprite.play().then(() => explosionSprites.remove(explosionSprite))
                }, noteSprite.duration * 1000)
            }
        } else {
            cannonSprite.impactY = 0
        }
    })
}

function playNote(note, velocity=0.7, duration=0, time=audioCtx.currentTime) {
    if(oscillators[note]) return

    var oscillator = audioCtx.createOscillator()
    oscillator.frequency.value = FREQUENCIES[note]
    oscillator.setPeriodicWave(wave)

    oscillator.velocity = audioCtx.createGain()
    oscillator.velocity.gain.value = 0
    oscillator.velocity.gain.linearRampToValueAtTime(velocity, time + 0.05)
    oscillator.connect(oscillator.velocity)
    oscillator.start()
    oscillator.velocity.connect(volume)

    depth.connect(oscillator.detune)

    oscillators[note] = oscillator
    if (duration) stopNote(note, time + duration)
}

function stopNote(note, time=audioCtx.currentTime) {
    if(!oscillators[note]) return

    oscillators[note].velocity.gain.exponentialRampToValueAtTime(0.01, time + 0.5)
    oscillators[note].stop(time + 0.5)
    
    delete(oscillators[note])
}

function playNoise(startGain=0.5, bandHz=1000, duration, time) {
    const bufferSize = audioCtx.sampleRate * duration
    const noiseBuffer = new AudioBuffer({
        length: bufferSize,
        sampleRate: audioCtx.sampleRate,
    })
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = new AudioBufferSourceNode(audioCtx, {
        buffer: noiseBuffer,
    })
    const bandpass = new BiquadFilterNode(audioCtx, {
        type: "bandpass",
        frequency: bandHz,
    })
    const gain = new GainNode(audioCtx)
    gain.gain.value = startGain
    gain.gain.exponentialRampToValueAtTime(0.01, time, duration)
    noise.connect(bandpass).connect(gain).connect(audioCtx.destination)
    noise.start()
    noise.stop(time + duration)
}

function victory(time) {
    canvas.classList = "victory"
    victoryDialog.showModal()
}

function gameOver(time) {
    playing = false

    cannonSprites.forEach(cannonSprite => {
        let explosionSprite = cannonSprite.explose()
        explosionSprites.push(explosionSprite)
        explosionSprite.play().then(() => explosionSprites.remove(explosionSprite))
    })
    playNoise(0.7, 400, 2, time)

    Tone.Transport.clear(updateTaskId)
    Tone.Transport.scheduleOnce((time) => {
        Tone.Transport.stop(time)
    }, time + 0.1)
    gameOverDialog.showModal()
}

victoryDialog.onclose = gameOverDialog.onclose = function() {
    document.location = ""
}