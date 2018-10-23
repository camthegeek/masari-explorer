type VueConstructObject = {el:string,data:any, watch?:any, computed?:any, updated?:any, mounted?:any, methods?:any};
type VueComponentObject = {
    template:string,
    props?:Array<string>,
    data?:Function,
    watch?:any,
    computed:any
}

// declare var Vue : any;
declare class Vue{
    constructor(any : VueConstructObject|string|null);

    $nextTick(callback : Function) : void;
    $forceUpdate() : void;

    static component(componentName : string, data : VueComponentObject) : void;
    static filter(name : string, callback : Function) : void;

    static options : {
        components:any,
        filters:any
    };
}
