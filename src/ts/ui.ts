module ui {
    export function $<T extends HTMLElement>(id: string): T;
    export function $<T extends HTMLElement>(id: Node): T;
    export function $<T extends HTMLElement>(id): T {
        if (typeof id === 'string')
            return <T> document.getElementById(id);
        else if (id.nodeType && id.nodeType === 1)
            return <T> id;
        return null;
    }

    export function $$<T extends HTMLElement>(selector: string, root: NodeSelector = document) : T {
        return <T> root.querySelector(selector);
    }

    export function $$$<T extends HTMLElement>(selector: string, root: NodeSelector = document) : T[] {
        return [].slice.call(root.querySelectorAll(selector));
    }

    export function tmpl(template: string, ...args: any[]) {
        var cnt = 0;
        return template.replace(/\{\}/g, () => args[cnt++]);
    }
}