// Modla 2D Bounding Volumes
(function(exports){

    var V2 = require('./vec.js').V2;
    function Bound(){
    }
    exports.Bound = Bound;
    // A bounding rectangle
    // x,y the minimum coordinate contained in the rectangle
    // sx,sy the size of the rectangle along the x,y axis
    function Rect(x,y,sx,sy,centered){
        this.sx = sx;           // width of the rectangle on the x axis
        this.sy = sy;           // width of the rectangle on the y axis
        this.hx = sx/2;         // half of the rectangle width on the x axis
        this.hy = sy/2;         // half of the rectangle width on the y axis
        this.x  = x;            // minimum x coordinate contained in the rectangle  
        this.y  = y;            // minimum y coordinate contained in the rectangle
        this.cx = x + this.hx;   // x coordinate of the rectangle center
        this.cy = y + this.hy;   // y coordinate of the rectangle center
        this.mx = this.x + sx;   // maximum x coordinate contained in the rectangle
        this.my = this.y + sy;   // maximum x coordinate contained in the rectangle
        if(centered){
            this.x -= this.hx;
            this.cx -= this.hx;
            this.mx -= this.hx;
            this.y -= this.hy;
            this.cy -= this.hy;
            this.my -= this.hy;
        }
    }

    exports.BRect = Rect;

    Rect.prototype = new Bound();
    Rect.prototype.min = function(){  return new V2(this.x, this.y); };
    Rect.prototype.minX = function(){ return this.x; };
    Rect.prototype.minY = function(){ return this.y; };
    Rect.prototype.max = function(){  return new V2(this.mx, this.my); };
    Rect.prototype.maxX = function(){ return this.mx; };
    Rect.prototype.maxY = function(){ return this.my; };
    Rect.prototype.size = function(){ return new V2(this.sx, this.sy); };
    Rect.prototype.center = function(){return new V2(this.cx, this.cy); };
    Rect.prototype.equals = function(b){ return ( this.cx === b.cx && this.cy === b.cy && this.sx === b.sx && this.sy === b.sy); };
    Rect.prototype.clone  = function(){  return new Rect(this.x,this.y,this.sx, this.sy)};
    Rect.prototype.cloneAt = function(center){ return new Rect(center.x - this.hx, center.y -this.hy, this.sx, this.sy); };

    //intersect line a,b with line c,d, returns null if no intersection
    function lineIntersect(a,b,c,d){
        // http://paulbourke.net/geometry/lineline2d/
        var f = ((d.y - c.y)*(b.x - a.x) - (d.x - c.x)*(b.y - a.y)); 
        if(f == 0){
            return null;
        }
        f = 1 / f;
        var fab = ((d.x - c.x)*(a.y - c.y) - (d.y - c.y)*(a.x - c.x)) * f ;
        if(fab < 0 || fab > 1){
            return null;
        }
        var fcd = ((b.x - a.x)*(a.y - c.y) - (b.y - a.y)*(a.x - c.x)) * f ;
        if(fcd < 0 || fcd > 1){
            return null;
        }
        return new V2(a.x + fab * (b.x-a.x), a.y + fab * (b.y - a.y) );
    }

    // returns an unordered list of vector defining the positions of the intersections between the ellipse's
    // boundary and a line segment defined by the start and end vectors a,b

    Rect.prototype.collideSegment = function(a,b){
        var collisions = [];
        var corners = [ new V2(this.x,this.y), new V2(this.x,this.my), 
                        new V2(this.mx,this.my), new V2(this.mx,this.y) ];
        var pos = lineIntersect(a,b,corners[0],corners[1]);
        if(pos) collisions.push(pos);
        pos = lineIntersect(a,b,corners[1],corners[2]);
        if(pos) collisions.push(pos);
        pos = lineIntersect(a,b,corners[2],corners[3]);
        if(pos) collisions.push(pos);
        pos = lineIntersect(a,b,corners[3],corners[0]);
        if(pos) collisions.push(pos);
        return collisions;
    };
    Rect.prototype.contains = function(arg){
        if(arg instanceof V2){
            return ( arg.x >= this.x && arg.x <= this.mx &&
                     arg.y >= this.y && arg.y <= this.my );
        }else if(arguments.length === 2){
            return this.contains(new V2(arguments[0],arguments[1]));
        }else if( arg instanceof Rect){
            return (arg.x >= this.x && arg.mx <= this.mx &&
                    arg.y >= this.y && arg.my <= this.my );
        }else if(arg instanceof Bound){
            return (arg.minX() >= this.x && arg.maxX() <= this.mx &&
                    arg.minY() >= this.y && arg.maxY() <= this.my );
        }
        return false;
    };

    function boundCollides(amin, amax, bmin, bmax){
        if(amin + amax < bmin + bmax){
            return amax > bmin;
        }else{
            return amin < bmax;
        }
    }
    
    function boundEscapeDist(amin, amax, bmin, bmax){
        if(amin + amax < bmin + bmax){
            var disp = bmin - amax;
            if(disp >= 0){
                return 0;
            }else{
                return disp;
            }
        }else{
            var disp = bmax - amin;
            if(disp <= 0){
                return 0;
            }else{
                return disp;
            }
        }
    }

    Rect.prototype.collides = function(b){
        return boundCollides(this.x, this.mx, b.x, b.mx) && 
               boundCollides(this.y, this.my, b.y, b.my);
    };
    
    Rect.prototype.collisionAxis = function(b){
        var dx = boundEscapeDist(this.x, this.mx, b.x, b.mx); 
        var dy = boundEscapeDist(this.y, this.my, b.y, b.my);
        if( Math.abs(dx) < Math.abs(dy) ){
            return new V2(dx,0);
        }else{
            return new V2(0,dy);
        }
    };
    
    Rect.prototype.collisionVector = function(b){
        return new V2( 
            boundEscapeDist(this.x, this.mx, b.x, b.mx),
            boundEscapeDist(this.y, this.my, b.y, b.my)  
        );
    };
    Rect.prototype.transform = function(mat){
        if(Transform2 && (mat instanceof Transform2)){
            mat = mat.getLocalToWorldMatrix();
        }else if(!(mat instanceof Mat2h)){
            mat = new Mat2h(mat);
        }
        var v1,v2,v3,v4,x,y,mx,my;

        v1 = mat.multVec(new V2(this.cx-this.hx, this.cy-this.hy));
        v2 = mat.multVec(new V2(this.cx-this.hx, this.cy+this.hy));
        v3 = mat.multVec(new V2(this.cx+this.hx, this.cy-this.hy));
        v4 = mat.multVec(new V2(this.cx+this.hx, this.cy+this.hy));

        x = Math.min(Math.min(v1.x,v2.x),Math.min(v3.x,v4.x));
        y = Math.min(Math.min(v1.y,v2.y),Math.min(v3.y,v4.y));
        mx = Math.max(Math.max(v1.x,v2.x),Math.max(v3.x,v4.x));
        my = Math.max(Math.max(v1.y,v2.y),Math.max(v3.y,v4.y));

        return new Rect((x+mx)*0.5,(y+my)*0.5,mx-x,my-y);
    };
    Rect.prototype.translate = function(vec){
        return new Rect(this.x+vec.x,this.y+vec.y,this.sx,this.sy);
    };

    Rect.prototype.toString = function(){
        return "["+this.cx+","+this.cy+"|"+this.sx+","+this.sy+"]";
    };
})(exports);
