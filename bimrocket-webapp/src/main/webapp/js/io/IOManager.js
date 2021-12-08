/**
 * IOManager.js
 *
 * @author realor
 */

import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "../lib/three.module.js";

class IOManager
{
  static formats = {};

  static getFormat(name)
  {
    let format = null;
    if (typeof name === "string")
    {
      let index = name.lastIndexOf(".");
      if (index !== -1)
      {
        format = name.substring(index + 1).toLowerCase();
      }
    }
    return format;
  }

  static getFormatInfo(name)
  {
    let format = this.getFormat(name);
    let formatInfo = format ?
      IOManager.formats[format] :
      IOManager.formats[name];
    return formatInfo || null;
  }

  static createLoader(format, manager)
  {
    let loader = null;
    let formatInfo = this.formats[format];
    if (formatInfo && formatInfo.loaderClass)
    {
      loader = new formatInfo.loaderClass(manager);
      loader.loadMethod = formatInfo.loadMethod || loader.loadMethod || 0;
    }
    return loader;
  }

  static createExporter(format)
  {
    let exporter = null;
    let formatInfo = this.formats[format];
    if (formatInfo && formatInfo.exporterClass)
    {
      exporter = new formatInfo.exporterClass();
    }
    return exporter;
  }

  static load(intent)
  {
    let format = intent.format;
    let url = intent.url;
    let data = intent.data;
    let onCompleted = intent.onCompleted; // onCompleted(object3D)
    let onProgress = intent.onProgress; // onProgress({progress: 0..100, message: text})
    let onError = intent.onError; // onError(error)
    let manager = intent.manager; // LoadingManager
    let units = intent.units || "m"; // application units
    let options = intent.options;

    try
    {
      if (!format && url)
      {
        format = this.getFormat(url);
      }
      if (!format) throw "Can't determinate format";

      let loader = this.createLoader(format, manager);

      if (!loader) throw "Unsupported format: " + format;

      if (loader.options && options)
      {
        Object.assign(loader.options, options);
      }
      if (data)
      {
        this.parseData(loader, url, data, units,
          onCompleted, onProgress, onError);
      }
      else
      {
        let request = new XMLHttpRequest();
        let length = 0;
        request.onreadystatechange = () =>
        {
          if (request.readyState === 4)
          {
            if (onProgress) onProgress({progress : 100, message : ""});

            if (request.status === 0 ||
              request.status === 200 || request.status === 207)
            {
              data = request.responseText;
              try
              {
                this.parseData(loader, url, data, units,
                  onCompleted, onProgress, onError);
              }
              catch (exc)
              {
                if (onError) onError(exc);
              }
            }
            else
            {
              if (onError)
                onError(request.statusText + " (" + request.status + ")");
            }
          }
          else if (request.readyState === 3)
          {
            if (onProgress)
            {
              if (length === 0)
              {
                length = request.getResponseHeader("Content-Length");
              }
              else
              {
                let progress = Math.round(
                  100 * request.responseText.length / length);
                let message = "Downloading file...";
                onProgress({progress : progress, message : message});
              }
            }
          }
        };
        request.open("GET", url, true);
        request.send();
      }
    }
    catch (ex)
    {
      if (onError) onError(ex);
    }
  }

  static export(intent)
  {
    let format = intent.format;
    let name = intent.name;
    let onCompleted = intent.onCompleted;
    let onProgress = intent.onProgress;
    let onError = intent.onError;
    let object = intent.object;
    let options = intent.options;

    try
    {
      if (!format && name)
      {
        format = this.getFormat(name);
      }

      if (!format) throw "Can't determinate format";

      let exporter = this.createExporter(format);

      if (!exporter) throw "Unsupported format: " + format;

      if (exporter.options && options)
      {
        Object.assign(exporter.options, options);
      }
      return this.parseObject(exporter, object,
        onCompleted, onProgress, onError);
    }
    catch (ex)
    {
      if (onError) onError(ex);
    }
  }

  static parseData(loader, url, data, units,
    onCompleted, onProgress, onError)
  {
    const loadCompleted = (model) =>
    {
      ObjectUtils.scaleModel(model, units);
      if (onCompleted) onCompleted(model);
    };

    if (loader.loadMethod === 1) // ColladaLoader
    {
      let path = THREE.LoaderUtils.extractUrlBase(url);
      let result = loader.parse(data, path);
      loadCompleted(result.scene);
    }
    else if (loader.loadMethod === 2) // IFCLoader
    {
      loader.parse(data, loadCompleted, onProgress, onError);
    }
    else // general case: BRFLoader, STLLoader, OBJLoader...
    {
      let result = loader.parse(data);
      let object = this.createObject(result);
      loadCompleted(object);
    }
  }

  static parseObject(exporter, object, onCompleted, onProgress, onError)
  {
    let data = "";
    let result = exporter.parse(object);
    if (result)
    {
      if (typeof result === "string")
      {
        data = new Blob([result], {type: 'text/plain'});
      }
      else if (typeof result.data === "string")
      {
        data = new Blob([result.data], {type: 'text/plain'});
      }
    }
    if (onCompleted) onCompleted(data);
    return data;
  }

  static createObject(result)
  {
    if (result instanceof THREE.BufferGeometry)
    {
      let geometry = result;
      let material = new THREE.MeshPhongMaterial(
        {color : 0x008000, side : THREE.DoubleSide});
      let object = new THREE.Mesh(geometry, material);
      object.updateMatrix();
      return object;
    }
    else if (result instanceof THREE.Object3D)
    {
      let object = result;
      object.traverse(obj => obj.updateMatrix());
      return object;
    }
  }

  static getSupportedLoaderExtensions()
  {
    const extensions = [];
    const formats = IOManager.formats;
    for (let formatName in formats)
    {
      let format = formats[formatName];
      extensions.push(format.extension);
    }
    return extensions;
  }
}

export { IOManager };


