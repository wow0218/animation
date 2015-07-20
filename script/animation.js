(function(){
    /*
     *  requestAnimationFrame兼容
     */
    var lastTime = 0;
    var vendors = ['webkit','moz','ms','o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||    // Webkit中此取消方法的名字变了
                                      window[vendors[x] + 'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 100/6 - (currTime - lastTime));
            var id = window.setTimeout(function() {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
    //简单的json对象继承
    function extend(tar,json){
        for(var key in json){
            tar[key] = json[key];
        }
        return tar;
    }
    //动画对象
    var Animations = {},
        CanvasAnimations={},
        animationId=null;
    function keyAnimation(){
        var paused=true;            //当前的动画状态
        this.createAnim=function(options){
            var _default={
                id:'',              //唯一标识符
                class:'',           //类名 方便管理
                type:'',            //对象类型 ， canvas对象，dom对象 Canvas对象
                excuTimes:0,        //draw方法被调用次数
                //时间计数器
                paused:false,       //动画是否暂停 不要自定义
                pauseTime:0,        //暂停持续时间 不要自定义
                life:0,             //生命周期时间
                easing:null,        //动画easing函数名,返回值在 0~1之间
                startTime:null,     //开始时间 不要自定义
                curTime:0,          //当前时间 不要自定义
                compTime:0,         //计算时间度，有用到easing函数时，记录计算结果值 不要自定义
                timestamp:null,     //时间戳 不要自定义
                //坐标相关
                x:0,                //坐标X
                y:0,                //坐标Y
                alpha:1,            //元素本身的透明度
                rotate:0,           //顺时针旋转角度
                scale:1,            //缩放倍数
                skew:0,             //错切
                color:null,         //颜色
                bgcolor:null,       //背景颜色
                _display:'block',   //是否显示，block显示，none 不显示,动过 display属性来访问
                //特定类型相关参数
                canvas:null,        // Canvas对象以及canvas动画对象 都要有，指向对应的 canvas对象
                ctx:null,           // canvas对应的 context2D 对象
                selector:null,      //dom对象
                data:{},            //存储一些自定义的数据
                //动画的 绘制方法，请覆盖实现,步进也在里面实现
                //其中的 this对象指向本身,_default.draw();
                //所有属性都是可以直接自定义，然后再draw方法中 用this指向访问
                draw:function(timestamp){
                    //绘制规则，绘制参数 请使用 this 来访问

                    //绘制循环步进规则，例如 this.x+=1;

                    //销毁线

                },
                loop:function(){ //暂时无用

                },
                destroy:function(){//暂时无用

                }             
            };
            extend(_default,options);
            if(!_default.id) _default.id = obj.type+'_'+new Date().getTime();
            if(typeof _default.draw !=='function') _default.draw= function(){};
            // display 定义
            _default=Object.defineProperties(_default,{
                'display':{
                    get:function(){
                        return this._display;
                    },
                    set:function(val){
                        if(val=='block'){
                            this.paused=false;
                        }else if(val=='none'){
                            this.paused=true;
                        }else{
                            return false;
                        }
                        this._display=val;
                        if(this.type=='dom'){
                            this.selector.style['display']=val;
                        }
                        if(this.type=='Canvas'){
                            this.canvas.style['display']=val;
                        }
                    }
                }
            });

            //直接添加
            if(_default.type == 'Canvas'){
                CanvasAnimations[_default.id] = _default;
            }else{
                Animations[_default.id] = _default;
            }
        };
        this.getByClass=function(classname){
            var ret=[];
            for(var key in Animations){
                var classlists=Animations[key]['class'].split(/\s+/);
                for(var i=0;i<classlists.length;i++){
                    if(classlists[i]==classname){
                        ret.push(Animations[key]);
                        break;
                    }
                }
            }
            return ret;
        };
        this.hasClass=function(obj,classname){
            var classlists=obj['class'].split(/\s+/);
            for(var i=0;i<classlists.length;i++){
                if(classlists[i]==classname){
                    return true;
                }
            }
            return false;
        };
        this.setClass=function(obj,classname){
            if(this.hasClass(obj,classname)) return;
            obj['class']+=(' '+classname);
        };
        //删除对象
        this.del=function(id){
            var objid;
            if(typeof id == 'string'){
                objid = id;
            }else if(typeof id == 'object'){
                objid = id.id;
            }
            if(Animations[objid]) delete Animations[id];
            if(CanvasAnimations[id]) delete CanvasAnimations[id];
        };
        this.play=function(){
            paused=false;
            run();
        };
        //暂停所有动画,此时requestAnimationFrame并没有真正停止。
        this.pause=function(){
            paused=!paused;
        };
        this.stop=function(){
            paused=true;
            cancelAnimationFrame(animationId);
        };
        this.getAllCanvasAnimations=function(id){
            if(id==null) return extend({},CanvasAnimations);
            else return CanvasAnimations[id];
        };
        this.getAllAnimations=function(id){
            if(id=null) return extend({},Animations);
            else return Animations[id];
        };

        //动画开始
        function run(timestamp){
            timestamp = timestamp || 0;
            animationId=requestAnimationFrame(run);
            //循环处理
            //先清理Canvas  
            //这里把Canvas对象单独提取出来就是为了预先清理.
            for(var id in CanvasAnimations){
                var obj=CanvasAnimations[id];
                if(!obj) continue;
                //先设定obj的时间参数
                if(obj.startTime == null) obj.startTime = timestamp;
                var dt = (obj.timestamp==null? timestamp-obj.startTime : timestamp - obj.timestamp);
                obj.timestamp = timestamp;
                if(paused || obj.paused){
                    obj.pauseTime += dt;
                }else{
                    obj.ctx.clearRect(0,0,obj.w,obj.h);
                    obj.draw(timestamp,dt);
                    obj.excuTimes++;
                }
                //obj.curTime = timestamp;
            }
            //然后绘制其他元素
            for(var id in Animations){
                var obj=Animations[id];
                if(!obj) continue;
                //先设定obj的时间参数
                if(obj.startTime == null) obj.startTime = timestamp;
                var dt = (obj.timestamp==null? timestamp-obj.startTime : timestamp - obj.timestamp);
                obj.timestamp = timestamp;
                if(paused || obj.paused){
                    obj.pauseTime += dt;
                }else{
                    obj.draw(timestamp,dt);
                    obj.excuTimes++;
                }
            }
        }

        //开启全局监听事件
        this.play();
    }

    if ( typeof define === "function" && define.amd ) {
        define( "keyAnimation", [], function() {
            return keyAnimation;
        });
    }
    window.keyAnimation =keyAnimation;


    //以下可以在需要查看 动画帧对象的时候解开注释
    // window.Animations = Animations;
    // window.CanvasAnimations=CanvasAnimations;
})();
 