/**
 * GMLLoader.js
 *
 * @author nexus
 */

import { GISLoader } from "./GISLoader.js";
import * as THREE from "three";


let GML3, GML32, proj4, olProj4Register;
let dependenciesPromise = null;

class GMLLoader extends GISLoader
{
  constructor(mimeType, manager)
  {
    super(manager, mimeType || "gml3");
    this.options = {
      extrusionHeight: 1,
      targetProjection: 'EPSG:25831',
      name: 'layer'
    };
  }

  ensureDependencies()
  {
    if (dependenciesPromise)
    {
      return dependenciesPromise;
    }

    dependenciesPromise = new Promise(async (resolve, reject) =>
    {
      try
      {
        const [
          GML3Module,
          GML32Module,
          olProj4Module,
          proj4Module
        ] = await Promise.all([
          import('ol/format/GML3.js'),
          import('ol/format/GML32.js'),
          import('ol/proj/proj4.js'),
          import('proj4')
        ]);

        GML3 = GML3Module.default;
        GML32 = GML32Module.default;
        proj4 = proj4Module.default;
        olProj4Register = olProj4Module.register;

        if (!proj4.defs['EPSG:25831'])
        {
          proj4.defs('EPSG:25831', '+proj=utm +zone=31 +ellps=GRS80 +units=m +no_defs');
        }
        olProj4Register(proj4);
        resolve();
      }
      catch (error)
      {
        console.error(error);
        dependenciesPromise = null;
        reject(error);
      }
    });

    return dependenciesPromise;
  }

  setOptions(options)
  {
    this.options = Object.assign({}, this.options, options);
    return this;
  }

  _getGMLOptions(xmlDoc)
  {
    let memberEl = xmlDoc.querySelector("*|member, *|featureMember, *|featureMembers");
    
    if (!memberEl)
    {
      const allElements = xmlDoc.getElementsByTagName("*");
      for (let i = 0; i < allElements.length; i++) {
          const ln = allElements[i].localName;
          if (ln === "member" || ln === "featureMember" || ln === "featureMembers") {
              memberEl = allElements[i];
              break;
          }
      }
    }

    if (!memberEl || !memberEl.firstElementChild)
    {
      return {};
    }

    const featureMemberTag = memberEl.localName;
    const featureEl = memberEl.firstElementChild;
    const featureType = featureEl.localName;
    const featureNS = featureEl.namespaceURI;

    let geometryName = null;
    const geometryTypes =
    [
      "Point", "MultiPoint", "LineString", "MultiLineString",
      "Polygon", "MultiPolygon", "Surface", "MultiSurface",
      "Curve", "MultiCurve", "Envelope", "Box", "geometry"
    ];

    for (const child of featureEl.children)
    {
      if (child.firstElementChild)
      {
        const l1 = child.firstElementChild.localName;
        if (geometryTypes.includes(l1))
      {
          geometryName = child.localName;
          break;
        }
        if (child.firstElementChild.firstElementChild)
        {
          const l2 = child.firstElementChild.firstElementChild.localName;
          if (geometryTypes.includes(l2))
          {
            geometryName = child.localName;
            break;
          }
        }
      }
    }

    const srsEl = xmlDoc.querySelector("[srsName]");
    const srsNameString = srsEl ? srsEl.getAttribute("srsName") : null;
    let srsName = null;
    if (srsNameString)
    {
      const match = srsNameString.match(/(?:EPSG|crs).*[:](\d+)|#(\d+)$/i);
      if (match)
      {
        const code = match[1] || match[2];
        srsName = `EPSG:${code}`;
      }
      else
      {
        srsName = srsNameString;
      }
    }

    const options = { featureNS, featureType };
    if (geometryName) { options.geometryName = geometryName; }
    if (srsName) { options.srsName = srsName; }
    if (featureMemberTag) { options.featureMemberTag = featureMemberTag; }
    return options;
  }

  _detectGMLVersion(xmlDoc)
  {
    const rootElement = xmlDoc.documentElement;
    if (rootElement && rootElement.hasAttribute("version"))
    {
      return rootElement.getAttribute("version");
    }
    const featureCollection = xmlDoc.querySelector("FeatureCollection, *|FeatureCollection");
    if (featureCollection && featureCollection.hasAttribute("version"))
    {
      return featureCollection.getAttribute("version");
    }
    const namespaces = rootElement.attributes;
    for (let i = 0; i < namespaces.length; i++) {
        if (namespaces[i].value === "http://www.opengis.net/gml/3.2") return "3.2.1"; 
    }
    return "3.1.1";
  }

  _getChildByLocalName(parent, localName)
  {
    for (let i = 0; i < parent.children.length; i++)
    {
      if (parent.children[i].localName === localName) return parent.children[i];
    }
    return null;
  }

  _getElementsByLocalName(parent, localName)
  {
    const results = [];
    const traverse = (node) =>
    {
      if (node.nodeType === 1 && node.localName === localName)
      {
        results.push(node);
      }
      for (let i = 0; i < node.children.length; i++)
      {
        traverse(node.children[i]);
      }
    };
    traverse(parent);
    return results;
  }

  _manualExtractCoordinates(geomNode)
  {
    try
    {
      const polygons = this._getElementsByLocalName(geomNode, "Polygon");
      const multiPolyCoords = [];

      if (polygons.length > 0)
      {
        for (const poly of polygons)
        {
          const exterior = this._getElementsByLocalName(poly, "exterior")[0];
          if (!exterior) continue;
          
          const posList = this._getElementsByLocalName(exterior, "posList")[0];
          const coordinates = this._getElementsByLocalName(exterior, "coordinates")[0];
          
          let rawText = "";
          let isPosList = false;

          if (posList)
          {
            rawText = posList.textContent;
            isPosList = true;
          } 
          else if (coordinates)
          {
            rawText = coordinates.textContent;
          }

          if (rawText)
          {
            const parts = rawText.trim().split(/\s+/).map(Number);
            const ring = [];
            
            for (let i = 0; i < parts.length; i += 2)
            {
              ring.push([parts[i], parts[i+1]]);
            }
            multiPolyCoords.push([ring]);
          }
        }
        if (multiPolyCoords.length > 0)
        {
          return { type: "MultiPolygon", coordinates: multiPolyCoords };
        }
      }
                  
    } catch (e)
    {
        console.error("Manual extraction error:", e);
    }
    return null;
  }
 
  parse(data, loadCompleted)
  {
    return this.ensureDependencies().then(() =>
    {
      let xmlDoc;
      if (typeof data === 'string')
      {
        if (!data || data.trim().length === 0) return null;
        const parser = new DOMParser();
        xmlDoc = parser.parseFromString(data, "application/xml");
      }
      else if (data instanceof Document)
      {
        xmlDoc = data;
      }
      else
      {
        return null;
      }

      if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        console.error("Error parsing GML string.");
        return null;
      }

      const gmlOptions = this._getGMLOptions(xmlDoc);
      if (!gmlOptions.featureType)
      {
        return null;
      }

      const sourceProjection = gmlOptions.srsName || this.options.srsName;
      if (!sourceProjection)
      {
        return null;
      }

      const version = this._detectGMLVersion(xmlDoc);
      const isGML32 = (this.mimeType === "gml32" || this.mimeType === "gml321") || 
                      (version && version.startsWith("3.2"));
      const GMLFormat = isGML32 ? GML32 : GML3;
      const gmlFormat = new GMLFormat(gmlOptions);

      let features = [];

      try
      {
        features = gmlFormat.readFeatures(xmlDoc);

        if ((!features || features.length === 0) && isGML32 && gmlOptions.featureNS && gmlOptions.featureType)
        {            
          const featureNodes = xmlDoc.getElementsByTagNameNS(gmlOptions.featureNS, gmlOptions.featureType);
          
          if (featureNodes.length > 0)
          {
            for (let i = 0; i < featureNodes.length; i++)
            {
              const node = featureNodes[i];              
              let olFeature = gmlFormat.readFeature(node);

              if (!olFeature && gmlOptions.geometryName)
              {
                const geomContainer = this._getChildByLocalName(node, gmlOptions.geometryName);
                
                if (geomContainer)
                {
                  const manualGeom = this._manualExtractCoordinates(geomContainer);

                  if (manualGeom)
                  {
                    const props = {};
                    const id = node.getAttribute("gml:id") || `feature_${i}`;
                    for (let child of node.children)
                    {
                      if (child.localName !== gmlOptions.geometryName)
                      {
                          props[child.localName] = child.textContent;
                      }
                    }
                    
                    olFeature =
                    {
                      getGeometry: () =>
                      {
                        return { getType: () => manualGeom.type, getCoordinates: () => manualGeom.coordinates }
                      },
                      getProperties: () => props,
                      getId: () => id
                    };
                  }
                }
              }

              if (olFeature) {
                features.push(olFeature);
              }
            }
          }
        }
      }
      catch (err)
      {
        console.error("Error reading features from GML:", err);
        return null;
      }

      const featureGroup = new THREE.Group();
      featureGroup.name = this.options.name || "layer";
      featureGroup.userData.units = "m";

      for (const feature of features)
      {
        const olGeom = feature.getGeometry();
        const props = feature.getProperties();
        const id = feature.getId() || "feature";

        delete props.geometry;
        delete props.boundedBy;
        if (gmlOptions.geometryName && props[gmlOptions.geometryName]) {
            delete props[gmlOptions.geometryName];
        }

        if (olGeom)
        {
          const type = olGeom.getType();
          let coords = olGeom.getCoordinates();
          this.createObject(type, id, coords, props, featureGroup);
        }
        else
        {
          this.createNonVisibleObject(`${id}_nv`, props, featureGroup);
        }
      }
      if(loadCompleted){
        loadCompleted(featureGroup);
      }
      
      featureGroup.position.copy(this.getOrigin());
      featureGroup.updateMatrix();

      return featureGroup;
    });
  }
}

export { GMLLoader };