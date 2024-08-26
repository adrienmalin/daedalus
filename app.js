const MAX_LEVEL = 3
const DRAW_PERIOD = 0.04 // s
const UPDATE_PERIOD = 0.01 // s
const FLOOR = 400 // px
const FIRST_NOTE = 48 // C2
const LAST_NOTE = 73 // C4
const FREQUENCIES = [
    // C     C♯ / D♭  D        D♯ / E♭  E        F        F♯ / G♭  G        G♯ / A♭  A     A♯ / B♭  B
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
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"]


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
                } else {
                    this.onanimationend()
                }
            }
        }
    }

    onanimationend () {}

    draw() {
        canvasCtx.drawImage(
            this.sprite,
            this.sx + this.frame * this.sWidth,
            this.sy,
            this.sWidth,
            this.sHeight,
            this.dx,
            this.dy,
            this.dWidth,
            this.dHeight
        )

        this.animate()
    }
}


class Cannon extends Sprite {
    constructor(canvasCtx, note) {
        let sharp = [1, 3, 6, 8, 10].includes(note % 12)
        super(canvasCtx, "cannon.png", 34 * (note - FIRST_NOTE) + 66, sharp? 422:426, 11, 26, 4)
        this.note = note
        this.key = keyMap[note - FIRST_NOTE].toUpperCase()
        this.impactHeight = 9
        this.impactY = 0
        this.sy = sharp? 0 : this.sHeight
        this.shooting = false
        this.df = 1
        this.pipeSprite = new Sprite(canvasCtx, "pipe.png", this.x-1, this.y+36, 16, 18)
    }

    draw() {
        if (this.shooting) {
            this.frame += this.df
            if (this.frame >= this.frames) this.df = -1
            else if (this.frame <= 2) this.df = 1
        } else {
            if (this.frame > 0) this.frame--
        }
        this.pipeSprite.draw()
        this.canvasCtx.fillStyle = "#d3d6cf"
        this.canvasCtx.fillText(this.key, this.pipeSprite.x+2, this.pipeSprite.y+10)
        this.canvasCtx.fillStyle = "#222327"
        this.canvasCtx.fillText(this.key, this.pipeSprite.x, this.pipeSprite.y+8)
        super.draw()
        if (this.frame) {
            this.canvasCtx.drawImage(this.sprite, this.sWidth*(this.frame), 0, this.sWidth, 1, this.dx, this.impactY, 22, this.dy - this.impactY)
            if (this.impactY) this.canvasCtx.drawImage(this.sprite, this.sWidth*(this.frame), 2*this.sHeight, this.sWidth, this.impactHeight, this.dx, this.impactY, this.dWidth, 2*this.impactHeight)
        }
    }
}


class Note extends Sprite {
    constructor(canvasCtx, note, duration, velocity, sx, sy, width, height, frames, shotAnimationPeriod) {
        super(canvasCtx, "note.png", 34 * (note - FIRST_NOTE) + 66, -40, width, height, frames, 1)
        this.note = note
        this.duration = duration
        this.velocity = velocity
        this.sx = sx
        this.sy = sy
        this.shotAnimationPeriod = shotAnimationPeriod
        this.shot = false
        this.time = 0
    }

    animate() {
        this.frame = Math.floor(this.time/10) % this.frames
        this.time++
    }

    draw() {
        if (this.shot) {
            this.drawShot()
        } else {
            super.draw()
        }
    }

    drawShot() {
        canvasCtx.drawImage(this.sprite, 0, 0, this.sWidth, this.sHeight, this.dx, this.dy, this.dWidth, this.dHeight)
    }

    explose() {
        return new Sprite(this.canvasCtx, "tiny-explosion.png", this.x, this.y, 16, 16, 7)
    }

    playNoise() {
        playNoise(0.3, 0.4, 1400)
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
        canvasCtx.drawImage(this.sprite, 0, 34, 35, 67, this.dx, this.dy, 35, 67)
    }

    explose() {
        return new Sprite(this.canvasCtx, "little-explosion.png", this.x, this.y, 33, 33, 5)
    }

    playNoise() {
        playNoise(0.5, 0.5, 1000)
    }
}

class Whole extends Note {
    constructor(canvasCtx, note, duration, velocity) {
        super(canvasCtx, note, duration, velocity, 36, 99, 36, 40, 1)
    }

    animate() {}

    drawShot() {
        canvasCtx.drawImage(this.sprite, 0, this.sy, this.sWidth, this.sHeight, this.dx, this.dy, this.dWidth, this.dHeight)
    }

    explose() {
        return new Sprite(canvasCtx, "big-explosion.png", this.x, this.y, 48, 48, 8)
    }

    playNoise() {
        playNoise(0.8, 0.7, 400)
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

let consoleSprite =  new Sprite(canvasCtx, "console.png", canvas.width/2, 554, 482, 86)
let syntheSprite = new Sprite(canvasCtx, "synthe.png", canvas.width/2, 546, 110, 80)
let cannonSprites = []
for (let note=FIRST_NOTE; note<LAST_NOTE; note++) cannonSprites[note] = new Cannon(canvasCtx, note)

window.onload = function() {
    startDialog.showModal()
    //window.setInterval(draw, 60)
}

let audioCtx
let volume
let wave
let mod
let depth
let compressor
let oscillators = {}
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
    Tone.Transport.scheduleRepeat(update, UPDATE_PERIOD)

    showSettings()
}
startDialog.onclose = init

function draw() {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height)

    consoleSprite.draw()
    cannonSprites.forEach(cannonSprite => cannonSprite.draw())
    noteSprites.forEach(noteSprite => noteSprite.draw())
    syntheSprite.draw()
    explosionSprites.forEach(explosionSprite => explosionSprite.draw())
}

function showSettings() {
    pause()
    settingsDialog.showModal()
}
window.onblur = showSettings

function pause() {
    Tone.Transport.pause()
    //window.clearInterval(updateTaskId)
    playing = false
}

settingsButton.onclick = showSettings

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
midiSelect.onfocus = function() {
    midiIputs = {}
    midiSelect.innerHTML = `<option value="">Aucun</option>`
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
            }
        },
        error => {
            console.log(error)
        }
    )
}

var midiKeyboard = ""
midiSelect.oninput = () => {
    for (const id in midiIputs) midiIputs[id].onmidimessage = null
    midiKeyboard = midiSelect.value
    if (midiKeyboard) {
        midiIputs[midiKeyboard].onmidimessage = onMIDIMessage
    }
    keyMapInput.onchange()
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

function onMIDIMessage(event) {
    let [code, note, velocity] = event.data

    if (144 <= code && code <= 159 && cannonSprites[note]) {
        //playNote(note, velocity / 128)
        cannonSprites[note].shooting = true
    } else if (128 <= code && code <= 143 && cannonSprites[note]) {
        //stopNote(note)
        cannonSprites[note].shooting = false
    }
}

settingsDialog.onclose = newGame

let level
function newGame() {
    settingsDialog.onclose = resume
    level = 0
    nextLevel()
}

let midiSong
let noteSprites = []
let explosionSprites = []
let speed
async function nextLevel() {
    level++
    midiSong = await Midi.fromUrl(`midi/${level}.mid`)
    levelTitle.innerText = `Niveau ${level}`
    songNameTitle.innerText = midiSong.name
    speed = 0.04 * FLOOR / midiSong.header.tempos[0].bpm
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
            Tone.Transport.scheduleOnce(time => noteSprites.push(noteSprite), note.time)
        })        
    })
    Tone.Transport.scheduleOnce(time => nextLevel, midiSong.duration)

    levelDialog.showModal()
}

levelDialog.onclose = resume

let updateTaskId
function resume() {
    playing = true
    Tone.Transport.start()
}

function update() {
    noteSprites.forEach(noteSprite => {
        noteSprite.y += speed
    })
    noteSprites.filter(noteSprite => noteSprite.y >= FLOOR).forEach(noteSprite => {
        stopNote(noteSprite.note)
        let explosionSprite = noteSprite.explose()
        explosionSprites.push(explosionSprite)
        explosionSprite.play().then(() => explosionSprites.remove(explosionSprite))
        noteSprite.playNoise()
    })
    noteSprites = noteSprites.filter(note => note.y < FLOOR)

    /*cannonSprites.forEach(cannonSprite => {
        let noteSprite = noteSprites.find(noteSprite => noteSprite.note == cannonSprite.note)
        if (noteSprite) {
            noteSprite.shot = cannonSprite.shooting
            if (noteSprite.shot) {
                
                noteSprite.duration -= UPDATE_PERIOD
                if (noteSprite.duration > 0) {
                    playNote(cannonSprite.note)
                    cannonSprite.impactY = noteSprite.y
                } else {
                    stopNote(cannonSprite.note)
                    let explosionSprite = noteSprite.explose()
                    explosionSprites.push(explosionSprite)
                    explosionSprite.play().then(() => explosionSprites.remove(explosionSprite))
                    noteSprites.remove(noteSprite)
                }
            } else {
                stopNote(cannonSprite.note)
            }
        } else {
            stopNote(cannonSprite.note)
            cannonSprite.impactY = 0
        }
    })*/
    cannonSprites.filter(cannonSprite => cannonSprite.shooting).forEach(cannonSprite => {
        let noteSprite = noteSprites.find(noteSprite => noteSprite.note == cannonSprite.note)
        if (noteSprite) {
            playNote(noteSprite.note, noteSprite.velocity, noteSprite.duration)
            noteSprite.shot = true
            window.setTimeout(() => {
                noteSprites.remove(noteSprite)
                let explosionSprite = noteSprite.explose()
                explosionSprites.push(explosionSprite)
                explosionSprite.play().then(() => explosionSprites.remove(explosionSprite))
            }, noteSprite.duration * 1000)
        }
    })
}

function playNote(note, velocity=0.7, duration=0) {
    if(oscillators[note]) return

    var oscillator = audioCtx.createOscillator()
    oscillator.frequency.value = FREQUENCIES[note]
    oscillator.setPeriodicWave(wave)

    oscillator.velocity = audioCtx.createGain()
    oscillator.velocity.gain.value = 0
    oscillator.velocity.gain.linearRampToValueAtTime(velocity, audioCtx.currentTime + 0.05)
    oscillator.connect(oscillator.velocity)
    oscillator.start()
    oscillator.velocity.connect(volume)

    depth.connect(oscillator.detune)

    if (duration) {
        oscillator.velocity.gain.setValueCurveAtTime([velocity, velocity/10, velocity/20, 0], audioCtx.currentTime + duration, 0.5)
        oscillator.stop(audioCtx.currentTime + duration + 0.6)
    } else {
        oscillators[note] = oscillator
    }
}

function stopNote(note, delay=0) {
    if(!oscillators[note]) return

    velocity = oscillators[note].velocity.gain.value
    oscillators[note].velocity.gain.setValueCurveAtTime([velocity, velocity/10, velocity/20, 0], audioCtx.currentTime + delay + 0.1, 0.5)
    oscillators[note].stop(audioCtx.currentTime + delay + 0.6)
    
    delete(oscillators[note])
}

function playNoise(noiseDuration, startGain=0.5, bandHz=1000) {
    const bufferSize = audioCtx.sampleRate * noiseDuration
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
    gain.gain.setValueCurveAtTime([startGain, startGain/5, 0], audioCtx.currentTime, noiseDuration)
    noise.connect(bandpass).connect(gain).connect(audioCtx.destination)
    noise.start()
    noise.stop(audioCtx.currentTime + noiseDuration)
}

document.onkeydown = function(event) {
    if (playing && keyMap.includes(event.key)) {
        event.preventDefault()
        let note = FIRST_NOTE + keyMap.indexOf(event.key)
        cannonSprites[note].shooting = true
    }
}

document.onkeyup = function(event) {
    if (playing && keyMap.includes(event.key)) {
        event.preventDefault()
        let note = FIRST_NOTE + keyMap.indexOf(event.key)
        cannonSprites[note].shooting = false
    }
}