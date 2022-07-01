/*
 * SVGExporterTool.js
 *
 * @author jespada
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { WebUtils } from "../utils/WebUtils.js";
import { Controls } from "../ui/Controls.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";


const SVG_GEOMETRY_TYPE_LINES=0
const SVG_GEOMETRY_TYPE_PATH=1

class SVGExporterTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "svg_exporter";
    this.label = "tool.svg_exporter.label";
    this.help = "tool.svg_exporter.help";
    this.className = "svg_file";
    this.setOptions(options);
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    this.titleElem = Controls.addTextField(this.panel.bodyElem,
      "svg_exporter_title", "label.svg_exporter_title", "", "row");

    this.svgExportButton = Controls.addButton(this.panel.bodyElem,
      "svg_exporter_button", "button.export", () => this.svg_exporter());

    this.openLink = document.createElement("a");
    I18N.set(this.openLink, "innerHTML", "button.open");
    this.openLink.target = "_blank";
    this.openLink.style.display = "none";
    this.panel.bodyElem.appendChild(this.openLink);
  }

  activate()
  {
    this.panel.visible = true;
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  svg_exporter()
  {
    this.svgExportButton.disabled = true;
    this.application.progressBar.progress = undefined;
    this.application.progressBar.visible = true;
    this.application.progressBar.message = "";

    setTimeout(() => this.generateSvg(), 100);
  }

  generateSvg()
  {
    const application = this.application;

    let scale = 10;//parseFloat(this.scaleElem.value);
    // assume units in meters
    let factor = 1 * 39.37007874 * 72; // dots per meter
    factor /= scale;

    let matrix = new THREE.Matrix4();
    matrix.makeTranslation(297, 382, 0);
    matrix.multiply((new THREE.Matrix4()).makeScale(factor, factor, factor));
    matrix.multiply(application.camera.matrixWorldInverse);
    
    let svgExportSource =
    {
      title : this.titleElem.value || "Bimrocket_SVG_export.svg",
      strOut : ""
      /*,debug:{
    	 testIfcElement:"2pXMcyfWv9igGhNWUPBtrV"
      }*/
      ,writeHiddenEdges:true
      ,exportGeometryType:SVG_GEOMETRY_TYPE_LINES
      ,bbox : {
	        min: {
	            x: Number.MAX_VALUE
	            , y: Number.MAX_VALUE
	            , z: Number.MAX_VALUE
	        }
	        , max: {
	            x: Number.MAX_VALUE * -1 //Smallest negative number
	            , y: Number.MAX_VALUE * -1
	            , z: Number.MAX_VALUE * -1
	        }
	    }
    	 
    };
    
    var writeElement=true
    
    if(svgExportSource.debug){
    	writeElement=svgExportSource.debug.testIfcElement==undefined	
    }
    

    this.generateSvgObject(application.baseObject, matrix,svgExportSource,0,writeElement);
    
    this.svgExportButton.disabled = false;
    this.application.progressBar.visible = false;
    
    //console.log(svgExportSource.strOut);
    
    let content=`<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="`
    +svgExportSource.bbox.min.x
    +" "+(-svgExportSource.bbox.max.y)
    +" "+(svgExportSource.bbox.max.x-svgExportSource.bbox.min.x)
    +" "+(svgExportSource.bbox.max.y-svgExportSource.bbox.min.y)
+`">
<defs>
    <style type="text/css"><![CDATA[
    
       path {
         stroke: black;
         fill: none;
         stroke-width: 2;
       }
       
       line {
         stroke: black;
         stroke-width: 2;
       }       
       
    ]]></style>
  </defs>
<g id="root" transform="matrix(1,0,0,-1,0,0)">`
    
    content+=svgExportSource.strOut;
    content+="</g></svg>";
    
    var encodedUri = encodeURI(
	    "data:text/svg;charset=utf-8,"+
	    content
    );
    
    
    // override out
    this.openLink.setAttribute("href", encodedUri);
    var str_datetime= new Date().toISOString().split('.')[0].replace(/[^\d]/gi,'');
    this.openLink.setAttribute("download", svgExportSource.title+".svg");

    // decoment to export
   this.openLink.click();
    
  }
  
  indent(level){
	  var str="";
	  for(var i=0; i < level; i++){
		  str+="\t";
	  }	  
	  return str;
  }
  
  // I think it can be improved
  existPoint(_points, _point){
	 for(var i=0; i < _points.length; i++){
		  if((_points[i].x-_point.x)==0.00
				  &&
		      (_points[i].y-_point.y)==0.00
		  ){
			  return true;
		  }
	  }
	  return false;
  }
  
  simplify(_lines){
	  var slines=[];
	  for(var l in lines){
		  	  
	  }
	  return _lines	  
  }
  
  updateBoundingBox(_svgExportSource,_p){
	  _svgExportSource.bbox.min.x=Math.min(_svgExportSource.bbox.min.x,_p.x);
	  _svgExportSource.bbox.min.y=Math.min(_svgExportSource.bbox.min.y,_p.y);
		  
	  _svgExportSource.bbox.min.x=Math.min(_svgExportSource.bbox.min.x,_p.x);
	  _svgExportSource.bbox.min.y=Math.min(_svgExportSource.bbox.min.y,_p.y);
		  

	  _svgExportSource.bbox.max.x=Math.max(_svgExportSource.bbox.max.x,_p.x);
	  _svgExportSource.bbox.max.y=Math.max(_svgExportSource.bbox.max.y,_p.y);
  }

	writeSvgShape(object,matrix,svgExportSource,level,_writeSvgShape=true){
		
		if (object instanceof Solid 
				||
		  object instanceof THREE.Mesh
		  		||
		  object instanceof THREE.Line
		){
	  		if(_writeSvgShape==false){
	  			return true;
	  		}
		}
		
		
	  	if (object instanceof Solid)
	    {
	  		
			try
			{
				
			    if (svgExportSource.writeHiddenEdges==true || object.edgesVisible==true)
			    {
			      let edgesGeometry = object.edgesGeometry;
			      let vertices =
			        GeometryUtils.getBufferGeometryVertices(edgesGeometry);
			  	  
			  	  let p1 = new THREE.Vector3();
			  	  let p2 = new THREE.Vector3();
			  	  let lines=[]
			  	 // var center={x:0,y:0}
			  	  var simplified_points=[];
			  	  
			  	  // create set of lines
			  	  for (let i = 0; i < vertices.length; i+=2){
			  		  p1.copy(vertices[i]);
			  		  p1.applyMatrix4(object.matrixWorld);
			  		  p1.applyMatrix4(matrix);
			  		  
			  		  p2.copy(vertices[i+1]);
			  		  p2.applyMatrix4(object.matrixWorld);
			  		  p2.applyMatrix4(matrix);
			  		  
			  		  lines.push({
			  			  p1:{x:p1.x,y:p1.y} // from 
			  			  ,p2:{x:p2.x,y:p2.y} // to
			  		  })
			  		  
			  		  // update 2d bounding box
			  		  this.updateBoundingBox(svgExportSource,p1);
			  		  this.updateBoundingBox(svgExportSource,p2);
		  			
		  			 if(this.existPoint(simplified_points,p1)==false){
		  				simplified_points.push({x:p1.x,y:p1.y}) // from 
		  			 }
		  			 
		  			 if(this.existPoint(simplified_points,p2)==false){
		  				simplified_points.push({x:p2.x,y:p2.y}) // to
		  			 }
		  			
		  			  
			  	  }
			  	  
	  	  
			  	  // try to connect line through their nodes
			  	  if(svgExportSource.exportGeometryType==SVG_GEOMETRY_TYPE_PATH){
			  		
			  		  svgExportSource.strOut+=this.indent(level+1)+"<path d=\"";
			  		  
				  	  for(var i=0; i < simplified_points.length;i++){
				  		
			  				svgExportSource.strOut+=" "+(i==0?"M":"L")+simplified_points[i].x+","+simplified_points[i].y;
			  			
				  	  }
		
			  	       // finally add the first
			  		  svgExportSource.strOut+=" "+"L"+simplified_points[0].x+","+simplified_points[0].y
			  		  svgExportSource.strOut+="\" />\n"
			  		
			  		}
			  	  else{
			  	  
				  	
			  	  	for(var i=0; i < lines.length;i++){
			  	  		p1=lines[i].p1
				  		p2=lines[i].p2
				  			
				  		svgExportSource.strOut+=this.indent(level+1)+"<line x1=\""+p1.x+"\" y1=\""+p1.y+"\""
				  											+" x2=\""+p2.x+"\" y2=\""+p2.y+"\" />\n";
				  	  }

			  		
			  	  }
					return true;
			    }
			}catch (ex){
			    console.error(ex);
			}
	    }
	    else if (object instanceof THREE.Mesh)
	    {
	    	
	      var geometry = object.geometry;
	      if (geometry instanceof THREE.BufferGeometry)
	      {
	    	  var that=this;
	        GeometryUtils.getBufferGeometryFaces(
	        		// three mesh
	        		geometry
	                // callback foreach vertex converted conversion
	        	  , function(va, vb, vc){
	        			
	        	        const vertices = GeometryUtils.getBufferGeometryVertices(geometry);
	  		            const p1 = new THREE.Vector3();
	  		            const p2 = new THREE.Vector3();
	  		            const p3 = new THREE.Vector3();
	        			
	  		            p1.copy(vertices[va]);
	  		            p2.copy(vertices[vb]);
	  		            p3.copy(vertices[vc]);
	  		            p1.applyMatrix4(object.matrixWorld);
	  		            p2.applyMatrix4(object.matrixWorld);
	  		            p3.applyMatrix4(object.matrixWorld);
	  		            p1.applyMatrix4(matrix);
	  		            p2.applyMatrix4(matrix);
	  		            p3.applyMatrix4(matrix);
	  		            
				  		  // update 2d bounding box
				  		  that.updateBoundingBox(svgExportSource,p1);
				  		that.updateBoundingBox(svgExportSource,p2);
				  		that.updateBoundingBox(svgExportSource,p3);
	  		           
	  		            // draw polyline
	  		            svgExportSource.strOut+=that.indent(level+1)+"<path d=\"M"+p1.x+","+p1.y+
	  		            						 " L"+p2.x+","+p2.y+
	  		            						 " L"+p3.x+","+p3.y+
	  		            						 " L"+p1.x+","+p1.y+
	  		            						 " \" />\n"
	  		            
	        		}
	        );


	  		return true;
	      }
	    }else if(object instanceof THREE.Line) {
	    	
  			return true;
	    }
	    

	  	return false;
	 }

  

  generateSvgObject(object, matrix, svgExportSource, level=0, _writeSvgShape=true)
  {
	  //console.log(object.name)
  //  const commands = svgExportSource.commands;
	  
	 let uuid=THREE.MathUtils.generateUUID()
	let globalId = "unknow";
	let ifcClassName="unknow";
	if(object.userData){
		if(object.userData.IFC){
			if(object.userData.IFC.GlobalId){
				globalId=object.userData.IFC.GlobalId;
			}
			ifcClassName=object.userData.IFC.ifcClassName;
		}
		if(object.userData.IFC_type){
			
			if(globalId=="unknow"){
				if(object.userData.IFC_type.GlobalId){
					GlobalId=object.userData.IFC_type.GlobalId;
				}
			}
			
			if(ifcClassName=="unknow"){
				if(object.userData.IFC_type.ifcClassName){
					ifcClassName=object.userData.IFC_type.ifcClassName
				}
			}
		}
	}
	
	
	// drawable elements
	// object
	 if(svgExportSource.debug){
		 if(globalId==svgExportSource.debug.testIfcElement){
			 _writeSvgShape=true;
		 }
	 }
	
	if(_writeSvgShape==true){
		svgExportSource.strOut+=this.indent(level)+"<g id=\""+(uuid+"_"+globalId+"_"+ifcClassName)+"\" data-guid=\""+globalId+"\" data-class-name=\""+ifcClassName+"\">\n"
	}
	
	
	if(this.writeSvgShape(object,matrix,svgExportSource, level, _writeSvgShape)==false){
		for (let child of object.children)
	      {
	        if (child.visible)
	        {
	          this.generateSvgObject(child, matrix,svgExportSource, 	_writeSvgShape?level+1:level,_writeSvgShape);
	        }
	      }
	}
    
	if(_writeSvgShape==true){
		svgExportSource.strOut+=this.indent(level)+"</g>\n"
	}

  }


}

export { SVGExporterTool };
