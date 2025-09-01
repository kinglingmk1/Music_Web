let count = 1;
let imageFetchAbortController = null;
let currentImageRequestId = 0;
let audio;
(async () => {
    audio = new Audio(await getnowplaying(count));
})();
//const jsonData = `{"songs": [{"fileNo": 1,"musicName": "忘れてやらない","backgroundRGB": "f6b31a"},{"fileNo": 2,"musicName": "ひとりぼっち東京","backgroundRGB": "150625"},{"fileNo": 3,"musicName": "UNITE","backgroundRGB": "949494"}]}`;
//const data = JSON.parse(jsonData);
//const data = jsonData; //old json data
let data;
let doOnce = true;
let lrcData = [];
var volume = 50;
let volumeBar = document.getElementById('volume-bar');
let checkline = 0;
let lovedStatus = false;
let fetchLrc = true;
let response = null;
let text = null;
let lines = null;
let windowsonLoad = true;
let lrcCache = {};
let errTimeout = 0;
let isChangingSong = false;

const timeout = location.hostname === "anime.kinglingmk1.com" ? 500 : 50;
const timeout_lrc = location.hostname === "anime.kinglingmk1.com" ? 500 : 50;

//"fileNo": 1,"musicName": "月並みに輝け","backgroundRGB": "020001" -> [1,"月並みに輝け","020001"]
//forloop read and input
const imageType = ['jpg', 'png', 'gif', 'jpeg', 'webp', 'jfif'];
window.onload = function() {
    let button1 = document.getElementById('loved-list');
    button1.style.display = 'hidden';
}

async function getnowplaying(inCount) {
    const musicPath = "music/" + inCount;
    for (const ext of ['flac', 'wma', 'mp3', 'm4a']) {
        const fullPath = `${musicPath}.${ext}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(fullPath, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) {
                return fullPath;
            }
        } catch (error) {
            // 凸（^▽^）凸
        }
    }
    return `${musicPath}.flac`;
}
async function getnowimg() {
    let metaOg = document.querySelector('meta[property="og:image"]');
    if (!metaOg) {
        metaOg = document.createElement('meta');
        metaOg.setAttribute('property', 'og:image');
        document.head.appendChild(metaOg);
    }
    const imgPath = "img/" + count;
    const requestId = ++currentImageRequestId;
    // Abort previous fetches
    if (imageFetchAbortController) {
        imageFetchAbortController.abort();
    }
    imageFetchAbortController = new AbortController();
    for (const ext of imageType) {
        const fullPath = `${imgPath}.${ext}`;
        try {
            const timeoutId = setTimeout(() => imageFetchAbortController.abort(), timeout);
            const response = await fetch(fullPath, { method: 'HEAD', signal: imageFetchAbortController.signal });
            clearTimeout(timeoutId);
            if (response.ok) {
                if (requestId === currentImageRequestId) {
                    metaOg.setAttribute('content', `https://anime.kinglingmk1.com/video/music/${fullPath}`);
                }
                return fullPath;
            }
        } catch (error) {
            // fetch aborted or failed
        }
    }
    if (requestId === currentImageRequestId) {
        metaOg.setAttribute('content', `https://anime.kinglingmk1.com/video/music/${imgPath}.jpg`);
    }
    return `${imgPath}.jpg`;
}
//song progress bar
function updatePlaytime() {
    const playtimeElement = document.getElementById('playtime');
    if (!audio) return;
    audio.addEventListener('timeupdate', async () => {
        if (!audio || !(audio instanceof Audio) || audio.currentTime == null || isNaN(audio.currentTime)) return;
        const currentTime = audio.currentTime;
        const minutes = Math.floor(currentTime / 60);
        const seconds = Math.floor(currentTime % 60);
        //const milliseconds = Math.floor((currentTime % 1) * 1000); //Too late
        playtimeElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        await loadlrc();
        createLrcElement(minutes + ':'+`${seconds < 10 ? '0' : ''}${seconds}`, lrcData);
    });
}
async function changeBackground(num) {
    let metaOg = document.querySelector('meta[property="og:image"]');
    if (!metaOg) {
        metaOg = document.createElement('meta');
        metaOg.setAttribute('property', 'og:image');
        document.head.appendChild(metaOg);
    }
    const bgPathBase = `background/${num}`;
    for (const ext of imageType) {
        const fullPath = `${bgPathBase}.${ext}`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(fullPath, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) {
                let bgImg = document.getElementById('background-img-blur');
                if (!bgImg) {
                    bgImg = document.createElement('img');
                    bgImg.id = 'background-img-blur';
                    bgImg.style.position = 'fixed';
                    bgImg.style.top = '0';
                    bgImg.style.left = '0';
                    bgImg.style.width = '100vw';
                    bgImg.style.height = '100vh';
                    bgImg.style.objectFit = 'cover';
                    bgImg.style.zIndex = '-1';
                    bgImg.style.filter = 'blur(16px) brightness(0.4) grayscale(0.2)';
                    bgImg.style.pointerEvents = 'none';
                    document.body.appendChild(bgImg);
                }
                bgImg.src = fullPath;
                document.body.style.backgroundImage = '';
                document.body.style.filter = '';
                metaOg.setAttribute('content', `https://local.kinglingmk1.com/video/music/${fullPath}`);
                return fullPath;
            }
        } catch (error) {
            // ignore error
            continue;
        }
    }
    // fallback
    let fallbackPath = await getnowimg();
    let bgImg = document.getElementById('background-img-blur');
    if (bgImg) {
        bgImg.src = fallbackPath;
    }
    metaOg.setAttribute('content', `https://anime.kinglingmk1.com/video/music/${fallbackPath}`);
    return fallbackPath;
}
//song change image and song
async function songChange() {
    const imgElement = document.getElementById('background-image');
    const musicNameElement = document.getElementById('music-name');
    const lovedSongButton = document.getElementById('loved-song-btn');
    errTimeout = 0;
    imgElement.classList.add('hidden');
    fetchLrc = true;
    text = null;
    lines = null;
    document.getElementById('lrc').textContent = '';
    await changeBackground(count);
    if(doOnce) {
    data.songs.forEach((song) => {
        //create a button for each song
        const button = document.createElement('button');
        button.textContent = song.musicName;
        button.classList.add('song-button');
        //each button same color as the song background color
        button.style.backgroundColor = `#${song.backgroundRGB}`;
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.padding = '10px 20px';
        button.style.margin = '5px';
        button.style.cursor = 'pointer';
        button.style.borderRadius = '5px';
        button.style.fontSize = '16px';
        button.style.fontWeight = 'bold';
        button.style.transition = 'background-color 0.3s ease';
        button.style.width = '100%';
        button.style.boxSizing = 'border-box';
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = `#${song.backgroundRGB}88`;
        });
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = `#${song.backgroundRGB}`;
        });
        button.addEventListener('click', async () => {
            if (isChangingSong) return;
            isChangingSong = true;
            if (audio) audio.pause();
            count = song.fileNo;
            try {
                await songChange();
            } finally {
                isChangingSong = false;
            }
            pauseButton = document.getElementById('pauseBtn');
            playButton = document.getElementById('playBtn');
            pauseButton.style.display = 'block';
            playButton.style.display = 'none';
        });
        const songList = document.getElementById('song-list');
        songList.appendChild(button);

        lovedData.songs.forEach((lovedSong) => {
            const lovedButton = document.createElement('button');
            lovedButton.textContent = lovedSong.name;
            lovedButton.classList.add('loved-song-button');
            lovedButton.style.backgroundColor = `#${lovedSong.backgroundRGB}`;
            lovedButton.style.color = 'white';
            lovedButton.style.border = 'none';
            lovedButton.style.padding = '10px 20px';
            lovedButton.style.margin = '5px';
            lovedButton.style.cursor = 'pointer';
            lovedButton.style.borderRadius = '5px';
            lovedButton.style.fontSize = '16px';
            lovedButton.style.fontWeight = 'bold';
            lovedButton.style.transition = 'background-color 0.3s ease';
            lovedButton.style.width = '100%';
            lovedButton.style.boxSizing = 'border-box';
            lovedButton.addEventListener('mouseover', () => {
                lovedButton.style.backgroundColor = `#${lovedSong.backgroundRGB}88`;
            });
            lovedButton.addEventListener('mouseout', () => {
                lovedButton.style.backgroundColor = `#${lovedSong.backgroundRGB}`;
            });
            lovedButton.addEventListener('click', () => {
                (async () => {
                    if (isChangingSong) return;
                    isChangingSong = true;
                    if (audio) audio.pause();
                    count = lovedSong.fileNo;
                    try {
                        await songChange();
                    } finally {
                        isChangingSong = false;
                    }
                    pauseButton = document.getElementById('pauseBtn');
                    playButton = document.getElementById('playBtn');
                    pauseButton.style.display = 'block';
                    playButton.style.display = 'none';
                })();
            });
            const lovedList = document.getElementById('loved-list');
            lovedList.appendChild(lovedButton);
            lovedList.style.display = 'none';
        });

        volumeBar = document.getElementById('volume-bar');
        volumeBar.value = volume;
    });
    doOnce = false;
    }
    if(lovedStatus == false) {
        const song = data.songs[count - 1];
        imgElement.onload = () => { imgElement.classList.remove('hidden'); };
        imgElement.onerror = () => {
            imgElement.src = 'img/1.jpg'; // fallback image, make sure this exists
            imgElement.classList.remove('hidden');
        };
        imgElement.src = await getnowimg();
        musicNameElement.textContent = song.musicName;
        document.body.style.backgroundColor = `#${song.backgroundRGB}`;
        lovedSongButton.style.backgroundColor = `#${song.backgroundRGB}`;
        audio.pause();
        audio = null;
        audio = new Audio(await getnowplaying(count));
        audio.volume = volumeBar.value / 100;
        updatePlaytime();
        audio.addEventListener('ended', () => { nextsong(); });
        audio.addEventListener('timeupdate', updateProgressBar);
        const progressBar = document.getElementById('progress-bar');
        progressBar.addEventListener('input', (event) => { setProgress(event.target.value); });
        pauseButton = document.getElementById('pauseBtn');
        playButton = document.getElementById('playBtn');
        pauseButton.style.display = 'block';
        playButton.style.display = 'none';
        audio.play().catch(error => {
            if (windowsonLoad) {
                windowsonLoad = false;
            } else {
                if (error.name !== 'AbortError') {
                    console.error('Error playing audio:', error);
                    pause();
                }
            }
        });
        renderline();
    } else {
        const lovedSong = lovedData.songs.find(song => song.fileNo === count);
        imgElement.onload = () => { imgElement.classList.remove('hidden'); };
        imgElement.src = await getnowimg();
        musicNameElement.textContent = lovedSong.musicName;
        document.body.style.backgroundColor = `#${lovedSong.backgroundRGB}`;
        lovedSongButton.style.backgroundColor = `#${lovedSong.backgroundRGB}`;
        //audio.pause();
        audio = null;
        audio = new Audio(await getnowplaying(count));
        audio.volume = volumeBar.value / 100;
        updatePlaytime();
        audio.addEventListener('ended', () => { nextsong(); });
        audio.addEventListener('timeupdate', updateProgressBar);
        const progressBar = document.getElementById('progress-bar');
        progressBar.addEventListener('input', (event) => { setProgress(event.target.value); });
        pauseButton = document.getElementById('pauseBtn');
        playButton = document.getElementById('playBtn');
        pauseButton.style.display = 'block';
        playButton.style.display = 'none';
        audio.play().catch(error => {
            if (windowsonLoad) {
                windowsonLoad = false;
            } else {
                if (error.name !== 'AbortError') {
                    console.error('Error playing audio:', error);
                    //pause();
                }
            }
        });
        renderline();
    }
    //check if data.json song in loved.json then change the love image
    //check now count is in lovedDate
    if (lovedData.songs.some(song => song.fileNo === count)) {
        const heartButton = document.querySelector('.smallbtn[alt="Heart"]');
        heartButton.classList.add('loved');
        heartButton.src = 'button/heart_on.png';
    } else {
        const heartButton = document.querySelector('.smallbtn[alt="Heart"]');
        heartButton.classList.remove('loved');
        heartButton.src = 'button/heart_off.png';
    }
}
document.addEventListener('DOMContentLoaded', async () => {
    const pauseButton = document.getElementById('pauseBtn');
    pauseButton.style.display = 'none';
    try {
        const response = await fetch('data.json');
        const responseLove = await fetch('loved.json');
        data = await response.json();
        lovedData = await responseLove.json();
        await loadlrc();
        await songChange();
        updatePlaytime();
    } catch (error) {
        console.error('Error loading data:', error);
    }
});
var start = false;
function play() {
    pauseButton = document.getElementById('pauseBtn');
    playButton = document.getElementById('playBtn');
    pauseButton.style.display = 'block';
    playButton.style.display = 'none';
    try {
        audio.play();
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error playing audio:', error);
        }
    }
    if (!start) {
        start = true;
        songChange()
    }
}
function pause() {
    pauseButton = document.getElementById('pauseBtn');
    playButton = document.getElementById('playBtn');
    pauseButton.style.display = 'none';
    playButton.style.display = 'block';
    if(audio && typeof audio.pause === 'function'){
        audio.pause();
    }
}
let loveCount = 0;
function backsong() {
    if (lovedStatus == false) {
        if (count > 1) {
            count--;
            document.getElementsByClassName('song-button')[count - 1].click();
        } else {
            count = data.songs.length;
            document.getElementsByClassName('song-button')[count - 1].click();
        }
        pauseButton = document.getElementById('pauseBtn');
        playButton = document.getElementById('playBtn');
        pauseButton.style.display = 'block';
        playButton.style.display = 'none';
    } else {
        let fileNoArray = lovedData.songs.map(song => song.fileNo);
        let lovedNameArray = lovedData.songs.map(song => song.musicName);
        let currentIndex = lovedNameArray.findIndex(name => document.getElementById('music-name').textContent === name);
        if (currentIndex === -1) {
            count = fileNoArray[fileNoArray.length - 1];
            loveCount = fileNoArray.length - 1;
        } else {
            let prevIndex = (currentIndex - 1 + fileNoArray.length) % fileNoArray.length;
            count = fileNoArray[prevIndex];
            loveCount = prevIndex;
        }
        document.getElementsByClassName('loved-song-button')[loveCount].click();
        pauseButton = document.getElementById('pauseBtn');
        playButton = document.getElementById('playBtn');
        pauseButton.style.display = 'block';
        playButton.style.display = 'none';
    }
}

function nextsong() {
    if(lovedStatus == false){
        if (count < data.songs.length) {
            count++;
            document.getElementsByClassName('song-button')[count-1].click();
            pauseButton = document.getElementById('pauseBtn');
            playButton = document.getElementById('playBtn');
            pauseButton.style.display = 'block';
            playButton.style.display = 'none';
        } else {
            count = 1;
            document.getElementsByClassName('song-button')[count-1].click();
            pauseButton = document.getElementById('pauseBtn');
            playButton = document.getElementById('playBtn');
            pauseButton.style.display = 'block';
            playButton.style.display = 'none';
        }
    } else {
        let fileNoArray = lovedData.songs.map(song => song.fileNo);
        let lovedNameArray = lovedData.songs.map(song => song.musicName);
        let currentIndex = lovedNameArray.findIndex(name => document.getElementById('music-name').textContent === name);
        if (currentIndex === -1) {
            count = fileNoArray[0];
        } else {
            let nextIndex = (currentIndex + 1) % fileNoArray.length;
            count = fileNoArray[nextIndex];
        }
        loveCount++;
        if(loveCount >= document.getElementsByClassName('loved-song-button').length) {
            loveCount = 0;
        }
            document.getElementsByClassName('loved-song-button')[loveCount].click();
            pauseButton = document.getElementById('pauseBtn');
            playButton = document.getElementById('playBtn');
            pauseButton.style.display = 'block';
            playButton.style.display = 'none';
        
    }
}
function setProgress(value) {
    if (!audio) return;
    const duration = audio.duration;
    if (!isNaN(duration)) {
        audio.currentTime = (value / 100) * duration;
    }
}
function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (audio && audio.currentTime != null) {
        const currentTime = audio.currentTime;
        const duration = audio.duration;
        if (!isNaN(duration)) {
            progressBar.value = (currentTime / duration) * 100;
        }
    }
}
async function loadlrc() {
    lrcData = [];
    let lrcPath = 'lrc/' + count + '.lrc';
    if (lrcCache[lrcPath] || errTimeout > 10) {
        lrcData = lrcCache[lrcPath];
        return;
    }
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout_lrc);
        const response = await fetch(lrcPath, { signal: controller.signal });
        clearTimeout(timeoutId);
        const text = await response.text();
        const lines = text.split('\n');
        lrcData = lines;
        lrcCache[lrcPath] = lines;
    } catch (error) {
        //console.error('NO ERROR');
        errTimeout++;
    }
}
function love() {
    const heartButton = document.querySelector('.smallbtn[alt="Heart"]');
    heartButton.classList.toggle('loved');
    let lovedssSong = {
        fileNo: data.songs[count - 1].fileNo,
        musicName: data.songs[count - 1].musicName,
        backgroundRGB: data.songs[count - 1].backgroundRGB
    };
    if (heartButton.classList.contains('loved')) {
        heartButton.src = 'button/heart_on.png';
        saveLovedSong(lovedssSong);
    } else {
        heartButton.classList.toggle('non-loved');
        heartButton.src = 'button/heart_off.png';
        removeLovedSong(lovedssSong.fileNo);
    }
}

async function saveLovedSong(lovedssSong) {
    await fetch('http://127.0.0.1:3000/api/loved-songs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(lovedssSong)
    });
    // Reload lovedData and update loved song list in HTML
    const responseLove = await fetch('loved.json');
    lovedData = await responseLove.json();
    updateLovedSongList();
}

async function removeLovedSong(fileNo) {
    await fetch('http://127.0.0.1:3000/api/loved-songs', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileNo })
    });
    // Reload lovedData and update loved song list in HTML
    const responseLove = await fetch('loved.json');
    lovedData = await responseLove.json();
    updateLovedSongList();
}

// Helper to update loved song list in HTML
function updateLovedSongList() {
    const lovedListContainer = document.getElementById('loved-list');
    if (!lovedListContainer) return;
    lovedListContainer.innerHTML = '';
    (lovedData.songs || []).forEach((lovedSong) => {
        const lovedButton = document.createElement('button');
        lovedButton.textContent = lovedSong.musicName;
        lovedButton.classList.add('loved-song-button');
        lovedButton.style.backgroundColor = `#${lovedSong.backgroundRGB}`;
        lovedButton.style.color = 'white';
        lovedButton.style.border = 'none';
        lovedButton.style.padding = '10px 20px';
        lovedButton.style.margin = '5px';
        lovedButton.style.cursor = 'pointer';
        lovedButton.style.borderRadius = '5px';
        lovedButton.style.fontSize = lovedButton.textContent.length > 10 ? '14px' : '16px';
        lovedButton.style.fontWeight = 'bold';
        lovedButton.style.transition = 'background-color 0.3s ease';
        lovedButton.style.width = '100%';
        lovedButton.style.boxSizing = 'border-box';
        lovedButton.addEventListener('mouseover', () => {
            lovedButton.style.backgroundColor = `#${lovedSong.backgroundRGB}88`;
        });
        lovedButton.addEventListener('mouseout', () => {
            lovedButton.style.backgroundColor = `#${lovedSong.backgroundRGB}`;
        });
        lovedButton.addEventListener('click', () => {
            if (isChangingSong) return;
                isChangingSong = true;
                audio.pause();
                count = lovedSong.fileNo;
                songChange().then(() => {
                    isChangingSong = false;
                });
            pauseButton = document.getElementById('pauseBtn');
            playButton = document.getElementById('playBtn');
            pauseButton.style.display = 'block';
            playButton.style.display = 'none';
        });
        lovedListContainer.appendChild(lovedButton);
    });
}

function showLovedSong() {
    const lovedSongButton = document.getElementById('loved-song-btn');
    const normalList = document.getElementsByClassName('songChangeButton');
    const lovedList = document.getElementsByClassName('lovedSongChangeButton');
    if (lovedSongButton.textContent.includes("Loved Song")) {
        const imgElement = document.getElementById('background-image');
        const musicNameElement = document.getElementById('music-name');
        const lovedSongButton = document.getElementById('loved-song-btn');
        lovedStatus = true;
        document.getElementById('lrc').textContent = '';
        count = lovedData.songs[0].fileNo;
        changeBackground(count);
        document.getElementById('background-image').src = `img/${lovedData.songs[0].fileNo}.jpg`;
        document.getElementById('music-name').textContent = lovedData.songs[0].musicName;
        document.body.style.backgroundColor = `#${lovedData.songs[0].backgroundRGB}`;
        document.getElementsByClassName('loved-song-button')[0].click();
        //audio.play();
        lovedSongButton.innerText = 'Back';
        for (let i = 0; i < normalList.length; i++) {
            normalList[i].style.display = 'none';
        }
        for (let i = 0; i < lovedList.length; i++) {
            lovedList[i].style.display = 'block';
        }
        // Populate lovedList from localStorage
        let lovedSongs = lovedData.songs || [];
        const lovedListContainer = document.getElementById('loved-list');
        lovedListContainer.innerHTML = '';
        lovedSongs.forEach((lovedSong) => {
            const lovedButton = document.createElement('button');
            lovedButton.textContent = lovedSong.musicName;
            lovedButton.classList.add('loved-song-button');
            lovedButton.style.backgroundColor = `#${lovedSong.backgroundRGB}`;
            lovedButton.style.color = 'white';
            lovedButton.style.border = 'none';
            lovedButton.style.padding = '10px 20px';
            lovedButton.style.margin = '5px';
            lovedButton.style.cursor = 'pointer';
            lovedButton.style.borderRadius = '5px';
            //if text longer then 10 characters
            if (lovedButton.textContent.length > 10) {
                lovedButton.style.fontSize = '14px';
            } else {
                lovedButton.style.fontSize = '16px';
            }
            lovedButton.style.fontWeight = 'bold';
            lovedButton.style.transition = 'background-color 0.3s ease';
            lovedButton.style.width = '100%';
            lovedButton.style.boxSizing = 'border-box';
            lovedButton.addEventListener('mouseover', () => {
                lovedButton.style.backgroundColor = `#${lovedSong.backgroundRGB}88`;
            });
            lovedButton.addEventListener('mouseout', () => {
                lovedButton.style.backgroundColor = `#${lovedSong.backgroundRGB}`;
            });
            lovedButton.addEventListener('click', () => {
                if (isChangingSong) return;
                isChangingSong = true;
                audio.pause();
                count = lovedSong.fileNo;
                songChange().then(() => {
                    isChangingSong = false;
                });
                pauseButton = document.getElementById('pauseBtn');
                playButton = document.getElementById('playBtn');
                pauseButton.style.display = 'block';
                playButton.style.display = 'none';
            });
            lovedListContainer.appendChild(lovedButton);
        });
    } else {
        lovedStatus = false;
        document.getElementById('lrc').textContent = '';
        count = data.songs[0].fileNo;
        changeBackground(count);
        document.getElementById('background-image').src = `img/${data.songs[0].fileNo}.jpg`;
        document.getElementById('music-name').textContent = data.songs[0].musicName;
        document.body.style.backgroundColor = `#${data.songs[0].backgroundRGB}`;
        audio.pause();
        //button click first song-button class
        document.getElementsByClassName('song-button')[0].click();
        lovedSongButton.innerText = 'Loved Song';
        for (let i = 0; i < normalList.length; i++) {
            normalList[i].style.display = 'block';
        }
        for (let i = 0; i < lovedList.length; i++) {
            lovedList[i].style.display = 'none';
        }
    }
    if (lovedData.songs.some(song => song.fileNo === count)) {
        const heartButton = document.querySelector('.smallbtn[alt="Heart"]');
        heartButton.classList.add('loved');
        heartButton.src = 'button/heart_on.png';
    } else {
        const heartButton = document.querySelector('.smallbtn[alt="Heart"]');
        heartButton.classList.remove('loved');
        heartButton.src = 'button/heart_off.png';
    }
}
function createLrcElement(time, text) {
    if (!text || text.length === 0) {
        //console.error('LRC data is empty or undefined.');
        return;
    }
    if (checkline === time) {
        return;
    }
    const lrctr = document.createElement('tr');
    const lrcp = document.createElement('p');
    text.forEach((line) => {
        if (line.includes(time) && time !== checkline) {
            checkline = time;
            lrcp.textContent = line.split(']')[1];
            lrcp.style.textAlign = 'center';
            lrcp.style.fontSize = '20px';
            lrcp.style.fontWeight = 'bold';
            lrcp.style.color = 'white';
            lrcp.style.textShadow = '2px 2px 4px black';
            lrcp.style.margin = '0px';
            lrcp.style.padding = '0px';
            const lrcElement = document.getElementById('lrc');
            lrcElement.insertBefore(lrctr, lrcElement.firstChild);
            lrctr.appendChild(lrcp);
        }
    });  
}
function setVolume(value) {
    volume = value / 100;
    audio.volume = volume;
}

function renderline() {
    //Source: @nfj525 in CodePen
    var context = new AudioContext();
    var src = context.createMediaElementSource(audio);
    var analyser = context.createAnalyser();
    var canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var ctx = canvas.getContext("2d");
    src.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 256;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);
    var barWidth = (window.innerWidth / bufferLength) * 0.3;
    function renderFrame() {
        requestAnimationFrame(renderFrame);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        var x = 0;
        for (var i = 0; i < bufferLength; i++) {
            var barHeight = dataArray[i]*2.3
            // Get background color from current song
            let bgColor = lovedStatus
                ? lovedData.songs.find(song => song.fileNo === count)?.backgroundRGB
                : data.songs[count - 1]?.backgroundRGB;
            if (!bgColor) bgColor = "ffffff";
            var r = parseInt(bgColor.substring(0,2), 16);
            var g = parseInt(bgColor.substring(2,4), 16);
            var b = parseInt(bgColor.substring(4,6), 16);
            var a = 0.5;
            // If background is near dark, use white bars
            var brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness < 80) {
                ctx.fillStyle = "rgba(255,255,255,0.5)";
            } else {
                ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + a + ")";
            }

            ctx.fillRect(x, window.innerHeight - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    renderFrame();
}

function scrollUp(event) {
    event.preventDefault();
    let list;
    if (document.querySelector(".songChangeButton").style.display === "none") {
        list = document.querySelector(".lovedSongChangeButton");
    } else {
        list = document.querySelector(".songChangeButton");
    }
    list.scrollBy({ top: -300, behavior: 'smooth' });
}

function scrollDown(event) {
    event.preventDefault();
    let list;
    if (document.querySelector(".songChangeButton").style.display === "none") {
        list = document.querySelector(".lovedSongChangeButton");
    } else {
        list = document.querySelector(".songChangeButton");
    }
    list.scrollBy({ top: 300, behavior: 'smooth' });
}

