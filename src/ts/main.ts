///<reference path='ui.ts'/>
///<reference path='menu.ts'/>
///<reference path="drop.ts"/>
///<reference path="audio.ts"/>

class App {
    private mainMenu: MainMenu;
    private dropOverlay: DropOverlay;
    private game: game.Game;

    private PERMANENT_MENU_ITEMS: MainMenuItem[] = [
        new MainMenuButton("Play 'Diorama - Child of Entertainment'").addOnClick((evt) => {
            this.loadAudioAndStart("demos/webgl/8_diorama_child_of_entertainment.mp3");
        }),
        new MainMenuButton("Play 'Diary of Dreams - The Luxury of Insanity'").addOnClick((evt) => {
            this.loadAudioAndStart("demos/webgl/7_diary_of_dreams_the_luxury_ofinsanity.mp3");
        }),
        new MainMenuLabel("Or drag and drop <b>your MP3</b> file here"),
        new MainMenuLabel("Press Left/Right arrows for control"),
        new MainMenuLabel("Press A key for anaglyph"),
        new MainMenuLabel("Press S key for stereo (OculusRift or so)"),
        new MainMenuLabel("Links: <a href=\"https://github.com/lyra-team\">GitHub</a>, <a href=\"http://hackday.ru/hackday-36/projects#project-1121\">HackDay project</a>"),
        new MainMenuLabel("With head-control (by webcam): <a href=\"http://polarnick239.github.io/lyra/\">Lyra (old)</a>"),
        new MainMenuLabel("Winner of Autodesc nomination 'Original 3D web application.' - <a href=\"http://hackday.ru/hackday-36/report\">report</a>"),
    ];

    constructor(apiId: number) {
        this.mainMenu = new MainMenu(ui.$<HTMLElement>('mainMenu'));
        this.dropOverlay = new DropOverlay("dropOverlay");
        this.dropOverlay.setOnFileLoaded(this.onFileDropped.bind(this));
        this.game = new game.Game(ui.$$('div.game'));
    }

    start() {
        this.mainMenu.setItems(this.PERMANENT_MENU_ITEMS);
        this.mainMenu.show();
    }

    private startGame(songBuffer: AudioBuffer) {
        this.game.start(songBuffer);
        this.mainMenu.hide();
    }

    private decodeAndStart(buffer: ArrayBuffer) {
        audio.context.decodeAudioData(buffer, (songBuffer) => {
            this.startGame(songBuffer);
        });
    }

    private onFileDropped(buffer: ArrayBuffer) {
        this.decodeAndStart(buffer);
    }

    private loadAudioAndStart(url: string) {
        ui.$('loadOverlay').classList.add('overlay-visible');
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = (response: any) => {
            this.decodeAndStart(xhr.response);
        };
        xhr.send();
    }
}