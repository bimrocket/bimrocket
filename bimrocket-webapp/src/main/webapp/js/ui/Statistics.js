/**
 * @author realor
 */
BIMROCKET.Statistics = class extends BIMROCKET.Panel
{
  constructor(application)
  {
    super(application);
    this.id = "statistics";
    this.title = "Statistics";
    this.position = "right";
    this.preferredHeight = 80;
    
    this.bodyElem.style.cssText = "opacity:0.9;z-index:10000;overflow:hidden;";

    var fpsPanel = new BIMROCKET.Statistics.Panel('FPS', '#0ff', '#002');
    this.bodyElem.appendChild(fpsPanel.dom);

    var msPanel = new BIMROCKET.Statistics.Panel('MS', '#0f0', '#020');
    this.bodyElem.appendChild(msPanel.dom);
    
    var beginTime = (performance || Date).now(); 
    var prevTime = beginTime;
    var frames = 0;

    this.animate = function()
    {
			frames++;

			var time = (performance || Date).now();

			msPanel.update(time - beginTime, 200);

			if (time >= prevTime + 1000)
      {
				fpsPanel.update((frames * 1000) / (time - prevTime), 100);

				prevTime = time;
				frames = 0;
			}      
      beginTime = time;      
    };
  }
  
  onShow()
  {
    var application = this.application;    
    application.addEventListener('animation', this.animate);
  }
  
  onHide()
  {
    var application = this.application;
    application.removeEventListener('animation', this.animate);
  }
};

BIMROCKET.Statistics.Panel = function (name, fg, bg)
{
  var min = Infinity, max = 0, round = Math.round;
  var PR = round(window.devicePixelRatio || 1);

  var CANVAS_WIDTH = 116,
      CANVAS_HEIGHT = 48,
      WIDTH = CANVAS_WIDTH * PR, 
      HEIGHT = CANVAS_HEIGHT * PR,
      TEXT_X = 3 * PR, 
      TEXT_Y = 2 * PR,
      GRAPH_X = 3 * PR, 
      GRAPH_Y = 15 * PR,
      GRAPH_WIDTH = (CANVAS_WIDTH - 6) * PR, 
      GRAPH_HEIGHT = (CANVAS_HEIGHT - 18) * PR;

  var canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.cssText = "width:" + CANVAS_WIDTH + 
    "px;height:" + CANVAS_HEIGHT + "px;margin:2px 2px 0 2px";

  var context = canvas.getContext('2d');
  context.font = "bold " + (9 * PR) + "px Helvetica,Arial,sans-serif";
  context.textBaseline = 'top';

  context.fillStyle = bg;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.fillStyle = fg;
  context.fillText(name, TEXT_X, TEXT_Y);
  context.fillRect(GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT);

  context.fillStyle = bg;
  context.globalAlpha = 0.9;
  context.fillRect(GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT);

  return {

    dom: canvas,

    update: function (value, maxValue) 
    {
      min = Math.min(min, value);
      max = Math.max(max, value);

      context.fillStyle = bg;
      context.globalAlpha = 1;
      context.fillRect(0, 0, WIDTH, GRAPH_Y);
      context.fillStyle = fg;
      context.fillText(round(value) + ' ' + name + ' (' + 
        round(min) + '-' + round(max) + ')', TEXT_X, TEXT_Y);

      context.drawImage(canvas, GRAPH_X + PR, GRAPH_Y, GRAPH_WIDTH - PR, 
        GRAPH_HEIGHT, GRAPH_X, GRAPH_Y, GRAPH_WIDTH - PR, GRAPH_HEIGHT);

      context.fillRect(GRAPH_X + GRAPH_WIDTH - PR, GRAPH_Y, PR, GRAPH_HEIGHT);

      context.fillStyle = bg;
      context.globalAlpha = 0.9;
      context.fillRect(GRAPH_X + GRAPH_WIDTH - PR, GRAPH_Y, PR, 
        round((1 - (value / maxValue)) * GRAPH_HEIGHT));
    }
  };
};