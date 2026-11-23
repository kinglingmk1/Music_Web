let songs = [];
let lovedSongNames = new Set();
let currentSongIndex = 0;
let randomStatus = false;
let replayStatus = false;
let isShowingLovedOnly = false;

const audio = new Audio();
let audioContext = null;
let analyser = null;
let sourceNode = null;
let animationFrameId = null;
let currentThemeColor = 'FFFFFF';
const FALLBACK_COLOR = 'FFFFFF';

let lyricTimeline = [];
let lyricCursor = 0;
let lastLyricSecond = -1;
let lyricLoadId = 0;

// Device detection (moved from inline script)
function isPhoneDevice() {
    const ua = navigator.userAgent || '';
    const phoneUaPattern = /Android.*Mobile|iPhone|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini/i;
    const isPhoneUa = phoneUaPattern.test(ua);
    const isNarrowViewport = window.matchMedia('(max-width: 900px)').matches;
    return isPhoneUa && isNarrowViewport;
}

function applyPhoneClass() {
    document.documentElement.classList.toggle('phone-ui', isPhoneDevice());
}

// --- Helper functions ---
function rgbToHex(r, g, b) {
    return [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function shouldUseDarkText(hexColor) {
    const r = parseInt(hexColor.slice(0, 2), 16);
    const g = parseInt(hexColor.slice(2, 4), 16);
    const b = parseInt(hexColor.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness >= 220;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

async function getTopLeftPixelColorHex(imageUrl) {
    if (!imageUrl) return FALLBACK_COLOR;
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = 1;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(image, 0, 0, 1, 1, 0, 0, 1, 1);
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                resolve(rgbToHex(r, g, b));
            } catch (error) {
                resolve(FALLBACK_COLOR);
            }
        };
        image.onerror = () => resolve(FALLBACK_COLOR);
        image.src = imageUrl;
    });
}

function resolveMediaUrl(url) {
    try {
        return new URL(url, window.location.href).href;
    } catch (error) {
        console.warn('媒體網址無法解析：', error);
        return url;
    }
}
// --- Local library initialization ---
const AUDIO_EXTENSIONS = /\.(mp3|flac|ogg|wav|m4a)$/i;
const IMAGE_EXTENSIONS = ['jpg', 'png', 'jpeg', 'webp', 'gif'];
const LOVED_STORAGE_KEY = 'music-player-loved-songs';
let storageWarningShown = false;
let libraryDirectoryHandle = null;
let libraryManifest = null;

function parseLibraryManifest(value) {
    if (!value || !Array.isArray(value.songs)) {
        throw new Error('data.json must contain a songs array.');
    }
    return {
        version: 1,
        songs: value.songs.map((entry, index) => {
            if (!entry || typeof entry.name !== 'string' || typeof entry.audio !== 'string') {
                throw new Error(`Invalid song entry at data.json index ${index}.`);
            }
            const metadata = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
            return {
                name: entry.name,
                audio: entry.audio,
                cover: typeof entry.cover === 'string' ? entry.cover : null,
                lrc: typeof entry.lrc === 'string' ? entry.lrc : null,
                background: typeof entry.background === 'string' ? entry.background : null,
                metadata: {
                    title: metadata.title || entry.name,
                    artist: metadata.artist || '',
                    album: metadata.album || '',
                    track: metadata.track ?? null
                }
            };
        })
    };
}

function encodeMediaPath(path) {
    return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

function mediaPathWithoutExtension(path) {
    const slashIndex = path.lastIndexOf('/');
    const dotIndex = path.lastIndexOf('.');
    return dotIndex > slashIndex ? path.slice(0, dotIndex) : path;
}

function splitLibraryPath(path) {
    if (typeof path !== 'string' || path.startsWith('/') || path.startsWith('\\') || /^[a-z]:/i.test(path)) {
        throw new Error(`Invalid relative library path: ${path}`);
    }
    const parts = path.replace(/\\/g, '/').split('/');
    if (parts.some(part => !part || part === '.' || part === '..')) {
        throw new Error(`Invalid relative library path: ${path}`);
    }
    return parts;
}

async function readDirectoryFile(directoryHandle, relativePath) {
    const parts = splitLibraryPath(relativePath);
    let directory = directoryHandle;
    for (const part of parts.slice(0, -1)) {
        directory = await directory.getDirectoryHandle(part);
    }
    const fileHandle = await directory.getFileHandle(parts[parts.length - 1]);
    return fileHandle.getFile();
}

async function readOptionalDirectoryFile(directoryHandle, relativePath) {
    if (!relativePath) return null;
    try {
        return await readDirectoryFile(directoryHandle, relativePath);
    } catch (error) {
        if (error.name === 'NotFoundError') return null;
        throw error;
    }
}

async function writeDirectoryFile(directoryHandle, relativePath, contents) {
    const parts = splitLibraryPath(relativePath);
    let directory = directoryHandle;
    for (const part of parts.slice(0, -1)) {
        directory = await directory.getDirectoryHandle(part, { create: true });
    }
    const fileHandle = await directory.getFileHandle(parts[parts.length - 1], { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
}

async function readManifestFromDirectory(directoryHandle) {
    const file = await readOptionalDirectoryFile(directoryHandle, 'data.json');
    if (!file) return parseLibraryManifest({ version: 1, songs: [] });
    return parseLibraryManifest(JSON.parse(await file.text()));
}

async function readManifestFromPage() {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error(`data.json request failed: ${response.status}`);
    return parseLibraryManifest(await response.json());
}

function createEmbeddedCover(tags) {
    if (!tags.picture?.data) return null;
    return new Blob([Uint8Array.from(tags.picture.data)], {
        type: tags.picture.format || 'image/jpeg'
    });
}

function metadataWithTags(entry, tags) {
    return {
        title: tags.title || entry.metadata.title || entry.name,
        artist: tags.artist || entry.metadata.artist || '',
        album: tags.album || entry.metadata.album || '',
        track: tags.track ?? entry.metadata.track ?? null
    };
}

async function findDirectoryCover(directoryHandle, entry) {
    const listedCover = await readOptionalDirectoryFile(directoryHandle, entry.cover);
    if (listedCover) return listedCover;
    for (const folder of ['cover', 'covers']) {
        for (const extension of IMAGE_EXTENSIONS) {
            const file = await readOptionalDirectoryFile(directoryHandle, `${folder}/${entry.name}.${extension}`);
            if (file) return file;
        }
    }
    return null;
}

function findSelectedLibraryFile(files, relativePath) {
    if (!relativePath) return null;
    return files.find(file => {
        const parts = filePath(file).split('/');
        const pathWithinRoot = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
        return pathWithinRoot === relativePath;
    }) || null;
}

async function createSongsFromSelectedFiles(manifest, files) {
    return sortLocalSongs(await Promise.all(manifest.songs.map(async entry => {
        const audioFile = findSelectedLibraryFile(files, entry.audio);
        if (!audioFile) throw new Error(`data.json references a missing audio file: ${entry.audio}`);
        let coverFile = findSelectedLibraryFile(files, entry.cover);
        if (!coverFile) {
            for (const folder of ['cover', 'covers']) {
                for (const extension of IMAGE_EXTENSIONS) {
                    coverFile = findSelectedLibraryFile(files, `${folder}/${entry.name}.${extension}`);
                    if (coverFile) break;
                }
                if (coverFile) break;
            }
        }
        const lrcFile = findSelectedLibraryFile(files, entry.lrc) || findLocalAsset(files, `${entry.name}.lrc`, ['lrc']);
        const backgroundFile = findSelectedLibraryFile(files, entry.background) || IMAGE_EXTENSIONS
            .map(extension => findLocalAsset(files, `${entry.name}.${extension}`, ['background']))
            .find(Boolean);
        const tags = await readMediaTags(audioFile);
        const embeddedCover = createEmbeddedCover(tags);
        const cover = coverFile || embeddedCover;
        return {
            ...entry,
            audioPath: entry.audio,
            coverPath: entry.cover,
            lrcPath: entry.lrc,
            audio: createObjectUrl(audioFile),
            cover: cover ? createObjectUrl(cover) : null,
            background: backgroundFile ? createObjectUrl(backgroundFile) : null,
            lrcText: lrcFile ? await lrcFile.text() : '',
            metadata: metadataWithTags(entry, tags)
        };
    })));
}

async function createSongsFromManifest(manifest, directoryHandle = null) {
    return sortLocalSongs(await Promise.all(manifest.songs.map(async entry => {
        if (directoryHandle) {
            const audioFile = await readDirectoryFile(directoryHandle, entry.audio);
            const coverFile = await findDirectoryCover(directoryHandle, entry);
            const lrcFile = await readOptionalDirectoryFile(directoryHandle, entry.lrc);
            const backgroundFile = await readOptionalDirectoryFile(directoryHandle, entry.background);
            const tags = await readMediaTags(audioFile);
            const embeddedCover = createEmbeddedCover(tags);
            return {
                ...entry,
                audioPath: entry.audio,
                coverPath: entry.cover,
                lrcPath: entry.lrc,
                audio: createObjectUrl(audioFile),
                cover: coverFile ? createObjectUrl(coverFile) : (embeddedCover ? createObjectUrl(embeddedCover) : null),
                background: backgroundFile ? createObjectUrl(backgroundFile) : null,
                lrcText: lrcFile ? await lrcFile.text() : '',
                metadata: metadataWithTags(entry, tags)
            };
        }
        const audioUrl = encodeMediaPath(entry.audio);
        const coverBase = entry.cover ? mediaPathWithoutExtension(entry.cover) : `cover/${entry.name}`;
        return {
            ...entry,
            audioPath: entry.audio,
            coverPath: entry.cover,
            lrcPath: entry.lrc,
            audio: audioUrl,
            cover: entry.cover ? encodeMediaPath(entry.cover) : null,
            coverBase: encodeMediaPath(coverBase),
            background: entry.background ? encodeMediaPath(entry.background) : null,
            lrcUrl: entry.lrc ? encodeMediaPath(entry.lrc) : null,
            metadata: entry.metadata
        };
    })));
}
async function readLovedSongs(files = [], directoryHandle = null) {
    let lovedFile = files.find(file => file.name.toLowerCase() === 'loved.json' && filePath(file).split('/').length === 2) || null;
    let savedSongs = [];
    if (directoryHandle) lovedFile = await readOptionalDirectoryFile(directoryHandle, 'loved.json');

    if (lovedFile) {
        try {
            savedSongs = JSON.parse(await lovedFile.text());
        } catch (error) {
            console.warn('本機 loved.json 無法讀取，改用瀏覽器已儲存的清單。', error);
        }
    } else if (files.length === 0 && !directoryHandle) {
        try {
            const response = await fetch('loved.json');
            if (!response.ok) throw new Error(`loved.json request failed: ${response.status}`);
            savedSongs = await response.json();
        } catch (error) {
            console.warn('無法直接讀取 loved.json，改用瀏覽器已儲存的清單。', error);
        }
    }

    if (!directoryHandle) {
        try {
            const stored = localStorage.getItem(LOVED_STORAGE_KEY);
            if (stored !== null) savedSongs = JSON.parse(stored);
        } catch (error) {
            warnStorageUnavailable(error);
        }
    }

    return Array.isArray(savedSongs) ? savedSongs.filter(name => typeof name === 'string') : [];
}
async function saveLovedSongs() {
    const names = Array.from(lovedSongNames);
    try {
        localStorage.setItem(LOVED_STORAGE_KEY, JSON.stringify(names));
    } catch (error) {
        warnStorageUnavailable(error);
    }
    if (!libraryDirectoryHandle) {
        if (typeof window.showDirectoryPicker !== "function") {
            alert("喜愛清單已保存在此瀏覽器，但目前瀏覽器不支援更新本機 loved.json。\nUnable to update loved.json because this browser does not support the File System Access API.");
            return;
        }
        try {
            const directoryHandle = await chooseLibraryDirectory("請選擇要儲存 loved.json 的音樂庫資料夾。\nPlease select the library folder to save loved.json.");
            libraryManifest = await readManifestFromDirectory(directoryHandle);
            libraryDirectoryHandle = directoryHandle;
        } catch (error) {
            if (error.name === "AbortError") {
                alert("喜愛清單已保存在此瀏覽器，但未更新 loved.json。\nUnable to update loved.json because the folder selection was cancelled.");
                return;
            }
            console.error("連結音樂庫資料夾失敗：", error);
            alert(`無法選擇音樂庫資料夾：${error.message}\n Unable to choose library folder because of: ${error.message}`);
            return;
        }
    }
    try {
        await writeDirectoryFile(libraryDirectoryHandle, "loved.json", JSON.stringify(names, null, 2));
    } catch (error) {
        console.error("無法儲存 loved.json：", error);
        alert(`無法儲存喜愛清單：${error.message}\nUnable to save loved.json because of: ${error.message}`);
    }
}
function warnStorageUnavailable(error) {
    if (storageWarningShown) return;
    storageWarningShown = true;
    console.warn('瀏覽器無法儲存喜愛清單；本次開啟期間仍可使用。', error);
}

async function initializePlayer() {
    attachAudioEvents();
    attachControlEventListeners();
    setPlaybackButtons(false);
    document.getElementById('loved-list').style.display = 'none';
    setVolume(document.getElementById('volume-bar')?.value || 50);

    if (document.fonts) {
        try {
            await document.fonts.load('700 16px "Noto Sans JP"');
            await document.fonts.ready;
        } catch (error) {
            console.warn('本機字型載入失敗，將使用後備字型。', error);
        }
    }

    try {
        await activateLibrary(await readManifestFromPage());
    } catch (error) {
        console.warn('無法直接讀取 data.json，請選擇本機音樂庫資料夾。', error);
        document.getElementById('music-name').innerHTML = '請選擇音樂庫資料夾讀取 data.json<br>Please select the music library folder to load data.json</b>';
        document.getElementById('music-artist').style.display = 'none';
    }
}

async function activateLibrary(manifest, directoryHandle = null, selectedFiles = null) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    releaseAllSongUrls();
    resetLyricsState();
    libraryManifest = manifest;
    libraryDirectoryHandle = directoryHandle;
    songs = selectedFiles
        ? await createSongsFromSelectedFiles(manifest, selectedFiles)
        : await createSongsFromManifest(manifest, directoryHandle);
    lovedSongNames = new Set(await readLovedSongs(selectedFiles || [], directoryHandle));
    if (!songs.length) {
        document.getElementById('music-name').innerHTML = 'data.json 中沒有歌曲<br>No songs found in data.json';
        renderSongList();
        return;
    }
    const libraryButton = document.getElementById('loadFolderBtn');
    if (directoryHandle) {
        libraryButton.textContent = `已連結音樂庫（${songs.length} 首）`;
        libraryButton.style.display = '';
    } else {
        libraryButton.style.display = 'none';
    }
    await loadSongByIndex(0, false);
}
function attachControlEventListeners() {
    // Progress bar
    document.getElementById('progress-bar')?.addEventListener('input', (e) => {
        setProgress(parseFloat(e.target.value));
    });

    // Volume bar
    document.getElementById('volume-bar')?.addEventListener('input', (e) => {
        setVolume(parseFloat(e.target.value));
    });

    // Control buttons
    document.getElementById('prevBtn')?.addEventListener('click', () => backsong());
    
    // Play/Pause toggle button
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                play();
            } else {
                pause();
            }
        });
    }
    
    document.getElementById('nextBtn')?.addEventListener('click', () => nextsong());
    document.getElementById('heartBtn')?.addEventListener('click', () => love());
    document.getElementById('listBtn')?.addEventListener('click', () => showLovedSong());
    document.getElementById('randomBtn')?.addEventListener('click', () => randomOnOff());
    document.getElementById('replayBtn')?.addEventListener('click', () => replayOnOff());
    document.getElementById('addSongBtn')?.addEventListener('click', () => addSong());
    document.getElementById('addFolderBtn')?.addEventListener('click', () => loadLocalFolder());
    document.getElementById('loadFolderBtn')?.addEventListener('click', () => loadLocalFolder());

    // Scroll buttons
    document.getElementById('up-button')?.addEventListener('click', (e) => scrollUp(e));
    document.getElementById('down-button')?.addEventListener('click', (e) => scrollDown(e));
}

function updateSongMetadata(song) {
    const coverImage = getConverImage(song.name);
    const absoluteCoverUrl = resolveMediaUrl(coverImage);
    const pageTitle = getDisplayName(song);

    document.title = pageTitle;

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', absoluteCoverUrl);

    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) twitterImage.setAttribute('content', absoluteCoverUrl);
}

// --- Metadata display helpers ---
function getDisplayName(song) {
    if (!song.metadata) return song.name;
    const title = song.metadata.title || '';
    const artist = song.metadata.artist || '';
    if (title && artist) return `${title} - ${artist}`;
    if (title) return title;
    return song.name;
}

function getTitleOnly(song) {
    if (!song.metadata) return song.name;
    const title = song.metadata.title || '';
    return title || song.name;
}

function getArtistOnly(song) {
    if (!song.metadata) return '';
    return song.metadata.artist || '';
}

function getSongNameForLookup(song) {
    return song.name;
}

// --- Playback control and rendering ---
async function loadSongByIndex(index, autoplay = false) {
    if (index < 0 || index >= songs.length) return;

    currentSongIndex = index;
    const song = songs[index];

    audio.pause();
    audio.src = song.audio;
    audio.load();
    setPlaybackButtons(false);
    resetLyricsState();

    const title = getTitleOnly(song);
    const artist = getArtistOnly(song);
    document.getElementById('music-name').textContent = title;
    const artistElement = document.getElementById('music-artist');
    if (artistElement) {
        artistElement.textContent = artist;
        artistElement.style.display = artist ? 'block' : 'none';
    }
    updateSongMetadata(song);
    const coverImages = getCoverImageCandidates(song);
    setImageSource(document.getElementById('background-image'), coverImages);
    ensureBackground(song.background ? [song.background, ...coverImages] : coverImages, true);

    updateMediaSession();

    if (!song.themeColor) {
        song.themeColor = await getTopLeftPixelColorHex(coverImages[0]);
    }
    currentThemeColor = song.themeColor;
    document.body.style.backgroundColor = `#${currentThemeColor}`;

    updateHeartIcon();
    renderSongList();
    loadSongLyrics(song);

    if (autoplay) play();
}

function getConverImage(songName) {
    const song = songs.find(item => item.name === songName);
    return song?.cover || 'button/empty.png';
}

function getCoverImageCandidates(song) {
    if (!song) return ['button/empty.png'];
    if (song.coverBase) {
        return [...new Set([
            song.cover,
            ...IMAGE_EXTENSIONS.map(extension => `${song.coverBase}.${extension}`),
            'button/empty.png'
        ].filter(Boolean))];
    }
    return [...new Set([song.cover, 'button/empty.png'].filter(Boolean))];
}

function setImageSource(image, sources) {
    const candidates = [...new Set(sources.filter(Boolean))];
    if (!image || !candidates.length) return;
    let sourceIndex = 0;
    let retriedCurrentSource = false;
    image.classList.add('hidden');
    image.onload = () => image.classList.remove('hidden');
    image.onerror = () => {
        const source = candidates[sourceIndex];
        if (!retriedCurrentSource && source.toLowerCase().split('?')[0].endsWith('.png')) {
            retriedCurrentSource = true;
            image.src = `${source}${source.includes('?') ? '&' : '?'}retry=${Date.now()}`;
            return;
        }
        if (sourceIndex + 1 < candidates.length) {
            sourceIndex += 1;
            retriedCurrentSource = false;
            image.src = candidates[sourceIndex];
            return;
        }
        image.classList.remove('hidden');
        console.warn('圖片無法載入：', source);
    };
    image.src = candidates[0];
}
function ensureBackground(imageSources, applyBlur) {
    let bgImage = document.getElementById('background-img-blur');
    if (!bgImage) {
        bgImage = document.createElement('img');
        bgImage.id = 'background-img-blur';
        bgImage.className = 'bg-blur';
        document.body.appendChild(bgImage);
    }
    bgImage.style.filter = applyBlur ? 'blur(16px) brightness(0.4) grayscale(0.2)' : 'none';
    setImageSource(bgImage, imageSources);
}
function getVisibleSongIndexes() {
    return songs
        .map((song, index) => ({ song, index }))
        .filter(({ song }) => !isShowingLovedOnly || lovedSongNames.has(song.name))
        .map(({ index }) => index);
}

function renderSongList() {
    const listElement = isShowingLovedOnly ? document.getElementById('lovedSongChangeButton') : document.getElementById('songChangeButton');
    const hiddenList = isShowingLovedOnly ? document.getElementById('songChangeButton') : document.getElementById('lovedSongChangeButton');

    hiddenList.innerHTML = '';
    listElement.innerHTML = '';

    const visibleIndexes = getVisibleSongIndexes();
    visibleIndexes.forEach(index => {
        const song = songs[index];
        const btn = document.createElement('button');
        const displayName = getTitleOnly(song);
        btn.textContent = displayName;
        btn.className = `song-button playlist-button ${displayName.length > 10 ? 'long-text' : ''}`;
        
        const applyColor = (hexColor) => {
            const isPlaying = (index === currentSongIndex);
            if (isPlaying) {
                btn.style.border = '2px solid rgba(255,255,255,0.95)';
                btn.style.backgroundColor = `#${hexColor}`;
                btn.style.color = shouldUseDarkText(hexColor) ? '#000000' : '#FFFFFF';
            } else {
                btn.style.border = `1px solid #${hexColor}55`;
                btn.style.backgroundColor = `#${hexColor}22`;
                btn.style.color = '#FFFFFF';
            }
        };

        if (song.themeColor) {
            applyColor(song.themeColor);
        } else {
            const coverImage = song.cover || 'button/empty.png';
            getTopLeftPixelColorHex(coverImage).then(color => {
                song.themeColor = color;
                applyColor(color);
            });
        }

        btn.addEventListener('click', () => loadSongByIndex(index, true));
        listElement.appendChild(btn);
    });
}

// --- Player core logic ---
function attachAudioEvents() {
    audio.addEventListener('timeupdate', () => {
        document.getElementById('playtime').textContent = formatTime(audio.currentTime);
        if (audio.duration) {
            document.getElementById('progress-bar').value = (audio.currentTime / audio.duration) * 100;
        }
        updateLyricsForCurrentTime();
    });
    audio.addEventListener('play', () => {
        setPlaybackButtons(true);
        ensureVisualizer();
    });
    audio.addEventListener('pause', () => {
        setPlaybackButtons(false);
    });
    audio.addEventListener('ended', () => replayStatus ? loadSongByIndex(currentSongIndex, true) : nextsong());
}

// --- Media Session API ---
function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;

    const song = songs[currentSongIndex];
    if (!song) return;

    const coverImage = getConverImage(song.name);
    const absoluteCoverUrl = resolveMediaUrl(coverImage);
    const title = getTitleOnly(song);
    const artist = getArtistOnly(song);
    const artwork = absoluteCoverUrl.startsWith('file:') ? [] : [
        { src: absoluteCoverUrl, sizes: '96x96', type: 'image/jpeg' },
        { src: absoluteCoverUrl, sizes: '128x128', type: 'image/jpeg' },
        { src: absoluteCoverUrl, sizes: '192x192', type: 'image/jpeg' },
        { src: absoluteCoverUrl, sizes: '256x256', type: 'image/jpeg' },
        { src: absoluteCoverUrl, sizes: '384x384', type: 'image/jpeg' },
        { src: absoluteCoverUrl, sizes: '512x512', type: 'image/jpeg' }
    ];

    navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: artist || 'Music Player',
        album: (song.metadata && song.metadata.album) || '',
        artwork
    });

    navigator.mediaSession.setActionHandler('play', () => play());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => backsong());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextsong());
}
function setPlaybackButtons(isPlaying) {
    const playbackButton = document.getElementById('playBtn');
    if (!playbackButton) return;

    playbackButton.src = isPlaying ? 'button/pause.png' : 'button/play.png';
    playbackButton.alt = isPlaying ? 'Pause' : 'Play';
}

function play() {
    setPlaybackButtons(true);
    audio.play().catch((error) => {
        setPlaybackButtons(false);
        console.warn(error);
    });
}

function pause() {
    audio.pause();
    setPlaybackButtons(false);
}

function nextsong() {
    const visible = getVisibleSongIndexes();
    if (!visible.length) return;
    
    let nextIndex;
    if (randomStatus && visible.length > 1) {
        do { nextIndex = visible[Math.floor(Math.random() * visible.length)]; } 
        while (nextIndex === currentSongIndex);
    } else {
        const pos = visible.indexOf(currentSongIndex);
        nextIndex = visible[(Math.max(0, pos) + 1) % visible.length];
    }
    loadSongByIndex(nextIndex, true);
}

function backsong() {
    const visible = getVisibleSongIndexes();
    if (!visible.length) return;
    
    let prevIndex;
    if (randomStatus && visible.length > 1) {
        do { prevIndex = visible[Math.floor(Math.random() * visible.length)]; } 
        while (prevIndex === currentSongIndex);
    } else {
        const pos = visible.indexOf(currentSongIndex);
        prevIndex = visible[(Math.max(0, pos) - 1 + visible.length) % visible.length];
    }
    loadSongByIndex(prevIndex, true);
}

function setProgress(val) {
    if (audio.duration) {
        audio.currentTime = (val / 100) * audio.duration;
        updateLyricsForCurrentTime(true);
    }
}

function setVolume(val) { 
    audio.volume = Math.max(0, Math.min(100, val)) / 100; 
}

// --- Local file library ---
const objectUrls = new Set();

function filePath(file) {
    return (file.webkitRelativePath || file.name).replace(/\\/g, '/');
}

function fileStem(file) {
    return file.name.replace(/\.[^.]+$/, '');
}

function findLocalAsset(files, fileName, folderNames) {
    const expectedName = fileName.toLowerCase();
    const inFolder = files.find(file => {
        const parts = filePath(file).split('/').map(part => part.toLowerCase());
        return file.name.toLowerCase() === expectedName && parts.slice(0, -1).some(part => folderNames.includes(part));
    });
    return inFolder || files.find(file => file.name.toLowerCase() === expectedName);
}

function createObjectUrl(file) {
    const url = URL.createObjectURL(file);
    objectUrls.add(url);
    return url;
}

function releaseSongUrls(song) {
    [song.audio, song.cover, song.background].forEach(url => {
        if (url && objectUrls.has(url)) {
            URL.revokeObjectURL(url);
            objectUrls.delete(url);
        }
    });
}

function releaseAllSongUrls() {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls.clear();
}

function readMediaTags(file) {
    if (!window.jsmediatags?.read) return Promise.resolve({});
    return new Promise(resolve => {
        window.jsmediatags.read(file, {
            onSuccess: ({ tags }) => resolve({
                title: tags.title || '',
                artist: tags.artist || '',
                album: tags.album || '',
                track: Number.parseInt(tags.track || '', 10) || null,
                picture: tags.picture || null
            }),
            onError: () => resolve({})
        });
    });
}

function sortLocalSongs(items) {
    const albums = new Map();
    const ungrouped = [];
    items.forEach(song => {
        const album = song.metadata?.album;
        if (album) {
            const key = `${song.metadata.artist || ''}\u0000${album}`.toLowerCase();
            if (!albums.has(key)) albums.set(key, []);
            albums.get(key).push(song);
        } else {
            ungrouped.push(song);
        }
    });
    const grouped = Array.from(albums.values()).sort((a, b) => {
        const artistOrder = (a[0].metadata.artist || '').localeCompare(b[0].metadata.artist || '');
        return artistOrder || a[0].metadata.album.localeCompare(b[0].metadata.album);
    });
    grouped.forEach(group => group.sort((a, b) => (a.metadata.track || 0) - (b.metadata.track || 0)));
    ungrouped.sort((a, b) => (a.metadata?.artist || '').localeCompare(b.metadata?.artist || '') || a.name.localeCompare(b.name));
    return [...grouped.flat(), ...ungrouped];
}

async function createLocalSongs(files) {
    const audioFiles = files.filter(file => AUDIO_EXTENSIONS.test(file.name));
    let coverMap = {};
    const mapFile = files.find(file => file.name === '_map.json' && filePath(file).toLowerCase().includes('/covers/'));
    if (mapFile) {
        try {
            coverMap = JSON.parse(await mapFile.text());
        } catch (error) {
            console.warn('封面索引無法讀取，將改用 cover 資料夾內的圖片。', error);
        }
    }

    return Promise.all(audioFiles.map(async file => {
        const name = fileStem(file);
        const metadata = await readMediaTags(file);
        const coverExtensions = ['.jpg', '.png', '.webp', '.jpeg', '.gif'];
        let coverFile = null;
        for (const extension of coverExtensions) {
            coverFile = findLocalAsset(files, `${name}${extension}`, ['cover', 'covers']);
            if (coverFile) break;
            const deduplicatedName = coverMap[`${name}${extension}`];
            if (deduplicatedName) {
                coverFile = findLocalAsset(files, deduplicatedName, ['covers']);
                if (coverFile) break;
            }
        }

        let embeddedCover = null;
        if (!coverFile && metadata.picture?.data) {
            embeddedCover = new Blob([Uint8Array.from(metadata.picture.data)], {
                type: metadata.picture.format || 'image/jpeg'
            });
        }
        const coverBlob = coverFile || embeddedCover;
        const cover = coverBlob ? createObjectUrl(coverBlob) : null;
        const lrcFile = findLocalAsset(files, `${name}.lrc`, ['lrc']);
        const backgroundFile = coverExtensions
            .map(extension => findLocalAsset(files, `${name}${extension}`, ['background']))
            .find(Boolean);

        return {
            name,
            ext: file.name.slice(file.name.lastIndexOf('.')).toLowerCase(),
            audio: createObjectUrl(file),
            cover,
            coverBlob,
            background: backgroundFile ? createObjectUrl(backgroundFile) : null,
            lrcText: lrcFile ? await lrcFile.text() : '',
            metadata
        };
    }));
}
function getImageExtension(imageFile) {
    const namedExtension = imageFile.name?.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[0];
    if (namedExtension) return namedExtension.toLowerCase();
    const extensionsByType = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif'
    };
    return extensionsByType[imageFile.type] || '.jpg';
}

async function persistImportedSongs(files, importedSongs) {
    if (!libraryDirectoryHandle) throw new Error('請先選擇可寫入的音樂庫資料夾。');
    await libraryDirectoryHandle.getDirectoryHandle('cover', { create: true });
    const entries = [...(libraryManifest?.songs || [])];
    for (const song of importedSongs) {
        const audioFile = files.find(file => file.name === `${song.name}${song.ext}`);
        if (!audioFile) throw new Error(`找不到音訊檔案：${song.name}`);

        const existing = entries.find(entry => entry.name === song.name);
        const lrcFile = findLocalAsset(files, `${song.name}.lrc`, ['lrc']);
        const backgroundFile = ['.jpg', '.png', '.webp', '.jpeg', '.gif']
            .map(extension => findLocalAsset(files, `${song.name}${extension}`, ['background']))
            .find(Boolean);
        const coverFile = song.coverBlob instanceof File ? song.coverBlob : null;
        const audioPath = `Song/${audioFile.name}`;
        let coverPath = existing?.cover || null;
        let lrcPath = existing?.lrc || null;
        let backgroundPath = existing?.background || null;

        await writeDirectoryFile(libraryDirectoryHandle, audioPath, audioFile);
        if (coverFile) {
            coverPath = `cover/${song.name}${getImageExtension(coverFile)}`;
            await writeDirectoryFile(libraryDirectoryHandle, coverPath, coverFile);
        } else if (song.coverBlob) {
            coverPath = `cover/${song.name}${getImageExtension(song.coverBlob)}`;
            await writeDirectoryFile(libraryDirectoryHandle, coverPath, song.coverBlob);
        }
        if (lrcFile) {
            lrcPath = `lrc/${lrcFile.name}`;
            await writeDirectoryFile(libraryDirectoryHandle, lrcPath, lrcFile);
        }
        if (backgroundFile) {
            backgroundPath = `background/${backgroundFile.name}`;
            await writeDirectoryFile(libraryDirectoryHandle, backgroundPath, backgroundFile);
        }

        const metadata = song.metadata || {};
        const entry = {
            name: song.name,
            audio: audioPath,
            cover: coverPath,
            lrc: lrcPath,
            background: backgroundPath,
            metadata: {
                title: metadata.title || song.name,
                artist: metadata.artist || '',
                album: metadata.album || '',
                track: metadata.track ?? null
            }
        };
        const existingIndex = entries.findIndex(item => item.name === song.name);
        if (existingIndex >= 0) entries.splice(existingIndex, 1);
        entries.push(entry);
    }

    const manifest = parseLibraryManifest({ version: 1, songs: entries });
    await writeDirectoryFile(libraryDirectoryHandle, 'data.json', JSON.stringify(manifest, null, 2));
    return manifest;
}
async function addLocalFiles(files, replaceLibrary) {
    if (!files.length) return;
    if (!files.some(file => AUDIO_EXTENSIONS.test(file.name))) {
        alert('找不到支援的音訊檔（MP3、FLAC、OGG、WAV、M4A）。\n Cannot find supported audio files (MP3, FLAC, OGG, WAV, M4A).');
        return;
    }

    if (replaceLibrary) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        releaseAllSongUrls();
        songs = [];
    }
    const importedSongs = await createLocalSongs(files);

    if (replaceLibrary) {
        const loved = await readLovedSongs(files);
        lovedSongNames = new Set(loved);
    }

    for (const song of importedSongs) {
        const duplicateIndex = songs.findIndex(existing => existing.name === song.name);
        if (duplicateIndex >= 0) {
            releaseSongUrls(songs[duplicateIndex]);
            songs.splice(duplicateIndex, 1);
        }
        songs.push(song);
    }
    songs = sortLocalSongs(songs);
    renderSongList();
    const loadedSong = importedSongs[importedSongs.length - 1];
    const loadedIndex = songs.indexOf(loadedSong);
    if (loadedIndex >= 0) await loadSongByIndex(loadedIndex, false);
    document.getElementById('loadFolderBtn').textContent = `已載入 ${songs.length} 首歌曲（重新選擇資料夾）`;
}

async function loadLocalFolder() {
    if (typeof window.showDirectoryPicker === 'function') {
        try {
            const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            const manifest = await readManifestFromDirectory(directoryHandle);
            await activateLibrary(manifest, directoryHandle);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('載入音樂庫資料夾失敗：', error);
            alert(`無法讀取音樂庫：${error.message}\nUnable to load the library because of: ${error.message}`);
        }
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('webkitdirectory', '');
    input.addEventListener('change', async () => {
        try {
            const files = Array.from(input.files || []);
            const manifestFile = files.find(file => file.name === 'data.json' && filePath(file).split('/').length === 2);
            if (manifestFile) {
                const manifest = parseLibraryManifest(JSON.parse(await manifestFile.text()));
                await activateLibrary(manifest, null, files);
            } else {
                await addLocalFiles(files, true);
            }
        } catch (error) {
            console.error('載入本機音樂資料夾失敗：', error);
            alert('無法載入所選資料夾，請確認資料夾中包含可播放的音訊檔。\nUnable to load the selected folder. Please ensure it contains playable audio files.');
        }
    }, { once: true });
    input.click();
}
async function chooseImportFiles(onFiles) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".mp3,.flac,.ogg,.wav,.m4a,.lrc,audio/*";
    fileInput.multiple = true;
    fileInput.addEventListener("change", async () => {
        const files = Array.from(fileInput.files || []);
        if (!files.length) return;
        await onFiles(files);
    }, { once: true });
    fileInput.click();
}
function chooseLibraryDirectory(message = "請選擇要儲存歌曲及更新 data.json 的音樂庫資料夾。<br> Please select the music library folder to save songs and update data.json.") {
    return new Promise((resolve, reject) => {
        const overlay = document.createElement("div");
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            zIndex: "2000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.65)"
        });
        const panel = document.createElement("div");
        Object.assign(panel.style, {
            padding: "24px",
            maxWidth: "360px",
            borderRadius: "8px",
            background: "#222",
            color: "#fff",
            textAlign: "center"
        });
        const messageElement = document.createElement("p");
        messageElement.textContent = message;
        const chooseButton = document.createElement("button");
        chooseButton.type = "button";
        chooseButton.textContent = "選擇音樂庫資料夾<br> Please select the music library folder";
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.textContent = "取消<br> Cancel";
        cancelButton.style.marginLeft = "12px";
        const cleanup = () => overlay.remove();
        chooseButton.addEventListener("click", () => {
            try {
                window.showDirectoryPicker({ mode: "readwrite" })
                    .then(handle => { cleanup(); resolve(handle); })
                    .catch(error => { cleanup(); reject(error); });
            } catch (error) {
                cleanup();
                reject(error);
            }
        }, { once: true });
        cancelButton.addEventListener("click", () => {
            cleanup();
            reject(new DOMException("Directory selection cancelled.", "AbortError"));
        }, { once: true });
        panel.append(messageElement, chooseButton, cancelButton);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        chooseButton.focus();
    });
}
async function addSong() {
    await chooseImportFiles(async (files) => {
        if (!files.some(file => AUDIO_EXTENSIONS.test(file.name))) {
            alert("請選擇支援的音訊檔（MP3、FLAC、OGG、WAV、M4A）。\nPlease select supported audio files (MP3, FLAC, OGG, WAV, M4A).");
            return;
        }
        try {
            if (!libraryDirectoryHandle && typeof window.showDirectoryPicker !== "function") {
                throw new Error("目前瀏覽器不支援選擇可寫入的音樂庫資料夾，無法儲存歌曲。\nUnable to choose a writable library folder because this browser does not support the File System Access API.");
            }
            let destinationHandle = libraryDirectoryHandle;
            if (!destinationHandle) {
                destinationHandle = await chooseLibraryDirectory();
            }
            const importedSongs = await createLocalSongs(files);
            if (destinationHandle !== libraryDirectoryHandle) {
                libraryManifest = await readManifestFromDirectory(destinationHandle);
                libraryDirectoryHandle = destinationHandle;
            }
            const manifest = await persistImportedSongs(files, importedSongs);
            await activateLibrary(manifest, destinationHandle);
            alert("歌曲已儲存到所選音樂庫，data.json 已更新。\nSongs saved to the selected library, data.json updated.");
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("[Music Import] failed:", error);
            alert(`匯入歌曲失敗：${error.message}\nFailed to import songs because of: ${error.message}`);
        }
    });
}
function randomOnOff() {
    randomStatus = !randomStatus;
    document.getElementById('randomBtn').src = randomStatus ? 'button/random_clicked.png' : 'button/random.png';
}

function replayOnOff() {
    replayStatus = !replayStatus;
    document.getElementById('replayBtn').src = replayStatus ? 'button/replay_clicked.png' : 'button/replay.png';
}

// --- Loved list management ---
async function love() {
    const song = songs[currentSongIndex];
    if (!song) return;

    if (lovedSongNames.has(song.name)) {
        lovedSongNames.delete(song.name);
    } else {
        lovedSongNames.add(song.name);
    }

    updateHeartIcon();
    renderSongList();
    await saveLovedSongs();
}
function showLovedSong() {
    isShowingLovedOnly = !isShowingLovedOnly;
    const btn = document.getElementById('loved-song-btn');
    const normalList = document.getElementById('song-list');
    const lovedList = document.getElementById('loved-list');

    if (isShowingLovedOnly) {
        if (lovedSongNames.size === 0) {
            alert('沒有喜愛的歌曲！\nNo loved songs found.');
            isShowingLovedOnly = false;
            return;
        }
        btn.textContent = 'Back';
        normalList.style.display = 'none';
        lovedList.style.display = 'block';
    } else {
        btn.textContent = 'Loved Song';
        normalList.style.display = 'block';
        lovedList.style.display = 'none';
    }
    renderSongList();
}

function updateHeartIcon() {
    const btn = document.getElementById('heartBtn');
    const song = songs[currentSongIndex];
    if (btn && song) {
        btn.src = lovedSongNames.has(song.name) ? 'button/heart_on.png' : 'button/heart_off.png';
    }
}

// --- Lyrics parsing ---
function loadLyrics(text) {
    lyricTimeline = [];
    if (!text) return;

    text.split(/\r?\n/).forEach(line => {
        const timeMatches = Array.from(line.matchAll(/\[(\d+):(\d{2})(?:\.(\d+))?\]/g));
        const lyricText = line.replace(/\[.*?\]/g, '').trim();
        if (timeMatches.length && lyricText) {
            timeMatches.forEach(match => {
                const mins = parseInt(match[1]);
                const secs = parseInt(match[2]);
                const ms = parseInt((match[3] || '0').padEnd(3, '0').slice(0, 3));
                lyricTimeline.push({ time: mins * 60 + secs + (ms / 1000), text: lyricText });
            });
        }
    });
    lyricTimeline.sort((a, b) => a.time - b.time);
}

async function loadSongLyrics(song) {
    const requestId = ++lyricLoadId;
    if (typeof song.lrcText === 'string') {
        loadLyrics(song.lrcText);
        return;
    }
    if (!song.lrcUrl) {
        loadLyrics('');
        return;
    }

    try {
        const response = await fetch(song.lrcUrl);
        if (!response.ok) throw new Error(`LRC request failed: ${response.status}`);
        const text = await response.text();
        if (requestId === lyricLoadId) loadLyrics(text);
    } catch (error) {
        if (requestId === lyricLoadId) loadLyrics('');
        console.warn(`歌詞載入失敗：${song.name}`, error);
    }
}
function resetLyricsState() {
    lyricTimeline = [];
    lyricCursor = 0;
    lastLyricSecond = -1;
    document.getElementById('lrc').innerHTML = '';
}

function updateLyricsForCurrentTime(forceRebuild = false) {
    if (!lyricTimeline.length) return;
    const cTime = audio.currentTime || 0;
    
    if (forceRebuild || cTime < (lyricTimeline[lyricCursor - 1]?.time || 0)) {
        document.getElementById('lrc').innerHTML = '';
        lyricCursor = 0;
    }

    const lrcContainer = document.getElementById('lrc');
    while (lyricCursor < lyricTimeline.length && lyricTimeline[lyricCursor].time <= cTime) {
        const tr = document.createElement('tr');
        const p = document.createElement('p');
        p.className = 'lrc-line';
        p.textContent = lyricTimeline[lyricCursor].text;
        tr.appendChild(p);
        lrcContainer.insertBefore(tr, lrcContainer.firstChild);
        lyricCursor++;
    }
}

// --- Visualizer ---
function ensureVisualizer() {
    const canvas = document.getElementById('canvas');
    if (!canvas || !window.AudioContext) return;

    if (!audioContext) {
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        sourceNode = audioContext.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
    }

    if (audioContext.state === 'suspended') audioContext.resume();
    if (animationFrameId) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
        animationFrameId = requestAnimationFrame(draw);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 0.35;
        let x = 0;

        const r = parseInt(currentThemeColor.slice(0, 2), 16);
        const g = parseInt(currentThemeColor.slice(2, 4), 16);
        const b = parseInt(currentThemeColor.slice(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        ctx.fillStyle = brightness < 80 ? 'rgba(255,255,255,0.45)' : `rgba(${r},${g},${b},0.45)`;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] * 2.1;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    };
    draw();
}

// --- Scroll control ---
function scrollUp(e) {
    e?.preventDefault();
    scrollActiveList(-300);
}

function scrollDown(e) {
    e?.preventDefault();
    scrollActiveList(300);
}

function scrollActiveList(distance) {
    const list = getActiveList();
    if (!list) return;

    const scrollAmount = Math.max(120, Math.round(list.clientHeight * 0.75));
    const amount = distance < 0 ? -scrollAmount : scrollAmount;

    if (typeof list.scrollBy === 'function') {
        list.scrollBy({ top: amount, behavior: 'smooth' });
    } else {
        list.scrollTop += amount;
    }
}

function getActiveList() {
    return isShowingLovedOnly
        ? document.getElementById('loved-list')
        : document.getElementById('song-list');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    applyPhoneClass();
    window.addEventListener('resize', applyPhoneClass, { passive: true });
    window.addEventListener('orientationchange', applyPhoneClass);
    initializePlayer();
});
