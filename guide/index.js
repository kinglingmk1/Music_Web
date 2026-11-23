const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const sections = Array.from(document.querySelectorAll('.guide-section'));
const searchInput = document.getElementById('guide-search');
const languageSelect = document.getElementById('guide-language');

const translations = {
    'zh-TW': {
        languageLabel: '語言', documentationEyebrow: 'MUSIC PLAYER DOCUMENTATION', guideTitle: '使用指南', searchGuide: '搜尋指南',
        navQuick: '快速開始', navFolder: '選擇音樂庫資料夾', navAdd: '新增歌曲',
        navLayout: '資料夾結構', navData: 'data.json 格式', navLrc: 'LRC 歌詞規則',
        navAssets: '封面與背景圖', navLoved: '喜愛清單', navTroubleshooting: '疑難排解',
        backToPlayer: '← 返回音樂播放器', lead: '選擇本機音樂庫、新增歌曲、設定封面與歌詞，並讓播放器自動更新 <code>data.json</code>。',
        quickTitle: '快速開始', quickStep1Title: '選擇資料夾',
        quickStep1Text: '開啟播放器，按下資料夾圖示。',
        quickStep2Title: '選取音樂庫根目錄',
        quickStep2Text: '請選擇包含 <code>data.json</code>、<code>Song</code>、<code>cover</code> 或 <code>lrc</code> 的資料夾。',
        quickStep3Title: '開始播放', quickStep3Text: '載入完成後即可從右側歌曲清單選擇歌曲。',
        supportedBrowser: '支援瀏覽器',
        browserText: '新增或更新本機資料夾需要支援 <strong>File System Access API</strong> 的瀏覽器，例如桌面版 Chromium 系瀏覽器。Wallpaper Engine 請使用 Chromium 版本的網頁。',
        folderTitle: '選擇音樂庫資料夾',
        folderStep1: '開啟播放器頁面 <code>index.html</code>。',
        folderStep2: '按下底部控制列的資料夾圖示。',
        folderStep3: '在檔案選擇視窗中選擇<strong>音樂庫的根資料夾</strong>，不是單獨選取音樂檔案。',
        folderStep4: '確認瀏覽器要求的讀取／寫入權限後，播放器會讀取 <code>data.json</code> 並載入歌曲。',
        figureCaption: '選擇包含音樂庫資源的資料夾，而不是選擇某一首歌曲。',
        addTitle: '新增歌曲',
        addStep1: '按下播放器控制列中的<strong>新增歌曲</strong>圖示（加號圖示）。',
        addStep2: '選擇一首或多首音訊檔。支援：<code>.mp3</code>、<code>.flac</code>、<code>.ogg</code>、<code>.wav</code>、<code>.m4a</code>。',
        addStep3: '如尚未連結資料夾，播放器會要求選擇音樂庫資料夾。',
        addStep4: '確認後，音訊會存入 <code>Song/</code>；內嵌封面會存入 <code>cover/</code>；播放器會自動更新 <code>data.json</code>。',
        lrcNameImportant: '同名規則很重要',
        lrcNameText: '若要使用 LRC，歌詞檔名必須和音樂檔名完全相同。例如音樂是 <code>My Song.mp3</code>，LRC 就必須是 <code>My Song.lrc</code>；副檔名不同，不含副檔名的檔名要一致。',
        layoutTitle: '資料夾結構', layoutIntro: '建議使用下列結構：',
        layoutNote: '<code>cover</code>、<code>lrc</code> 和 <code>background</code> 資料夾可由匯入流程自動建立。',
        dataTitle: 'data.json 格式',
        dataIntro: '<code>data.json</code> 是音樂庫清單。通常由播放器在新增歌曲時自動產生，不需要手動維護。',
        fieldName: '歌曲的唯一識別名稱，應與同名資源的檔名一致。',
        fieldAudio: '音訊檔案相對於音樂庫根目錄的路徑。',
        fieldAssets: '對應資源的相對路徑；沒有該資源可設為 <code>null</code>。',
        fieldMetadata: '標題、演出者、專輯與曲目資訊；播放器可能讀取音訊內嵌標籤。',
        lrcTitle: 'LRC 歌詞規則', lrcFilenameTitle: '檔名必須一致',
        lrcFilenameText: 'LRC 檔名必須與音樂檔名相同（不含副檔名）。例如：',
        lrcPlacement: 'LRC 可放在與音樂檔相同層級，或放在 <code>lrc/</code> 資料夾。當在連結資料夾模式下匯入歌曲時，播放器會尋找與音訊檔名相同的 LRC。',
        lrcFormatText: '時間格式可使用 <code>[mm:ss.xx]</code>，其中分鐘與秒數為數字，小數部分為百分之一秒。',
        assetsTitle: '封面與背景圖', coverTitle: '封面圖',
        coverText: '支援 <code>.jpg</code>、<code>.jpeg</code>、<code>.png</code>、<code>.webp</code>、<code>.gif</code>。建議放置於 <code>cover/</code>，檔名和歌曲名稱一致。',
        backgroundTitle: '背景圖',
        backgroundText: '支援相同格式。建議放置於 <code>background/</code>，檔名和歌曲名稱一致。未設定時播放器會嘗試使用封面。',
        embeddedTitle: '內嵌封面',
        embeddedText: '如果音訊檔內含封面資訊，匯入時可自動擷取並儲存到 <code>cover/</code>。',
        lovedTitle: '喜愛清單',
        lovedText: '按下愛心按鈕可以新增或移除喜愛歌曲。清單會儲存在瀏覽器的本機儲存空間；連結音樂庫資料夾後，也會嘗試將內容寫入根目錄的 <code>loved.json</code>。',
        lovedNote: '<code>loved.json</code> 的項目是歌曲的 <code>name</code>，不是檔案路徑。',
        troubleshootingTitle: '疑難排解',
        faq1Title: '沒有任何歌曲載入',
        faq1Text: '請確認選擇的是包含 <code>data.json</code> 的音樂庫根目錄，以及 <code>data.json</code> 中的 <code>audio</code> 路徑與實際檔案相符。',
        faq2Title: '歌詞沒有顯示',
        faq2Text: '確認副檔名為 <code>.lrc</code>；音樂檔名稱不含副檔名後，必須和 LRC 檔名稱完全相同。也請確認時間標記格式正確。',
        faq3Title: '瀏覽器無法選擇資料夾',
        faq3Text: '請使用支援 File System Access API 的桌面 Chromium瀏覽器。',
        faq4Title: '無法找到新增的歌曲',
        faq4Text: '確認檔案副檔名受支援，再重新選擇資料夾或重新整理頁面。',
        translationNotice: '此指南使用 AI 翻譯，部分內容可能不完全準確。'
    },
    ja: {
        languageLabel:'言語', documentationEyebrow:'MUSIC PLAYER DOCUMENTATION', guideTitle:'使い方ガイド', searchGuide:'ガイドを検索',
        navQuick:'クイックスタート', navFolder:'ライブラリフォルダーを選択', navAdd:'曲を追加',
        navLayout:'フォルダー構成', navData:'data.json の形式', navLrc:'LRC 歌詞ルール',
        navAssets:'カバーと背景画像', navLoved:'お気に入りリスト', navTroubleshooting:'トラブルシューティング',
        backToPlayer:'← 音楽プレーヤーに戻る', lead:'ローカル音楽ライブラリを選択し、曲、カバー、歌詞を追加して、プレーヤーが <code>data.json</code> を自動更新できるようにします。',
        quickTitle:'クイックスタート', quickStep1Title:'フォルダーを選択',
        quickStep1Text:'プレーヤーを開き、フォルダーアイコンを押します。',
        quickStep2Title:'ライブラリのルートフォルダーを選択',
        quickStep2Text:'<code>data.json</code>、<code>Song</code>、<code>cover</code>、<code>lrc</code> を含むフォルダーを選択してください。',
        quickStep3Title:'再生を開始', quickStep3Text:'読み込み後、右側の曲一覧から曲を選択できます。',
        supportedBrowser:'対応ブラウザー', browserText:'フォルダーの追加や更新には、デスクトップ版 Chromium 系ブラウザーなど <strong>File System Access API</strong> に対応したブラウザーが必要です。Wallpaper Engine では Chromium ベースのウェブページを使用してください。',
        folderTitle:'音楽ライブラリフォルダーを選択',
        folderStep1:'プレーヤーページ <code>index.html</code> を開きます。',
        folderStep2:'下部のコントロールバーにあるフォルダーアイコンを押します。',
        folderStep3:'ファイル選択画面で、個別の音楽ファイルではなく、<strong>ライブラリのルートフォルダー</strong>を選択します。',
        folderStep4:'ブラウザーの読み取り／書き込み権限を許可すると、<code>data.json</code> を読み込んで曲を表示します。',
        figureCaption:'個別の曲ではなく、音楽ライブラリのリソースを含むフォルダーを選択してください。',
        addTitle:'曲を追加',
        addStep1:'プレーヤー下部の<strong>曲を追加</strong>アイコン（追加アイコン）を押します。',
        addStep2:'1 曲または複数曲の音声ファイルを選択します。対応形式：<code>.mp3</code>、<code>.flac</code>、<code>.ogg</code>、<code>.wav</code>、<code>.m4a</code>。',
        addStep3:'フォルダーがまだ接続されていない場合、ライブラリフォルダーの選択を求められます。',
        addStep4:'確認後、音声は <code>Song/</code>、埋め込みカバーは <code>cover/</code> に保存され、<code>data.json</code> が更新されます。',
        lrcNameImportant:'ファイル名の一致が重要です',
        lrcNameText:'LRC を使用する場合、歌詞ファイル名は音楽ファイル名と完全に一致する必要があります。例えば音楽が <code>My Song.mp3</code>なら、LRC は <code>My Song.lrc</code>です。拡張子を除いた名前を一致させてください。',
        layoutTitle:'フォルダー構成', layoutIntro:'次のフォルダー構成を推奨します。',
        layoutNote:'<code>cover</code>、<code>lrc</code>、<code>background</code> フォルダーは曲のインポート時に自動作成されます。',
        dataTitle:'data.json の形式', dataIntro:'<code>data.json</code> は音楽ライブラリ一覧です。通常は曲を追加したときプレーヤーが自動生成するため、手動で管理する必要はありません。',
        fieldName:'曲を識別するための一意の名前で、同名リソースのファイル名と一致させます。',
        fieldAudio:'ライブラリのルートフォルダーからの音声ファイルの相対パス。',
        fieldAssets:'対応リソースの相対パス。リソースがない場合は <code>null</code> を指定できます。',
        fieldMetadata:'タイトル、アーティスト、アルバム、トラック番号。プレーヤーは埋め込みタグを読み取る場合があります。',
        lrcTitle:'LRC 歌詞ルール', lrcFilenameTitle:'ファイル名を一致させてください',
        lrcFilenameText:'LRC のファイル名は、拡張子を除いた音楽ファイル名と一致させる必要があります。',
        lrcPlacement:'LRC は音楽ファイルと同じ階層、または <code>lrc/</code> フォルダーに配置できます。ライブラリ接続モードでは、音声ファイルと同名の LRC を検索します。',
        lrcFormatText:'時間は <code>[mm:ss.xx]</code> 形式を使用します。分と秒は数字、小数部分は百分の一秒です。',
        assetsTitle:'カバーと背景画像', coverTitle:'カバー画像',
        coverText:'対応形式：<code>.jpg</code>、<code>.jpeg</code>、<code>.png</code>、<code>.webp</code>、<code>.gif</code>。<code>cover/</code> に配置し、曲名と一致させることを推奨します。',
        backgroundTitle:'背景画像',
        backgroundText:'同じ形式に対応します。曲名と一致する画像を <code>background/</code> に配置します。未設定の場合はカバーを使用します。',
        embeddedTitle:'埋め込みカバー',
        embeddedText:'音声ファイルにカバー情報が含まれる場合、インポート時に取得して <code>cover/</code> に保存できます。',
        lovedTitle:'お気に入りリスト',
        lovedText:'ハートボタンでお気に入りを追加または削除できます。一覧はブラウザーのローカルストレージに保存され、ライブラリ接続時はルートの <code>loved.json</code>にも保存を試みます。',
        lovedNote:'<code>loved.json</code> の項目はファイルパスではなく、曲の <code>name</code>です。',
        troubleshootingTitle:'トラブルシューティング',
        faq1Title:'曲が読み込まれない', faq1Text:'<code>data.json</code> を含むライブラリのルートフォルダーを選択したか、<code>data.json</code> の <code>audio</code> パスが実際のファイルと一致するか確認してください。',
        faq2Title:'歌詞が表示されない', faq2Text:'拡張子が <code>.lrc</code> であること、拡張子を除いた音楽ファイル名と LRC ファイル名が完全に一致することを確認してください。',
        faq3Title:'ブラウザーでフォルダーを選択できない', faq3Text:'File System Access API に対応したデスクトップ版 Chromium 系ブラウザーを使用してください。',
        faq4Title:'追加した曲が見つからない', faq4Text:'ファイル形式が対応形式か確認し、フォルダーを再選択するかページを更新してください。',
        translationNotice:'このガイドは AI 翻訳です。一部の内容は正確でない場合があります。'
    },
    ko: {
        languageLabel:'언어', documentationEyebrow:'MUSIC PLAYER DOCUMENTATION', guideTitle:'사용 가이드', searchGuide:'가이드 검색',
        navQuick:'빠른 시작', navFolder:'음악 라이브러리 폴더 선택', navAdd:'노래 추가',
        navLayout:'폴더 구조', navData:'data.json 형식', navLrc:'LRC 가사 규칙',
        navAssets:'커버 및 배경 이미지', navLoved:'좋아요 목록', navTroubleshooting:'문제 해결',
        backToPlayer:'← 음악 플레이어로 돌아가기', lead:'로컬 음악 라이브러리를 선택하고 노래, 커버, 가사를 추가하여 플레이어가 <code>data.json</code>을 자동으로 업데이트하도록 합니다.',
        quickTitle:'빠른 시작', quickStep1Title:'폴더 선택',
        quickStep1Text:'플레이어를 열고 폴더 아이콘을 누릅니다.',
        quickStep2Title:'라이브러리 루트 폴더 선택',
        quickStep2Text:'<code>data.json</code>, <code>Song</code>, <code>cover</code>, <code>lrc</code>가 포함된 폴더를 선택하세요.',
        quickStep3Title:'재생 시작', quickStep3Text:'로드가 끝나면 오른쪽 노래 목록에서 노래를 선택할 수 있습니다.',
        supportedBrowser:'지원 브라우저', browserText:'폴더를 추가하거나 업데이트하려면 데스크톱 Chromium 계열처럼 <strong>File System Access API</strong>를 지원하는 브라우저가 필요합니다. Wallpaper Engine에서는 Chromium 기반 웹 페이지를 사용하세요.',
        folderTitle:'음악 라이브러리 폴더 선택',
        folderStep1:'플레이어 페이지 <code>index.html</code>을 엽니다.',
        folderStep2:'하단 컨트롤 바의 폴더 아이콘을 누릅니다.',
        folderStep3:'파일 선택 창에서 개별 음악 파일이 아니라 <strong>라이브러리 루트 폴더</strong>를 선택합니다.',
        folderStep4:'브라우저의 읽기／쓰기 권한을 확인하면 <code>data.json</code>을 읽어 노래를 불러옵니다.',
        figureCaption:'개별 노래가 아니라 음악 라이브러리 리소스가 포함된 폴더를 선택하세요.',
        addTitle:'노래 추가',
        addStep1:'플레이어 하단의 <strong>노래 추가</strong> 아이콘（추가 아이콘）을 누릅니다.',
        addStep2:'하나 또는 여러 개의 오디오 파일을 선택합니다. 지원 형식：<code>.mp3</code>、<code>.flac</code>、<code>.ogg</code>、<code>.wav</code>、<code>.m4a</code>。',
        addStep3:'폴더가 아직 연결되지 않았다면 라이브러리 폴더 선택이 표시됩니다.',
        addStep4:'확인 후 오디오는 <code>Song/</code>에 저장되고, 내장 커버는 <code>cover/</code>에 저장되며 <code>data.json</code>이 업데이트됩니다.',
        lrcNameImportant:'파일 이름 일치가 중요합니다',
        lrcNameText:'LRC를 사용하려면 가사 파일 이름이 음악 파일 이름과 완전히 같아야 합니다. 예를 들어 음악이 <code>My Song.mp3</code>라면 LRC는 <code>My Song.lrc</code>여야 합니다.',
        layoutTitle:'폴더 구조', layoutIntro:'다음 폴더 구조를 권장합니다.',
        layoutNote:'<code>cover</code>, <code>lrc</code>, <code>background</code> 폴더는 노래 가져오기 과정에서 자동 생성될 수 있습니다.',
        dataTitle:'data.json 형식', dataIntro:'<code>data.json</code>은 음악 라이브러리 목록입니다. 일반적으로 노래를 추가할 때 플레이어가 자동 생성하므로 직접 관리할 필요가 없습니다.',
        fieldName:'노래의 고유 식별 이름이며, 같은 이름의 리소스 파일명과 일치해야 합니다.',
        fieldAudio:'라이브러리 루트 폴더를 기준으로 한 오디오 파일의 상대 경로입니다.',
        fieldAssets:'리소스의 상대 경로입니다. 리소스가 없으면 <code>null</code>을 사용할 수 있습니다.',
        fieldMetadata:'제목, 아티스트, 앨범, 트랙 정보이며 내장 태그를 읽을 수도 있습니다.',
        lrcTitle:'LRC 가사 규칙', lrcFilenameTitle:'파일 이름이 일치해야 합니다',
        lrcFilenameText:'LRC 파일 이름은 확장자를 제외한 음악 파일 이름과 같아야 합니다.',
        lrcPlacement:'LRC는 음악 파일과 같은 위치 또는 <code>lrc/</code> 폴더에 둘 수 있습니다. 라이브러리 연결 모드에서는 같은 이름의 LRC를 찾습니다.',
        lrcFormatText:'시간 형식은 <code>[mm:ss.xx]</code>를 사용하며, 분과 초는 숫자이고 소수는 1/100초를 의미합니다.',
        assetsTitle:'커버 및 배경 이미지', coverTitle:'커버 이미지',
        coverText:'지원 형식：<code>.jpg</code>、<code>.jpeg</code>、<code>.png</code>、<code>.webp</code>、<code>.gif</code>。<code>cover/</code>에 두고 노래 이름과 일치시키는 것을 권장합니다。',
        backgroundTitle:'배경 이미지',
        backgroundText:'같은 형식을 지원합니다. 노래 이름과 같은 파일을 <code>background/</code>에 두세요. 설정하지 않으면 커버를 사용합니다.',
        embeddedTitle:'내장 커버',
        embeddedText:'오디오 파일에 커버 정보가 포함되어 있으면 가져오기 중 <code>cover/</code>에 저장할 수 있습니다.',
        lovedTitle:'좋아요 목록',
        lovedText:'하트 버튼으로 좋아요를 추가하거나 제거할 수 있습니다. 목록은 브라우저 로컬 저장소에 저장되며 라이브러리 연결 후 루트의 <code>loved.json</code>에도 저장을 시도합니다.',
        lovedNote:'<code>loved.json</code> 항목은 파일 경로가 아니라 노래의 <code>name</code>입니다.',
        troubleshootingTitle:'문제 해결',
        faq1Title:'노래가 불러와지지 않음', faq1Text:'<code>data.json</code>이 포함된 라이브러리 루트 폴더를 선택했는지, <code>data.json</code>의 <code>audio</code> 경로가 실제 파일과 일치하는지 확인하세요.',
        faq2Title:'가사가 표시되지 않음', faq2Text:'확장자가 <code>.lrc</code>인지, 확장자를 제외한 음악 파일 이름과 LRC 파일 이름이 완전히 일치하는지 확인하세요.',
        faq3Title:'브라우저에서 폴더를 선택할 수 없음', faq3Text:'File System Access API를 지원하는 데스크톱 Chromium 계열 브라우저를 사용하세요.',
        faq4Title:'추가한 노래를 찾을 수 없음', faq4Text:'지원되는 파일 형식인지 확인한 뒤 폴더를 다시 선택하거나 페이지를 새로 고침하세요.',
        translationNotice:'이 가이드의 번역은 AI가 수행했으며 일부 내용이 정확하지 않을 수 있습니다.'
    },
    en: {
        languageLabel:'Language', documentationEyebrow:'MUSIC PLAYER DOCUMENTATION', guideTitle:'User Guide', searchGuide:'Search guide',
        navQuick:'Quick Start', navFolder:'Select Library Folder', navAdd:'Add Songs',
        navLayout:'Folder Structure', navData:'data.json Format', navLrc:'LRC Lyrics Rules',
        navAssets:'Covers and Background', navLoved:'Loved Songs', navTroubleshooting:'Troubleshooting',
        backToPlayer:'← Back to Music Player', lead:'Select a local music library, add songs, covers, and lyrics, and let the player update <code>data.json</code> automatically.',
        quickTitle:'Quick Start', quickStep1Title:'Select a Folder',
        quickStep1Text:'Open the player and click the folder icon.',
        quickStep2Title:'Select the Library Root',
        quickStep2Text:'Choose a folder containing <code>data.json</code>, <code>Song</code>, <code>cover</code>, and <code>lrc</code> resources.',
        quickStep3Title:'Start Playing', quickStep3Text:'After loading, select a song from the song list on the right.',
        supportedBrowser:'Supported Browsers', browserText:'Adding or updating library folders requires a browser that supports the <strong>File System Access API</strong>, such as a desktop Chromium-based browser. Use a Chromium-based web page in Wallpaper Engine.',
        folderTitle:'Select a Music Library Folder',
        folderStep1:'Open the player page <code>index.html</code>.',
        folderStep2:'Click the folder icon in the bottom control bar.',
        folderStep3:'In the file picker, select the <strong>library root folder</strong>, not individual music files.',
        folderStep4:'After granting read/write permission, the player reads <code>data.json</code> and loads the songs.',
        figureCaption:'Select the folder containing library resources, not a single song.',
        addTitle:'Add Songs',
        addStep1:'Click the <strong>Add Song</strong> icon (plus icon) in the player controls.',
        addStep2:'Select one or more audio files. Supported: <code>.mp3</code>, <code>.flac</code>, <code>.ogg</code>, <code>.wav</code>, <code>.m4a</code>.',
        addStep3:'If no folder is connected yet, the player asks you to select a library folder.',
        addStep4:'The audio is saved in <code>Song/</code>, embedded artwork in <code>cover/</code>, and <code>data.json</code> is updated.',
        lrcNameImportant:'Matching filenames are required',
        lrcNameText:'To use an LRC file, its filename must exactly match the music filename. For example, <code>My Song.mp3</code> requires <code>My Song.lrc</code>. Compare filenames without their extensions.',
        layoutTitle:'Folder Structure', layoutIntro:'Recommended structure:',
        layoutNote:'The <code>cover</code>, <code>lrc</code>, and <code>background</code> folders can be created automatically during import.',
        dataTitle:'data.json Format', dataIntro:'<code>data.json</code> is the music library list. The player usually generates it automatically when songs are added, so manual editing is normally unnecessary.',
        fieldName:'A unique song identifier that should match the filename of resources for the same song.',
        fieldAudio:'Relative path to the audio file from the library root.',
        fieldAssets:'Relative path to a resource. Use <code>null</code> when it is unavailable.',
        fieldMetadata:'Title, artist, album, and track information. The player may read embedded audio tags.',
        lrcTitle:'LRC Lyrics Rules', lrcFilenameTitle:'Filenames must match',
        lrcFilenameText:'The LRC filename must match the music filename without the file extension.',
        lrcPlacement:'Place the LRC beside the audio file or in <code>lrc/</code>. In library-folder mode, the player looks for an LRC with the same name as the audio.',
        lrcFormatText:'Use the <code>[mm:ss.xx]</code> timestamp format, where minutes and seconds are numbers and xx represents hundredths of a second.',
        assetsTitle:'Covers and Background Images', coverTitle:'Cover Image',
        coverText:'Supported: <code>.jpg</code>, <code>.jpeg</code>, <code>.png</code>, <code>.webp</code>, <code>.gif</code>. Place files in <code>cover/</code> and match the song name.',
        backgroundTitle:'Background Image',
        backgroundText:'The same formats are supported. Place a file in <code>background/</code> with the matching song name. The cover is used as fallback.',
        embeddedTitle:'Embedded Cover',
        embeddedText:'If the audio file contains artwork, the importer extracts it and saves it to <code>cover/</code>.',
        lovedTitle:'Loved Songs',
        lovedText:'Use the heart button to add or remove loved songs. The list is saved in browser storage and, when a library folder is connected, the player also tries to write <code>loved.json</code> at the library root.',
        lovedNote:'Entries in <code>loved.json</code> are song <code>name</code> values, not file paths.',
        troubleshootingTitle:'Troubleshooting',
        faq1Title:'No songs are loaded', faq1Text:'Make sure you selected the library root containing <code>data.json</code>, and confirm that each <code>audio</code> path in it matches an actual file.',
        faq2Title:'Lyrics are not displayed', faq2Text:'Confirm the lyric file ends in <code>.lrc</code>, and match the filename to the audio filename without extensions.',
        faq3Title:'The browser cannot select a folder', faq3Text:'Use a desktop Chromium-based browser that supports the File System Access API.',
        faq4Title:'A newly added song cannot be found', faq4Text:'Confirm that the file format is supported, then reconnect the folder or refresh the page.',
        translationNotice:'This guide was AI-translated and may not be completely accurate.'
    },
    'zh-CN': {
        languageLabel:'语言', documentationEyebrow:'MUSIC PLAYER DOCUMENTATION', guideTitle:'使用指南', searchGuide:'搜索指南',
        navQuick:'快速开始', navFolder:'选择音乐库文件夹', navAdd:'新增歌曲',
        navLayout:'文件夹结构', navData:'data.json 格式', navLrc:'LRC 歌词规则',
        navAssets:'封面与背景图', navLoved:'喜爱列表', navTroubleshooting:'疑难解答',
        backToPlayer:'← 返回音乐播放器', lead:'选择本地音乐库、新增歌曲、设置封面与歌词，并让播放器自动更新 <code>data.json</code>。',
        quickTitle:'快速开始', quickStep1Title:'选择文件夹',
        quickStep1Text:'打开播放器，点击文件夹图标。',
        quickStep2Title:'选择音乐库根目录',
        quickStep2Text:'请选择包含 <code>data.json</code>、<code>Song</code>、<code>cover</code> 或 <code>lrc</code> 的文件夹。',
        quickStep3Title:'开始播放', quickStep3Text:'加载完成后即可从右侧歌曲列表选择歌曲。',
        supportedBrowser:'支持浏览器', browserText:'新增或更新本地文件夹需要支持 <strong>File System Access API</strong> 的浏览器，例如桌面版 Chromium 系浏览器。Wallpaper Engine 请使用 Chromium 版本的网页。',
        folderTitle:'选择音乐库文件夹',
        folderStep1:'打开播放器页面 <code>index.html</code>。',
        folderStep2:'点击底部控制栏的文件夹图标。',
        folderStep3:'在文件选择窗口中选择<strong>音乐库根文件夹</strong>，不要只选择单个音乐文件。',
        folderStep4:'确认浏览器的读取／写入权限后，播放器会读取 <code>data.json</code> 并加载歌曲。',
        figureCaption:'选择包含音乐库资源的文件夹，而不是选择某一首歌曲。',
        addTitle:'新增歌曲',
        addStep1:'点击播放器控制栏中的<strong>新增歌曲</strong>图标（加号图标）。',
        addStep2:'选择一首或多首音频文件。支持：<code>.mp3</code>、<code>.flac</code>、<code>.ogg</code>、<code>.wav</code>、<code>.m4a</code>。',
        addStep3:'如果尚未连接文件夹，播放器会要求选择音乐库文件夹。',
        addStep4:'确认后，音频会保存到 <code>Song/</code>，内嵌封面保存到 <code>cover/</code>，并自动更新 <code>data.json</code>。',
        lrcNameImportant:'同名规则很重要',
        lrcNameText:'若要使用 LRC，歌词文件名必须与音乐文件名完全相同。例如音乐是 <code>My Song.mp3</code>，LRC 就必须是 <code>My Song.lrc</code>。',
        layoutTitle:'文件夹结构', layoutIntro:'建议使用以下结构：',
        layoutNote:'<code>cover</code>、<code>lrc</code> 和 <code>background</code> 文件夹可由导入流程自动建立。',
        dataTitle:'data.json 格式', dataIntro:'<code>data.json</code> 是音乐库清单。通常由播放器在新增歌曲时自动生成，无需手动维护。',
        fieldName:'歌曲的唯一识别名称，应与同名资源的文件名一致。',
        fieldAudio:'相对于音乐库根目录的音频文件路径。',
        fieldAssets:'对应资源的相对路径；没有资源时可设为 <code>null</code>。',
        fieldMetadata:'标题、演出者、专辑与曲目；播放器可能读取音频内嵌标签。',
        lrcTitle:'LRC 歌词规则', lrcFilenameTitle:'文件名必须一致',
        lrcFilenameText:'LRC 文件名必须与音乐文件名相同，不包含扩展名。',
        lrcPlacement:'LRC 可放在音乐文件相同位置或 <code>lrc/</code> 文件夹。连接文件夹时，播放器会查找与音频同名的 LRC。',
        lrcFormatText:'时间格式可使用 <code>[mm:ss.xx]</code>，分钟和秒为数字，小数部分表示百分之一秒。',
        assetsTitle:'封面与背景图', coverTitle:'封面图',
        coverText:'支持 <code>.jpg</code>、<code>.jpeg</code>、<code>.png</code>、<code>.webp</code>、<code>.gif</code>。建议放在 <code>cover/</code>，文件名与歌曲名一致。',
        backgroundTitle:'背景图',
        backgroundText:'支持相同格式。建议放在 <code>background/</code>，文件名与歌曲名一致。未设置时会尝试使用封面。',
        embeddedTitle:'内嵌封面',
        embeddedText:'如果音频文件包含封面，导入时可自动提取并保存到 <code>cover/</code>。',
        lovedTitle:'喜爱列表',
        lovedText:'点击爱心按钮可添加或移除喜爱歌曲。列表保存在浏览器本地存储中，连接音乐库后也会尝试写入根目录的 <code>loved.json</code>。',
        lovedNote:'<code>loved.json</code> 中的项目是歌曲的 <code>name</code>，不是文件路径。',
        troubleshootingTitle:'疑难解答',
        faq1Title:'没有歌曲加载', faq1Text:'请确认选择了包含 <code>data.json</code> 的音乐库根目录，并检查其中的 <code>audio</code> 路径是否与实际文件一致。',
        faq2Title:'歌词没有显示', faq2Text:'确认扩展名为 <code>.lrc</code>，并确保音乐文件名去掉扩展名后与 LRC 文件名完全一致。',
        faq3Title:'浏览器无法选择文件夹', faq3Text:'请使用支持 File System Access API 的桌面 Chromium 浏览器。',
        faq4Title:'无法找到新增的歌曲', faq4Text:'确认文件格式受支持，然后重新选择文件夹或刷新页面。',
        translationNotice:'本指南使用 AI 翻译，部分内容可能不完全准确。'
    }
};

function setActiveLink(sectionId) {
    navLinks.forEach(link => link.classList.toggle('active', link.dataset.section === sectionId));
}

if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveLink(visible.target.id);
    }, { rootMargin: '-20% 0px -65%', threshold: [0.1, 0.5] });
    sections.forEach(section => observer.observe(section));
}

navLinks.forEach(link => link.addEventListener('click', () => setActiveLink(link.dataset.section)));

if (searchInput) {
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLocaleLowerCase();
        sections.forEach(section => {
            section.classList.toggle('hidden-by-search', Boolean(query) && !section.textContent.toLocaleLowerCase().includes(query));
        });
        navLinks.forEach(link => {
            const section = document.getElementById(link.dataset.section);
            link.hidden = Boolean(section?.classList.contains('hidden-by-search'));
        });
    });
}

function applyLanguage(language) {
    const messages = translations[language] || translations['zh-TW'];
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const message = messages[element.dataset.i18n];
        if (message) element.innerHTML = message;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const message = messages[element.dataset.i18nPlaceholder];
        if (message) element.placeholder = message;
    });
    try {
        localStorage.setItem('music-guide-language', language);
    } catch (error) {
        console.warn('Unable to save guide language:', error);
    }
}

if (languageSelect) {
    let savedLanguage = null;
    try { savedLanguage = localStorage.getItem('music-guide-language'); } catch (error) {}
    if (savedLanguage && translations[savedLanguage]) languageSelect.value = savedLanguage;
    languageSelect.addEventListener('change', () => applyLanguage(languageSelect.value));
    applyLanguage(languageSelect.value);
}
