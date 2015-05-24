///<reference path='ui.ts'/>
///<reference path='menu.ts'/>
///<reference path="drop.ts"/>
///<reference path="audio.ts"/>

class App {
    private mainMenu: MainMenu;
    private dropOverlay: DropOverlay;
    private game: game.Game;

    private PERMANENT_MENU_ITEMS: MainMenuItem[] = [
        new MainMenuButton("Play demo song").addOnClick((evt) => {
            this.loadAudioAndStart("demos/webgl/metallica.mp3");
        }),
        new MainMenuLabel("Or drag and drop mp3 file here"),
        new MainMenuLabel("Press A key for anaglyph"),
        new MainMenuLabel("Press S key for stereo (OculusRift or so)")
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
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = (response: any) => {
            this.decodeAndStart(xhr.response);
        };
        xhr.send();
    }
}