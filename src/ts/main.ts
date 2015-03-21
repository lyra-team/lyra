///<reference path='ui.ts'/>
///<reference path='menu.ts'/>
///<reference path='game2.ts'/>

class App {
    private mainMenu: MainMenu;
    private dropOverlay: DropOverlay;
    private audios: VK.Api.Audio[] = [];

    private songPicker = new MainMenuSelect("Pick song");

    private PERMANENT_MENU_ITEMS: MainMenuItem[] = [
        new MainMenuButton("Play demo song").addOnClick((evt) => {

        }),
        new MainMenuLabel("Or drag and drop mp3 file here")
    ];

    private ANON_MENU_ITEMS: MainMenuItem[] = [
        new MainMenuButton("Login with vk.com").addOnClick((evt) => {
            VK.Auth.login((response) => {
                this.loggedIn(response.session);
            }, VK.Auth.Permission.AUDIO);
        })
    ];

    private AUTH_MENU_ITEMS: MainMenuItem[] = [
        new MainMenuButton("Quick play").addOnClick((evt) => {

        }),
        this.songPicker,
        new MainMenuButton("Logout").addOnClick((evt) => {
            VK.Auth.logout(this.loggedOut.bind(this));
        })
    ];

    constructor(apiId: number) {
        VK.init({
            apiId: apiId
        });

        this.mainMenu = new MainMenu(ui.$<HTMLElement>('mainMenu'));
        this.dropOverlay = new DropOverlay("dropOverlay");
        this.dropOverlay.setOnFileLoaded(this.onFileDropped.bind(this));
    }

    start() {
        VK.Auth.getLoginStatus((obj) => {
            console.log(obj);
            if (obj.session !== null) {
                this.loggedIn(obj.session);
            } else {
                this.loggedOut();
            }
            this.mainMenu.show();
        });
    }

    requestAudios() {
        VK.Api.call("audio.get", {}, (r: VK.Api.Response<VK.Api.Audio[]>) => {
            this.audiosUpdated(r.response);
        });
    }

    private loggedIn(session: VK.Auth.Session) {
        this.mainMenu.setItems(this.AUTH_MENU_ITEMS.concat(this.PERMANENT_MENU_ITEMS));
        this.requestAudios();
    }

    private loggedOut() {
        this.mainMenu.setItems(this.ANON_MENU_ITEMS.concat(this.PERMANENT_MENU_ITEMS));
    }

    private audiosUpdated(audios : VK.Api.Audio[]) {
        this.audios = audios;
        this.songPicker.setItems(audios.map((audio) => ui.tmpl(
            "{} - {} ({}:{}{})",
            audio.artist,
            audio.title,
            audio.duration / 60 | 0,
            audio.duration % 60 / 10 | 0,
            audio.duration % 60 % 10
        )));
    }

    private onFileDropped(url: string) {
        console.log(url);
    }
}