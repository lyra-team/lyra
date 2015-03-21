///<reference path="ui.ts"/>

var DROP_OVERLAY_VISIBLE = 'dropOverlay-visible';

class DropOverlay {
    private root: HTMLElement;
    private onFileLoaded: (ArrayBuffer) => void;

    constructor(id: string);
    constructor(id: Element);

    constructor(id) {
        this.root = ui.$<HTMLElement>(id);
        document.addEventListener('dragenter', this.onDragStart.bind(this));
        this.root.addEventListener('dragleave', this.onDragEnd.bind(this));
        this.root.addEventListener('dragover', this.onDragOver.bind(this));
        this.root.addEventListener('drop', this.onDrop.bind(this));
    }

    setOnFileLoaded(onFileLoaded: (ArrayBuffer) => void) {
        this.onFileLoaded = onFileLoaded;
    }

    private show() {
        this.root.classList.add(DROP_OVERLAY_VISIBLE);
    }

    private hide() {
        this.root.classList.remove(DROP_OVERLAY_VISIBLE);
    }

    private onDragStart(evt) {
        this.show();
    }

    private onDragOver(evt) {
        evt.preventDefault();
        this.show();
    }

    private onDragEnd(evt) {
        if (evt.target === this.root)
            this.hide();
    }

    private onLoad(evt) {
        if (this.onFileLoaded)
            this.onFileLoaded.call(this, evt.target.result);
    }

    private onDrop(evt) {
        evt.preventDefault();
        this.hide();

        var file = evt.dataTransfer.files[0],
            reader = new FileReader();
        reader.addEventListener("load", this.onLoad.bind(this));
        reader.readAsArrayBuffer(file);
    }
}