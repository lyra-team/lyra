///<reference path='ui.ts'/>

var C_MAIN_MENU_TITLE = 'mainMenu--title',
    C_MAIN_MENU_ITEMS = 'mainMenu--items',
    C_MAIN_MENU_VISIBLE = 'mainMenu-visible',
    C_MAIN_MENU_BUTTON = 'mainMenu--button',
    C_MAIN_MENU_ITEM = "mainMenu--item",
    C_MAIN_MENU_SELECT = "mainMenu--select";

interface MainMenuItem {
    getElement(): Element;
}

class MainMenu {
    private title: HTMLHeadElement;
    private items: HTMLUListElement;

    constructor(private root: HTMLElement) {
        this.title = ui.$$<HTMLHeadElement>('.' + C_MAIN_MENU_TITLE, root);
        this.items = ui.$$<HTMLUListElement>('.' + C_MAIN_MENU_ITEMS, root);
    }

    hide() {
        this.root.classList.remove(C_MAIN_MENU_VISIBLE);
    }

    show() {
        this.root.classList.add(C_MAIN_MENU_VISIBLE);
    }

    setItems(items: MainMenuItem[]) {
        this.items.innerHTML = "";
        items.forEach((item) => {
            var li = document.createElement("li");
            li.className = C_MAIN_MENU_ITEM;
            li.appendChild(item.getElement());
            this.items.appendChild(li);
        }, this);
    }
}

class MainMenuButton implements MainMenuItem {
    private root: HTMLButtonElement;

    constructor(caption: string) {
        this.root = document.createElement("button");
        this.root.innerHTML = caption;
        this.root.className = C_MAIN_MENU_BUTTON;
    }

    addOnClick(onClick) {
        this.root.addEventListener("click", onClick);
        return this;
    }

    getElement(): Element {
        return this.root;
    }
}

class MainMenuSelect implements MainMenuItem {
    private root: HTMLSelectElement;

    constructor(private caption: string) {
        this.root = document.createElement("select");
        this.root.className = C_MAIN_MENU_SELECT;
        this.setItems([]);
    }

    setItems(items: String[]) {
        this.root.innerHTML = ui.tmpl("<option value='' disabled selected>{}</option>", this.caption) +
            items.reduce((html, item, idx) => {
                return html + ui.tmpl("<option value='{}'>{}</option>", idx, item);
            }, "");
    }

    addOnChange(onChange) {
        this.root.addEventListener("change", onChange);
        return this;
    }

    getElement():Element {
        return this.root;
    }
}