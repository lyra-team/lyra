module ui {
    export function $(id: string) {
        return document.getElementById(id);
    }

    export function $$<T extends Element>(selector: string, root: NodeSelector = document) : T {
        return <T> root.querySelector(selector);
    }

    export function $$$<T extends Element>(selector: string, root: NodeSelector = document) : T[] {
        return [].slice.call(root.querySelectorAll(selector));
    }

    export function tmpl(template: string, ...args: any[]) {
        var cnt = 0;
        return template.replace(/\{\}/g, () => args[cnt++]);
    }
}